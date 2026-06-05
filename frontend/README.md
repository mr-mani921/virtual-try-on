# AR Virtual Watch Try-On System

A browser-based augmented reality application that enables users to virtually try on watches using real-time hand tracking and 3D rendering.

## Overview

This project leverages computer vision and WebGL to create an immersive watch try-on experience directly in the browser. Users can see how different watches look on their wrist in real-time using their device's camera.

Built with **Next.js**, **React Three Fiber**, **Three.js**, and **MediaPipe Hands**.

## Features

### Core Capabilities

- **Real-Time Hand Tracking** - Detects and tracks 21 hand landmarks at 30+ FPS using MediaPipe
- **3D Watch Rendering** - PBR (Physically-Based Rendering) materials with realistic lighting and reflections
- **Automatic Calibration** - Dynamic sizing based on hand dimensions and camera distance
- **Wrist Occlusion** - Depth-buffer masking creates realistic strap wrap-around effect
- **Motion Smoothing** - One Euro Filter and quaternion slerp for stable, jitter-free tracking
- **Responsive Design** - Works on desktop and mobile (iOS Safari, Android Chrome)

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

Navigate to the root page (`/`) to access the full AR try-on experience:

1. Grant camera permissions when prompted
2. Position your hand in view with palm facing the camera
3. The watch will automatically attach to your wrist
4. Rotate your hand to view from different angles
5. Use the controls panel to adjust watch style and fit

### Debug Pages

- `/coordinate-debug` - Split-view visualization of tracking and 3D mapping
- `/3d-demo` - React Three Fiber interactive demo
- `/camera-test` - Camera integration testing

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

#### 2. Coordinate System

The wrist coordinate frame:
- **+X** - Lateral (index knuckle → pinky knuckle)
- **+Y** - Into palm (wrist depth axis)
- **+Z** - Along forearm (wrist → fingers)

#### 3. Rendering Pipeline

```
React Component Tree
  → R3F Reconciler
  → Three.js Scene Graph
  → WebGL Renderer
  → Canvas (60 FPS)
```

## Development

### Available Scripts

```bash
# Development server
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm run start

# Lint code
pnpm run lint

# Manually sync MediaPipe assets
pnpm run sync:mediapipe
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
