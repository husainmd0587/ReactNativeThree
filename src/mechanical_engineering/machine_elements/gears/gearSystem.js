if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo,useEffect,useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import Privider from '../../../provider';
import { useGLTF } from '../../../hooks/useGLTFonline'
import {useAnimations}  from '@react-three/drei/native'
const MODEL_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/glb/mechanical/gears/GearSystem.glb'
const MODAL2_URL='diffrential gear '
import { BottomNav } from './GearHome'
import { View,Text,ScrollView,TouchableOpacity,Dimensions ,StyleSheet} from 'react-native'
const {height}=Dimensions.get('window')

// import { useTextureLoader } from '../assets/all_textures'

function Scene(props) {


  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(
    animations,
    group
  )
 console.log(animations)
  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return
    scene.traverse((child) => {
      if (!child.isMesh) return
    //   console.log('Processing mesh:', child.name)
      // Store mesh
      meshRefs.current[child.name] = child

      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }
      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  useEffect(() => {
  
    // PLAY ALL ANIMATIONS
    names.forEach((name) => {
      const action = actions[name]

      if (action) {
        action.reset()
        action.fadeIn(0.5)
        action.play()

        // OPTIONAL
        action.timeScale = 1
      }
    })

    return () => {
      names.forEach((name) => {
        actions[name]?.fadeOut(0.5)
      })
    }
  }, [actions, names])


  if (!ready || !scene) return null

  return (
    <primitive
      ref={group}
      object={scene}
      {...props}
    />
  )
}




function GearSystem({props,navigation}) {
  const [fullView, setFullView] = useState(false);

  return (
    <View style={styles.container}>
      {/* 3D Viewer */}
      <View
        style={[
          styles.viewerContainer,
          {
            height: fullView ? height : 350,
          },
        ]}
      >
        <Privider camPosition={[1,1,250]}>
          <Scene {...props} />
        </Privider>

        {/* Full Screen Toggle */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFullView(!fullView)}
          style={styles.fullBtn}
        >
          <Text style={styles.icon}>
            {fullView ? '🗗' : '⛶'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!fullView && (
<ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.scrollContent}
>
  <Text style={styles.heading}>⚙️ Gear System</Text>

  <Text style={styles.desc}>
    A gear system is a mechanical arrangement of two or more gears used
    to transmit motion, power, and torque from one rotating shaft to
    another. Gears work by meshing their teeth together, allowing
    smooth and accurate transfer of rotational movement without
    slipping.
  </Text>

  <Text style={styles.desc}>
    Gear systems are widely used in automobiles, machines, robotics,
    industrial equipment, clocks, turbines, gearboxes, and heavy
    mechanical systems to control speed, torque, and direction of
    motion.
  </Text>

  <Text style={styles.desc}>
    The main purpose of a gear system is to:
    {'\n'}• Increase or decrease speed
    {'\n'}• Increase or decrease torque
    {'\n'}• Change direction of motion
    {'\n'}• Transfer power between shafts
    {'\n'}• Convert motion type in some mechanisms
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Gear System Works
  </Text>

  <Text style={styles.desc}>
    A gear system works by meshing gear teeth together. When one gear
    rotates (called the driver gear), it transfers motion to another
    gear (called the driven gear). The output speed and torque depend
    on the number of teeth and gear size.
  </Text>

  <Text style={styles.desc}>
    • Small gear driving large gear → Low speed, high torque{'\n'}
    • Large gear driving small gear → High speed, low torque{'\n'}
    • Equal gears → Same speed and torque transfer{'\n'}
    • Direction changes depending on gear arrangement
  </Text>

  {/* Main Components */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of a Gear System
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Driver Gear</Text>
    <Text style={styles.cardText}>
      The gear connected to the power source that provides motion.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Driven Gear</Text>
    <Text style={styles.cardText}>
      The gear that receives motion from the driver gear.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Shaft</Text>
    <Text style={styles.cardText}>
      Supports gears and transmits rotational movement.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Teeth</Text>
    <Text style={styles.cardText}>
      Meshing projections on gears used for motion and power transfer.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Bearings</Text>
    <Text style={styles.cardText}>
      Reduce friction and support rotating shafts.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>6. Housing</Text>
    <Text style={styles.cardText}>
      Protects gears and keeps alignment proper.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Gear System
  </Text>

  <Text style={styles.desc}>
    ✅ Accurate motion transfer{'\n'}
    ✅ No slipping during transmission{'\n'}
    ✅ High efficiency{'\n'}
    ✅ Speed and torque control{'\n'}
    ✅ Long operational life{'\n'}
    ❌ Requires lubrication and maintenance
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Gear Systems
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Spur Gear System</Text>
    <Text style={styles.cardText}>
      Used for parallel shafts with straight teeth. Simple and
      efficient.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Helical Gear System</Text>
    <Text style={styles.cardText}>
      Uses angled teeth for smooth and quiet operation.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Bevel Gear System</Text>
    <Text style={styles.cardText}>
      Used for intersecting shafts, commonly at 90°.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Worm Gear System</Text>
    <Text style={styles.cardText}>
      Provides high speed reduction and torque increase.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Rack and Pinion System</Text>
    <Text style={styles.cardText}>
      Converts rotational motion into linear motion.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>6. Planetary Gear System</Text>
    <Text style={styles.cardText}>
      Compact system with high torque capacity used in automatic
      transmissions.
    </Text>
  </View>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Gear systems are manufactured using different materials based on
    load, speed, and environment:
  </Text>

  <Text style={styles.desc}>
    • Steel – High strength applications{'\n'}
    • Alloy Steel – Heavy-duty systems{'\n'}
    • Cast Iron – Moderate loads{'\n'}
    • Bronze/Brass – Reduced friction{'\n'}
    • Plastic/Nylon – Lightweight and low-noise systems
  </Text>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • High efficiency{'\n'}
    • Accurate power transmission{'\n'}
    • No slipping{'\n'}
    • Can change speed and torque{'\n'}
    • Suitable for heavy loads
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • Requires lubrication{'\n'}
    • Noise may occur in some gear types{'\n'}
    • Higher manufacturing cost{'\n'}
    • Precise alignment needed
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Gear Systems
  </Text>

  <Text style={styles.desc}>
    Gear systems are widely used in engineering and industry:
  </Text>

  <Text style={styles.desc}>
    🚘 Automobile transmissions{'\n'}
    🏭 Industrial machinery{'\n'}
    🤖 Robotics systems{'\n'}
    ✈️ Aircraft mechanisms{'\n'}
    ⚙️ Conveyor systems{'\n'}
    ⌚ Clocks and watches{'\n'}
    🚢 Marine equipment{'\n'}
    🔌 Electric motors
  </Text>

<Text style={styles.subHeading}>
  📐 Important Formula
</Text>

<View style={styles.formulaCard}>
  <Text style={styles.formula}>
    Gear Ratio = Number of Teeth of Driven Gear / Number of Teeth of Driver Gear
  </Text>
</View>

  <Text style={styles.desc}>
    Example:{'\n'}
    Driver Gear Teeth = 20{'\n'}
    Driven Gear Teeth = 60{'\n'}
    Gear Ratio = 60 / 20 = 3:1
  </Text>

  {/* Comparison */}
  <Text style={styles.subHeading}>
    ⚔️ Belt Drive vs Gear System
  </Text>

  <Text style={styles.desc}>
    Belt Drive → May slip during transmission{'\n'}
    Gear System → No slipping{'\n'}
    Belt Drive → Less accurate{'\n'}
    Gear System → High accuracy{'\n'}
    Belt Drive → Suitable for long distances{'\n'}
    Gear System → Suitable for compact systems
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    A gear system is one of the most important mechanical power
    transmission systems used to transfer motion, speed, and torque
    efficiently. Different gear types are used for different purposes,
    making gear systems essential in automobiles, machines, robotics,
    and industrial engineering.
  </Text>
    <BottomNav navigation={navigation} active='GearSystem' />
</ScrollView>
      )}
    </View>
  );
}

export default GearSystem

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  viewerContainer: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  fullBtn: {
    position: 'absolute',
    left: 15,
    bottom: 15,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: 24,
    color: '#fff',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },

  desc: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },

  list: {
    fontSize: 16,
    lineHeight: 28,
    color: '#444',
  },
});