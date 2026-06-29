import * as THREE from 'three'
import type { Landmark } from '@/lib/mediapipe/types'

export interface ScreenCoordinates {
  x: number
  y: number
}

export interface WorldCoordinates {
  x: number
  y: number
  z: number
}

export interface CoordinateMappingOptions {
  videoWidth: number
  videoHeight: number
  camera: THREE.Camera
  flipHorizontal?: boolean
}

export interface LandmarkOrientationOptions {
  videoWidth: number
  videoHeight: number
  flipHorizontal?: boolean
}

/**
 * Convert MediaPipe normalized coordinates (0-1) to screen space pixels
 */
export function normalizedToScreen(
  landmark: Landmark,
  videoWidth: number,
  videoHeight: number,
  flipHorizontal: boolean = true
): ScreenCoordinates {
  let x = landmark.x * videoWidth
  
  if (flipHorizontal) {
    x = videoWidth - x
  }
  
  const y = landmark.y * videoHeight
  
  return { x, y }
}

/**
 * Convert screen space coordinates to normalized device coordinates (NDC)
 * NDC range: x[-1, 1], y[-1, 1]
 */
export function screenToNDC(
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  const x = (screenX / screenWidth) * 2 - 1
  const y = -(screenY / screenHeight) * 2 + 1
  
  return { x, y }
}

/**
 * Convert MediaPipe landmark to Three.js world coordinates
 * Uses camera projection to map 2D screen position to 3D world space
 */
export function landmarkToWorld(
  landmark: Landmark,
  options: CoordinateMappingOptions
): WorldCoordinates {
  const { videoWidth, videoHeight, camera, flipHorizontal = true } = options
  
  // Step 1: Normalized (0-1) → Screen pixels
  const screen = normalizedToScreen(landmark, videoWidth, videoHeight, flipHorizontal)
  
  // Step 2: Screen pixels → NDC (-1 to 1)
  const ndc = screenToNDC(screen.x, screen.y, videoWidth, videoHeight)
  
  // Step 3: NDC → World space using camera
  const vector = new THREE.Vector3(ndc.x, ndc.y, 0.5)
  vector.unproject(camera)
  
  // Step 4: Calculate direction from camera
  const direction = vector.sub(camera.position).normalize()
  
  // Step 5: Use MediaPipe z-depth to determine distance
  // MediaPipe z is relative depth (negative = closer to camera)
  // Scale it to a reasonable distance (e.g., 5-10 units from camera)
  const baseDistance = 8
  const depthScale = 3
  const distance = baseDistance + landmark.z * depthScale
  
  // Step 6: Calculate final world position
  const worldPosition = camera.position.clone().add(direction.multiplyScalar(distance))
  
  return {
    x: worldPosition.x,
    y: worldPosition.y,
    z: worldPosition.z,
  }
}

/**
 * Convert multiple landmarks to world coordinates
 */
export function landmarksToWorld(
  landmarks: Landmark[],
  options: CoordinateMappingOptions
): WorldCoordinates[] {
  return landmarks.map(landmark => landmarkToWorld(landmark, options))
}

/**
 * Named axes of the wrist local coordinate frame, used for debug visualization
 * and for downstream consumers that need raw axis vectors.
 */
export interface WristAxes {
  /** Index → pinky direction (hand width axis) */
  xAxis: THREE.Vector3
  /** Derived from cross(Z, X) — maintains right-handed system */
  yAxis: THREE.Vector3
  /** Wrist → palm midpoint (forearm / finger direction) */
  zAxis: THREE.Vector3
  /**
   * Direct palm normal: normalize(cross(indexBase - wrist, pinkyBase - wrist)).
   * Parallel to yAxis but computed without Gram-Schmidt, making it a more
   * direct signal for dorsal-side detection.
   * Points toward the palm (palmar side); negate for dorsal direction.
   */
  palmNormal: THREE.Vector3
  /** Wrist position in world space */
  origin: THREE.Vector3
}

/**
 * Compute the palm normal directly from three landmarks.
 *
 * normal = normalize(cross(indexBase - wrist, pinkyBase - wrist))
 *
 * The result points toward the palmar side of the hand (i.e. toward the camera
 * when the palm faces the camera).  Negate to get the dorsal direction — the
 * side where a watch sits.
 *
 * This is a direct geometric measurement (no Gram-Schmidt) making it a clean
 * signal for dorsal-side detection and palm-surface alignment.
 */
export function computePalmNormal(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  pinkyBase: WorldCoordinates,
): THREE.Vector3 {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const v1 = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z).sub(wristVec)
  const v2 = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z).sub(wristVec)
  return new THREE.Vector3().crossVectors(v1, v2).normalize()
}

function landmarkToOrientationVector(
  landmark: Landmark,
  options: LandmarkOrientationOptions,
): THREE.Vector3 {
  const { videoWidth, videoHeight, flipHorizontal = true } = options
  const aspect = videoWidth / videoHeight
  const x = (flipHorizontal ? 1 - landmark.x : landmark.x) - 0.5
  const y = 0.5 - landmark.y

  return new THREE.Vector3(
    x * aspect,
    y,
    -landmark.z,
  )
}

function computeWristQuaternionFromVectors(
  wristVec: THREE.Vector3,
  indexVec: THREE.Vector3,
  middleVec: THREE.Vector3 | null,
  pinkyVec: THREE.Vector3,
): THREE.Quaternion {
  const forwardTarget = middleVec ?? new THREE.Vector3()
    .addVectors(indexVec, pinkyVec)
    .multiplyScalar(0.5)

  const Z = new THREE.Vector3().subVectors(forwardTarget, wristVec).normalize()
  const X = new THREE.Vector3().subVectors(pinkyVec, indexVec).normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()

  X.crossVectors(Y, Z).normalize()
  Z.crossVectors(X, Y).normalize()

  const matrix = new THREE.Matrix4().makeBasis(X, Y, Z)
  return new THREE.Quaternion().setFromRotationMatrix(matrix)
}

/**
 * Compute palm normal directly in MediaPipe landmark 3D space, converted into
 * the Three.js overlay camera frame. Unlike landmarkToWorld(), this does not
 * re-project each landmark through the scene camera, so wrist yaw/side poses
 * preserve MediaPipe's anatomical depth instead of being pulled toward the
 * image plane.
 */
export function computePalmNormalFromLandmarks(
  wrist: Landmark,
  indexBase: Landmark,
  pinkyBase: Landmark,
  options: LandmarkOrientationOptions,
): THREE.Vector3 {
  const wristVec = landmarkToOrientationVector(wrist, options)
  const indexVec = landmarkToOrientationVector(indexBase, options)
  const pinkyVec = landmarkToOrientationVector(pinkyBase, options)
  const v1 = new THREE.Vector3().subVectors(indexVec, wristVec)
  const v2 = new THREE.Vector3().subVectors(pinkyVec, wristVec)
  return new THREE.Vector3().crossVectors(v1, v2).normalize()
}

/**
 * Build the wrist quaternion from MediaPipe's own 3D landmark space.
 *
 * Position mapping still uses landmarkToWorld(), but orientation should be
 * anatomical: +Z follows wrist-to-hand, +X follows index-to-pinky, and +Y is
 * their perpendicular. Keeping this independent from camera unprojection makes
 * the watch rotate with the wrist instead of staying visually camera-facing.
 */
export function computeWristQuaternionFromLandmarks(
  wrist: Landmark,
  indexBase: Landmark,
  pinkyBase: Landmark,
  options: LandmarkOrientationOptions,
): THREE.Quaternion {
  const wristVec = landmarkToOrientationVector(wrist, options)
  const indexVec = landmarkToOrientationVector(indexBase, options)
  const pinkyVec = landmarkToOrientationVector(pinkyBase, options)

  return computeWristQuaternionFromVectors(wristVec, indexVec, null, pinkyVec)
}

/**
 * V2 landmark-space wrist quaternion using Middle MCP for the forearm/finger
 * axis while keeping the lateral axis on Index MCP to Pinky MCP.
 */
export function computeWristQuaternionV2FromLandmarks(
  wrist: Landmark,
  indexBase: Landmark,
  middleBase: Landmark,
  pinkyBase: Landmark,
  options: LandmarkOrientationOptions,
): THREE.Quaternion {
  const wristVec = landmarkToOrientationVector(wrist, options)
  const indexVec = landmarkToOrientationVector(indexBase, options)
  const middleVec = landmarkToOrientationVector(middleBase, options)
  const pinkyVec = landmarkToOrientationVector(pinkyBase, options)

  return computeWristQuaternionFromVectors(wristVec, indexVec, middleVec, pinkyVec)
}

/**
 * Build a mathematically correct wearable coordinate frame from three landmarks
 * and return the resulting quaternion.
 *
 * Axis convention:
 *   +Z  wrist → palm midpoint  (forearm / finger direction)
 *   +X  index MCP → pinky MCP  (hand width direction)
 *   +Y  cross(Z, X)             (right-handed — points into the palm)
 *
 * Two re-orthogonalization passes remove any residual non-orthogonality that
 * MediaPipe landmark noise can introduce, keeping the basis perfectly orthonormal
 * across all frames.  Returning a Quaternion (not an Euler) avoids gimbal-lock
 * discontinuities when the wrist passes through ±90° pitch.
 */
export function computeWristQuaternion(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  pinkyBase: WorldCoordinates
): THREE.Quaternion {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z)
  const pinkyVec = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z)

  // Palm midpoint from the two outermost MCP landmarks.
  // Using the midpoint rather than a single knuckle improves stability when
  // individual fingers spread or curl.
  const palmMidpoint = new THREE.Vector3()
    .addVectors(indexVec, pinkyVec)
    .multiplyScalar(0.5)

  // Z — forward / forearm direction (wrist toward palm midpoint)
  const Z = new THREE.Vector3().subVectors(palmMidpoint, wristVec).normalize()

  // X — hand width direction (index MCP toward pinky MCP)
  const X = new THREE.Vector3().subVectors(pinkyVec, indexVec).normalize()

  // Y — right-handed perpendicular: cross(Z, X)
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()

  // Re-orthogonalize to purge residual non-orthogonality from landmark noise.
  // Pass 1: correct X from the now-stable Y and Z.
  // Pass 2: correct Z from the corrected X and Y.
  X.crossVectors(Y, Z).normalize()
  Z.crossVectors(X, Y).normalize()

  // Build rotation matrix — makeBasis columns are the world directions for
  // local +X, +Y, +Z respectively — then extract quaternion.
  const matrix = new THREE.Matrix4().makeBasis(X, Y, Z)
  return new THREE.Quaternion().setFromRotationMatrix(matrix)
}

/**
 * Same computation as computeWristQuaternion but returns the raw axis vectors
 * and wrist origin instead of a quaternion.  Use this for debug visualization
 * or any downstream code that needs explicit axis directions.
 */
export function computeWristAxes(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  pinkyBase: WorldCoordinates
): WristAxes {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z)
  const pinkyVec = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z)

  const palmMidpoint = new THREE.Vector3()
    .addVectors(indexVec, pinkyVec)
    .multiplyScalar(0.5)

  const Z = new THREE.Vector3().subVectors(palmMidpoint, wristVec).normalize()
  const X = new THREE.Vector3().subVectors(pinkyVec, indexVec).normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  X.crossVectors(Y, Z).normalize()
  Z.crossVectors(X, Y).normalize()

  // Direct palm normal: no Gram-Schmidt, pure geometric measurement.
  const v1 = new THREE.Vector3().subVectors(indexVec, wristVec)
  const v2 = new THREE.Vector3().subVectors(pinkyVec, wristVec)
  const palmNormal = new THREE.Vector3().crossVectors(v1, v2).normalize()

  return {
    xAxis: X,
    yAxis: Y,
    zAxis: Z,
    palmNormal,
    origin: wristVec.clone(),
  }
}

/**
 * @deprecated Use computeWristQuaternion — identical math, canonical name.
 */
export const calculateWristQuaternion = computeWristQuaternion

// ─────────────────────────────────────────────────────────────────────────────
// WRIST COORDINATE SYSTEM V2
// ─────────────────────────────────────────────────────────────────────────────
//
// V2 IMPROVEMENTS:
// 1. Uses Middle MCP landmark instead of computed palm midpoint
// 2. Middle finger is anatomically central and most stable
// 3. Reduces noise from midpoint computation (Index+Pinky)/2
// 4. Less affected by individual finger spreading/curling
// 5. More consistent during wrist rotation and palm-up/back-hand transitions
//
// COORDINATE FRAME V2 (same axis meanings as V1):
//   +Z  wrist → middle MCP     (forearm / finger direction)
//   +X  index MCP → pinky MCP  (hand width / lateral)
//   +Y  cross(Z, X)            (right-handed — points into the palm)
//
// V1 vs V2 DIFFERENCE:
//   V1: Z = wrist → palm midpoint, where midpoint = (Index+Pinky)/2
//   V2: Z = wrist → middle MCP (direct single landmark)
//
// WHY V2 IS MORE STABLE:
// - Middle MCP is single landmark (no midpoint computation noise)
// - Middle finger is anatomically central (most stable reference)
// - Direct measurement avoids error propagation from averaging
// - Less sensitivity to individual finger movements
// - Same axis meanings as V1 = same rotation offsets work
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute wrist quaternion using V2 coordinate system with Middle MCP landmark.
 *
 * V2 uses Middle MCP instead of palm midpoint, providing:
 * - More stable Z axis (forearm direction)
 * - Reduced computation noise
 * - Less sensitivity to finger spreading/curling
 * - Better stability during wrist rotation
 *
 * @param wrist        Wrist landmark (origin)
 * @param indexBase    Index MCP landmark (lateral reference)
 * @param middleBase   Middle MCP landmark (forearm direction reference) - NEW in V2
 * @param pinkyBase    Pinky MCP landmark (lateral reference)
 * @returns            Quaternion representing wrist orientation
 */
export function computeWristQuaternionV2(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  middleBase: WorldCoordinates,
  pinkyBase: WorldCoordinates
): THREE.Quaternion {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z)
  const middleVec = new THREE.Vector3(middleBase.x, middleBase.y, middleBase.z)
  const pinkyVec = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z)

  // Z — forward / forearm direction (wrist toward middle MCP)
  // NEW in V2: Uses middle MCP instead of palm midpoint for stability
  // Middle finger is anatomically central and most stable
  const Z = new THREE.Vector3().subVectors(middleVec, wristVec).normalize()

  // X — hand width direction (index MCP toward pinky MCP)
  // Same as V1, this is the most stable lateral axis
  const X = new THREE.Vector3().subVectors(pinkyVec, indexVec).normalize()

  // Y — right-handed perpendicular: cross(Z, X)
  // Points into the palm (perpendicular to both Z and X)
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()

  // Re-orthogonalize to purge residual non-orthogonality from landmark noise.
  // Pass 1: correct X from the now-stable Y and Z.
  X.crossVectors(Y, Z).normalize()
  
  // Pass 2: correct Z from the corrected X and Y.
  Z.crossVectors(X, Y).normalize()

  // Build rotation matrix — makeBasis columns are the world directions for
  // local +X, +Y, +Z respectively — then extract quaternion.
  const matrix = new THREE.Matrix4().makeBasis(X, Y, Z)
  return new THREE.Quaternion().setFromRotationMatrix(matrix)
}

/**
 * Compute wrist axes using V2 coordinate system with Middle MCP landmark.
 *
 * Returns raw axis vectors and origin for debug visualization or downstream
 * consumers that need explicit axis directions.
 *
 * @param wrist        Wrist landmark (origin)
 * @param indexBase    Index MCP landmark (lateral reference)
 * @param middleBase   Middle MCP landmark (perpendicular/dorsal reference) - NEW in V2
 * @param pinkyBase    Pinky MCP landmark (lateral reference)
 * @returns            WristAxes with orthogonal X, Y, Z axes and palm normal
 */
export function computeWristAxesV2(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  middleBase: WorldCoordinates,
  pinkyBase: WorldCoordinates
): WristAxes {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z)
  const middleVec = new THREE.Vector3(middleBase.x, middleBase.y, middleBase.z)
  const pinkyVec = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z)

  // Build V2 coordinate frame (same as V1 but using Middle MCP instead of midpoint)
  const Z = new THREE.Vector3().subVectors(middleVec, wristVec).normalize()
  const X = new THREE.Vector3().subVectors(pinkyVec, indexVec).normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize()
  X.crossVectors(Y, Z).normalize()
  Z.crossVectors(X, Y).normalize()

  // Direct palm normal: same computation as V1 for compatibility
  // Direct geometric measurement from wrist + index + pinky
  const v1 = new THREE.Vector3().subVectors(indexVec, wristVec)
  const v2 = new THREE.Vector3().subVectors(pinkyVec, wristVec)
  const palmNormal = new THREE.Vector3().crossVectors(v1, v2).normalize()

  return {
    xAxis: X,
    yAxis: Y,
    zAxis: Z,
    palmNormal,
    origin: wristVec.clone(),
  }
}

/**
 * Smooth coordinate transitions using linear interpolation
 */
export function lerpWorldCoordinates(
  current: WorldCoordinates,
  target: WorldCoordinates,
  alpha: number = 0.3
): WorldCoordinates {
  return {
    x: THREE.MathUtils.lerp(current.x, target.x, alpha),
    y: THREE.MathUtils.lerp(current.y, target.y, alpha),
    z: THREE.MathUtils.lerp(current.z, target.z, alpha),
  }
}
