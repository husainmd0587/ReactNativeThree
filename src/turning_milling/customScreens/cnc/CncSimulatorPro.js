import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import CNCLatheSimulator from './components/CNCLatheSimulator';
import { simulateGCode } from './engine';
import CanvaProvider from '../../../utils/ThreeJs_Utils/provider';

import TopBar from './components/dashboard/TopBar';
import ViewportOverlay from './components/dashboard/ViewportOverlay';
import CompactStatusStrip from './components/dashboard/CompactStatusStrip';
import DROPanel from './components/dashboard/DROPanel';
import LiveGCodePanel from './components/dashboard/LiveGCodePanel';
import ToolWorkInfoPanel from './components/dashboard/ToolWorkInfoPanel';
import AnimationControlPanel from './components/dashboard/AnimationControlPanel';
import BottomControlDeck from './components/dashboard/BottomControlDeck';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const PANEL_EASE = LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);

const stockConfig = { stockDiameter: 42, stockLength: 82, zFace: 2, resolution: 200, defaultDrillDiameter: 10 };

const gcode = `O0002 (TEST SHAFT)
G21 G90 G95
T0101
G97 S1500 M3
; FACING
G0 X32 Z2
G1 X-1 Z2 F0.2
G0 X32 Z2

; ROUGH + FINISH OD TURNING
G0 X32 Z0
G71 U1.5 R1.0
G71 P10 Q14 U0.4 W0.1 F0.2
N10 G1 X15 Z0 F0.2
N11 G1 X15 Z-15
N12 G1 X22 Z-15
N13 G1 X22 Z-35
N14 G1 X28 Z-40
G0 X32 Z2
G70 P10 Q14 F0.1

; GROOVE at Z-30, down to X10
G0 X32 Z-30
G75 X10 Z-30 I1.5 J0.5 F0.08

; DRILL: 8mm dia, 15mm deep from the face
G0 X0 Z2
G74 Z-15 D8 K4 R1 F0.12

; PART OFF at Z-55
G0 X32 Z-55
G1 X-1 Z-55 F0.06

M5
M30`;

// Accordion panel keys - only one open at a time to save space on small screens.
const PANELS = [
  { key: 'DRO', label: 'DRO', icon: '#' },
  { key: 'PROGRAM', label: 'PROGRAM', icon: '</>' },
  { key: 'INFO', label: 'INFO', icon: 'i' },
  { key: 'SETUP', label: 'SETUP', icon: '⚙' },
  { key: 'CONTROLS', label: 'CONTROLS', icon: '▤' },
];

export default function CncSimulatorPro() {
  const [passIndex, setPassIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [simSpeedPercent, setSimSpeedPercent] = useState(100);
  const [viewMode, setViewMode] = useState('3D');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [openPanel, setOpenPanel] = useState(null); // null = everything collapsed
  const [fullscreen, setFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);

  // Manual override sliders in the control deck - display knobs, not fed back into
  // the interpreter. See CncSimulatorPro README note if you want to wire these to
  // actually change cut feed/speed (needs changes in latheInterpreter.js).
  const [spindleOverride, setSpindleOverride] = useState(1500);
  const [feedOverride, setFeedOverride] = useState(0.2);
  const [spindleOn, setSpindleOn] = useState(true);
  const [feedOn, setFeedOn] = useState(true);

  const [telemetry, setTelemetry] = useState({ lineIndex: null, x: 0, z: 0, feed: 0, spindleSpeed: 0, toolNumber: 1 });

  const preview = useRef(null);
  if (!preview.current) {
    try {
      preview.current = simulateGCode(gcode, stockConfig);
    } catch (e) {
      preview.current = { passes: [] };
    }
  }

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const handleTelemetry = useCallback((t) => setTelemetry(t), []);

  const handleStop = useCallback(() => {
    setPlaying(false);
    setPassIndex(0);
    setElapsedSeconds(0);
  }, []);

  const togglePanel = useCallback((key) => {
    LayoutAnimation.configureNext(PANEL_EASE);
    setOpenPanel((cur) => (cur === key ? null : key));
  }, []);

  const viewport = (
    <View style={fullscreen ? styles.viewportFull : styles.viewportArea}>
      <CanvaProvider>
        <ambientLight intensity={0.5} />
        <directionalLight position={[50, 80, 50]} intensity={1} />
        <group rotation={[0, 0, -Math.PI / 2]}>
          <CNCLatheSimulator
            gcode={gcode}
            stockConfig={stockConfig}
            playing={playing}
            speed={simSpeedPercent / 100}
            passIndex={passIndex}
            onPassIndexChange={setPassIndex}
            onTelemetry={handleTelemetry}
            onError={setError}
          />
        </group>
      </CanvaProvider>

      <ViewportOverlay
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        onStop={handleStop}
        onReset={handleStop}
        onFullscreen={() => setFullscreen((f) => !f)}
        isFullscreen={fullscreen}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        showViewMenu={showViewMenu}
      />

      {fullscreen ? (
        <View style={styles.fullscreenStrip}>
          <CompactStatusStrip
            toolNumber={telemetry.toolNumber}
            spindleSpeed={telemetry.spindleSpeed}
            feed={telemetry.feed}
            lineIndex={telemetry.lineIndex}
            elapsedSeconds={elapsedSeconds}
          />
        </View>
      ) : null}
    </View>
  );

  if (fullscreen) {
    // Fullscreen mode: just the viewport + the compact strip. The bottom-left
    // fullscreen bracket icon in ViewportOverlay toggles back out - no separate
    // exit button needed.
    return <View style={styles.flex}>{viewport}</View>;
  }

  return (
    <View style={styles.flex}>
      <TopBar
        title="CNC Simulator"
        subtitle="Turning Operation – Multi-Op"
        onGCode={() => togglePanel('PROGRAM')}
        onView={() => setShowViewMenu((v) => !v)}
        onSettings={() => togglePanel('SETUP')}
        gcodeActive={openPanel === 'PROGRAM'}
        viewActive={showViewMenu}
        settingsActive={openPanel === 'SETUP'}
      />

      <CompactStatusStrip
        toolNumber={telemetry.toolNumber}
        spindleSpeed={telemetry.spindleSpeed}
        feed={telemetry.feed}
        lineIndex={telemetry.lineIndex}
        elapsedSeconds={elapsedSeconds}
      />

      {viewport}

      <View style={styles.chipRow}>
        {PANELS.map((p) => {
          const active = openPanel === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => togglePanel(p.key)}
            >
              <Text style={[styles.chipIcon, active && styles.chipTextActive]}>{p.icon}</Text>
              <Text style={[styles.chipLabel, active && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.panelArea}>
        {openPanel === 'DRO' && (
          <View style={styles.panelRow}>
            <View style={styles.panelHalf}>
              <DROPanel x={telemetry.x} z={telemetry.z} feed={telemetry.feed} spindleSpeed={telemetry.spindleSpeed} />
            </View>
          </View>
        )}

        {openPanel === 'PROGRAM' && <LiveGCodePanel gcode={gcode} activeLine={telemetry.lineIndex} />}

        {openPanel === 'INFO' && <ToolWorkInfoPanel toolNumber={telemetry.toolNumber} stockConfig={stockConfig} />}

        {openPanel === 'SETUP' && (
          <View>
            <AnimationControlPanel
              spindleSpeed={spindleOverride}
              onChangeSpindleSpeed={setSpindleOverride}
              feedRate={feedOverride}
              onChangeFeedRate={setFeedOverride}
              simSpeedPercent={simSpeedPercent}
              onChangeSimSpeedPercent={setSimSpeedPercent}
            />
            <Text style={styles.setupNote}>
              Stock Ø{stockConfig.stockDiameter} x {stockConfig.stockLength}mm · {preview.current.passes.length} passes
              {error ? ` · Error: ${String(error.message || error)}` : ''}
            </Text>
          </View>
        )}

        {openPanel === 'CONTROLS' && (
          <BottomControlDeck
            playing={playing}
            onCycleStart={() => setPlaying(true)}
            onFeedHold={() => setPlaying(false)}
            onStop={handleStop}
            onHome={() => setPassIndex(0)}
            spindleSpeed={spindleOverride}
            feedRate={feedOverride}
            spindleOn={spindleOn}
            onToggleSpindle={() => setSpindleOn((v) => !v)}
            feedOn={feedOn}
            onToggleFeed={() => setFeedOn((v) => !v)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0b0c0e' },
  viewportArea: { height: 400, backgroundColor: '#05060a' },
  viewportFull: { flex: 1, backgroundColor: '#05060a' },
  fullscreenStrip: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 8, gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15171b',
    borderWidth: 1,
    borderColor: '#22252b',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  chipActive: { borderColor: '#3b82f6', backgroundColor: '#182131' },
  chipIcon: { fontSize: 9, marginRight: 3, color: '#8a919c' },
  chipLabel: { fontSize: 9, color: '#9aa0aa', fontWeight: '700', letterSpacing: 0.3 },
  chipTextActive: { color: '#5aa8ff' },
  panelArea: { paddingHorizontal: 10, paddingBottom: 14, paddingTop: 4 },
  panelRow: { flexDirection: 'row' },
  panelHalf: { flex: 1 },
  setupNote: { color: '#6b7178', fontSize: 9, marginTop: 8, lineHeight: 14 },
});
