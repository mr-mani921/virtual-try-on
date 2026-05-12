/**
 * page.tsx - Main Application Entry Point
 * 
 * PURPOSE:
 * This is the Next.js App Router page component. It sets up:
 * 1. The Canvas (R3F entry point)
 * 2. The 3D Scene
 * 3. UI overlay (future: watch selection, AR controls)
 * 
 * ARCHITECTURE:
 * We separate concerns:
 * - page.tsx: Layout, routing, UI structure
 * - Scene.tsx: 3D content
 * - Box.tsx: Individual 3D objects
 * 
 * This makes the codebase maintainable as we add AR features.
 */

'use client'

import { Canvas } from '@react-three/fiber'
import { Scene } from '@/components/canvas/Scene'
import { CameraControls } from '@/components/canvas/CameraControls'

export default function Home() {
  /**
   * LAYOUT STRUCTURE:
   * - Full viewport height (h-screen)
   * - Canvas fills entire space
   * - UI overlay will be positioned absolutely (future)
   * 
   * WHY 'use client'?
   * Canvas uses browser APIs (WebGL, requestAnimationFrame).
   * These only exist in the browser, not during server-side rendering.
   * 'use client' tells Next.js to render this component client-side only.
   */
  
  return (
    <div className="w-full h-screen bg-zinc-900">
      {/**
       * CANVAS COMPONENT DEEP DIVE:
       * 
       * WHAT IT DOES:
       * 1. Creates a <canvas> DOM element
       * 2. Initializes WebGLRenderer
       * 3. Creates Scene and Camera
       * 4. Starts the render loop
       * 5. Provides R3F context to children
       * 
       * HOW IT WORKS INTERNALLY:
       * ```typescript
       * // Simplified Canvas internals
       * function Canvas({ children }) {
       *   const canvasRef = useRef()
       *   
       *   useEffect(() => {
       *     // 1. Create Three.js foundation
       *     const renderer = new THREE.WebGLRenderer({ 
       *       canvas: canvasRef.current 
       *     })
       *     const scene = new THREE.Scene()
       *     const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
       *     
       *     // 2. Create R3F context
       *     const state = {
       *       scene,
       *       camera,
       *       renderer,
       *       gl: renderer,
       *       size: { width, height },
       *       // ... many more properties
       *     }
       *     
       *     // 3. Start render loop
       *     function renderLoop() {
       *       // Run all useFrame callbacks
       *       runFrameCallbacks(state)
       *       
       *       // Render the scene
       *       renderer.render(scene, camera)
       *       
       *       // Schedule next frame
       *       requestAnimationFrame(renderLoop)
       *     }
       *     renderLoop()
       *     
       *     // 4. Render React children into Three.js scene
       *     reconciler.render(children, scene, state)
       *   }, [])
       *   
       *   return <canvas ref={canvasRef} />
       * }
       * ```
       * 
       * PROPS EXPLANATION:
       */}
      <Canvas
        /**
         * camera prop:
         * Configures the default PerspectiveCamera.
         * 
         * PERSPECTIVE CAMERA:
         * Simulates human eye perspective (objects farther away appear smaller).
         * 
         * PARAMETERS:
         * - fov: 75 (Field of View in degrees)
         *   - Human eye ≈ 90°
         *   - 75° is standard for 3D applications
         *   - Lower = more "zoomed in" (telephoto lens)
         *   - Higher = more "zoomed out" (wide-angle lens)
         * 
         * - near: 0.1 (Near clipping plane)
         *   - Objects closer than 0.1 units are not rendered
         *   - Prevents z-fighting (flickering) when camera is too close
         * 
         * - far: 1000 (Far clipping plane)
         *   - Objects farther than 1000 units are not rendered
         *   - Optimization: don't render distant objects
         * 
         * - position: [0, 0, 5]
         *   - Camera starts at (0, 0, 5)
         *   - [x, y, z] = [right, up, forward]
         *   - Positive Z = camera is in front of the scene
         *   - Looking at origin (0, 0, 0) by default
         * 
         * WHY [0, 0, 5]?
         * - Our box is at origin (0, 0, 0)
         * - Camera is 5 units in front
         * - Good viewing distance for a 1x1x1 box
         * 
         * FOR AR WATCH:
         * We'll adjust:
         * - fov: 60 (more realistic for AR)
         * - position: Based on hand tracking data
         * - near: 0.01 (watch is small, camera gets close)
         * - far: 10 (don't need to render far objects)
         */
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        
        /**
         * gl prop:
         * Configures the WebGLRenderer.
         * 
         * antialias: true
         * - Smooths jagged edges (anti-aliasing)
         * - Uses MSAA (Multi-Sample Anti-Aliasing)
         * 
         * HOW IT WORKS:
         * Without: Edges look pixelated/jagged (staircase effect)
         * With: Edges look smooth
         * 
         * PERFORMANCE COST:
         * - Desktop: Minimal (modern GPUs handle it well)
         * - Mobile: Moderate (can reduce FPS)
         * 
         * FOR AR WATCH:
         * - Keep true for desktop preview
         * - Consider false for mobile AR (performance)
         * - Or use FXAA (post-processing AA) instead
         */
        gl={{ antialias: true }}
      >
        {/**
         * SCENE COMPONENT:
         * Contains all 3D objects (lights, meshes, etc.)
         * 
         * RENDERING FLOW:
         * 1. Canvas creates Three.js foundation
         * 2. R3F reconciler processes <Scene>
         * 3. Scene's children (lights, Box) are added to scene graph
         * 4. Render loop continuously renders the scene
         * 
         * SCENE GRAPH:
         * THREE.Scene (root)
         * ├─ AmbientLight
         * ├─ DirectionalLight
         * └─ Mesh (Box)
         *    ├─ BoxGeometry
         *    └─ MeshStandardMaterial
         */}
        <Scene />
        
        {/**
         * CAMERA CONTROLS:
         * Allows user to orbit, zoom, pan.
         * 
         * WHY AFTER SCENE?
         * Order doesn't matter for rendering, but conventionally:
         * - Scene content first
         * - Controls/helpers after
         * 
         * CONTROLS LIFECYCLE:
         * 1. OrbitControls component mounts
         * 2. drei creates THREE.OrbitControls instance
         * 3. Controls attach to camera and canvas
         * 4. Controls listen to DOM events
         * 5. On user input, controls update camera
         * 6. Scene re-renders with new camera view
         */}
        <CameraControls />
      </Canvas>
      
      {/**
       * FUTURE UI OVERLAY:
       * We'll add UI controls here:
       * 
       * <div className="absolute top-4 left-4 z-10">
       *   <WatchSelector />
       *   <LightingControls />
       *   <ARToggle />
       * </div>
       * 
       * WHY OUTSIDE CANVAS?
       * - Canvas is for 3D content only
       * - UI is regular React/HTML
       * - Positioned absolutely over Canvas
       * - z-index ensures UI is on top
       * 
       * INTERACTION:
       * UI components will update React state.
       * State changes will flow into Scene via props.
       * R3F reconciler will update Three.js objects.
       */}
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
