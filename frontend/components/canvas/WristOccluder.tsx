'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer, QuaternionSmoother } from '@/lib/three/motionSmoothing'

interface WristOccluderProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  indexBasePosition?: WorldCoordinates | null
  pinkyBasePosition?: WorldCoordinates | null
  smoothing?: number
  enabled?: boolean
}

/**
 * Invisible depth-mask cylinder that creates a realistic occlusion illusion.
 *
 * Renders at renderOrder=-1 (before the watch) with colorWrite=false and
 * depthWrite=true. Watch fragments that fall behind the occluder surface fail
 * the depth test and are discarded, revealing the transparent canvas (camera
 * feed). This makes the strap appear to wrap around the wrist.
 *
 * Uses a simple cylinder positioned slightly behind the wrist center to provide
 * occlusion for watch straps while avoiding over-occlusion of the watch face.
 *
 * The cylinder is oriented using handOrientation directly (no rotationOffset)
 * so its local +Z stays aligned with the forearm direction from
 * computeWristQuaternion. A unit geometry (radius=1, height=1) is scaled
 * each frame via mesh.scale to avoid geometry recreation.
 */
export function WristOccluder({
  wristPosition,
  handOrientation,
  indexBasePosition,
  pinkyBasePosition,
  smoothing = 0.3,
  enabled = true,
}: WristOccluderProps) {
  const groupRef = useRef<THREE.Group>(null)
  const occluderRef = useRef<THREE.Mesh>(null)

  const currentPosRef = useRef<WorldCoordinates | null>(null)

  // Position stabilizer (One Euro filter + velocity-adaptive lerp)
  const stabilizer = useRef(new MotionStabilizer())

  // Rotation smoother: pure quaternion slerp with sign correction.
  const quatSmoother = useRef(new QuaternionSmoother())

  // Pre-allocated vectors to avoid per-frame heap allocations
  const indexVecRef = useRef(new THREE.Vector3())
  const pinkyVecRef = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!groupRef.current || !wristPosition || !enabled) return

    const timestamp = Date.now()

    // --- Position: One Euro filtered + velocity-adaptive lerp ---
    const filteredPos = stabilizer.current.filterPosition(wristPosition, timestamp)

    if (currentPosRef.current) {
      const adaptiveAlpha = stabilizer.current.getAdaptiveAlpha(filteredPos, timestamp)
      const effectiveSmoothing = Math.max(smoothing, adaptiveAlpha)
      const smoothed = lerpWorldCoordinates(currentPosRef.current, filteredPos, effectiveSmoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(filteredPos.x, filteredPos.y, filteredPos.z)
      currentPosRef.current = { ...filteredPos }
    }

    // --- Rotation: pure quaternion slerp with sign correction ---
    // handOrientation is used directly (no rotationOffset) so the cylinder's
    // local +Z stays aligned with the forearm direction from computeWristQuaternion.
    if (handOrientation) {
      const smoothedQuat = quatSmoother.current.update(handOrientation, smoothing)
      groupRef.current.quaternion.copy(smoothedQuat)
    }

    // --- Scale cylinder to match wrist anatomy each frame ---
    if (occluderRef.current && indexBasePosition && pinkyBasePosition) {
      indexVecRef.current.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
      pinkyVecRef.current.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)

      const knuckleWidth = indexVecRef.current.distanceTo(pinkyVecRef.current)

      // Adult anatomy: wrist circumference creates a cylinder radius of ~40-45% 
      // of knuckle width. Increased to match actual wrist volume so watch 
      // appears properly wrapped around the wrist surface, not floating above it.
      const wristRadius = knuckleWidth * 0.44
      const cylinderHeight = knuckleWidth * 0.7

      occluderRef.current.scale.set(wristRadius, cylinderHeight, wristRadius)
      
      // Push the cylinder slightly back (toward palm) to better occlude the
      // back side during rotations without blocking the watch face from front.
      // Reduced offset now that radius is larger.
      occluderRef.current.position.z = wristRadius * 0.08
    }
  })

  if (!wristPosition || !enabled) return null

  return (
    <group ref={groupRef}>
      <mesh ref={occluderRef} renderOrder={-1}>
        <cylinderGeometry args={[1, 1, 1, 32, 1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>
    </group>
  )
}
