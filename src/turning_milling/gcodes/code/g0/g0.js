import { useState } from 'react'
import {
  StyleSheet, Text, View, ScrollView, Dimensions, StatusBar,
  TouchableOpacity, TextInput, Modal, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native'

const { height } = Dimensions.get('window')

export function parseLine(text) {
  const u = text.toUpperCase().trim()
  const result = { text, comment: '' }
  if (u.includes('M03') || u.includes('M3')) result.spindle = true
  if (u.includes('M05') || u.includes('M5')) result.spindle = false
  if (u.startsWith('G00') || u.startsWith('G0 ')) result.type = 'G0'
  if (u.startsWith('G01') || u.startsWith('G1 ')) result.type = 'G1'
  const xm = u.match(/X([-\d.]+)/), ym = u.match(/Y([-\d.]+)/)
  const zm = u.match(/Z([-\d.]+)/), fm = u.match(/F([\d.]+)/)
  if (xm || ym || zm) {
    result.move = {}
    if (xm) result.move.x = parseFloat(xm[1])
    if (ym) result.move.y = parseFloat(ym[1])
    if (zm) result.move.z = parseFloat(zm[1])
  }
  if (fm) result.feed = parseFloat(fm[1])
  return result
}

export const DEFAULT_GCODE = [
  { id: '1',  text: 'G21 G17 G90',     comment: 'Metric, absolute mode',        type: null },
  { id: '2',  text: 'T01 M06',          comment: 'Tool change — insert T1',      type: null },
  { id: '3',  text: 'S2500 M03',        comment: 'Spindle on, 2500 RPM CW',      spindle: true },
  { id: '4',  text: 'G00 Z5.000',       comment: 'Rapid retract to safe Z',      move: { z: 5 },       type: 'G0' },
  { id: '5',  text: 'G00 X-40.000 Y0',  comment: 'Rapid to program start point', move: { x: -40, y: 0 }, type: 'G0' },
  { id: '6',  text: 'G00 Z-2.000',      comment: 'Plunge to cutting depth',      move: { z: -2 },      type: 'G0' },
  { id: '7',  text: 'G01 X0.000 F400',  comment: 'Feed cut along X axis',        move: { x: 0 },       type: 'G1', feed: 400 },
  { id: '8',  text: 'G01 X20.000 Y15',  comment: 'Diagonal cut up-right',        move: { x: 20, y: 15 }, type: 'G1', feed: 400 },
  { id: '9',  text: 'G01 X40.000 Y0',   comment: 'Return diagonal cut',          move: { x: 40, y: 0 }, type: 'G1', feed: 400 },
  { id: '10', text: 'G00 Z5.000',       comment: 'Retract tool from workpiece',  move: { z: 5 },       type: 'G0' },
  { id: '11', text: 'M05',              comment: 'Spindle stop',                 spindle: false },
  { id: '12', text: 'G00 X0 Y0',        comment: 'Rapid return to home position', move: { x: 0, y: 0 }, type: 'G0' },
  { id: '13', text: 'M30',              comment: 'End of program, rewind',       type: null },
]

// ── Editor Modal ───────────────────────────────────────────────────────────
function EditorModal({ visible, program, onClose, onSave }) {
  const [lines, setLines] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editComment, setEditComment] = useState('')

  const open = () => setLines(program.map(l => ({ ...l })))

  const startEdit = l => {
    setEditingId(l.id)
    setEditText(l.text)
    setEditComment(l.comment || '')
  }

  const commitEdit = () => {
    setLines(prev => prev.map(l =>
      l.id === editingId ? { ...parseLine(editText), id: l.id, comment: editComment } : l
    ))
    setEditingId(null)
  }

  const deleteLine = id => setLines(prev => prev.filter(l => l.id !== id))

  const addLine = () => {
    const id = String(Date.now())
    setLines(prev => [...prev, { id, text: 'G00 X0 Y0', comment: 'New line', type: 'G0', move: { x: 0, y: 0 } }])
    setEditingId(id)
    setEditText('G00 X0 Y0')
    setEditComment('New line')
  }

  const moveLine = (id, dir) => setLines(prev => {
    const idx = prev.findIndex(l => l.id === id)
    const next = [...prev]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return prev
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    return next
  })

  const handleSave = () => {
    if (editingId) commitEdit()
    onSave(lines)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onShow={open}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={es.overlay}>
        <View style={es.sheet}>
          <View style={es.header}>
            <View>
              <Text style={es.title}>Program editor</Text>
              <Text style={es.sub}>{lines.length} lines</Text>
            </View>
            <View style={es.headerBtns}>
              <TouchableOpacity style={es.addBtn} onPress={addLine}>
                <Text style={es.addBtnText}>+ Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={es.saveBtn} onPress={handleSave}>
                <Text style={es.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={es.closeBtn} onPress={onClose}>
                <Text style={es.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={lines}
            keyExtractor={i => i.id}
            style={es.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const isE = editingId === item.id
              const tc = item.type === 'G1' ? '#f59e0b' : item.type === 'G0' ? '#38bdf8' : '#64748b'
              return (
                <View style={[es.row, isE && es.rowActive]}>
                  <Text style={es.lineNum}>{String(index + 1).padStart(2, '0')}</Text>
                  {isE ? (
                    <View style={es.editBlock}>
                      <TextInput
                        style={es.codeInput}
                        value={editText}
                        onChangeText={setEditText}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        placeholder="G00 X0 Y0"
                        placeholderTextColor="#334155"
                        selectionColor="#38bdf8"
                      />
                      <TextInput
                        style={es.commentInput}
                        value={editComment}
                        onChangeText={setEditComment}
                        placeholder="Comment"
                        placeholderTextColor="#334155"
                        selectionColor="#38bdf8"
                      />
                      <TouchableOpacity style={es.doneBtn} onPress={commitEdit}>
                        <Text style={es.doneBtnText}>✓ Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={es.viewBlock} onPress={() => startEdit(item)}>
                      <View style={[es.typePill, { backgroundColor: tc + '22', borderColor: tc + '55' }]}>
                        <Text style={[es.typeText, { color: tc }]}>{item.type || '—'}</Text>
                      </View>
                      <View style={es.textBlock}>
                        <Text style={es.codeText}>{item.text}</Text>
                        {item.comment ? <Text style={es.commentText}>{item.comment}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  )}
                  {!isE && (
                    <View style={es.actions}>
                      <TouchableOpacity style={es.actionBtn} onPress={() => moveLine(item.id, -1)}>
                        <Text style={es.actionIcon}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={es.actionBtn} onPress={() => moveLine(item.id, 1)}>
                        <Text style={es.actionIcon}>↓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[es.actionBtn, es.deleteBtn]} onPress={() => deleteLine(item.id)}>
                        <Text style={es.deleteIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Explain & Code
// ══════════════════════════════════════════════════════════════════════════
function ExplainScreen({ command, gcode, onRunPress, onEditPress }) {
  const typeColor = t => t === 'G1' ? '#f59e0b' : t === 'G0' ? '#4a9eff' : '#888'

  return (
    <ScrollView style={s1.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      <View style={s1.hero}>
        <View style={s1.badge}>
          <Text style={s1.badgeLabel}>G-CODE</Text>
          <Text style={s1.badgeName}>{command?.name ?? 'G00'}</Text>
        </View>
        <Text style={s1.heroDesc}>
          {command?.description ?? `Rapid positioning — moves all axes at maximum speed to the target coordinate.
           No material removal occurs. Used to reposition the tool between cuts.`
          }
        </Text>
      </View>

      <View style={s1.section}>
        <Text style={s1.sectionTitle}>What this program does</Text>
        <View style={s1.infoCard}>
          {[
            { color: '#4a9eff', text: 'Sets up metric units, absolute positioning and selects Tool 1' },
            { color: '#22c55e', text: 'Starts the spindle at 2500 RPM and rapids to the start point' },
            { color: '#f59e0b', text: 'Executes 3 feed-rate cuts forming a diagonal V-shaped toolpath' },
            { color: '#94a3b8', text: 'Retracts, stops the spindle and returns to machine home' },
          ].map((item, i) => (
            <View key={i} style={s1.infoRow}>
              <View style={[s1.dot, { backgroundColor: item.color }]} />
              <Text style={s1.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s1.section}>
        <View style={s1.sectionTitleRow}>
          <Text style={s1.sectionTitle}>Program listing</Text>
          <TouchableOpacity style={s1.editBtn} onPress={onEditPress}>
            <Text style={s1.editBtnText}>✎  Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={s1.codeBlock}>
          {gcode.map((l, i) => {
            const tc = typeColor(l.type)
            return (
              <View key={l.id} style={[s1.codeLine, i % 2 === 0 && s1.codeLineAlt]}>
                <Text style={s1.codeNum}>{String(i + 1).padStart(2, '0')}</Text>
                {l.type ? (
                  <View style={[s1.typePill, { borderColor: tc + '66', backgroundColor: tc + '18' }]}>
                    <Text style={[s1.typeText, { color: tc }]}>{l.type}</Text>
                  </View>
                ) : (
                  <View style={s1.typePillEmpty} />
                )}
                <Text style={s1.codeText}>{l.text}</Text>
                <Text style={s1.codeComment}>; {l.comment}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={{ height: 20 }} />
      <TouchableOpacity style={s1.runBtn} onPress={onRunPress} activeOpacity={0.85}>
        <View style={s1.runBtnInner}>
          <Text style={s1.runBtnIcon}>▶</Text>
          <View>
            <Text style={s1.runBtnTitle}>Run this program</Text>
            <Text style={s1.runBtnSub}>Open 3D simulation</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
const G0 = ({ route, navigation }) => {
  const { command } = route.params
  const [gcode, setGcode] = useState(DEFAULT_GCODE)
  const [editorVisible, setEditorVisible] = useState(false)

  return (
    <>
      <ExplainScreen
        command={command}
        gcode={gcode}
        onRunPress={() => navigation.navigate('G0_Sim', { command, gcode })}
        onEditPress={() => setEditorVisible(true)}
      />
      <EditorModal
        visible={editorVisible}
        program={gcode}
        onClose={() => setEditorVisible(false)}
        onSave={updated => setGcode(updated)}
      />
    </>
  )
}

export default G0

// ══════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════
const s1 = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a0f18' },
  hero:            { padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#1a2535' },
  badge:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  badgeLabel:      { fontSize: 10, fontWeight: '700', color: '#4a9eff', letterSpacing: 1.5, textTransform: 'uppercase' },
  badgeName:       { fontSize: 28, fontFamily: 'Oswald-SemiBold', color: '#ffffff' },
  heroDesc:        { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  section:         { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle:    { fontSize: 12, fontWeight: '600', color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  editBtn:         { backgroundColor: '#1a1a0a', borderWidth: 1, borderColor: '#3a3510', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText:     { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  infoCard:        { backgroundColor: '#0d1520', borderRadius: 12, borderWidth: 1, borderColor: '#1e2d3d', padding: 14, gap: 10 },
  infoRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot:             { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  infoText:        { fontSize: 13, color: '#94a3b8', lineHeight: 20, flex: 1 },
  codeBlock:       { backgroundColor: '#000000', borderRadius: 12, borderWidth: 1, borderColor: '#1e2d3d', overflow: 'hidden' },
  codeLine:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, gap: 8 },
  codeLineAlt:     { backgroundColor: '#060a0f' },
  codeNum:         { fontSize: 10, color: '#333', minWidth: 20, fontFamily: 'monospace' },
  typePill:        { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, minWidth: 26, alignItems: 'center' },
  typePillEmpty:   { width: 26 },
  typeText:        { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  codeText:        { fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 },
  codeComment:     { fontSize: 10, color: '#3a4a5a', fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  runBtn:          { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0f2a10', borderWidth: 1, borderColor: '#1a4a1a' },
  runBtnInner:     { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 22 },
  runBtnIcon:      { fontSize: 24, color: '#4ade80' },
  runBtnTitle:     { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  runBtnSub:       { fontSize: 12, color: '#4ade80', marginTop: 2 },
})

const es = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:        { backgroundColor: '#0d1520', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#1e2d3d', maxHeight: height * 0.88, paddingBottom: 24 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e2d3d' },
  title:        { fontSize: 16, fontWeight: '600', color: '#e2e8f0' },
  sub:          { fontSize: 11, color: '#475569', marginTop: 2 },
  headerBtns:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn:       { backgroundColor: '#0c2535', borderWidth: 1, borderColor: '#1a4a65', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText:   { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  saveBtn:      { backgroundColor: '#0f2a10', borderWidth: 1, borderColor: '#1a4a1a', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  saveBtnText:  { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  closeBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#64748b', fontSize: 14 },
  list:         { flexGrow: 0 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0f1c2a', gap: 8 },
  rowActive:    { backgroundColor: '#0a1e35' },
  lineNum:      { fontSize: 10, color: '#2d3d4d', minWidth: 22, fontFamily: 'monospace' },
  typePill:     { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, minWidth: 28, alignItems: 'center' },
  typeText:     { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  viewBlock:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  textBlock:    { flex: 1 },
  codeText:     { fontSize: 12, color: '#7dd3fc', fontFamily: 'monospace' },
  commentText:  { fontSize: 10, color: '#334155', fontFamily: 'monospace', marginTop: 1 },
  editBlock:    { flex: 1, gap: 6 },
  codeInput:    { backgroundColor: '#0a1828', borderWidth: 1, borderColor: '#1e4a7a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: '#38bdf8', fontSize: 13, fontFamily: 'monospace' },
  commentInput: { backgroundColor: '#0a1828', borderWidth: 1, borderColor: '#1e2d3d', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, color: '#64748b', fontSize: 11, fontFamily: 'monospace' },
  doneBtn:      { backgroundColor: '#0c2a10', borderWidth: 1, borderColor: '#1a4a1a', borderRadius: 6, paddingVertical: 5, alignItems: 'center' },
  doneBtnText:  { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  actions:      { flexDirection: 'row', gap: 4 },
  actionBtn:    { width: 26, height: 26, borderRadius: 5, backgroundColor: '#0f1c2a', borderWidth: 1, borderColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center' },
  actionIcon:   { color: '#475569', fontSize: 12 },
  deleteBtn:    { backgroundColor: '#2a0f0f', borderColor: '#4a1f1f' },
  deleteIcon:   { color: '#f87171', fontSize: 10 },
})