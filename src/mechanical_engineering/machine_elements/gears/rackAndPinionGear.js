import { useRef, useMemo,useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import { useGLTF } from '../../../hooks/useGLTF'

const MODEL_URL = require('../../../assets/glb/rackandpinion_gear.glb')
import Privider from '../../../provider';
import { BottomNav } from './GearHome'
const GEAR_RADIUS = 1
const ANGULAR_SPEED = .4
const RACK_HALF_TRAVEL = 2
const LINEAR_SPEED = ANGULAR_SPEED * GEAR_RADIUS


import { View,Text,ScrollView,TouchableOpacity,Dimensions ,StyleSheet} from 'react-native'
const {height}=Dimensions.get('window')

function Scene(props) {
  const group = useRef()
  const meshRefs = useRef({})
  const rackOffset = useRef(0)
  const direction = useRef(1)         // +1 = forward, -1 = reverse

  const { scene, ready } = useGLTF(MODEL_URL)

  useMemo(() => {
    if (!scene) return
    scene.traverse((child) => {
      if (!child.isMesh) return
      meshRefs.current[child.name] = child
      if (child.parent) meshRefs.current[child.parent.name] = child.parent

      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({ color: 'gray', metalness: 0.6, roughness: 0.2 })
          break
        case 'mesh_1':
          child.material = new MeshStandardMaterial({ color: 'gray', metalness: 0.7, roughness: 0.2 })
          break
      }
      child.material.needsUpdate = true
      child.castShadow = true
      child.receiveShadow = true
    })
  }, [scene])

  useFrame((_state, delta) => {
    const gear = meshRefs.current['Gear']
    const rack = meshRefs.current['Rack']

    // Advance rack position in current direction
    rackOffset.current += LINEAR_SPEED * delta * direction.current

    // Reverse direction smoothly at travel limits
    if (rackOffset.current >= RACK_HALF_TRAVEL) {
      rackOffset.current = RACK_HALF_TRAVEL   // clamp to boundary
      direction.current = -1                  // start returning
    } else if (rackOffset.current <= -RACK_HALF_TRAVEL) {
      rackOffset.current = -RACK_HALF_TRAVEL  // clamp to boundary
      direction.current = 1                   // start going forward
    }

    // Rack slides
    if (rack) {
      rack.position.x = rackOffset.current
    }

    // Pinion rotates in sync — direction flips automatically via direction.current
    if (gear) {
      gear.rotation.y += ANGULAR_SPEED * delta * direction.current
    }
  })

  if (!ready || !scene) return null

  return (
    <primitive ref={group} object={scene} {...props} />
  )
}


function  RackAndPinionGear({props,navigation}) {
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
  <Text style={styles.heading}>⚙️ Rack and Pinion Gear</Text>

  <Text style={styles.desc}>
    A rack and pinion gear is a mechanical system used to convert
    rotational motion into linear motion or linear motion into
    rotational motion. It consists of two main parts: a circular gear
    called the <Text style={{fontWeight:'bold'}}>Pinion</Text> and a
    straight toothed bar called the
    <Text style={{fontWeight:'bold'}}> Rack</Text>.
  </Text>

  <Text style={styles.desc}>
    When the pinion rotates, its teeth mesh with the rack and cause the
    rack to move in a straight line. This mechanism is widely used in
    automobiles, CNC machines, railway systems, robotics, and
    industrial machinery where precise linear movement is required.
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Rack and Pinion Gear Works
  </Text>

  <Text style={styles.desc}>
    Rack and pinion gears work on the principle of meshing teeth. The
    rotating pinion gear engages with the straight teeth of the rack.
    As the pinion rotates:
  </Text>

  <Text style={styles.desc}>
    • Clockwise rotation → Rack moves in one direction{'\n'}
    • Counterclockwise rotation → Rack moves in opposite direction{'\n'}
    • Converts rotary motion into straight-line motion{'\n'}
    • Also converts linear motion into rotary motion
  </Text>

  {/* Main Parts */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of Rack and Pinion
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Pinion Gear</Text>
    <Text style={styles.cardText}>
      A small circular gear that rotates and drives the rack.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Rack</Text>
    <Text style={styles.cardText}>
      A straight toothed bar that converts rotational motion into
      linear motion.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Teeth</Text>
    <Text style={styles.cardText}>
      Gear teeth mesh together for smooth power transmission and motion
      conversion.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Shaft</Text>
    <Text style={styles.cardText}>
      Supports the pinion and transmits rotational movement.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Housing / Guide</Text>
    <Text style={styles.cardText}>
      Helps maintain alignment and supports smooth rack movement.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Rack and Pinion Gear
  </Text>

  <Text style={styles.desc}>
    ✅ Converts rotary motion into linear motion{'\n'}
    ✅ Simple and compact mechanism{'\n'}
    ✅ High accuracy and control{'\n'}
    ✅ Smooth movement{'\n'}
    ✅ Easy to maintain{'\n'}
    ❌ Limited travel length depending on rack size
  </Text>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Rack and pinion systems are manufactured from different materials
    based on strength and working conditions:
  </Text>

  <Text style={styles.desc}>
    • Steel – Heavy load systems{'\n'}
    • Alloy Steel – High durability{'\n'}
    • Cast Iron – Moderate load applications{'\n'}
    • Brass/Bronze – Low friction applications{'\n'}
    • Plastic/Nylon – Lightweight and quiet operation
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Rack and Pinion Gears
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Straight Rack and Pinion</Text>
    <Text style={styles.cardText}>
      Uses straight teeth and is commonly found in machines and steering
      systems.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Helical Rack and Pinion</Text>
    <Text style={styles.cardText}>
      Uses angled teeth for smoother and quieter operation.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Manual Rack and Pinion</Text>
    <Text style={styles.cardText}>
      Operated mechanically without motor assistance.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Power Rack and Pinion</Text>
    <Text style={styles.cardText}>
      Uses hydraulic or electric assistance for easier movement,
      especially in vehicles.
    </Text>
  </View>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • High accuracy movement{'\n'}
    • Simple construction{'\n'}
    • Easy installation and maintenance{'\n'}
    • Efficient power transmission{'\n'}
    • Compact mechanism
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • Wear can occur due to continuous tooth contact{'\n'}
    • Requires lubrication{'\n'}
    • Limited movement length{'\n'}
    • Can produce noise at high speed
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Rack and Pinion Gear
  </Text>

  <Text style={styles.desc}>
    Rack and pinion gears are widely used in engineering and machinery:
  </Text>

  <Text style={styles.desc}>
    🚘 Automobile steering systems{'\n'}
    🤖 Robotics and automation{'\n'}
    🏭 CNC and industrial machines{'\n'}
    🚆 Railway mechanisms{'\n'}
    🛗 Lifting systems{'\n'}
    ⚙️ Sliding gates and machine tools
  </Text>

  {/* Formula */}
  <Text style={styles.subHeading}>
    📐 Important Formula
  </Text>

  <View style={styles.formulaCard}>
    <Text style={styles.formula}>
      Linear Distance = Pitch × Number of Teeth
    </Text>
  </View>

  <Text style={styles.desc}>
    Example:{'\n'}
    Pitch = 5 mm{'\n'}
    Pinion Teeth = 20{'\n'}
    Linear Movement = 5 × 20 = 100 mm per revolution
  </Text>

  {/* Comparison */}
  <Text style={styles.subHeading}>
    ⚔️ Spur Gear vs Rack and Pinion
  </Text>

  <Text style={styles.desc}>
    Spur Gear → Rotary motion to rotary motion{'\n'}
    Rack & Pinion → Rotary motion to linear motion{'\n'}
    Spur Gear → Circular gears only{'\n'}
    Rack & Pinion → Circular gear + straight rack{'\n'}
    Spur Gear → Used for shaft power transmission{'\n'}
    Rack & Pinion → Used for movement and positioning
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    Rack and pinion gear is an important mechanical system used for
    converting rotational motion into linear motion. Due to its simple
    design, precision, and efficiency, it is widely used in steering
    systems, robotics, industrial automation, and machinery requiring
    straight-line movement.
  </Text>
    <BottomNav navigation={navigation} active='RackAndPinion' />
</ScrollView>
      )}
    </View>
  );
}


export default RackAndPinionGear;

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