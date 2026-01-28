import { useFrame } from '@react-three/fiber'
import {React,useEffect,useRef} from 'react'
import { Box, Toras, Shapes, CustomGeometry, Line, Circle, CustomShape, Capsule, Cylinder, Cone,
     Tube,CustomExtrudedShape,Text3D } from './shapes';
import { Worker, Bed, Plane, PunchingMan } from '../../all_glb/worker';
import * as THREE from 'three'



const GroupsMesh = ({rotate={x:0,y:0,z:0}}) => {
  const sceneRef = useRef();
    useEffect(()=>{
        sceneRef.current.rotation.x =rotate.x*(Math.PI / 180)
        sceneRef.current.rotation.y =rotate.y*(Math.PI / 180)
        sceneRef.current.rotation.z =rotate.z*(Math.PI / 180)
    },[rotate])
      

  return (
    <>
     <group  ref={sceneRef}> 
           <Toras position={[0, -1.5, 0]} size={[10, 1, 260, 6, 10, 16]} color={"green"} speed={1} />
           <Box  position={[0, 1.5, 0]} />
            <Cylinder position={[0, 0, 0]} size={[1, 1, 2, 20]} color={"teal"} />
            <Circle position={[0,3,0]}/>
           <CustomExtrudedShape />
           {/* <Text3D/> */}
     </group>
     
    </>
  )
}

export default GroupsMesh

