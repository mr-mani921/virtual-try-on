# Camera Setup Guide - TimeVision WebView

## Overview

This guide explains how camera access works in the WebView wrapper and how to troubleshoot camera issues.

---

## How Camera Access Works

### The Flow

```
1. App launches
   ↓
2. Native checks camera permission status
   ↓
3. WebView loads your web app
   ↓
4. Web app calls navigator.mediaDevices.getUserMedia()
   ↓
5. Native intercepts the call
   ↓
6. Native requests camera permission (if not granted)
   ↓
7. Permission granted → getUserMedia succeeds
   ↓
8. Camera stream flows to web app
```

### Technical Implementation

**1. Native Permissions (app.json)**
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Camera access for AR"
    }
  },
  "android": {
    "permissions": ["CAMERA"]
  }
}
```

**2. WebView Configuration**
```typescript
<WebView
  mediaCapturePermissionGrantType="grant"  // Auto-grant to web content
  allowsInlineMediaPlayback={true}          // Enable inline camera
  mediaPlaybackRequiresUserAction={false}   // Don't require tap to start
/>
```

**3. JavaScript Bridge**
The injected JavaScript intercepts `getUserMedia()` and communicates with native:
- Web calls getUserMedia → Native gets notified
- Native requests permission → Sends result back
- getUserMedia proceeds with actual camera access

---

## Permission States

| State | Meaning | Action |
|-------|---------|--------|
| `undetermined` | Never asked | Will prompt on first camera use |
| `granted` | Allowed | Camera works ✅ |
| `denied` | User declined | Show "Open Settings" button |
| `restricted` | iOS parental controls | Cannot grant (rare) |

---

## Troubleshooting

### Camera Not Working - Checklist

#### 1. **Check URL is HTTPS** ⚠️ MOST COMMON ISSUE

**Problem:** `getUserMedia()` requires secure context (HTTPS) on both iOS and Android.

**Fix:**
```typescript
// ❌ Won't work in production
const WEBAPP_URL = 'http://your-app.com';

// ✅ Works
const WEBAPP_URL = 'https://your-app.com';
```

**Local development workarounds:**
- Android emulator: `http://10.0.2.2:3000` (secure context exception)
- iOS simulator: `http://localhost:3000` (secure context exception)
- Physical device: Use ngrok/localtunnel for HTTPS tunnel

#### 2. **Check Native Permission Status**

Run the app and check logs:
```bash
# Android
adb logcat | grep "Camera"

# iOS
# Open Xcode → Window → Devices and Simulators → Console
```

Look for:
- `Camera permission not yet requested` - OK
- `Camera permission granted` - ✅
- `Camera permission denied` - Need to enable in settings

#### 3. **Verify WebView Configuration**

Check these props are set:
- `mediaCapturePermissionGrantType="grant"` ✅
- `allowsInlineMediaPlayback={true}` ✅
- `javaScriptEnabled={true}` ✅

#### 4. **Test in Mobile Browser First**

Before debugging the WebView:
1. Open your web app URL in Chrome (Android) or Safari (iOS)
2. Try the camera feature
3. If it works in browser but not WebView → WebView config issue
4. If it doesn't work in browser → Web app issue (HTTPS, getUserMedia code)

#### 5. **Check for getUserMedia Errors**

Open Chrome DevTools for WebView:
```bash
# Android only
chrome://inspect
```

Look for errors:
- `NotAllowedError` → Permission denied
- `NotFoundError` → No camera on device
- `NotSupportedError` → Browser/WebView doesn't support getUserMedia
- `SecurityError` → Not HTTPS

---

## Common Errors & Solutions

### Error: "NotAllowedError: Permission denied"

**Cause:** Camera permission not granted at native level

**Fix:**
1. Check native permission status:
```typescript
const { status } = await Camera.getCameraPermissionsAsync();
console.log('Permission status:', status);
```

2. Request permission:
```typescript
await Camera.requestCameraPermissionsAsync();
```

3. If still denied, user must enable in Settings → App → Permissions

---

### Error: "NotSupportedError: mediaDevices not available"

**Cause:** Not HTTPS (most likely) or very old WebView version

**Fix:**
1. Ensure URL is HTTPS
2. Check `getUserMedia` availability:
```javascript
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('getUserMedia not supported');
}
```

---

### Error: Camera works in browser but not WebView

**Cause:** WebView missing configuration flags

**Fix:** Add to WebView component:
```typescript
// Android specific
allowFileAccessFromFileURLs={true}
allowUniversalAccessFromFileURLs={true}
androidHardwareAccelerationDisabled={false}

// iOS specific
allowsInlineMediaPlayback={true}
mediaPlaybackRequiresUserAction={false}
```

---

### Camera Preview is Black/Frozen

**Causes:**
1. Wrong video constraints
2. WebView hardware acceleration disabled
3. CSS covering the video element

**Fix:**
1. Check video constraints:
```javascript
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'user',  // or 'environment' for back camera
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
})
```

2. Enable hardware acceleration (Android):
```typescript
androidHardwareAccelerationDisabled={false}
```

3. Check CSS:
```css
video {
  transform: scaleX(-1);  /* Mirror for front camera */
  width: 100%;
  height: 100%;
}
```

---

## Testing Camera Access

### Test Script (Inject in WebView)

```javascript
async function testCamera() {
  try {
    console.log('Testing camera...');
    
    // Check API availability
    if (!navigator.mediaDevices) {
      console.error('navigator.mediaDevices not available');
      return;
    }
    
    // Request camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });
    
    console.log('Camera access granted!');
    console.log('Stream:', stream);
    console.log('Video tracks:', stream.getVideoTracks());
    
    // Test: show in video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    document.body.appendChild(video);
    
  } catch (error) {
    console.error('Camera error:', error.name, error.message);
  }
}

testCamera();
```

Run this in Chrome DevTools console (`chrome://inspect`) to test camera access.

---

## Platform-Specific Notes

### iOS

**Requirements:**
- `NSCameraUsageDescription` in Info.plist (added via app.json)
- HTTPS URL (or localhost exception)
- `allowsInlineMediaPlayback={true}` for video

**Quirks:**
- First permission request shows native iOS dialog
- If denied, must go to Settings → Privacy → Camera
- Simulator has no camera (test on real device)

**Testing:**
```bash
# Build and run on iOS simulator
npm run ios

# Note: Simulator has no camera - will get NotFoundError
# Test on real device via Expo Go or TestFlight
```

### Android

**Requirements:**
- `CAMERA` permission in AndroidManifest.xml (added via app.json)
- HTTPS URL (or 10.0.2.2 exception for emulator)
- `mediaCapturePermissionGrantType="grant"` in WebView

**Quirks:**
- Permission request shows Android system dialog
- If denied, must go to Settings → Apps → Permissions
- Emulator has virtual camera

**Testing:**
```bash
# Build and run on Android emulator
npm run android

# Check permissions
adb shell dumpsys package com.timevision.ar | grep CAMERA
```

---

## Debugging Tools

### 1. Chrome DevTools (Android WebView)

```bash
# Enable USB debugging on Android device
# Connect via USB
# Open Chrome on computer

chrome://inspect

# Click "inspect" under your WebView
# Now you can see console logs, errors, network requests
```

### 2. Safari Web Inspector (iOS WebView)

```
1. Enable Web Inspector on iOS:
   Settings → Safari → Advanced → Web Inspector

2. Connect device to Mac

3. Open Safari on Mac → Develop → [Device Name] → [App Name]

4. Web Inspector opens with console, network, etc.
```

### 3. React Native Logs

```bash
# View all logs
npx react-native log-android  # Android
npx react-native log-ios      # iOS

# Filter for camera logs
adb logcat | grep -i camera   # Android
```

---

## Best Practices

### 1. Request Permission Early
```typescript
useEffect(() => {
  // Check/request permission on app mount
  checkCameraPermission();
}, []);
```

### 2. Show Clear Permission Prompt
```typescript
if (!cameraPermission) {
  return <PermissionPromptScreen />;
}
```

### 3. Handle Denial Gracefully
```typescript
if (permissionDenied) {
  Alert.alert(
    'Camera Access Needed',
    'Please enable camera in Settings',
    [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
  );
}
```

### 4. Provide Fallback
```typescript
// Allow browsing catalog without camera
// Only require camera for try-on feature
```

---

## Production Checklist

Before deploying:

- [ ] Web app deployed on HTTPS
- [ ] Native camera permissions configured (app.json)
- [ ] WebView props correctly set
- [ ] Permission prompts tested on real devices
- [ ] Camera denial handled gracefully
- [ ] Tested on iOS physical device
- [ ] Tested on Android physical device
- [ ] Chrome DevTools debugging verified (Android)
- [ ] Safari Web Inspector verified (iOS)

---

## Support Resources

- **React Native WebView**: https://github.com/react-native-webview/react-native-webview
- **Expo Camera**: https://docs.expo.dev/versions/latest/sdk/camera/
- **getUserMedia API**: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- **WebRTC Troubleshooting**: https://webrtc.github.io/samples/

---

**Questions?** Check the main README.md or QUICKSTART.md for general setup issues.
