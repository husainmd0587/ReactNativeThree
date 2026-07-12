import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

import { simulateGCode, buildProfilePath } from '../engine';
import ToolBit from './ToolBit';
import Sparks from './Sparks';

/**
 * CNCLatheSimulator
 *
 * Technique (no CSG, no voxels - the clip-plane / dual-geometry approach already
 * used in Turning.js, generalized to run off a real G-code toolpath):
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
 *  - playing, speed: controlled playback state (own them in a parent + PlaybackControls)
 *  - passIndex, onPassIndexChange: controlled current-pass index
 *  - onError: (err) => void, called if the G-code fails to parse/simulate
 *  - onTelemetry: (payload) => void, throttled (~8x/sec) live readout for a DRO/HUD:
 *      { lineIndex, x (diameter), z, feed, spindleSpeed, toolNumber, passIndex,
 *        passCount, overallProgress (0..1), cycle }
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
    const { rawProfile, rawInnerProfile, passes } = sim.data;
    const toPts = (outer, inner) => buildProfilePath(outer, inner).map((p) => new THREE.Vector2(p.r, p.z));
    const list = [new THREE.LatheGeometry(toPts(rawProfile, rawInnerProfile), 56)];
    for (const p of passes) list.push(new THREE.LatheGeometry(toPts(p.outerProfile, p.innerProfile), 56));
    return list;
  }, [sim]);

  useEffect(() => {
    return () => geometries.forEach((g) => g.dispose());
  }, [geometries]);

  const passes = sim.ok ? sim.data.passes : [];
  const clampedIndex = Math.min(passIndex, Math.max(0, passes.length - 1));
  const activePass = passes[clampedIndex];

  const progressRef = useRef(0); // 0..1 sweep progress through the CURRENT pass
  useEffect(() => {
    progressRef.current = 0; // reset sweep whenever the pass changes externally (scrub/step)
  }, [clampedIndex]);

  // Clip along the pass's OWN cutting-move Z extent (not the whole bar) so pacing
  // matches how localized the pass actually is - a 4mm groove sweeps over 4mm of
  // travel, not the full 80mm bar.
  const zRange = useMemo(() => {
    if (!activePass) return [0, 1];
    const cuts = activePass.moves.filter((m) => m.isCutting);
    if (cuts.length === 0) return [0, 1];
    const zs = cuts.flatMap((m) => [m.from.z, m.to.z]);
    return [Math.min(...zs), Math.max(...zs)];
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

  useFrame((_, delta) => {
    if (!sim.ok || passes.length === 0) return;

    if (playing) {
      const next = Math.min(1, progressRef.current + delta * speed * 0.35);
      progressRef.current = next;
      if (onProgressChange) onProgressChange(next);
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

    if (playing && progressRef.current >= 1) {
      if (clampedIndex < passes.length - 1) {
        onPassIndexChange?.(clampedIndex + 1);
      }
    }

    // Throttle telemetry callbacks to ~10/sec - plenty for a DRO readout, cheap on RN.
    telemetryAccumRef.current += delta;
    if (onTelemetry && telemetryAccumRef.current >= 0.1) {
      telemetryAccumRef.current = 0;
      const { cuts, cum, total } = cutPath;
      let x = activePass?.moves?.[0]?.from?.x ?? 0;
      let z = activePass?.moves?.[0]?.from?.z ?? 0;
      let mv = cuts[0];
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
      onTelemetry({
        lineIndex: mv?.lineIndex ?? null,
        x,
        z,
        feed: mv?.feed ?? 0,
        spindleSpeed: mv?.spindleSpeed ?? 0,
        toolNumber: mv?.toolNumber ?? 0,
        cycle: mv?.cycle ?? 'manual',
        passIndex: clampedIndex,
        passCount: passes.length,
        overallProgress: (clampedIndex + progressRef.current) / passes.length,
      });
    }
  });

  if (!sim.ok || passes.length === 0) return null;

  const beforeGeo = geometries[clampedIndex];
  const afterGeo = geometries[clampedIndex + 1] ?? geometries[clampedIndex];
  const isCutting = (activePass?.moves ?? []).some((m) => m.isCutting);

  return (
    <group>
      {/* Finished-so-far layer: the target of this pass, sits underneath */}
      <mesh geometry={afterGeo}>
        <meshPhysicalMaterial color="#c7ccd4" metalness={0.85} roughness={0.28} clearcoat={0.3} clearcoatRoughness={0.4} />
      </mesh>

      {/* Raw layer being swept away this pass. Slight radial scale bump avoids
          z-fighting in the (usually large) regions where before === after. */}
      <mesh geometry={beforeGeo} scale={[1.001, 1, 1.001]}>
        <meshPhysicalMaterial
          color="#9298a1"
          metalness={0.6}
          roughness={0.5}
          clippingPlanes={[planeRef.current]}
          side={THREE.DoubleSide}
        />
      </mesh>

      <ToolBit pass={activePass} progressRef={progressRef} />
      <Sparks active={playing && isCutting} pass={activePass} progressRef={progressRef} />
    </group>
  );
}
