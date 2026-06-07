import {  View,Text,StyleSheet, TouchableOpacity,SafeAreaView,  StatusBar} from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Sketch2D from './2d_Old/2dShapes/Sketch2D'
import ToThreeDScreen from './2d_Old/2dShapes/threeD'
import Sketching2D from './Sketching2D/main'
import GDTLibrary from './GD&T/gd&t'
import Main3D from './3d/main'
import DrawingHome from './drwaing&3D/drawingHome'

export const NavigationMain = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>3D CAD Studio</Text>
        <Text style={styles.subtitle}>Build • Design • Create</Text>
      </View>
      <View style={styles.cardContainer}>
        {
          AllScreens
            .filter(s => s.showInMenu !== false)
            .map(screen => (
              <TouchableOpacity
                key={screen.name}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => navigation.navigate(screen.name)}
              >
                <Text style={styles.cardText}>
                  {screen.name}
                </Text>
              </TouchableOpacity>
            ))
        }
      </View>
    </SafeAreaView>
  )
}

const AllScreens = [
  { name: 'Sketching2D', component: Sketching2D },
  // { name: 'Sketch2D', component: Sketch2D },
  {name:'Engineering Drwaing and 3D',component:DrawingHome},
  { name: 'Main3D', component: Main3D ,showInMenu:false},
  {name:'GDandT',  component:GDTLibrary}
]

const Stack = createNativeStackNavigator()
const HomeCad = () => {
  return (
  
      <Stack.Navigator>
        <Stack.Screen name='Main' component={NavigationMain} options={{headerShown:false}} />
         {AllScreens.map(screen => (<Stack.Screen  key={screen.name}  name={screen.name}  component={screen.component}  options={{headerShown:false}} /> ))}    
      </Stack.Navigator>

  )
}

export default HomeCad


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20
  },

  header: {
    marginTop: 40,
    marginBottom: 30
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1
  },

  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 5
  },

  cardContainer: {
    flex: 1
  },

  card: {
    backgroundColor: '#1e293b',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 15,
    elevation: 6, // Android shadow
  },

  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#38bdf8'
  }

})