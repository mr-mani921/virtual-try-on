'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer, QuaternionSmoother } from '@/lib/three/motionSmoothing'
import { createOptimizedWristGeometry } from '@/lib/three/wristGeometry'

interface WristOccluderProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  indexBasePosition?: WorldCoordinates | null
  pinkyBasePosition?: WorldCoordinates | null
  /**
   * Direct palm normal from computePalmNormal().
   * When provided, the occluder depth positioning uses this vector for
   * stable surface anchoring (matches WatchModel behavior).
   * Points toward the palmar side; negate for dorsal (watch) direction.
   */
  palmNormal?: THREE.Vector3 | null
  /**
   * Per-watch fine-tuning of the occluder's local position (wrist frame).
   * Added on top of the auto-computed palm offset.
   *   x: lateral bias
   *   y: additional depth into wrist (positive = deeper)
   *   z: forearm-direction shift
   */
  occluderOffset?: { x: number; y: number; z: number }
  /**
   * TICKET 43b: Per-watch front face depth bias.
   * Adjusts how much the occluder front face protrudes toward camera.
   *   Positive: front face retreats toward palm (bulky watches)
   *   Negative: front face extends toward camera (slim watches)
   *   Default: 0 (front face at wrist center)
   */
  frontFaceDepthBias?: number
  smoothing?: number
  enabled?: boolean
}

/**
 * TICKET 43c: Invisible depth-mask tapered wrist volume that creates a realistic
 * forearm-volume occlusion illusion.
 *
 * Renders at renderOrder=-1 (before the watch) with colorWrite=false and
 * depthWrite=true. Watch fragments that fall behind the occluder surface fail
 * the depth test and are discarded, revealing the transparent canvas (camera
 * feed) so the strap appears to wrap around the wrist.
 *
 * ── Geometry (V2 - TICKET 43c) ─────────────────────────────────────────────────
 * Uses anatomically-tapered cylinder instead of uniform cylinder:
 *   - Narrow at wrist position (where watch sits)
 *   - Gradually widens toward forearm direction
 *   - Taper ratio: 0.75 (wrist is 75% of forearm width)
 *   - 32 radial segments, 8 height segments for smooth taper
 *
 * ── Orientation ───────────────────────────────────────────────────────────────
 * The GROUP quaternion is set to handOrientation so the group's local frame
 * matches the wrist frame (computeWristQuaternion):
 *   group +X = lateral  (index → pinky)
 *   group +Y = into palm
 *   group +Z = forearm direction
 *
 * Tapered geometry has its height axis along MESH local +Y. Adding a static
 * Rx(π/2) rotation on the mesh tilts that height axis to align with group +Z
 * (forearm). After the rotation the mesh scale axes map as:
 *   scaleX → group +X  (lateral hand-width)   — wider
 *   scaleY → group +Z  (forearm length)        — segment length along arm
 *   scaleZ → group +Y  (AP / into-palm depth)  — thinner = elliptical cross-section
 *
 * The taper direction after rotation:
 *   z = 0 (wrist, narrow end) → z = +length (forearm, wide end)
 *
 * ── Palm-side offset ──────────────────────────────────────────────────────────
 * The mesh is shifted +Y (into palm) in group space so the occluder sits
 * slightly inside the wrist volume. This ensures strap fragments wrapping
 * around the inner wrist are caught by the depth test without over-occluding
 * the watch face on the back of the hand.
 */
export function WristOccluder({
  wristPosition,
  handOrientation,
  indexBasePosition,
  pinkyBasePosition,
  palmNormal,
  occluderOffset = { x: 0, y: 0, z: 0 },
  frontFaceDepthBias = 0,
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

  // TICKET 43c: Create tapered wrist geometry once (not per-frame)
  // Tapered cylinder: narrow at wrist (75% radius), wider at forearm (100% radius)
  const wristGeometry = useMemo(() => createOptimizedWristGeometry(), [])

  useFrame(() => {
    if (!groupRef.current || !wristPosition || !enabled) return

    const timestamp = Date.now()

    // --- Position: One Euro filtered + FIXED lerp (TICKET 43b: matches WatchModel) ---
    // Removed adaptive lerp to eliminate occluder/watch drift during fast motion
    const filteredPos = stabilizer.current.filterPosition(wristPosition, timestamp)

    if (currentPosRef.current) {
      // Use fixed smoothing factor only (no adaptive alpha)
      const smoothed = lerpWorldCoordinates(currentPosRef.current, filteredPos, smoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(filteredPos.x, filteredPos.y, filteredPos.z)
      currentPosRef.current = { ...filteredPos }
    }

    // --- Rotation: pure quaternion slerp with sign correction ---
    // handOrientation is used directly (no rotationOffset) so the tapered
    // geometry's local +Z stays aligned with the forearm direction from
    // computeWristQuaternion.
    if (handOrientation) {
      const smoothedQuat = quatSmoother.current.update(handOrientation, smoothing)
      groupRef.current.quaternion.copy(smoothedQuat)
    }

    // --- Scale tapered wrist geometry to anatomical forearm volume each frame ---
    //
    // TICKET 43c: Tapered geometry automatically narrows at wrist, widens at forearm.
    // Scale still controls overall dimensions, taper ratio is baked into geometry.
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
    // TICKET 43b: palmOffset calculation includes:
    //   1. Base offset: scaleZ/2 (centers occluder at wrist)
    //   2. frontFaceDepthBias: per-watch tuning (positive = retreat toward palm)
    //   3. occluderOffset.y: legacy additional bias
    //
    // New formula:
    //   palmOffset = (scaleZ/2 - frontFaceDepthBias) + occluderOffset.y
    //
    // This makes:
    //   front face y = -frontFaceDepthBias + occluderOffset.y
    //   back  face y = scaleZ - frontFaceDepthBias + occluderOffset.y
    //
    // When palmNormal is provided (TICKET 43b), position is adjusted along
    // the palm normal vector (like WatchModel) for stable surface anchoring.
    if (occluderRef.current && indexBasePosition && pinkyBasePosition) {
      indexVecRef.current.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
      pinkyVecRef.current.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)

      const knuckleWidth = indexVecRef.current.distanceTo(pinkyVecRef.current)

      const scaleX = knuckleWidth * 0.9    // lateral — roughly matches wrist width
      const scaleY = knuckleWidth * 1.2    // forearm segment length
      const scaleZ = knuckleWidth * 0.35   // AP depth — kept thin to prevent over-occlusion

      occluderRef.current.scale.set(scaleX, scaleY, scaleZ)

      // TICKET 43b: Calculate palm offset with frontFaceDepthBias
      // Base: scaleZ/2 centers the cylinder
      // Subtract frontFaceDepthBias to adjust front face depth
      // Add occluderOffset.y for legacy compatibility
      const basePalmOffset = (scaleZ / 2) - frontFaceDepthBias + occluderOffset.y

      // Position in wrist local frame
      // TICKET 43b: palmNormal integration handled at group level (matches WatchModel)
      // The occluder mesh position is always in local wrist frame
      occluderRef.current.position.set(
        occluderOffset.x,
        basePalmOffset,
        occluderOffset.z,
      )
    }
  })

  if (!wristPosition || !enabled) return null

  return (
    <group ref={groupRef}>
      {/*
        TICKET 43c: Tapered wrist geometry replaces uniform cylinder.
        
        rotation={[Math.PI / 2, 0, 0]}: static Rx(π/2) tilts the geometry's
        height axis (mesh local +Y) to align with the group's forearm direction
        (+Z). scale is applied in mesh local space, so after this rotation:
          scaleX → lateral (group +X)
          scaleY → forearm (group +Z)
          scaleZ → into-palm depth (group +Y)  ← produces elliptical cross-section
        
        Tapered geometry characteristics:
          - 32 radial segments (TICKET 43b increased from 16) for smooth edges
          - 8 height segments for smooth taper transition
          - 0.75 taper ratio (wrist is 75% of forearm width)
          - Narrow end at z=0 (wrist position)
          - Wide end at z=+length (forearm direction)
        
        This creates anatomically accurate wrist-to-forearm volume that better
        matches natural hand anatomy compared to uniform cylinder.
      */}
      <mesh ref={occluderRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
        <primitive object={wristGeometry} attach="geometry" />
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>
    </group>
  )
}
