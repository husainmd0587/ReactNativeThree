import React, { useRef,useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber/native'
import * as THREE from 'three'
import textures from '../../assets/textures2.jpg'
import { CuttingTool } from './tools/tools'
import { degToRad } from '../../utils/common'
import { SegmentedBar,SegmentedRoundBar } from './MachinesParts/raw_materials/raw'
import {Bed,PunchingMan,Worker,Plane,Motor} from './../../all_glb/worker'
import { CustomLatheGeometry } from '../tmp/custom_geometry'
import { StepTurning } from './operations/stepTurning'
import  TurningWorkpiece from './operations/stepTurningNew'
import { FaceTurning } from './operations/faceTurning'
import { OuterThreading } from './operations/threads'
import DrillingOperation from './operations/drilling'
import KnurlingOperation from './operations/knurling'
import PartingOperations from './operations/parting'
import FreehandTurning from './operations/freeHandTurning'

/* ---------------- MAIN EXPORT ---------------- */
export default function CncRouterBetweenSpindles() {
  return (
    <group>
      {/* <CncFrame /> */}
      {/* <RotatingSpindleGroup speed={0.05} /> */}
      {/* <CuttingTool/> */}
      {/* <SegmentedBar/> */}
       {/* <CustomLatheGeometry position={[-2,0,0]} rotation={degToRad([0,0,-90])}/>  */}
       {/* <StepTurning/>  */}
       {/* <FaceTurning/> */}
       {/* <TurningWorkpiece/> */}
       {/* <OuterThreading/> */}
       {/* <DrillingOperation/> */}
       {/* <KnurlingOperation/> */}
       {/* <PartingOperations/> */}
       <FreehandTurning/>
    </group>
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
       <Motor position={[3.7,-1,0]} rotation={[0,-1.57079,0]}/>
    </group>
  )
}
 


