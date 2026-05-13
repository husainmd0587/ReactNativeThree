import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import CanvaProvider from '../../../provider'
import CNC from './cnc'

const CNCHome = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f6f6f8',maxHeight:600 }}>
    <CanvaProvider camPosition={[1, 1, -4]}  >
        <CNC />
    </CanvaProvider> 
  </View>
  )
}

export default CNCHome

const styles = StyleSheet.create({})