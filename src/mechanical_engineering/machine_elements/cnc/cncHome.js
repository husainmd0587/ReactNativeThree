import { StyleSheet, Text, View,TouchableOpacity,ScrollView } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CanvaProvider from '../../../provider'
import CNC from './cnc'
import Voxel from './voxal/voxal' 
import HeightMapCutting from './heightmap/heightmap'
import SDF from './sdf_signed_distance/sdf'
import Doxel from './dexel/doxel'
import Octree from './octree/octree'
import TriangleMesh from './triangle_mesh_cutting/triangle_mesh';
import PointCloud from './point_cloud/paint_cloude';
import GpuTexturing from './gpu_texture_curving/gpu';



const list=[
{  name:'CNC_machine',
   component:CNC,
   description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
  },
  {  name:'Voxel_Cutting',
   component:Voxel,
   description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
  },
 {
    name:'HeightMap_Cutting',
    component:HeightMapCutting,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 },
 {
    name:'SDF_Signed_Distance',
    component:SDF,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 },
 {
    name:'Doxel_Cutting',
    component:Doxel,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 },
  {
    name:'Octree_Cutting',
    component:Octree,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 },
 {   name:'Triangle_Mesh_Cutting',
   component:TriangleMesh,
   description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
   icon:'🛠️',
 },
 {
    name:'Point_Cloud_Cutting',
    component:PointCloud,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 },
 {
    name:'GPU_Texture_Curving',
    component:GpuTexturing,
    description:'Feed rate, spindle speed, G-code toolpaths, and machining ops.',
    icon:'🛠️',
 }
]

const CNCHomeScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAEEDA', padding: 10 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#854F0B' }}>CNC Machining</Text>
      <ScrollView>
        {
          list.map((item,index) => (
            <TouchableOpacity key={item.name} style={{ marginBottom: 10,backgroundColor: index%2 ? '#b9affa' : '#bbeef5',padding:10,borderRadius: 8 }} 
             onPress={() => navigation.navigate(item.name)} activeOpacity={0.7}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>{index + 1}. {item.name}</Text>
            <Text style={{ fontSize: 14, color: '#555', marginBottom: 5 }}>{item.description}</Text>
            <Text style={{ fontSize: 16, color: '#854F0B' }} >{item.icon} Explore</Text>
          </TouchableOpacity>
        ))
      }
      </ScrollView>
    </View>
  )
}

const Stack = createNativeStackNavigator();
const CNCHome = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="cnc_home_nav" component={CNCHomeScreen} />
      {
        list.map((item) => (
          <Stack.Screen key={item.name} name={item.name} component={item.component} />
        ))
      }
    </Stack.Navigator>
  )
}

export default CNCHome

const styles = StyleSheet.create({})