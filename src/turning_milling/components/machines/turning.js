import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ToolHolder } from "./machineComponents";
import { useTextureLoader } from "../../../utils/materials/textures";

function CncFrameTurning({ machineState }) {
  const { x, z, spindleOn, spindleSpeed, isCutting, gateOpen } = machineState;

  const chuckRef = useRef();
  const turretRef = useRef();
  const workpieceRef = useRef();
  // 🎯 Rotation
  useFrame(() => {
    if (spindleOn && chuckRef.current && workpieceRef.current) {
      const speed = spindleSpeed * 0.02;
      chuckRef.current.rotation.x += speed;
      workpieceRef.current.rotation.x += speed;
     
    }
  });

  const toolX = x * 0.04;
  const toolZ = z * 0.04;
 
  const texture = useTextureLoader('wood');

  return (
    <group>

      {/* ================= ENCLOSURE (GATE) ================= */}
      <mesh position={[0, 1.2, -1.12]} > 
        <boxGeometry args={[8, 2.6, 0.05]} />
        <meshStandardMaterial color="#cbd5e1"  />
      </mesh>

      <mesh position={[gateOpen ? 0 : 8, 1.2, 1]}>
        <boxGeometry args={[8, 2.6, 0.05]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[8, 0.05, 2.2

        ]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* ================= BED ================= */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[8, 0.4, 2.2]} />
        <meshStandardMaterial color="#3e4a52" map={texture} />
      </mesh>

      {/* ================= HEADSTOCK ================= */}
      <mesh position={[-3.2, 0.5, 0]}>
        <boxGeometry args={[1.5, 3, 2]} />
        <meshStandardMaterial color="#2e5f8a" />
      </mesh>

      {/* ================= CHUCK (3 JAW) ================= */}
  {/* ================= CHUCK (3 JAW) ================= */}
<group ref={chuckRef} position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>

  {/* Chuck body */}
  <mesh>
    <cylinderGeometry args={[0.6, 0.6, 0.8, 32]} />
    <meshStandardMaterial color="#ccc" />
  </mesh>

  {/* Jaws group (NO weird rotations) */}
  <group rotation={[ Math.PI / 2, 0,0]}>
    {[0, 120, 240].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;

      return (
        <mesh
          key={i}
          position={[
            Math.cos(rad) * 0.5,
            Math.sin(rad) * 0.5,
            0.2
          ]}
          rotation={[0, 0, rad]} // ONLY Z rotation
        >
          <boxGeometry args={[0.4, 0.15, .8]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      );
    })}
  </group>

</group>
      {/* ================= WORKPIECE ================= */}
      <mesh
        ref={workpieceRef}
        position={[-1, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.4, 0.4, 2, 32]} />
        <meshStandardMaterial
          color={isCutting ? "#f97316" : "#facc15"}
          emissive={isCutting ? "#ea580c" : "#000"}
          emissiveIntensity={isCutting ? 0.6 : 0}
        />
      </mesh>

      {/* ================= TAILSTOCK ================= */} 
      <group position={[3, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 1.6, 1.6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>

        {/* Quill */}
        <mesh position={[-1, 0, 0]} rotation={[0, 0 ,90 * Math.PI/180]}>
          <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-1.5, 0, 0]} rotation={[0, 0 ,90 * Math.PI/180]}>
          <coneGeometry args={[0.3, 0.4, 16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      </group>

      {/* ================= Terret ================= */}
       <mesh position={[0,.5,-1]} >
        <boxGeometry args={[7.5, 3, 0.25]} />
        <meshStandardMaterial color="#334155" />
       </mesh>

        <group ref={turretRef} position={[0, 0, 0]} >
          <mesh position={[0, 2, -0.8]} >
            <boxGeometry args={[1.5, 0.8, 0.2]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <mesh position={[0.3, 2, -0.25]} rotation={[10*Math.PI/180,0,0]}>
            <boxGeometry args={[.4, 0.4, 1]} />
            <meshStandardMaterial color="red" />
          </mesh> 
              <group position={[0, 1.9, 0.1]} rotation={[0, 0 ,90 * Math.PI/180]} ref={chuckRef}>
                <mesh >
                <cylinderGeometry args={[0.5, 0.5, 0.2, 16]} />
                <meshStandardMaterial color="#cbd5e1" />
                </mesh>
                <ToolHolder tarretRed={0.42} />
              </group>
        </group>

      {/* ================= CUTTING LIGHT ================= */}
      <pointLight
        position={[toolZ, toolX, 0.6]}
        intensity={isCutting ? 1.5 : 0}
        color="#ffaa44"
      />

    </group>
  );
}

export default CncFrameTurning;
