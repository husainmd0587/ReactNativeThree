// cad/HolePatternPanel.js
//
// Mobile tool panel for cutting a circular or rectangular hole pattern into
// the CURRENT stock.
//
// IMPORTANT DIFFERENCE FROM ExtrudePanel / RevolvePanel: this panel does
// NOT live-preview while you type. Extrude/Revolve are safe to preview
// live because initExtrude()/initRevolve() REBUILD the stock from scratch
// every call. CircularHolePattern/RectHolePattern go through cutMany(),
// which SUBTRACTS from whatever is currently in the native stock — calling
// it repeatedly (e.g. on every debounce tick while the user adjusts a
// slider) would cut a fresh, ADDITIONAL set of holes into an
// already-holed model each time, not update a single preview. There's no
// feature history yet to "rebuild from the last good state" before each
// preview the way a real CAD kernel would — so the honest, correct
// behavior for now is: parameters only, one real cut on Confirm.
//
// (This is exactly the kind of thing feature history — staged separately —
// exists to fix properly: rebuild-from-history would make hole preview as
// safe as extrude/revolve preview. Until then, this panel doesn't pretend.)

import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'

import { CircularHolePattern, RectHolePattern } from './CadApi.js'

export default function HolePatternPanel({ onApplied, onCancel }) {
  const [pattern, setPattern] = useState('circular') // 'circular' | 'rect'

  const [count, setCount] = useState('8')
  const [patternRadius, setPatternRadius] = useState('20')

  const [rows, setRows] = useState('2')
  const [cols, setCols] = useState('2')
  const [spacingX, setSpacingX] = useState('20')
  const [spacingY, setSpacingY] = useState('20')

  const [holeRadius, setHoleRadius] = useState('2')
  const [depth, setDepth] = useState('20')

  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function num(s) { return Number.parseFloat(s) }

  const commonValid = Number.isFinite(num(holeRadius)) && num(holeRadius) > 0 && Number.isFinite(num(depth)) && num(depth) > 0

  const circularValid = commonValid && Number.isFinite(num(count)) && num(count) > 0 && Number.isFinite(num(patternRadius)) && num(patternRadius) > 0
  const rectValid = commonValid
    && Number.isInteger(num(rows)) && num(rows) > 0
    && Number.isInteger(num(cols)) && num(cols) > 0
    && Number.isFinite(num(spacingX)) && num(spacingX) > 0
    && Number.isFinite(num(spacingY)) && num(spacingY) > 0

  const valid = pattern === 'circular' ? circularValid : rectValid

  async function apply() {
    setBusy(true)
    setError(null)
    try {
      const geometry = pattern === 'circular'
        ? await CircularHolePattern({
            count: num(count),
            patternRadius: num(patternRadius),
            holeRadius: num(holeRadius),
            depth: num(depth),
          })
        : await RectHolePattern({
            rows: num(rows),
            cols: num(cols),
            spacingX: num(spacingX),
            spacingY: num(spacingY),
            holeRadius: num(holeRadius),
            depth: num(depth),
          })

      onApplied(geometry)
    } catch (e) {
      setError(e?.message || 'Hole pattern failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Hole Pattern</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, pattern === 'circular' && styles.segmentBtnActive]}
          onPress={() => setPattern('circular')}
        >
          <Text style={[styles.segmentText, pattern === 'circular' && styles.segmentTextActive]}>Circular</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, pattern === 'rect' && styles.segmentBtnActive]}
          onPress={() => setPattern('rect')}
        >
          <Text style={[styles.segmentText, pattern === 'rect' && styles.segmentTextActive]}>Rectangular</Text>
        </TouchableOpacity>
      </View>

      {pattern === 'circular' ? (
        <>
          <LabeledInput label="Hole count" value={count} onChangeText={setCount} />
          <LabeledInput label="Pattern radius" value={patternRadius} onChangeText={setPatternRadius} />
        </>
      ) : (
        <>
          <View style={styles.pairRow}>
            <LabeledInput style={styles.half} label="Rows" value={rows} onChangeText={setRows} />
            <LabeledInput style={styles.half} label="Columns" value={cols} onChangeText={setCols} />
          </View>
          <View style={styles.pairRow}>
            <LabeledInput style={styles.half} label="Spacing X" value={spacingX} onChangeText={setSpacingX} />
            <LabeledInput style={styles.half} label="Spacing Y" value={spacingY} onChangeText={setSpacingY} />
          </View>
        </>
      )}

      <View style={styles.pairRow}>
        <LabeledInput style={styles.half} label="Hole radius" value={holeRadius} onChangeText={setHoleRadius} />
        <LabeledInput style={styles.half} label="Depth" value={depth} onChangeText={setDepth} />
      </View>

      {!valid && <Text style={styles.error}>Fill in every field with a positive number{pattern === 'rect' ? ' (rows/columns must be whole numbers)' : ''}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {busy && <Text style={styles.busy}>Cutting holes…</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, (!valid || busy) && styles.confirmBtnDisabled]}
          onPress={() => valid && !busy && apply()}
          disabled={!valid || busy}
        >
          <Text style={styles.confirmText}>Cut Holes</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function LabeledInput({ label, value, onChangeText, style }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor="#777"
      />
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

  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2c2c2e', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#ff9500' },
  segmentText: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#1a1a1a' },

  pairRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },

  error: { color: '#ff6b6b', fontSize: 12, marginTop: 10 },
  busy: { color: '#888', fontSize: 12, marginTop: 10 },

  actions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2c2c2e', alignItems: 'center' },
  cancelText: { color: '#ddd', fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#ff9500', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
})
