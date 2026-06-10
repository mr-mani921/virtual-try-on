import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import { Camera } from 'expo-camera';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const WEBAPP_URL = 'https://your-deployed-app-url'; // Replace with your deployed URL
// For local testing: const WEBAPP_URL = 'http://10.0.2.2:3000'; // Android emulator
// For local testing: const WEBAPP_URL = 'http://localhost:3000'; // iOS simulator

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
  }, []);

  const checkCameraPermission = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
      
      if (status === 'undetermined') {
        // Permission not yet requested
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

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
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
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('HTTP error: ', nativeEvent.statusCode);
    
    if (nativeEvent.statusCode >= 400) {
      Alert.alert(
        'Server Error',
        `Server returned error: ${nativeEvent.statusCode}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Enhanced injected JavaScript for camera access
  const injectedJavaScript = `
    (function() {
      // Notify that we're in native app
      window.isNativeApp = true;
      window.isWebViewWithCameraAccess = true;
      
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
          
          // Wait a bit for native permission to be granted
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Now call original getUserMedia
          const stream = await originalGetUserMedia(constraints);
          
          console.log('getUserMedia success, stream:', stream);
          
          // Notify native that camera is being used
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CAMERA_STARTED',
            streamId: stream.id
          }));
          
          return stream;
          
        } catch (error) {
          console.error('getUserMedia error:', error);
          
          // Notify native of error
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CAMERA_ERROR',
            error: error.message || error.toString()
          }));
          
          throw error;
        }
      };
      
      // Log any console messages
      const originalLog = console.log;
      console.log = function(...args) {
        originalLog.apply(console, args);
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CONSOLE_LOG',
            message: args.join(' ')
          }));
        } catch (e) {}
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
      
      // Notify page loaded
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PAGE_LOADED',
        url: window.location.href
      }));
      
    })();
    true; // Required for iOS
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      console.log('Message from WebView:', data.type);
      
      switch (data.type) {
        case 'PAGE_LOADED':
          console.log('Web app loaded successfully:', data.url);
          break;
          
        case 'REQUEST_CAMERA_PERMISSION':
          console.log('WebView requesting camera permission');
          const granted = await requestCameraPermission();
          
          // Send permission status back to WebView
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'CAMERA_PERMISSION_RESULT', 
              granted: ${granted} 
            }, '*');
          `);
          break;
          
        case 'CAMERA_STARTED':
          console.log('Camera started in WebView');
          break;
          
        case 'CAMERA_ERROR':
          console.error('Camera error in WebView:', data.error);
          
          if (data.error.includes('Permission') || data.error.includes('NotAllowedError')) {
            setShowPermissionPrompt(true);
          }
          break;
          
        case 'CONSOLE_LOG':
          console.log('[WebView Log]:', data.message);
          break;
          
        case 'CONSOLE_ERROR':
          console.error('[WebView Error]:', data.message);
          break;
      }
      
    } catch (error) {
      console.error('Error parsing message from WebView:', error);
    }
  };

  // Permission prompt overlay
  if (showPermissionPrompt && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
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
                >
                  <Text style={styles.secondaryButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => setShowPermissionPrompt(false)}
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
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEBAPP_URL }}
        style={styles.webview}
        
        // Camera & Media Permissions - CRITICAL FOR getUserMedia
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback={true}
        
        // Performance
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        
        // Loading handlers
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        
        // Communication with web app
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        
        // Security - Allow camera access
        originWhitelist={['*']}
        mixedContentMode="always"
        
        // User Experience
        bounces={false}
        overScrollMode="never"
        scrollEnabled={true}
        
        // Geolocation (if needed for AR features)
        geolocationEnabled={true}
        
        // Android specific - CRITICAL for camera
        {...(Platform.OS === 'android' && {
          setSupportMultipleWindows: false,
          allowFileAccess: true,
          allowUniversalAccessFromFileURLs: true,
          allowFileAccessFromFileURLs: true,
          javaScriptCanOpenWindowsAutomatically: true,
          // Enable hardware acceleration for better camera performance
          androidHardwareAccelerationDisabled: false,
        })}
        
        // iOS specific
        {...(Platform.OS === 'ios' && {
          allowsLinkPreview: false,
          decelerationRate: 'normal',
        })}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading TimeVision...</Text>
            <Text style={styles.loadingHint}>Camera access will be requested</Text>
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
