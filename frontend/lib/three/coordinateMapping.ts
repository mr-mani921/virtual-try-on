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
 * Calculate wrist orientation as a quaternion from three anchor landmarks.
 *
 * Coordinate frame built on the wrist plane:
 *   Y (up)     — wrist → midpoint of knuckle row (along forearm toward fingers)
 *   X (right)  — pinky base → index base (across palm width)
 *   Z (normal) — out of the back of the hand (palm normal)
 *
 * A full Gram-Schmidt pass guarantees the basis is orthonormal regardless of
 * landmark noise, eliminating the shear that caused jitter with the old approach.
 * Returning a Quaternion instead of an Euler avoids gimbal-lock discontinuities
 * when the wrist rotates through ±90° pitch — the range every watch wearer hits.
 */
export function calculateWristQuaternion(
  wrist: WorldCoordinates,
  indexBase: WorldCoordinates,
  pinkyBase: WorldCoordinates
): THREE.Quaternion {
  const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z)
  const indexVec = new THREE.Vector3(indexBase.x, indexBase.y, indexBase.z)
  const pinkyVec = new THREE.Vector3(pinkyBase.x, pinkyBase.y, pinkyBase.z)

  // Primary axis: wrist toward the midpoint of the knuckle row.
  // Using the midpoint (not just wrist→index) gives a more stable axis that
  // doesn't drift when the index finger spreads.
  const midKnuckles = new THREE.Vector3()
    .addVectors(indexVec, pinkyVec)
    .multiplyScalar(0.5)
  const upAxis = new THREE.Vector3().subVectors(midKnuckles, wristVec).normalize()

  // Secondary axis: across the palm from pinky to index.
  const rightAxis = new THREE.Vector3().subVectors(indexVec, pinkyVec).normalize()

  // Gram-Schmidt step 1: derive the palm normal orthogonal to both axes.
  const normalAxis = new THREE.Vector3().crossVectors(rightAxis, upAxis).normalize()

  // Gram-Schmidt step 2: re-derive right so the basis is perfectly orthonormal.
  rightAxis.crossVectors(upAxis, normalAxis).normalize()

  // Build rotation matrix and extract quaternion.
  // makeBasis(X, Y, Z) maps local axes to world axes:
  //   local +X → rightAxis, local +Y → upAxis, local +Z → normalAxis
  const matrix = new THREE.Matrix4().makeBasis(rightAxis, upAxis, normalAxis)
  return new THREE.Quaternion().setFromRotationMatrix(matrix)
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
