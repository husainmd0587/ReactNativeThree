import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import CanvaProvider from '../../provider'
import Robot1 from './robots/robo1'
import Robot2 from './robots/robo2'
const Robots = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f6f6f8',maxHeight:600 }}>
    <CanvaProvider camPosition={[1, 1, -6]}  >
        {/* <Robot1 /> */}
        <Robot2 />
    </CanvaProvider>
     
  </View>
  )
}

export default Robots

const styles = StyleSheet.create({})