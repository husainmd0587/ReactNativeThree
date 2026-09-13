import Model3DPreview from '../../../../utils/components/glbPreview';

import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const RobotMan = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
     <Model3DPreview 
              modelUrl={'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/RobotsModals/compressed_robot.glb'} 
              soundUrl={'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/RobotsModals/robot.mp3'}
              camPosition={[3, 3, 7]} 
            />
    </View>
  )
}

export default RobotMan

const styles = StyleSheet.create({})    