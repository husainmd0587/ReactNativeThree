import { useMemo } from "react";
import * as THREE from "three";
import { shapeListToMesh } from "./utils/segmentsToThree";
import  CanvaProvider  from "../../../../../utils/ThreeJs_Utils/provider"

export default function Main3D({ route }) {
  const { segments } = route?.params;
  const material = new THREE.MeshStandardMaterial({ color: 'orange', side: THREE.DoubleSide });
  const mesh = useMemo(() => {
    return shapeListToMesh(segments, 50, material);
  }, [segments]);

  return (
    <CanvaProvider>
        <mesh>
            <primitive object={mesh} />
        </mesh>
    </CanvaProvider>
  );
}
