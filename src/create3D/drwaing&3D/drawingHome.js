import { StyleSheet, Text, View,ScrollView,TouchableOpacity,ImageBackground } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import Introduction from './components/introduction'
import LinesTypes from './components/linesTypes'
import Dimensioning from './components/dimensioning'
import SectionalViews from './components/sectionalView'
import Tolerancing from './components/tolerancing'
import Projections from './components/projection'
import Symbols from './components/symbols'

const Stack = createNativeStackNavigator()
const List=[
  {
    name:'Introduction',
    component:Introduction,
    icon:'📐',
  },
  {
    name:'Projections',
    component:Projections,
    icon:'📏',
  },
  {
    name:'Symbols',
    component:Symbols,
    icon:'🔣',
  },
  {
    name:'Lines Types',
    component:LinesTypes,
    icon:'📏',
  },
  {
    name:'Dimensioning',
    component:Dimensioning,
    icon:'📐',
  },
  {
    name:'Sectional Views',
    component:SectionalViews,
    icon:'👁️',
  },
  {
    name:'Tolerancing',
    component:Tolerancing,
    icon:'⚙️',
  }
]

const Main = ({ navigation }) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <ImageBackground
        source={{
          uri: 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/engineeringDrawing%26cad/drawing%263d/drwingBanner.jpg',
        }}
        style={styles.banner}
        imageStyle={styles.bannerImage}
      >
        <View style={styles.overlay}>
          <Text style={styles.heading}>
            Engineering Drawing & 3D
          </Text>

          <Text style={styles.subHeading}>
            Learn engineering drawing, projections,
            CAD and 3D concepts interactively.
          </Text>
        </View>
      </ImageBackground>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        Explore Topics
      </Text>

      {/* Topic List */}
      {List.map((item, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(item.name)}
          style={styles.card}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {item.icon}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.name}
            </Text>

            <Text style={styles.cardSubTitle}>
              Tap to explore topic
            </Text>
          </View>

          <Text style={styles.arrow}>
            →
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};




const DrawingHome = () => {
  return (
    <Stack.Navigator>
  <Stack.Screen name='Main' component={Main} options={{headerShown:false}} />
  {List.map(item=><Stack.Screen key={item.name} name={item.name} component={item.component} options={{headerShown:true}} />)}
  </Stack.Navigator>
    
  )
}

export default DrawingHome

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },

  banner: {
    height: 250,
    justifyContent: 'flex-end',
  },

  bannerImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  overlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },

  subHeading: {
    fontSize: 15,
    color: '#EAEAEA',
    marginTop: 8,
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 24,
    marginBottom: 14,
    marginLeft: 20,
  },

  card: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#FFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginVertical: 8,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EEF3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  icon: {
    fontSize: 28,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1D',
  },

  cardSubTitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },

  arrow: {
    fontSize: 22,
    color: '#777',
    fontWeight: 'bold',
  },
});
