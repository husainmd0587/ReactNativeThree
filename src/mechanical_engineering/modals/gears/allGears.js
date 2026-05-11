

import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Canvas } from '@react-three/fiber/native';
import Privider from '../../../provider';
    
import SpurGear from './spurGear';
import BevelGear from './bevelGear';
import HelicalGear from './helicalGear';
import RackAndPinion from './rackAndPinionGear';
import WormGear from './wormGear';

const AllGears = () => {

  return (
  <View style={{ flex: 1, backgroundColor: '#f6f6f8',maxHeight:600 }}>
    <Privider camPosition={[1, 1, -6]}  >
         <SpurGear />
         {/* <BevelGear /> */}
         {/* <HelicalGear /> */}
         {/* <RackAndPinion /> */}
         {/* <WormGear /> */}
   </Privider>
  </View>
  )
}

export default AllGears;

const styles = StyleSheet.create({})