import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ShiftProvider } from './src/context/ShiftContext';
import { ConfigErrorScreen } from './src/screens/ConfigErrorScreen';
import { isSupabaseConfigured } from './src/constants/config';

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigErrorScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShiftProvider>
          <RootNavigator />
        </ShiftProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
