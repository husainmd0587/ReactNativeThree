// MainStack.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,SafeAreaView, StatusBar, Image, Animated,ScrollView,ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeCad from './create3D/home';
import HomeTurningMilling from './turning_milling/home';
import AllMeasuringTools from './mechanical_engineering/measurings/allmeasuringTools';
import MetalWeightCalculator from './mechanical_engineering/calculator/home';
import ShowGlb3D from './all_glb/showGlb3D';

const Stack = createNativeStackNavigator();

const AnimatedSlogan = ({ slogans, delay = 0 }) => {
  const [index, setIndex] = useState(0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // initial delay before starting loop
    const timeout = setTimeout(() => {

      // first animation IN
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // loop
      const interval = setInterval(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIndex(prev => (prev + 1) % slogans.length);
          slideAnim.setValue(20);

          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 3000);

      // cleanup interval
      return () => clearInterval(interval);

    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.sloganText,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {slogans[index]}
    </Animated.Text>
  );
};


// ── Navigation Main ────────────────────────────────────────────────────────
const NavigationMain = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Mechanical Engineering</Text>
        <Text style={styles.subtitle}>Build • Design • Create</Text>
      </View>
      <View style={styles.cardContainer}>
        {AllScreens
          .filter(s => s.showInMenu !== false)
          .map((screen, i) => (
            <TouchableOpacity
              key={screen.name}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => navigation.navigate(screen.name)}
            >
              {screen.image && (
                <Image
                  source={screen.image}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.cardOverlay}>
                {/* ── Show animated slogan if available, else screen name ── */}
                {screen.slogen ? (
                  <AnimatedSlogan slogans={screen.slogen} delay={i * 600}/>
                ) : (
                  <Text style={styles.cardText}>{screen.name}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
      </View>
      <View style={[styles.cardContainer,{backgroundColor:'#ffffa0',marginVertical:20,padding:10}]}>
        <Text style={styles.subtitle}>some tools that help you in your engineering journey</Text>

          <TouchableOpacity style={[styles.card,{backgroundColor:'#fff',width:'45%',height:120}]}
          onPress={() => navigation.navigate('Calculator')}>
            
            <ImageBackground  style={styles.toolsImage} resizeMode='contain'
            source={require('./assets/images/navigations/calculator.jpg')}>
             <Text style={styles.cardText}>metal weight calculator</Text>
            </ImageBackground>
          </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ── Screens Config ─────────────────────────────────────────────────────────
const AllScreens = [
  { name: 'Main', component: NavigationMain, showInMenu: false },
  {
    name: 'HomeCad',
    component: HomeCad,
    image: require('./assets/images/navigations/drawing_cad.png'),
    slogen: [
      'Unleash Your Creativity with Our CAD App!',
      'Design, Build, Innovate - Your CAD Journey Starts Here!',
      'From Concept to Creation: Experience the Power of Our CAD App!',
    ],
  },
  {
    name: 'HomeTurningMilling',
    component: HomeTurningMilling,
    image: require('./assets/images/navigations/turning.gif'),
    slogen: [
      'Learn CNC G-Code Programming with Our Interactive Turning App!',
      'Direct Test Your CNC G-Code in a Virtual Turning Environment!',
      'Transform Raw Materials into Precision Components!',
      'Experience the Art of Precision Turning!',
    ]},
  {
    name:'Mechanical measuring tools',
    component: AllMeasuringTools,
    image: require('./assets/images/navigations/measuring.png'),
      slogen: [
        'Master the Art of Precision with Our Mechanical Measuring Tools App!',
        'From Micrometers to Calipers: Your Ultimate Guide to Mechanical Measurement!',
        'Measure Twice, Cut Once - Learn with Our Mechanical Measuring Tools App!',
      ],
  }
  ,{
    name:'Calculator',
    component: MetalWeightCalculator,
  showInMenu: false},
  {
    name:'ShowGlb3D',
    component: ShowGlb3D, 
  }
];

// ── Main Stack ─────────────────────────────────────────────────────────────
export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {AllScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{ headerShown: false }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#c0a7e7',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 5,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    height: 250,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 6,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    // backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  toolsImage: {
    width: '100%',
    height: '100%',
  },
  sloganText: {
    fontSize: 16,
    color: '#000',
    fontWeight:'700',
    fontStyle:'italic',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
});