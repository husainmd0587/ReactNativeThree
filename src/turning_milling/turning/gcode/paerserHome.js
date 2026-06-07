import { StyleSheet, Text, View, ScrollView,TextInput } from 'react-native'
import React, { useState, useEffect } from 'react'
import  Parser  from './parser/parser';
import  Interpreter  from './parser/interPreter';
// import {gcode1} from './docs/gcodeExample'

// ── Clean console loggers ────────────────────────────────────────────────────

const logTimeline = (timeline) => {
  console.log(`\n━━━ TIMELINE (${timeline.length} segments) ━━━`);
  timeline.forEach((seg, i) => {
    console.log(`[${i}] ${seg.type}  |  "${seg.block?.raw?.trim()}"`);
    console.log(`    X${seg.start.X} Z${seg.start.Z}  →  X${seg.end.X} Z${seg.end.Z}`);
    console.log(`    dist=${seg.distance?.toFixed(3)}mm  feed=${seg.feedRate}  t=${seg.startTime?.toFixed(3)}→${seg.endTime?.toFixed(3)}s  pts=${seg.points?.length}`);
  });
};

const logState = (state) => {
  console.log('\n━━━ FINAL STATE ━━━');
  console.log(`  Pos      X:${state.position.X} Y:${state.position.Y} Z:${state.position.Z}`);
  console.log(`  Motion   ${state.motion}  Feed:${state.feed}mm/min`);
  console.log(`  Spindle  ${state.spindle.active ? 'ON' : 'OFF'} ${state.spindle.speed}RPM`);
  console.log(`  Units    ${state.units}  ${state.positioning}  ${state.plane}`);
};

// ── Component ────────────────────────────────────────────────────────────────

const gcode1 = `
  G4 P2
  G1 X10 Z-5 F100
  G4 P1
  G54
  G1 X20 Z-10 F100
  G55
  G1 X30 Z-15 F100
  M5
  M30
`

const ParserHome = () => {
  const [timeline,   setTimeline]   = useState([]);
  const [blocks,     setBlocks]     = useState([]);
  const [finalState, setFinalState] = useState(null);
  const [totalTime,  setTotalTime]  = useState(0);
  const [errors,     setErrors]     = useState([]);
  const [gcode,      setGcode]      = useState(gcode1);

  useEffect(() => {
    const parser = new Parser();
    const interp = new Interpreter({ machineType: 'LATHE' });

    // Parser
    const parsed = parser.parse(gcode);
    setBlocks(parsed);

    // Interpreter
    interp.load(gcode);
    const result = interp.run();

    setTimeline(result.timeline);
    setErrors(result.errors);
    setFinalState(result.finalState);
    setTotalTime(result.totalTime);

  }, [gcode]);

  return (
    <View style={s.root}>
      <Text style={s.title}>CNC Interpreter</Text>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={{backgroundColor: '#a1a2a3', padding: 5, borderRadius: 6, marginBottom: 5}}>
          <Text>gcode</Text>
         <TextInput
  style={{
    color: '#0e25f3',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
    minHeight: 120, // minimum height
    borderWidth: 1,
    padding: 5,
    textAlignVertical: 'top', // important for Android
  }}
  value={gcode}
  onChangeText={setGcode}
  multiline
  numberOfLines={6} // initial lines
/>

        </View>

        {/* ── Machine state ─────────────────────────────── */}
        {finalState && (
          <Section title="Final Machine State">
            <StateRow label="Position"
              value={`X${finalState.position.X}  Y${finalState.position.Y}  Z${finalState.position.Z}`} />
            <StateRow label="Feed"    value={`${finalState.feed} mm/min`} />
            <StateRow label="Spindle" value={`${finalState.spindle.speed} RPM  ${finalState.spindle.active ? '● ON' : '○ OFF'}`} />
            <StateRow label="Motion"  value={finalState.motion} />
            <StateRow label="Units"   value={`${finalState.units}  ${finalState.positioning}`} />
            <StateRow label="Plane"   value={`${finalState.plane}  ${finalState.compensation}`} />
            <StateRow label="Total time" value={`${totalTime.toFixed(3)} s`} accent />
          </Section>
        )}

        {/* ── Errors ────────────────────────────────────── */}
        {errors.length > 0 && (
          <Section title={`Errors (${errors.length})`} accent="red">
            {errors.map((e, i) => (
              <Text key={i} style={s.errorText}>⚠ {e.type}: {e.message}</Text>
            ))}
          </Section>
        )}

        {/* ── Timeline ──────────────────────────────────── */}
        <Section title={`Timeline  (${timeline.length} segments)`}>
          {timeline.map((seg, i) => (
            <SegmentCard key={i} seg={seg} index={i} />
          ))}
        </Section>

        {/* ── Parsed blocks ─────────────────────────────── */}
        <Section title={`Parsed Blocks  (${blocks.length} blocks)`}>
          {blocks.map((block, i) => (
            <BlockCard key={i} block={block} index={i} />
          ))}
        </Section>
      </ScrollView>
    </View>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ title, children, accent }) => (
  <View style={s.section}>
    <Text style={[s.sectionTitle, accent === 'red' && { color: '#ff4444' }]}>
      {title}
    </Text>
    {children}
  </View>
);

const StateRow = ({ label, value, accent }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, accent && { color: '#00ff88' }]}>{value}</Text>
  </View>
);

const SegmentCard = ({ seg, index }) => {
  console.log('gcode line --->>[',seg.block.raw,']');
  console.log(seg.points.map(p => `t=${p.t.toFixed(2)}  X=${p.X.toFixed(4)} Z=${p.Z.toFixed(4)}`));
  console.log(`Segment lenght for ${index}`, seg.points.length);

  const typeColor = seg.type === 'RAPID' ? '#ffaa00' : '#00ccff';
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={[s.segType, { color: typeColor }]}>{seg.type}</Text>
        <Text style={s.segIndex}>#{index}</Text>
        <Text style={s.segRaw}>"{seg.block?.raw?.trim()}"</Text>
      </View>

      <View style={s.grid}>
        <GridCell label="From" value={`X${seg.start.X}  Z${seg.start.Z}`} />
        <GridCell label="To"   value={`X${seg.end.X}  Z${seg.end.Z}`} />
        <GridCell label="Dist" value={`${seg.distance?.toFixed(3)} mm`} />
        <GridCell label="Feed" value={`${seg.feedRate} mm/min`} />
        <GridCell label="tStart" value={`${seg.startTime?.toFixed(3)} s`} />
        <GridCell label="tEnd"   value={`${seg.endTime?.toFixed(3)} s`} />
        <GridCell label="Dur"    value={`${seg.duration?.toFixed(3)} s`} />
        <GridCell label="Pts"    value={`${seg.points?.length ?? 0} pts`} />
      </View>
    </View>
  );
};

const BlockCard = ({ block, index }) => (
  <View style={s.card}>
    <Text style={s.blockRaw}>
      {`#${index + 1}  `}
      <Text style={s.blockCode}>{block.raw?.trim()}</Text>
    </Text>
    {block.comment && (
      <Text style={s.blockComment}>; {block.comment}</Text>
    )}
    <View style={s.grid}>
      {block.gCodes.length > 0 &&
        <GridCell label="G" value={block.gCodes.map(g => `G${g}`).join(' ')} />}
      {block.mCodes.length > 0 &&
        <GridCell label="M" value={block.mCodes.map(m => `M${m}`).join(' ')} />}
      {Object.keys(block.coordinates).length > 0 &&
        <GridCell label="XYZ"
          value={Object.entries(block.coordinates).map(([k, v]) => `${k}${v}`).join(' ')} />}
      {block.feedRate   !== null && <GridCell label="F" value={`${block.feedRate}`} />}
      {block.spindleSpeed !== null && <GridCell label="S" value={`${block.spindleSpeed} RPM`} />}
      {block.dwellTime  !== null && <GridCell label="P" value={`${block.dwellTime} s dwell`} />}
      {block.toolNumber !== null && <GridCell label="T" value={`T${block.toolNumber}`} />}
    </View>
  </View>
);

const GridCell = ({ label, value }) => (
  <View style={s.cell}>
    <Text style={s.cellLabel}>{label}</Text>
    <Text style={s.cellValue}>{value}</Text>
  </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0a0a0f' },
  title:        { color: '#00ff88', fontSize: 16, fontWeight: '700',
                  fontFamily: 'monospace', padding: 14, paddingBottom: 4 },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 10, paddingBottom: 40 },

  section:      { marginBottom: 16 },
  sectionTitle: { color: '#4a9eff', fontSize: 12, fontWeight: '700',
                  fontFamily: 'monospace', textTransform: 'uppercase',
                  letterSpacing: 1, marginBottom: 6,
                  borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
                  paddingBottom: 4 },

  row:          { flexDirection: 'row', marginVertical: 2 },
  rowLabel:     { color: '#666', fontSize: 12, fontFamily: 'monospace', width: 80 },
  rowValue:     { color: '#ccc', fontSize: 12, fontFamily: 'monospace', flex: 1 },

  errorText:    { color: '#ff4444', fontSize: 12, fontFamily: 'monospace',
                  marginVertical: 2 },

  card:         { backgroundColor: '#111827', borderRadius: 6,
                  marginBottom: 6, padding: 8,
                  borderLeftWidth: 2, borderLeftColor: '#1e3a5a' },
  cardHeader:   { flexDirection: 'row', alignItems: 'center',
                  marginBottom: 6, gap: 8 },
  segType:      { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  segIndex:     { color: '#555', fontSize: 11, fontFamily: 'monospace' },
  segRaw:       { color: '#445', fontSize: 10, fontFamily: 'monospace',
                  flex: 1, textAlign: 'right' },

  blockRaw:     { color: '#888', fontSize: 11, fontFamily: 'monospace',
                  marginBottom: 4 },
  blockCode:    { color: '#e0e0e0' },
  blockComment: { color: '#555', fontSize: 10, fontFamily: 'monospace',
                  fontStyle: 'italic', marginBottom: 4 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell:         { backgroundColor: '#0d1117', borderRadius: 4,
                  paddingHorizontal: 8, paddingVertical: 4,
                  minWidth: 90 },
  cellLabel:    { color: '#4a9eff', fontSize: 9, fontFamily: 'monospace',
                  textTransform: 'uppercase', letterSpacing: 0.5 },
  cellValue:    { color: '#e0e0e0', fontSize: 11, fontFamily: 'monospace',
                  marginTop: 1 },
});

export default ParserHome;