import React from 'react';

export const Lightings = () => {
  return (
    <>
      <ambientLight intensity={1} />

      <directionalLight
        position={[10, 10, 10]}
        intensity={10}
        castShadow
      />

      <directionalLight
        position={[-10, 5, -10]}
        intensity={10}
      />

      <axesHelper args={[5]} />
    </>
  );
};


// export const PLight = () => {
//     return (
//         <>

//             <pointLight position={[0, -1, 0]} intensity={2} />
//             <pointLight position={[0, 1, 1]} intensity={1} />
//         </>
//     )
// }

// export const DLight = () => {
//     <directionalLight
//         castShadow
//         position={[0, 10, 0]}
//         shadow-mapSize={[1024, 1024]}
//         shadow-camera-far={50}
//         shadow-camera-left={-10}
//         shadow-camera-right={10}
//         shadow-camera-top={10}
//         shadow-camera-bottom={-10}
//     />
// }