# AR Virtual Watch Try-On System

## Project Overview

This is a browser-based AR (Augmented Reality) watch try-on system built with React Three Fiber, Three.js, and Next.js. The goal is to allow users to virtually try on watches using their webcam and hand tracking.

**Current Status:** Ticket 9A Complete - Quaternion Rotation System  
**Next Steps:** Multiple watch models and watch selection UI

---

## Features Implemented

### ✅ Day 3: React Three Fiber Fundamentals
- WebGL rendering via React Three Fiber
- Animated 3D scene with interactive objects
- Orbit controls for camera manipulation
- Lighting and materials
- TypeScript throughout

### ✅ Day 4: Browser Camera Integration & Professional UI
- Webcam access via getUserMedia API
- Camera permission handling
- Front/rear camera switching (mobile)
- Responsive camera viewport
- Loading and error states
- Mobile browser compatibility (iOS Safari, Android Chrome)
- **Professional theme-based UI**
- **Modern glassmorphism design**
- **Intuitive AR interface**

### ✅ Day 5: MediaPipe Hands Integration
- Real-time hand detection in browser
- Single hand tracking (optimized for watch try-on)
- 21 landmark detection per hand
- Key landmark extraction (wrist, index base, pinky base)
- Handedness detection (Left/Right)
- Visual debugging with canvas overlay
- Confidence scoring
- Dynamic MediaPipe loading (client-side only)
- Mobile-optimized performance

### ✅ Ticket 3A: Landmark Debugging System
- Visual debug overlay with canvas
- Landmark labels (index numbers on each point)
- Wrist anchor visualization (highlighted in red)
- FPS monitor with color coding (green ≥30, yellow ≥15, red <15)
- Detection confidence logs in overlay
- Real-time performance monitoring

### ✅ Ticket 4: Coordinate Mapping System
- Convert MediaPipe normalized coordinates (0-1) to screen space pixels
- Map screen space to Three.js world coordinates using camera projection
- Reusable coordinate transformation utilities
- Hand orientation calculation from landmarks
- Smooth coordinate transitions with lerp
- Debug visualization in 3D scene
- Split-view debug page showing 2D tracking and 3D mapping side-by-side

### ✅ Ticket 5: Wrist Anchor Attachment
- Placeholder cube attached to wrist position
- Real-time position tracking with smooth transitions
- Hand orientation following (rotation based on wrist/index/pinky)
- Configurable smoothing factor (lerp-based)
- Debug axis helper for orientation visualization
- Purple metallic cube with glow effect
- Red anchor point indicator at wrist center
- Subtle floating animation for visual feedback

### ✅ Ticket 6: Watch Model Pipeline
- GLB model loading with useGLTF from @react-three/drei
- Automatic model normalization (center at origin, scale to unit size)
- Pivot point verification and adjustment
- Material optimization with enhanced environment mapping
- Shadow casting and receiving enabled
- Reusable WatchModel component with props:
  - Position tracking (follows wrist)
  - Orientation tracking (follows hand rotation)
  - Configurable scale with slider control
  - Smooth transitions with lerp
  - Debug axis visualization
- Model analysis utilities:
  - Bounding box calculation
  - Vertex/triangle counting
  - Material inspection
  - Pivot verification
- ModelInspector component for debugging
- Production-ready asset pipeline with model preloading

### ✅ Ticket 7: Watch Attachment Integration
- Replaced placeholder cube with actual watch model
- Configurable position offsets (X, Y, Z axes)
- Configurable rotation offsets (Pitch, Yaw, Roll)
- Handedness-based flipping (automatic mirroring for left hand)
- Watch configuration hook (`useWatchConfig`) with:
  - Scale adjustment
  - Position offset controls
  - Rotation offset controls
  - Smoothing factor
  - Preset system (Default, Sports, Luxury, Smart)
- WatchControls UI component with:
  - Preset selection buttons
  - Real-time sliders for all parameters
  - Visual feedback with color-coded axes
  - Reset to default button
- Fine-tuned watch placement on wrist
- Smooth real-time tracking with configurable responsiveness

### ✅ Ticket 9A: Quaternion Rotation System (Critical)
- Replaced Euler angle lerp with `Quaternion.slerp()` — eliminates gimbal-lock flickering
- Fixed non-orthonormal basis bug in `calculateHandOrientation` → now `calculateWristQuaternion`
- Gram-Schmidt orthonormalization using midknuckle midpoint for stable wrist direction
- `useState` → `useRef` in `WatchModel` and `WristAnchor` — eliminates 60fps React re-renders
- Decoupled `useMemo` from scale/rotation/handedness — model no longer re-clones every frame
- Pre-allocated THREE.js objects (Quaternion, Euler) as refs — zero GC pressure per frame
- `handOrientation` type updated: `THREE.Euler` → `THREE.Quaternion` throughout

### ✅ Ticket 8: Dynamic Scaling System
- Automatic watch size adjustment based on hand width
- Camera distance compensation (near/far movement)
- Hand width calculation from index and pinky base landmarks
- Average depth calculation from key landmarks
- Scale normalization with reference values
- Jump prevention with smoothing buffer (moving average)
- Configurable min/max scale limits (0.8 to 3.0)
- Stability detection (variance-based)
- `useDynamicScale` hook with:
  - Hand width tracking
  - Depth tracking
  - Dynamic scale calculation
  - Smoothing with lerp
  - Stability status
- Real-time info panel showing:
  - Current dynamic scale
  - Hand width measurement
  - Average depth
  - Stability status
- Toggle to enable/disable dynamic scaling
- Enabled by default in main AR page

---

## Documentation

- **[README.md](./README.md)** - Project overview and R3F architecture
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Complete technical guide (Days 1-4)
- **[MEDIAPIPE_INTEGRATION.md](./MEDIAPIPE_INTEGRATION.md)** - MediaPipe Hands integration guide (Day 5)
- **[COORDINATE_MAPPING.md](./COORDINATE_MAPPING.md)** - Coordinate transformation system deep dive (Ticket 4)
- **[WATCH_MODEL_PIPELINE.md](./WATCH_MODEL_PIPELINE.md)** - Watch model loading and optimization guide (Ticket 6)

## Pages

- **/** - Main AR experience (camera + UI)
- **/3d-demo** - React Three Fiber demo
- **/camera-test** - Camera integration test
- **/camera-debug** - Camera debugging
- **/coordinate-debug** - Coordinate mapping visualization (split-view: 2D tracking + 3D world space)

---

## Why React Three Fiber?

### The Problem with Vanilla Three.js

Traditional Three.js requires imperative code:

```javascript
// Vanilla Three.js
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 'orange' })
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

function animate() {
  mesh.rotation.x += 0.01
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()

// Cleanup is manual
geometry.dispose()
material.dispose()
scene.remove(mesh)
```

**Problems:**
- Imperative (hard to reason about state)
- Manual lifecycle management
- No component reusability
- Difficult to integrate with React state
- Manual cleanup (memory leaks if forgotten)

### The React Three Fiber Solution

R3F is a **React renderer** for Three.js (not a wrapper):

```typescript
// React Three Fiber
<Canvas>
  <mesh rotation-x={rotation}>
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</Canvas>
```

**Benefits:**
- Declarative (what you see is what you get)
- Automatic lifecycle management
- Component-based architecture
- Seamless React integration
- Automatic cleanup (no memory leaks)
- React ecosystem (hooks, state, context)

---

## How React Three Fiber Works Internally

### 1. React's Renderer Architecture

React has two parts:
- **React Core:** Reconciliation algorithm (diffing, scheduling)
- **Renderers:** Platform-specific implementations

```
React Core (react)
├─ React DOM (react-dom) → Browser DOM
├─ React Native (react-native) → iOS/Android
└─ React Three Fiber (@react-three/fiber) → Three.js
```

### 2. The Reconciler

R3F uses `react-reconciler` to create a custom renderer:

```typescript
// Simplified R3F internals
const reconciler = ReactReconciler({
  // When you write <mesh>, R3F creates new THREE.Mesh()
  createInstance(type, props) {
    if (type === 'mesh') return new THREE.Mesh()
    if (type === 'boxGeometry') return new THREE.BoxGeometry()
    // ... for all Three.js classes
  },
  
  // When you nest components, R3F calls parent.add(child)
  appendChild(parent, child) {
    parent.add(child)
  },
  
  // When props change, R3F updates the Three.js object
  commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    if (newProps.position) instance.position.set(...newProps.position)
    if (newProps.rotation) instance.rotation.set(...newProps.rotation)
  },
  
  // When component unmounts, R3F cleans up
  removeChild(parent, child) {
    parent.remove(child)
    if (child.geometry) child.geometry.dispose()
    if (child.material) child.material.dispose()
  }
})
```

### 3. Scene Graph Synchronization

R3F maintains two trees in sync:

```
React Virtual Tree          Three.js Scene Graph
<Canvas>                    THREE.Scene
  <mesh>          ←→          └─ THREE.Mesh
    <boxGeometry />             ├─ THREE.BoxGeometry
    <material />                └─ THREE.Material
  </mesh>
```

When you change a prop in React, the reconciler updates the corresponding Three.js object **without recreating it**.

---

## The Canvas Component

`<Canvas>` is the entry point to R3F. Here's what it does:

### 1. Creates Three.js Foundation

```typescript
// Internally, Canvas creates:
const renderer = new THREE.WebGLRenderer({ canvas: domElement })
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
```

### 2. Starts the Render Loop

```typescript
function renderLoop() {
  // 1. Run all useFrame callbacks
  runAllFrameCallbacks()
  
  // 2. Render the scene
  renderer.render(scene, camera)
  
  // 3. Schedule next frame (~60 FPS)
  requestAnimationFrame(renderLoop)
}
```

### 3. Provides React Context

All R3F components can access:

```typescript
const { 
  scene,      // THREE.Scene
  camera,     // THREE.Camera
  renderer,   // THREE.WebGLRenderer
  gl,         // Alias for renderer
  size,       // Canvas dimensions
  viewport,   // Viewport dimensions in Three.js units
  clock,      // THREE.Clock for timing
  // ... many more
} = useThree()
```

---

## The Render Loop & useFrame

### Traditional Three.js Loop

```javascript
function animate() {
  // 1. Update logic
  mesh.rotation.x += 0.01
  
  // 2. Render
  renderer.render(scene, camera)
  
  // 3. Schedule next frame
  requestAnimationFrame(animate)
}
animate()
```

### R3F's useFrame Hook

```typescript
useFrame((state, delta) => {
  // Runs every frame (~60 FPS)
  meshRef.current.rotation.x += delta
})
```

**Parameters:**
- `state`: Entire R3F context (scene, camera, clock, etc.)
- `delta`: Time since last frame in seconds

**Why delta?**
- At 60 FPS: delta ≈ 0.016s
- At 30 FPS: delta ≈ 0.033s
- Using delta keeps animations smooth regardless of frame rate

### Execution Order

```typescript
function Scene() {
  useFrame(() => console.log('Scene frame')) // Runs first
  return <Box />
}

function Box() {
  useFrame(() => console.log('Box frame')) // Runs second
}
```

Hooks execute in order of component mounting.

---

## React Integration with Three.js

### Props to Three.js Properties

R3F uses naming conventions to map props:

```typescript
// Dash notation for nested properties
<mesh position-x={5} />
// → mesh.position.x = 5

// Array notation
<mesh position={[5, 0, 0]} />
// → mesh.position.set(5, 0, 0)

// Object notation
<mesh position={{ x: 5, y: 0, z: 0 }} />
// → mesh.position.x = 5, mesh.position.y = 0, mesh.position.z = 0
```

### Refs to Three.js Objects

```typescript
const meshRef = useRef<THREE.Mesh>(null!)

<mesh ref={meshRef}>
  {/* meshRef.current is the actual THREE.Mesh instance */}
</mesh>

// Call Three.js methods directly
meshRef.current.rotateX(Math.PI / 2)
```

### Re-render Considerations (CRITICAL)

**React re-renders DO NOT cause Three.js re-renders.**

```typescript
function Box() {
  const [color, setColor] = useState('red')
  
  // When color changes:
  // 1. React re-renders this component
  // 2. R3F reconciler detects color prop changed
  // 3. R3F updates: material.color.set('red')
  // 4. Mesh is NOT recreated
  
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
```

R3F's reconciler only updates what changed, just like React DOM.

---

## Performance Patterns

### ✅ Fast Patterns

```typescript
// 1. Direct mutation in useFrame (no React re-render)
const meshRef = useRef()
useFrame(() => {
  meshRef.current.rotation.x += 0.01
})

// 2. Prop changes (reconciler updates only changed props)
<mesh position={[x, y, z]} />

// 3. Conditional rendering (objects are properly disposed)
{showBox && <Box />}
```

### ❌ Slow Patterns

```typescript
// 1. State updates in useFrame (60 re-renders per second!)
const [rotation, setRotation] = useState(0)
useFrame(() => setRotation(r => r + 0.01)) // ❌ BAD

// 2. Creating objects every frame
useFrame(() => {
  const geometry = new THREE.BoxGeometry() // ❌ Memory leak
})

// 3. Changing geometry frequently
<boxGeometry args={[Math.random(), 1, 1]} /> // ❌ Recreates geometry
```

### The Golden Rule

**Keep React state changes minimal. Use refs and useFrame for animations.**

---

## Architecture & Folder Structure

```
frontend/
├── app/
│   ├── page.tsx                 # Next.js page (entry point)
│   ├── layout.tsx               # App layout
│   └── globals.css              # Global styles
├── components/
│   ├── canvas/                  # R3F components (3D scene)
│   │   ├── Scene.tsx           # Main 3D scene container
│   │   ├── Box.tsx             # Example 3D object (learning)
│   │   └── CameraControls.tsx  # Orbit controls
│   └── ui/                      # React UI components (2D overlay)
│       └── Controls.tsx        # UI controls for 3D scene (future)
├── lib/
│   └── three/                   # Three.js utilities
│       └── materials.ts        # Shared materials, geometries (future)
└── README.md                    # This file
```

### Design Decisions

**Why separate `canvas/` and `ui/`?**
- Clear boundary between 3D (R3F) and 2D (React)
- 3D developers work in `canvas/`
- UI developers work in `ui/`
- Easy to understand mental model

**Why `lib/three/`?**
- Shared Three.js utilities (materials, geometries, helpers)
- Reusable across multiple scenes
- Keeps components clean

---

## Component Responsibilities

### `page.tsx`
- Next.js routing
- Canvas setup
- Layout structure
- UI overlay positioning

### `Scene.tsx`
- 3D scene container
- Lighting setup
- Object composition
- Scene-level logic

### `Box.tsx`
- Individual 3D object
- Animation logic
- Interactivity (click, hover)
- Self-contained behavior

### `CameraControls.tsx`
- Camera interaction
- Orbit, zoom, pan
- Control configuration
- Conditional rendering (AR mode will disable this)

---

## Rendering Pipeline

### 1. Initialization (once)

```
1. Canvas creates WebGLRenderer, Scene, Camera
2. R3F reconciler processes JSX tree
3. Three.js objects are created
4. Objects are added to scene graph
5. Render loop starts
```

### 2. Render Loop (every frame, ~60 FPS)

```
1. requestAnimationFrame triggers
2. All useFrame callbacks execute (in mount order)
3. renderer.render(scene, camera) draws to canvas
4. Browser displays the frame
5. Loop continues
```

### 3. React Updates (when state/props change)

```
1. React re-renders component
2. R3F reconciler diffs old vs new JSX
3. Only changed props are updated in Three.js objects
4. Next frame shows the changes
```

### 4. Cleanup (on unmount)

```
1. R3F calls dispose() on geometries/materials
2. Three.js objects are removed from scene
3. Event listeners are removed
4. Render loop stops
```

---

## Future AR Scaling Considerations

### Current Architecture Supports:

1. **Component-Based Watch Models**
   ```typescript
   <WatchModel 
     model="rolex-submariner" 
     position={handPosition} 
     rotation={handRotation} 
   />
   ```

2. **MediaPipe Integration**
   ```typescript
   const handTracking = useHandTracking()
   
   <WatchModel 
     position={handTracking.wristPosition}
     rotation={handTracking.wristRotation}
   />
   ```

3. **Conditional Rendering**
   ```typescript
   {isARMode ? (
     <ARScene />
   ) : (
     <PreviewScene />
   )}
   ```

4. **Performance Optimization**
   - LOD (Level of Detail) for watch models
   - Texture compression
   - Geometry instancing for multiple watches
   - Frustum culling

### Planned Architecture

```
page.tsx
├─ Canvas
│  ├─ Suspense (for async model loading)
│  │  └─ Scene
│  │     ├─ Lighting
│  │     ├─ Environment (HDR background)
│  │     ├─ WatchModel (GLTF)
│  │     └─ Hand (MediaPipe tracking)
│  ├─ CameraControls (conditional: !isARMode)
│  ├─ EffectComposer (post-processing)
│  └─ Stats (dev only)
└─ UI Overlay
   ├─ WatchSelector
   ├─ ARToggle
   └─ LightingControls
```

---

## Performance Optimization Strategies

### For Watch Models

1. **LOD (Level of Detail)**
   ```typescript
   <Lod>
     <WatchModelHigh distance={0} />
     <WatchModelMedium distance={5} />
     <WatchModelLow distance={10} />
   </Lod>
   ```

2. **Texture Compression**
   - Use KTX2 format (GPU-compressed)
   - Reduce texture resolution for mobile
   - Use texture atlases

3. **Geometry Optimization**
   - Reduce polygon count
   - Use normal maps for detail
   - Merge static meshes

### For AR Mode

1. **Camera Feed**
   - Use `getUserMedia()` for webcam
   - Render to texture in Three.js
   - Apply as background plane

2. **Hand Tracking**
   - MediaPipe runs in Web Worker
   - Throttle updates to 30 FPS
   - Smooth tracking with lerp

3. **Mobile Performance**
   - Reduce shadow quality
   - Disable anti-aliasing
   - Lower pixel ratio
   - Use simpler materials

---

## Debugging & Development

### FPS Monitoring

```typescript
import { Stats } from '@react-three/drei'

<Canvas>
  <Stats />
  <Scene />
</Canvas>
```

### Three.js Inspector

```typescript
import { useHelper } from '@react-three/drei'
import { BoxHelper } from 'three'

const meshRef = useRef()
useHelper(meshRef, BoxHelper, 'cyan')
```

### React DevTools

R3F components appear in React DevTools like regular React components.

---

## Common Pitfalls & Solutions

### 1. "Cannot read property 'current' of null"

**Problem:** Accessing ref before it's assigned.

```typescript
// ❌ BAD
const meshRef = useRef()
console.log(meshRef.current.position) // null on first render

// ✅ GOOD
const meshRef = useRef()
useEffect(() => {
  console.log(meshRef.current.position) // Available after mount
}, [])
```

### 2. "Too many re-renders"

**Problem:** Setting state in useFrame.

```typescript
// ❌ BAD
const [rotation, setRotation] = useState(0)
useFrame(() => setRotation(r => r + 0.01))

// ✅ GOOD
const meshRef = useRef()
useFrame(() => {
  meshRef.current.rotation.x += 0.01
})
```

### 3. "Memory leak detected"

**Problem:** Not disposing Three.js objects.

```typescript
// ❌ BAD (vanilla Three.js)
const geometry = new THREE.BoxGeometry()
// Forgot to call geometry.dispose()

// ✅ GOOD (R3F handles it)
<boxGeometry />
// R3F automatically disposes on unmount
```

---

## Glossary

### Three.js Terms

- **Scene:** Container for all 3D objects
- **Mesh:** 3D object (geometry + material)
- **Geometry:** Shape (vertices, faces)
- **Material:** Surface appearance (color, texture, reflectivity)
- **Camera:** Viewpoint into the scene
- **Renderer:** Draws the scene to canvas
- **Scene Graph:** Tree structure of 3D objects

### R3F Terms

- **Canvas:** R3F entry point, creates Three.js foundation
- **useFrame:** Hook for render loop logic
- **useThree:** Hook to access R3F context
- **Reconciler:** Syncs React tree with Three.js scene graph
- **drei:** Helper library for common R3F patterns

### AR Terms

- **Hand Tracking:** Detecting hand position/rotation from webcam
- **Wrist Landmark:** Specific point on wrist for watch placement
- **MediaPipe:** Google's ML library for hand tracking
- **LOD:** Level of Detail (different models at different distances)

---

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### What You Should See

- A rotating orange box
- Click to scale up/down
- Hover to change color to pink
- Drag to orbit camera
- Scroll to zoom
- Right-drag to pan

### Next Steps

1. ✅ Learn R3F fundamentals (current)
2. ⬜ Load GLTF watch models
3. ⬜ Integrate MediaPipe hand tracking
4. ⬜ Position watch on wrist
5. ⬜ Add realistic lighting
6. ⬜ Add UI controls
7. ⬜ Optimize for mobile

---

## Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Docs](https://threejs.org/docs/)
- [drei Helpers](https://github.com/pmndrs/drei)
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands)

---

## Team Notes

### Code Review Checklist

- [ ] No state updates in useFrame
- [ ] Refs used for animations
- [ ] Components are properly typed
- [ ] Three.js objects are disposed (R3F handles this)
- [ ] Performance considerations documented
- [ ] Architecture decisions explained

### When to Refactor

- When adding watch models → Extract `<WatchModel>` component
- When adding AR → Extract `<ARScene>` and `<PreviewScene>`
- When adding UI → Create components in `components/ui/`
- When adding utilities → Add to `lib/three/`

---

**Last Updated:** Day 3 - React Three Fiber Fundamentals  
**Next Milestone:** GLTF Model Loading & MediaPipe Integration
