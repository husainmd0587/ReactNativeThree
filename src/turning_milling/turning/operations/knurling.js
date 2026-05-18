import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useTextureLoader,useKnurlTextureLoader } from '../../../utils/materials/textures'
import { buildSweepGeometry,createSpringPath,createCircle,createSquare,createTriangle,createReverceTriangle,
createKnurlingTriangle,createReverceKnurlingTriangle } from "./utils";
import { Show2DShapeByPoints } from '../../../utils/geometries/shapes2D'
import CanvaPovider from '../../../provider'
/* ---------------- TOOL ---------------- */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.2, 0.4, 0.2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))



function Scene({rawRadius=2,length=5,pitch=0.1}){
    const [cutting,setCutting]=useState(true)
    const rawPatRef=useRef()
    const finishedPartRef=useRef()
    const toolRef=useRef()
    const texture=useTextureLoader()
    const  rawPart=[{z:0,r:0},{z:0,r:2},{z:3,r:2},{z:3,r:0}]
    const rawGeometry=useMemo(()=>{
        const pts=rawPart.map((p)=>new THREE.Vector2(p.r, p.z))
         return new THREE.LatheGeometry(pts, 128)
    },[])

const finishedGeometry = useMemo(() => {
  if (!pitch || pitch <= 0 || length <= 0) return null

  const turns = 20
  if (!isFinite(turns)) return null

  const shapeA = createKnurlingTriangle({
    size: pitch,
    depth: 0.25,
    turns,
  })
  const shapeB = createReverceKnurlingTriangle({
    size: pitch,
    depth: 0.25,
    turns,
  })

  if (shapeA.length < 3 || shapeB.length < 3) return null

  const pathA = createSpringPath({
    radius: rawRadius,
    turns:3,
    height: length,
    segments: 400,
    reverce: false,
  })

  const pathB = createSpringPath({
    radius: rawRadius,
    turns:3,
    height: length,
    segments: 400,
    reverce: true,
  }) 

  if (pathA.length < 2 || pathB.length < 2) return null

  const g1 = buildSweepGeometry({ shapePoints: shapeA, pathPoints: pathA }).toNonIndexed()
  const g2 = buildSweepGeometry({ shapePoints: shapeB, pathPoints: pathB }).toNonIndexed()

  const pts = rawPart.map(p => new THREE.Vector2(p.r - 0.15, p.z))
  const core = new THREE.LatheGeometry(pts, 128).toNonIndexed()
  core.rotateX(Math.PI / 2)
  const merged = mergeGeometries([g1, g2, core], false)

  if (!merged) return null

  merged.computeVertexNormals()
  return merged
}, [rawRadius, length, pitch])


    return(
      <group>
            <mesh  ref={rawPatRef}  geometry={rawGeometry} position={[0,0,0]} rotation={[0,0,0]}>
               <meshStandardMaterial     
             color="#fff"
             map={texture}
             metalness={0.5}
             roughness={0.45}
             side={THREE.DoubleSide}
             /> 
            </mesh>
            <mesh geometry={finishedGeometry} position={[0,0,0]} rotation={[Math.PI/2,0,0]}>
                <meshStandardMaterial   
                 color="#fff"
             map={texture}
             metalness={0.5}
             roughness={0.45}
               side={THREE.DoubleSide}
             />
            </mesh>
            <Show2DShapeByPoints shapePoints={[...createKnurlingTriangle({pitch:0.5,depth:0.5,turns:2})]}/>
            <Show2DShapeByPoints shapePoints={[...createReverceKnurlingTriangle({pitch:0.5,depth:0.5,turns:2})]}/>    
      </group>
    )
}
export default function Knurling(){
  return(
    <CanvaPovider>
      <Scene />
    </CanvaPovider>
  )
}

function Scene_knurl_By_texture(){

const points = [];
const segments = 5; // more segments = smoother sphere

for (let i = 0; i <= segments; i++) {
  const angle = (i / segments) * Math.PI; // 0 to π (180°)
  const radius = 2; // sphere radius
  
  const z = radius * Math.cos(angle); // height
  const r = radius * Math.sin(angle); // distance from axis
  
  points.push({ z, r });
}
  const geometry=useMemo(()=>{
    const pts=points.map((p)=>new THREE.Vector2(p.r, p.z))
    return new THREE.LatheGeometry(pts, 128)
    // return new THREE.CylinderGeometry(2,2,5,64,1,true)
  },[])
  const texture=useKnurlTextureLoader()  
  const ref=useRef()
  useFrame(() => {
    if (!ref.current) return
    ref.current.rotation.y += 0.002
  })
return(
    <mesh ref={ref} geometry={geometry}>
    <meshStandardMaterial
      color="#fff"
      metalness={0.5}
      roughness={0.45}
      map={texture}
      side={THREE.DoubleSide}
    />
  </mesh>
)
}

export function KnurlByTexture(){
  return(
    <CanvaPovider>
      <Scene_knurl_By_texture />
    </CanvaPovider>
   )
}