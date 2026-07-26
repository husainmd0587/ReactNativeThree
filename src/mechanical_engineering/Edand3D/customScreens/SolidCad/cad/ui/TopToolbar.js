// cad/ui/TopToolbar.js
//
// Visual layout matches the reference mockups (icon row: Select, Extrude,
// Revolve, Hole, More). Two things are deliberately NOT faked:
//
//   - Save: there's no project persistence / feature history yet (that's
//     staged separately — see the CAD audit). The button is visibly present
//     for layout parity but tapping it says so plainly instead of pretending
//     to save.
//   - More: Fillet / Chamfer / Sweep / Loft / Shell / Draft all need a real
//     B-Rep kernel, which Manifold (triangle-mesh booleans only) can't
//     provide correctly. They're listed and clearly marked "Coming soon"
//     rather than given a working-looking button that produces fake or
//     incorrect geometry.

import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native'

const DEFERRED_TOOLS = [
  { label: 'Fillet', note: 'Needs a B-Rep kernel (edge-based rounding) — not yet available' },
  { label: 'Chamfer', note: 'Needs a B-Rep kernel (edge-based bevel) — not yet available' },
  { label: 'Shell', note: 'Needs a B-Rep kernel (face-based thickness) — not yet available' },
  { label: 'Draft', note: 'Needs a B-Rep kernel (face-based taper) — not yet available' },
  { label: 'Sweep', note: 'Needs a B-Rep kernel (surface-based path sweep) — not yet available' },
  { label: 'Loft', note: 'Needs a B-Rep kernel (surface interpolation) — not yet available' },
]

export default function TopToolbar({ title = '3D Model', onBack, activeTool, onSelectTool }) {
  const [moreOpen, setMoreOpen] = useState(false)

  function pressTool(tool) {
    if (tool === 'select') {
      onSelectTool(null) // "Select" = no feature tool active, just close any open panel
      return
    }
    onSelectTool(tool)
  }

  return (
    <View style={styles.bar}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Save', "Project save/load isn't implemented yet — this build keeps your model in memory for this session only.")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.saveIcon}>⬇</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolRow}>
        <ToolIcon glyph="⌖" label="Select" active={!activeTool} onPress={() => pressTool('select')} />
        <ToolIcon glyph="◧" label="Extrude" active={activeTool === 'extrude'} onPress={() => pressTool('extrude')} />
        <ToolIcon glyph="◐" label="Revolve" active={activeTool === 'revolve'} onPress={() => pressTool('revolve')} />
        <ToolIcon glyph="◎" label="Hole" active={activeTool === 'hole'} onPress={() => pressTool('hole')} />
        <ToolIcon glyph="⋯" label="More" active={false} onPress={() => setMoreOpen(true)} />
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMoreOpen(false)}>
          <View style={styles.moreSheet}>
            <Text style={styles.moreTitle}>More tools</Text>
            <Text style={styles.moreSubtitle}>
              These need a full B-Rep geometry kernel, which this app doesn't have yet (Manifold only does triangle-mesh booleans and extrude/revolve). Listed here so it's clear what's planned vs. available — not implemented as fake operations.
            </Text>
            {DEFERRED_TOOLS.map((t) => (
              <View key={t.label} style={styles.deferredRow}>
                <Text style={styles.deferredLabel}>{t.label}</Text>
                <Text style={styles.deferredNote}>{t.note}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.moreCloseBtn} onPress={() => setMoreOpen(false)}>
              <Text style={styles.moreCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function ToolIcon({ glyph, label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.toolBtn, active && styles.toolBtnActive]} onPress={onPress}>
      <Text style={[styles.toolGlyph, active && styles.toolGlyphActive]}>{glyph}</Text>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#161618',
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2c',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  backIcon: { color: '#fff', fontSize: 26, width: 30 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  saveIcon: { color: '#7fa8ff', fontSize: 18, width: 30, textAlign: 'right' },

  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  toolBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    minWidth: 56,
  },
  toolBtnActive: { backgroundColor: '#2a3a52' },
  toolGlyph: { color: '#ccc', fontSize: 18 },
  toolGlyphActive: { color: '#7fa8ff' },
  toolLabel: { color: '#999', fontSize: 10, marginTop: 2 },
  toolLabelActive: { color: '#7fa8ff', fontWeight: '600' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  moreTitle: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  moreSubtitle: { color: '#999', fontSize: 12, marginBottom: 16, lineHeight: 17 },
  deferredRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2c',
  },
  deferredLabel: { color: '#777', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  deferredNote: { color: '#666', fontSize: 12 },
  moreCloseBtn: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
  },
  moreCloseText: { color: '#ddd', fontSize: 15, fontWeight: '600' },
})
