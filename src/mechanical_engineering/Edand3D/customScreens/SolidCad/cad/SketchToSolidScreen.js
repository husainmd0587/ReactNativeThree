// cad/SketchToSolidScreen.js
//
// Receives a tap-selected profile from the Sketcher (main.js) via:
//   navigation.navigate('SketchToSolid', { profile })
//
// where `profile` is the { outer, holes } shape from
// utils/profile/loopDetection.js (classifyLoops / hitTestProfiles).
//
// Flow: choose Extrude or Revolve -> tool panel with live preview -> Confirm
// (keeps the native solid, returns to the sketch) or Cancel (discards the
// native solid, returns to the sketch). Every step is a genuine Manifold
// solid — this is the native-first replacement for 3d/main.js's
// THREE.ExtrudeGeometry-only preview.

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider.js'

import { resetModel } from './CadApi.js'
import ExtrudePanel from './ExtrudePanel.js'
import RevolvePanel from './RevolvePanel.js'

function Model({ geometry }) {
  if (!geometry) return null

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#888888" roughness={0.35} metalness={0.2} />
    </mesh>
  )
}

export default function SketchToSolidScreen({ route, navigation }) {
  const profile = route?.params?.profile

  const [tool, setTool] = useState(null) // 'extrude' | 'revolve' | null
  const [confirmed, setConfirmed] = useState(false)
  const [geometry, setGeometry] = useState(null)
  const geometryRef = useRef(null)
  useEffect(() => { geometryRef.current = geometry }, [geometry])

  // Any native solid built while this screen is open gets cleared if the
  // user backs out without confirming, or navigates away entirely — no
  // leftover preview geometry, native or THREE-side.
  useEffect(() => {
    return () => {
      geometryRef.current?.dispose?.()
    }
  }, [])

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No profile was passed to this screen — go back and tap a closed shape first.</Text>
      </View>
    )
  }

  function handlePreview(newGeometry) {
    geometryRef.current?.dispose?.()
    setGeometry(newGeometry)
  }

  async function handleCancel() {
    geometryRef.current?.dispose?.()
    setGeometry(null)
    setTool(null)
    try {
      await resetModel()
    } catch {
      // nothing to reset — fine
    }
    navigation.goBack()
  }

  function handleConfirm() {
    // The last preview call already left the confirmed solid resident in
    // native memory — nothing further to build. Close the tool panel and
    // stay right here showing the finished solid, instead of bouncing back
    // to the 2D sketch. Going back to 2D is still one tap away (the
    // system back button / gesture), it's just no longer automatic.
    setTool(null)
    setConfirmed(true)
  }

  return (
    <View style={styles.container}>
      <CanvaProvider>
        <ambientLight intensity={1} />
        <directionalLight position={[10, 20, 10]} intensity={2} castShadow />
        <Model geometry={geometry} />
        <gridHelper args={[100, 20]} />
      </CanvaProvider>

      {!tool && !confirmed && (
        <View style={styles.chooser}>
          <Text style={styles.chooserTitle}>Build 3D from this profile</Text>
          <View style={styles.chooserRow}>
            <TouchableOpacity style={styles.chooserBtn} onPress={() => setTool('extrude')}>
              <Text style={styles.chooserBtnText}>Extrude</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chooserBtn} onPress={() => setTool('revolve')}>
              <Text style={styles.chooserBtnText}>Revolve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {confirmed && (
        <View style={styles.doneBar}>
          <Text style={styles.doneText}>Solid created</Text>
          <TouchableOpacity style={styles.doneBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBackText}>Back to sketch</Text>
          </TouchableOpacity>
        </View>
      )}

      {tool === 'extrude' && (
        <ExtrudePanel
          profile={profile}
          onPreview={handlePreview}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}

      {tool === 'revolve' && (
        <RevolvePanel
          profile={profile}
          onPreview={handlePreview}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'flex-end',
  },

  errorText: {
    color: '#fff',
    margin: 20,
    textAlign: 'center',
  },

  chooser: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },

  chooserTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },

  chooserRow: {
    flexDirection: 'row',
    gap: 12,
  },

  chooserBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: '#ff9500',
    alignItems: 'center',
  },

  chooserBtnText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },

  doneBar: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  doneText: {
    color: '#9c9',
    fontSize: 15,
    fontWeight: '600',
  },

  doneBackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
  },

  doneBackText: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '600',
  },
})
