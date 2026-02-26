import { StyleSheet, Text, View,TouchableOpacity, NativeModules } from 'react-native'
import React,{useEffect} from 'react'
import AppProvider from './provider'
import CncRouterBetweenSpindles from './components/turning/cncTurningDemo'
import './utils/config/bvh_setup/three_bvh_setup.js'
import CNCSimulatorNative from './components/turning/operations/tseting/testing'
import BvhTest from './components/turning/operations/tseting/bvhTest.js'
import CreateLatheMeshFromC from './components/turning/operations/fromc++/stepTurning.js'
import StepWithCsg from './components/turning/operations/stepWithCSGTurning/stepCsg.js'
import StepTurningCSG from './components/turning/operations/stepWithCSGTurning/stepTurningCSG.js'
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
import { DrilledCylinder,PocketedBlock,TurnedRook,GearBlank,ConfigurablePart,
BoltAssembly,ThorHammer,LensSlugs,SquareGear,HollowPipe
 } from './components/turning/operations/stepWithCSGTurning/stepTurningCSGExamples.js'
import { M6Bolt,M12Bolt,LeadScrew,ButtressScrew,SquareScrew,TrapezoidalScrew,KnuckleScrew ,M6Nut}
from './components/turning/operations/stepWithCSGTurning/others/thread.js'

const Home = () => {
  return (
    <AppProvider>
      {/* <CncRouterBetweenSpindles/> */}
      {/* <BvhTest/> */}
      {/* <Example1_BasicCylindricalTurning/> */}
      {/* <Example2_ComplexShaft/> */}
      {/* <Example3_TaperedPart/>  */}
      {/* <Example4_CustomLatheProfile/> */}
      {/* <Example5_ThreadingAndKnurling/> */}
      {/* <Example6_OffCenterDrilling/>   */}
      {/* <Example7_PartingOperation/> */}
      {/* <Example8_DynamicControl/> */}
      {/* <StepWithCsg/> */}
      {/* <CreateLatheMeshFromC/> */}
      {/* <DrilledCylinder/> */}
      {/* <PocketedBlock/> */}
      {/* <TurnedRook/> */}
      <GearBlank/>
      
      {/* <BoltAssembly/> */}
      {/* <ThorHammer/>   */}
      {/* <M6Bolt/> */}
      {/* <M12Bolt/> */}
      {/* <LeadScrew/> */}
     
      {/* <SquareScrew/> */}
      {/* <KnuckleScrew/> */}
      {/* <TrapezoidalScrew/> */}
      {/* <M6Nut/> */}
      {/* <LensSlugs/> */}
      {/* <SquareGear/> */}
      {/* <HollowPipe/> */}
    </AppProvider>
  )
}
  
export default Home

const styles = StyleSheet.create({}) 