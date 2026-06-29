# TimeVision - AR Virtual Watch Try-On

A browser-based augmented reality application that lets users virtually try on watches using real-time hand tracking and 3D rendering. Fully installable as a **Progressive Web App** — works on desktop and mobile like a native app.

## Overview

This project uses computer vision and WebGL to create an immersive watch try-on experience directly in the browser. Users can see how different watches look on their wrist in real-time using their device's camera.

Built with **Next.js**, **React Three Fiber**, **Three.js**, **MediaPipe Hands**, and **next-pwa**.

## Features

### Core Capabilities

- **Real-Time Hand Tracking** - Detects and tracks 21 hand landmarks at 30+ FPS using MediaPipe
- **3D Watch Rendering** - PBR (Physically-Based Rendering) materials with realistic lighting and reflections
- **Automatic Calibration** - Dynamic sizing based on hand dimensions and camera distance
- **Wrist Occlusion** - Depth-buffer masking creates realistic strap wrap-around effect
- **Motion Smoothing** - One Euro Filter and quaternion slerp for stable, jitter-free tracking
- **Responsive Design** - Works on desktop and mobile (iOS Safari, Android Chrome)
- **Progressive Web App** - Installable, offline-capable, app-like experience

### Watch Positioning System

- **Anatomical Alignment** - Quaternion-based rotation system with proper forearm coordinate frames
- **Configurable Presets** - Default, Sports, Luxury, and Smart watch styles with optimized placement
- **Hand-Width Scaling** - Automatic size adjustment based on user's hand measurements
- **Smooth Transitions** - Velocity-adaptive smoothing balances responsiveness with stability

### Developer Tools

- **Debug Visualizer** - Real-time display of hand landmarks, coordinate frames, and FPS
- **Coordinate Inspector** - Split-view debugging showing 2D tracking and 3D world-space mapping
- **Model Pipeline** - GLB model loading with automatic normalization and material enhancement
- **Performance Monitoring** - Built-in FPS counter and performance metrics

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
pnpm install

# Sync MediaPipe WASM assets (automatic on install)
pnpm run sync:mediapipe

# Start development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Main AR Experience

Navigate to `/watches` to browse the catalog, then tap any watch to enter the AR try-on at `/try-on/[watchId]`:

1. Select a watch from the catalog
2. Grant camera permissions when prompted
3. Position your hand in view with palm facing the camera
4. The watch will automatically attach to your wrist
5. Rotate your hand to view from different angles

The root page (`/`) is the landing page. The original AR test is at `/demo`.

### Debug Pages

- `/coordinate-debug` - Split-view visualization of tracking and 3D mapping with **Position Smoothing Experiment Panel**
- `/3d-demo` - React Three Fiber interactive demo
- `/camera-test` - Camera integration testing
- `/demo` - Full AR experience (original test page)

### Position Smoothing Experiment (Ticket 41b - COMPLETED)

The `/coordinate-debug` page includes a **Smoothing Debug Panel** for comparing position stabilization strategies:

**Features:**
- Toggle between **One Euro Filter only** vs **One Euro + Adaptive Lerp**
- Real-time variance metrics (current, average, std dev, max)
- Velocity and adaptive alpha tracking
- Recording sessions with data export
- Automatic comparison between smoothing strategies

**Results:**
- **Winner:** One Euro Filter only
- **Improvement:** 33.8% reduction in position jitter
- **Root cause:** Adaptive lerp measured velocity from already-smoothed data, creating feedback loop that amplified jitter instead of reducing it

**Current Implementation (Validated):**
```
Target Position → One Euro Filter → Fixed Lerp (0.3) → Final Position
```

### Rotation Smoothing Validation (Ticket 41c - IN PROGRESS)

The `/coordinate-debug` page now includes **Quaternion Smoothing Bypass** for validating rotation pipeline:

**Purpose:**
- Isolate whether smoothing layer is causing rotation regression
- Compare raw (unsmoothed) vs smoothed quaternion behavior
- Verify V2 coordinate system correctly follows all wrist rotations

**How to use:**
1. Navigate to `/coordinate-debug`
2. Use the **Rotation Smoothing** toggle in the debug panel
3. Test both modes during:
   - Front-facing wrist
   - Back-facing wrist
   - Side-facing wrist (left/right)
   - Continuous wrist rotation
4. Observe if side rotations work correctly in RAW mode

**Modes:**
- **Smoothed (Purple)**: Normal operation with fixed-factor slerp (0.3)
- **RAW (Red)**: Bypass all smoothing, apply target quaternion directly (validation only)

**Expected Outcome:**
- If RAW mode follows all rotations correctly → regression is in smoothing layer
- If RAW mode has same constraint → regression is upstream (V2 coordinate system or calibration)
- **Std Dev**: Consistency of jitter over time

**Expected Results:**
- One Euro Only should have **lower variance** (less jitter)
- Adaptive Lerp adds responsiveness but may increase jitter
- Record 10-15 second sessions for accurate comparison

### Watch Configuration

The system includes preset configurations for different watch styles:

```typescript
import { useWatchConfig } from '@/hooks/useWatchConfig'

const { config, loadPreset } = useWatchConfig('default')

// Available presets: 'default', 'sports', 'luxury', 'smart'
loadPreset('sports')
```

## Watch Calibration System V2

The TimeVision platform includes a comprehensive per-watch calibration system for precise AR positioning. Each watch in the registry can be individually fine-tuned for optimal visual accuracy.

### Configuration Architecture

All watch configurations are stored in `/lib/watches/registry.ts`. Each watch has the following calibration parameters:

#### 1. **Scale Calibration**

Controls the physical size of the watch model relative to the user's wrist.

```typescript
scale: 1.5
```

- **Range**: `0.5` (small/slim) to `3.0` (large/bulky)
- **Default**: `1.5` (standard watch size)
- **Use Cases**:
  - Small dress watches: `1.2 - 1.4`
  - Standard watches: `1.4 - 1.6`
  - Sports watches: `1.6 - 1.8`
  - Large/bulky watches: `1.8 - 2.2`

#### 2. **Rotation Offset**

Applied in **wrist local coordinate frame** after wrist quaternion computation. Controls the angular orientation of the watch face.

```typescript
rotationOffset: { x: Math.PI / 2, y: 0, z: 0 }
```

- **Units**: Radians
- **Coordinate Frame**: Wrist-local (X: lateral, Y: depth, Z: forearm)
- **Standard Values**:
  - `x: π/2` (90°) - Rotates watch face to align with wrist dorsal side (almost always required)
  - `y: 0` - No lateral rotation (adjust if watch face is tilted left/right)
  - `z: 0` - No twist around forearm (adjust if watch is rotated around wrist)
- **Common Adjustments**:
  - Watch face tilted left: Increase `y` (e.g., `0.1`)
  - Watch face tilted right: Decrease `y` (e.g., `-0.1`)
  - Watch rotated clockwise around wrist: Increase `z`
  - Watch rotated counterclockwise: Decrease `z`

#### 3. **Position Offset**

Applied in **wrist local coordinate frame** before palm normal depth adjustment. Controls the 3D translation of the watch.

```typescript
positionOffset: { x: 0, y: 0.02, z: 0 }
```

- **Units**: World units (typically meters)
- **Coordinate Frame**: Wrist-local
  - **X**: Lateral shift (positive = toward pinky, negative = toward thumb)
  - **Y**: Depth into wrist (positive = deeper into wrist surface, negative = more on surface)
  - **Z**: Along forearm (positive = toward fingers, negative = toward elbow)
- **Typical Range**: `-0.05` to `0.05`
- **Common Adjustments**:
  - Watch appears too high on wrist: Increase `y` (e.g., `0.01`)
  - Watch appears sunken: Decrease `y` (e.g., `-0.01`)
  - Watch too far toward thumb: Increase `x`
  - Watch too far toward fingers: Increase `z`

#### 4. **Wrist Fit Bias** (NEW in V2)

Fine-tunes how deep the watch sits **INTO** the wrist surface. This is **additive to `positionOffset.y`** and applied along the palm normal vector for stable surface anchoring.

```typescript
wristFitBias: 0.015
```

- **Range**: `-0.02` (surface) to `0.02` (deep)
- **Default**: `0` (standard fit)
- **Use Cases**:
  - **Positive values** (+0.005 to +0.02): Bulky/thick watches that need to sink deeper into the wrist
  - **Negative values** (-0.005 to -0.02): Slim/flat watches that should sit more on the surface
  - **Zero**: Standard fit (watch sits at wrist surface)
- **Category Guidelines**:
  - Sports watches: `0.010 - 0.015` (bulky, athletic build)
  - Luxury watches: `-0.005 - -0.010` (slim, elegant profile)
  - Casual watches: `0 - 0.005` (standard to slightly thick)
  - Smart watches: `0.006 - 0.012` (typically thicker bodies)

**Why separate from `positionOffset.y`?**
- `positionOffset.y` applies in the wrist coordinate frame (may not be perpendicular to skin surface)
- `wristFitBias` applies along the palm normal vector (always perpendicular to wrist surface)
- This provides stable depth control regardless of wrist orientation

#### 5. **Occluder Offset**

Adjusts the invisible geometry that hides the watch when the hand covers it. Typically matches `positionOffset` for consistent depth handling.

```typescript
occluderOffset: { x: 0, y: 0, z: 0 }
```

- **Units**: World units
- **Best Practice**: Usually set to `{ x: 0, y: 0, z: 0 }` and use `positionOffset` + `wristFitBias` instead
- **When to adjust**: Only if occlusion boundary needs independent control from watch position

#### 6. **Motion Smoothing**

##### Position Smoothing

```typescript
smoothing: 0.3
```

- **Range**: `0.15` (heavy smoothing) to `0.5` (light smoothing)
- **Default**: `0.3` (validated optimal)
- **Applied**: After One Euro Filter, as a fixed lerp factor
- **Effect**: Lower values = smoother but less responsive, higher values = more responsive but potentially jittery

##### Rotation Smoothing

```typescript
rotationSmoothing: 0.6
```

- **Range**: `0.3` (heavy smoothing) to `0.85` (light smoothing)
- **Default**: `0.6` (validated optimal, preserves full rotation range)
- **Applied**: As slerp alpha for quaternion interpolation
- **CRITICAL**: Values < 0.5 may cause rotation compression (loss of side rotation range)
- **Effect**: Controls responsiveness vs. stability of watch orientation

**Why separate from position smoothing?**
- Rotation and position have different dynamic characteristics
- Position smoothing factor `0.3` was optimal for eliminating translation jitter
- But `0.3` for rotation caused 28-33% compression of rotation range
- Separate controls allow independent optimization

### Watch Configuration Example

```typescript
'sport-watch-01': {
  id: 'sport-watch-01',
  name: 'Sport Pro',
  brand: 'ActiveTime',
  category: 'sports',
  thumbnail: 'https://example.com/sport-watch.png',
  modelUrl: '/models/watch.glb',
  
  // Calibration System V2
  scale: 1.8,                                        // Large athletic watch
  rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },  // Standard alignment
  positionOffset: { x: 0, y: 0.02, z: 0 },         // Slightly raised
  wristFitBias: 0.015,                              // Bulky sports watch sits deeper
  occluderOffset: { x: 0, y: 0, z: 0 },            // Default
  smoothing: 0.3,                                   // Validated position smoothing
  rotationSmoothing: 0.6,                           // Validated rotation smoothing
  
  description: 'Rugged sports watch built for performance',
  price: '$399',
}
```

### Calibration Workflow

#### Step 1: Initial Configuration

1. Add new watch entry to `WATCH_REGISTRY` in `/lib/watches/registry.ts`
2. Set baseline values:
   ```typescript
   scale: 1.5,
   rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
   positionOffset: { x: 0, y: 0, z: 0 },
   wristFitBias: 0,
   occluderOffset: { x: 0, y: 0, z: 0 },
   smoothing: 0.3,
   rotationSmoothing: 0.6,
   ```

#### Step 2: Visual Testing

1. Navigate to `/coordinate-debug` or `/try-on/[watchId]`
2. Enable camera and hand tracking
3. Observe watch placement from multiple angles:
   - Front-facing wrist
   - Back-facing wrist
   - Side-facing wrist (left/right)
   - Rotated wrist positions

#### Step 3: Iterative Tuning

Adjust parameters based on visual observations:

**If watch is too small/large:**
- Modify `scale` (0.1 increments initially)

**If watch face is misaligned:**
- Adjust `rotationOffset.y` (0.05 rad increments)
- Adjust `rotationOffset.z` for wrist twist alignment

**If watch floats above wrist:**
- Increase `positionOffset.y` (0.005 increments)
- For bulky watches: Also increase `wristFitBias` (0.005 increments)

**If watch sinks too deep:**
- Decrease `positionOffset.y`
- For slim watches: Use negative `wristFitBias` (-0.005 to -0.010)

**If watch is shifted laterally:**
- Adjust `positionOffset.x` (left/right alignment)

**If watch is too far forward/back on wrist:**
- Adjust `positionOffset.z` (finger/elbow direction)

**If tracking is jittery:**
- Decrease `smoothing` (0.25-0.3 for heavier smoothing)
- Do NOT adjust `rotationSmoothing` below 0.5 (causes rotation compression)

**If tracking feels sluggish:**
- Increase `smoothing` (0.35-0.4 for lighter smoothing)
- Increase `rotationSmoothing` (0.65-0.75 for more responsive rotation)

#### Step 4: Category-Specific Guidelines

**Sports Watches:**
```typescript
scale: 1.7 - 1.9           // Larger, athletic build
wristFitBias: 0.010 - 0.015 // Bulky, sits deeper
smoothing: 0.3              // Standard stability
```

**Luxury Watches:**
```typescript
scale: 1.3 - 1.5           // Slim, elegant profile
wristFitBias: -0.005 - -0.010 // Sits closer to surface
smoothing: 0.35 - 0.4       // Slightly more responsive
```

**Casual Watches:**
```typescript
scale: 1.4 - 1.6           // Standard size
wristFitBias: 0 - 0.005    // Standard to slightly thick
smoothing: 0.3              // Balanced
```

**Smart Watches:**
```typescript
scale: 1.5 - 1.7           // Rectangular, thicker
wristFitBias: 0.006 - 0.012 // Thicker bodies
smoothing: 0.3              // Standard stability
```

#### Step 5: Validation

Test calibrated watch in production environment (`/try-on/[watchId]`) with:
- Different hand sizes (if possible)
- Various lighting conditions
- Full range of wrist rotations
- Fast vs. slow hand movements

Ensure:
- ✅ Watch stays anchored to wrist during all movements
- ✅ No visible floating or clipping through skin
- ✅ Smooth tracking without jitter
- ✅ Full rotation range preserved (side rotations work correctly)
- ✅ Realistic depth perception

### Accessing Configurations Programmatically

```typescript
import { WATCH_REGISTRY } from '@/lib/watches/registry'

// Get specific watch config
const sportWatch = WATCH_REGISTRY['sport-watch-01']

// Use in component
<WatchModel
  watchConfig={sportWatch}
  wristPosition={wristPos}
  handOrientation={handQuat}
/>
```

### Key Differences from V1

| Parameter | V1 | V2 |
|-----------|----|----|
| Wrist Fit Control | Only `positionOffset.y` | `positionOffset.y` + `wristFitBias` |
| Rotation Smoothing | Shared with position (`smoothing`) | Independent (`rotationSmoothing`) |
| Depth Anchoring | Wrist coordinate frame | Palm normal vector |
| Compression Issue | 28-33% rotation loss at smoothing=0.3 | Resolved with independent rotation factor |

### Troubleshooting

**Problem**: Watch appears to "lag" behind hand rotation
- **Cause**: `rotationSmoothing` too low
- **Fix**: Increase to 0.65-0.75

**Problem**: Watch doesn't follow side rotations (wrist twist)
- **Cause**: `rotationSmoothing` < 0.5 (rotation compression)
- **Fix**: Increase to minimum 0.6

**Problem**: Watch jitters during slow movements
- **Cause**: `smoothing` too high (0.4+)
- **Fix**: Decrease to 0.3

**Problem**: Watch "floats" when wrist rotates
- **Cause**: `wristFitBias` not matched to watch thickness
- **Fix**: Increase for bulky watches, decrease for slim watches

**Problem**: Watch appears too large/small compared to catalog image
- **Cause**: Model export scale mismatch
- **Fix**: Adjust `scale` parameter in 0.1 increments

### Performance Notes

- **Smoothing Impact**: Lower smoothing factors (0.15-0.25) add ~1-2ms per frame due to heavier filtering
- **No Impact**: Scale, rotation offset, position offset, wrist fit bias have zero performance cost
- **Recommended for 60 FPS**: `smoothing: 0.3`, `rotationSmoothing: 0.6`
- **Recommended for 30 FPS**: `smoothing: 0.25`, `rotationSmoothing: 0.55`

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| 3D Rendering | React Three Fiber + Three.js |
| Hand Tracking | MediaPipe Hands |
| Language | TypeScript |
| Styling | Tailwind CSS |
| PWA | next-pwa + Workbox |

### Smoothing Architecture (Validated & Optimized)

**Position Smoothing** (Single-layer, 33.8% jitter reduction):
```
Target Position
  ↓
One Euro Filter (adaptive via beta parameter)
  - minCutoff: 1.5
  - beta: 0.01
  - Automatically adapts to velocity
  ↓
Simple Fixed Lerp (smoothing factor: 0.3)
  ↓
Final Position
```

**Rotation Smoothing** (Adaptive based on angular velocity):
```
Target Quaternion
  ↓
AdaptiveQuaternionSmoother
  1. Calculate angular velocity (°/s)
  2. Map to smoothing factor:
     - Slow (< 30°/s): 0.15 (heavy smoothing)
     - Medium (30-90°/s): 0.15-0.45 (interpolated)
     - Fast (> 90°/s): 0.45 (light smoothing)
  3. Slerp with adaptive factor
  ↓
Final Rotation
```

**Why This Works:**
- ✅ One Euro Filter adapts internally (no double-smoothing)
- ✅ Rotation adapts to ROTATION speed (not position velocity)
- ✅ Heavy smoothing eliminates micro-movement jitter
- ✅ Light smoothing preserves responsiveness
- ✅ Data-backed: 33.8% position jitter reduction validated

**Removed:**
- ❌ Velocity-Adaptive Lerp (created feedback loop, added 33.8% MORE jitter)

### Project Structure

```
frontend/
├── app/                        # Next.js pages
│   ├── page.tsx               # Main AR experience
│   ├── coordinate-debug/      # Debug visualization
│   └── 3d-demo/               # R3F demo
├── components/
│   ├── canvas/                # React Three Fiber components
│   │   ├── WatchModel.tsx    # 3D watch renderer
│   │   ├── WristOccluder.tsx # Depth-mask occlusion
│   │   └── Scene.tsx         # Main 3D scene
│   ├── camera/               # Camera and tracking UI
│   │   ├── CameraView.tsx   # Webcam feed
│   │   └── HandLandmarksCanvas.tsx  # Debug overlay
│   └── ui/                   # React UI components
├── hooks/
│   ├── useHandTracking.ts    # MediaPipe integration
│   ├── useCoordinateMapping.ts  # 2D → 3D coordinate transform
│   ├── useDynamicScale.ts    # Automatic sizing
│   └── useWatchConfig.ts     # Watch presets and config
├── lib/
│   ├── mediapipe/           # MediaPipe utilities and types
│   └── three/               # Three.js helpers
│       ├── coordinateMapping.ts
│       ├── motionSmoothing.ts
│       └── quaternions.ts
└── public/
    ├── models/              # GLB 3D watch models
    └── mediapipe/          # WASM assets (auto-generated)
```

### Key Systems

#### 1. Hand Tracking Pipeline

```
Camera Frame → MediaPipe Hands → 21 Landmarks (normalized)
  → Screen Space Coordinates → Three.js World Coordinates
  → One Euro Filter → Quaternion Slerp Smoothing → Watch Position
```

#### 2. Coordinate System (V2)

**Wrist Coordinate System V2** - Anatomically-accurate, stable 3D coordinate frame aligned to the wrist.

**Landmarks Used:**
- Wrist (MediaPipe landmark 0) - origin
- Index MCP (landmark 5) - lateral reference
- **Middle MCP (landmark 9)** - forearm direction reference (NEW in V2)
- Pinky MCP (landmark 17) - lateral reference

**Coordinate Frame:**
- **+Z Axis (Forearm):** Wrist → Middle MCP (forearm/finger direction)
- **+X Axis (Lateral):** Index MCP → Pinky MCP (hand width direction)
- **+Y Axis (Perpendicular):** Cross(Z, X) (right-handed, points into palm)

**Why V2?**

V1 used a computed palm midpoint from Index+Pinky MCPs: `midpoint = (Index + Pinky) / 2`. V2 directly uses the **Middle MCP landmark** instead because:
- Middle finger is anatomically central and most stable
- Single landmark measurement (no midpoint computation noise)
- Avoids error propagation from averaging two landmarks
- Less affected by finger spreading/curling
- More consistent during wrist rotation
- Same axis meanings as V1 = existing watch configurations work unchanged

**Implementation:**
```typescript
import { computeWristQuaternionV2 } from '@/lib/three/coordinateMapping'

// V2 returns a quaternion (avoids gimbal lock)
const orientation = computeWristQuaternionV2(
  wristPos,      // Wrist landmark
  indexPos,      // Index MCP
  middlePos,     // Middle MCP (NEW in V2 - replaces midpoint)
  pinkyPos       // Pinky MCP
)
```

**Algorithm:**
1. Compute Z axis: `normalize(middleMCP - wrist)` - forearm direction (V2 uses single landmark)
2. Compute X axis: `normalize(pinkyMCP - indexMCP)` - stable lateral direction
3. Compute Y axis: `normalize(cross(Z, X))` - right-handed perpendicular
4. **Gram-Schmidt Re-orthogonalization (2 passes):** Removes landmark noise, ensures perfect 90° angles
5. Build rotation matrix from orthonormal basis
6. Extract quaternion (no gimbal lock, smooth interpolation)

**V1 vs V2:**
- V1: Z = wrist → palm midpoint where `midpoint = (Index + Pinky) / 2`
- V2: Z = wrist → middle MCP (direct measurement)
- Result: Same coordinate frame meanings, more stable Z axis, less noise

The system automatically uses V2 by default. To use V1 for comparison:
```typescript
const mappedData = useCoordinateMapping(handDetection, camera, {
  useV2CoordinateSystem: false, // Explicitly use V1 (legacy)
})
```

#### 3. Rendering Pipeline

```
React Component Tree
  → R3F Reconciler
  → Three.js Scene Graph
  → WebGL Renderer
  → Canvas (60 FPS)
```

## Progressive Web App (PWA)

TimeVision is a fully installable PWA. Here's how everything works:

### What is a PWA?

A Progressive Web App is a website that behaves like a native mobile/desktop app. It can be installed to a home screen, works offline (partially), loads instantly from cache, and runs fullscreen without a browser address bar. The browser handles all of this — no app store needed.

### How It Works Under the Hood

#### 1. Web App Manifest (`/public/manifest.json`)

This is a JSON file the browser reads to know how to "install" your site. It tells the browser:
- What to name the app
- What icon to use on the home screen
- What color the splash screen should be
- Whether to run fullscreen (standalone) or in a browser tab
- What URL to open when launched

When a browser detects a manifest + service worker combo, it shows an install prompt automatically.

```json
{
  "name": "TimeVision - Virtual Watch Try-On",
  "short_name": "TimeVision",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#3b82f6",
  "background_color": "#0f172a",
  "icons": [...]
}
```

#### 2. Service Worker (`/public/sw.js`)

This is the core of the PWA. A service worker is a JavaScript file that runs in the background, completely separate from your webpage — it sits between your app and the internet, intercepting every network request.

**How it gets registered:**

```
User visits site
  → Browser downloads sw.js
  → Installs it in the background
  → Service worker activates and starts controlling the page
  → All future requests go through the service worker first
```

**What it does with requests:**

The service worker uses different caching strategies depending on the type of file:

| File Type | Strategy | Explanation |
|-----------|----------|-------------|
| Google Fonts | CacheFirst | Load from cache, only go to network if not cached. Valid for 1 year. |
| Images (PNG, SVG, etc.) | StaleWhileRevalidate | Serve cached version instantly, then update cache in background for next time. Valid 1 day. |
| JavaScript bundles | StaleWhileRevalidate | Same — instant load from cache, update quietly. Valid 1 day. |
| CSS files | StaleWhileRevalidate | Same approach. Valid 1 day. |
| API calls | NetworkFirst | Always try the network first. Fall back to cache if offline. 10s timeout. |
| Everything else | NetworkFirst | Try network, fall back to cache. |

This means: after your first visit, most of the app loads from the local device cache — making it extremely fast even on slow connections.

#### 3. App Icons (`/public/icons/`)

PWAs need icons in many sizes for different devices and contexts:

| Size | Used For |
|------|----------|
| 72x72 | Older Android home screens |
| 96x96 | Chrome app grid |
| 128x128 | Chrome Web Store |
| 144x144 | Windows pinned sites |
| 152x152 | iOS home screen (iPad) |
| 192x192 | Android home screen, PWA install prompt |
| 384x384 | Android splash screen |
| 512x512 | Android splash screen, app store listings |

All icons are generated automatically from a single source SVG (`/public/icon.svg`) using the `sharp` image processing library via `scripts/generate-icons.mjs`.

#### 4. Install Prompt (`/components/ui/InstallPrompt.tsx`)

Browsers fire a `beforeinstallprompt` event when they decide the site is installable. By default the browser handles this itself, but we intercept it so we can show our own custom prompt at the right moment.

```
Browser fires beforeinstallprompt
  → We call e.preventDefault() to suppress the default prompt
  → We store the event object
  → After 3 seconds, we show our custom UI
  → User clicks "Install"
  → We call deferredPrompt.prompt() — this shows the real OS-level install dialog
  → User confirms
  → App is installed
```

If the user dismisses, we store a timestamp and won't bother them again for 7 days.

#### 5. Offline Page (`/app/offline/page.tsx`)

When the user is offline and tries to visit a page that isn't in the cache, the service worker serves this fallback page instead of a blank/error screen. It tells the user they're offline and gives them options to retry.

#### 6. next-pwa Plugin (`next.config.ts`)

`next-pwa` is a plugin for Next.js that automatically generates the service worker file at build time. You configure caching rules in `next.config.ts`, and it compiles them into the final `sw.js` using Google's Workbox library under the hood.

**Why `--webpack` flag?** Next.js 16 defaults to Turbopack as the bundler, but `next-pwa` injects webpack plugins to build the service worker. Turbopack doesn't support webpack plugins yet, so we use `--webpack` to use the classic bundler for production builds.

### File Structure

```
public/
├── manifest.json           # PWA manifest
├── icon.svg                # Source icon (master design)
├── icons/                  # Generated icons (all sizes)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── sw.js                   # Generated service worker (build output, gitignored)
└── workbox-*.js            # Workbox runtime (build output, gitignored)

components/ui/
└── InstallPrompt.tsx       # Custom install prompt UI

app/
└── offline/page.tsx        # Offline fallback page

scripts/
└── generate-icons.mjs      # Icon generation from SVG

types/
└── next-pwa.d.ts           # TypeScript types for next-pwa
```

### What Works Offline

After the first visit, the service worker caches static assets:

| Feature | Offline Status |
|---------|---------------|
| Landing page (`/`) | Cached — works offline |
| Watch catalog (`/watches`) | Cached — but no product images |
| Navigation between pages | Works for previously visited pages |
| Camera access | Works (native device API) |
| AR hand tracking | Requires internet (MediaPipe WASM files are large) |
| 3D watch models | Requires internet (GLB files not pre-cached) |

### Installing the App

**Desktop (Chrome/Edge):**
1. Visit the site
2. Look for the install icon in the address bar, or use the custom install prompt
3. Click Install
4. App opens in its own window without browser UI

**Mobile (Android):**
1. Visit the site in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home Screen"
4. Or use the custom install prompt when it appears

**Mobile (iOS):**
1. Visit in Safari
2. Tap the Share icon
3. Tap "Add to Home Screen"

> Note: iOS Safari has more limited PWA support — no `beforeinstallprompt` event, so the custom install prompt won't appear. Users must use the manual share flow.

### Regenerating Icons

If you update the app icon, regenerate all sizes:

```bash
node scripts/generate-icons.mjs
```

This reads `/public/icon.svg` and outputs all 8 PNG sizes to `/public/icons/`.

## Development

### Available Scripts

```bash
# Development server
pnpm run dev
# Production build (with PWA service worker)
pnpm run build -- --webpack

# Start production server
pnpm run start

# Lint code
pnpm run lint

# Manually sync MediaPipe assets
pnpm run sync:mediapipe

# Regenerate PWA icons
node scripts/generate-icons.mjs
```

### Adding a New Watch Model

1. Export your watch model as GLB format (recommended: Blender)
2. Place the file in `public/models/`
3. Load it in your component:

```typescript
import { WatchModel } from '@/components/canvas/WatchModel'

<WatchModel
  modelPath="/models/your-watch.glb"
  scale={2.0}
  wristPosition={wristPosition}
  handOrientation={handOrientation}
/>
```

### Performance Optimization

- **Motion Smoothing**: Adjust `smoothing` prop (0.15-0.35) in watch config
- **Dynamic Scaling**: Toggle via UI or disable for fixed-size watches
- **Shadow Quality**: Modify shadow map resolution in lighting setup
- **Model LOD**: Use simplified geometry for mobile devices

## Browser Compatibility

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Firefox | ✅ | ⚠️ (MediaPipe performance) |
| Edge | ✅ | ✅ |

**Requirements:**
- WebGL 2.0 support
- Camera access permission
- WASM support (for MediaPipe)

## Technical Documentation

For in-depth technical details, see:

- **[WATCH_MODEL_PIPELINE.md](./WATCH_MODEL_PIPELINE.md)** - Model loading and optimization
- **[COORDINATE_MAPPING.md](./COORDINATE_MAPPING.md)** - Coordinate transformation system
- **[MEDIAPIPE_INTEGRATION.md](./MEDIAPIPE_INTEGRATION.md)** - Hand tracking integration
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - React Three Fiber architecture

## Performance Metrics

- **FPS**: 30-60 FPS (device-dependent)
- **Latency**: ~33ms (hand detection to render)
- **Jitter Reduction**: 98% with motion smoothing enabled
- **Memory**: ~150MB typical usage

## Troubleshooting

### MediaPipe initialization fails

**Issue**: `Failed to read file ...palm_detection_full.tflite`

**Solution**: Run `pnpm run sync:mediapipe` to copy WASM assets to public directory.

### Watch appears disconnected from wrist

**Solution**: Adjust `positionOffset.y` in watch config to push watch into wrist surface.

### Jittery tracking

**Solution**: Increase `smoothing` value (0.3-0.4) in watch preset configuration.

### Poor performance on mobile

**Solution**: 
- Disable shadows in Scene component
- Reduce model polygon count
- Lower camera resolution

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex algorithms
- Run `pnpm run lint` before committing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **MediaPipe** - Google's hand tracking solution
- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F

## Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Docs](https://threejs.org/docs/)
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Built with ❤️ using Next.js and React Three Fiber**
