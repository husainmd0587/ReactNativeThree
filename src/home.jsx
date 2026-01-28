import { StyleSheet, Text, View,TouchableOpacity } from 'react-native'
import React,{useEffect} from 'react'
import AppProvider from './provider'
import CncRouterBetweenSpindles from './components/turning/cncTurningDemo'


const Home = () => {

  return (
    <AppProvider>
      <CncRouterBetweenSpindles/>
    </AppProvider>
  )
}
  
export default Home

const styles = StyleSheet.create({}) 