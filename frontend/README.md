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

### Position Smoothing Experiment (Ticket 41b)

The `/coordinate-debug` page now includes a **Smoothing Debug Panel** for comparing position stabilization strategies:

**Features:**
- Toggle between **One Euro Filter only** vs **One Euro + Adaptive Lerp**
- Real-time variance metrics (current, average, std dev, max)
- Velocity and adaptive alpha tracking
- Recording sessions with data export
- Automatic comparison between smoothing strategies

**How to use:**
1. Navigate to `/coordinate-debug`
2. Show your hand to start tracking
3. Use the **Smoothing Debug Panel** (top-right) to:
   - Toggle smoothing modes
   - Start/stop recording sessions
   - Compare recorded data
   - Export results as JSON

**Metrics Explained:**
- **Position Variance**: Frame-to-frame position change (mm)
- **Velocity**: Speed of hand movement (units/second)
- **Adaptive Alpha**: Smoothing factor (0.15-0.6, higher = more responsive)
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
