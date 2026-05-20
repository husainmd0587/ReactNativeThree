import React, { useRef,useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native'
import { useFrame, useLoader } from '@react-three/fiber/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as THREE from 'three'
import textures from '../../assets/images/textures/steel.jpg'
import { CuttingTool } from './tools/tools'
import { degToRad } from '../../utils/common'
import { SegmentedBar,SegmentedRoundBar } from './MachinesParts/raw_materials/raw'
// import {Bed,PunchingMan,Worker,Plane,Motor} from './../../all_glb/worker'
import CanvaPovider from '../../provider'
import { CustomLatheGeometry } from './tmp/custom_geometry'
import { StepTurning } from './operations/stepTurning'
import StepTurning2 from './operations/stepTurning2'
import  TurningWorkpiece from './operations/stepTurning2'
import FaceTurning from './operations/faceTurning'
import OuterThreading  from './operations/threads'
import DrillingOperation from './operations/drilling'
import KnurlingOperation,{KnurlByTexture} from './operations/knurling'
import PartingOperations from './operations/parting'
import Parting2 from './operations/parting2';
import FreehandTurning from './operations/freehandTurning/freehandTurning'
import FreehandTurning2 from './operations/freehandTurning/freehandTurning2';
import StepWithCsg from './operations/stepWithCSGTurning/stepCsg'

const CNCOperations=[
  {name:'Turning',component:StepTurning},
  {name:'Turning2',component:StepTurning2},
  {name:'FaceTurning',component:FaceTurning},
  {name:'Threading',component:OuterThreading},
  {name:'Drilling',component:DrillingOperation},
  {name:'Knurling',component:KnurlingOperation},
  {name:'Knurling by texture',component:KnurlByTexture},
  {name:'Parting',component:PartingOperations},
  {name:'Parting2', component:Parting2},
  {name:'Freehand Turning',component:FreehandTurning},
  {name:'Freehand Turning2',component:FreehandTurning2},
  {name:'Step Turning with CSG',component:StepWithCsg},
]

const CNCHomeScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAEEDA', padding: 10 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#854F0B' }}>CNC Machining</Text>
      <ScrollView>
        {
        CNCOperations.map((item,index) => (
            <TouchableOpacity key={item.name} style={{ marginBottom: 10,backgroundColor: index%2 ? '#b9affa' : '#bbeef5',padding:10,borderRadius: 8 }} 
             onPress={() => navigation.navigate(item.name)} activeOpacity={0.7}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>{index + 1}. {item.name}</Text>
          </TouchableOpacity>
        ))
      }
      </ScrollView>
    </View>
  )
}

const Stack = createNativeStackNavigator();

const CNCTurning = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="cnc-turning_home_nav" component={CNCHomeScreen} />
      {
        CNCOperations.map((item) => (
          <Stack.Screen key={item.name} name={item.name} component={item.component} />
        ))
      }
    </Stack.Navigator>
  )
}

export default CNCTurning



/* ---------------- MAIN EXPORT ---------------- */
 function CncRouterBetweenSpindles() {
  return (
    <CanvaPovider>
      {/* <CncFrame /> */}
      {/* <RotatingSpindleGroup speed={0.05} /> */}
      {/* <CuttingTool/> */}
      {/* <SegmentedBar/> */}
       <CustomLatheGeometry position={[-2,0,0]} rotation={degToRad([0,0,-90])}/> 
       {/* <StepTurning/>  */}
        {/* <StepWithCsg/> */}
       {/* <FaceTurning/> */}
       {/* <TurningWorkpiece/> */}
       {/* <OuterThreading/> */}
       {/* <DrillingOperation/> */}
       {/* <KnurlingOperation/> */}
       {/* <KnurlByTexture/> */}
       {/* <PartingOperations/> */}
       {/* <FreehandTurning/> */}
    </CanvaPovider>
  )
}

/* ---------------- ROTATING SPINDLE GROUP ---------------- */
function RotatingSpindleGroup({ speed = 0.1,dia=60}) {
  const groupRef = useRef()
  const barRef=useRef()
  useFrame(() => {
    if (!groupRef.current) return
    // TRUE spindle rotation (Z axis)
    groupRef.current.rotation.x += speed
     if (!barRef.current) return
     if(barRef.current.scale.x>.5){
    barRef.current.scale.x -=0.001
    barRef.current.scale.z -=0.001
}
  })

  
  const texture = useLoader(
    THREE.TextureLoader,
    textures
  )
     // Improve visibility
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)

  return (
    <group ref={groupRef}>
      {/* HEADSTOCK */}
      <mesh position={[-2.2, 0, 0]} rotation={degToRad([0,0,90])}>
        <cylinderGeometry args={[0.5, 0.25, 0.9, 32]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* WORKPIECE */}
      <mesh rotation={degToRad([0,0,90])} ref={barRef}>
        <cylinderGeometry args={[dia*.01,dia*.01, 4, 64]} />
        <meshStandardMaterial
          map={texture}
        />
      </mesh>

      {/* TAILSTOCK */}
      <mesh position={[2.2, 0, 0]} rotation={degToRad([0,0,90])}>
        <cylinderGeometry args={[0.25, 0.5, 0.9, 32]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
    </group>
  )
}

/* ---------------- CNC ROUTER FRAME ---------------- */
function CncFrame() {
  return (
    <group>
      {/* Bed */}
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[5.5, 0.2, 1.5]} />
        <meshStandardMaterial color="#1f2933" />
      </mesh>

      {/* Left column */}
      <mesh position={[-2.8, 0, 0]}>
        <boxGeometry args={[0.3, 2, 1.5]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* Right column */}
      <mesh position={[2.8, 0, 0]}>
        <boxGeometry args={[0.5, 2, 1.5]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
         {/* Tool supporter  */}
      <mesh position={[0, -0.3, 1]}>
      <boxGeometry  args={[5.5, 0.2, .2]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
    </group>
  )
}
 


