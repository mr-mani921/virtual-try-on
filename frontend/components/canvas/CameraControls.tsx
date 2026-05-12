/**
 * CameraControls.tsx - Orbit Controls for Camera
 * 
 * PURPOSE:
 * Allows users to interact with the 3D scene:
 * - Left drag: Rotate around the object
 * - Right drag: Pan (move camera sideways)
 * - Scroll: Zoom in/out
 * 
 * WHY SEPARATE COMPONENT:
 * - Reusability: Can be used in any scene
 * - Configuration: Easy to adjust control settings
 * - Optional: Can be removed without affecting scene
 * 
 * FOR AR WATCH SYSTEM:
 * In the final AR version, we'll have TWO modes:
 * 1. Preview mode: OrbitControls enabled (user inspects watch before trying)
 * 2. AR mode: OrbitControls disabled (camera follows hand tracking)
 */

'use client'

import { OrbitControls as DreiOrbitControls } from '@react-three/drei'

export function CameraControls() {
  /**
   * ORBIT CONTROLS DEEP DIVE:
   * 
   * WHAT IS IT?
   * OrbitControls is a Three.js class that manipulates the camera based on
   * user input (mouse, touch, keyboard).
   * 
   * HOW IT WORKS:
   * 1. Listens to DOM events (mousedown, mousemove, wheel, etc.)
   * 2. Calculates new camera position/rotation
   * 3. Updates camera.position and camera.lookAt()
   * 4. Scene re-renders with new camera view
   * 
   * WHY FROM @react-three/drei?
   * drei is a helper library for R3F. It provides:
   * - Pre-configured R3F components
   * - Common Three.js patterns
   * - Reduced boilerplate
   * 
   * ALTERNATIVE (manual setup):
   * ```typescript
   * import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
   * 
   * const controls = new OrbitControls(camera, gl.domElement)
   * controls.enableDamping = true
   * 
   * useFrame(() => {
   *   controls.update() // Must call every frame
   * })
   * ```
   * 
   * drei's <OrbitControls> does this for you.
   * 
   * PROPS EXPLANATION:
   */
  return (
    <DreiOrbitControls
      /**
       * enableDamping:
       * Adds inertia to camera movement (smooth, natural feel).
       * 
       * HOW IT WORKS:
       * Without damping: Camera stops immediately when you release mouse
       * With damping: Camera continues moving and gradually slows down
       * 
       * IMPLEMENTATION:
       * Uses exponential decay: velocity *= dampingFactor each frame
       * 
       * WHY true?
       * - More natural interaction
       * - Professional feel
       * - Better UX
       * 
       * PERFORMANCE:
       * Negligible cost. Requires controls.update() every frame,
       * but drei handles this automatically.
       */
      enableDamping
      
      /**
       * dampingFactor:
       * Controls how quickly the camera slows down.
       * 
       * Range: 0 to 1
       * - 0: No damping (instant stop)
       * - 0.05: Slow, smooth deceleration (our choice)
       * - 1: Never stops (infinite sliding)
       * 
       * WHY 0.05?
       * Good balance between responsiveness and smoothness.
       * 
       * TUNING:
       * - Lower (0.01-0.03): More "weight", slower
       * - Higher (0.1-0.2): More "slippery", faster
       * 
       * FOR AR WATCH:
       * In preview mode, 0.05 is good.
       * In AR mode, we'll disable controls entirely.
       */
      dampingFactor={0.05}
      
      /**
       * minDistance / maxDistance:
       * Limits how close/far the camera can zoom.
       * 
       * WHY LIMITS?
       * - Prevents camera from going inside objects
       * - Prevents zooming too far (object becomes invisible)
       * - Maintains good viewing angles
       * 
       * VALUES:
       * - minDistance={2}: Can't get closer than 2 units
       * - maxDistance={10}: Can't get farther than 10 units
       * 
       * UNITS:
       * Three.js uses arbitrary units. Our box is 1x1x1.
       * - 2 units: Close-up view
       * - 10 units: Wide view
       * 
       * FOR AR WATCH:
       * Watch models are typically 0.05-0.1 units (real-world scale).
       * We'll adjust these values:
       * - minDistance={0.1}: Close-up of watch face
       * - maxDistance={0.5}: Full watch view
       */
      minDistance={2}
      maxDistance={10}
      
      /**
       * minPolarAngle / maxPolarAngle:
       * Limits vertical rotation (prevents camera from going upside down).
       * 
       * POLAR ANGLE:
       * Angle from the positive Y-axis (up direction).
       * - 0: Looking straight down (top view)
       * - Math.PI / 2: Looking horizontally (side view)
       * - Math.PI: Looking straight up (bottom view)
       * 
       * WHY LIMITS?
       * - Prevents disorienting upside-down views
       * - Keeps object in frame
       * - Maintains natural viewing angles
       * 
       * VALUES:
       * - minPolarAngle={Math.PI / 4}: Can't go higher than 45° from top
       * - maxPolarAngle={Math.PI / 1.5}: Can't go lower than ~120° from top
       * 
       * RESULT:
       * Camera stays in the "upper hemisphere" around the object.
       * 
       * FOR AR WATCH:
       * We'll allow more freedom:
       * - minPolarAngle={0}: Can view from directly above
       * - maxPolarAngle={Math.PI / 2}: Can view from side
       * (No bottom view needed for watch)
       */
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
