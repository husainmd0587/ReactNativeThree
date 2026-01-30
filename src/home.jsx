import { StyleSheet, Text, View,TouchableOpacity } from 'react-native'
import React,{useEffect} from 'react'
import AppProvider from './provider'
import CncRouterBetweenSpindles from './components/turning/cncTurningDemo'
import './utils/config/bvh_setup/three_bvh_setup.js'
import CNCSimulatorNative from './components/turning/operations/tseting/testing'
import BvhTest from './components/turning/operations/tseting/bvhTest.js'

const Home = () => {

  return (
    <AppProvider>
      {/* <CncRouterBetweenSpindles/> */}
      <BvhTest/>
    </AppProvider>
  )
}
  
export default Home

const styles = StyleSheet.create({}) 