
import React, { useRef,useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei/native'
import { useFrame } from '@react-three/fiber';
import useControls from 'r3f-native-orbitcontrols';

export  function Worker() {
  const ur=require('./worker.glb') 
  const { nodes, materials } = useGLTF(ur)
 
  return (
    <group position={[1,-4,0]} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
        <skinnedMesh
          geometry={nodes.model007.geometry}
          material={materials['place_holder.007']}
          skeleton={nodes.model007.skeleton}
        />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  )
}
export function Bed(props) {
    const groupRef=useRef()
    const ur=require('./bed.glb')
    const { nodes, materials,animations } = useGLTF(ur)
    const {actions,names}=useAnimations(animations,groupRef)
    
    return (
      <group {...props} dispose={null} position={[0,1,0]} ref={groupRef}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.OBJ_Bed_Body.geometry}
          material={materials.MAT_Bed_Body}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.OBJ_Bed_Blanket.geometry}
          material={materials.MAT_Bed_blanket}
        />
      </group>
    )
}
export function Plane(props) {
    const ur=require('./plane.glb')
    useGLTF.preload(ur)
    const { nodes, materials } = useGLTF(ur)
    return (
      <group {...props} dispose={null}>
        <group
          position={[0, 1, 10]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.46, 1.46, 1.392]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021.geometry}
            material={materials.Material}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021_1.geometry}
            material={materials['Material.009']}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021_2.geometry}
            material={materials.glass}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021_3.geometry}
            material={materials['Material.001']}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021_4.geometry}
            material={materials['Material.002']}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder021_5.geometry}
            material={materials['Material.003']}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder002.geometry}
            material={materials.Material}
            position={[0.313, -5.106, -0.657]}
            rotation={[0, -1.092, 0]}
            scale={[1.039, 1, 0.963]}
          />
          <group
            position={[-0.019, -4.767, -0.674]}
            rotation={[1.471, 0.005, -1.567]}
            scale={[0.175, 0.047, 0.167]}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder007_1.geometry}
              material={materials['Material.004']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder007_2.geometry}
              material={materials['Material.005']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder007_3.geometry}
              material={materials['Material.006']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder007_4.geometry}
              material={materials['Material.001']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder007_5.geometry}
              material={materials['Material.007']}
            />
          </group>
          <group
            position={[-1.205, 1.007, -1.024]}
            rotation={[Math.PI / 2, 0, -Math.PI / 2]}
            scale={[0.191, 0.052, 0.182]}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder009_1.geometry}
              material={materials['Material.004']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder009_2.geometry}
              material={materials['Material.005']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder009_3.geometry}
              material={materials['Material.006']}
            />
          </group>
          <group
            position={[1.169, 1.007, -1.024]}
            rotation={[Math.PI / 2, 0, -Math.PI / 2]}
            scale={[0.191, 0.052, 0.182]}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder011_1.geometry}
              material={materials['Material.004']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder011_2.geometry}
              material={materials['Material.005']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Cylinder011_3.geometry}
              material={materials['Material.006']}
            />
          </group>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder015.geometry}
            material={materials.Material}
            position={[-0.31, -5.066, -0.657]}
            rotation={[0, 1.07, 0]}
            scale={[1.038, 1, 0.964]}
          />
        </group>
      </group>
    )
} 

export function PunchingMan(props) {
    useGLTF.preload('./punchingman.glb') 
    const group = useRef()
    const url=require('./punchingman.glb')
    const { nodes, materials, animations } = useGLTF(url) 
    const { actions,names} = useAnimations(animations, group)


  useEffect(()=>{
      actions[names[1]]?.play()  
  },[actions]) 

    return (
      <group ref={group} {...props} dispose={null}>
        <group name="Scene"> 
          <group name="Armature" rotation={[Math.PI / 2, 0, 0]} scale={0.01} >
            <skinnedMesh
              name="vanguard_Mesh"
              geometry={nodes.vanguard_Mesh.geometry}
              material={materials.VanguardBodyMat}
              skeleton={nodes.vanguard_Mesh.skeleton}
            />
            <skinnedMesh
              name="vanguard_visor"
              geometry={nodes.vanguard_visor.geometry}
              material={materials.Vanguard_VisorMat}
              skeleton={nodes.vanguard_visor.skeleton}
            />
            <mesh 
           onPointerDown={() => console.log("clicked")}
          visible={false} >
               <boxGeometry args={[1, 2, 1]} /> 
            </mesh>
            <primitive object={nodes.mixamorigHips} />
          </group>
        </group>
      </group>
    )
  }




export function Motor(props) {
  const group = useRef()
  const ur=require('./motor.glb')
  const { nodes, materials, animations } = useGLTF(ur)
  const { actions } = useAnimations(animations, group) 

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene" >
        <group
          name="reference"
          position={[15.397, 0, 0]}
          rotation={[Math.PI / 2, 0, Math.PI / 2]}
          scale={2.307}
        />
        <mesh
          name="top"
          castShadow
          receiveShadow
          geometry={nodes.top.geometry}
          material={materials.colored_alimunium}
          position={[0.098, 0.948, 0.459]}
          rotation={[-1.851, 1.379, -2.869]}
          scale={0.584}
        />
        <mesh
          name="median"
          castShadow
          receiveShadow
          geometry={nodes.median.geometry}
          material={materials['Material.001']}
          position={[0.07, 0.937, -0.034]}
          rotation={[3.13, -0.051, -0.185]}
          scale={[0.505, 0.505, 0.521]}
        >
                <meshStandardMaterial color="red" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh
          name="bottom"
          castShadow
          receiveShadow
          geometry={nodes.bottom.geometry}
          material={materials['Material.001']}
          position={[0.042, 0.929, -0.611]}
          rotation={[-1.573, -0.185, 0.052]}
          scale={0.297}
        />
        <mesh
          name="ring_bottom"
          castShadow
          receiveShadow
          geometry={nodes.ring_bottom.geometry}
          material={materials.colored_alimunium}
          position={[0.05, 0.931, -0.45]}
          rotation={[-1.573, -0.185, 0.052]}
          scale={0.317}
        />
        <mesh
          name="middle_upper_shaft"
          castShadow
          receiveShadow
          geometry={nodes.middle_upper_shaft.geometry}
          material={materials.Material}
          position={[0.078, 0.94, 0.081]}
          rotation={[-1.851, 1.379, -2.869]}
          scale={0.597}
        />
        <mesh
          name="core"
          castShadow
          receiveShadow
          geometry={nodes.core.geometry}
          material={materials.magnet}
          position={[0.073, 0.939, -0.016]}
          rotation={[2.99, 1.519, -1.432]}
          scale={[0.597, 0.766, 0.597]}
        />
        <mesh
          name="magnets"
          castShadow
          receiveShadow
          geometry={nodes.magnets.geometry}
          material={materials.magnet}
          position={[0.07, 0.938, -0.035]}
          rotation={[3.13, -0.051, -0.185]}
          scale={[0.505, 0.505, 0.521]}
        />
        <group
          name="coil4"
          position={[0.073, 0.939, -0.011]}
          rotation={[3.13, -0.051, -0.185]}
          scale={[0.065, 0.005, 0.045]}>
          <mesh
            name="Cube021"
            castShadow
            receiveShadow
            geometry={nodes.Cube021.geometry}
            material={materials['Material.002']}
          />
          <mesh
            name="Cube021_1"
            castShadow
            receiveShadow
            geometry={nodes.Cube021_1.geometry}
            material={materials['Material.003']}
          />
        </group>
             <mesh
          name="rotor"
          
          castShadow
          receiveShadow
          geometry={nodes.rotor.geometry}
          material={materials.rotor}
          position={[0.081, 0.938, 0.101]}
          rotation={[-1.573, -0.185, 0.052]}
          scale={0.111}
        >
           <meshStandardMaterial color="#fff" metalness={0.5} roughness={0.2} />
        </mesh>
   
      </group>
    </group>
  )
}




  

  