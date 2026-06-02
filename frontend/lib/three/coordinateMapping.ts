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
  /** Wrist position in world space */
  origin: THREE.Vector3
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

  return {
    xAxis: X,
    yAxis: Y,
    zAxis: Z,
    origin: wristVec.clone(),
  }
}

/**
 * @deprecated Use computeWristQuaternion — identical math, canonical name.
 */
export const calculateWristQuaternion = computeWristQuaternion

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
