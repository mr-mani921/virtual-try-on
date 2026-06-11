import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import { Camera } from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const WEBAPP_URL = 'https://virtualtryonwatches.netlify.app';

// Performance optimization: Cache WebView instance
let webViewInstance: any = null;

export default function WebViewScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Lock orientation to portrait for consistent AR experience
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        
        // Check camera permission status on mount
        await checkCameraPermission();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    prepare();

    // Cleanup: unlock orientation on unmount
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
      
      if (status === 'undetermined') {
        console.log('Camera permission not yet requested');
      } else if (status === 'denied') {
        console.log('Camera permission denied');
        setShowPermissionPrompt(true);
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      setCameraPermission(granted);
      
      if (granted) {
        setShowPermissionPrompt(false);
        // Reload WebView to trigger getUserMedia again
        webViewRef.current?.reload();
      } else {
        setShowPermissionPrompt(true);
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const openAppSettings = () => {
    Linking.openSettings();
  };

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
    setHasError(true);
    setErrorMessage(nativeEvent.description || 'Failed to load the application');
    setIsLoading(false);

    Alert.alert(
      'Connection Error',
      'Failed to load TimeVision. Please check your internet connection and try again.',
      [
        {
          text: 'Retry',
          onPress: () => {
            setHasError(false);
            webViewRef.current?.reload();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleHttpError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('HTTP error: ', nativeEvent.statusCode);
    
    if (nativeEvent.statusCode >= 400) {
      Alert.alert(
        'Server Error',
        `Server returned error: ${nativeEvent.statusCode}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Enhanced injected JavaScript for camera access and performance
  const injectedJavaScript = `
    (function() {
      // Performance monitoring
      let frameCount = 0;
      let lastFrameTime = Date.now();
      
      // Notify that we're in native app
      window.isNativeApp = true;
      window.isWebViewWithCameraAccess = true;
      window.isPerformanceOptimized = true;
      
      // Disable context menu for better touch performance
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      
      // Prevent text selection for smoother interactions
      document.addEventListener('selectstart', (e) => e.preventDefault());
      
      // Override getUserMedia to handle permission requests
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        console.log('getUserMedia called with constraints:', constraints);
        
        try {
          // Request permission from native layer first
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'REQUEST_CAMERA_PERMISSION',
            constraints: constraints
          }));
          
          // Wait for native permission
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Call original getUserMedia
          const stream = await originalGetUserMedia(constraints);
          
          console.log('getUserMedia success, stream:', stream);
          
          // Monitor frame rate
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            console.log('Camera settings:', settings);
            
            // Start FPS monitoring
            startFPSMonitoring(stream);
          }
          
          // Notify native that camera is active
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CAMERA_STARTED',
            streamId: stream.id,
            settings: videoTrack ? videoTrack.getSettings() : {}
          }));
          
          return stream;
          
        } catch (error) {
          console.error('getUserMedia error:', error);
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CAMERA_ERROR',
            error: error.message || error.toString()
          }));
          
          throw error;
        }
      };
      
      // FPS monitoring for camera stream
      function startFPSMonitoring(stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        setInterval(() => {
          frameCount++;
          const now = Date.now();
          const elapsed = now - lastFrameTime;
          
          if (elapsed >= 1000) {
            const fps = Math.round((frameCount * 1000) / elapsed);
            frameCount = 0;
            lastFrameTime = now;
            
            // Report FPS to native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FPS_UPDATE',
              fps: fps
            }));
          }
        }, 100);
      }
      
      // Performance optimization: RequestAnimationFrame polyfill
      if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (callback) => {
          return setTimeout(callback, 1000 / 60);
        };
      }
      
      // Memory optimization: Clear console logs periodically
      let logBuffer = [];
      const maxLogSize = 100;
      
      const originalLog = console.log;
      console.log = function(...args) {
        originalLog.apply(console, args);
        logBuffer.push(args.join(' '));
        if (logBuffer.length > maxLogSize) {
          logBuffer = logBuffer.slice(-maxLogSize);
        }
      };
      
      const originalError = console.error;
      console.error = function(...args) {
        originalError.apply(console, args);
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CONSOLE_ERROR',
            message: args.join(' ')
          }));
        } catch (e) {}
      };
      
      // Performance hint: Notify when page is interactive
      if (document.readyState === 'complete') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PAGE_INTERACTIVE',
          url: window.location.href
        }));
      } else {
        window.addEventListener('load', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAGE_INTERACTIVE',
            url: window.location.href
          }));
        });
      }
      
      // Notify page loaded
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PAGE_LOADED',
        url: window.location.href,
        userAgent: navigator.userAgent
      }));
      
    })();
    true; // Required for iOS
  `;

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'PAGE_LOADED':
          console.log('✅ Web app loaded:', data.url);
          break;
          
        case 'PAGE_INTERACTIVE':
          console.log('✅ Page interactive');
          break;
          
        case 'REQUEST_CAMERA_PERMISSION':
          console.log('📷 Requesting camera permission');
          const granted = await requestCameraPermission();
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'CAMERA_PERMISSION_RESULT', 
              granted: ${granted} 
            }, '*');
          `);
          break;
          
        case 'CAMERA_STARTED':
          console.log('✅ Camera started:', data.settings);
          break;
          
        case 'FPS_UPDATE':
          console.log(`📊 FPS: ${data.fps}`);
          break;
          
        case 'CAMERA_ERROR':
          console.error('❌ Camera error:', data.error);
          
          if (data.error.includes('Permission') || data.error.includes('NotAllowedError')) {
            setShowPermissionPrompt(true);
          }
          break;
          
        case 'CONSOLE_ERROR':
          console.error('[WebView]:', data.message);
          break;
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }, [requestCameraPermission]);

  // Performance: Prevent component re-renders
  const renderError = useCallback(() => null, []);

  // Permission prompt overlay
  if (showPermissionPrompt && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Text style={styles.permissionEmoji}>📷</Text>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionMessage}>
              TimeVision needs camera access to enable AR watch try-on. Your camera feed is processed locally and never stored.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={requestCameraPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
            </TouchableOpacity>
            
            {cameraPermission === false && (
              <>
                <Text style={styles.permissionHint}>
                  If you previously denied camera access, please enable it in Settings.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={openAppSettings}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => setShowPermissionPrompt(false)}
              activeOpacity={0.6}
            >
              <Text style={styles.ghostButtonText}>Continue Without Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Text style={styles.errorHint}>
            Please check your internet connection and ensure the server is running.
          </Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setHasError(false);
              webViewRef.current?.reload();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      <WebView
        ref={webViewRef}
        source={{ uri: WEBAPP_URL }}
        style={styles.webview}
        
        // PERFORMANCE CRITICAL SETTINGS
        // Hardware acceleration - MUST BE ENABLED
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        
        // Cache and storage
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        domStorageEnabled={true}
        localStorage={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        
        // Camera & Media
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback={true}
        
        // JavaScript performance
        javaScriptEnabled={true}
        javaScriptCanOpenWindowsAutomatically={false}
        
        // Network optimization
        incognito={false}
        
        // Touch and scroll optimization
        bounces={false}
        overScrollMode="never"
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        
        // Rendering optimization
        renderToHardwareTextureAndroid={true}
        
        // Communication
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        
        // Loading
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        onRenderProcessGone={renderError}
        
        // Security
        originWhitelist={['*']}
        mixedContentMode="always"
        geolocationEnabled={true}
        
        // Android specific optimizations
        {...(Platform.OS === 'android' && {
          setSupportMultipleWindows: false,
          allowFileAccess: true,
          allowUniversalAccessFromFileURLs: true,
          allowFileAccessFromFileURLs: true,
          // Disable safe browsing for performance
          safeBrowsingEnabled: false,
          // Force dark mode support
          forceDarkOn: false,
        })}
        
        // iOS specific optimizations
        {...(Platform.OS === 'ios' && {
          allowsLinkPreview: false,
          decelerationRate: 'normal',
          automaticallyAdjustContentInsets: false,
          contentInsetAdjustmentBehavior: 'never',
          directionalLockEnabled: true,
          scrollEventThrottle: 16,
        })}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading TimeVision...</Text>
            <Text style={styles.loadingHint}>Optimizing for AR performance</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  loadingHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  permissionEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  ghostButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
