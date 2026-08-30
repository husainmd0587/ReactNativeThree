import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import * as THREE from 'three';
import { getCommandById } from '../commands/registry';
import CanvaProvider from '../../../../../utils/ThreeJs_Utils/provider';
import DistanceControl from '../components/DistanceControl';
import OptionToggle from '../components/OptionToggle';
import {
  EXTRUDE_PROFILE, REVOLVE_PROFILE, SWEEP_PROFILE,
  buildFlatProfileGeometry, buildBooleanSetupGeometries,
  buildSweepPathPreviewGeometry, buildLoftSetupGeometries,
  runExtrude, runRevolve, runBoolean, runSweep, runLoft,
} from '../engine/three/practiceSolids';

const BOOLEAN_TYPES = new Set(['union', 'subtract', 'intersect']);
const RUN_LABEL = {
  extrude: 'Extrude', revolve: 'Revolve', union: 'Union', subtract: 'Subtract', intersect: 'Intersect', sweep: 'Sweep', loft: 'Loft',
};
// Sweep and Loft are pure client-side geometry (see
// engine/three/practiceSolids.js) — no native module involved, so unlike
// the other five they work on iOS too.
const CLIENT_SIDE_TYPES = new Set(['sweep', 'loft']);

const DEFAULT_DEPTH = 15;
const DEFAULT_ANGLE = 360;
const DEFAULT_OFFSET = 12;
const DEFAULT_BEND = 20;
const DEFAULT_TOP_WIDTH = 15;
const DEFAULT_LOFT_HEIGHT = 20;

function ResultModel({ geometry }) {
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#2E7DAF" roughness={0.35} metalness={0.2} />
    </mesh>
  );
}

// The flat 2D profile Extrude/Revolve is about to act on — same "see the
// sketch before you commit the command" idea AutoCAD itself uses.
// DoubleSide so it stays visible while orbiting around behind it, since a
// flat shape only has one true "front" otherwise.
function ProfilePreview({ points }) {
  const geometry = useMemo(() => buildFlatProfileGeometry(points), [points]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#5CA9E0" side={THREE.DoubleSide} transparent opacity={0.85} />
    </mesh>
  );
}

// The two solids Union/Subtract/Intersect are about to combine, shown
// separately and distinctly colored (target vs tool) before the operation
// runs.
function BooleanSetupPreview({ offset }) {
  const { box, cylinder } = useMemo(() => buildBooleanSetupGeometries(offset), [offset]);
  return (
    <>
      <mesh geometry={box}>
        <meshStandardMaterial color="#5CA9E0" transparent opacity={0.8} />
      </mesh>
      <mesh geometry={cylinder}>
        <meshStandardMaterial color="#E0A93E" transparent opacity={0.8} />
      </mesh>
    </>
  );
}

// Sweep's setup: the flat profile plus a thin tube tracing the path it's
// about to follow — both of the things a real AutoCAD SWEEP prompt asks
// you to pick (an object to sweep, and a path).
function SweepSetupPreview({ bendOut }) {
  const profileGeometry = useMemo(() => buildFlatProfileGeometry(SWEEP_PROFILE), []);
  const pathGeometry = useMemo(() => buildSweepPathPreviewGeometry(bendOut), [bendOut]);
  return (
    <>
      <mesh geometry={profileGeometry}>
        <meshStandardMaterial color="#5CA9E0" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={pathGeometry}>
        <meshStandardMaterial color="#E0A93E" />
      </mesh>
    </>
  );
}

// Loft's setup: the two cross-sections it's about to blend between.
function LoftSetupPreview({ topHalfWidth, heightPx }) {
  const { bottom, top } = useMemo(
    () => buildLoftSetupGeometries(topHalfWidth, heightPx),
    [topHalfWidth, heightPx],
  );
  return (
    <>
      <mesh geometry={bottom}>
        <meshStandardMaterial color="#5CA9E0" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={top}>
        <meshStandardMaterial color="#E0A93E" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
    </>
  );
}

// Two stages, same as using the real command in AutoCAD: Setup (see the
// input geometry, choose options — height/angle/direction/which-object-
// is-which) and Result (the finished solid, with an Edit action to go
// back and try different options). Nothing runs until the student
// explicitly commits — Sweep/Loft are synchronous (no native call), but
// still go through the same explicit Setup -> Result flow as the other
// five, so every 3D command feels consistent rather than some running
// instantly and others requiring a tap.
export default function CommandPractice3D({ route }) {
  const commandId = route?.params?.commandId;
  const command = getCommandById(commandId);
  const practiceType = command?.practice?.type;
  const isBoolean = BOOLEAN_TYPES.has(practiceType);
  const isClientSide = CLIENT_SIDE_TYPES.has(practiceType);

  const [stage, setStage] = useState('setup'); // 'setup' | 'result'
  const [geometry, setGeometry] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [extrudeDirection, setExtrudeDirection] = useState('positive');
  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [revolveDirection, setRevolveDirection] = useState('cw');
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [subtractSwap, setSubtractSwap] = useState(false);
  const [bendOut, setBendOut] = useState(DEFAULT_BEND);
  const [topHalfWidth, setTopHalfWidth] = useState(DEFAULT_TOP_WIDTH);
  const [loftHeight, setLoftHeight] = useState(DEFAULT_LOFT_HEIGHT);

  const backToSetup = useCallback(() => {
    setStage('setup');
    setGeometry(null);
    setError(null);
  }, []);

  const handleRun = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      let result = null;
      if (practiceType === 'extrude') result = await runExtrude(depth, extrudeDirection);
      else if (practiceType === 'revolve') result = await runRevolve(angle, revolveDirection);
      else if (isBoolean) result = await runBoolean(practiceType, offset, subtractSwap);
      else if (practiceType === 'sweep') result = await runSweep(bendOut);
      else if (practiceType === 'loft') result = await runLoft(topHalfWidth, loftHeight);
      setGeometry(result);
      setStage('result');
    } catch (e) {
      setGeometry(null);
      setError(
        e?.message
        || (isClientSide
          ? 'Could not build this solid.'
          : 'Could not build this solid — the native 3D engine may not be available on this device.'),
      );
    } finally {
      setBusy(false);
    }
  }, [
    practiceType, depth, extrudeDirection, angle, revolveDirection, offset, subtractSwap,
    bendOut, topHalfWidth, loftHeight, isBoolean, isClientSide,
  ]);

  if (!command) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Command not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{command.name}</Text>
        <Text style={styles.detailsText}>{command.details || command.description}</Text>
        <Text style={styles.desc}>
          {stage === 'setup'
            ? (isBoolean || practiceType === 'loft'
              ? 'Choose options, then run the command.'
              : 'This is the input geometry. Choose options, then run the command.')
            : 'Result. Edit to change options and run again.'}
        </Text>
      </View>

      {stage === 'setup' && practiceType === 'extrude' && (
        <View style={styles.controls}>
          <DistanceControl label="Depth" value={depth} unit="mm" step={1} min={2} max={40} onChange={setDepth} dark />
          <OptionToggle
            label="Direction"
            value={extrudeDirection}
            onChange={setExtrudeDirection}
            options={[{ value: 'positive', label: '+' }, { value: 'negative', label: '−' }]}
            dark
          />
        </View>
      )}
      {stage === 'setup' && practiceType === 'revolve' && (
        <View style={styles.controls}>
          <DistanceControl label="Sweep angle" value={angle} unit="°" step={30} min={30} max={360} onChange={setAngle} dark />
          <OptionToggle
            label="Direction"
            value={revolveDirection}
            onChange={setRevolveDirection}
            options={[{ value: 'cw', label: 'CW' }, { value: 'ccw', label: 'CCW' }]}
            dark
          />
        </View>
      )}
      {stage === 'setup' && isBoolean && (
        <View style={styles.controls}>
          <DistanceControl label="Overlap" value={offset} unit="mm" step={2} min={0} max={24} onChange={setOffset} dark />
          {practiceType === 'subtract' && (
            <OptionToggle
              label="Subtract"
              value={subtractSwap ? 'swapped' : 'normal'}
              onChange={(v) => setSubtractSwap(v === 'swapped')}
              options={[
                { value: 'normal', label: 'Box − Cylinder' },
                { value: 'swapped', label: 'Cylinder − Box' },
              ]}
              dark
            />
          )}
        </View>
      )}
      {stage === 'setup' && practiceType === 'sweep' && (
        <View style={styles.controls}>
          <DistanceControl label="Path bend" value={bendOut} unit="mm" step={2} min={10} max={30} onChange={setBendOut} dark />
        </View>
      )}
      {stage === 'setup' && practiceType === 'loft' && (
        <View style={styles.controls}>
          <DistanceControl label="Top size" value={topHalfWidth} unit="mm" step={1} min={5} max={25} onChange={setTopHalfWidth} dark />
          <DistanceControl label="Height" value={loftHeight} unit="mm" step={2} min={10} max={40} onChange={setLoftHeight} dark />
        </View>
      )}

      <View style={styles.viewport}>
        <CanvaProvider instanceId={`autocad-${practiceType}-${stage}`}>
          {stage === 'result' && <ResultModel geometry={geometry} />}
          {stage === 'setup' && practiceType === 'extrude' && <ProfilePreview points={EXTRUDE_PROFILE} />}
          {stage === 'setup' && practiceType === 'revolve' && <ProfilePreview points={REVOLVE_PROFILE} />}
          {stage === 'setup' && isBoolean && <BooleanSetupPreview offset={offset} />}
          {stage === 'setup' && practiceType === 'sweep' && <SweepSetupPreview bendOut={bendOut} />}
          {stage === 'setup' && practiceType === 'loft' && (
            <LoftSetupPreview topHalfWidth={topHalfWidth} heightPx={loftHeight} />
          )}
        </CanvaProvider>

        {busy && (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.overlayText}>Building…</Text>
          </View>
        )}
        {!busy && error && (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {stage === 'setup' ? (
          <TouchableOpacity onPress={handleRun} disabled={busy} style={styles.runBtn} activeOpacity={0.85}>
            <Text style={styles.runBtnText}>{busy ? 'Building…' : RUN_LABEL[practiceType]}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={backToSetup} style={styles.editBtn} activeOpacity={0.85}>
            <Text style={styles.editBtnText}>Edit options</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111114' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  detailsText: { fontSize: 11, color: '#B5B5BE', marginTop: 5, lineHeight: 15 },
  desc: { fontSize: 13, color: '#9A9AA6', marginTop: 4 },
  controls: { paddingHorizontal: 16, paddingTop: 8 },
  viewport: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  overlayText: { color: '#CCCCCC', fontSize: 12, textAlign: 'center' },
  errorText: { color: '#FF6B6B', fontSize: 12, textAlign: 'center' },
  footer: { padding: 16, paddingTop: 8 },
  runBtn: {
    backgroundColor: '#2E7DAF', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  runBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  editBtn: {
    borderColor: '#3A3A42', borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  editBtnText: { color: '#5CA9E0', fontSize: 14, fontWeight: '700' },
});
