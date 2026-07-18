// cad/RevolvePanel.js
//
// Compact mobile tool panel for Revolve. Axis choice (X/Y), sweep angle
// (full 360° by default, or a partial angle), reverse direction, a
// debounced live preview, and always-visible Cancel/Create actions.
//
// NOTE: only a single outer-boundary profile is supported (no holes) — see
// the caveat in cad/CadApi.js's Revolve(). This panel refuses to open for a
// profile that has holes rather than silently ignoring them.

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native'

import { Revolve } from './CadApi.js'

const PREVIEW_DEBOUNCE_MS = 250

export default function RevolvePanel({ profile, onPreview, onCancel, onConfirm }) {
  const [axis, setAxis] = useState('y')
  const [angleText, setAngleText] = useState('360')
  const [reverse, setReverse] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)

  const angle = Number.parseFloat(angleText)
  const validAngle = Number.isFinite(angle) && angle > 0 && angle <= 360

  const hasHoles = !Array.isArray(profile) && profile?.holes?.length > 0

  useEffect(() => {
    if (!validAngle || hasHoles) return undefined

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(runPreview, PREVIEW_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, angleText, reverse])

  async function runPreview() {
    const thisRequest = ++requestIdRef.current
    setBusy(true)
    setError(null)

    try {
      const geometry = await Revolve(profile, { axis, angle, reverse })
      if (thisRequest !== requestIdRef.current) {
        geometry?.dispose?.()
        return
      }
      onPreview(geometry)
    } catch (e) {
      if (thisRequest !== requestIdRef.current) return
      setError(e?.message || 'Revolve failed')
      onPreview(null)
    } finally {
      if (thisRequest === requestIdRef.current) setBusy(false)
    }
  }

  if (hasHoles) {
    return (
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Revolve</Text>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.close}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.error}>
          This profile has holes — Revolve only supports a single outer boundary right now. Use Extrude instead, or remove the inner loop(s) first.
        </Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Revolve</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Axis</Text>
      <View style={styles.segmentRow}>
        {['y', 'x'].map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.segmentBtn, axis === a && styles.segmentBtnActive]}
            onPress={() => setAxis(a)}
          >
            <Text style={[styles.segmentText, axis === a && styles.segmentTextActive]}>{a.toUpperCase()} axis</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Angle (degrees)</Text>
      <TextInput
        style={styles.input}
        value={angleText}
        onChangeText={setAngleText}
        keyboardType="decimal-pad"
        placeholder="360"
        placeholderTextColor="#777"
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Reverse direction</Text>
        <Switch value={reverse} onValueChange={setReverse} />
      </View>
      {reverse && angle >= 360 && (
        <Text style={styles.hint}>A full 360° revolve looks the same either direction.</Text>
      )}

      {!validAngle && <Text style={styles.error}>Enter an angle between 0 and 360</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {busy && <Text style={styles.busy}>Updating preview…</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, !validAngle && styles.confirmBtnDisabled]}
          onPress={() => validAngle && onConfirm({ axis, angle, reverse })}
          disabled={!validAngle}
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
  hint: { color: '#888', fontSize: 12, marginTop: 6 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#ff9500' },
  segmentText: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#1a1a1a' },
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
