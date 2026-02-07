import * as THREE from "three";
import { useMemo,useRef,useState,useEffect,forwardRef,useLayoutEffect } from "react";
import { useTextureLoader } from "../../../assets/all_textures";
import { useFrame } from "@react-three/fiber";
import { buildSweepGeometry,createSpringPath,createCircle,createSquare,createTriangle } from "./utils";




/* ---------------- TOOL ---------------- */
export const Tool = forwardRef((_, ref) => (
  <mesh ref={ref}>
    <boxGeometry args={[0.2, 0.4, 0.2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
))

/* ---------------- OUTER THREADING ---------------- */
export function OuterThreading({
  radius = 3,
  pitch = 0.6,
  height = 5,
  feed = 0.4,
  rpm = 0.6,
}) {
  const texture = useTextureLoader()
  const groupRef = useRef()
  const toolRef = useRef()
  const rawPartRef = useRef()

  const [cutting, setCutting] = useState(true)

  /* ---------------- PROFILE ---------------- */
  const profile = [
    { z: -0.01, r: 0 },
    { z: -0.01, r: radius },
    { z: height + 0.01, r: radius },
  ]

  /* ---------------- RAW GEOMETRY ---------------- */
  const rawGeometry = useMemo(() => {
    const pts = profile.map(p => new THREE.Vector2(p.r, p.z))
    pts.push(new THREE.Vector2(0, pts.at(-1).y))
    return new THREE.LatheGeometry(pts, 128)
  }, [radius, height])

  /* ---------------- THREAD GEOMETRY ---------------- */
const threadGeometry = useMemo(() => {
  if (!pitch || height <= pitch) return null

  // const shape = createTriangle(pitch * 0.8)
  const shape = createSquare(pitch * 0.2)
  if (!shape || shape.length < 2) return null

  const turns = height / pitch
  if (!isFinite(turns)) return null

  const path = createSpringPath({
    radius: radius - 0.2,
    turns: turns + 1,
    height: height - .2,
    segments: 300,
  })

  if (!path || path.length < 2) return null

  return buildSweepGeometry({
    shapePoints: shape,
    pathPoints: path,
  })
}, [radius, pitch, height])

  /* ---------------- CLIPPING PLANE ---------------- */
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    []
  ) 



useLayoutEffect(() => {
  if (!groupRef.current) return

  const helper = new THREE.PlaneHelper(clipPlane, 8, 0xff0000)
  groupRef.current.add(helper)

  return () => {
    groupRef.current.remove(helper)
    helper.geometry?.dispose()
    helper.material?.dispose()
  }
}, [clipPlane])
  /* ---------------- ANIMATION ---------------- */
  const toolZ = useRef(-0.01)

  useFrame((_, delta) => {
      groupRef.current.rotation.z -= rpm * delta
     if (!cutting) return
     if (!toolRef.current || !groupRef.current) return

    // Feed tool
    toolZ.current += feed * delta

    if (toolZ.current >= height) {
      setCutting(false)
      rawPartRef.current.visible=false
      return
    }

    // Tool position (radial + axial)
    toolRef.current.position.set(radius + 0.15, 0, toolZ.current)

    // Clip behind tool
    clipPlane.constant = -toolZ.current

  })

  /* ---------------- RENDER ---------------- */
  return (
<>
    <group ref={groupRef}>
      {/* RAW MATERIAL */}
      <mesh
        ref={rawPartRef}
        geometry={rawGeometry}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          map={texture}
          metalness={0.5}
          roughness={0.45}
          clippingPlanes={[clipPlane]}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* THREAD */}
{threadGeometry && (
  <mesh geometry={threadGeometry} position={[0, 0, pitch / 2]}>
    <meshStandardMaterial
      map={texture}
      metalness={0.6}
      roughness={0.4}
      side={THREE.DoubleSide}
    />
  </mesh>
)}


     {/* CORE CYLINDER */} 
     <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, height / 2]}> 
       <cylinderGeometry args={[radius - radius * 0.1, radius - radius * 0.1, height+pitch, 64]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3}  clippingPlanes={[]}/>
     </mesh>
      {/* TOOL */}
    </group>
        <Tool ref={toolRef} />
</>
  )
}
