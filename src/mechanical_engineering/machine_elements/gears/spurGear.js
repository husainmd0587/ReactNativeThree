if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import Privider from '../../../provider';
import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/spur_gear.glb')
import { BottomNav } from './GearHome'
// import { useTextureLoader } from '../assets/all_textures'

import { View,Text,ScrollView,TouchableOpacity,Dimensions ,StyleSheet} from 'react-native'
const {height}=Dimensions.get('window')


function Scene(props) {
  const group = useRef()
  const meshRefs = useRef({})

//   const texture = useTextureLoader('wood', 100, 100)

  const { scene, ready } = useGLTF(MODEL_URL)

  // Process scene ONLY ONCE
  useMemo(() => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh) return

      // Store mesh
      meshRefs.current[child.name] = child

      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }


      // Materials
      switch (child.name) {
        case 'mesh_00':
          child.material = new MeshStandardMaterial({
            // map: texture,
            metalness: 0.3,
            roughness: 0.7,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: 'gray',
            metalness: 0.9,
            roughness: 0,
          })
          break
      }

      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  // Animate gears
  useFrame((state, delta) => {
    const gear003 = meshRefs.current['Gear003']
    const gear005 = meshRefs.current['Gear005']

    // Rotate parent pivot nodes
    if (gear003) {
      gear003.rotation.y += delta * 2
    }

    if (gear005) {
      gear005.rotation.y -= delta * 2
    }
  })

  if (!ready || !scene) return null

  return (
    <primitive
      ref={group}
      object={scene}
      {...props}
    />
  )
}



function SpurGear({props,navigation}) {
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
        <Privider camPosition={[2, 7, 2]}>
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
  <Text style={styles.heading}>⚙️ Spur Gear</Text>

  <Text style={styles.desc}>
    A spur gear is one of the most common and simplest types of gear
    used in mechanical engineering. It contains straight teeth that are
    cut parallel to the axis of rotation. Spur gears are mainly used to
    transmit rotational motion and mechanical power between two parallel
    shafts with high efficiency and accurate speed ratio.
  </Text>

  <Text style={styles.desc}>
    Because of their simple design, low manufacturing cost, and high
    reliability, spur gears are widely used in machines, gearboxes,
    industrial equipment, clocks, conveyors, automobiles, and power
    transmission systems.
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Spur Gear Works
  </Text>

  <Text style={styles.desc}>
    Spur gears work by meshing the teeth of one gear with another.
    When the driving gear rotates, it pushes the teeth of the driven
    gear, causing it to rotate. The speed and torque depend on the
    number of teeth present on each gear.
  </Text>

  <Text style={styles.desc}>
    • Small driving gear → High speed, low torque{'\n'}
    • Large driven gear → Low speed, high torque{'\n'}
    • Equal size gears → Same speed transmission
  </Text>

  {/* Main Components */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of Spur Gear
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Teeth</Text>
    <Text style={styles.cardText}>
      Teeth are the projecting parts of the gear that mesh with another
      gear to transfer power and motion.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Pitch Circle</Text>
    <Text style={styles.cardText}>
      An imaginary circle where two gears are assumed to roll together
      without slipping.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Root Circle</Text>
    <Text style={styles.cardText}>
      The circle passing through the bottom of the gear teeth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Addendum</Text>
    <Text style={styles.cardText}>
      The radial distance between pitch circle and top of the tooth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Dedendum</Text>
    <Text style={styles.cardText}>
      The radial distance between pitch circle and root of the tooth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>6. Face Width</Text>
    <Text style={styles.cardText}>
      The width of the gear tooth measured parallel to the gear axis.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Spur Gear
  </Text>

  <Text style={styles.desc}>
    ✅ Simple and easy design{'\n'}
    ✅ High transmission efficiency (up to 98%){'\n'}
    ✅ Low manufacturing cost{'\n'}
    ✅ Suitable for parallel shafts{'\n'}
    ✅ Easy maintenance{'\n'}
    ❌ Produces noise at high speed
  </Text>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Spur gears are manufactured using different materials based on load
    and working conditions:
  </Text>

  <Text style={styles.desc}>
    • Steel – High strength applications{'\n'}
    • Cast Iron – Good wear resistance{'\n'}
    • Brass/Bronze – Low friction{'\n'}
    • Plastic/Nylon – Lightweight and quiet operation
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Spur Gears
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>External Spur Gear</Text>
    <Text style={styles.cardText}>
      Teeth are cut on the outer surface. Used in most machines.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Internal Spur Gear</Text>
    <Text style={styles.cardText}>
      Teeth are cut inside the gear ring and mesh internally.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Rack and Pinion</Text>
    <Text style={styles.cardText}>
      Converts rotary motion into linear motion.
    </Text>
  </View>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • High efficiency{'\n'}
    • Accurate speed ratio{'\n'}
    • Easy to design and manufacture{'\n'}
    • Compact size{'\n'}
    • Reliable operation
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • Noisy at high speed{'\n'}
    • Not suitable for non-parallel shafts{'\n'}
    • Can wear faster without lubrication
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Spur Gear
  </Text>

  <Text style={styles.desc}>
    Spur gears are used in many machines and industries:
  </Text>

  <Text style={styles.desc}>
    🚘 Automobile transmissions{'\n'}
    🏭 Industrial machinery{'\n'}
    ⌚ Mechanical watches & clocks{'\n'}
    ⚙️ Conveyor systems{'\n'}
    🔌 Electric motors{'\n'}
    🖨️ Printers and automation systems
  </Text>

  {/* Formula */}
  <Text style={styles.subHeading}>
    📐 Important Formula
  </Text>

  <View style={styles.formulaCard}>
    <Text style={styles.formula}>
      Gear Ratio = Number of Teeth of Driven Gear / Number of Teeth of
      Driver Gear
    </Text>
  </View>

  <Text style={styles.desc}>
    Example:{'\n'}
    Driver Gear Teeth = 20{'\n'}
    Driven Gear Teeth = 40{'\n'}
    Gear Ratio = 40 / 20 = 2:1
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    Spur gear is a simple, efficient, and widely used gear mechanism
    for transmitting power between parallel shafts. Due to its easy
    manufacturing, low cost, and high performance, it is one of the
    most important gears in mechanical engineering.
  </Text>
  <BottomNav navigation={navigation} active="SpurGear" />
</ScrollView>
      )}
    </View>
  );
}

export default SpurGear;

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