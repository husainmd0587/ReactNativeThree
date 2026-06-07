if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo,useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import { BottomNav } from './GearHome'
import Privider from '../../../provider';
import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/worm_gear.glb')
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
      console.log('Processing mesh:', child.parent.name)
      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }


      // Materials
      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({
            // map: texture,
            color: '#999',
            metalness: 0.7,
            roughness: 0.2,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: 'gray',
            metalness: 0.7,
            roughness: 0.2,
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
    const gear = meshRefs.current['Gear']
    const gearShaft = meshRefs.current['Plane']

    // Rotate parent pivot nodes
    if (gear) {
      gear.rotation.y += delta * 0.2
    }

    if (gearShaft) {
      gearShaft.rotation.y += delta * 4
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

function WormGear({props,navigation}) {
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
  <Text style={styles.heading}>⚙️ Worm Gear</Text>

  <Text style={styles.desc}>
    A worm gear is a special type of mechanical gear system used to
    transmit power and motion between two non-parallel and
    non-intersecting shafts, usually arranged at a 90° angle. It
    consists of two main components:
    <Text style={{fontWeight:'bold'}}> Worm </Text>
    (a screw-like gear) and
    <Text style={{fontWeight:'bold'}}> Worm Wheel </Text>
    (a gear similar to a spur gear).
  </Text>

  <Text style={styles.desc}>
    When the worm rotates, its screw-shaped threads engage with the
    teeth of the worm wheel, causing it to rotate. Worm gears are
    widely used where high speed reduction, high torque, and compact
    power transmission are required.
  </Text>

  <Text style={styles.desc}>
    Worm gear systems are commonly used in elevators, conveyor systems,
    steering mechanisms, industrial machines, robotics, gates, and
    heavy lifting equipment.
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Worm Gear Works
  </Text>

  <Text style={styles.desc}>
    A worm gear works by meshing the screw-like worm with the worm
    wheel. As the worm rotates, its threads push against the worm wheel
    teeth and transfer rotational motion.
  </Text>

  <Text style={styles.desc}>
    • Transmits motion between perpendicular shafts{'\n'}
    • Provides high speed reduction{'\n'}
    • Produces high output torque{'\n'}
    • Allows smooth and quiet operation{'\n'}
    • Can provide self-locking capability
  </Text>

  {/* Main Parts */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of Worm Gear
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Worm</Text>
    <Text style={styles.cardText}>
      A screw-shaped rotating component that drives the worm wheel.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Worm Wheel</Text>
    <Text style={styles.cardText}>
      A gear that meshes with the worm and receives motion and power.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Threads</Text>
    <Text style={styles.cardText}>
      Helical grooves on the worm that engage the worm wheel teeth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Shaft</Text>
    <Text style={styles.cardText}>
      Supports the worm and worm wheel for smooth rotation.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Housing</Text>
    <Text style={styles.cardText}>
      Encloses and supports the gear system while protecting it from
      dust and damage.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Worm Gear
  </Text>

  <Text style={styles.desc}>
    ✅ High speed reduction ratio{'\n'}
    ✅ High torque output{'\n'}
    ✅ Smooth and silent operation{'\n'}
    ✅ Compact design{'\n'}
    ✅ Self-locking mechanism in some cases{'\n'}
    ❌ Lower efficiency due to friction
  </Text>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Worm gear systems are manufactured using different materials to
    reduce wear and friction:
  </Text>

  <Text style={styles.desc}>
    • Hardened Steel – Used for worm shaft{'\n'}
    • Bronze – Commonly used for worm wheel{'\n'}
    • Cast Iron – Moderate duty applications{'\n'}
    • Brass – Low friction systems{'\n'}
    • Plastic/Nylon – Lightweight low-load systems
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Worm Gears
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Single-Throat Worm Gear</Text>
    <Text style={styles.cardText}>
      The worm wheel partially wraps around the worm for improved
      contact.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Double-Throat Worm Gear</Text>
    <Text style={styles.cardText}>
      Both worm and worm wheel are curved for better tooth engagement.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Non-Throated Worm Gear</Text>
    <Text style={styles.cardText}>
      Simple worm gear design with lower contact area.
    </Text>
  </View>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • Very high gear reduction ratio{'\n'}
    • High torque transmission{'\n'}
    • Quiet and smooth operation{'\n'}
    • Compact size{'\n'}
    • Self-locking feature prevents reverse motion
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • Lower efficiency due to friction{'\n'}
    • Generates heat during operation{'\n'}
    • Requires proper lubrication{'\n'}
    • Higher wear if maintenance is poor
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Worm Gear
  </Text>

  <Text style={styles.desc}>
    Worm gears are widely used in mechanical and industrial systems:
  </Text>

  <Text style={styles.desc}>
    🛗 Elevators and lifts{'\n'}
    🏭 Industrial machinery{'\n'}
    🚪 Automatic gates and doors{'\n'}
    ⚙️ Conveyor systems{'\n'}
    🤖 Robotics and automation{'\n'}
    🚘 Vehicle steering systems{'\n'}
    🏗️ Heavy lifting equipment
  </Text>

  {/* Formula */}
  <Text style={styles.subHeading}>
    📐 Important Formula
  </Text>

  <View style={styles.formulaCard}>
    <Text style={styles.formula}>
      Gear Ratio = Number of Teeth on Worm Wheel / Number of Starts on
      Worm
    </Text>
  </View>

  <Text style={styles.desc}>
    Example:{'\n'}
    Worm Wheel Teeth = 40{'\n'}
    Worm Starts = 2{'\n'}
    Gear Ratio = 40 / 2 = 20:1
  </Text>

  {/* Comparison */}
  <Text style={styles.subHeading}>
    ⚔️ Spur Gear vs Worm Gear
  </Text>

  <Text style={styles.desc}>
    Spur Gear → Used for parallel shafts{'\n'}
    Worm Gear → Used for non-parallel shafts{'\n'}
    Spur Gear → Higher efficiency{'\n'}
    Worm Gear → Higher reduction ratio{'\n'}
    Spur Gear → Faster output speed{'\n'}
    Worm Gear → Higher torque output{'\n'}
    Spur Gear → No self-locking{'\n'}
    Worm Gear → Self-locking possible
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    Worm gear is a powerful mechanical transmission system used for
    high torque, smooth motion, and large speed reduction. Its compact
    design and self-locking capability make it highly useful in
    elevators, machinery, automation, and heavy-duty mechanical
    applications.
  </Text>
    <BottomNav navigation={navigation} active='WormGear' />
</ScrollView>
      )}
    </View>
  );
}

export default WormGear;

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