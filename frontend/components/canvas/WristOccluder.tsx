import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer, QuaternionSmoother } from '@/lib/three/motionSmoothing'
import { createOptimizedWristGeometry } from '@/lib/three/wristGeometry'
import { HandMeasurementStabilizer } from '@/lib/diagnostics/HandMeasurementStabilizer'

interface WristOccluderProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  /**
   * TICKET 44h: Index finger MCP position (world coordinates).
   * Used to measure anatomical wrist width for occluder sizing.
   */
  indexBasePosition?: WorldCoordinates | null
  /**
   * TICKET 44h: Pinky finger MCP position (world coordinates).
   * Used to measure anatomical wrist width for occluder sizing.
   */
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
  /**
   * TICKET 44h: Watch's final scale (for proportional occluder scaling if needed).
   * Note: Occluder base dimensions are derived from stabilized wrist measurements,
   * NOT from watchScale. This maintains anatomical accuracy while both watch and
   * occluder use the same stabilization infrastructure.
   */
  watchScale?: number
  /**
   * TICKET 44d: Camera depth for distance-based occluder dampening.
   * When provided, reduces occluder depth growth at close range.
   */
  cameraDepth?: number
  /**
   * TICKET 44e: Debug visualization mode
   */
  debugMode?: boolean
  onDiagnostics?: (data: {
    scaleX: number
    scaleY: number
    scaleZ: number
    position: { x: number; y: number; z: number }
    // TICKET 44h: wrist measurement diagnostics
    rawWristWidth: number
    stabilizedWristWidth: number
    baseScaleX: number
    baseScaleY: number
    baseScaleZ: number
    depthRatio: number
    depthDampening: number
    watchScale: number
    palmRetreat: number
    basePalmOffset: number
    frontFaceY: number
    backFaceY: number
  }) => void
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
  watchScale = 1,
  cameraDepth,
  debugMode = false,
  onDiagnostics,
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

  // TICKET 44h: Wrist measurement stabilizer (same infrastructure as useDynamicScale)
  // Stabilizes anatomical wrist width before using for occluder dimensions
  const wristWidthStabilizer = useRef(
    new HandMeasurementStabilizer({
      medianWindowSize: 9,
      outlierThreshold: 0.25,
      regimeChangeThreshold: 0.30,
      regimeChangeFrames: 3,
    })
  )

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
    // TICKET 44d: Fixed close-range over-occlusion by making occluder proportional
    // to watch scale and dampening depth growth at close range.
    //
    // ROOT CAUSE: knuckleWidth is world-space and grows dramatically at close range
    // (30cm vs 80cm). Meanwhile, watch scale is stabilized + clamped + dampened.
    // This caused occluder to grow faster than watch → swallowing effect.
    //
    // FIX: Apply watchScale multiplier + distance-based depth dampening
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
    // TICKET 44h: Restore anatomical wrist sizing with stabilization
    // Occluder dimensions must represent the user's actual wrist, NOT a fixed size.
    // Use the same stabilization infrastructure as useDynamicScale (HandMeasurementStabilizer)
    // but keep occluder sizing independent from watch scaling logic.
    //
    // Key principles:
    //   - Watch scale = baseScale × sizeFactor × depthFactor (for watch model sizing)
    //   - Occluder scale = stabilizedWristWidth × anatomicalRatios (for wrist geometry)
    //   - Both use HandMeasurementStabilizer, but apply it to different purposes
    if (occluderRef.current && indexBasePosition && pinkyBasePosition) {
      // 1. Measure raw anatomical wrist width
      indexVecRef.current.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
      pinkyVecRef.current.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)
      const rawWristWidth = indexVecRef.current.distanceTo(pinkyVecRef.current)

      // 2. Stabilize the measurement (rolling median + outlier rejection)
      const stabilized = wristWidthStabilizer.current.update(rawWristWidth)
      const stabilizedWristWidth = stabilized.stabilized

      // 3. Apply anatomical ratios to stabilized measurement
      const baseScaleX = stabilizedWristWidth * 0.9    // lateral (knuckle width)
      const baseScaleY = stabilizedWristWidth * 1.2    // forearm segment length
      const baseScaleZ = stabilizedWristWidth * 0.16   // AP depth - thin for occlusion

      // 4. Distance-based depth dampening (TICKET 44d)
      let depthDampening = 1.0
      if (cameraDepth !== undefined) {
        const referenceDepth = 0.85 // meters
        const depthRatio = cameraDepth / referenceDepth
        depthDampening = Math.pow(depthRatio, 0.2)
        depthDampening = Math.max(0.3, Math.min(1.1, depthDampening))
      }

      // 5. Final dimensions (anatomical, not scaled by watchScale)
      const scaleX = baseScaleX
      const scaleY = baseScaleY
      const scaleZ = baseScaleZ * depthDampening

      occluderRef.current.scale.set(scaleX, scaleY, scaleZ)

      // TICKET 44h: Log anatomical sizing with stabilization
      const now = Date.now()
      if (!window.__lastOccluderLogTime || now - window.__lastOccluderLogTime > 1000) {
        window.__lastOccluderLogTime = now
        
        console.log('═══ OCCLUDER SCALE DERIVATION (Anatomical + Stabilized) ═══')
        console.log(`1. rawWristWidth:             ${rawWristWidth.toFixed(6)} ← distance(indexBase, pinkyBase) [anatomical measurement]`)
        console.log(`   ↓ HandMeasurementStabilizer`)
        console.log(`2. stabilizedWristWidth:      ${stabilizedWristWidth.toFixed(6)} [median=${stabilized.median.toFixed(6)}, outlier=${stabilized.wasOutlier}]`)
        console.log(`   ↓ × anatomical ratios`)
        console.log(`3. baseScaleX:                ${baseScaleX.toFixed(6)} (× 0.9 lateral)`)
        console.log(`4. baseScaleY:                ${baseScaleY.toFixed(6)} (× 1.2 forearm)`)
        console.log(`5. baseScaleZ:                ${baseScaleZ.toFixed(6)} (× 0.16 AP depth)`)
        console.log(`   ↓`)
        console.log(`6. depthDampening:            ${depthDampening.toFixed(6)} (pow(${cameraDepth ? (cameraDepth / 0.85).toFixed(3) : '1.0'}, 0.2), clamped [0.3, 1.1])`)
        console.log(`   ↓`)
        console.log(`7. scaleX (FINAL):            ${scaleX.toFixed(6)} = baseScaleX`)
        console.log(`8. scaleY (FINAL):            ${scaleY.toFixed(6)} = baseScaleY`)
        console.log(`9. scaleZ (FINAL):            ${scaleZ.toFixed(6)} = baseScaleZ × depthDampening`)
        console.log('')
        console.log('✓  ANATOMICAL SIZING:')
        console.log(`   Occluder represents user's actual wrist geometry`)
        console.log(`   Stabilized measurement (CV <5%), independent from watchScale`)
        console.log(`   watchScale = ${watchScale.toFixed(3)} (for reference, not used in occluder sizing)`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('')
      }

      // TICKET 43b/44d: Calculate palm offset with frontFaceDepthBias
      // Base: scaleZ/2 centers the cylinder
      // Subtract frontFaceDepthBias to adjust front face depth
      // Add occluderOffset.y for legacy compatibility
      // TICKET 44d: Push occluder slightly back to keep front face away from watch
      const palmRetreat = scaleZ * 0.15 // Small retreat to prevent front-face occlusion
      const basePalmOffset = (scaleZ / 2) - frontFaceDepthBias + occluderOffset.y + palmRetreat

      // TICKET 44h: Report diagnostic data with anatomical measurements
      if (onDiagnostics) {
        const worldPos = new THREE.Vector3()
        groupRef.current.getWorldPosition(worldPos)
        onDiagnostics({
          scaleX,
          scaleY,
          scaleZ,
          position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          rawWristWidth,
          stabilizedWristWidth,
          baseScaleX,
          baseScaleY,
          baseScaleZ,
          depthRatio: cameraDepth !== undefined ? cameraDepth / 0.85 : 1,
          depthDampening,
          watchScale,
          palmRetreat,
          basePalmOffset,
          frontFaceY: worldPos.y - scaleZ / 2,
          backFaceY: worldPos.y + scaleZ / 2,
        })
      }

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
        <meshBasicMaterial 
          colorWrite={debugMode ? true : false}
          depthWrite={true}
          color={debugMode ? '#ff0000' : undefined}
          transparent={debugMode}
          opacity={debugMode ? 0.3 : 1}
        />
      </mesh>
    </group>
  )
}
