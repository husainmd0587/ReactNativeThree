import React,{useRef,useMemo} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function CustomGeometry() {
  // Create a custom geometry
  const geometry = new THREE.BufferGeometry();
  // Define vertices
  const vertices = new Float32Array([
    -1, -1, 0, // Vertex 1
     1, -1, 0, // Vertex 2
     1,  1, 0, // Vertex 3

  ]);

  // Define faces (indices)  
  const indices = new Uint16Array([0, 1, 2]); 

  // Set attributes
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  console.log(geometry.vertices?.length)
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="teal" side={THREE.DoubleSide} />
    </mesh>
  );
}

export default CustomGeometry;

export function PointGeometry(){
  // Create a custom geometry for points
  const geometry = new THREE.BufferGeometry();

  // Define vertices for points
  const vertices = new Float32Array([
    -1, -1, 0, // Point 1
     1, -1, 0, // Point 2
     1,  4, 0, // Point 3
  ]);

  // Set attributes
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  return (
    <points geometry={geometry}>
      <pointsMaterial color="blue" size={0.1} />
    </points>
  );
}
export function CustomBox() {
  const meshRef = useRef();
  const geometry = useMemo(() => {
  const geom = new THREE.BufferGeometry();

    // 8 vertices of a cube
  const vertices = new Float32Array([
      -0.5, -0.5,  0.5, // 0 front-bottom-left
       0.5, -0.5,  0.5, // 1 front-bottom-right
       0.5,  0.5,  0.5, // 2 front-top-right
      -0.5,  0.5,  0.5, // 3 front-top-left
      -0.5, -0.5, -0.5, // 4 back-bottom-left
       0.5, -0.5, -0.5, // 5 back-bottom-right
       0.5,  0.5, -0.5, // 6 back-top-right
      -0.5,  0.5, -0.5  // 7 back-top-left
    ]);

  // Index order to form triangles (2 per face × 6 faces)
  const indices = [
      // front
      0, 1, 2,
      2, 3, 0,

      // right
      1, 5, 6,
      6, 2, 1,

      // back
      5, 4, 7,
      7, 6, 5,

      // left
      4, 0, 3,
      3, 7, 4,

      // top
      3, 2, 6,
      6, 7, 3,

      // bottom
      4, 5, 1,
      1, 0, 4
    ];

  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals(); // for lighting

    return geom;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      // meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="tomato" />
    </mesh>
  );
}
export function CustomCube() {
  const geometry = new THREE.BufferGeometry();
  const v2=new Float32Array([0,0,0,1,0,0,0,1,0,1,1,0,0,0,1,1,0,1,0,1,1,1,1,1,])
  const indices=[0,1,2,1,3,2,1,5,3,3,7,5,5,6,7,5,4,6,0,6,2,0,6,4,0,1,4,1,5,4,2,3,6,3,7,6,]
  geometry.setAttribute('position', new THREE.BufferAttribute(v2, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals()
  // geometry.translate(-1, 0, 0); // Move geometry left
// geometry.rotateY(Math.PI / 2); // Rotate around Y at new origin
const ref= useRef();
  useFrame(() => {
    if (ref.current) {
      // ref.current.rotation.x += 0.01;
      // if( ref.current.scale.y < 5){
      //    ref.current.scale.y += 0.1;
      // }
    } 
  });
  return (
    <mesh geometry={geometry} ref={ref}  position={[0, 0, 0]} scale={[1, 1, 1]}>
      <meshStandardMaterial color="orange" side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Triangle(){
  const vertices = new Float32Array([
     0,0,0,
     1,0,0,
     1,1,0
  ]);

  return(
    <mesh>
      <bufferGeometry attach="geometry" attributes={{ position: new THREE.BufferAttribute(vertices, 3) }} />
      <meshStandardMaterial color="purple" side={THREE.DoubleSide} />
    </mesh>
  )
}

// Lath geometry shape around z axis 
export function LatheGeometry() {
  const geometry = useMemo(() => {
    const points = [];
    // Complex profile: wave pattern with varying radius
    for (let i = 0; i < 20; i++) {
      const radius = Math.sin(i * 0.3) * 1.5 + 3.5;
      const height = (i - 10) * 0.8;
      points.push(new THREE.Vector2(radius, height));
    }
    return new THREE.LatheGeometry(points, 64);
  }, []);

  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="cyan" side={THREE.DoubleSide} />
    </mesh>
  );
}

const points=[
  { z: 0,   r:0 },   // cap 
  { z: 0,   r: 1.2 },   // start
  { z: 1,   r: 1.2 },   // step 1 length
  { z: 1,   r: 0.8 },   // sharp step
  { z: 2.5, r: 0.8 },   // step 2
  { z: 3, r: 0.5 },   // sharp step
  { z: 4,   r: 0.5 } ,   // end
  { z: 4,   r: 0 }    // end cap
]
export function CustomLatheGeometry(props){
  const geometry=useMemo(()=>{
    const point=[...points.map((i)=>{return new THREE.Vector2(i.r,i.z)})]
    return new THREE.LatheGeometry(point,64)
  },[])
    return (
    <mesh geometry={geometry} {...props}> 
      <meshStandardMaterial color="cyan" side={THREE.DoubleSide} />
    </mesh>
  )
}