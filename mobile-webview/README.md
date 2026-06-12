# TimeVision Mobile - WebView Wrapper

A React Native wrapper app that loads the TimeVision web application in a WebView with native camera permissions.

## Overview

This is a **wrapper app only** — all AR logic, hand tracking, and 3D rendering happens in the web application. This mobile app simply provides:
- Native camera permissions (iOS + Android)
- Fullscreen WebView experience
- Splash screen and loading states
- Error handling for network issues

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- For iOS: Xcode (macOS only)
- For Android: Android Studio

### Installation

```bash
npm install
```

### Configuration

**Update the web app URL:**

Edit `src/screens/WebViewScreen.tsx` and change the URL:

```typescript
const WEBAPP_URL = 'https://virtualtryonwatches.netlify.app';
```

For local development:
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://YOUR_COMPUTER_IP:3000`

## Running the App

### Development Mode

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web (for testing)
npm run web
```

### Using Expo Go (Quick Testing)

1. Install Expo Go on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run `npm start`
3. Scan the QR code with your phone

**Note:** Camera permissions work in Expo Go, but for best results use a development build.

### Building Standalone Apps

#### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

#### iOS IPA (requires macOS + Apple Developer account)

```bash
# Build for iOS
eas build --platform ios --profile preview
```

## Permissions

### Android

Permissions are configured in `app.json`:
- `CAMERA` - Camera access for AR
- `INTERNET` - Load web application
- `ACCESS_NETWORK_STATE` - Check connectivity

These are automatically added to `AndroidManifest.xml` during build.

### iOS

Camera permission is configured in `app.json` → `ios.infoPlist`:
- `NSCameraUsageDescription` - Explains why camera access is needed

This is automatically added to `Info.plist` during build.

## Project Structure

```
mobile-webview/
├── src/
│   └── screens/
│       └── WebViewScreen.tsx    # Main WebView component
├── assets/                      # App icons and splash
├── App.tsx                      # Root component
├── app.json                     # Expo configuration
└── package.json
```

## Features

### WebView Configuration

- **Camera Access**: Automatically grants camera permission to web content
- **JavaScript Enabled**: Required for AR functionality
- **Local Storage**: Enabled for web app data persistence
- **Inline Media**: Allows video/camera inline (not fullscreen)

### Error Handling

- Network connection errors → Shows retry dialog
- HTTP errors → Shows error message
- Loading states → Shows branded loading indicator

### Communication

The app can communicate with the web app via:
- `window.ReactNativeWebView.postMessage()` (web → native)
- `webView.postMessage()` (native → web)
- Injected JavaScript on page load

## Troubleshooting

### Camera Not Working

**Web App URL must be HTTPS in production.** Most browsers/WebViews require secure context for camera access.

For local testing:
- Use `adb reverse` on Android: `adb reverse tcp:3000 tcp:3000`
- Use your computer's IP on iOS: `http://192.168.x.x:3000`

### "Unable to Load" Error

1. Check that web app is running and accessible
2. Test URL in phone browser first
3. Check firewall settings for local development
4. Ensure WEBAPP_URL is correct in `WebViewScreen.tsx`

### Splash Screen Not Showing

Run `npx expo prebuild` to regenerate native files, then build again.

### Android Build Fails

Make sure Android SDK is installed:
```bash
# Check Android SDK
echo $ANDROID_HOME  # Should point to SDK location

# Install required SDK components
sdkmanager "platforms;android-34" "build-tools;34.0.0"
```

## Development Tips

### Testing Camera Locally

1. Start your Next.js web app: `npm run dev` (in web app directory)
2. Get your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update `WEBAPP_URL` to `http://YOUR_IP:3000`
4. Make sure your phone is on the same WiFi network
5. Run `npm start` and launch on device

### Debugging

**View console logs:**
```bash
# Android
adb logcat | grep ReactNativeJS

# iOS (in Xcode)
# Open Xcode → Window → Devices and Simulators → Select device → Console
```

**Debug WebView content:**
- Android: Chrome DevTools → `chrome://inspect`
- iOS: Safari → Develop → [Device Name] → [App Name]

## Building for Production

### Android

1. Generate signing key:
```bash
keytool -genkeypair -v -keystore timevision.keystore -alias timevision -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

3. Build:
```bash
eas build --platform android --profile production
```

### iOS

1. Enroll in Apple Developer Program ($99/year)
2. Configure bundle ID in `app.json`
3. Build:
```bash
eas build --platform ios --profile production
```

## App Store Submission

### Google Play Store

1. Create app in Play Console
2. Upload APK/AAB from EAS build
3. Complete store listing (description, screenshots, etc.)
4. Submit for review

### Apple App Store

1. Create app in App Store Connect
2. Upload IPA from EAS build
3. Complete store listing
4. Submit for review

**Important:** Both stores require:
- Privacy policy URL (for camera usage)
- App icon (1024x1024)
- Screenshots (various sizes)
- Detailed description

## Limitations

As a WebView wrapper, this app has some limitations:

- **Performance**: Not as fast as native AR
- **Battery**: WebView uses more battery than native
- **Offline**: No offline capability (web app needs internet)
- **Size**: Larger app size due to WebView overhead

For production use at scale, consider the full native implementation architecture described in the monorepo plan.

## Next Steps

To convert to a full native app (better performance):
1. Follow the monorepo architecture plan
2. Extract AR math to shared packages
3. Implement native camera with Vision Camera
4. Use React Three Fiber Native for 3D rendering
5. Use MediaPipe Native for hand tracking

## License

Same as parent TimeVision project.

## Support

For issues specific to the mobile wrapper, check:
- Expo documentation: https://docs.expo.dev/
- React Native WebView: https://github.com/react-native-webview/react-native-webview

For AR functionality issues, check the main web app.
