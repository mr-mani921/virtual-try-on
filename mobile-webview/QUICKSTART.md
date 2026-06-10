# Quick Start Guide - TimeVision Mobile WebView

## 🚀 Get Running in 5 Minutes

### Step 1: Update the Web App URL

Edit `src/screens/WebViewScreen.tsx` line 17:

```typescript
const WEBAPP_URL = 'https://your-deployed-timevision-url.com';
```

**For local testing:**
- Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac)
- Use: `http://YOUR_IP:3000`
- Make sure your phone is on the same WiFi

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start Expo

```bash
npm start
```

A QR code will appear in your terminal.

### Step 4: Test on Your Phone

**Option A: Use Expo Go (Easiest)**
1. Install Expo Go app from App Store / Play Store
2. Scan the QR code from Step 3
3. App opens with camera permissions

**Option B: Run on Emulator**
```bash
# Android
npm run android

# iOS (Mac only)
npm run ios
```

---

## 📱 Camera Permissions

The app will automatically request camera permissions when the web app needs it.

### Android
- Permission request appears automatically
- If denied, user can enable in Settings → Apps → TimeVision → Permissions

### iOS
- Permission request appears automatically
- If denied, user can enable in Settings → TimeVision → Camera

---

## 🏗️ Building for Distribution

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
npm run build:android
```

Wait 5-10 minutes. You'll get a download link for the APK.

### iOS IPA (Mac only)

```bash
npm run build:ios
```

Requires Apple Developer account ($99/year).

---

## 🐛 Troubleshooting

### "Cannot connect" error
- ✅ Check web app is running: `curl http://YOUR_URL`
- ✅ Check firewall allows connections
- ✅ Try opening URL in phone's browser first

### Camera not working in WebView
- ✅ URL must be HTTPS in production (not http://)
- ✅ Check permissions granted in phone settings
- ✅ Test in phone's browser first (Chrome/Safari)

### App crashes on launch
- ✅ Run `npm start --clear` to clear cache
- ✅ Delete `node_modules` and `npm install` again
- ✅ Check `expo-doctor` output: `npx expo-doctor`

---

## 📦 What's Included

```
mobile-webview/
├── src/screens/WebViewScreen.tsx   # Main WebView (camera, loading, errors)
├── App.tsx                         # Root component
├── app.json                        # Expo config (permissions, icons)
└── README.md                       # Full documentation
```

---

## 🎯 Next Steps

1. **Customize splash screen**: Replace `assets/splash.png`
2. **Customize app icon**: Replace `assets/icon.png`
3. **Change app name**: Update `app.json` → `expo.name`
4. **Deploy web app**: Host on Vercel/Netlify, update WEBAPP_URL
5. **Build APK/IPA**: Follow "Building for Distribution" above

---

## 💡 Tips

- **Local dev**: Use your computer's IP, not localhost
- **Debugging**: `adb logcat | grep ReactNativeJS` (Android)
- **Chrome DevTools**: `chrome://inspect` to debug WebView (Android)
- **Performance**: WebView is slower than native — this is a wrapper for MVP

---

## 🆘 Need Help?

- Expo docs: https://docs.expo.dev/
- WebView docs: https://github.com/react-native-webview/react-native-webview
- Expo Discord: https://chat.expo.dev/

---

**That's it! Your TimeVision web app is now running in a native mobile wrapper with camera access.**
