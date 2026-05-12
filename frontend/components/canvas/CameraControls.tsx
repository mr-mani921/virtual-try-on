'use client'

import { OrbitControls as DreiOrbitControls } from '@react-three/drei'

export function CameraControls() {
  return (
    <DreiOrbitControls
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={10}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
    />
  )
}

/**
 * SENIOR REVIEW NOTES:
 * 
 * Q: Why not use drei's <CameraControls> instead?
 * A: <CameraControls> is more advanced (smooth transitions, animations).
 *    <OrbitControls> is simpler and sufficient for learning.
 *    For production AR watch, we might upgrade to <CameraControls>.
 * 
 * Q: What about touch controls on mobile?
 * A: OrbitControls automatically handles touch:
 *    - One finger: Rotate
 *    - Two fingers: Zoom (pinch)
 *    - Two fingers: Pan (drag)
 * 
 * Q: Performance impact?
 * A: Minimal. Controls only update when user interacts.
 *    No performance cost when idle.
 * 
 * Q: What about keyboard controls?
 * A: OrbitControls supports arrow keys by default.
 *    Can be disabled with enableKeys={false}.
 * 
 * Q: How does this work with AR mode?
 * A: In AR mode, we'll conditionally render:
 *    ```typescript
 *    {!isARMode && <CameraControls />}
 *    ```
 *    When AR is active, camera position will be controlled by
 *    hand tracking data from MediaPipe.
 * 
 * ALTERNATIVE CONTROLS:
 * - TrackballControls: No up/down limits (can flip upside down)
 * - FlyControls: First-person flying (like a flight simulator)
 * - PointerLockControls: First-person shooter style
 * - MapControls: Top-down view (like Google Maps)
 * 
 * WHY OrbitControls?
 * - Most intuitive for object inspection
 * - Industry standard for 3D viewers
 * - Users already familiar with the interaction
 * 
 * FUTURE ENHANCEMENTS:
 * - Add auto-rotate when idle
 * - Add "reset camera" button
 * - Add preset camera positions (front, side, top)
 * - Add smooth transitions between positions
 */
