import {  View,Text,StyleSheet, TouchableOpacity,SafeAreaView,  StatusBar,ScrollView} from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AllGcodeMcode } from './components/data'
import G0 from "./gcodes/code/g0/g0";
import G0_sim from "./gcodes/code/g0/g0_sim";
import Turning from './turning/cncTurningDemo'
import Parser from './turning/gcode/paerserHome';


export const AllScreens = [
  { name:'G0', component: G0},
  { name:'G0_Sim', component: G0_sim},
  { name:'CNCTurning', component: Turning},
  {name:'Parser',component:Parser}
]


const Stack = createNativeStackNavigator()
const HomeTurningMilling = () => {
  return (
      <Stack.Navigator>
        <Stack.Screen name='Home' component={Home} options={{headerShown:false}} />
         {AllScreens.map(screen => (<Stack.Screen  key={screen.name}  name={screen.name} 
          component={screen.component}  options={{headerShown:false}} /> ))}    
      </Stack.Navigator>

  )
}

export default HomeTurningMilling
//****************** Main home screen ************************** */
export const Home = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Learn CNC G-Code Programming</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{marginTop:10}}>
          <Text style={styles.subtitle}>• Read • Update • Test</Text>
          <TouchableOpacity style={{marginLeft:20,backgroundColor:'#f0cf62'}}>
            <Text style={styles.subtitle}>Main parts of cnc machines</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <View style={[styles.cardContainer,{backgroundColor:'#9596f7',marginBottom:20}]}>
         <TouchableOpacity onPress={() => navigation.navigate('CNCTurning')}
         style={[styles.card,{backgroundColor:'#f0cf62',width:'100%'}]} >
           <Text style={styles.cardText}>⚙️ CNC TURNING OPERATIONS (Lathe)</Text>
         </TouchableOpacity>
            <TouchableOpacity style={[styles.card,{backgroundColor:'#f0cf62',width:'100%'}]} 
         >
           <Text style={styles.cardText}>🛠️ CNC MILLING OPERATIONS</Text>
         </TouchableOpacity>
      </View>
      <View style={styles.cardContainer}>
            {
              AllGcodeMcode.map((item,index) => {
                const backgroundColor = (index % 6) < 3 ? '#1e293b' : '#4f806b';
                return (
                <TouchableOpacity key={index} style={[styles.card,{backgroundColor}]} 
                onPress={() => navigation.navigate(item.name, { command: item })}>
                  <Text style={styles.cardText}>{item.name}</Text>
                </TouchableOpacity>
              )
              }
            
            )
            } 
      </View>
    <View style={[styles.cardContainer,{backgroundColor:'#f7b495',marginVertical:20}]}>
          <TouchableOpacity style={[styles.card,{backgroundColor:'#7f90f3',width:'100%'}]} 
         >
           <Text style={styles.cardText}>⚙️ CNC TURNING TOOLS ANS INSERTS</Text>
         </TouchableOpacity>
          <TouchableOpacity style={[styles.card,{backgroundColor:'#7f90f3',width:'100%'}]} 
         >
           <Text style={styles.cardText}>🛠️ CNC MILLING TOOLS</Text>
         </TouchableOpacity>
        
        <TouchableOpacity  onPress={()=>{navigation.navigate('Parser')}} style={[styles.card,{backgroundColor:'#7f90f3',width:'100%'}]} 
         >
           <Text style={styles.cardText}>Parser</Text>
         </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({

  container: {
    backgroundColor: '#95c2fd',
    paddingHorizontal: 20
  },

  header: {
    marginTop: 10,
    marginBottom: 30
  },

  title: {
    fontSize: 30,
    fontFamily:'Oswald-Light',
    color: '#ffffff',
    letterSpacing: 1
  },

  subtitle: {
    fontSize: 16,
    color: '#000',
    fontFamily:'Oswald-Bold',
  },

  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection:'row',
    flexWrap:'wrap',
    padding: 10,
    gap:10
  },

  card: {
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 6,
    width:100,
    alignItems:'center',
     justifyContent:'center'
  },

  cardText: {
    fontSize: 18,
    fontFamily:'Oswald-SemiBold',
    color:'#fff',
  }

})