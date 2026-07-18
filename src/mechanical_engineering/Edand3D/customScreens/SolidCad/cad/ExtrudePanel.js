// cad/ExtrudePanel.js
//
// Compact mobile tool panel for Extrude. Touch-friendly numeric input,
// reverse/symmetric toggles, a debounced live preview (re-extrudes at most
// a few times a second while dragging/typing, not on every keystroke), and
// always-visible Cancel/Create actions.
//
// This panel owns the "is a preview running" state — the screen that hosts
// it (SketchToSolidScreen.js) just needs the profile and two callbacks.

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native'

import { Extrude } from './CadApi.js'

const PREVIEW_DEBOUNCE_MS = 250

export default function ExtrudePanel({ profile, onPreview, onCancel, onConfirm }) {
  const [distanceText, setDistanceText] = useState('10')
  const [reverse, setReverse] = useState(false)
  const [symmetric, setSymmetric] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const debounceRef = useRef(null)
  const requestIdRef = useRef(0) // last-request-wins guard

  const depth = Number.parseFloat(distanceText)
  const validDepth = Number.isFinite(depth) && depth > 0

  useEffect(() => {
    if (!validDepth) return undefined

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(runPreview, PREVIEW_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceText, reverse, symmetric])

  async function runPreview() {
    const thisRequest = ++requestIdRef.current
    setBusy(true)
    setError(null)

    try {
      const geometry = await Extrude(profile, { depth, reverse, symmetric })
      if (thisRequest !== requestIdRef.current) {
        geometry?.dispose?.() // a newer request already superseded this one
        return
      }
      onPreview(geometry)
    } catch (e) {
      if (thisRequest !== requestIdRef.current) return
      setError(e?.message || 'Extrude failed')
      onPreview(null)
    } finally {
      if (thisRequest === requestIdRef.current) setBusy(false)
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Extrude</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>

      {profile?.holes?.length > 0 && (
        <Text style={styles.hint}>Profile has {profile.holes.length} hole{profile.holes.length > 1 ? 's' : ''} — they'll be cut automatically.</Text>
      )}

      <Text style={styles.label}>Distance</Text>
      <TextInput
        style={styles.input}
        value={distanceText}
        onChangeText={setDistanceText}
        keyboardType="decimal-pad"
        placeholder="10.00"
        placeholderTextColor="#777"
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Reverse direction</Text>
        <Switch value={reverse} onValueChange={setReverse} disabled={symmetric} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Symmetric</Text>
        <Switch value={symmetric} onValueChange={setSymmetric} />
      </View>

      {!validDepth && <Text style={styles.error}>Enter a distance greater than 0</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {busy && <Text style={styles.busy}>Updating preview…</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, !validDepth && styles.confirmBtnDisabled]}
          onPress={() => validDepth && onConfirm({ depth, reverse, symmetric })}
          disabled={!validDepth}
        >
          <Text style={styles.confirmText}>Create</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  close: { color: '#aaa', fontSize: 24, lineHeight: 24, paddingHorizontal: 4 },
  hint: { color: '#9c9', fontSize: 12, marginBottom: 10 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  rowLabel: { color: '#ddd', fontSize: 15 },
  error: { color: '#ff6b6b', fontSize: 12, marginTop: 10 },
  busy: { color: '#888', fontSize: 12, marginTop: 10 },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
  },
  cancelText: { color: '#ddd', fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ff9500',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
})
