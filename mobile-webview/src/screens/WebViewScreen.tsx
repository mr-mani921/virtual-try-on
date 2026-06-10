import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// const WEBAPP_URL = 'https://your-deployed-app-url'; // Replace with your deployed URL
// For local testing: const WEBAPP_URL = 'http://10.0.2.2:3000'; // Android emulator
 const WEBAPP_URL = 'http://localhost:3000'; // For local testing: iOS simulator

export default function WebViewScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Hide splash screen after component mounts
    const prepare = async () => {
      try {
        // You can do any initial setup here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, []);

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

  // Inject JavaScript to handle camera permissions from web app
  const injectedJavaScript = `
    (function() {
      // Allow camera access through WebView
      window.isNativeApp = true;
      
      // Log any errors to help with debugging
      window.addEventListener('error', function(e) {
        console.error('Web Error:', e.message);
      });
      
      // Notify React Native that page is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PAGE_LOADED'
      }));
    })();
    true; // Required for iOS
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'PAGE_LOADED') {
        console.log('Web app loaded successfully');
      }
      
      // You can handle other messages from web app here
      // For example: camera permission status, errors, etc.
      
    } catch (error) {
      console.error('Error parsing message from WebView:', error);
    }
  };

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
        
        // Camera & Media Permissions
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback={true}
        
        // Performance
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        
        // Loading handlers
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        
        // Communication with web app
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        
        // Security
        originWhitelist={['*']}
        mixedContentMode="always"
        
        // User Experience
        bounces={false}
        overScrollMode="never"
        scrollEnabled={true}
        
        // Android specific
        {...(Platform.OS === 'android' && {
          setSupportMultipleWindows: false,
          allowFileAccess: true,
          allowUniversalAccessFromFileURLs: true,
        })}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading TimeVision...</Text>
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
  },
});
