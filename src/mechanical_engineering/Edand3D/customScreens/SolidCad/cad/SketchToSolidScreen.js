// cad/SketchToSolidScreen.js
//
// Receives a tap-selected profile from the Sketcher (main.js) via:
//   navigation.navigate('SketchToSolid', { profile })
//
// IMPORTANT — division of responsibility with CanvaProvider:
// CanvaProvider (utils/ThreeJs_Utils/provider.js) already owns EVERYTHING
// about how the scene looks and how the camera moves: lighting, grid, axis
// labels, background color, wireframe/shadows/orthographic, view presets
// (Front/Back/Left/Right/Top/Bottom/Iso via its own FAB -> slide-in panel),
// zoom, and orbit/pan gestures (via r3f-native-orbitcontrols' OrbitControls,
// mounted inside its Canvas). This screen does NOT add a second lighting
// rig, a second grid, or a second camera controller — doing so previously
// caused duplicate grids and camera jitter (two things trying to own the
// same camera each frame). If you want a different default starting view,
// pass a different `instanceId` and/or `camPosition` prop to CanvaProvider
// below — don't reach into the Canvas and move the camera directly.
//
// What THIS screen actually adds, which CanvaProvider has no concept of:
// the CAD tool workflow (Extrude / Revolve / Hole, and the "More" list of
// deferred B-Rep-dependent tools) — that's CAD-specific and belongs here,
// not in a generic 3D viewer component.

import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Text, Alert } from 'react-native'
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider.js'

import { resetModel } from './CadApi.js'
import ExtrudePanel from './ExtrudePanel.js'
import RevolvePanel from './RevolvePanel.js'
import HolePatternPanel from './HolePatternPanel.js'
import TopToolbar from './ui/TopToolbar.js'

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

  const [tool, setTool] = useState(null) // 'extrude' | 'revolve' | 'hole' | null
  const [confirmed, setConfirmed] = useState(false)
  const [geometry, setGeometry] = useState(null)
  const geometryRef = useRef(null)
  useEffect(() => { geometryRef.current = geometry }, [geometry])

  // Any native solid built while this screen is open gets cleared if the
  // user backs out without confirming, or navigates away entirely.
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

  async function handleCancelTool() {
    // Only relevant for extrude/revolve: their live preview may have left a
    // rebuilt-from-scratch stock in place. Cancelling the FIRST feature
    // (before anything is confirmed) means there's nothing worth keeping.
    if (!confirmed) {
      geometryRef.current?.dispose?.()
      setGeometry(null)
      try { await resetModel() } catch {}
    }
    setTool(null)
  }

  function handleConfirmTool(newGeometry) {
    if (newGeometry) handlePreview(newGeometry)
    setTool(null)
    setConfirmed(true)
  }

  function selectTopTool(nextTool) {
    if (!nextTool) { setTool(null); return }

    if ((nextTool === 'extrude' || nextTool === 'revolve') && confirmed) {
      // Both rebuild the stock from scratch off the original profile — with
      // no feature history yet to rebuild from instead, re-running either
      // one now would silently throw away any holes/features already cut.
      Alert.alert(
        'Base solid already created',
        "Extrude and Revolve rebuild the whole solid from this sketch's profile — running one again now would discard the holes you've already cut. Undo/rebuild-from-history isn't available yet, so this is blocked to avoid losing work."
      )
      return
    }

    if (nextTool === 'hole' && !confirmed) {
      Alert.alert('Nothing to cut yet', 'Extrude or Revolve this profile into a solid first, then cut holes into it.')
      return
    }

    setTool(nextTool)
  }

  return (
    <View style={styles.container}>
      <TopToolbar
        title="3D Model"
        onBack={() => navigation.goBack()}
        activeTool={tool}
        onSelectTool={selectTopTool}
      />

      <View style={styles.viewport}>
        <CanvaProvider instanceId="cad-sketch-to-solid">
          <Model geometry={geometry} />
        </CanvaProvider>

        {!tool && !confirmed && (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>Tap Extrude or Revolve above to build a solid from this profile</Text>
          </View>
        )}
      </View>

      {tool === 'extrude' && (
        <ExtrudePanel
          profile={profile}
          onPreview={handlePreview}
          onCancel={handleCancelTool}
          onConfirm={() => handleConfirmTool(null)}
        />
      )}

      {tool === 'revolve' && (
        <RevolvePanel
          profile={profile}
          onPreview={handlePreview}
          onCancel={handleCancelTool}
          onConfirm={() => handleConfirmTool(null)}
        />
      )}

      {tool === 'hole' && (
        <HolePatternPanel
          onApplied={(newGeometry) => handleConfirmTool(newGeometry)}
          onCancel={handleCancelTool}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },

  viewport: {
    flex: 1,
  },

  errorText: {
    color: '#fff',
    margin: 20,
    textAlign: 'center',
  },

  hintBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 90, // clears CanvaProvider's own bottom-right FAB
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  hintText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
})
