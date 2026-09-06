// React Native related providers
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import { store } from './src/store';
import FirstStack from './src/navigation/firstStack';
import { PortalProvider } from './src/utils/ThreeJs_Utils/portal';
import { suppressWarnings } from './src/utils/config/surppressWarning';

suppressWarnings();

const queryClient = new QueryClient();

// Renders the white block behind the status bar.
// Must live INSIDE SafeAreaProvider so useSafeAreaInsets has a provider to read from.
const StatusBarBackground = () => {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top, backgroundColor: '#fff' }} />;
};

const AppContent = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <StatusBarBackground />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <PortalProvider>
              <FirstStack />
            </PortalProvider>
          </QueryClientProvider>
        </Provider>
      </SafeAreaView>
    </>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
});