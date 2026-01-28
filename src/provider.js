import React, { Suspense, useMemo,useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { PerspectiveCamera, Vector3 } from 'three';
import useControls from 'r3f-native-orbitcontrols';
import { Lightings } from './components/three3d_Objects/lights';
import styles from './utils/css/css';
import { CanvaOnCreated, Fallback } from './utils/canvaConfig';
import { playSpindle,stopSpindle,releaseSpindle } from './utils/sound/audio/spindleSound'
import OrbitGestureProvider,{CameraOrbitController,useGestureBridge} from './utils/getsureUtility';

const AppProvider = ({children}) => {
  const [customGesture,setCustomGesture]=useState(false)
  const { width, height } = useWindowDimensions();
  const [OrbitControls, events] = useControls();
  const [sound,setSound]=useState(true)
  const camera = useMemo(() => {
    const cam = new PerspectiveCamera(75, width / height, 0.1, 1000);
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    return cam;
  }, [width, height]);

  const changePlane = (pos) => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(new Vector3(0, 0, 0));
  };
    useEffect(() => {
    // playSpindle();
    return () => {
      stopSpindle();
      releaseSpindle();
    };
  }, []);

  const gesture = useGestureBridge()
  return (
    <OrbitGestureProvider  
     enabled={customGesture}    
     onGestureChange={gesture.onGestureChange}
    onGestureEnd={gesture.onGestureEnd}>

      <View style={{ flex: 1 }}  {...(!customGesture ? events : {})}>   
      <Canvas
        camera={camera}
        shadows
        dpr={[1, 2]}
        gl={{ physicallyCorrectLights: true }}
        onCreated={CanvaOnCreated}
        fallback={Fallback}>
        <Suspense fallback={null}>
        <CameraOrbitController vx={gesture?.vx} vy={gesture?.vy}  enabled={customGesture}/>  
    
    { children}

        </Suspense>
        <color attach="background" args={['#87CEEB']} />
        <Lightings />
         {!customGesture?<OrbitControls />:''}
      </Canvas>
    
      <View style={styles.xyzPlaneContainer}>
        <TouchableOpacity
          onPress={() => changePlane([0, 0, 10])}
          style={styles.xyzPlanebtn}
        >
          <Text style={styles.xyzPlanetxt}>XY Plane</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changePlane([10, 0, 0])}
          style={styles.xyzPlanebtn}
        >
          <Text style={styles.xyzPlanetxt}>YZ Plane</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changePlane([0, 10, 0])}
          style={styles.xyzPlanebtn}
        >
          <Text style={styles.xyzPlanetxt}>XZ Plane</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changePlane([10, 10, 10])}
          style={styles.xyzPlanebtn}
        >
          <Text style={styles.xyzPlanetxt}>Isometric</Text>
        </TouchableOpacity>

          <TouchableOpacity
          onPress={() =>{sound?(stopSpindle()):(playSpindle());setSound(!sound)}}
          style={styles.xyzPlanebtn}
        >
          <Text style={styles.xyzPlanetxt}>{sound?'🔊':'🔈'}</Text>
        </TouchableOpacity>
 
      </View>
    </View>
    </OrbitGestureProvider>
  
  );
};

export default AppProvider;
