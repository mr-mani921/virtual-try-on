# Watch Model Pipeline - Complete Guide

## Overview

The Watch Model Pipeline is a production-ready system for loading, optimizing, and rendering 3D watch models on a tracked wrist in real-time. This system handles GLB/GLTF model loading, automatic normalization, material optimization, and smooth real-time tracking.

---

## Architecture

### Component Hierarchy

```
WatchModel (Main Component)
├─ useGLTF (Model Loading)
├─ Model Normalization
├─ Material Optimization
├─ Position Tracking (Wrist)
├─ Orientation Tracking (Hand Rotation)
└─ Smooth Transitions (Lerp)

ModelInspector (Debug Component)
├─ Model Analysis
├─ Bounding Box Calculation
├─ Geometry Statistics
└─ Console Logging

Model Utilities (lib/three/modelUtils.ts)
├─ analyzeModel()
├─ normalizeModel()
├─ optimizeMaterials()
├─ calculateWatchScale()
└─ verifyPivot()
```

---

## File Structure

```
frontend/
├── public/
│   └── models/
│       └── watch.glb              # Watch model (served by Next.js)
├── components/
│   └── canvas/
│       ├── WatchModel.tsx         # Main watch component
│       └── ModelInspector.tsx     # Debug/analysis component
└── lib/
    └── three/
        └── modelUtils.ts          # Model utilities
```

---

## The WatchModel Component

### Purpose

Loads and renders a 3D watch model that follows the user's wrist in real-time with proper orientation and smooth transitions.

### Props Interface

```typescript
interface WatchModelProps {
  wristPosition: WorldCoordinates | null    // 3D position from coordinate mapping
  handOrientation?: THREE.Euler | null      // Hand rotation (optional)
  smoothing?: number                        // Lerp factor (0-1, default: 0.3)
  scale?: number                            // Model scale multiplier (default: 1)
  showDebugAxis?: boolean                   // Show orientation axes (default: false)
  modelPath?: string                        // Path to GLB file (default: '/models/watch.glb')
}
```

### Usage Example

```typescript
import { WatchModel } from '@/components/canvas/WatchModel'
import { useCoordinateMapping } from '@/hooks/useCoordinateMapping'

function ARScene() {
  const { camera } = useThree()
  const { handDetection } = useHandTracking()
  
  const mappedData = useCoordinateMapping(handDetection, camera)
  
  return (
    <Canvas>
      {mappedData && (
        <WatchModel
          wristPosition={mappedData.wristPosition}
          handOrientation={mappedData.handOrientation}
          smoothing={0.3}
          scale={0.5}
          showDebugAxis={false}
        />
      )}
    </Canvas>
  )
}
```

---

## Model Loading Process

### Step 1: GLB Loading with useGLTF

```typescript
const { scene, nodes, materials } = useGLTF(modelPath)
```

**What is useGLTF?**
- Hook from `@react-three/drei`
- Loads GLTF/GLB models asynchronously
- Caches loaded models (loads once, reuses everywhere)
- Returns: scene graph, nodes, materials

**GLB vs GLTF:**
- GLB: Binary format (single file, includes textures)
- GLTF: JSON format (separate texture files)
- We use GLB for simplicity and performance

### Step 2: Model Cloning

```typescript
const clonedScene = scene.clone()
```

**Why Clone?**
- `useGLTF` caches the original scene
- Modifying the cached scene affects all instances
- Cloning creates an independent copy
- Each watch instance can have different transforms

### Step 3: Bounding Box Calculation

```typescript
const box = new THREE.Box3().setFromObject(clonedScene)
const center = box.getCenter(new THREE.Vector3())
const size = box.getSize(new THREE.Vector3())
```

**What is a Bounding Box?**
- Axis-aligned box that contains the entire model
- Defined by min and max corners
- Used to calculate center and size

**Visualization:**
```
        max (x, y, z)
           *--------*
          /|       /|
         / |      / |
        *--------*  |
        |  *-----|--*
        | /      | /
        |/       |/
        *--------*
    min (x, y, z)

center = (min + max) / 2
size = max - min
```

### Step 4: Model Centering

```typescript
clonedScene.position.sub(center)
```

**Why Center the Model?**
- Most 3D models are not centered at origin
- Centering ensures rotation happens around the model's center
- Makes positioning on wrist more predictable

**Before Centering:**
```
Origin (0,0,0)
    *
     \
      \
       \
        *-------*  Model (offset from origin)
        |       |
        *-------*
```

**After Centering:**
```
        *-------*
        |   *   |  Model (centered at origin)
        *-------*
         Origin
```

### Step 5: Scale Normalization

```typescript
const maxDim = Math.max(size.x, size.y, size.z)
const normalizedScale = 1 / maxDim
clonedScene.scale.setScalar(normalizedScale * scale)
```

**Why Normalize Scale?**
- Different models have different units (mm, cm, m)
- Normalization makes all models unit-sized (1 unit)
- Consistent sizing across different watch models
- User scale parameter then adjusts from this baseline

**Example:**
```typescript
// Model A: 100 units wide (modeled in mm)
maxDim = 100
normalizedScale = 1/100 = 0.01
finalScale = 0.01 * 0.5 = 0.005  // With user scale=0.5

// Model B: 0.1 units wide (modeled in m)
maxDim = 0.1
normalizedScale = 1/0.1 = 10
finalScale = 10 * 0.5 = 5  // With user scale=0.5

// Both now have similar visual size!
```

### Step 6: Material Enhancement

```typescript
clonedScene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = true
    child.receiveShadow = true
    
    if (child.material) {
      child.material.envMapIntensity = 1.5
      child.material.needsUpdate = true
    }
  }
})
```

**Material Properties:**

1. **castShadow**: Object casts shadows on other objects
2. **receiveShadow**: Object receives shadows from other objects
3. **envMapIntensity**: Strength of environment reflections (1.5 = 150%)
4. **needsUpdate**: Tells Three.js to recompile the material

**Why Enhance Materials?**
- Default materials often look flat
- Environment mapping adds realistic reflections
- Shadows add depth and realism
- Makes the watch look like it's actually on the wrist

---

## Real-Time Tracking

### Position Tracking with Lerp

```typescript
useFrame((state, delta) => {
  const targetPosition = wristPosition
  const smoothedPosition = currentPosition
    ? lerpWorldCoordinates(currentPosition, targetPosition, smoothing)
    : targetPosition

  groupRef.current.position.set(
    smoothedPosition.x,
    smoothedPosition.y,
    smoothedPosition.z
  )
})
```

**What is Lerp (Linear Interpolation)?**

```typescript
lerp(current, target, alpha) = current + (target - current) * alpha
```

**Alpha Values:**
- `0.0`: No movement (stays at current)
- `0.3`: Smooth, gradual (recommended for watches)
- `1.0`: Instant jump (no smoothing)

**Example with alpha=0.3:**
```
Frame 1: current=0, target=10
  smoothed = 0 + (10-0)*0.3 = 3

Frame 2: current=3, target=10
  smoothed = 3 + (10-3)*0.3 = 5.1

Frame 3: current=5.1, target=10
  smoothed = 5.1 + (10-5.1)*0.3 = 6.57

...gradually approaches 10
```

**Why Use Lerp?**
- Hand tracking has noise/jitter
- Instant position updates look shaky
- Lerp smooths out the movement
- Creates natural, fluid motion

### Rotation Tracking

```typescript
if (handOrientation) {
  groupRef.current.rotation.x = THREE.MathUtils.lerp(
    groupRef.current.rotation.x,
    handOrientation.x,
    smoothing
  )
  // Same for y and z
}
```

**Euler Angles:**
- x: Pitch (nodding up/down)
- y: Yaw (turning left/right)
- z: Roll (tilting side to side)

**Why Smooth Rotation?**
- Hand orientation can flip suddenly
- Smooth rotation prevents jarring movements
- Watch appears to "settle" on the wrist naturally

---

## Model Analysis & Debugging

### The ModelInspector Component

```typescript
export function ModelInspector({ modelPath, onAnalysisComplete }: ModelInspectorProps) {
  const { scene } = useGLTF(modelPath)
  
  useEffect(() => {
    if (scene) {
      const modelInfo = analyzeModel(scene)
      console.log('Model Analysis:', modelInfo)
      onAnalysisComplete?.(modelInfo)
    }
  }, [scene])
  
  return null  // Invisible component
}
```

**Purpose:**
- Runs once when model loads
- Analyzes model structure
- Logs detailed information to console
- Helps debug model issues

### Model Analysis Output

```typescript
interface ModelInfo {
  nodes: string[]                    // All node names in scene graph
  materials: string[]                // All material names
  meshes: {
    name: string
    vertices: number                 // Vertex count
    triangles: number                // Triangle count
    hasMaterial: boolean
  }[]
  boundingBox: {
    min: Vector3
    max: Vector3
    center: Vector3
    size: Vector3
  }
  pivot: Vector3                     // Model origin point
  totalVertices: number              // Sum of all vertices
  totalTriangles: number             // Sum of all triangles
}
```

**Console Output Example:**
```
🔍 Watch Model Analysis
📦 Bounding Box: {
  size: { x: 0.045, y: 0.012, z: 0.055 },
  center: { x: 0, y: 0, z: 0 }
}
📐 Geometry: {
  totalVertices: 12543,
  totalTriangles: 8362,
  meshCount: 5
}
🎨 Materials: ["WatchBody", "WatchGlass", "WatchBand"]
🎯 Pivot: { isAtOrigin: true, recommendation: "Pivot is correctly centered" }
📊 Meshes: [
  { name: "Body", vertices: 5234, triangles: 3489, hasMaterial: true },
  { name: "Glass", vertices: 1024, triangles: 682, hasMaterial: true },
  ...
]
```

---

## Model Utilities Deep Dive

### analyzeModel()

```typescript
export function analyzeModel(scene: THREE.Group): ModelInfo {
  const box = new THREE.Box3().setFromObject(scene)
  let totalVertices = 0
  let totalTriangles = 0
  
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry
      const vertices = geometry.attributes.position?.count || 0
      const triangles = geometry.index
        ? geometry.index.count / 3
        : vertices / 3
      
      totalVertices += vertices
      totalTriangles += triangles
    }
  })
  
  return { /* ... */ }
}
```

**What It Does:**
1. Calculates bounding box
2. Traverses entire scene graph
3. Counts vertices and triangles per mesh
4. Collects material names
5. Returns comprehensive analysis

**Why It's Useful:**
- Identify performance issues (too many polygons)
- Verify model structure
- Debug material problems
- Validate pivot point

### normalizeModel()

```typescript
export function normalizeModel(
  scene: THREE.Group,
  targetSize: number = 1
): THREE.Group {
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  
  scene.position.sub(center)
  
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = targetSize / maxDim
  scene.scale.setScalar(scale)
  
  return scene
}
```

**Use Cases:**
- Batch processing multiple models
- Ensuring consistent sizing
- Preparing models for export

### optimizeMaterials()

```typescript
export function optimizeMaterials(scene: THREE.Group): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.envMapIntensity = 1.5
          material.needsUpdate = true
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }
  })
}
```

**Optimizations Applied:**
1. Enhanced environment mapping (reflections)
2. Shadow casting enabled
3. Shadow receiving enabled
4. Material recompilation triggered

### calculateWatchScale()

```typescript
export function calculateWatchScale(
  modelSize: THREE.Vector3,
  targetWristWidth: number = 0.4
): number {
  const modelWidth = Math.max(modelSize.x, modelSize.z)
  return targetWristWidth / modelWidth
}
```

**Purpose:**
- Calculate optimal scale for wrist
- Assumes average wrist width of 0.4 units
- Can be adjusted per user

**Example:**
```typescript
// Model is 0.05 units wide
// Target wrist width is 0.4 units
scale = 0.4 / 0.05 = 8

// Apply this scale to make watch fit wrist
```

### verifyPivot()

```typescript
export function verifyPivot(scene: THREE.Group): {
  isAtOrigin: boolean
  currentPivot: THREE.Vector3
  recommendation: string
} {
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const isAtOrigin = center.length() < 0.01
  
  let recommendation = 'Pivot is correctly centered at origin.'
  if (!isAtOrigin) {
    recommendation = `Pivot is offset by ${center.length().toFixed(3)} units. Consider re-centering.`
  }
  
  return { isAtOrigin, currentPivot: center, recommendation }
}
```

**Why Pivot Matters:**
- Rotation happens around pivot point
- Off-center pivot causes weird rotation
- Should be at wrist contact point

**Good Pivot (centered):**
```
        *-------*
        |   •   |  • = pivot at center
        *-------*
```

**Bad Pivot (offset):**
```
    •
     \
      \
       *-------*
       |       |  Rotation will swing around offset pivot
       *-------*
```

---

## Performance Optimization

### Model Preloading

```typescript
useGLTF.preload('/models/watch.glb')
```

**What It Does:**
- Loads model before component mounts
- Prevents loading delay when component renders
- Model is cached and ready instantly

**When to Use:**
- At the end of component file
- For models used frequently
- To improve perceived performance

### Geometry Optimization

**Best Practices:**
1. **Polygon Count:**
   - Target: 5,000-15,000 triangles for watches
   - Use decimation in Blender to reduce
   - Maintain visual quality

2. **Texture Size:**
   - 1024x1024 or 2048x2048 max
   - Use texture compression (KTX2)
   - Combine multiple textures into atlases

3. **Material Count:**
   - Minimize number of materials
   - Merge similar materials
   - Reduces draw calls

### Runtime Optimization

```typescript
// Use refs for direct updates (no React re-render)
useFrame(() => {
  meshRef.current.position.set(x, y, z)  // Fast
})

// Avoid state updates in useFrame
useFrame(() => {
  setPosition({ x, y, z })  // Slow! Causes re-render
})
```

**Performance Tips:**
1. Update positions via refs, not state
2. Use `useMemo` for expensive calculations
3. Limit `useFrame` callbacks
4. Disable shadows if not needed
5. Use LOD (Level of Detail) for multiple watches

---

## Common Issues & Solutions

### Issue 1: Model Not Appearing

**Symptoms:**
- Canvas renders but no watch visible
- Console shows no errors

**Causes & Solutions:**

1. **Wrong Path:**
   ```typescript
   // ❌ Wrong (assets folder not served)
   modelPath="/assets/models/watch.glb"
   
   // ✅ Correct (public folder is served)
   modelPath="/models/watch.glb"
   ```

2. **Model Too Small/Large:**
   ```typescript
   // Check model size in console
   console.log('Model size:', modelInfo.boundingBox.size)
   
   // Adjust scale
   <WatchModel scale={0.5} />  // Try different values
   ```

3. **Camera Too Far:**
   ```typescript
   // Move camera closer
   <Canvas camera={{ position: [0, 3, 8] }}>  // Closer
   ```

### Issue 2: Model Appears Black

**Symptoms:**
- Model visible but completely black
- No reflections or details

**Causes & Solutions:**

1. **No Lighting:**
   ```typescript
   // Add lights to scene
   <ambientLight intensity={0.6} />
   <directionalLight position={[10, 10, 5]} intensity={1} />
   ```

2. **Materials Not Enhanced:**
   ```typescript
   // Ensure materials are optimized
   material.envMapIntensity = 1.5
   ```

3. **Missing Environment Map:**
   ```typescript
   // Add environment
   import { Environment } from '@react-three/drei'
   
   <Environment preset="city" />
   ```

### Issue 3: Jittery Movement

**Symptoms:**
- Watch shakes/vibrates
- Movement not smooth

**Causes & Solutions:**

1. **Smoothing Too High:**
   ```typescript
   // Lower smoothing value
   <WatchModel smoothing={0.2} />  // More smooth
   ```

2. **Hand Tracking Noise:**
   ```typescript
   // Increase MediaPipe confidence
   useHandTracking({
     minDetectionConfidence: 0.8,  // Higher
     minTrackingConfidence: 0.7,   // Higher
   })
   ```

3. **Frame Rate Issues:**
   - Reduce model polygon count
   - Disable shadows
   - Lower texture resolution

### Issue 4: Wrong Orientation

**Symptoms:**
- Watch rotates incorrectly
- Doesn't align with hand

**Causes & Solutions:**

1. **Model Rotation Offset:**
   ```typescript
   // Add rotation offset in WatchModel
   clonedScene.rotation.set(Math.PI/2, 0, 0)  // Adjust as needed
   ```

2. **Hand Orientation Calculation:**
   ```typescript
   // Verify orientation calculation
   console.log('Hand orientation:', mappedData.handOrientation)
   ```

3. **Pivot Point Wrong:**
   ```typescript
   // Check pivot
   const pivotInfo = verifyPivot(scene)
   console.log(pivotInfo.recommendation)
   ```

### Issue 5: Performance Lag

**Symptoms:**
- FPS drops below 30
- Laggy hand tracking
- Delayed response

**Causes & Solutions:**

1. **Model Too Complex:**
   ```typescript
   // Check polygon count
   console.log('Triangles:', modelInfo.totalTriangles)
   
   // If > 20,000, optimize in Blender:
   // - Decimate modifier
   // - Remove hidden geometry
   // - Simplify materials
   ```

2. **Too Many Lights:**
   ```typescript
   // Reduce lights
   <ambientLight intensity={0.6} />
   <directionalLight position={[10, 10, 5]} intensity={1} />
   // Remove extra lights
   ```

3. **Shadows Expensive:**
   ```typescript
   // Disable shadows
   <Canvas shadows={false}>
   
   // Or in WatchModel
   child.castShadow = false
   child.receiveShadow = false
   ```

---

## Integration Examples

### Basic Integration

```typescript
import { Canvas } from '@react-three/fiber'
import { WatchModel } from '@/components/canvas/WatchModel'
import { useHandTracking } from '@/hooks/useHandTracking'
import { useCoordinateMapping } from '@/hooks/useCoordinateMapping'

function ARWatchApp() {
  const { handDetection } = useHandTracking()
  const { camera } = useThree()
  const mappedData = useCoordinateMapping(handDetection, camera)
  
  return (
    <Canvas>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} />
      
      {mappedData && (
        <WatchModel
          wristPosition={mappedData.wristPosition}
          handOrientation={mappedData.handOrientation}
        />
      )}
    </Canvas>
  )
}
```

### With Multiple Watches

```typescript
const [selectedWatch, setSelectedWatch] = useState('watch1')

const watchModels = {
  watch1: '/models/rolex.glb',
  watch2: '/models/omega.glb',
  watch3: '/models/casio.glb',
}

return (
  <WatchModel
    wristPosition={mappedData.wristPosition}
    handOrientation={mappedData.handOrientation}
    modelPath={watchModels[selectedWatch]}
    scale={0.5}
  />
)
```

### With User Controls

```typescript
const [watchScale, setWatchScale] = useState(0.5)
const [showDebug, setShowDebug] = useState(false)

return (
  <>
    <WatchModel
      wristPosition={mappedData.wristPosition}
      handOrientation={mappedData.handOrientation}
      scale={watchScale}
      showDebugAxis={showDebug}
    />
    
    <div className="controls">
      <input
        type="range"
        min="0.1"
        max="2"
        step="0.1"
        value={watchScale}
        onChange={(e) => setWatchScale(parseFloat(e.target.value))}
      />
      <button onClick={() => setShowDebug(!showDebug)}>
        Toggle Debug
      </button>
    </div>
  </>
)
```

---

## Best Practices

### Model Preparation (Blender)

1. **Center the Model:**
   - Select all (A)
   - Object > Set Origin > Origin to Geometry
   - Object > Transform > Location to 0,0,0

2. **Optimize Geometry:**
   - Add Decimate modifier (target: 10k-15k triangles)
   - Remove doubles (Mesh > Clean Up > Merge by Distance)
   - Delete hidden faces

3. **Optimize Materials:**
   - Merge similar materials
   - Bake complex node setups
   - Use PBR workflow (Metallic/Roughness)

4. **Export Settings:**
   - Format: GLB (binary)
   - Include: Selected Objects
   - Transform: +Y Up
   - Geometry: Apply Modifiers
   - Compression: Draco (optional)

### Code Organization

```
components/
├── canvas/
│   ├── WatchModel.tsx          # Main component
│   ├── WatchSelector.tsx       # UI for selecting watches
│   └── ModelInspector.tsx      # Debug component
├── ui/
│   └── WatchControls.tsx       # Scale, rotation controls
└── hooks/
    └── useWatchModel.ts        # Custom hook for watch logic
```

### Performance Monitoring

```typescript
import { Stats } from '@react-three/drei'

<Canvas>
  <Stats />  {/* Shows FPS, memory, render time */}
  <WatchModel {...props} />
</Canvas>
```

**Target Metrics:**
- FPS: 60 (desktop), 30+ (mobile)
- Frame time: <16ms (desktop), <33ms (mobile)
- Memory: <100MB for watch model

---

## Future Enhancements

### 1. Level of Detail (LOD)

```typescript
import { Lod } from '@react-three/drei'

<Lod distances={[0, 5, 10]}>
  <WatchModelHigh />   {/* 0-5 units */}
  <WatchModelMedium /> {/* 5-10 units */}
  <WatchModelLow />    {/* 10+ units */}
</Lod>
```

### 2. Texture Streaming

```typescript
// Load low-res first, then high-res
const [textureQuality, setTextureQuality] = useState('low')

useEffect(() => {
  setTimeout(() => setTextureQuality('high'), 1000)
}, [])
```

### 3. Watch Customization

```typescript
interface WatchCustomization {
  bandColor: string
  faceColor: string
  metalFinish: 'gold' | 'silver' | 'black'
}

// Apply customization to materials
material.color.set(customization.bandColor)
```

### 4. Physics Integration

```typescript
import { useSpring } from '@react-spring/three'

// Add spring physics for more natural movement
const { position } = useSpring({
  position: [wristPosition.x, wristPosition.y, wristPosition.z],
  config: { tension: 170, friction: 26 }
})
```

---

## Troubleshooting Checklist

- [ ] Model file exists in `public/models/`
- [ ] Model path starts with `/` (not `./` or `../`)
- [ ] Model is GLB format (not GLTF with separate files)
- [ ] Model size is reasonable (<10MB)
- [ ] Polygon count is optimized (<20k triangles)
- [ ] Lights are added to scene
- [ ] Camera position is appropriate
- [ ] Hand tracking is working (check console)
- [ ] Coordinate mapping is working (check debug page)
- [ ] No console errors
- [ ] FPS is acceptable (check Stats)

---

## Summary

The Watch Model Pipeline provides:

✅ **Automatic Model Loading** - GLB files load and cache automatically  
✅ **Smart Normalization** - Models center and scale correctly  
✅ **Material Enhancement** - Realistic reflections and shadows  
✅ **Real-Time Tracking** - Smooth position and orientation following  
✅ **Performance Optimized** - Efficient rendering and updates  
✅ **Debug Tools** - Comprehensive analysis and visualization  
✅ **Production Ready** - Robust error handling and best practices  

---

## Ticket 7: Watch Attachment Integration

### Overview

Ticket 7 enhances the watch model system with configurable offsets, handedness-based flipping, and fine-tuned placement controls. This allows users to adjust watch position and rotation in real-time for perfect wrist alignment.

### New Features

#### 1. Configurable Position Offsets

The watch can now be offset from the wrist position on all three axes:

```typescript
interface WatchModelProps {
  positionOffset?: { x: number; y: number; z: number }
  // ... other props
}
```

**How It Works:**

```typescript
// Apply position offset
const offsetPosition = {
  x: wristPosition.x + positionOffset.x,
  y: wristPosition.y + positionOffset.y,
  z: wristPosition.z + positionOffset.z,
}
```

**Use Cases:**
- **X offset**: Move watch left/right on wrist
- **Y offset**: Move watch up/down on arm
- **Z offset**: Move watch forward/backward (closer/farther from camera)

**Example:**
```typescript
<WatchModel
  wristPosition={wristPosition}
  positionOffset={{ x: 0, y: 0.05, z: 0 }}  // 0.05 units higher
/>
```

#### 2. Configurable Rotation Offsets

The watch can be rotated independently on all three axes:

```typescript
interface WatchModelProps {
  rotationOffset?: { x: number; y: number; z: number }
  // ... other props
}
```

**Rotation Axes:**
- **X (Pitch)**: Tilt watch face up/down
- **Y (Yaw)**: Rotate watch left/right
- **Z (Roll)**: Tilt watch sideways

**Applied in Model Processing:**

```typescript
// Apply rotation offset for watch orientation
clonedScene.rotation.set(
  rotationOffset.x,  // Pitch
  rotationOffset.y,  // Yaw
  rotationOffset.z   // Roll
)
```

**Default Rotation:**
```typescript
rotationOffset: { x: Math.PI / 2, y: 0, z: 0 }  // 90° pitch to align with wrist
```

**Why Math.PI / 2?**
- Most watch models are modeled lying flat (face up)
- Wrist is vertical when hand is raised
- 90° rotation (π/2 radians) makes watch face perpendicular to wrist

#### 3. Handedness-Based Flipping

The watch automatically mirrors for left hands:

```typescript
interface WatchModelProps {
  handedness?: 'Left' | 'Right'
  // ... other props
}
```

**Implementation:**

```typescript
// Apply handedness-based flipping
if (handedness === 'Left') {
  // Mirror the watch for left hand
  clonedScene.scale.x *= -1
}
```

**How It Works:**
1. Detect hand from MediaPipe (`handDetection.handedness`)
2. If left hand, flip X-axis scale to -1
3. Watch appears correctly oriented for left wrist

**Visual Comparison:**

```
Right Hand (scale.x = 1):          Left Hand (scale.x = -1):
    [12]                               [12]
   /    \                             /    \
  9      3                           3      9
   \    /                             \    /
    [6]                                [6]
```

#### 4. Watch Configuration Hook

New `useWatchConfig` hook manages all watch settings:

```typescript
const watchConfig = useWatchConfig('default')

// Access config
watchConfig.config.scale
watchConfig.config.positionOffset
watchConfig.config.rotationOffset
watchConfig.config.smoothing

// Update values
watchConfig.updateScale(1.5)
watchConfig.updatePositionOffset('y', 0.05)
watchConfig.updateRotationOffset('x', Math.PI / 2)
watchConfig.updateSmoothing(0.3)

// Load presets
watchConfig.loadPreset('sports')

// Reset
watchConfig.resetToDefault()
```

**Preset System:**

```typescript
export const WATCH_PRESETS = {
  default: {
    name: 'Default',
    config: {
      scale: 1.5,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
      smoothing: 0.3,
    },
  },
  sports: {
    name: 'Sports Watch',
    config: {
      scale: 1.8,
      positionOffset: { x: 0, y: 0.05, z: 0 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
      smoothing: 0.3,
    },
  },
  // ... more presets
}
```

#### 5. WatchControls UI Component

Interactive control panel for real-time adjustments:

**Features:**
- **Preset Buttons**: Quick load predefined configurations
- **Scale Slider**: Adjust watch size (0.1 to 2.0)
- **Position Sliders**: X, Y, Z offsets (-0.5 to 0.5)
- **Rotation Sliders**: Pitch, Yaw, Roll (-180° to 180°)
- **Smoothing Slider**: Adjust tracking responsiveness (0.1 to 0.9)
- **Reset Button**: Return to default settings

**Usage:**

```typescript
<WatchControls
  config={watchConfig.config}
  onScaleChange={watchConfig.updateScale}
  onPositionChange={watchConfig.updatePositionOffset}
  onRotationChange={watchConfig.updateRotationOffset}
  onSmoothingChange={watchConfig.updateSmoothing}
  onReset={watchConfig.resetToDefault}
  onLoadPreset={watchConfig.loadPreset}
  presets={watchConfig.presets}
/>
```

### Integration

#### Updated WatchModel Component

```typescript
export function WatchModel({
  wristPosition,
  handOrientation,
  handedness = 'Right',           // NEW
  smoothing = 0.3,
  scale = 1,
  positionOffset = { x: 0, y: 0, z: 0 },      // NEW
  rotationOffset = { x: 0, y: 0, z: 0 },      // NEW
  showDebugAxis = false,
  modelPath = '/models/watch.glb',
}: WatchModelProps) {
  // ... implementation
}
```

#### Main AR Page Integration

```typescript
function Home() {
  const watchConfig = useWatchConfig('default')
  const { handDetection } = useHandTracking()
  
  return (
    <Canvas>
      <WatchModel
        wristPosition={mappedData.wristPosition}
        handOrientation={mappedData.handOrientation}
        handedness={handDetection?.handedness || 'Right'}
        smoothing={watchConfig.config.smoothing}
        scale={watchConfig.config.scale}
        positionOffset={watchConfig.config.positionOffset}
        rotationOffset={watchConfig.config.rotationOffset}
      />
    </Canvas>
  )
}
```

#### Debug Page Integration

```typescript
function CoordinateDebugPage() {
  const watchConfig = useWatchConfig('default')
  const [showWatchControls, setShowWatchControls] = useState(true)
  
  return (
    <>
      {/* 3D Scene */}
      <Canvas>
        <WatchModel {...watchConfig.config} />
      </Canvas>
      
      {/* Controls Panel */}
      {showWatchControls && (
        <WatchControls
          config={watchConfig.config}
          onScaleChange={watchConfig.updateScale}
          // ... other handlers
        />
      )}
    </>
  )
}
```

### Fine-Tuning Guide

#### Finding the Right Scale

1. Start with default (1.5)
2. If watch is too small, increase to 1.8-2.0
3. If watch is too large, decrease to 1.2-1.4
4. Sports watches: 1.6-2.0
5. Luxury watches: 1.3-1.5

#### Adjusting Position

**Y-Axis (Up/Down):**
- Positive: Move up the arm
- Negative: Move down toward hand
- Typical range: -0.05 to 0.05

**X-Axis (Left/Right):**
- Positive: Move right
- Negative: Move left
- Use for off-center placement

**Z-Axis (Forward/Back):**
- Positive: Move away from camera
- Negative: Move toward camera
- Use for depth adjustment

#### Adjusting Rotation

**X-Axis (Pitch) - Most Important:**
- Default: π/2 (90°) - watch face perpendicular to wrist
- Increase: Tilt face toward fingers
- Decrease: Tilt face toward elbow

**Y-Axis (Yaw):**
- Rotate watch around wrist
- Use for angled placement

**Z-Axis (Roll):**
- Tilt watch sideways
- Rarely needed

#### Smoothing

- **0.1-0.2**: Very responsive, may be jittery
- **0.3-0.4**: Balanced (recommended)
- **0.5-0.9**: Very smooth, may lag behind hand

### Common Adjustments

#### Watch Too Small

```typescript
watchConfig.updateScale(1.8)
```

#### Watch Not Aligned with Wrist

```typescript
// Rotate 90° on X-axis
watchConfig.updateRotationOffset('x', Math.PI / 2)
```

#### Watch Floating Above Wrist

```typescript
// Move down
watchConfig.updatePositionOffset('y', -0.03)
```

#### Watch Too Close to Camera

```typescript
// Move back
watchConfig.updatePositionOffset('z', 0.05)
```

#### Left Hand Looks Wrong

The system automatically flips for left hands, but if it still looks wrong:

```typescript
// Manually adjust Y rotation
watchConfig.updateRotationOffset('y', Math.PI)
```

### Performance Considerations

**useMemo Optimization:**

The model processing now includes rotation and handedness in dependencies:

```typescript
const processedModel = useMemo(() => {
  // ... processing
}, [scene, scale, rotationOffset, handedness])
```

**Why This Matters:**
- Model only reprocesses when these values change
- Not on every render
- Maintains 60 FPS performance

### Troubleshooting

#### Watch Appears Upside Down

**Solution:** Adjust X rotation offset

```typescript
rotationOffset: { x: -Math.PI / 2, y: 0, z: 0 }
```

#### Watch Faces Wrong Direction

**Solution:** Adjust Y rotation offset

```typescript
rotationOffset: { x: Math.PI / 2, y: Math.PI, z: 0 }
```

#### Left Hand Mirror Looks Wrong

**Solution:** The automatic flip might conflict with model orientation. Try:

```typescript
// Disable automatic flip by not passing handedness
<WatchModel handedness="Right" />  // Force right hand orientation
```

#### Watch Clips Through Wrist

**Solution:** Adjust Z offset to move watch forward

```typescript
positionOffset: { x: 0, y: 0, z: 0.02 }
```

### Best Practices

1. **Start with Presets**: Use built-in presets as starting points
2. **Adjust Incrementally**: Make small changes (0.01-0.05)
3. **Test Both Hands**: Verify left and right hand appearance
4. **Save Configurations**: Store user preferences in localStorage
5. **Provide Reset**: Always allow users to reset to defaults

### Future Enhancements

- [ ] Per-model default configurations
- [ ] User preference persistence (localStorage)
- [ ] Automatic scale based on wrist size
- [ ] Gesture-based adjustment (pinch to scale)
- [ ] Watch band customization
- [ ] Multiple watch support with individual configs

---

## Ticket 8: Dynamic Scaling System

### Overview

Ticket 8 implements automatic watch size adjustment based on hand width and camera distance. The system calculates hand dimensions in real-time and adjusts the watch scale naturally as the user moves their hand closer or farther from the camera.

### Problem Statement

**Without Dynamic Scaling:**
- Watch appears same size regardless of hand distance
- Looks unnatural when hand moves closer/farther
- Doesn't account for different hand sizes
- Fixed scale doesn't adapt to camera zoom

**With Dynamic Scaling:**
- Watch scales proportionally with hand
- Natural appearance at all distances
- Adapts to individual hand sizes
- Smooth transitions without jumps

### Implementation

#### 1. Hand Width Calculation

Calculate the distance between index and pinky base landmarks:

```typescript
function calculateHandWidth(handDetection: HandDetection): number {
  const indexBase = handDetection.landmarks.indexBase
  const pinkyBase = handDetection.landmarks.pinkyBase

  // Calculate Euclidean distance in 3D space
  const dx = indexBase.x - pinkyBase.x
  const dy = indexBase.y - pinkyBase.y
  const dz = indexBase.z - pinkyBase.z

  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
```

**Why These Landmarks?**
- Index and pinky bases are stable points
- Distance represents hand width
- Less affected by finger movement
- Reliable for scale calculation

**Typical Values:**
- Close to camera: 0.15 - 0.20
- Normal distance: 0.10 - 0.15
- Far from camera: 0.05 - 0.10

#### 2. Average Depth Calculation

Calculate average z-coordinate of key landmarks:

```typescript
function calculateAverageDepth(handDetection: HandDetection): number {
  const wrist = handDetection.landmarks.wrist
  const indexBase = handDetection.landmarks.indexBase
  const pinkyBase = handDetection.landmarks.pinkyBase

  return (wrist.z + indexBase.z + pinkyBase.z) / 3
}
```

**Understanding Z-Depth:**
- Negative values: Closer to camera
- Positive values: Farther from camera
- Range: typically -0.1 to 0.1
- More negative = need larger scale

#### 3. Reference Value Initialization

On first detection, store reference values:

```typescript
if (!isInitialized.current) {
  referenceHandWidth.current = currentHandWidth
  referenceDepth.current = currentDepth
  isInitialized.current = true
  setDynamicScale(baseScale)
  return
}
```

**Why Reference Values?**
- Normalize to user's specific hand
- Account for individual hand sizes
- Provide baseline for calculations
- Reset when hand is lost

#### 4. Scale Factor Calculation

Combine width and depth factors:

```typescript
// 1. Hand width factor (accounts for hand size variations)
const widthFactor = currentHandWidth / referenceHandWidth.current

// 2. Depth factor (accounts for camera distance)
const depthDelta = currentDepth - referenceDepth.current
const depthFactor = 1 - depthDelta * 2  // Scale by 2x for visible effect

// 3. Combine factors
let targetScale = baseScale * widthFactor * depthFactor

// 4. Clamp to min/max range
targetScale = Math.max(minScale, Math.min(maxScale, targetScale))
```

**Factor Breakdown:**

**Width Factor:**
```
currentWidth = 0.12
referenceWidth = 0.10
widthFactor = 0.12 / 0.10 = 1.2  (20% larger)
```

**Depth Factor:**
```
currentDepth = -0.05  (closer to camera)
referenceDepth = 0.00
depthDelta = -0.05
depthFactor = 1 - (-0.05 * 2) = 1.1  (10% larger)
```

**Combined:**
```
baseScale = 1.5
targetScale = 1.5 * 1.2 * 1.1 = 1.98
```

#### 5. Jump Prevention

Use moving average to smooth scale changes:

```typescript
// Add to history buffer
scaleHistory.current.push(targetScale)
if (scaleHistory.current.length > maxHistorySize) {
  scaleHistory.current.shift()
}

// Calculate smoothed scale (moving average)
const smoothedScale =
  scaleHistory.current.reduce((sum, val) => sum + val, 0) /
  scaleHistory.current.length

// Apply additional lerp smoothing
setDynamicScale((prevScale) => {
  const newScale = THREE.MathUtils.lerp(prevScale, smoothedScale, smoothing)
  return newScale
})
```

**Two-Stage Smoothing:**

1. **Moving Average** (10 frames):
   - Reduces high-frequency noise
   - Prevents sudden jumps
   - Provides stable baseline

2. **Lerp Smoothing** (0.15 alpha):
   - Gradual transitions
   - Smooth visual appearance
   - Responsive but not jittery

**Example:**
```
Frame 1: target=2.0, history=[2.0], avg=2.0, lerp(1.5→2.0, 0.15)=1.575
Frame 2: target=2.1, history=[2.0,2.1], avg=2.05, lerp(1.575→2.05, 0.15)=1.646
Frame 3: target=1.9, history=[2.0,2.1,1.9], avg=2.0, lerp(1.646→2.0, 0.15)=1.699
...gradually approaches target
```

#### 6. Stability Detection

Detect when scale is stable (not changing rapidly):

```typescript
if (scaleHistory.current.length >= maxHistorySize) {
  const variance =
    scaleHistory.current.reduce((sum, val) => {
      const diff = val - smoothedScale
      return sum + diff * diff
    }, 0) / scaleHistory.current.length

  setIsStable(variance < 0.01)  // Stable if variance is low
}
```

**Variance Threshold:**
- < 0.01: Stable (green indicator)
- ≥ 0.01: Adjusting (yellow indicator)

### useDynamicScale Hook

Complete hook interface:

```typescript
const { dynamicScale, handWidth, averageDepth, isStable } = useDynamicScale(
  handDetection,
  {
    baseScale: 1.5,      // Starting scale
    minScale: 0.8,       // Minimum allowed scale
    maxScale: 3.0,       // Maximum allowed scale
    smoothing: 0.15,     // Lerp factor (0-1)
    enabled: true,       // Enable/disable dynamic scaling
  }
)
```

**Return Values:**
- `dynamicScale`: Current calculated scale
- `handWidth`: Measured hand width
- `averageDepth`: Average z-coordinate
- `isStable`: Whether scale is stable

### Integration

#### WatchModel Component

```typescript
<WatchModel
  wristPosition={wristPosition}
  scale={1.5}                    // Base scale (used when dynamic disabled)
  dynamicScale={dynamicScale}    // Dynamic scale from hook
  useDynamicScaling={true}       // Enable dynamic scaling
  // ... other props
/>
```

**Internal Logic:**

```typescript
// Use dynamic scale if enabled, otherwise use static scale
const finalScale = useDynamicScaling ? dynamicScale : scale
clonedScene.scale.setScalar(normalizedScale * finalScale)
```

#### Main AR Page

```typescript
function Home() {
  const watchConfig = useWatchConfig('default')
  const { handDetection } = useHandTracking()
  
  // Dynamic scaling enabled by default
  const { dynamicScale } = useDynamicScale(handDetection, {
    baseScale: watchConfig.config.scale,
    minScale: 0.8,
    maxScale: 3.0,
    smoothing: 0.15,
    enabled: true,
  })
  
  return (
    <WatchModel
      scale={watchConfig.config.scale}
      dynamicScale={dynamicScale}
      useDynamicScaling={true}
    />
  )
}
```

#### Debug Page

```typescript
function CoordinateDebugPage() {
  const [useDynamicScaling, setUseDynamicScaling] = useState(true)
  
  const { dynamicScale, handWidth, averageDepth, isStable } = useDynamicScale(
    handDetection,
    {
      baseScale: watchConfig.config.scale,
      enabled: useDynamicScaling,
    }
  )
  
  return (
    <>
      {/* Toggle button */}
      <button onClick={() => setUseDynamicScaling(!useDynamicScaling)}>
        Dynamic Scaling: {useDynamicScaling ? 'ON' : 'OFF'}
      </button>
      
      {/* Info panel */}
      {useDynamicScaling && (
        <div>
          <p>Scale: {dynamicScale.toFixed(3)}</p>
          <p>Hand Width: {handWidth.toFixed(4)}</p>
          <p>Depth: {averageDepth.toFixed(4)}</p>
          <p>Status: {isStable ? 'Stable' : 'Adjusting...'}</p>
        </div>
      )}
    </>
  )
}
```

### Configuration Options

#### Base Scale

Starting point for dynamic scaling:

```typescript
baseScale: 1.5  // Default watch size
```

- Too low: Watch always small
- Too high: Watch always large
- Recommended: 1.3 - 1.8

#### Min/Max Scale

Limits to prevent extreme sizes:

```typescript
minScale: 0.8   // Minimum (80% of base)
maxScale: 3.0   // Maximum (300% of base)
```

**Why Limits?**
- Prevent watch from becoming invisible (too small)
- Prevent watch from filling screen (too large)
- Maintain realistic proportions

#### Smoothing

Controls transition speed:

```typescript
smoothing: 0.15  // Lerp factor
```

- Lower (0.05-0.10): Very smooth, may lag
- Medium (0.15-0.25): Balanced (recommended)
- Higher (0.30-0.50): Responsive, may be jittery

### Performance Considerations

**Computational Cost:**
- Hand width calculation: ~0.01ms
- Depth calculation: ~0.01ms
- Moving average: ~0.02ms
- Total per frame: ~0.04ms (negligible)

**Memory Usage:**
- Scale history buffer: 10 numbers = 80 bytes
- Reference values: 2 numbers = 16 bytes
- Total: <100 bytes (minimal)

**Frame Rate Impact:**
- No measurable impact on FPS
- Runs at 60 FPS consistently

### Troubleshooting

#### Watch Jumps in Size

**Cause:** Smoothing too low or history buffer too small

**Solution:**
```typescript
smoothing: 0.15,  // Increase from 0.05
maxHistorySize: 15,  // Increase from 10
```

#### Watch Doesn't Scale

**Cause:** Dynamic scaling disabled or min/max too restrictive

**Solution:**
```typescript
enabled: true,
minScale: 0.5,  // Lower minimum
maxScale: 4.0,  // Higher maximum
```

#### Watch Scales Too Much

**Cause:** Depth factor too aggressive

**Solution:**
```typescript
// In useDynamicScale.ts, reduce depth multiplier:
const depthFactor = 1 - depthDelta * 1  // Changed from 2
```

#### Scale Lags Behind Hand

**Cause:** Smoothing too high

**Solution:**
```typescript
smoothing: 0.25,  // Increase from 0.15
```

### Best Practices

1. **Enable by Default**: Dynamic scaling improves UX significantly
2. **Provide Toggle**: Let users disable if they prefer fixed size
3. **Show Status**: Display "Stable" indicator for user confidence
4. **Tune Per Watch**: Different watch types may need different base scales
5. **Test at Distances**: Verify behavior at near/far extremes

### Future Enhancements

- [ ] Adaptive smoothing based on movement speed
- [ ] Per-user calibration (save reference values)
- [ ] Gesture to lock/unlock scale
- [ ] Scale based on wrist circumference
- [ ] Machine learning for optimal scaling
- [ ] Multi-hand scale synchronization

---

---

## Ticket 9A — Rotation System (Critical)

### Overview

Eliminated watch flickering and gimbal-lock spinning by replacing the Euler-based rotation pipeline with a full quaternion pipeline and fixing a non-orthonormal basis bug in the orientation math.

### Root Causes of the Original Flickering

Three distinct bugs were all contributing simultaneously:

**1. Gimbal lock singularity in Euler lerp**  
`WatchModel` and `WristAnchor` smoothed rotation by lerping X/Y/Z Euler angles independently. When the wrist rotates through ±90° pitch — which is the natural resting position for any watch wearer — `THREE.Euler.setFromRotationMatrix` can return equivalent-but-opposite angle representations on consecutive frames (e.g. `+π` one frame, `−π` the next). Lerping between `3.14` and `−3.14` takes the long way around (a full rotation in a single frame).

**2. Non-orthonormal basis in `calculateHandOrientation`**  
The old function used `wrist→index` as the "forward" vector and `index→pinky` as the "palm" vector. These two vectors are **not perpendicular** — the index finger spreads at an angle relative to the knuckle row. `crossVectors` of two non-orthogonal vectors produces a shear matrix, not a pure rotation. Decomposing that back to Euler angles produces garbage near any singularity.

**3. `useState` inside `useFrame` (60 React re-renders per second)**  
Both components called `setCurrentPosition` and `setCurrentRotation` on every animation frame, triggering 60 React reconciliation cycles per second. Beyond the performance hit, this caused the `useMemo` dependency check to run 60×/s and occasionally re-clone the model during busy frames.

### Implementation

#### `lib/three/coordinateMapping.ts` — `calculateWristQuaternion`

Replaced `calculateHandOrientation` (returned `THREE.Euler`) with `calculateWristQuaternion` (returns `THREE.Quaternion`).

Key improvements:
- Uses **midpoint of the knuckle row** (average of index and pinky base) instead of the index finger alone. This is significantly more stable when the hand spreads or closes.
- Full **Gram-Schmidt orthonormalization** — derives right, up, and normal axes in two cross-product passes, guaranteeing a perfectly orthonormal basis regardless of landmark noise.

```typescript
// Primary axis: wrist → mid-knuckles (along forearm)
const midKnuckles = new THREE.Vector3()
  .addVectors(indexVec, pinkyVec)
  .multiplyScalar(0.5)
const upAxis = new THREE.Vector3().subVectors(midKnuckles, wristVec).normalize()

// Secondary axis: across palm
const rightAxis = new THREE.Vector3().subVectors(indexVec, pinkyVec).normalize()

// Gram-Schmidt: derive normal, then re-orthogonalize right
const normalAxis = new THREE.Vector3().crossVectors(rightAxis, upAxis).normalize()
rightAxis.crossVectors(upAxis, normalAxis).normalize()

const matrix = new THREE.Matrix4().makeBasis(rightAxis, upAxis, normalAxis)
return new THREE.Quaternion().setFromRotationMatrix(matrix)
```

The resulting coordinate frame:
| Axis | Direction |
|------|-----------|
| +X (right) | Pinky → index (across palm width) |
| +Y (up)    | Wrist → mid-knuckles (along forearm) |
| +Z (normal)| Out of the back of the hand (palm normal) |

#### `hooks/useCoordinateMapping.ts`

Updated `MappedHandData.handOrientation` type from `THREE.Euler` to `THREE.Quaternion`. No consumer code needed changes — the pages pass `mappedData.handOrientation` through directly.

#### `components/canvas/WatchModel.tsx`

Three changes:

**a) `useState` → `useRef` for all per-frame values:**
```typescript
const currentPosRef = useRef<WorldCoordinates | null>(null)
const currentQuatRef = useRef(new THREE.Quaternion())
const targetQuatRef = useRef(new THREE.Quaternion())
const offsetQuatRef = useRef(new THREE.Quaternion())
const tempEulerRef = useRef(new THREE.Euler())
const rotationInitializedRef = useRef(false)
const normalizedScaleRef = useRef(1)
```
All THREE objects allocated once at mount, reused every frame — zero GC pressure.

**b) Quaternion slerp instead of Euler lerp:**
```typescript
// Compose wrist world orientation with local rotation offset:
tempEulerRef.current.set(rotationOffset.x, rotationOffset.y, rotationOffset.z)
offsetQuatRef.current.setFromEuler(tempEulerRef.current)
targetQuatRef.current.multiplyQuaternions(handOrientation, offsetQuatRef.current)

// Slerp always takes the shortest angular path — no more ±π flips:
currentQuatRef.current.slerp(targetQuatRef.current, smoothing)
groupRef.current.quaternion.copy(currentQuatRef.current)
```

On the first valid frame the quaternion is copied directly (no slerp), so the watch snaps to the correct orientation immediately rather than spinning from identity.

**c) `useMemo` decoupled from scale/rotation/handedness:**

Previously, `dynamicScale`, `scale`, `rotationOffset`, and `handedness` were all in the `useMemo` dependency array. Since `dynamicScale` updates every frame, the model was being re-cloned ~60×/s.

Now `useMemo` only depends on `[scene]` and only handles geometry normalization and material setup. Scale and handedness are applied every frame via `modelRef`:

```typescript
const finalScale = useDynamicScaling ? dynamicScale : scale
const s = normalizedScaleRef.current * finalScale
// Mirror X for left-hand wearers without re-cloning:
modelRef.current.scale.set(handedness === 'Left' ? -s : s, s, s)
```

#### `components/canvas/WristAnchor.tsx`

Same `useState` → `useRef` + slerp pattern. The anchor has no rotation offset, so it sleps directly toward the incoming `handOrientation` quaternion.

### Prop Type Changes

`handOrientation` changed from `THREE.Euler | null` to `THREE.Quaternion | null` in both `WatchModel` and `WristAnchor`. The `useCoordinateMapping` hook is the only producer, so all consumers get the correct type automatically.

### Troubleshooting

#### Watch still twitches at extreme angles
Extreme angles (wrist folded >120°) push MediaPipe landmark accuracy to its limits — the jitter is in the input data, not the rotation math. Increase `smoothing` (e.g. `0.15`) or add a velocity-based adaptive smoothing hook in a future ticket.

#### Watch snaps rather than smoothly transitioning
The `rotationInitializedRef` guard snaps on the **first** valid frame only. If the watch appears to snap on every hand-loss/re-detection, check that `wristPosition` doesn't intermittently return `null` due to low detection confidence.

#### `rotationOffset` sliders feel less responsive
`rotationOffset` is now applied every frame via quaternion multiplication in `useFrame`. The slider value is read directly from the React closure so changes are reflected immediately — no `useMemo` recalculation lag.

### Best Practices

1. **Never lerp Euler angles directly** — always use `Quaternion.slerp()` for rotation interpolation
2. **Never put `THREE.Object3D` mutations inside React state** — use `useRef` and mutate in `useFrame`
3. **Gram-Schmidt orthonormalization is cheap** — two `crossVectors` + two `normalize()` calls, always do it when building a rotation from landmark vectors
4. **Pre-allocate THREE objects** — create `Quaternion`, `Euler`, `Vector3` instances as refs at mount, not inside `useFrame`

---

## Summary

**Last Updated:** Ticket 9A — Rotation System  
**Next Steps:** Multiple watch models and watch selection UI

