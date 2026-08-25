//React native Related provider
import { StyleSheet, Text, View, StatusBar } from 'react-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Provider } from 'react-redux';
import { store } from './src/store';
import FirstStack from './src/navigation/firstStack';
import { Worker } from './src/all_glb/worker';
import { PortalProvider } from './src/utils/ThreeJs_Utils/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { suppressWarnings } from './src/utils/config/surppressWarning'
// Suppress warnings on app start
suppressWarnings();



const queryClient = new QueryClient();

const App = () => {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" hidden={false} translucent={false} />
      <Provider store={store}>
           <QueryClientProvider client={queryClient}>
              <PortalProvider>
                  <FirstStack />
              </PortalProvider>
           </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default App

const styles = StyleSheet.create({}) 