import React, { useRef,useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber/native'
import { degToRad } from '../../../utils/common';
import Chips from '../MachinesParts/chips/chips'
export function CuttingTool({ feed = 0.01, depth = 0.002 }) {
  const toolRef = useRef();
 
  useFrame(() => {
    if (!toolRef.current) return;

    // Z axis feed (left → right)
    toolRef.current.position.x -= feed;

    // X axis depth of cut (slow infeed)
    toolRef.current.position.y = 0;

    // Limit movement (avoid crash)
    if (toolRef.current.position.x < -1.7) {
      toolRef.current.position.x = 1.7; // reset pass
      toolRef.current.position.y -= 0.05; // deeper cut
    }
  });

  return (
    <group ref={toolRef} position={[0, 0, 1.7]}  rotation={degToRad([-90,0,0])}>
      {/* Tool Holder */}
      <mesh   name="part_1"
  onPointerDown={(e) => {
    e.stopPropagation()   // prevent OrbitControls rotation
    console.log('Pressed:', e.object.name)
     e.object.material.color.set('red')
  }}>
        <boxGeometry args={[0.5, 0.8, 0.2]} />
        <meshStandardMaterial  color="#fff" metalness={0.75}  roughness={0.25}   envMapIntensity={1.2} />
      </mesh>

      {/* Tool Tip */}
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.25, 0.8, 5]} />
        <meshStandardMaterial   color="#9ca3af" metalness={0.75}  roughness={0.25}   envMapIntensity={1.2} />
      </mesh>
      <Chips position={[0,1.2,0]}/>
    </group>
  );
}
