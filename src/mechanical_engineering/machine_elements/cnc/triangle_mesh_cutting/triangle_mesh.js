import CanvaProvider from '../../../../provider'
import { CuttablePart, CuttingTool, CuttingController } from './components/triangle_mesh_cutting_utils';
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

function Scene() {
  const partRef = useRef();
  const toolRef = useRef();
  const controllerRef = useRef();

  // IMPORTANT: Call this to actually cut
  const doCut = useCallback(() => {
    const success = controllerRef.current?.executeCut('positive');
    console.log('Cut success:', success);
  }, []);

  const doReset = useCallback(() => {
    partRef.current?.reset();
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      {/* The mesh that gets cut */}
      <CuttablePart
        ref={partRef}
        initialGeometry={new THREE.BoxGeometry(3, 3, 3, 8, 8, 8)}
        position={[0, 0, 0]}
        onCut={(data) => console.log('Cut #', data.cutCount)}
      />

      {/* The cutting blade */}
      <CuttingTool
        ref={toolRef}
        position={[0, 2, 0]}
        rotation={[Math.PI / 6, 0, 0]}
        scale={[2, 1, 2]}
      />

      {/* Wires them together */}
      <CuttingController
        ref={controllerRef}
        toolRef={toolRef}
        partRef={partRef}
      />

      {/* Trigger buttons */}
      <mesh position={[-2, -3, 0]} onPointerDown={doCut}>
        <boxGeometry args={[1.5, 0.6, 0.3]} />
        <meshStandardMaterial color="#00aa00" />
      </mesh>

      <mesh position={[2, -3, 0]} onPointerDown={doReset}>
        <boxGeometry args={[1.5, 0.6, 0.3]} />
        <meshStandardMaterial color="#aa0000" />
      </mesh>
    </>
  );
}

export default function TriangleMesh() {
  return (
    <CanvaProvider>
      <Scene />
    </CanvaProvider>
  );
}