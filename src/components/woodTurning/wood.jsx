import { View,useWindowDimensions,StyleSheet } from 'react-native';
import { React, Suspense } from 'react';
import { Canvas } from '@react-three/fiber/native';
import useControls from "r3f-native-orbitcontrols"
import { Lightings } from '../three3d_Objects/lights';
import { CanvaOnCreated, Fallback } from '../../utils/canvaConfig';
import GroupsMesh from '../three3d_Objects/groupsMesh';


import { PerspectiveCamera} from 'three';

const Wood = () => {
    
  const {height, width} = useWindowDimensions();
  const [OrbitControls, events] = useControls();
   const camera = new PerspectiveCamera(75, width/height,1, 1000);   
  camera.position.set(0*(Math.PI / 180), 0*(Math.PI / 180),360*(Math.PI / 180)); 
  camera.lookAt(0, 0, 0);
  
  return (

    <View style={{ flex: 1 }} {...events}> 
      <View style={styles.mainConatainer}>
      </View>
      <Canvas camera={camera} gl={{ physicallyCorrectLights: true }} onCreated={CanvaOnCreated} shadows={true}  fallback={Fallback}  >
        <Suspense fallback={null}>
        <GroupsMesh rotate={{x:0,y:0,z:0}}/>

     

        </Suspense><color attach="background" args={['#87CEEB']} />
        <Lightings />
        <OrbitControls/>
      </Canvas>
    </View>
  );
};
export default Wood;
const styles = StyleSheet.create({
    mainConatainer:{
        height:'100%',
        width:'100%',
        position:'absolute',
        top:0,
        zIndex:1,
        backgroundColor:'#ccc',
        opacity:0.1
    }
})



