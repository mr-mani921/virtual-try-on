import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import WebViewScreen from './src/screens/WebViewScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <WebViewScreen />
    </>
  );
}
