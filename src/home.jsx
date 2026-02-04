import { StyleSheet, Text, View,TouchableOpacity } from 'react-native'
import React,{useEffect} from 'react'
import AppProvider from './provider'
import CncRouterBetweenSpindles from './components/turning/cncTurningDemo'
import './utils/config/bvh_setup/three_bvh_setup.js'
import CNCSimulatorNative from './components/turning/operations/tseting/testing'
// import BvhTest from './components/turning/operations/tseting/bvhTest.js'
import {   
  Example1_BasicCylindricalTurning,
  Example2_ComplexShaft,
  Example3_TaperedPart,
  Example4_CustomLatheProfile,
  Example5_ThreadingAndKnurling,
  Example6_OffCenterDrilling,
  Example7_PartingOperation,
  Example8_DynamicControl 
} from './components/turning/operations/tseting/examples.js'

const Home = () => {

  return (
    <AppProvider>
      <CncRouterBetweenSpindles/>
      {/* <BvhTest/> */}
      {/* <Example1_BasicCylindricalTurning/> */}
      {/* <Example2_ComplexShaft/> */}
      {/* <Example3_TaperedPart/>  */}
      {/* <Example4_CustomLatheProfile/> */}
      {/* <Example5_ThreadingAndKnurling/> */}
      {/* <Example6_OffCenterDrilling/>   */}
      {/* <Example7_PartingOperation/> */}
      {/* <Example8_DynamicControl/> */}
    </AppProvider>
  )
}
  
export default Home

const styles = StyleSheet.create({}) 