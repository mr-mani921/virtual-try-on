import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Full per-watch calibration config.
 *
 * All offsets are expressed in the WRIST LOCAL COORDINATE FRAME
 * (from computeWristQuaternion):
 *   +X  lateral (index → pinky)
 *   +Y  into palm / depth into wrist
 *   +Z  forearm direction (wrist → fingers)
 *
 * The calibration system is applied AFTER the wrist coordinate frame is
 * computed but BEFORE the smoothing pass, so that smoothing always
 * interpolates the fully-calibrated target.
 */
export interface WatchCalibration {
  /** World-space scale multiplier applied on top of the normalised model size. */
  scale: number

  /**
   * Position offset in wrist local frame.
   *   x: lateral shift (toward pinky)
   *   y: depth into wrist ("wrap-around" dimension, positive = deeper)
   *   z: along forearm (positive = toward fingers)
   */
  positionOffset: { x: number; y: number; z: number }

  /**
   * Rotation offset stored as Euler XYZ (radians).
   * Applied as: finalQuat = wristQuat × fromEuler(rotationOffset)
   * The calibration helpers convert this to a quaternion internally.
   */
  rotationOffset: { x: number; y: number; z: number }

  /**
   * Per-watch adjustment to the occluder's local position (wrist frame).
   * Added on top of the occluder's auto-computed palm offset.
   *   x: lateral bias
   *   y: additional depth bias (positive = push further into wrist)
   *   z: forearm shift
   */
  occluderOffset: { x: number; y: number; z: number }

  /**
   * Per-watch wrist-fit bias (additive to positionOffset.y).
   * Use this to compensate for model-geometry differences:
   *   positive → sits deeper in wrist (thick/bulky models)
   *   negative → sits more on top (slim/flat models)
   * Default: 0
   */
  wristFitBias: number

  /** Quaternion slerp factor for position + rotation smoothing (0.15–0.45). */
  smoothing: number
}

/**
 * Snapshot of the wrist's world-space pose after computeWristQuaternion.
 * Both fields should be pre-allocated refs when used inside a render loop.
 */
export interface WristTransform {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
}

// ─── Module-level identity quaternion (avoids allocation in the hot path) ────
const _IDENTITY_QUAT = new THREE.Quaternion()

// ─── GC-free render-loop helpers ──────────────────────────────────────────────

/**
 * Compute the watch's target world position.
 * Zero heap allocation — all working vectors are caller-supplied refs.
 *
 * @param wristTransform  Current wrist pose (position + quaternion).
 * @param config          positionOffset + wristFitBias fields from WatchCalibration.
 * @param outOffset       Pre-allocated temp Vector3 (overwritten).
 * @param outPosition     Pre-allocated result Vector3 (overwritten with world pos).
 * @returns               outPosition, for method chaining.
 */
export function computeTargetPosition(
  wristTransform: WristTransform,
  config: Pick<WatchCalibration, 'positionOffset' | 'wristFitBias'>,
  outOffset: THREE.Vector3,
  outPosition: THREE.Vector3,
): THREE.Vector3 {
  const { positionOffset, wristFitBias } = config
  outOffset.set(
    positionOffset.x,
    positionOffset.y + wristFitBias,
    positionOffset.z,
  )
  outOffset.applyQuaternion(wristTransform.quaternion)
  outPosition.copy(wristTransform.position).add(outOffset)
  return outPosition
}

/**
 * Compute the watch's target rotation quaternion.
 * Zero heap allocation — all working objects are caller-supplied refs.
 *
 * @param wristTransform  Current wrist pose (quaternion is used).
 * @param config          rotationOffset field from WatchCalibration.
 * @param outEuler        Pre-allocated temp Euler (overwritten).
 * @param outOffsetQuat   Pre-allocated temp Quaternion (overwritten).
 * @param outQuat         Pre-allocated result Quaternion (overwritten).
 * @returns               outQuat, for method chaining.
 */
export function computeTargetRotation(
  wristTransform: WristTransform,
  config: Pick<WatchCalibration, 'rotationOffset'>,
  outEuler: THREE.Euler,
  outOffsetQuat: THREE.Quaternion,
  outQuat: THREE.Quaternion,
): THREE.Quaternion {
  const { rotationOffset } = config
  outEuler.set(rotationOffset.x, rotationOffset.y, rotationOffset.z)
  outOffsetQuat.setFromEuler(outEuler)
  outQuat.multiplyQuaternions(wristTransform.quaternion, outOffsetQuat)
  return outQuat
}

// ─── Convenience wrapper (allocates — do NOT call inside useFrame) ─────────────

/**
 * Directly apply a complete watch calibration to a Three.js group.
 * Sets group.position, group.quaternion, and group.scale in one call.
 *
 * NOT safe inside the render loop (allocates temporaries each call).
 * Use computeTargetPosition / computeTargetRotation with pre-allocated
 * refs inside useFrame instead.
 *
 * Typical use-cases: unit tests, one-shot snapshot renders, or
 * model-preview tools running outside the AR frame loop.
 *
 * @param watchGroup      The Three.js Group to transform.
 * @param wristTransform  Wrist world pose (position + quaternion).
 * @param config          Full WatchCalibration for this watch model.
 * @param normalizedScale 1/maxDim factor from model normalisation (see WatchModel).
 * @param handedness      'Left' mirrors the Z scale to flip the model.
 */
export function applyWatchCalibration(
  watchGroup: THREE.Group,
  wristTransform: WristTransform,
  config: WatchCalibration,
  normalizedScale = 1,
  handedness: 'Left' | 'Right' = 'Right',
): void {
  const offsetVec  = new THREE.Vector3()
  const targetPos  = new THREE.Vector3()
  const euler      = new THREE.Euler()
  const offsetQuat = new THREE.Quaternion()
  const targetQuat = new THREE.Quaternion()

  computeTargetPosition(wristTransform, config, offsetVec, targetPos)
  computeTargetRotation(wristTransform, config, euler, offsetQuat, targetQuat)

  watchGroup.position.copy(targetPos)
  watchGroup.quaternion.copy(targetQuat)

  const s = normalizedScale * config.scale
  watchGroup.scale.set(s, s, handedness === 'Left' ? -s : s)
}

// ─── Factory helpers ───────────────────────────────────────────────────────────

/** Return a WristTransform struct backed by the supplied THREE objects. */
export function makeWristTransform(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
): WristTransform {
  return { position, quaternion }
}

/**
 * Return a WristTransform that wraps a plain-object wrist position and an
 * optional quaternion, re-using provided pre-allocated Vector3.
 * Identity quaternion is substituted when orientation is null/undefined.
 */
export function wristTransformFromCoords(
  wristPosition: { x: number; y: number; z: number },
  handOrientation: THREE.Quaternion | null | undefined,
  outPositionVec: THREE.Vector3,
): WristTransform {
  outPositionVec.set(wristPosition.x, wristPosition.y, wristPosition.z)
  return {
    position: outPositionVec,
    quaternion: handOrientation ?? _IDENTITY_QUAT,
  }
}

/** Zero-bias calibration suitable as a default / reset value. */
export function defaultCalibration(): WatchCalibration {
  return {
    scale: 2.5,
    positionOffset:  { x: 0, y: 0.02, z: 0 },
    rotationOffset:  { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    occluderOffset:  { x: 0, y: 0, z: 0 },
    wristFitBias:    0,
    smoothing:       0.3,
  }
}
