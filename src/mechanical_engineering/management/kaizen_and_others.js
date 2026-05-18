// ─────────────────────────────────────────────────────────────────────────
// KAIZEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
import React from 'react'
import {
  View, Text, ScrollView,
  SafeAreaView, StatusBar, StyleSheet, Dimensions
} from 'react-native'
import { Canvas, Path, Circle, Rect, Group, Line, vec } from '@shopify/react-native-skia'

const { width: SW } = Dimensions.get('window')
const WHEEL_SIZE = SW - 32
const cx = WHEEL_SIZE / 2
const cy = WHEEL_SIZE / 2
const R         = cx - 10
const LABEL_R   = R * 0.67
const CENTER_R  = 58
const INNER_R   = 52

const toRad  = (deg) => (deg - 90) * (Math.PI / 180)
const polar  = (angleDeg, r = R) => ({
  x: cx + r * Math.cos(toRad(angleDeg)),
  y: cy + r * Math.sin(toRad(angleDeg)),
})
const segPath = (start, end) => {
  const p1    = polar(start)
  const p2    = polar(end)
  const large = (end - start + 360) % 360 > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`
}

// Kaizen — 5 pillars: Teamwork, Personal Discipline, Improved Morale, Quality Circles, Suggestions for Improvement
const KAIZEN_SEGMENTS = [
  { label: 'Teamwork',    start: 198, end: 270, mid: 234, color: '#E74C3C' },
  { label: 'Discipline',  start: 270, end: 342, mid: 306, color: '#E67E22' },
  { label: 'Morale',      start: 342, end: 54,  mid: 18,  color: '#27AE60' },
  { label: 'Quality',     start: 54,  end: 126, mid: 90,  color: '#2980B9' },
  { label: 'Suggestions', start: 126, end: 198, mid: 162, color: '#8E44AD' },
]

// Teamwork — two people figures
const TeamworkIcon = ({ x, y }) => (
  <Group>
    <Circle cx={x - 7} cy={y - 14} r={5} color="rgba(255,255,255,0.9)" />
    <Path path={`M ${x-14} ${y+2} Q ${x-7} ${y-6} ${x} ${y+2}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
    <Circle cx={x + 7} cy={y - 14} r={5} color="rgba(255,255,255,0.9)" />
    <Path path={`M ${x} ${y+2} Q ${x+7} ${y-6} ${x+14} ${y+2}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
    <Line p1={vec(x-5, y+2)} p2={vec(x+5, y+2)} color="rgba(255,255,255,0.7)" strokeWidth={2} />
  </Group>
)

// Discipline — clock / timer
const DisciplineIcon = ({ x, y }) => (
  <Group>
    <Path path={`M ${x} ${y-14} A 14 14 0 1 1 ${x-0.01} ${y-14}`}
      color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.5} />
    <Circle cx={x} cy={y} r={14} color="rgba(255,255,255,0.15)" />
    <Path path={`M ${x} ${y-13} A 13 13 0 0 1 ${x+13} ${y} A 13 13 0 0 1 ${x} ${y+13} A 13 13 0 0 1 ${x-13} ${y} A 13 13 0 0 1 ${x} ${y-13}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Line p1={vec(x, y)} p2={vec(x, y - 9)} color="rgba(255,255,255,0.95)" strokeWidth={2.2} />
    <Line p1={vec(x, y)} p2={vec(x + 6, y + 4)} color="rgba(255,255,255,0.95)" strokeWidth={2.2} />
    <Circle cx={x} cy={y} r={2} color="rgba(255,255,255,0.9)" />
  </Group>
)

// Morale — star / smile
const MoraleIcon = ({ x, y }) => {
  const star = `M ${x} ${y-16} L ${x+4} ${y-8} L ${x+13} ${y-7} L ${x+6} ${y} L ${x+8} ${y+10} L ${x} ${y+5} L ${x-8} ${y+10} L ${x-6} ${y} L ${x-13} ${y-7} L ${x-4} ${y-8} Z`
  return (
    <Group>
      <Path path={star} color="rgba(255,255,255,0.9)" />
    </Group>
  )
}

// Quality Circles — overlapping rings (Venn)
const QualityIcon = ({ x, y }) => (
  <Group>
    <Path path={`M ${x-5} ${y-4} A 10 10 0 1 1 ${x-5.01} ${y-4}`}
      color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.2} />
    <Circle cx={x - 5} cy={y} r={10} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x-5} ${y-10} A 10 10 0 0 1 ${x+5} ${y-10} A 10 10 0 0 1 ${x+5} ${y+10} A 10 10 0 0 1 ${x-5} ${y+10} A 10 10 0 0 1 ${x-5} ${y-10}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Circle cx={x + 5} cy={y} r={10} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x+5} ${y-10} A 10 10 0 0 1 ${x+15} ${y} A 10 10 0 0 1 ${x+5} ${y+10} A 10 10 0 0 1 ${x-5} ${y+10} A 10 10 0 0 1 ${x-5} ${y-10} A 10 10 0 0 1 ${x+5} ${y-10}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
  </Group>
)

// Suggestions — lightbulb
const SuggestionsIcon = ({ x, y }) => {
  const bulb = `M ${x-8} ${y-4} Q ${x-8} ${y-16} ${x} ${y-16} Q ${x+8} ${y-16} ${x+8} ${y-4} Q ${x+8} ${y+2} ${x+5} ${y+6} L ${x-5} ${y+6} Q ${x-8} ${y+2} ${x-8} ${y-4} Z`
  return (
    <Group>
      <Path path={bulb} color="rgba(255,255,255,0.9)" />
      <Rect x={x - 5} y={y + 6} width={10} height={4} r={1} color="rgba(255,255,255,0.7)" />
      <Rect x={x - 4} y={y + 11} width={8} height={3} r={1} color="rgba(255,255,255,0.5)" />
    </Group>
  )
}

const KAIZEN_ICONS = [TeamworkIcon, DisciplineIcon, MoraleIcon, QualityIcon, SuggestionsIcon]

const KaizenWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
    {KAIZEN_SEGMENTS.map((seg, i) => (
      <Path key={i} path={segPath(seg.start, seg.end)} color={seg.color} />
    ))}
    {KAIZEN_SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return <Line key={i} p1={vec(cx, cy)} p2={vec(p.x, p.y)} color="white" strokeWidth={2.5} />
    })}
    {KAIZEN_SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = KAIZEN_ICONS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#FFF8F0" />
  </Canvas>
)

const KAIZEN_PHASES = [
  {
    bg: '#FDEDEC', label: 'Teamwork', abbr: 'T',
    tagline: 'Collaborate across all levels continuously',
    num: '1', accentColor: '#E74C3C',
    definitions: [
      { title: 'Cross-functional teams',  body: 'Break silos by forming teams across departments; diverse perspectives surface improvement ideas faster.' },
      { title: 'Daily stand-ups',         body: 'Brief daily meetings align the team on yesterday\'s progress, today\'s tasks, and blockers.' },
      { title: 'Shared ownership',        body: 'Every team member is responsible for quality — problems are collective, not individual.' },
    ]
  },
  {
    bg: '#FEF5EB', label: 'Personal Discipline', abbr: 'D',
    tagline: 'Build habits that sustain improvement',
    num: '2', accentColor: '#E67E22',
    definitions: [
      { title: 'Standard adherence',      body: 'Follow established standards precisely before attempting to change them — discipline enables meaningful comparison.' },
      { title: 'Time management',         body: 'Kaizen events are time-boxed; personal discipline keeps improvements focused and measurable within the sprint.' },
      { title: 'Self-reflection (Hansei)', body: 'Regularly reflect on mistakes and shortcomings as a learning practice, not a blame exercise.' },
    ]
  },
  {
    bg: '#EAFAF1', label: 'Improved Morale', abbr: 'M',
    tagline: 'Engage people as the engine of change',
    num: '3', accentColor: '#27AE60',
    definitions: [
      { title: 'Recognition culture',     body: 'Celebrate small wins publicly; visible appreciation reinforces that every improvement counts.' },
      { title: 'Psychological safety',    body: 'People must feel safe to flag problems without fear of blame — silence hides waste.' },
      { title: 'Skill development',       body: 'Invest in training so employees have the tools to solve problems, not just report them.' },
    ]
  },
  {
    bg: '#EAF4FB', label: 'Quality Circles', abbr: 'Q',
    tagline: 'Small groups solving real problems',
    num: '4', accentColor: '#2980B9',
    definitions: [
      { title: 'Voluntary participation',  body: 'Quality circles are employee-led; voluntary membership drives genuine engagement over compliance.' },
      { title: 'Data-driven discussion',   body: 'Use simple tools — Pareto charts, check sheets, cause-and-effect diagrams — to analyse actual data.' },
      { title: 'Management support',       body: 'Leaders provide resources and authority to implement solutions; without this, circles lose momentum.' },
    ]
  },
  {
    bg: '#F5EEF8', label: 'Suggestions', abbr: 'S',
    tagline: 'Harness every employee\'s insight',
    num: '5', accentColor: '#8E44AD',
    definitions: [
      { title: 'Suggestion system (Teian)', body: 'Structured programmes to capture, evaluate, and implement employee improvement ideas at scale.' },
      { title: 'Fast feedback loop',        body: 'Acknowledge suggestions within 48 hours and implement approved ideas within 30 days to maintain trust.' },
      { title: 'Quantity over perfection',  body: 'Encourage high volumes of small ideas — many micro-improvements compound into major gains.' },
    ]
  },
]

const KaizenCard = ({ phase }) => (
  <View style={ks.card}>
    <View style={ks.left}>
      <View style={[ks.circle, { backgroundColor: phase.bg }]}>
        <Text style={[ks.abbr, { color: phase.accentColor }]}>{phase.abbr}</Text>
      </View>
      <Text style={ks.stepLabel}>PILLAR {phase.num}</Text>
    </View>
    <View style={ks.body}>
      <Text style={ks.cardTitle}>{phase.label}</Text>
      <Text style={ks.tagline}>{phase.tagline}</Text>
      {phase.definitions.map((def, i) => (
        <View key={i} style={ks.defItem}>
          <View style={[ks.dot, { backgroundColor: phase.accentColor }]} />
          <Text style={ks.defText}>
            <Text style={ks.defTitle}>{def.title}: </Text>
            {def.body}
          </Text>
        </View>
      ))}
    </View>
  </View>
)

export const KaizenScreen = () => (
  <SafeAreaView style={ks.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#C0392B" />
    <View style={ks.header}>
      <Text style={ks.headerText}>KAIZEN</Text>
      <Text style={ks.headerSub}>Continuous Improvement</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={ks.wheelContainer}>
        <KaizenWheel />
        <View style={ks.centerBadge} pointerEvents="none">
          <Text style={ks.centerBig}>改善</Text>
          <Text style={ks.centerSub}>KAIZEN</Text>
        </View>
        {KAIZEN_SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          return (
            <Text key={seg.label} style={[ks.segLabel, { left: lp.x - 38, top: lp.y + 13 }]}>
              {seg.label}
            </Text>
          )
        })}
      </View>
      {KAIZEN_PHASES.map((phase) => (
        <KaizenCard key={phase.num} phase={phase} />
      ))}
    </ScrollView>
  </SafeAreaView>
)

const ks = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F5F5F2' },
  header:        { backgroundColor: '#C0392B', paddingVertical: 18, alignItems: 'center' },
  headerText:    { fontSize: 26, fontWeight: '700', color: '#FDEDEC', letterSpacing: 2 },
  headerSub:     { fontSize: 12, fontWeight: '500', color: 'rgba(253,237,236,0.75)', letterSpacing: 1.5, marginTop: 2 },
  wheelContainer:{ alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, marginBottom: 8, position: 'relative' },
  centerBadge:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerBig:     { fontSize: 24, fontWeight: '900', color: '#C0392B', lineHeight: 28 },
  centerSub:     { fontSize: 9,  fontWeight: '700', color: '#888', letterSpacing: 2 },
  segLabel:      { position: 'absolute', width: 76, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  left:          { alignItems: 'center', gap: 6 },
  circle:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  abbr:          { fontSize: 22, fontWeight: '900' },
  stepLabel:     { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },
  body:          { flex: 1 },
  cardTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  tagline:       { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  defItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:           { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:       { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:      { fontWeight: '700', color: '#222' },
})


// ─────────────────────────────────────────────────────────────────────────
// TOTAL QUALITY MANAGEMENT (TQM) COMPONENT
// ─────────────────────────────────────────────────────────────────────────

const TQM_SEGMENTS = [
  { label: 'Customer Focus',    start: 198, end: 270, mid: 234, color: '#1A6B8A' },
  { label: 'Leadership',        start: 270, end: 342, mid: 306, color: '#0E8C6E' },
  { label: 'Process Approach',  start: 342, end: 54,  mid: 18,  color: '#C17A00' },
  { label: 'Improvement',       start: 54,  end: 126, mid: 90,  color: '#7B3FA0' },
  { label: 'Evidence-Based',    start: 126, end: 198, mid: 162, color: '#B03A2E' },
]

// Customer Focus — person with speech bubble
const CustomerFocusIcon = ({ x, y }) => (
  <Group>
    <Circle cx={x} cy={y - 12} r={7} color="rgba(255,255,255,0.9)" />
    <Path path={`M ${x-10} ${y+4} Q ${x-10} ${y-4} ${x} ${y-4} Q ${x+10} ${y-4} ${x+10} ${y+4} L ${x+10} ${y+10} L ${x-10} ${y+10} Z`}
      color="rgba(255,255,255,0.9)" />
    <Path path={`M ${x+10} ${y-16} L ${x+20} ${y-20} L ${x+14} ${y-14}`}
      color="rgba(255,255,255,0.7)" style="stroke" strokeWidth={1.8} />
    <Path path={`M ${x+10} ${y-22} A 8 8 0 0 1 ${x+22} ${y-14} A 8 8 0 0 1 ${x+10} ${y-22}`}
      color="rgba(255,255,255,0.8)" style="stroke" strokeWidth={1.8} />
  </Group>
)

// Leadership — crown
const LeadershipIcon = ({ x, y }) => {
  const crown = `M ${x-14} ${y+6} L ${x-14} ${y-8} L ${x-6} ${y-2} L ${x} ${y-14} L ${x+6} ${y-2} L ${x+14} ${y-8} L ${x+14} ${y+6} Z`
  return (
    <Group>
      <Path path={crown} color="rgba(255,255,255,0.9)" />
      <Circle cx={x}      cy={y - 14} r={3} color="rgba(255,255,255,0.6)" />
      <Circle cx={x - 14} cy={y - 8}  r={2.5} color="rgba(255,255,255,0.6)" />
      <Circle cx={x + 14} cy={y - 8}  r={2.5} color="rgba(255,255,255,0.6)" />
    </Group>
  )
}

// Process Approach — gears / flow arrows
const ProcessIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 16} y={y - 12} width={12} height={12} r={2} color="rgba(255,255,255,0.85)" />
    <Rect x={x - 2}  y={y - 8}  width={12} height={12} r={2} color="rgba(255,255,255,0.85)" />
    <Rect x={x + 12} y={y - 12} width={12} height={12} r={2} color="rgba(255,255,255,0.85)" />
    <Line p1={vec(x - 4, y - 6)} p2={vec(x - 2, y - 6)} color="rgba(255,255,255,0.9)" strokeWidth={2} />
    <Line p1={vec(x + 10, y - 6)} p2={vec(x + 12, y - 6)} color="rgba(255,255,255,0.9)" strokeWidth={2} />
    <Line p1={vec(x - 16, y + 4)} p2={vec(x + 24, y + 4)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
  </Group>
)

// Improvement — upward trending line
const ImprovementIcon = ({ x, y }) => (
  <Group>
    <Path path={`M ${x-14} ${y+8} L ${x-6} ${y+2} L ${x+2} ${y-4} L ${x+10} ${y-12}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
    <Path path={`M ${x+6} ${y-14} L ${x+12} ${y-14} L ${x+12} ${y-8}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
    <Line p1={vec(x - 14, y + 10)} p2={vec(x + 14, y + 10)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
    <Line p1={vec(x - 14, y - 14)} p2={vec(x - 14, y + 10)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
  </Group>
)

// Evidence-Based — document with chart
const EvidenceIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 12} y={y - 16} width={24} height={28} r={3} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x-12} ${y-16} L ${x+12} ${y-16} L ${x+12} ${y+12} L ${x-12} ${y+12} Z`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2} />
    <Rect x={x - 8} y={y - 2}  width={4} height={8}  r={1} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 2} y={y - 6}  width={4} height={12} r={1} color="rgba(255,255,255,0.9)" />
    <Rect x={x + 4} y={y - 10} width={4} height={16} r={1} color="rgba(255,255,255,0.9)" />
    <Line p1={vec(x - 8, y - 12)} p2={vec(x + 8, y - 12)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
    <Line p1={vec(x - 8, y - 9)}  p2={vec(x + 4, y - 9)}  color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
  </Group>
)

const TQM_ICONS = [CustomerFocusIcon, LeadershipIcon, ProcessIcon, ImprovementIcon, EvidenceIcon]

const TQMWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
    {TQM_SEGMENTS.map((seg, i) => (
      <Path key={i} path={segPath(seg.start, seg.end)} color={seg.color} />
    ))}
    {TQM_SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return <Line key={i} p1={vec(cx, cy)} p2={vec(p.x, p.y)} color="white" strokeWidth={2.5} />
    })}
    {TQM_SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = TQM_ICONS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#F0F4FF" />
  </Canvas>
)

const TQM_PHASES = [
  {
    bg: '#E8F4F8', label: 'Customer Focus', abbr: 'C',
    tagline: 'Every decision starts with the customer',
    num: '1', accentColor: '#1A6B8A',
    definitions: [
      { title: 'VOC integration',       body: 'Systematically capture Voice of the Customer data and embed it into product, process, and service design.' },
      { title: 'Customer satisfaction', body: 'Measure NPS, CSAT, and complaint rates as primary KPIs — internal metrics must trace back to customer outcomes.' },
      { title: 'Delight vs. satisfy',   body: 'TQM aims to exceed expectations, not just meet them — the gap between satisfaction and delight creates loyalty.' },
    ]
  },
  {
    bg: '#E8F8F4', label: 'Leadership', abbr: 'L',
    tagline: 'Leaders set the culture for quality',
    num: '2', accentColor: '#0E8C6E',
    definitions: [
      { title: 'Management commitment',  body: 'TQM fails without visible, sustained executive commitment — quality cannot be delegated to a department.' },
      { title: 'Quality policy',         body: 'Leaders define and communicate a clear quality policy that shapes every employee\'s daily decisions.' },
      { title: 'Gemba walks',            body: 'Leaders regularly visit the actual work area (gemba) to understand problems firsthand, not through reports.' },
    ]
  },
  {
    bg: '#FEF9EC', label: 'Process Approach', abbr: 'P',
    tagline: 'Manage work as interconnected processes',
    num: '3', accentColor: '#C17A00',
    definitions: [
      { title: 'Process ownership',      body: 'Every process has a named owner accountable for performance, improvement, and cross-functional coordination.' },
      { title: 'Input/output mapping',   body: 'Document what each process receives, transforms, and delivers — SIPOC maps prevent handoff failures.' },
      { title: 'Variation reduction',    body: 'Standardise processes to reduce variability; only stable, understood processes can be reliably improved.' },
    ]
  },
  {
    bg: '#F4EEF8', label: 'Continual Improvement', abbr: 'I',
    tagline: 'Improvement is never finished',
    num: '4', accentColor: '#7B3FA0',
    definitions: [
      { title: 'PDCA cycle',             body: 'Plan-Do-Check-Act is the engine of TQM improvement — every change is a hypothesis to be tested, not assumed.' },
      { title: 'Benchmarking',           body: 'Compare processes against best-in-class organisations to set ambitious but achievable targets.' },
      { title: 'Breakthrough vs. incremental', body: 'Balance large-scale redesign (kaikaku) with small daily improvements (kaizen) for short and long-term gains.' },
    ]
  },
  {
    bg: '#FDEDEC', label: 'Evidence-Based Decisions', abbr: 'E',
    tagline: 'Data replaces opinion in every discussion',
    num: '5', accentColor: '#B03A2E',
    definitions: [
      { title: 'Quality data systems',   body: 'Invest in reliable data collection at source — decisions made on bad data create worse problems than no data.' },
      { title: '7 QC tools',             body: 'Master the seven quality tools: check sheets, histograms, Pareto charts, control charts, scatter plots, flowcharts, and cause-effect diagrams.' },
      { title: 'Fact-based reviews',     body: 'Management reviews are structured around data dashboards, not anecdotes — trends are analysed, not described.' },
    ]
  },
]

const TQMCard = ({ phase }) => (
  <View style={ts.card}>
    <View style={ts.left}>
      <View style={[ts.circle, { backgroundColor: phase.bg }]}>
        <Text style={[ts.abbr, { color: phase.accentColor }]}>{phase.abbr}</Text>
      </View>
      <Text style={ts.stepLabel}>PILLAR {phase.num}</Text>
    </View>
    <View style={ts.body}>
      <Text style={ts.cardTitle}>{phase.label}</Text>
      <Text style={ts.tagline}>{phase.tagline}</Text>
      {phase.definitions.map((def, i) => (
        <View key={i} style={ts.defItem}>
          <View style={[ts.dot, { backgroundColor: phase.accentColor }]} />
          <Text style={ts.defText}>
            <Text style={ts.defTitle}>{def.title}: </Text>
            {def.body}
          </Text>
        </View>
      ))}
    </View>
  </View>
)

export const TQMScreen = () => (
  <SafeAreaView style={ts.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#1A3A5C" />
    <View style={ts.header}>
      <Text style={ts.headerText}>TOTAL QUALITY MANAGEMENT</Text>
      <Text style={ts.headerSub}>TQM Framework</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={ts.wheelContainer}>
        <TQMWheel />
        <View style={ts.centerBadge} pointerEvents="none">
          <Text style={ts.centerBig}>TQM</Text>
          <Text style={ts.centerSub}>QUALITY</Text>
        </View>
        {TQM_SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          return (
            <Text key={seg.label} style={[ts.segLabel, { left: lp.x - 38, top: lp.y + 13 }]}>
              {seg.label}
            </Text>
          )
        })}
      </View>
      {TQM_PHASES.map((phase) => (
        <TQMCard key={phase.num} phase={phase} />
      ))}
    </ScrollView>
  </SafeAreaView>
)

const ts = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F5F5F2' },
  header:        { backgroundColor: '#1A3A5C', paddingVertical: 18, alignItems: 'center', paddingHorizontal: 16 },
  headerText:    { fontSize: 18, fontWeight: '700', color: '#E8F4FE', letterSpacing: 1.5, textAlign: 'center' },
  headerSub:     { fontSize: 12, fontWeight: '500', color: 'rgba(232,244,254,0.7)', letterSpacing: 1.5, marginTop: 2 },
  wheelContainer:{ alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, marginBottom: 8, position: 'relative' },
  centerBadge:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerBig:     { fontSize: 24, fontWeight: '900', color: '#1A3A5C', lineHeight: 28 },
  centerSub:     { fontSize: 9,  fontWeight: '700', color: '#888', letterSpacing: 2 },
  segLabel:      { position: 'absolute', width: 76, textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  left:          { alignItems: 'center', gap: 6 },
  circle:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  abbr:          { fontSize: 22, fontWeight: '900' },
  stepLabel:     { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },
  body:          { flex: 1 },
  cardTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  tagline:       { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  defItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:           { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:       { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:      { fontWeight: '700', color: '#222' },
})


// ─────────────────────────────────────────────────────────────────────────
// QUALITY CONTROL (QC) COMPONENT
// ─────────────────────────────────────────────────────────────────────────

const QC_SEGMENTS = [
  { label: 'Inspection',    start: 198, end: 270, mid: 234, color: '#2471A3' },
  { label: 'Testing',       start: 270, end: 342, mid: 306, color: '#148F77' },
  { label: 'SPC',           start: 342, end: 54,  mid: 18,  color: '#D4880A' },
  { label: 'Sampling',      start: 54,  end: 126, mid: 90,  color: '#1E8BC3' },
  { label: 'Non-Conformance', start: 126, end: 198, mid: 162, color: '#922B21' },
]

// Inspection — eye / magnifier
const InspectionIcon = ({ x, y }) => (
  <Group>
    <Path path={`M ${x-14} ${y} Q ${x} ${y-14} ${x+14} ${y} Q ${x} ${y+14} ${x-14} ${y} Z`}
      color="rgba(255,255,255,0.25)" />
    <Path path={`M ${x-14} ${y} Q ${x} ${y-14} ${x+14} ${y} Q ${x} ${y+14} ${x-14} ${y} Z`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Circle cx={x} cy={y} r={5} color="rgba(255,255,255,0.9)" />
    <Circle cx={x} cy={y} r={2} color="rgba(255,255,255,0.4)" />
  </Group>
)

// Testing — beaker / flask
const TestingIcon = ({ x, y }) => {
  const flask = `M ${x-6} ${y-16} L ${x-6} ${y-4} L ${x-14} ${y+10} Q ${x-14} ${y+16} ${x} ${y+16} Q ${x+14} ${y+16} ${x+14} ${y+10} L ${x+6} ${y-4} L ${x+6} ${y-16} Z`
  return (
    <Group>
      <Path path={flask} color="rgba(255,255,255,0.2)" />
      <Path path={flask} color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
      <Line p1={vec(x - 8, y - 14)} p2={vec(x + 8, y - 14)} color="rgba(255,255,255,0.7)" strokeWidth={2} />
      <Circle cx={x - 5} cy={y + 8}  r={2.5} color="rgba(255,255,255,0.8)" />
      <Circle cx={x + 4} cy={y + 5}  r={2}   color="rgba(255,255,255,0.8)" />
    </Group>
  )
}

// SPC — control chart with UCL/LCL lines
const SPCIcon = ({ x, y }) => (
  <Group>
    {/* UCL */}
    <Line p1={vec(x - 14, y - 12)} p2={vec(x + 14, y - 12)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
    {/* CL */}
    <Line p1={vec(x - 14, y)} p2={vec(x + 14, y)} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
    {/* LCL */}
    <Line p1={vec(x - 14, y + 12)} p2={vec(x + 14, y + 12)} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
    {/* Zigzag data line */}
    <Path path={`M ${x-14} ${y-4} L ${x-8} ${y-10} L ${x-2} ${y+2} L ${x+4} ${y-8} L ${x+10} ${y+4} L ${x+14} ${y-2}`}
      color="rgba(255,255,255,0.95)" style="stroke" strokeWidth={2.2} />
  </Group>
)

// Sampling — grid / sample dots
const SamplingIcon = ({ x, y }) => (
  <Group>
    {[y-12, y-4, y+4, y+12].map((ry, ri) =>
      [x-10, x-2, x+6].map((rx, ci) => (
        <Circle
          key={`${ri}-${ci}`}
          cx={rx} cy={ry} r={2.5}
          color={(ri + ci) % 3 === 0
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.35)'}
        />
      ))
    )}
    <Rect x={x - 14} y={y - 16} width={24} height={32} r={2}
      color="rgba(255,255,255,0)" style="stroke" strokeWidth={1.8} />
  </Group>
)

// Non-Conformance — X / reject mark
const NonConformanceIcon = ({ x, y }) => (
  <Group>
    <Circle cx={x} cy={y} r={14} color="rgba(255,255,255,0.15)" />
    <Path path={`M ${x} ${y-14} A 14 14 0 0 1 ${x+14} ${y} A 14 14 0 0 1 ${x} ${y+14} A 14 14 0 0 1 ${x-14} ${y} A 14 14 0 0 1 ${x} ${y-14}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Line p1={vec(x - 7, y - 7)} p2={vec(x + 7, y + 7)} color="rgba(255,255,255,0.95)" strokeWidth={3} />
    <Line p1={vec(x + 7, y - 7)} p2={vec(x - 7, y + 7)} color="rgba(255,255,255,0.95)" strokeWidth={3} />
  </Group>
)

const QC_ICONS = [InspectionIcon, TestingIcon, SPCIcon, SamplingIcon, NonConformanceIcon]

const QCWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
    {QC_SEGMENTS.map((seg, i) => (
      <Path key={i} path={segPath(seg.start, seg.end)} color={seg.color} />
    ))}
    {QC_SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return <Line key={i} p1={vec(cx, cy)} p2={vec(p.x, p.y)} color="white" strokeWidth={2.5} />
    })}
    {QC_SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = QC_ICONS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#EEF4FF" />
  </Canvas>
)

const QC_PHASES = [
  {
    bg: '#EAF2F8', label: 'Inspection', abbr: 'I',
    tagline: 'Detect defects before they reach the customer',
    num: '1', accentColor: '#2471A3',
    definitions: [
      { title: '100% vs. sampling',      body: 'Choose between 100% inspection for critical parts or acceptance sampling for high-volume, lower-risk products.' },
      { title: 'Incoming inspection',    body: 'Inspect raw materials and components at receipt — defects caught here are far cheaper than those found downstream.' },
      { title: 'In-process inspection',  body: 'Check work at defined checkpoints during production, not just at the end, to catch drift early.' },
    ]
  },
  {
    bg: '#E8F8F4', label: 'Testing', abbr: 'T',
    tagline: 'Validate that products meet specifications',
    num: '2', accentColor: '#148F77',
    definitions: [
      { title: 'Functional testing',     body: 'Verify that the product performs its intended function under normal operating conditions.' },
      { title: 'Destructive testing',    body: 'Push samples to failure to determine safety margins and material limits — sacrificial but revealing.' },
      { title: 'Environmental testing',  body: 'Expose products to temperature, humidity, vibration, and shock to verify durability over the product lifecycle.' },
    ]
  },
  {
    bg: '#FEF6E4', label: 'Statistical Process Control', abbr: 'S',
    tagline: 'Use statistics to monitor and control processes',
    num: '3', accentColor: '#D4880A',
    definitions: [
      { title: 'Control charts',         body: 'X-bar, R, p, and c charts detect when a process shifts out of statistical control before defects are produced.' },
      { title: 'Control limits vs. spec limits', body: 'Control limits (3σ from mean) show process behaviour; spec limits show customer requirements — these are different.' },
      { title: 'Common vs. special cause', body: 'Common cause variation is inherent to the process; special cause variation is an assignable anomaly requiring investigation.' },
    ]
  },
  {
    bg: '#EAF4FB', label: 'Sampling Plans', abbr: 'S',
    tagline: 'Inspect intelligently, not exhaustively',
    num: '4', accentColor: '#1E8BC3',
    definitions: [
      { title: 'AQL (Acceptable Quality Level)', body: 'Define the maximum defect percentage considered acceptable — AQL drives sample size and lot acceptance decisions.' },
      { title: 'MIL-STD-1916 / ISO 2859',        body: 'Standardised sampling tables provide statistically valid sample sizes without custom calculation for each lot.' },
      { title: 'Skip-lot sampling',               body: 'Reduce inspection frequency for consistently good suppliers — reward performance while maintaining oversight.' },
    ]
  },
  {
    bg: '#FDEDEC', label: 'Non-Conformance', abbr: 'N',
    tagline: 'Control and close every defect found',
    num: '5', accentColor: '#922B21',
    definitions: [
      { title: 'NCR (Non-Conformance Report)', body: 'Document every defect with description, quantity, location, disposition decision, and corrective action required.' },
      { title: 'Disposition options',          body: 'Non-conforming product is accepted as-is (use), reworked, scrapped, or returned — each option has a cost.' },
      { title: 'CAPA',                         body: 'Corrective and Preventive Action closes the loop: fix the instance, find the root cause, and prevent recurrence.' },
    ]
  },
]

const QCCard = ({ phase }) => (
  <View style={qcs.card}>
    <View style={qcs.left}>
      <View style={[qcs.circle, { backgroundColor: phase.bg }]}>
        <Text style={[qcs.abbr, { color: phase.accentColor }]}>{phase.abbr}</Text>
      </View>
      <Text style={qcs.stepLabel}>STEP {phase.num}</Text>
    </View>
    <View style={qcs.body}>
      <Text style={qcs.cardTitle}>{phase.label}</Text>
      <Text style={qcs.tagline}>{phase.tagline}</Text>
      {phase.definitions.map((def, i) => (
        <View key={i} style={qcs.defItem}>
          <View style={[qcs.dot, { backgroundColor: phase.accentColor }]} />
          <Text style={qcs.defText}>
            <Text style={qcs.defTitle}>{def.title}: </Text>
            {def.body}
          </Text>
        </View>
      ))}
    </View>
  </View>
)

export const QualityControlScreen = () => (
  <SafeAreaView style={qcs.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#1A2F5A" />
    <View style={qcs.header}>
      <Text style={qcs.headerText}>QUALITY CONTROL</Text>
      <Text style={qcs.headerSub}>Detection & Conformance</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={qcs.wheelContainer}>
        <QCWheel />
        <View style={qcs.centerBadge} pointerEvents="none">
          <Text style={qcs.centerBig}>QC</Text>
          <Text style={qcs.centerSub}>CONTROL</Text>
        </View>
        {QC_SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          return (
            <Text key={seg.label} style={[qcs.segLabel, { left: lp.x - 38, top: lp.y + 13 }]}>
              {seg.label}
            </Text>
          )
        })}
      </View>
      {QC_PHASES.map((phase) => (
        <QCCard key={phase.num} phase={phase} />
      ))}
    </ScrollView>
  </SafeAreaView>
)

const qcs = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F5F5F2' },
  header:        { backgroundColor: '#1A2F5A', paddingVertical: 18, alignItems: 'center' },
  headerText:    { fontSize: 22, fontWeight: '700', color: '#E8F0FE', letterSpacing: 2 },
  headerSub:     { fontSize: 12, fontWeight: '500', color: 'rgba(232,240,254,0.7)', letterSpacing: 1.5, marginTop: 2 },
  wheelContainer:{ alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, marginBottom: 8, position: 'relative' },
  centerBadge:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerBig:     { fontSize: 28, fontWeight: '900', color: '#1A2F5A', lineHeight: 32 },
  centerSub:     { fontSize: 9,  fontWeight: '700', color: '#888', letterSpacing: 2 },
  segLabel:      { position: 'absolute', width: 76, textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  left:          { alignItems: 'center', gap: 6 },
  circle:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  abbr:          { fontSize: 24, fontWeight: '900' },
  stepLabel:     { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },
  body:          { flex: 1 },
  cardTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  tagline:       { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  defItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:           { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:       { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:      { fontWeight: '700', color: '#222' },
})


// ─────────────────────────────────────────────────────────────────────────
// QUALITY ASSURANCE (QA) COMPONENT
// ─────────────────────────────────────────────────────────────────────────

const QA_SEGMENTS = [
  { label: 'Planning',     start: 198, end: 270, mid: 234, color: '#1F618D' },
  { label: 'Auditing',     start: 270, end: 342, mid: 306, color: '#117A65' },
  { label: 'Process Std.', start: 342, end: 54,  mid: 18,  color: '#B7770D' },
  { label: 'Training',     start: 54,  end: 126, mid: 90,  color: '#6C3483' },
  { label: 'Review',       start: 126, end: 198, mid: 162, color: '#1A5276' },
]

// Planning — calendar / roadmap
const PlanningIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 14} y={y - 14} width={28} height={26} r={3} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x-14} ${y-14} L ${x+14} ${y-14} L ${x+14} ${y+12} L ${x-14} ${y+12} Z`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2} />
    <Line p1={vec(x - 14, y - 6)} p2={vec(x + 14, y - 6)} color="rgba(255,255,255,0.6)" strokeWidth={1.5} />
    <Rect x={x - 10} y={y - 2} width={6}  height={6} r={1} color="rgba(255,255,255,0.9)" />
    <Rect x={x - 1}  y={y - 2} width={6}  height={6} r={1} color="rgba(255,255,255,0.9)" />
    <Rect x={x + 8}  y={y - 2} width={6}  height={6} r={1} color="rgba(255,255,255,0.4)" />
    <Line p1={vec(x - 6, y - 18)} p2={vec(x - 6, y - 10)} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
    <Line p1={vec(x + 6, y - 18)} p2={vec(x + 6, y - 10)} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
  </Group>
)

// Auditing — clipboard with checkmarks
const AuditingIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 12} y={y - 16} width={24} height={30} r={3} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x-12} ${y-16} L ${x+12} ${y-16} L ${x+12} ${y+14} L ${x-12} ${y+14} Z`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2} />
    <Rect x={x - 7} y={y - 20} width={14} height={8} r={2} color="rgba(255,255,255,0.9)" />
    <Path path={`M ${x-7} ${y-8} L ${x-4} ${y-5} L ${x+2} ${y-12}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Path path={`M ${x-7} ${y+1} L ${x-4} ${y+4} L ${x+2} ${y-3}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.2} />
    <Line p1={vec(x + 5, y - 8)} p2={vec(x + 10, y - 8)} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
    <Line p1={vec(x + 5, y + 1)} p2={vec(x + 10, y + 1)} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
  </Group>
)

// Process Standards — document stack
const ProcessStdIcon = ({ x, y }) => (
  <Group>
    <Rect x={x - 10} y={y - 12} width={22} height={26} r={3} color="rgba(255,255,255,0.15)" />
    <Rect x={x - 12} y={y - 14} width={22} height={26} r={3} color="rgba(255,255,255,0.25)" />
    <Rect x={x - 14} y={y - 16} width={22} height={26} r={3} color="rgba(255,255,255,0.2)" />
    <Path path={`M ${x-14} ${y-16} L ${x+8} ${y-16} L ${x+8} ${y+10} L ${x-14} ${y+10} Z`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2} />
    <Line p1={vec(x - 10, y - 8)} p2={vec(x + 4, y - 8)} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
    <Line p1={vec(x - 10, y - 2)} p2={vec(x + 4, y - 2)} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
    <Line p1={vec(x - 10, y + 4)} p2={vec(x + 4, y + 4)} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
  </Group>
)

// Training — graduation cap
const TrainingIcon = ({ x, y }) => {
  const cap = `M ${x} ${y-16} L ${x+16} ${y-8} L ${x} ${y} L ${x-16} ${y-8} Z`
  return (
    <Group>
      <Path path={cap} color="rgba(255,255,255,0.9)" />
      <Path path={`M ${x+16} ${y-8} L ${x+16} ${y+4}`}
        color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.5} />
      <Path path={`M ${x+6} ${y-3} Q ${x+6} ${y+8} ${x} ${y+12} Q ${x-6} ${y+8} ${x-6} ${y-3}`}
        color="rgba(255,255,255,0.8)" style="stroke" strokeWidth={2.2} />
    </Group>
  )
}

// Review — circular arrows (refresh)
const ReviewIcon = ({ x, y }) => (
  <Group>
    <Path path={`M ${x+12} ${y} A 12 12 0 1 1 ${x+6} ${y-10}`}
      color="rgba(255,255,255,0)" style="stroke" strokeWidth={2.8} />
    <Path path={`M ${x} ${y-12} A 12 12 0 0 1 ${x+12} ${y} A 12 12 0 0 1 ${x} ${y+12} A 12 12 0 0 1 ${x-12} ${y} A 12 12 0 0 1 ${x} ${y-12}`}
      color="rgba(255,255,255,0.9)" style="stroke" strokeWidth={2.8} />
    <Path path={`M ${x+6} ${y-16} L ${x+12} ${y-10} L ${x} ${y-10}`}
      color="rgba(255,255,255,0.9)" style="fill" />
  </Group>
)

const QA_ICONS = [PlanningIcon, AuditingIcon, ProcessStdIcon, TrainingIcon, ReviewIcon]

const QAWheel = () => (
  <Canvas style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
    {QA_SEGMENTS.map((seg, i) => (
      <Path key={i} path={segPath(seg.start, seg.end)} color={seg.color} />
    ))}
    {QA_SEGMENTS.map((seg, i) => {
      const p = polar(seg.start)
      return <Line key={i} p1={vec(cx, cy)} p2={vec(p.x, p.y)} color="white" strokeWidth={2.5} />
    })}
    {QA_SEGMENTS.map((seg, i) => {
      const lp = polar(seg.mid, LABEL_R)
      const IconComp = QA_ICONS[i]
      return <IconComp key={i} x={lp.x} y={lp.y} />
    })}
    <Circle cx={cx} cy={cy} r={CENTER_R} color="white" />
    <Circle cx={cx} cy={cy} r={INNER_R}  color="#EEF2FF" />
  </Canvas>
)

const QA_PHASES = [
  {
    bg: '#EAF2F8', label: 'Quality Planning', abbr: 'P',
    tagline: 'Define standards before work begins',
    num: '1', accentColor: '#1F618D',
    definitions: [
      { title: 'Quality plan',           body: 'A documented plan specifying which standards apply, what processes will be used, and how quality will be verified.' },
      { title: 'CTQ identification',     body: 'Identify Critical-to-Quality characteristics early so design and processes are built around them from day one.' },
      { title: 'Risk-based planning',    body: 'Apply more rigorous QA activities where failure risk is highest — not every process needs the same scrutiny.' },
    ]
  },
  {
    bg: '#E8F8F4', label: 'Auditing', abbr: 'A',
    tagline: 'Independently verify process compliance',
    num: '2', accentColor: '#117A65',
    definitions: [
      { title: 'Internal audits',        body: 'First-party audits check that your own processes conform to documented procedures and quality standards.' },
      { title: 'Supplier audits',        body: 'Second-party audits verify that suppliers operate processes capable of delivering conforming product consistently.' },
      { title: 'Certification audits',   body: 'Third-party audits by accredited bodies (e.g. ISO 9001) provide independent assurance to customers and regulators.' },
    ]
  },
  {
    bg: '#FEF9EC', label: 'Process Standardisation', abbr: 'S',
    tagline: 'Remove variation through documented standards',
    num: '3', accentColor: '#B7770D',
    definitions: [
      { title: 'SOPs and work instructions', body: 'Detailed step-by-step documents at the point of work ensure tasks are done consistently regardless of who performs them.' },
      { title: 'Document control',           body: 'A formal system manages document versions, approvals, and distribution so obsolete procedures cannot be followed.' },
      { title: 'Change management',          body: 'All process changes go through review and approval before implementation — uncontrolled changes introduce defects.' },
    ]
  },
  {
    bg: '#F4EEF8', label: 'Training & Competence', abbr: 'T',
    tagline: 'People are the backbone of QA',
    num: '4', accentColor: '#6C3483',
    definitions: [
      { title: 'Competency framework',   body: 'Define required skills and knowledge for each role; training is targeted to close specific gaps, not generic.' },
      { title: 'On-the-job verification', body: 'Observe employees performing tasks to confirm training has transferred to the actual work environment.' },
      { title: 'Training records',       body: 'Maintain traceable records of who was trained, when, on what, and with what result — auditors will ask for these.' },
    ]
  },
  {
    bg: '#EAF4FB', label: 'Management Review', abbr: 'R',
    tagline: 'Evaluate the QMS at the highest level',
    num: '5', accentColor: '#1A5276',
    definitions: [
      { title: 'Review inputs',          body: 'Review audit findings, customer feedback, process performance data, and risk register at regular scheduled intervals.' },
      { title: 'Review outputs',         body: 'Management review must produce documented decisions on QMS improvements, resource needs, and quality objectives.' },
      { title: 'Continual improvement',  body: 'The review is not ceremonial — it must result in actions with owners, deadlines, and follow-up at the next review.' },
    ]
  },
]

const QACard = ({ phase }) => (
  <View style={qas.card}>
    <View style={qas.left}>
      <View style={[qas.circle, { backgroundColor: phase.bg }]}>
        <Text style={[qas.abbr, { color: phase.accentColor }]}>{phase.abbr}</Text>
      </View>
      <Text style={qas.stepLabel}>STEP {phase.num}</Text>
    </View>
    <View style={qas.body}>
      <Text style={qas.cardTitle}>{phase.label}</Text>
      <Text style={qas.tagline}>{phase.tagline}</Text>
      {phase.definitions.map((def, i) => (
        <View key={i} style={qas.defItem}>
          <View style={[qas.dot, { backgroundColor: phase.accentColor }]} />
          <Text style={qas.defText}>
            <Text style={qas.defTitle}>{def.title}: </Text>
            {def.body}
          </Text>
        </View>
      ))}
    </View>
  </View>
)

export const QualityAssuranceScreen = () => (
  <SafeAreaView style={qas.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#162D4E" />
    <View style={qas.header}>
      <Text style={qas.headerText}>QUALITY ASSURANCE</Text>
      <Text style={qas.headerSub}>Prevention & Compliance</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={qas.wheelContainer}>
        <QAWheel />
        <View style={qas.centerBadge} pointerEvents="none">
          <Text style={qas.centerBig}>QA</Text>
          <Text style={qas.centerSub}>ASSURANCE</Text>
        </View>
        {QA_SEGMENTS.map((seg) => {
          const lp = polar(seg.mid, LABEL_R)
          return (
            <Text key={seg.label} style={[qas.segLabel, { left: lp.x - 38, top: lp.y + 13 }]}>
              {seg.label}
            </Text>
          )
        })}
      </View>
      {QA_PHASES.map((phase) => (
        <QACard key={phase.num} phase={phase} />
      ))}
    </ScrollView>
  </SafeAreaView>
)

const qas = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F5F5F2' },
  header:        { backgroundColor: '#162D4E', paddingVertical: 18, alignItems: 'center' },
  headerText:    { fontSize: 22, fontWeight: '700', color: '#E8F0FE', letterSpacing: 2 },
  headerSub:     { fontSize: 12, fontWeight: '500', color: 'rgba(232,240,254,0.7)', letterSpacing: 1.5, marginTop: 2 },
  wheelContainer:{ alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, marginBottom: 8, position: 'relative' },
  centerBadge:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerBig:     { fontSize: 28, fontWeight: '900', color: '#162D4E', lineHeight: 32 },
  centerSub:     { fontSize: 9,  fontWeight: '700', color: '#888', letterSpacing: 2 },
  segLabel:      { position: 'absolute', width: 76, textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  left:          { alignItems: 'center', gap: 6 },
  circle:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  abbr:          { fontSize: 24, fontWeight: '900' },
  stepLabel:     { fontSize: 9, fontWeight: '600', color: '#999', letterSpacing: 0.8 },
  body:          { flex: 1 },
  cardTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  tagline:       { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  defItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot:           { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  defText:       { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  defTitle:      { fontWeight: '700', color: '#222' },
})