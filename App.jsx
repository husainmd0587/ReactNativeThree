//React native Related provider
import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Provider } from 'react-redux';
import { store } from './src/utils/store/store';
import Home from './src/home'

const App = () => {
    
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
           <Home/> 
      </Provider>
   
    </GestureHandlerRootView> 
   
  )
}

export default App

const styles = StyleSheet.create({}) 