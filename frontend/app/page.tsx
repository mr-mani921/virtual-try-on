'use client'

import { Canvas } from '@react-three/fiber'
import { Scene } from '@/components/canvas/Scene'
import { CameraControls } from '@/components/canvas/CameraControls'

export default function Home() {
  return (
    <div className="w-full h-screen bg-zinc-900">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        gl={{ antialias: true }}
      >
        <Scene />
        <CameraControls />
      </Canvas>
    </div>
  )
}

/**
 * SENIOR REVIEW NOTES:
 * 
 * Q: Why not use Suspense?
 * A: We will! When we load GLTF models:
 *    ```typescript
 *    <Canvas>
 *      <Suspense fallback={<Loader />}>
 *        <Scene />
 *      </Suspense>
 *    </Canvas>
 *    ```
 *    For now, no async loading, so Suspense not needed.
 * 
 * Q: What about responsive canvas sizing?
 * A: Canvas automatically resizes to fill its container.
 *    We use h-screen (100vh) to fill viewport.
 *    Canvas listens to window resize events internally.
 * 
 * Q: Performance monitoring?
 * A: Add <Stats /> from drei for FPS counter:
 *    ```typescript
 *    import { Stats } from '@react-three/drei'
 *    <Canvas>
 *      <Stats />
 *      <Scene />
 *    </Canvas>
 *    ```
 * 
 * Q: What about pixel ratio for retina displays?
 * A: Canvas automatically uses window.devicePixelRatio.
 *    Can be capped with: gl={{ pixelRatio: Math.min(2, window.devicePixelRatio) }}
 *    (Prevents 3x rendering on high-DPI displays)
 * 
 * RENDERING PIPELINE SUMMARY:
 * 
 * 1. INITIALIZATION (once):
 *    - Canvas creates WebGLRenderer, Scene, Camera
 *    - R3F reconciler processes JSX tree
 *    - Three.js objects are created and added to scene graph
 * 
 * 2. RENDER LOOP (every frame):
 *    - requestAnimationFrame triggers
 *    - All useFrame callbacks execute
 *    - renderer.render(scene, camera) draws to canvas
 *    - Browser displays the frame
 * 
 * 3. REACT UPDATES (when state/props change):
 *    - React re-renders component
 *    - R3F reconciler diffs old vs new JSX
 *    - Only changed props are updated in Three.js objects
 *    - Next frame shows the changes
 * 
 * 4. CLEANUP (on unmount):
 *    - R3F calls dispose() on all geometries/materials
 *    - Three.js objects are removed from scene
 *    - Event listeners are removed
 *    - Render loop stops
 * 
 * FUTURE ARCHITECTURE:
 * 
 * page.tsx (this file)
 * ├─ Canvas
 * │  ├─ Suspense
 * │  │  └─ Scene
 * │  │     ├─ Lighting
 * │  │     ├─ Environment
 * │  │     ├─ WatchModel (GLTF)
 * │  │     └─ Hand (MediaPipe tracking)
 * │  ├─ CameraControls (conditional)
 * │  ├─ EffectComposer (post-processing)
 * │  └─ Stats (dev only)
 * └─ UI Overlay
 *    ├─ WatchSelector
 *    ├─ ARToggle
 *    └─ LightingControls
 */
