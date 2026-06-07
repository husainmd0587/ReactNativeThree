if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'ReactNative' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'ReactNative'
}

import { useRef, useMemo,useState } from 'react'
import { useFrame } from '@react-three/fiber/native'
import { MeshStandardMaterial } from 'three'
import Privider from '../../../provider';
import { useGLTF } from '../../../hooks/useGLTF'
const MODEL_URL = require('../../../assets/glb/bevel_gear.glb')
import { BottomNav } from './GearHome'
import { View,Text,ScrollView,TouchableOpacity,Dimensions ,StyleSheet} from 'react-native'
const {height}=Dimensions.get('window')
// import { useTextureLoader } from '../assets/all_textures'

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
      console.log('Processing mesh:', child.parent.name)
      // Store mesh
      meshRefs.current[child.name] = child

      // Store parent pivot node
      if (child.parent) {
        meshRefs.current[child.parent.name] = child.parent
      }


      // Materials
      switch (child.name) {
        case 'mesh_0':
          child.material = new MeshStandardMaterial({
            // map: texture,
             color:'gray',
            metalness: 0.8,
            roughness: 0,
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
    const gear1 = meshRefs.current['Gear001']
    const gear2 = meshRefs.current['Gear002']

    // Rotate parent pivot nodes
    if (gear1) {
      gear1.rotation.y += delta * 2
    }

    if (gear2) {
      gear2.rotation.x += delta * 2
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
function BevelGear({props,navigation}) {
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
  <Text style={styles.heading}>⚙️ Bevel Gear</Text>

  <Text style={styles.desc}>
    A bevel gear is a type of mechanical gear used to transmit power
    and rotational motion between intersecting shafts. Unlike spur
    gears, bevel gears are generally mounted on shafts that intersect
    at an angle, most commonly 90°. The teeth of bevel gears are cut
    on a cone-shaped surface, allowing motion transfer between
    perpendicular or angular shafts.
  </Text>

  <Text style={styles.desc}>
    Bevel gears are widely used in automobiles, differential systems,
    power tools, industrial machinery, marine equipment, and robotics
    where a change in rotational direction is required.
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Bevel Gear Works
  </Text>

  <Text style={styles.desc}>
    Bevel gears work by meshing two cone-shaped gears whose axes
    intersect. When the driving gear rotates, its teeth engage with
    the driven gear, transferring motion and torque at an angle.
  </Text>

  <Text style={styles.desc}>
    • Used for intersecting shafts{'\n'}
    • Common shaft angle = 90°{'\n'}
    • Changes direction of power transmission{'\n'}
    • Can increase torque or speed depending on gear size
  </Text>

  {/* Main Parts */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of Bevel Gear
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Teeth</Text>
    <Text style={styles.cardText}>
      Teeth are cut on a conical surface and mesh with another bevel
      gear to transfer power.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Pitch Cone</Text>
    <Text style={styles.cardText}>
      An imaginary cone used to determine the gear geometry and motion
      transfer.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Face Width</Text>
    <Text style={styles.cardText}>
      The width of the tooth measured along the pitch cone.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Addendum</Text>
    <Text style={styles.cardText}>
      Distance between pitch surface and tooth top.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Dedendum</Text>
    <Text style={styles.cardText}>
      Distance between pitch surface and tooth root.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>6. Shaft Angle</Text>
    <Text style={styles.cardText}>
      The angle between two intersecting shafts, commonly 90°.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Bevel Gear
  </Text>

  <Text style={styles.desc}>
    ✅ Transfers motion between intersecting shafts{'\n'}
    ✅ Can change rotational direction{'\n'}
    ✅ High torque transmission{'\n'}
    ✅ Compact and efficient design{'\n'}
    ✅ Smooth power transmission{'\n'}
    ❌ Requires precise alignment
  </Text>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Bevel gears are manufactured using materials selected according to
    load and working conditions:
  </Text>

  <Text style={styles.desc}>
    • Steel – High strength and heavy load systems{'\n'}
    • Alloy Steel – Better durability and wear resistance{'\n'}
    • Cast Iron – Moderate strength applications{'\n'}
    • Brass/Bronze – Reduced friction{'\n'}
    • Plastic/Nylon – Lightweight and low-noise systems
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Bevel Gears
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Straight Bevel Gear</Text>
    <Text style={styles.cardText}>
      Has straight teeth and is used for moderate-speed applications.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Spiral Bevel Gear</Text>
    <Text style={styles.cardText}>
      Curved teeth provide smoother and quieter operation at high
      speed.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Zerol Bevel Gear</Text>
    <Text style={styles.cardText}>
      Teeth are slightly curved and combine features of straight and
      spiral bevel gears.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Hypoid Gear</Text>
    <Text style={styles.cardText}>
      Similar to spiral bevel gears but shafts do not intersect.
      Commonly used in automobile differentials.
    </Text>
  </View>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • Changes direction of rotation easily{'\n'}
    • Suitable for high torque applications{'\n'}
    • Compact design{'\n'}
    • Smooth power transmission{'\n'}
    • Efficient performance
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • Manufacturing cost is higher{'\n'}
    • Requires precise alignment{'\n'}
    • More complex design than spur gears{'\n'}
    • Noise can occur in straight bevel gears
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Bevel Gear
  </Text>

  <Text style={styles.desc}>
    Bevel gears are widely used in engineering and machinery:
  </Text>

  <Text style={styles.desc}>
    🚘 Automobile differential systems{'\n'}
    ⚙️ Industrial machines{'\n'}
    🚢 Marine propulsion systems{'\n'}
    🔧 Power drills and hand tools{'\n'}
    🤖 Robotics and automation{'\n'}
    🏭 Heavy machinery
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
    Driver Gear Teeth = 15{'\n'}
    Driven Gear Teeth = 45{'\n'}
    Gear Ratio = 45 / 15 = 3:1
  </Text>

  {/* Comparison */}
  <Text style={styles.subHeading}>
    ⚔️ Spur Gear vs Bevel Gear
  </Text>

  <Text style={styles.desc}>
    Spur Gear → Used for parallel shafts{'\n'}
    Bevel Gear → Used for intersecting shafts{'\n'}
    Spur Gear → Straight cylindrical design{'\n'}
    Bevel Gear → Cone-shaped design{'\n'}
    Spur Gear → Cannot change shaft direction{'\n'}
    Bevel Gear → Changes shaft direction
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    Bevel gear is an important gear mechanism used for transmitting
    motion and power between intersecting shafts. Its ability to change
    the direction of rotation makes it highly useful in automotive,
    industrial, and mechanical systems.
  </Text>
    <BottomNav navigation={navigation} active='BevelGear' />
</ScrollView>
      )}
    </View>
  );
}


export default BevelGear;

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

