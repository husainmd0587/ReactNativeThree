

import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Canvas } from '@react-three/fiber/native';
import Privider from '../../../provider';
import BallBearing from './ball_bearings';
// import RollerBearing from './rollerBearing';
// import ThrustBearing from './thrustBearing';
// import TaperedBearing from './taperedBearing';
// import SphericalBearing from './sphericalBearing';
// import BearingSystem from './bearingSystem';
const AllGears = () => {

  return (
  <View style={{ flex: 1, backgroundColor: '#f6f6f8',maxHeight:600 }}>
    <Privider camPosition={[1, 1, -6]}  >
          <BallBearing />  
   </Privider>
  </View>
  )
}

export default AllGears;

const styles = StyleSheet.create({})