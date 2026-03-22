import { StyleSheet, Text, View,Dimensions } from 'react-native'
import React,{useEffect} from 'react'
import {Canvas, Path, Circle,Skia,Group} from "@shopify/react-native-skia";    

const { width, height } = Dimensions.get('window');

const Testing2 = () => {
const canvasHeight = 300;
const centerX = width / 2;
const centerY = canvasHeight / 2;
const points=[
    {x:0,y:0},
    {x:10,y:-10}
  ]
const path = Skia.Path.Make();
useEffect(()=>{
    path.moveTo(points[0].x, points[0].y);
    for(let i=1; i<points.length; i++){
        path.lineTo(points[i].x, points[i].y);
    }
},[])
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text>Testing</Text>
        <Canvas style={{ width: width, height: 300, backgroundColor: '#92a0f0' }}>  
              <Group transform={[{ translateX: centerX }, { translateY: centerY }]}>
          <Path path={path} color="#ff0037" style="stroke" strokeWidth={6} />
        </Group>
        </Canvas>
    </View>
  )
}

export default Testing2

const styles = StyleSheet.create({})