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
      <View style={{flex:0,backgroundColor:'#fff',borderRadius:20,borderWidth:0}}>   
      </View>
    </GestureHandlerRootView> 
   
  )
}

export default App

const styles = StyleSheet.create({}) 