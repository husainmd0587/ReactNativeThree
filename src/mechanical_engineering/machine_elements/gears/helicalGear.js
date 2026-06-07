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
import { BottomNav } from './GearHome'
const MODEL_URL = require('../../../assets/glb/helical_gear.glb')
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
      console.log('Processing mesh:', child.name)
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
            color:'#ccc',
            metalness: 0.9,
            roughness: 0.1,
          })
          break

        case 'mesh_1':
          child.material = new MeshStandardMaterial({
            color: '#ccc',
            metalness: 0.9,
            roughness: 0.1,
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
    const gear003 = meshRefs.current['Gear']
    const gear005 = meshRefs.current['Gear002']

    // Rotate parent pivot nodes
    if (gear003) {
      gear003.rotation.y += delta * 0.5
    }

    if (gear005) {
      gear005.rotation.y -= delta * 0.5
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

function HelicalGear({props,navigation}) {
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
  <Text style={styles.heading}>⚙️ Helical Gear</Text>

  <Text style={styles.desc}>
    A helical gear is a type of mechanical gear used to transmit power
    and rotational motion between shafts. Unlike spur gears, helical
    gears have teeth cut at an angle (helix angle) to the gear axis
    rather than straight. Due to this angled tooth design, helical
    gears provide smoother, quieter, and more efficient power
    transmission.
  </Text>

  <Text style={styles.desc}>
    Helical gears are widely used in automobile gearboxes, industrial
    machinery, conveyors, turbines, compressors, robotics, and
    high-speed power transmission systems where smooth and quiet
    operation is required.
  </Text>

  {/* Working Principle */}
  <Text style={styles.subHeading}>
    ⚙️ How Helical Gear Works
  </Text>

  <Text style={styles.desc}>
    Helical gears work by meshing angled teeth gradually instead of
    engaging all at once like spur gears. As one tooth starts
    contacting another, the load is distributed progressively, reducing
    vibration and noise.
  </Text>

  <Text style={styles.desc}>
    • Smooth and quiet operation{'\n'}
    • Suitable for high-speed systems{'\n'}
    • Can transmit more load than spur gears{'\n'}
    • Used for parallel or crossed shafts
  </Text>

  {/* Main Parts */}
  <Text style={styles.subHeading}>
    🧩 Main Parts of Helical Gear
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>1. Teeth</Text>
    <Text style={styles.cardText}>
      Teeth are cut at an angle to the gear axis, enabling gradual and
      smoother engagement.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>2. Helix Angle</Text>
    <Text style={styles.cardText}>
      The angle formed between the gear tooth and the axis of rotation.
      It directly affects smoothness and load carrying capacity.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>3. Pitch Circle</Text>
    <Text style={styles.cardText}>
      An imaginary circle where the gears are assumed to roll together
      without slipping.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>4. Addendum</Text>
    <Text style={styles.cardText}>
      Radial distance between pitch circle and top of the tooth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>5. Dedendum</Text>
    <Text style={styles.cardText}>
      Radial distance between pitch circle and root of the tooth.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>6. Face Width</Text>
    <Text style={styles.cardText}>
      Width of the gear tooth measured parallel to the gear axis.
    </Text>
  </View>

  {/* Features */}
  <Text style={styles.subHeading}>
    ✨ Features of Helical Gear
  </Text>

  <Text style={styles.desc}>
    ✅ Smooth and quiet operation{'\n'}
    ✅ High load carrying capacity{'\n'}
    ✅ Suitable for high-speed applications{'\n'}
    ✅ Better tooth engagement{'\n'}
    ✅ Reduced vibration and shock{'\n'}
    ❌ Produces axial thrust force
  </Text>

  {/* Materials */}
  <Text style={styles.subHeading}>
    🏗️ Materials Used
  </Text>

  <Text style={styles.desc}>
    Helical gears are made using materials depending on speed, load,
    and working conditions:
  </Text>

  <Text style={styles.desc}>
    • Steel – Heavy load and industrial systems{'\n'}
    • Alloy Steel – High wear resistance{'\n'}
    • Cast Iron – Medium duty applications{'\n'}
    • Bronze/Brass – Lower friction systems{'\n'}
    • Plastic/Nylon – Lightweight and silent operation
  </Text>

  {/* Types */}
  <Text style={styles.subHeading}>
    🔩 Types of Helical Gears
  </Text>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Single Helical Gear</Text>
    <Text style={styles.cardText}>
      Contains teeth inclined in one direction and is the most common
      type.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Double Helical Gear</Text>
    <Text style={styles.cardText}>
      Has opposite helix angles joined together to eliminate axial
      thrust.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Herringbone Gear</Text>
    <Text style={styles.cardText}>
      A special double helical gear with V-shaped teeth used in heavy
      machinery.
    </Text>
  </View>

  <View style={styles.card}>
    <Text style={styles.cardTitle}>Crossed Helical Gear</Text>
    <Text style={styles.cardText}>
      Used for transmitting motion between non-parallel and
      non-intersecting shafts.
    </Text>
  </View>

  {/* Advantages */}
  <Text style={styles.subHeading}>
    ✅ Advantages
  </Text>

  <Text style={styles.desc}>
    • Smooth and silent operation{'\n'}
    • High efficiency{'\n'}
    • Better load distribution{'\n'}
    • Suitable for high-speed applications{'\n'}
    • Reduced wear and vibration
  </Text>

  {/* Disadvantages */}
  <Text style={styles.subHeading}>
    ❌ Disadvantages
  </Text>

  <Text style={styles.desc}>
    • More expensive than spur gears{'\n'}
    • Produces axial thrust force{'\n'}
    • Requires lubrication{'\n'}
    • More difficult manufacturing process
  </Text>

  {/* Applications */}
  <Text style={styles.subHeading}>
    🚗 Applications of Helical Gear
  </Text>

  <Text style={styles.desc}>
    Helical gears are widely used in modern engineering systems:
  </Text>

  <Text style={styles.desc}>
    🚘 Automobile gearboxes{'\n'}
    🏭 Industrial machinery{'\n'}
    ⚙️ Conveyors and elevators{'\n'}
    ✈️ Aircraft systems{'\n'}
    🔧 Compressors and turbines{'\n'}
    🤖 Robotics and automation
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
    Driven Gear Teeth = 60{'\n'}
    Gear Ratio = 60 / 20 = 3:1
  </Text>

  {/* Comparison */}
  <Text style={styles.subHeading}>
    ⚔️ Spur Gear vs Helical Gear
  </Text>

  <Text style={styles.desc}>
    Spur Gear → Straight teeth{'\n'}
    Helical Gear → Angled teeth{'\n'}
    Spur Gear → Noisy at high speed{'\n'}
    Helical Gear → Smooth and quiet{'\n'}
    Spur Gear → Lower load capacity{'\n'}
    Helical Gear → Higher load capacity{'\n'}
    Spur Gear → Simpler and cheaper{'\n'}
    Helical Gear → More expensive
  </Text>

  {/* Summary */}
  <Text style={styles.subHeading}>
    📌 Summary
  </Text>

  <Text style={styles.desc}>
    Helical gear is an advanced gear system designed for smooth, quiet,
    and efficient power transmission. Due to its angled tooth design,
    it can handle higher loads and speeds than spur gears, making it
    highly useful in automotive, industrial, and heavy mechanical
    applications.
  </Text>
    <BottomNav navigation={navigation} active='HelicalGear' />
</ScrollView>
      )}
    </View>
  );
}

export default HelicalGear

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