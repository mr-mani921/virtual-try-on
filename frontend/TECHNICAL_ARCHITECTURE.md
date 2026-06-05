# Technical Architecture Guide

This document provides an in-depth explanation of the technical architecture, focusing on React Three Fiber integration, rendering pipelines, and performance optimization strategies.

## Table of Contents

- [Why React Three Fiber?](#why-react-three-fiber)
- [How React Three Fiber Works Internally](#how-react-three-fiber-works-internally)
- [The Canvas Component](#the-canvas-component)
- [The Render Loop & useFrame](#the-render-loop--useframe)
- [React Integration with Three.js](#react-integration-with-threejs)
- [Performance Patterns](#performance-patterns)
- [Rendering Pipeline](#rendering-pipeline)
- [Common Pitfalls & Solutions](#common-pitfalls--solutions)
- [Future Scaling Considerations](#future-scaling-considerations)

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

## Future Scaling Considerations

### Component-Based Watch Models

```typescript
<WatchModel 
  model="rolex-submariner" 
  position={handPosition} 
  rotation={handRotation} 
/>
```

### MediaPipe Integration

```typescript
const handTracking = useHandTracking()

<WatchModel 
  position={handTracking.wristPosition}
  rotation={handTracking.wristRotation}
/>
```

### Conditional Rendering

```typescript
{isARMode ? (
  <ARScene />
) : (
  <PreviewScene />
)}
```

### Performance Optimization

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

### Mobile Performance

- Reduce shadow quality
- Disable anti-aliasing
- Lower pixel ratio
- Use simpler materials

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

---

## Code Review Checklist

- [ ] No state updates in useFrame
- [ ] Refs used for animations
- [ ] Components are properly typed
- [ ] Three.js objects are disposed (R3F handles this)
- [ ] Performance considerations documented
- [ ] Architecture decisions explained

---

**Last Updated:** June 2026  
**Maintainer:** Development Team
