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
 * Invisible depth-mask ellipsoid that creates a realistic forearm-volume
 * occlusion illusion.
 *
 * Renders at renderOrder=-1 (before the watch) with colorWrite=false and
 * depthWrite=true.  Watch fragments that fall behind the occluder surface fail
 * the depth test and are discarded, revealing the transparent canvas (camera
 * feed) so the strap appears to wrap around the wrist.
 *
 * ── Orientation ───────────────────────────────────────────────────────────────
 * The GROUP quaternion is set to handOrientation so the group's local frame
 * matches the wrist frame (computeWristQuaternion):
 *   group +X = lateral  (index → pinky)
 *   group +Y = into palm
 *   group +Z = forearm direction
 *
 * CylinderGeometry has its height axis along MESH local +Y.  Adding a static
 * Rx(π/2) rotation on the mesh tilts that height axis to align with group +Z
 * (forearm).  After the rotation the mesh scale axes map as:
 *   scaleX → group +X  (lateral hand-width)   — wider
 *   scaleY → group +Z  (forearm length)        — segment length along arm
 *   scaleZ → group +Y  (AP / into-palm depth)  — thinner = elliptical cross-section
 *
 * ── Palm-side offset ──────────────────────────────────────────────────────────
 * The mesh is shifted +Y (into palm) in group space so the occluder sits
 * slightly inside the wrist volume.  This ensures strap fragments wrapping
 * around the inner wrist are caught by the depth test without over-occluding
 * the watch face on the back of the hand.
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

    // --- Scale ellipsoid to anatomical forearm volume each frame ---
    //
    // After mesh Rx(π/2) the scale axes map as:
    //   scaleX → group +X  (lateral)
    //   scaleY → group +Z  (forearm length along arm)
    //   scaleZ → group −Y  (toward camera) AND group +Y (into palm)
    //            ← scaleZ controls how far the front face protrudes toward camera!
    //
    // CRITICAL depth relationship:
    //   front face y = palmOffset − scaleZ/2
    //   back  face y = palmOffset + scaleZ/2
    //
    // Setting palmOffset = scaleZ/2 makes:
    //   front face y = 0  (exactly at wrist centre — no protrusion toward camera)
    //   back  face y = scaleZ (into wrist volume / palm side)
    //
    // Only fragments with depth > front-face depth are discarded.
    // Watch face and top strap (y < 0, toward camera) → pass depth test ✓
    // Inner wrist strap          (y > 0, into palm)  → fail depth test ✓
    if (occluderRef.current && indexBasePosition && pinkyBasePosition) {
      indexVecRef.current.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
      pinkyVecRef.current.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)

      const knuckleWidth = indexVecRef.current.distanceTo(pinkyVecRef.current)

      const scaleX = knuckleWidth * 0.9    // lateral — roughly matches wrist width
      const scaleY = knuckleWidth * 1.2    // forearm segment length
      const scaleZ = knuckleWidth * 0.35   // AP depth — kept thin to prevent over-occlusion

      occluderRef.current.scale.set(scaleX, scaleY, scaleZ)

      // palmOffset = scaleZ/2 → front face lands at group y = 0 (wrist centre).
      // The occluder volume occupies only y ∈ [0, scaleZ], i.e. purely into the
      // wrist — it never protrudes toward the camera regardless of hand distance.
      occluderRef.current.position.set(0, scaleZ / 2, 0)
    }
  })

  if (!wristPosition || !enabled) return null

  return (
    <group ref={groupRef}>
      {/*
        rotation={[Math.PI / 2, 0, 0]}: static Rx(π/2) tilts the cylinder's
        height axis (mesh local +Y) to align with the group's forearm direction
        (+Z).  scale is applied in mesh local space, so after this rotation:
          scaleX → lateral (group +X)
          scaleY → forearm (group +Z)
          scaleZ → into-palm depth (group +Y)  ← produces elliptical cross-section
        16 radial segments is sufficient for a smooth ellipse after non-uniform scaling.
      */}
      <mesh ref={occluderRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
        <cylinderGeometry args={[1, 1, 1, 16, 1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>
    </group>
  )
}
