import React from 'react'
import {
  View, Text, ScrollView,
  SafeAreaView, StatusBar, StyleSheet, Dimensions
} from 'react-native'
import {
  Canvas, Path, Circle, Rect, Group, Line, vec
} from '@shopify/react-native-skia'

const { width: SW } = Dimensions.get('window')
const WHEEL_SIZE = SW - 32
const cx = WHEEL_SIZE / 2
const cy = WHEEL_SIZE / 2
const R  = cx - 10
const LABEL_R   = R * 0.67
const CENTER_R  = 58
const INNER_R   = 52

// ── Helpers ───────────────────────────────────────────────────────────────
const toRad  = (deg) => (deg - 90) * (Math.PI / 180)
const polar  = (angleDeg, r = R) => ({
  x: cx + r * Math.cos(toRad(angleDeg)),
  y: cy + r * Math.sin(toRad(angleDeg)),
})
const segPath = (start, end) => {
  const p1   = polar(start)
  const p2   = polar(end)
  const large = (end - start + 360) % 360 > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`
}

// ── DMAIC segments (5 × 72°) ──────────────────────────────────────────────
const SEGMENTS = [
  { label: 'Define',  start: 198, end: 270, mid: 234, color: '#2E86C1' },
  { label: 'Measure', start: 270, end: 342, mid: 306, color: '#1A9E74' },
  { label: 'Analyze', start: 342, end: 54,  mid: 18,  color: '#E67E22' },
  { label: 'Improve', start: 54,  end: 126, mid: 90,  color: '#8E44AD' },
  { label: 'Control', start: 126, end: 198, mid: 162, color: '#C0392B' },
]

// ── Skia Icons ────────────────────────────────────────────────────────────

// Define — target / bullseye
const DefineIcon = ({ x, y }) => (
  <Group>
    <Circle cx={x} cy={y - 8} r={14} color="rgba(255,255,255,0.15)" />
    <Circle cx={x} cy={y - 8} r={14} color="rgba(255,255,255,0.0)"
      style="stroke" strokeWidth={2} />
    <Path
      path={`M ${x-14} ${y-8} A 14 14 0 1 1 ${x+14} ${y-8}`}
      color="rgba(255,255,255,0)"
      style="stroke"
      strokeWidth={2.5}
    />
    <Circle cx={x} cy={y - 8} r={8}  color="rgba(255,255,255,0.25)" />
    <Circle cx={x} cy={y - 8} r={3}  color="rgba(255,255,255,0.95)" />
    {/* outer ring */}
    <Path path={`M ${x-14} ${y-8} A 14 14 0 0 1 ${x+14} ${y-8} A 14 14 0 0 1 ${x-14} ${y-8} Z`}
      color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.2} />
  </Group>
)

// Measure — ruler / bar chart
const MeasureIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 16} y={y - 20} width={5} height={22} r={2} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 7}  y={y - 14} width={5} height={16} r={2} color="rgba(255,255,255,0.9)" />
    <Rect x={x + 2}  y={y - 8}  width={5} height={10} r={2} color="rgba(255,255,255,0.9)" />
    <Rect x={x + 11} y={y - 17} width={5} height={19} r={2} color="rgba(255,255,255,0.9)" />
    {/* base line */}
    <Line p1={vec(x - 18, y + 2)} p2={vec(x + 18, y + 2)}
      color="rgba(255,255,255,0.8)" strokeWidth={2} />
  </Group>
)

// Analyze — magnifying glass
const AnalyzeIcon = ({ x, y }) => {
  const gx = x - 4
  const gy = y - 10
  const handle = `M ${gx + 7} ${gy + 7} L ${gx + 16} ${gy + 16}`
  return (
    <Group>
      <Circle cx={gx} cy={gy} r={9} color="rgba(255,255,255,0.0)" />
      <Path path={`M ${gx-9} ${gy} A 9 9 0 1 1 ${gx+9} ${gy} A 9 9 0 1 1 ${gx-9} ${gy} Z`}
        color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.8} />
      {/* glass circle outline */}
      <Path path={`M ${gx} ${gy-9} A 9 9 0 0 1 ${gx+9} ${gy}`}
        color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
      <Path path={`M ${gx+9} ${gy} A 9 9 0 0 1 ${gx} ${gy+9}`}
        color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
      <Path path={`M ${gx} ${gy+9} A 9 9 0 0 1 ${gx-9} ${gy}`}
        color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
      <Path path={`M ${gx-9} ${gy} A 9 9 0 0 1 ${gx} ${gy-9}`}
        color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
      {/* handle */}
      <Path path={handle} color="rgba(255,255,255,0)" style="stroke" strokeWidth={3.5} />
      <Line p1={vec(gx + 7, gy + 7)} p2={vec(gx + 15, gy + 15)}
        color="rgba(255,255,255,0.9)" strokeWidth={3.5} />
    </Group>
  )
}

// Improve — upward arrow / rocket
const ImproveIcon = ({ x, y }) => {
  const arrow = `M ${x} ${y - 18} L ${x + 8} ${y - 4} L ${x + 3} ${y - 4} L ${x + 3} ${y + 6} L ${x - 3} ${y + 6} L ${x - 3} ${y - 4} L ${x - 8} ${y - 4} Z`
  return (
    <Group>
      <Path path={arrow} color="rgba(255,255,255,0.9)" />
    </Group>
  )
}

// Control — shield / checkmark
const ControlIcon = ({ x, y }) => {
  const shield = `M ${x} ${y - 18} L ${x + 12} ${y - 12} L ${x + 12} ${y + 2} Q ${x + 12} ${y + 10} ${x} ${y + 16} Q ${x - 12} ${y + 10} ${x - 12} ${y + 2} L ${x - 12} ${y - 12} Z`
  const check  = `M ${x - 5} ${y} L ${x - 1} ${y + 4} L ${x + 6} ${y - 5}`
  return (
    <Group>
      <Path path={shield} color="rgba(255,255,255,0.25)" />
      <Path path={shield} color="rgba(255,255,255,0)" style="stroke" strokeWidth={2} />
      <Path path={`${shield}`} color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
      <Path path={check}  color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.5} />
      <Path path={check}  color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
    </Group>
  )
}

const ICON_COMPONENTS = [DefineIcon, MeasureIcon, AnalyzeIcon, ImproveIcon, ControlIcon]

// ── Wheel ─────────────────────────────────────────────────────────────────
const SixSigmaWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
    {SEGMENTS.map((seg, i) => (
      <Path key={i} path={segPath(seg.start, seg.end)} color={seg.color} />
    ))}
    {SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return <Line key={i} p1={vec(cx, cy)} p2={vec(p.x, p.y)}
        color="white" strokeWidth={2.5} />
    })}
    {SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = ICON_COMPONENTS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#F0F0F0" />
  </Canvas>
)

// ── Card data — DMAIC ────────────────────────────────────────────────────
const PHASES = [
  {
    bg: '#EAF4FB', label: 'Define', abbr: 'D',
    tagline: 'Clarify the problem and project scope',
    num: '1', accentColor: '#2E86C1',
    definitions: [
      { title: 'Project charter',    body: 'Document the business case, problem statement, goals, scope, and timeline before any data is collected.' },
      { title: 'Voice of Customer',  body: 'Gather customer requirements (VOC) and translate them into measurable Critical-to-Quality (CTQ) characteristics.' },
      { title: 'SIPOC diagram',      body: 'Map Suppliers, Inputs, Process, Outputs, and Customers to set boundaries and stakeholder expectations.' },
    ]
  },
  {
    bg: '#E8F8F2', label: 'Measure', abbr: 'M',
    tagline: 'Quantify the current process performance',
    num: '2', accentColor: '#1A9E74',
    definitions: [
      { title: 'Baseline sigma',     body: 'Calculate the current process sigma level (DPMO) to establish a measurable starting point for improvement.' },
      { title: 'Measurement system', body: 'Run a Gauge R&R study to confirm that measurement tools are reliable and reproducible before collecting data.' },
      { title: 'Data collection plan', body: 'Define what data to collect, how often, and by whom — ensuring sufficient sample sizes for valid analysis.' },
    ]
  },
  {
    bg: '#FEF5EB', label: 'Analyze', abbr: 'A',
    tagline: 'Identify the root causes of defects',
    num: '3', accentColor: '#E67E22',
    definitions: [
      { title: 'Root cause analysis', body: 'Use fishbone (Ishikawa) diagrams and 5-Why analysis to trace defects back to their true source.' },
      { title: 'Hypothesis testing',  body: 'Apply statistical tests (t-test, ANOVA, regression) to confirm which variables are statistically significant.' },
      { title: 'Process mapping',     body: 'Create a detailed value stream map to find waste, bottlenecks, and non-value-added steps in the process.' },
    ]
  },
  {
    bg: '#F5EEF8', label: 'Improve', abbr: 'I',
    tagline: 'Implement and validate solutions',
    num: '4', accentColor: '#8E44AD',
    definitions: [
      { title: 'Solution generation', body: 'Brainstorm and prioritise solutions using impact/effort matrices; pilot the most promising options first.' },
      { title: 'DOE (Design of Experiments)', body: 'Run structured experiments to find the optimal factor settings that minimise variation and defects.' },
      { title: 'Pilot validation',    body: 'Validate the solution on a small scale, measure results against the baseline, and refine before full rollout.' },
    ]
  },
  {
    bg: '#FDEDEC', label: 'Control', abbr: 'C',
    tagline: 'Sustain gains and prevent regression',
    num: '5', accentColor: '#C0392B',
    definitions: [
      { title: 'Control charts',      body: 'Implement Statistical Process Control (SPC) charts to monitor the process and detect drift in real time.' },
      { title: 'Control plan',        body: 'Document the new standard operating procedures, control limits, response plans, and ownership responsibilities.' },
      { title: 'Knowledge transfer',  body: 'Hand off to the process owner with training, updated documentation, and a scheduled review cadence.' },
    ]
  },
]

// ── Card ──────────────────────────────────────────────────────────────────
const Card = ({ phase }) => (
  <View style={s.card}>
    <View style={s.left}>
      <View style={[s.circle, { backgroundColor: phase.bg }]}>
        <Text style={[s.abbr, { color: phase.accentColor }]}>{phase.abbr}</Text>
      </View>
      <Text style={s.stepLabel}>PHASE {phase.num}</Text>
    </View>
    <View style={s.body}>
      <View style={s.titleRow}>
        <Text style={s.cardTitle}>{phase.label}</Text>
      </View>
      <Text style={s.tagline}>{phase.tagline}</Text>
      {phase.definitions.map((def, i) => (
        <View key={i} style={s.defItem}>
          <View style={[s.dot, { backgroundColor: phase.accentColor }]} />
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
const SixSigmaScreen = () => (
  <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#1B3A6B" />
    <View style={s.header}>
      <Text style={s.headerText}>SIX SIGMA</Text>
      <Text style={s.headerSub}>DMAIC Framework</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Wheel */}
      <View style={s.wheelContainer}>
        <SixSigmaWheel />
        {/* Center badge — RN text overlaid on Canvas */}
        <View style={s.centerBadge} pointerEvents="none">
          <Text style={s.centerBig}>6σ</Text>
          <Text style={s.centerSub}>DMAIC</Text>
        </View>
        {/* Segment labels — absolute positioned over wheel */}
        {SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          return (
            <Text
              key={seg.label}
              style={[s.segLabel, { left: lp.x - 38, top: lp.y + 13 }]}
            >
              {seg.label}
            </Text>
          )
        })}
      </View>

      {/* Phase cards */}
      {PHASES.map((phase) => (
        <Card key={phase.num} phase={phase} />
      ))}

    </ScrollView>
  </SafeAreaView>
)

export default SixSigmaScreen

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F5F5F2' },

  header:      { backgroundColor: '#1B3A6B', paddingVertical: 18, alignItems: 'center' },
  headerText:  { fontSize: 26, fontWeight: '700', color: '#E8F0FE', letterSpacing: 2 },
  headerSub:   { fontSize: 12, fontWeight: '500', color: 'rgba(232,240,254,0.7)', letterSpacing: 1.5, marginTop: 2 },

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
  centerBig:   { fontSize: 26, fontWeight: '900', color: '#1B3A6B', lineHeight: 30 },
  centerSub:   { fontSize: 9,  fontWeight: '700', color: '#888', letterSpacing: 2 },

  segLabel: {
    position: 'absolute',
    width: 76,
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

  left:        { alignItems: 'center', gap: 6 },
  circle:      { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  abbr:        { fontSize: 24, fontWeight: '900' },
  stepLabel:   { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },

  body:        { flex: 1 },
  titleRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  tagline:     { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },

  defItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:         { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:     { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:    { fontWeight: '700', color: '#222' },
})