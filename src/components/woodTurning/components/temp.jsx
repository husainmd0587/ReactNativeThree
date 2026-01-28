import { StyleSheet, View } from 'react-native'
import React from 'react'
import { Canvas } from '@react-three/fiber/native'
import useControls from "r3f-native-orbitcontrols"
import { CanvaOnCreated } from '../../../utils/canvaConfig'
import { Suspense } from 'react'
import { Line } from '../../three3d_Objects/shapes'
import { Lightings } from '../../three3d_Objects/lights'
import { CustomExtrudedShape } from './extrude'


const Temp = () => {
    const [OrbitControls, events] = useControls();
    return (
        <View style={{flex:1}} {...events}>
            <Canvas  gl={{ physicallyCorrectLights: true }} onCreated={CanvaOnCreated} 
            shadows={true} fallback={null} >
                <Suspense >
                  <CustomExtrudedShape/>
                </Suspense><color attach="background" args={['#87CEEB']} />
                <Lightings />
                <OrbitControls />
            </Canvas>
        </View>
    )
}

export default Temp

const styles = StyleSheet.create({})