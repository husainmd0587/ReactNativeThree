import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import CanvaProvider from '../../../provider'
import Engine from './engine'
import Engine3x from './engine3x'

const EngineHome = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f6f6f8',maxHeight:600 }}>
    <CanvaProvider camPosition={[1, 1, -4]}  >
        <Engine />
        {/* <Engine3x /> */}

    </CanvaProvider> 
  </View>
  )
}

export default EngineHome

const styles = StyleSheet.create({})