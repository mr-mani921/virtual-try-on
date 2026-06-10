# Deployment Checklist - TimeVision Mobile

## Pre-Deployment

### 1. Web App Configuration
- [ ] Web app deployed to production (HTTPS required)
- [ ] Web app URL updated in `src/screens/WebViewScreen.tsx`
- [ ] Camera permissions work on production URL (test in mobile browser)
- [ ] CORS configured if needed (should not be needed for WebView)

### 2. App Configuration
- [ ] App name updated in `app.json` → `expo.name`
- [ ] Bundle ID updated in `app.json`:
  - iOS: `expo.ios.bundleIdentifier`
  - Android: `expo.android.package`
- [ ] App version updated in `app.json` → `expo.version`
- [ ] Splash screen image created (`assets/splash.png`, 1242x2436)
- [ ] App icon created (`assets/icon.png`, 1024x1024)
- [ ] Adaptive icon created for Android (`assets/adaptive-icon.png`, 1024x1024)

### 3. Permission Messages
- [ ] Camera permission message clear and accurate (`app.json` → `ios.infoPlist.NSCameraUsageDescription`)
- [ ] Permission messages comply with App Store / Play Store guidelines

### 4. Testing
- [ ] Tested on physical Android device
- [ ] Tested on physical iOS device (if targeting iOS)
- [ ] Camera access works correctly
- [ ] Loading states work
- [ ] Error handling tested (airplane mode, bad URL, etc.)
- [ ] Performance acceptable (WebView performance varies)

---

## Android Deployment

### Google Play Store Requirements

1. **Create signing key:**
```bash
keytool -genkeypair -v \
  -keystore timevision.keystore \
  -alias timevision \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

2. **Required assets:**
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone, 7-inch tablet, 10-inch tablet)
- [ ] App icon (512x512, PNG, 32-bit with alpha)
- [ ] Privacy policy URL

3. **Build APK/AAB:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
eas build --platform android --profile production
```

4. **Play Store listing:**
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] App category
- [ ] Content rating questionnaire
- [ ] Privacy policy
- [ ] Contact email

5. **Submit:**
- [ ] Upload APK/AAB to Play Console
- [ ] Fill out store listing
- [ ] Set pricing & distribution
- [ ] Submit for review (1-7 days)

---

## iOS Deployment

### App Store Requirements

**Prerequisites:**
- [ ] Apple Developer account ($99/year)
- [ ] macOS with Xcode installed

1. **Create App Store listing:**
- [ ] Create app in App Store Connect
- [ ] Configure bundle ID (must match `app.json`)
- [ ] Add app name, subtitle, description
- [ ] Upload screenshots (required sizes for iPhone/iPad)
- [ ] Upload app icon (1024x1024)

2. **Required assets:**
- [ ] App preview video (optional but recommended)
- [ ] Screenshots for all device sizes
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)

3. **Build IPA:**
```bash
# Build for App Store
eas build --platform ios --profile production
```

4. **Submit for review:**
- [ ] Upload IPA to App Store Connect
- [ ] Complete app information
- [ ] Add export compliance information
- [ ] Submit for review (1-7 days)

---

## Post-Deployment

### Monitoring
- [ ] Set up crash reporting (Sentry, Bugsnag, etc.)
- [ ] Set up analytics (Firebase, Amplitude, etc.)
- [ ] Monitor app reviews (respond within 24-48 hours)
- [ ] Monitor error rates

### Updates
- [ ] Plan update schedule
- [ ] Version control strategy (semantic versioning)
- [ ] Release notes template
- [ ] User communication plan for breaking changes

---

## Common Rejections & How to Avoid

### Android (Google Play)

1. **Privacy Policy Issues**
   - Must have a working privacy policy URL
   - Must disclose camera usage
   - Must explain data collection

2. **Permissions**
   - Only request necessary permissions
   - Explain why each permission is needed

3. **Misleading Content**
   - Screenshots must reflect actual app
   - Description must be accurate

### iOS (App Store)

1. **Metadata Rejection**
   - Screenshots can't show other platforms
   - No promotional text in screenshots
   - Icon must be unique (not generic watch icon)

2. **Performance Issues**
   - App must not crash
   - Must work on all supported devices
   - Loading times must be reasonable

3. **Privacy**
   - Camera usage must be clearly explained
   - Privacy policy must be accessible
   - Data collection must be disclosed

4. **Minimum Functionality**
   - App must offer substantial functionality
   - Can't just be a web wrapper with no value-add
   - **Note:** Pure WebView apps are sometimes rejected. To mitigate:
     - Add native features (push notifications, offline mode, etc.)
     - Provide clear value proposition
     - Explain why web wrapper is necessary

---

## Version Update Checklist

When releasing updates:

1. **Code changes:**
   - [ ] Update `expo.version` in `app.json`
   - [ ] Update `expo.ios.buildNumber` (integer, must increment)
   - [ ] Update `expo.android.versionCode` (integer, must increment)

2. **Testing:**
   - [ ] Test new features
   - [ ] Regression test existing features
   - [ ] Test on multiple devices/OS versions

3. **Release notes:**
   - [ ] Write user-facing changelog
   - [ ] Update in Play Store / App Store
   - [ ] Notify users if major changes

4. **Build & submit:**
   ```bash
   # Build both platforms
   eas build --platform all --profile production
   ```

---

## Emergency Rollback

If a critical bug is discovered post-release:

### Android
- Upload previous APK/AAB version
- Can take a few hours to propagate

### iOS
- Remove app from sale (immediate)
- Submit new build with fix
- Re-enable after approval (1-2 days)

### Web App
- If bug is in web app (not mobile wrapper):
  - Fix and redeploy web app immediately
  - Mobile app automatically gets fix (it's a WebView!)
  - No app store resubmission needed ✅

---

## Support Resources

- **Expo EAS Build**: https://docs.expo.dev/build/introduction/
- **Google Play Console**: https://play.google.com/console
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Review Guidelines**:
  - Android: https://play.google.com/about/developer-content-policy/
  - iOS: https://developer.apple.com/app-store/review/guidelines/

---

**Good luck with your launch! 🚀**
