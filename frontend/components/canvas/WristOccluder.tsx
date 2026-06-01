'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer } from '@/lib/three/motionSmoothing'

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
 * depthWrite=true. Watch fragments that fall behind the cylinder surface fail
 * the depth test and are discarded, revealing the transparent canvas (camera
 * feed). This makes the strap appear to wrap around the wrist.
 *
 * The cylinder is oriented using handOrientation directly (no rotationOffset)
 * so its local +Y stays aligned with the forearm direction from
 * calculateWristQuaternion. A unit geometry (radius=1, height=1) is scaled
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
  const currentQuatRef = useRef(new THREE.Quaternion())
  const rotationInitializedRef = useRef(false)

  const stabilizer = useRef(new MotionStabilizer())

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

    // --- Rotation: handOrientation directly (no rotationOffset) ---
    // CylinderGeometry local +Y already maps to the forearm direction in wristQuat.
    if (handOrientation) {
      const filteredQuat = stabilizer.current.filterRotation(handOrientation, timestamp)

      if (!rotationInitializedRef.current) {
        currentQuatRef.current.copy(filteredQuat)
        rotationInitializedRef.current = true
      } else {
        currentQuatRef.current.slerp(filteredQuat, smoothing * 1.2)
      }

      groupRef.current.quaternion.copy(currentQuatRef.current)
    }

    // --- Scale unit cylinder to match wrist anatomy each frame ---
    if (occluderRef.current && indexBasePosition && pinkyBasePosition) {
      indexVecRef.current.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
      pinkyVecRef.current.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)

      const knuckleWidth = indexVecRef.current.distanceTo(pinkyVecRef.current)

      // Adult anatomy: wrist radius ≈ 35% of knuckle width.
      // Height covers the watch band area without clipping the case.
      const wristRadius = knuckleWidth * 0.35
      const cylinderHeight = knuckleWidth * 0.7

      occluderRef.current.scale.set(wristRadius, cylinderHeight, wristRadius)
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
