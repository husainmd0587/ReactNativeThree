import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import {
  Box,
  Cylinder,
  subtract,
} from './manifoldNativeApi.js'
import  CanvaProvider  from "../../../../../utils/ThreeJs_Utils/provider.js"


function Model({ geometry }) {
  if (!geometry) return null

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color="#888888"
        roughness={0.35}
        metalness={0.2}
      />
    </mesh>
  )
}

export default function HomeManifold3D() {
  const [geometry, setGeometry] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    buildModel()

    return () => {
      geometry?.dispose()
    }
  }, [])

  async function buildModel() {
    try {
      setError(null)

      // ═══════════════════════════════════════════════════════════════
      // 1. CREATE BOX
      // ═══════════════════════════════════════════════════════════════

      const box = Box({
        width: 20,
        height: 20,
        depth: 20,
      })

      // ═══════════════════════════════════════════════════════════════
      // 2. CREATE CYLINDER TOOL
      // ═══════════════════════════════════════════════════════════════

      const hole = Cylinder({
        radius: 5,
        height: 30,
        segments: 64,
      })

      // ═══════════════════════════════════════════════════════════════
      // 3. SUBTRACT CYLINDER FROM BOX
      // ═══════════════════════════════════════════════════════════════

      // At this stage both geometries are centered at 0,0,0.
      const result = await subtract(
        box,
        hole
      )

      // Dispose inputs after CSG
      box.dispose()
      hole.dispose()

      setGeometry(result)

    } catch (e) {
      console.error(
        'CAD BUILD ERROR:',
        e
      )

      setError(
        e?.message ||
        'Failed to build CAD model'
      )
    }
  }

  return (
    <View style={styles.container}>

      <CanvaProvider
     
      >

        <ambientLight intensity={1} />

        <directionalLight
          position={[10, 20, 10]}
          intensity={2}
          castShadow
        />

        <Model
          geometry={geometry}
        />

        <gridHelper
          args={[100, 20]}
        />

      </CanvaProvider>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },

  error: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    padding: 15,
    backgroundColor: '#400',
    borderRadius: 8,
  },

  errorText: {
    color: '#fff',
  },
})