import {useRef, useMemo,useState, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {ExtrudeGeometry, Shape, Vector2} from 'three';
import { SpriteText } from 'expo-three'
import {  createFilledExtrudeGeometry} from './utils/utils';
import { heartOutline } from './data/data';
import * as THREE from 'three'


export const Box = ({
  position = [0, 1, 0],
  size = [2, 1, 1],
  color = 'red',
}) => {
  const ref = useRef();
  useFrame((state, delta) => {
    ref.current.rotation.x += 0.005;
    ref.current.rotation.z += 0.001;
  });
  return (
    <mesh position={position} ref={ref}>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color={color} />
    </mesh>
  );
};
export const Cylinder = ({
  position = [0, 1, 0],
  size = [1, 1, 2, 20],
  color = 'red',
  rotation=[2, 1, 0]
}) => {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
export const Capsule = ({
  position = [0, 1, 0],
  size = [2, 1, 1, 1],
  color = 'red',
}) => {
  return (
    <mesh position={position}>
      <capsuleGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
export const Cone = ({
  position = [0, 1, 0],
  size = [2, 1, 1],
  color = 'red',
}) => {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
export const Plane = ({position = [0, 1, 0], size = [1, 1], color = 'red'}) => {
  return (
    <mesh position={position}>
      <coneGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
export const Toras = ({
  position = [0, 1, 0],
  size = [10, 1, 260, 6, 10, 16],
  color = 'red',
  speed = 1,
}) => {
  const ref = useRef();
  useFrame((state, delta) => {
    //  ref.current.rotation.z += .01*speed
  });
  return (
    <>
      <mesh position={position} scale={0.09} ref={ref}>
        <torusKnotGeometry radius={10} args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
};
export const Tube = ({
  position = [0, 1, 0],
  size = [2, 1, 1],
  color = 'red',
}) => {
  return (
    <mesh position={position}>
      <tubeGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};
export const Shapes = ({position = [0, 0, 0]}) => {
  return (
    <mesh position={position}>
      <tubeGeometry />
      <meshStandardMaterial />
    </mesh>
  );
};
export function CustomGeometry() {
  // Define vertices for a square
  const vertices = new Float32Array([
    -1,
    -1,
    0, // Vertex 1
    1,
    -1,
    0, // Vertex 2
    1,
    1,
    0, // Vertex 3
    -1,
    1,
    0, // Vertex 4
  ]);

  // Define indices to create two triangles
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  // Define normals (perpendicular vectors for lighting)
  const normals = new Float32Array([
    0,
    0,
    1, // Normal for Vertex 1
    0,
    0,
    1, // Normal for Vertex 2
    0,
    0,
    1, // Normal for Vertex 3
    0,
    0,
    1, // Normal for Vertex 4
  ]);

  // Define UVs (texture coordinates)
  const uvs = new Float32Array([
    0,
    0, // UV for Vertex 1
    1,
    0, // UV for Vertex 2
    1,
    1, // UV for Vertex 3
    0,
    1, // UV for Vertex 4
  ]);

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={vertices}
          itemSize={3}
          count={4}
        />
        <bufferAttribute
          attach="attributes-normal"
          array={normals}
          itemSize={3}
          count={4}
        />
        <bufferAttribute
          attach="attributes-uv"
          array={uvs}
          itemSize={2}
          count={4}
        />
        <bufferAttribute
          attach="index"
          array={indices}
          itemSize={1}
          count={6}
        />
      </bufferGeometry>
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
export function Line({
  points = [
    [-1, 0, 0], //start ponit
    [1, 0, 0], //end pont
  ],
}) {
  const vertices = new Float32Array(points.flat());
  return (
    <line position={[1, -3, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Attach to the position attribute
          array={vertices} // Pass the vertices array
          itemSize={3} // Each vertex has 3 values (x, y, z)
          count={points.length} // Total number of vertices
        />
      </bufferGeometry>
      <lineBasicMaterial color="red" />
    </line>
  );
}
export function Circle({position = [0, 1, 0]}) {
  return (
    <mesh position={position}>
      <circleGeometry args={[1, 50]} />
      <meshBasicMaterial color={'red'} />
    </mesh>
  );
}

export function CustomShape({
  outline=heartOutline,
  position = [0, 0, 0],
  color = 'orange',
}) {
  const geometry = useMemo(
    () => createFilledExtrudeGeometry({ outline, depth: 16 }),
    [outline]
  )

  return (
    <mesh position={position} geometry={geometry}>
    <meshStandardMaterial
  color="#ff6a00"
  side={THREE.DoubleSide}
  metalness={0.2}
  roughness={0.6}
/>
    </mesh>
  )
}
// shape with extrude

export function CustomExtrudedShape({length=100,width=50,feed=0.001,finalLength=50} ) {
  const [depth, setDepth] = useState(5);
  const [increase, setIncrease] = useState(false);

  // console.log(depth)
  const shape = useMemo(() => {
    const s = new Shape();
    s.absarc(0, 0, 1, 0, Math.PI * 1.99, false,32); // Create a circle shape
    const hole = new Shape();
    hole.absarc(0, 0, 0.5, 0, Math.PI * 1.99, false); // Create a smaller circle shape to be used as a hole
    s.holes.push(hole);
    return s;
  }, []);
  const ref = useRef();   
  
  useFrame(async(state, delta) => {
    if(increase) {
      ref.current.rotation.z += 0.05; 
      ref.current.scale.z += feed;
      if (ref.current.scale.z*length >= length) {
        setIncrease(false);
      } 
    }else{
       
        ref.current.rotation.z -= 0.05; 
        ref.current.scale.z-=feed;
        if (ref.current.scale.z*length <= finalLength) {
          setIncrease(true);
        }
      }
     
  }); 
  console.log(ref.current?.scale)  
  return (
    <mesh position={[0, -5, -5]} ref={ref}>
      <extrudeGeometry 
        args={[
          shape,
          {
            steps: 100, // Increase this for smoother extrusion
            depth: depth,
            bevelEnabled: true,
            bevelSegments: 10, // More segments for smoother bevels
            bevelSize: 0,
            bevelThickness: 0,
          },
        ]}
      />
      <meshStandardMaterial
        color="white"
        flatShading={false} // Ensure this is false
        roughness={0}
        metalness={0.5}
      />
    </mesh>
  );
} 

export const Text3D=()=>{
    const textRef = useRef()
  
  useEffect(() => {
    if (textRef.current) {
      textRef.current.text = "Hello Sprite"
      textRef.current.color = '#0000'
      textRef.current.fontSize = 50
    }
  }, [])
  return(
  <sprite ref={textRef} position={[0, 0, 0]} />
      )
}

const VertexBasic=()=>{

  return(
    <mesh position={[0, 0, 0]}>

    </mesh>
  )
}




export function LatheCylinder({
  radius = 1,
  length = 4,
  segments = 64,
}) {
  const { positions, indices } = useMemo(() => {
    const positions = []
    const indices = []
    const half = length / 2

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const x = Math.cos(theta) * radius
      const y = Math.sin(theta) * radius

      positions.push(x, y, -half)
      positions.push(x, y, half)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3

      indices.push(a, b, d)
      indices.push(a, d, c)
    }

    return {
      positions: new Float32Array(positions),
      indices: new Uint16Array(indices),
    }
  }, [radius, length, segments])

  return (
    <bufferGeometry>
      <bufferAttribute
        attach="attributes-position"
        array={positions}
        count={positions.length / 3}
        itemSize={3}
      />
      <bufferAttribute
        attach="index"
        array={indices}
        count={indices.length}
        itemSize={1}
      />
    </bufferGeometry>
  )
}

