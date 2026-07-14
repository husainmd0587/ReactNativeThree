import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

import { simulateGCode, buildProfilePath, interpRadiusAtZ, applyRadialFeatures, buildRadialDrillStages } from '../engine';
import ToolBit from './ToolBit';
import Sparks from './Sparks';

const CSG = { Brush, Evaluator, SUBTRACTION };
const RADIAL_DRILL_STAGE_COUNT = 4;

/**
 * CNCLatheSimulator
 *
 * HYBRID technique: axisymmetric ops (turning, facing, grooving, threading,
 * axial drilling) use the clip-plane / dual-geometry approach already used in
 * Turning.js - cheap, real-time, correct for anything that looks the same at
 * every angle around the spindle axis:
 *
 * For each pass we pre-build a LatheGeometry of the stock's outer/inner profile
 * *after* that pass completes. During playback we render two coincident meshes:
 *   - "after"  = geometry once the CURRENT pass is fully done (static base layer,
 *                always visible underneath)
 *   - "before" = geometry as it was BEFORE the current pass started (the layer
 *                being clipped away as the pass "happens")
 * A single THREE.Plane, swept along the part's axial (Z) direction, is applied as
 * a clippingPlane on the "before" mesh's material. As the plane sweeps, the raw
 * layer is progressively cut away, revealing the "after" layer beneath it.
 *
 * NON-axisymmetric features (radial/cross-drilling via G184) CANNOT be
 * represented this way - a LatheGeometry is fundamentally a profile spun around
 * one axis, so it can only ever look the same at every angle. Those use real CSG
 * boolean subtraction (three-bvh-csg) instead, precomputed as a few depth-stage
 * geometries per hole (NOT recomputed every frame - CSG is too expensive for
 * that) and swapped directly during that pass, bypassing the clip-plane system
 * entirely for that one pass. See engine/radialCSG.js for the geometry math.
 * Once a hole is drilled, it's baked into every subsequent pass's base geometry
 * so it stays visible through later (unrelated) turning operations.
 *
 * IMPORTANT: this component renders its own <group> and does NOT rotate itself.
 * Wrap it in a parent that applies your scene rotation/position (matches the
 * CustomLatheGeometry convention of rotating -90deg about Z to lay the part on its
 * side) - just pass that same rotation as `sceneRotationZ` so the clip plane (which
 * THREE always evaluates in world space) gets transformed to match. Mismatch here
 * is what causes the "flat top-to-bottom layer" look instead of a real axial cut.
 *
 * Props:
 *  - gcode: string
 *  - stockConfig: { stockDiameter, stockLength, zFace?, resolution?, boreThreshold?, defaultDrillDiameter? }
 *  - playing, speed: controlled playback state (own them in a parent)
 *  - passIndex, onPassIndexChange: controlled current-pass index
 *  - onError: (err) => void, called if the G-code fails to parse/simulate
 *  - onTelemetry: (payload) => void, throttled (~8x/sec) live readout for a DRO/HUD:
 *      { lineIndex, x (diameter), z, feed, spindleSpeed, toolNumber, passIndex,
 *        passCount, overallProgress (0..1), cycle }
 *  - resetToken: bump this counter to force a hard reset to line 0 / pass 0, even
 *    if passIndex was already 0 (e.g. wire it to your Stop/Reset button)
 */
export default function CNCLatheSimulator({
  gcode,
  stockConfig,
  playing = true,
  speed = 1,
  passIndex = 0,
  onPassIndexChange,
  onProgressChange,
  onTelemetry,
  onError,
  // IMPORTANT: THREE material.clippingPlanes are evaluated in WORLD space, not the
  // mesh's local space. The part's Z (axial) axis only lines up with a fixed world
  // axis because a PARENT <group> rotates it (the -90deg-about-Z convention used
  // everywhere else in this project, e.g. CustomLatheGeometry). If you change that
  // wrapping rotation, pass the same value here or the clip-plane sweep will look
  // like a flat top-to-bottom layer instead of a proper axial turning cut.
  sceneRotationZ = -Math.PI / 2,
  // Bump this (e.g. a counter) whenever you want to force a hard reset back to the
  // very start, even if passIndex is already 0 - without this, pressing "Reset"
  // while already on pass 0 wouldn't visually reset the sweep, since the internal
  // reset effect only fires when passIndex actually CHANGES.
  resetToken = 0,
}) {
  const { gl } = useThree();
  useEffect(() => {
    // Required once for any material.clippingPlanes to have effect.
    gl.localClippingEnabled = true;
  }, [gl]);

  const sim = useMemo(() => {
    try {
      return { ok: true, data: simulateGCode(gcode, stockConfig) };
    } catch (err) {
      return { ok: false, error: err };
    }
  }, [gcode, stockConfig]);

  useEffect(() => {
    if (!sim.ok && onError) onError(sim.error);
  }, [sim, onError]);

  const geometries = useMemo(() => {
    if (!sim.ok) return [];
    const { rawProfile, rawInnerProfile, passes, stockRadius } = sim.data;
    const toPts = (outer, inner) => buildProfilePath(outer, inner).map((p) => new THREE.Vector2(p.r, p.z));
    const list = [new THREE.LatheGeometry(toPts(rawProfile, rawInnerProfile), 56)];
    for (const p of passes) {
      let geo = new THREE.LatheGeometry(toPts(p.outerProfile, p.innerProfile), 56);
      // Bake in any radial holes drilled so far - CSG is a no-op (early return)
      // if radialFeaturesSoFar is empty, so this costs nothing for programs that
      // never use G184.
      if (p.radialFeaturesSoFar?.length) {
        geo = applyRadialFeatures(THREE, CSG, geo, p.radialFeaturesSoFar, stockRadius);
      }
      list.push(geo);
    }
    return list;
  }, [sim]);

  // Precomputed progressive-depth plunge stages for each G184 pass - built ONCE
  // here (not per frame; CSG is too expensive for that). Keyed by pass index.
  // Each pass's stages start from `geometries[passIndex]` (the state BEFORE this
  // pass, which - per the loop above - already has all PRIOR holes baked in, so
  // we pass an empty priorFeatures list here to avoid redundant CSG work).
  const radialStagesByPass = useMemo(() => {
    if (!sim.ok) return {};
    const { passes, stockRadius } = sim.data;
    const map = {};
    passes.forEach((p, i) => {
      if (!p.newRadialFeature) return;
      const baseGeo = geometries[i]; // state before this pass
      if (!baseGeo) return;
      map[i] = buildRadialDrillStages(THREE, CSG, baseGeo, p.newRadialFeature, [], stockRadius, RADIAL_DRILL_STAGE_COUNT);
    });
    return map;
  }, [sim, geometries]);

  // Parallel to `geometries` but keeping the raw {z,r}[] profile arrays (not THREE
  // geometry) - needed to interpolate radius at an arbitrary Z for the cap disk.
  const profiles = useMemo(() => {
    if (!sim.ok) return [];
    const { rawProfile, rawInnerProfile, passes } = sim.data;
    const list = [{ outer: rawProfile, inner: rawInnerProfile }];
    for (const p of passes) list.push({ outer: p.outerProfile, inner: p.innerProfile });
    return list;
  }, [sim]);

  useEffect(() => {
    return () => {
      geometries.forEach((g) => g.dispose());
      Object.values(radialStagesByPass).forEach((stages) => stages.forEach((g) => g.dispose()));
    };
  }, [geometries, radialStagesByPass]);

  const passes = sim.ok ? sim.data.passes : [];
  const clampedIndex = Math.min(passIndex, Math.max(0, passes.length - 1));
  const activePass = passes[clampedIndex];

  const progressRef = useRef(0); // 0..1 sweep progress through the CURRENT pass
  const globalElapsedRef = useRef(0); // seconds, drives sequential line-by-line highlighting
  const [radialStageIndex, setRadialStageIndex] = useState(0); // which precomputed CSG stage to show for a G184 pass
  useEffect(() => {
    progressRef.current = 0; // reset sweep whenever the pass changes externally (scrub/step)
    setRadialStageIndex(0);
  }, [clampedIndex]);
  useEffect(() => {
    progressRef.current = 0;
    globalElapsedRef.current = 0;
    setRadialStageIndex(0);
  }, [resetToken]);

  // Reference cutting speed used purely for animation pacing (mm of tool travel
  // per second of playback at speed=1) - NOT a real feed rate. Clamped so a huge
  // facing pass doesn't take forever and a tiny peck doesn't finish in one frame.
  const PACE_MM_PER_SEC = 12;
  const MIN_PASS_DURATION = 0.6;
  const MAX_PASS_DURATION = 6;

  function passArcLength(pass) {
    const cuts = pass?.moves.filter((m) => m.isCutting) ?? [];
    return cuts.reduce((sum, m) => sum + Math.hypot((m.to.x - m.from.x) / 2, m.to.z - m.from.z), 0);
  }
  function passDurationFor(pass) {
    const arc = passArcLength(pass);
    return Math.min(MAX_PASS_DURATION, Math.max(MIN_PASS_DURATION, arc / PACE_MM_PER_SEC));
  }

  const activePassDuration = useMemo(() => passDurationFor(activePass), [activePass]);

  // Sequential line-by-line timeline: walks EVERY source line in order (not just
  // ones with cutting moves) so the G-code viewer highlight advances 1,2,3,...N
  // like a real control, instead of jumping straight between motion lines and
  // skipping config/comment lines entirely. Non-motion lines (comments, G21, T0101,
  // etc.) get a brief fixed dwell; motion lines get a share of their pass's own
  // duration (proportional to that line's arc-length share within the pass), so
  // this stays in lockstep with the geometry sweep instead of drifting.
  const lineTimeline = useMemo(() => {
    if (!sim.ok) return { entries: [], totalDuration: 0 };
    const NON_MOTION_DWELL = 0.05;
    const rawLines = gcode.split('\n');

    const passLineSequences = passes.map((p) => {
      const seen = [];
      const seenSet = new Set();
      for (const m of p.moves) {
        if (!m.isCutting) continue;
        if (!seenSet.has(m.lineIndex)) {
          seenSet.add(m.lineIndex);
          seen.push(m.lineIndex);
        }
      }
      return seen;
    });

    const passLineShares = passes.map((p, pi) => {
      const cuts = p.moves.filter((m) => m.isCutting);
      const totalArc = passArcLength(p) || 1;
      const perLine = {};
      for (const m of cuts) {
        const arc = Math.hypot((m.to.x - m.from.x) / 2, m.to.z - m.from.z);
        perLine[m.lineIndex] = (perLine[m.lineIndex] || 0) + arc;
      }
      const duration = passDurationFor(p);
      const shares = {};
      Object.entries(perLine).forEach(([line, arc]) => {
        shares[line] = (arc / totalArc) * duration;
      });
      return shares;
    });

    const entries = [];
    let cursorTime = 0;
    let nextPassToEmit = 0;
    const covered = new Set();

    for (let lineNum = 1; lineNum <= rawLines.length; lineNum++) {
      if (covered.has(lineNum)) continue;

      let matchedAny = false;
      while (nextPassToEmit < passLineSequences.length && passLineSequences[nextPassToEmit][0] === lineNum) {
        matchedAny = true;
        const seq = passLineSequences[nextPassToEmit];
        const shares = passLineShares[nextPassToEmit];
        for (const ln of seq) {
          const dur = shares[ln] || passDurationFor(passes[nextPassToEmit]) / seq.length;
          entries.push({ lineNumber: ln, startTime: cursorTime, duration: dur, passIndex: nextPassToEmit });
          cursorTime += dur;
          covered.add(ln);
        }
        nextPassToEmit += 1;
      }
      if (matchedAny) continue;

      entries.push({ lineNumber: lineNum, startTime: cursorTime, duration: NON_MOTION_DWELL, passIndex: null });
      cursorTime += NON_MOTION_DWELL;
    }

    return { entries, totalDuration: cursorTime };
  }, [sim, gcode, passes]);

  function findActiveLine(elapsedSeconds) {
    if (elapsedSeconds <= 0) return 0; // "not started yet" state after a reset
    const { entries } = lineTimeline;
    if (entries.length === 0) return 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (elapsedSeconds >= entries[i].startTime) return entries[i].lineNumber;
    }
    return entries[0].lineNumber;
  }

  const zRange = useMemo(() => {
    if (!activePass) return [0, 1];
    const cuts = activePass.moves.filter((m) => m.isCutting);
    if (cuts.length === 0) return [0, 1];
    const zs = cuts.flatMap((m) => [m.from.z, m.to.z]);
    let zLo = Math.min(...zs);
    let zHi = Math.max(...zs);
    // A pure-radial cut (facing: X changes, Z stays constant) produces a
    // ZERO-width range here (from.z === to.z for every move). With no span to
    // sweep across, the clip plane sits frozen at one Z value the whole pass -
    // meaning it reveals everything instantly on frame one instead of animating.
    // Force a minimum visible span, centered on the actual cut location.
    const MIN_SPAN = 3; // mm
    if (zHi - zLo < MIN_SPAN) {
      const mid = (zHi + zLo) / 2;
      zLo = mid - MIN_SPAN / 2;
      zHi = mid + MIN_SPAN / 2;
    }
    return [zLo, zHi];
  }, [activePass]);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  const localNormalRef = useRef(new THREE.Vector3(0, -1, 0));
  const rotationMatrix = useMemo(() => new THREE.Matrix4().makeRotationZ(sceneRotationZ), [sceneRotationZ]);

  // Precompute cumulative cutting-move lengths for this pass so we can interpolate
  // the tool's current (x,z) position from `progressRef` - same math ToolBit uses
  // internally, duplicated here (cheaply) so the DRO/HUD can read it too.
  const cutPath = useMemo(() => {
    const cuts = (activePass?.moves ?? []).filter((m) => m.isCutting);
    let acc = 0;
    const cum = cuts.map((m) => {
      acc += Math.hypot((m.to.x - m.from.x) / 2, m.to.z - m.from.z);
      return acc;
    });
    return { cuts, cum, total: acc || 1 };
  }, [activePass]);

  const telemetryAccumRef = useRef(0);
  const capMeshRef = useRef();
  const [capRadii, setCapRadii] = useState({ outer: 1, inner: 0.001 });

  useFrame((_, delta) => {
    if (!sim.ok || passes.length === 0) return;

    if (playing) {
      const next = Math.min(1, progressRef.current + delta * speed / activePassDuration);
      progressRef.current = next;
      if (onProgressChange) onProgressChange(next);
      globalElapsedRef.current += delta * speed;
    }

    // Plane, defined in LOCAL space first: normal (0,-1,0), meaning a local point
    // is KEPT (not clipped) when local -y + constant >= 0, i.e. local y <= constant.
    // Sweeping `constant` from zHi down to zLo clips away material starting at the
    // high-Z end and progressing toward the low-Z end as progress goes 0 -> 1.
    // We then transform this plane into world space with the SAME rotation the
    // parent applies to the mesh, since clippingPlanes are always world-space.
    const [zLo, zHi] = zRange;
    const sweepZ = zHi - (zHi - zLo) * progressRef.current;
    planeRef.current.set(localNormalRef.current, sweepZ);
    planeRef.current.applyMatrix4(rotationMatrix);

    // Cap disk plugs the open cross-section at the cut front so it reads as solid
    // material, not a hollow shell. Position updates every frame for a smooth
    // sweep; radius only needs the same ~10/sec cadence as telemetry since
    // stations are sub-millimeter apart (imperceptible either way).
    if (capMeshRef.current) capMeshRef.current.position.set(0, sweepZ, 0);

    if (playing && progressRef.current >= 1) {
      if (clampedIndex < passes.length - 1) {
        onPassIndexChange?.(clampedIndex + 1);
      }
    }

    // Throttle telemetry callbacks (and the cap disk radius update) to ~10/sec.
    telemetryAccumRef.current += delta;
    if (telemetryAccumRef.current >= 0.1) {
      telemetryAccumRef.current = 0;

      const beforeProfile = profiles[clampedIndex];
      if (beforeProfile) {
        const outer = Math.max(0.15, interpRadiusAtZ(beforeProfile.outer, sweepZ));
        const inner = Math.max(0.02, interpRadiusAtZ(beforeProfile.inner, sweepZ));
        setCapRadii({ outer, inner: Math.min(inner, outer - 0.05) });
      }

      if (activePass?.cycle === 'G184') {
        const stages = radialStagesByPass[clampedIndex];
        if (stages) {
          const idx = Math.min(stages.length - 1, Math.floor(progressRef.current * stages.length));
          setRadialStageIndex((prev) => (prev !== idx ? idx : prev));
        }
      }

      if (onTelemetry) {
      const { cuts, cum, total } = cutPath;
      let x = activePass?.moves?.[0]?.from?.x ?? 0;
      let z = activePass?.moves?.[0]?.from?.z ?? 0;
      let mv = cuts[0] ?? activePass?.moves?.[0]; // fall back to the radialDrill move itself (G184 has no cutting moves to interpolate)
      if (cuts.length) {
        const target = progressRef.current * total;
        let idx = cum.findIndex((c) => c >= target);
        if (idx === -1) idx = cuts.length - 1;
        mv = cuts[idx];
        const segStart = idx > 0 ? cum[idx - 1] : 0;
        const segLen = cum[idx] - segStart || 1;
        const segT = Math.max(0, Math.min(1, (target - segStart) / segLen));
        x = mv.from.x + (mv.to.x - mv.from.x) * segT;
        z = mv.from.z + (mv.to.z - mv.from.z) * segT;
      }
      const atProgramEnd = clampedIndex >= passes.length - 1 && progressRef.current >= 1;
      const spindleOn = atProgramEnd ? sim.data.finalState?.spindleOn ?? false : mv?.spindleOn ?? false;

      onTelemetry({
        lineIndex: findActiveLine(globalElapsedRef.current),
        x,
        z,
        feed: mv?.feed ?? 0,
        spindleSpeed: mv?.spindleSpeed ?? 0,
        spindleOn,
        toolNumber: mv?.toolNumber ?? 0,
        cycle: mv?.cycle ?? 'manual',
        passIndex: clampedIndex,
        passCount: passes.length,
        overallProgress: (clampedIndex + progressRef.current) / passes.length,
      });
      }
    }
  });

  if (!sim.ok || passes.length === 0) return null;

  const isRadialDrillPass = activePass?.cycle === 'G184';

  if (isRadialDrillPass) {
    const stages = radialStagesByPass[clampedIndex];
    const stageGeo = stages ? stages[Math.min(radialStageIndex, stages.length - 1)] : geometries[clampedIndex];
    return (
      <group>
        {/* Radial-drill pass: bypasses the clip-plane system entirely - a hole
            drilled from the side isn't representable by a profile-of-revolution,
            so this swaps directly between precomputed CSG stages instead (see
            the class-level doc comment for why). */}
        <mesh geometry={stageGeo}>
          <meshPhysicalMaterial color="#c7ccd4" metalness={0.85} roughness={0.28} clearcoat={0.3} clearcoatRoughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  const beforeGeo = geometries[clampedIndex];
  const afterGeo = geometries[clampedIndex + 1] ?? geometries[clampedIndex];
  const isCutting = (activePass?.moves ?? []).some((m) => m.isCutting);

  return (
    <group>
      {/* Finished-so-far layer: the target of this pass, sits underneath. Small
          negative polygonOffset makes it reliably win the depth test over the
          "before" layer in the (usually large) regions where they're coincident -
          this replaces an old radial-scale hack that caused flicker of its own at
          the flat end caps, where the scaled and unscaled geometry still shared an
          exact center vertex. */}
      <mesh geometry={afterGeo}>
        <meshPhysicalMaterial
          color="#c7ccd4"
          metalness={0.85}
          roughness={0.28}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Raw layer being swept away this pass. DoubleSide is needed so the inside
          of the shell (exposed wherever the clip plane cuts through) still
          renders instead of vanishing - the cap disk below is what keeps that
          exposed cross-section from reading as "hollow" rather than solid. */}
      <mesh geometry={beforeGeo}>
        <meshPhysicalMaterial
          color="#9298a1"
          metalness={0.6}
          roughness={0.5}
          clippingPlanes={[planeRef.current]}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cap disk: plugs the open cross-section right at the cut front so it
          reads as a solid turned face, not a thin peeled-back shell. Sized from
          the BEFORE profile (the boundary of remaining raw material) and rebuilt
          via declarative <ringGeometry args={...}> - R3F disposes/recreates the
          underlying geometry automatically when args change. */}
      <mesh ref={capMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[capRadii.inner, capRadii.outer, 48]} />
        <meshStandardMaterial color="#d8dbe0" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      <ToolBit pass={activePass} progressRef={progressRef} />
      <Sparks active={playing && isCutting} pass={activePass} progressRef={progressRef} />
    </group>
  );
}
