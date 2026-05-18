import React from 'react'
import {
  View, Text, ScrollView,
  SafeAreaView, StatusBar, StyleSheet, Dimensions
} from 'react-native'
import {
  Canvas, Path, Circle, Rect, Group, Line, Skia, vec
} from '@shopify/react-native-skia'

const { width: SW } = Dimensions.get('window')
const WHEEL_SIZE = SW - 32
const cx = WHEEL_SIZE / 2
const cy = WHEEL_SIZE / 2
const R = cx - 10
const LABEL_R = R * 0.67
const CENTER_R = 58
const INNER_R = 52

// ── Helpers ───────────────────────────────────────────────────────────────
const toRad = (deg) => (deg - 90) * (Math.PI / 180)

const polar = (angleDeg, r = R) => ({
  x: cx + r * Math.cos(toRad(angleDeg)),
  y: cy + r * Math.sin(toRad(angleDeg)),
})

const segmentPath = (startAngle, endAngle) => {
  const p1 = polar(startAngle)
  const p2 = polar(endAngle)
  const large = (endAngle - startAngle + 360) % 360 > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`
}

// ── Segment data ──────────────────────────────────────────────────────────
const SEGMENTS = [
  { label: 'Sort',         start: 198, end: 270, mid: 234, color: '#E8622A' },
  { label: 'Set in Order', start: 270, end: 342, mid: 306, color: '#2AABB0' },
  { label: 'Shine',        start: 342, end: 54,  mid: 18,  color: '#F5A623' },
  { label: 'Standardize',  start: 54,  end: 126, mid: 90,  color: '#8B6BB1' },
  { label: 'Sustain',      start: 126, end: 198, mid: 162, color: '#4CAF78' },
]

// ── Icon painters (Skia Path strings) ────────────────────────────────────
const SortIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 16} y={y - 18} width={32} height={6} r={3} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 12} y={y - 8}  width={24} height={6} r={3} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 8}  y={y + 2}  width={16} height={6} r={3} color="rgba(255,255,255,0.9)" />
  </Group>
)

const SetInOrderIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 18} y={y - 20} width={7} height={22} r={3} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 5}  y={y - 14} width={7} height={16} r={3} color="rgba(255,255,255,0.9)" />
    <Rect x={x + 8}  y={y - 18} width={7} height={20} r={3} color="rgba(255,255,255,0.9)" />
  </Group>
)

const ShineIcon = ({ x, y }) => {
  // Sparkle star
  const star = `M ${x} ${y-18} L ${x+3} ${y-11} L ${x+10} ${y-11} L ${x+4} ${y-6} L ${x+6} ${y+1} L ${x} ${y-3} L ${x-6} ${y+1} L ${x-4} ${y-6} L ${x-10} ${y-11} L ${x-3} ${y-11} Z`
  return (
    <Group>
      <Path path={star} color="rgba(255,255,255,0.9)" />
    </Group>
  )
}

const StandardizeIcon = ({ x, y }) => {
  const check = `M ${x-8} ${y-14} L ${x-4} ${y-10} L ${x+4} ${y-18}`
  return (
    <Group>
      <Rect x={x-14} y={y-20} width={28} height={28} r={3} color="rgba(255,255,255,0.15)" />
      <Path path={check} color="rgba(255,255,255,0)" style="fill" />
      <Path path={check} color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
      <Line p1={vec(x-8, y-3)} p2={vec(x+8, y-3)} color="rgba(255,255,255,0.75)" strokeWidth={2} />
      <Line p1={vec(x-8, y+4)} p2={vec(x+8, y+4)} color="rgba(255,255,255,0.75)" strokeWidth={2} />
    </Group>
  )
}

const SustainIcon = ({ x, y }) => {
  // Arc with arrowhead
  const arc = `M ${x} ${y-16} A 16 16 0 1 1 ${x-14} ${y+8}`
  const arrow = `M ${x-6} ${y-22} L ${x} ${y-14} L ${x+6} ${y-22}`
  return (
    <Group>
      <Path path={arc}   color="rgba(255,255,255,0)" style="fill" />
      <Path path={arc}   color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={3} />
      <Path path={arrow} color="rgba(255,255,255,0.9)" style="fill" />
    </Group>
  )
}

const ICON_COMPONENTS = [SortIcon, SetInOrderIcon, ShineIcon, StandardizeIcon, SustainIcon]

// ── Wheel ─────────────────────────────────────────────────────────────────
const FiveSWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>

    {/* Pie segments */}
    {SEGMENTS.map((seg, i) => (
      <Path
        key={i}
        path={segmentPath(seg.start, seg.end)}
        color={seg.color}
      />
    ))}

    {/* Divider lines */}
    {SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return (
        <Line
          key={i}
          p1={vec(cx, cy)}
          p2={vec(p.x, p.y)}
          color="white"
          strokeWidth={2.5}
        />
      )
    })}

    {/* Icons */}
    {SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = ICON_COMPONENTS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}

    {/* Center white ring */}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#F0F0F0" />

  </Canvas>
)

// ── Card data ─────────────────────────────────────────────────────────────
const COLS = [
  {
    bg: '#FAECE7', label: 'Sort', japanese: 'Seiri',
    tagline: 'Eliminate what is not needed',
    num: '1', accentColor: '#E8622A',
    definitions: [
      { title: 'Red-tag strategy',   body: 'Tag all items in the workspace; remove anything not used in the last 30 days.' },
      { title: 'Decision criteria',  body: 'Ask "Is this needed, in this quantity, right here?" for every item.' },
      { title: 'Outcome',            body: 'Reduces clutter, frees space, and surfaces hidden problems like leaks or damage.' },
    ]
  },
  {
    bg: '#E0F4F4', label: 'Set in Order', japanese: 'Seiton',
    tagline: 'Arrange items for easy access',
    num: '2', accentColor: '#2AABB0',
    definitions: [
      { title: 'Visual controls',      body: 'Label shelves, drawers, and floors so anyone can find and return items in under 30 seconds.' },
      { title: 'Ergonomic placement',  body: 'Store frequently used items at waist height; rarely used on high or low shelves.' },
      { title: 'Shadow boards',        body: "Outline each tool's exact position so missing items are immediately obvious." },
    ]
  },
  {
    bg: '#FEF3DC', label: 'Shine', japanese: 'Seiso',
    tagline: 'Clean the work area daily',
    num: '3', accentColor: '#F5A623',
    definitions: [
      { title: 'Inspection through cleaning', body: 'Cleaning is also inspecting — detect leaks, cracks, and abnormalities early.' },
      { title: 'Cleaning schedule',           body: 'Assign specific zones and time slots to individuals with defined cleaning standards.' },
      { title: 'Root cause',                  body: 'Find and fix the source of dirt rather than just cleaning up the result repeatedly.' },
    ]
  },
  {
    bg: '#EDE7F6', label: 'Standardize', japanese: 'Seiketsu',
    tagline: 'Create consistent systems',
    num: '4', accentColor: '#8B6BB1',
    definitions: [
      { title: 'Visual standards',       body: 'Use colour-coding, signage, and photos to define what "correct" looks like at a glance.' },
      { title: 'Documented procedures',  body: "Write simple, one-page SOPs so anyone can maintain the first three S's correctly." },
      { title: 'Built-in checks',        body: 'Embed routine audits into daily workflow — not as extra tasks, but as part of normal work.' },
    ]
  },
  {
    bg: '#EAF6EE', label: 'Sustain', japanese: 'Shitsuke',
    tagline: 'Make discipline a habit',
    num: '5', accentColor: '#4CAF78',
    definitions: [
      { title: 'Culture over compliance',  body: 'Staff should understand why 5S matters, not just how to do it.' },
      { title: 'Regular audits',           body: 'Conduct scored 5S audits monthly; post results publicly to drive accountability.' },
      { title: 'Continuous improvement',   body: '5S is a loop, not a one-time project — review and raise standards over time.' },
    ]
  },
]

// ── Card ──────────────────────────────────────────────────────────────────
const Card = ({ col }) => (
  <View style={s.card}>
    <View style={s.left}>
      <View style={[s.circle, { backgroundColor: col.bg }]}>
        <Text style={[s.stepNum, { color: col.accentColor }]}>{col.num}</Text>
      </View>
      <Text style={s.stepLabel}>STEP {col.num}</Text>
    </View>
    <View style={s.body}>
      <View style={s.titleRow}>
        <Text style={s.cardTitle}>{col.label}</Text>
        <Text style={s.japanese}> · {col.japanese}</Text>
      </View>
      <Text style={s.tagline}>{col.tagline}</Text>
      {col.definitions.map((def, i) => (
        <View key={i} style={s.defItem}>
          <View style={[s.dot, { backgroundColor: col.accentColor }]} />
          <Text style={s.defText}>
            <Text style={s.defTitle}>{def.title}: </Text>
            {def.body}
          </Text>
        </View>
      ))}
    </View>
  </View>
)

// ── Screen ────────────────────────────────────────────────────────────────
const FiveSPrinciplesScreen = () => (
  <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#C1522A" />
    <View style={s.header}>
      <Text style={s.headerText}>5S PRINCIPLES</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Wheel */}
      <View style={s.wheelContainer}>
        <FiveSWheel />
        {/* Center text — rendered in RN since Skia text needs font loading */}
        <View style={s.centerBadge} pointerEvents="none">
          <Text style={s.centerBig}>5S</Text>
          <Text style={s.centerSub}>PRINCIPLES</Text>
        </View>
        {/* Segment labels — rendered in RN on top of canvas */}
        {SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          const screenX = lp.x + (SW - 32 - WHEEL_SIZE) / 2   // offset to account for padding
          const screenY = lp.y + 20                             // below icon
          return (
            <Text
              key={seg.label}
              style={[s.segLabel, {
                left: lp.x - 36,
                top:  lp.y + 14,
              }]}
            >
              {seg.label}
            </Text>
          )
        })}
      </View>

      {/* Definition cards */}
      {COLS.map((col) => (
        <Card key={col.num} col={col} />
      ))}

    </ScrollView>
  </SafeAreaView>
)

export default FiveSPrinciplesScreen

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#F5F5F2' },

  header:     { backgroundColor: '#C1522A', paddingVertical: 20, alignItems: 'center' },
  headerText: { fontSize: 26, fontWeight: '700', color: '#F5EDD8', letterSpacing: 2 },

  wheelContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    marginBottom: 8,
    position: 'relative',
  },

  centerBadge: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBig:  { fontSize: 28, fontWeight: '900', color: '#2C2C2A', lineHeight: 32 },
  centerSub:  { fontSize: 9,  fontWeight: '600', color: '#888', letterSpacing: 1.5 },

  segLabel: {
    position: 'absolute',
    width: 72,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  left:       { alignItems: 'center', gap: 6 },
  circle:     { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  stepNum:    { fontSize: 22, fontWeight: '900' },
  stepLabel:  { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },

  body:       { flex: 1 },
  titleRow:   { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  japanese:   { fontSize: 12, color: '#999', fontStyle: 'italic' },
  tagline:    { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },

  defItem:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:    { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:   { fontWeight: '700', color: '#222' },
})