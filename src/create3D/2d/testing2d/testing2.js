import { StyleSheet, Text, View,Dimensions } from 'react-native'
import React,{useEffect} from 'react'
import {Canvas, Path, Circle,Skia} from "@shopify/react-native-skia";    

const { width, height } = Dimensions.get('window');

const Testing2 = () => {
const canvasHeight = 300;
const centerX = width / 2;
const centerY = canvasHeight / 2;
const points=[
    {x:centerX,y:centerY},
    {x:150,y:50}
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
      <Text>Testing2</Text>
        <Canvas style={{ width: width, height: 300, backgroundColor: '#92a0f0' }}>  
            <Path path={path} color="#ff0037" style="stroke" strokeWidth={6} />
        </Canvas>
    </View>
  )
}

export default Testing2

const styles = StyleSheet.create({})