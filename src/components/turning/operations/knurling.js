import React, { useMemo, useRef, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useTextureLoader } from '../../../assets/all_textures'
import { buildSweepGeometry,createSpringPath,createCircle,createSquare,createTriangle,createReverceTriangle,
 } from "./utils";
/* ---------------- TOOL ---------------- */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.2, 0.4, 0.2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))



function KnurlingOperation({rawRadius=2,length=5,pitch=0.1}){
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

  const turns = 10
  if (!isFinite(turns)) return null

  const shapeA = createTriangle(pitch)
  const shapeB = createReverceTriangle(pitch)

  if (shapeA.length < 3 || shapeB.length < 3) return null

  const pathA = createSpringPath({
    radius: rawRadius,
    turns,
    height: length,
    segments: 400,
    reverce: false,
  })

  const pathB = createSpringPath({
    radius: rawRadius,
    turns,
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
             roughness={0.45}/> 
            </mesh>
            <mesh geometry={finishedGeometry} position={[0,0,0]} rotation={[Math.PI/2,0,0]}>
                <meshStandardMaterial   
                 color="#fff"
             map={texture}
             metalness={0.5}
             roughness={0.45}/>
            </mesh>
      </group>
    )
}
export default KnurlingOperation