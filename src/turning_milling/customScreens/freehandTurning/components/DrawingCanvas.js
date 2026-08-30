import React, {
  useState, useRef, useCallback, useMemo, useEffect,
  forwardRef, useImperativeHandle, memo,
} from 'react';
import { View, Text, Animated } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  Canvas as SkiaCanvas, Path, Skia, Group, Line, Circle,
  LinearGradient, ImageShader, Shader, useImage, vec,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import {
  runOnJS, useSharedValue, useDerivedValue,
  withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { Textures } from '../../../../utils/materials/textures';

import {
  CANVAS_W, CANVAS_H, AXIS_Y, STOCK_LEFT, STOCK_RIGHT, STOCK_WIDTH,
  PROFILE_SEGS, STOCK_RADIUS, MIN_SAFE_RADIUS, PX_TO_MM, BASE_RPM,
  TOOL_LENGTH, DEBUG_SHOW_TIP, toolLabelFont, SPIN_TEXTURE_CONFIG,
  CYLINDER_SHADER_SKSL, CHIP_POOL_SIZE, CHIP_GRAVITY, CHIP_MAX_LIFE,
  CHIP_MIN_REMOVAL, CATCH_BASE_CHANCE, CATCH_PROB_CAP, CATCH_LOCKOUT_MS,
  WEAR_RATE, WEAR_DEPTH_PENALTY, WEAR_CATCH_RISK,
  BLADE_LEN, SHANK_LEN, HANDLE_LEN, TOTAL_VISUAL_LEN,
  STEEL_LIGHT, STEEL_MID, STEEL_DARK, WOOD_HANDLE, WOOD_HANDLE_DK,
  CHUCK_RADIUS, CHUCK_CENTER_L, CHUCK_CENTER_R,
} from '../constants';
import {
  clamp, fingerToTip, xToSeg, applyTool, footprintRemoval, smooth,
  jitterProfile, fillPath, chipStyleForMaterial, makeChipPool,
} from '../utils';
import { styles } from '../styles';

const cylinderEffect = Skia.RuntimeEffect.Make(CYLINDER_SHADER_SKSL);

function bladeVisualWidth(toolWidth) {
  // tool.width drives the actual cut in profile-px (2–16) and must
  // stay small for the simulation to feel precise. Drawing it 1:1
  // made a 2px parting tool and a 16px roughing tool look like the
  // same blob. This is a SEPARATE on-screen scale: same relative
  // ordering as the real cutting width, but every tool stays legible.
  return clamp(toolWidth * 1.6 + 6, 10, 28);
}

// ── Isolated HUD overlay ──────────────────────────────────────
// The diameter callipers and catch-flash used to be plain useState
// inside DrawingCanvas. Moving this state into its own tiny
// component, updated imperatively via a ref instead of props, means
// a hover tick only re-renders this small overlay -- never the
// canvas -- while the canvas itself only re-renders when
// `profile`/`tool`/etc. actually change.
export const CutHUD = forwardRef(function CutHUD(_props, ref) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [flash, setFlash] = useState(false);

  useImperativeHandle(ref, () => ({
    setHover: (info) => setHoverInfo(info),
    triggerFlash: () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
    },
  }), []);

  return (
    <>
      {flash && <View pointerEvents="none" style={styles.catchFlash} />}
      {hoverInfo && (
        <View pointerEvents="none" style={styles.hoverBadge}>
          <Text style={[styles.hoverBadgeText, hoverInfo.thin && styles.hoverBadgeTextWarn]}>
            ⌀ {hoverInfo.mm.toFixed(1)}mm{hoverInfo.thin ? '  ⚠ thin wall' : ''}
          </Text>
        </View>
      )}
    </>
  );
});

// ── Chip particle system ──────────────────────────────────────
function ChipParticle({ chipSnapshot, index }) {
  const transform = useDerivedValue(() => {
    const c = chipSnapshot.value[index];
    return [{ translateX: c.x }, { translateY: c.y }, { rotate: c.rot }];
  });
  const opacity = useDerivedValue(() => chipSnapshot.value[index].opacity);
  const color = useDerivedValue(() => chipSnapshot.value[index].color);

  const path = useDerivedValue(() => {
    const c = chipSnapshot.value[index];
    const s = c.size / 2;
    const p = Skia.Path.Make();

    switch (c.kind) {
      case 'shaving': {
        p.moveTo(-s * 1.6, 0);
        p.quadTo(-s * 0.4, -s * 0.9, s * 0.6, -s * 0.3);
        p.quadTo(s * 1.3, 0.1, s * 1.6, s * 0.6);
        p.quadTo(s * 0.9, s * 0.35, s * 0.3, s * 0.5);
        p.quadTo(-s * 0.6, s * 0.7, -s * 1.6, 0);
        p.close();
        break;
      }
      case 'chip': {
        p.moveTo(-s, -s * 0.6);
        p.lineTo(s * 0.8, -s);
        p.lineTo(s, s * 0.5);
        p.lineTo(-s * 0.6, s * 0.9);
        p.close();
        break;
      }
      case 'spark': {
        p.moveTo(0, -s);
        p.lineTo(s * 0.55, 0);
        p.lineTo(0, s);
        p.lineTo(-s * 0.55, 0);
        p.close();
        break;
      }
      case 'blob':
      default: {
        p.moveTo(0, -s);
        p.quadTo(s, -s * 0.5, s * 0.7, s * 0.6);
        p.quadTo(0, s * 1.1, -s * 0.7, s * 0.6);
        p.quadTo(-s, -s * 0.5, 0, -s);
        p.close();
        break;
      }
    }
    return p;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path} style="fill" color={color} />
    </Group>
  );
}

const ChipLayer = memo(function ChipLayer({ chipSnapshot }) {
  return (
    <>
      {Array.from({ length: CHIP_POOL_SIZE }).map((_, i) => (
        <ChipParticle key={i} chipSnapshot={chipSnapshot} index={i} />
      ))}
    </>
  );
});

// ── Stock texture loader, with automatic retry ──────────────────
// `useImage` fetches asynchronously and, in dev, over HTTP from the
// Metro bundler. If that request fails or is in flight when Metro
// restarts, `useImage` just stays null forever for that mount --
// there's no built-in retry, and the component is stuck rendering
// the plain-gradient fallback until something unrelated happens to
// re-render it. This isolates the `useImage` call in its own tiny
// component so a failed load can be retried by remounting *only*
// this piece (via a fresh `key` from the parent), without touching
// the much larger DrawingCanvas or any of its other state.
const STOCK_TEXTURE_RETRY_MS = 1500;
const STOCK_TEXTURE_MAX_RETRIES = 5;

function StockTextureLoader({ source, onImage }) {
  const image = useImage(source);
  useEffect(() => {
    onImage(image ?? null);
  }, [image, onImage]);
  return null;
}

// ── Main drawing canvas ────────────────────────────────────────
export function DrawingCanvas({
  profile, onProfile, onCommit, tool, mat, rpm, wear, onWear, onCatch,
  onChatterTick, spinEnabled, isPowered = true,
}) {
  const textureDef = useMemo(
    () => Textures.find(t => t.name === SPIN_TEXTURE_CONFIG.MATERIAL) ?? null,
    []
  );

  // Stock texture: loaded via StockTextureLoader (rendered below,
  // returns null) instead of a direct `useImage` call, so a failed
  // load can be retried by remounting just that loader -- see the
  // effect below and STOCK_TEXTURE_RETRY_MS/MAX_RETRIES above.
  const [texImage, setTexImage] = useState(null);
  const [textureRetryKey, setTextureRetryKey] = useState(0);
  const textureRetryCountRef = useRef(0);
  const [textureStillLoading, setTextureStillLoading] = useState(false);

  const handleStockTexture = useCallback((img) => {
    setTexImage(img);
    if (img) {
      textureRetryCountRef.current = 0;
      setTextureStillLoading(false);
    }
  }, []);

  useEffect(() => {
    if (texImage) return; // already loaded -- nothing to retry
    if (textureRetryCountRef.current >= STOCK_TEXTURE_MAX_RETRIES) return;
    const t = setTimeout(() => {
      textureRetryCountRef.current += 1;
      setTextureStillLoading(true);
      // Bumping the key remounts StockTextureLoader, giving useImage
      // a fresh attempt at the fetch.
      setTextureRetryKey(k => k + 1);
    }, STOCK_TEXTURE_RETRY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texImage, textureRetryKey]);

  const angleRef = useSharedValue(0);

  const matRef = useRef(mat);
  useEffect(() => { matRef.current = mat; }, [mat]);

  // ── Power state, readable from worklets ──────────────────────
  // Gesture callbacks below run on the UI thread ('worklet'), so a
  // plain JS `isPowered` prop can't be read there directly -- it has
  // to be mirrored into a shared value. This is what makes cutting
  // itself (not just the spin animation) turn off with the power.
  const isPoweredSV = useSharedValue(isPowered);
  useEffect(() => { isPoweredSV.value = isPowered; }, [isPowered]);

  // ── Chip particle pool ──
  const chipPoolRef = useRef(makeChipPool(CHIP_POOL_SIZE));
  const chipCursorRef = useRef(0);
  const chipsActiveCountRef = useRef(0);
  const chipSnapshot = useSharedValue(
    Array.from({ length: CHIP_POOL_SIZE }, () => ({ x: 0, y: 0, rot: 0, opacity: 0, size: 0, kind: 'blob', color: '#fff' }))
  );
  const chipRafRef = useRef(null);
  const chipRunningRef = useRef(false);
  const lastChipFrameT = useRef(0);

  const updateChips = useCallback((dt) => {
    const pool = chipPoolRef.current;
    let anyActive = false;
    const snap = chipSnapshot.value.slice();
    const dts = dt / 1000;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        chipsActiveCountRef.current = Math.max(0, chipsActiveCountRef.current - 1);
        snap[i] = { ...snap[i], opacity: 0 };
        continue;
      }
      p.vy += CHIP_GRAVITY * dts;
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.rot += p.vr * dts;
      anyActive = true;
      const lifeRatio = p.life / p.maxLife;
      snap[i] = {
        x: p.x, y: p.y, rot: p.rot,
        opacity: Math.min(1, lifeRatio * 1.6),
        size: p.size * (0.7 + lifeRatio * 0.3),
        kind: p.kind, color: p.color,
      };
    }
    chipSnapshot.value = snap;
    return anyActive;
  }, []);

  const chipLoop = useCallback((t) => {
    const last = lastChipFrameT.current || t;
    const dt = Math.min(48, t - last);
    lastChipFrameT.current = t;
    const stillActive = updateChips(dt);
    if (stillActive || chipsActiveCountRef.current > 0) {
      chipRafRef.current = requestAnimationFrame(chipLoop);
    } else {
      chipRunningRef.current = false;
      chipRafRef.current = null;
      lastChipFrameT.current = 0;
    }
  }, [updateChips]);

  const startChipLoop = useCallback(() => {
    if (!chipRunningRef.current) {
      chipRunningRef.current = true;
      lastChipFrameT.current = 0;
      chipRafRef.current = requestAnimationFrame(chipLoop);
    }
  }, [chipLoop]);

  useEffect(() => () => { if (chipRafRef.current) cancelAnimationFrame(chipRafRef.current); }, []);

  // Spawns `count` chips at (tx, ty). `strength` (0-1+) scales how hard
  // they're flung -- driven by how much material was actually removed.
  const spawnChips = useCallback((tx, ty, count, tool, matStyle, spindleDir, strength) => {
    const pool = chipPoolRef.current;
    const kick = 1 + clamp(strength, 0, 1) * 1.4;
    for (let i = 0; i < count; i++) {
      const idx = chipCursorRef.current;
      chipCursorRef.current = (idx + 1) % CHIP_POOL_SIZE;
      const p = pool[idx];
      if (!p.active) chipsActiveCountRef.current += 1;

      const side = ty < AXIS_Y ? -1 : 1;
      const tangentialBase = spindleDir * side * (0.6 + Math.random() * 0.6);
      const scatter = (Math.random() - 0.5) * 2;

      p.active = true;
      p.x = tx + (Math.random() - 0.5) * tool.width * 0.6;
      p.y = ty;
      p.vx = (tangentialBase * 140 + scatter * 130) * kick;
      p.vy = side * (-170 - Math.random() * 130) * kick;
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * 14;
      p.maxLife = CHIP_MAX_LIFE * (0.6 + Math.random() * 0.8);
      p.life = p.maxLife;
      p.size = matStyle.size[0] + Math.random() * (matStyle.size[1] - matStyle.size[0]);
      p.kind = matStyle.kind;
      p.color = matStyle.color;
    }
    startChipLoop();
  }, [startChipLoop]);

  // ── Spin animation, gated on power ──────────────────────────
  const animationRunningRef = useRef(false);

  useEffect(() => {
    const stopAnimation = () => {
      animationRunningRef.current = false;
      angleRef.value = 0;
    };

    if (!spinEnabled || !isPowered) {
      stopAnimation();
      return;
    }

    if (!animationRunningRef.current) {
      animationRunningRef.current = true;
      const rate = SPIN_TEXTURE_CONFIG.CLOCK_RATE * (rpm / BASE_RPM);
      const sweep = 100000;
      const durationMs = (sweep / rate) * 1000;

      angleRef.value = withRepeat(
        withTiming(angleRef.value + sweep, { duration: durationMs, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [rpm, spinEnabled, isPowered]);

  const cylinderUniforms = useDerivedValue(() => ({
    axisY: AXIS_Y,
    radius: STOCK_RADIUS,
    phase: angleRef.value,
    direction: SPIN_TEXTURE_CONFIG.DIRECTION,
    wrapHeight: SPIN_TEXTURE_CONFIG.WRAP_HEIGHT,
    minBrightness: SPIN_TEXTURE_CONFIG.MIN_BRIGHTNESS,
    maxBrightness: SPIN_TEXTURE_CONFIG.MAX_BRIGHTNESS,
  }));

  const gradStart = useMemo(() => {
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    return vec(CANVAS_W / 2, AXIS_Y - halfLen);
  }, []);
  const gradEnd = useMemo(() => {
    const halfLen = Math.min(CANVAS_W, CANVAS_H) * 0.25;
    return vec(CANVAS_W / 2, AXIS_Y + halfLen);
  }, []);

  const grainPath = useDerivedValue(() => {
    const GRAIN_SPACING = 9;
    const p = Skia.Path.Make();
    const offset = SPIN_TEXTURE_CONFIG.DIRECTION * (angleRef.value * SPIN_TEXTURE_CONFIG.SPEED) % GRAIN_SPACING;
    for (let x = STOCK_LEFT - GRAIN_SPACING + offset; x < STOCK_RIGHT + GRAIN_SPACING; x += GRAIN_SPACING) {
      p.moveTo(x, AXIS_Y - STOCK_RADIUS - 4);
      p.lineTo(x, AXIS_Y + STOCK_RADIUS + 4);
    }
    return p;
  });

  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);

  const toolBodyTransform = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    return [{ translateX: tx }, { translateY: ty }];
  });

  const tipTransform = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    return [{ translateX: tx }, { translateY: ty }];
  });

  const gripTransform = useDerivedValue(() => [
    { translateX: fingerX.value },
    { translateY: fingerY.value },
  ]);

  const pendingPoint = useRef(null);
  const rafRef = useRef(null);
  const isProcessing = useRef(false);
  const lastReactUpdate = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const toolRef = useRef(tool);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  const wearRef = useRef(wear);
  useEffect(() => { wearRef.current = wear; }, [wear]);
  const rpmRef = useRef(rpm);
  useEffect(() => { rpmRef.current = rpm; }, [rpm]);

  const lastCutSample = useRef({ x: null, y: null, t: 0 });
  const lockUntilRef = useRef(0);
  const lastWearUpdate = useRef(0);
  const lastHoverUpdate = useRef(0);
  const lastChatterTick = useRef(0);

  const hudRef = useRef(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerCatchFx = useCallback(() => {
    hudRef.current?.triggerFlash();
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

  const updatePendingPoint = useCallback((x, y) => {
    pendingPoint.current = { x, y };
  }, []);

  const processCut = useCallback(() => {
    if (!isProcessing.current) {
      rafRef.current = null;
      return;
    }

    const point = pendingPoint.current;
    if (!point) {
      rafRef.current = requestAnimationFrame(processCut);
      return;
    }
    pendingPoint.current = null;

    const now = Date.now();
    const currentTool = toolRef.current;
    const last = lastCutSample.current;
    const dt = last.t ? Math.max(1, now - last.t) : 16;
    const dist = last.x != null ? Math.hypot(point.x - last.x, point.y - last.y) : 0;
    const velocity = dist / dt;
    lastCutSample.current = { x: point.x, y: point.y, t: now };

    const pressureNorm = clamp(velocity / 1.4, 0, 1.6);
    const pressureMul = 0.6 + pressureNorm * 0.8;

    const rpmNow = rpmRef.current;
    const rpmFactor = rpmNow / BASE_RPM;
    const wearNow = wearRef.current;
    const wearMul = 1 - wearNow * WEAR_DEPTH_PENALTY;

    const seg = xToSeg(point.x);
    const currentRadius = profileRef.current[seg] ?? STOCK_RADIUS;
    const thinFactor = currentRadius < MIN_SAFE_RADIUS * 1.6 ? 1.6 : 1.0;
    const shapeRisk = currentTool.shape === 'narrow' ? 1.5 : currentTool.shape === 'point' ? 1.2 : 1.0;
    const wearRisk = 1 + wearNow * WEAR_CATCH_RISK;

    const inLockout = now < lockUntilRef.current;

    if (!inLockout) {
      const catchRisk = shapeRisk * wearRisk * thinFactor * rpmFactor * Math.max(0, pressureNorm - 0.35);
      const catchProb = clamp(CATCH_BASE_CHANCE * catchRisk, 0, CATCH_PROB_CAP);

      if (pressureNorm > 0.35 && Math.random() < catchProb) {
        const digTool = { ...currentTool, depth: currentTool.depth * 2.6 };
        const beforeProfile = profileRef.current;
        const dug = applyTool(beforeProfile, point.x, point.y, digTool);
        const half = Math.floor(currentTool.width / 2);
        const catchRemoval = footprintRemoval(beforeProfile, dug, seg, half);

        profileRef.current = dug;
        lockUntilRef.current = now + CATCH_LOCKOUT_MS;
        onCatch();
        onWear(currentTool.id, clamp(wearNow + 0.05, 0, 1));
        triggerCatchFx();
        onProfile([...dug]);

        if (catchRemoval > CHIP_MIN_REMOVAL) {
          spawnChips(
            point.x, point.y, 10, currentTool,
            chipStyleForMaterial(matRef.current), SPIN_TEXTURE_CONFIG.DIRECTION,
            1.4
          );
        }
      } else {
        const toolForCut = { ...currentTool, depth: currentTool.depth * pressureMul * wearMul };
        const beforeProfile = profileRef.current;
        let next = applyTool(beforeProfile, point.x, point.y, toolForCut);

        const half = Math.floor(currentTool.width / 2);
        const removalAmount = footprintRemoval(beforeProfile, next, seg, half);

        if (removalAmount > CHIP_MIN_REMOVAL) {
          const chipCount = clamp(Math.round(removalAmount * 0.8 + pressureNorm * 2.2), 1, 9);
          spawnChips(
            point.x, point.y, chipCount, currentTool,
            chipStyleForMaterial(matRef.current), SPIN_TEXTURE_CONFIG.DIRECTION,
            clamp(removalAmount / currentTool.width, 0, 1) + pressureNorm * 0.3
          );
        }

        const chatterOn = pressureNorm > 0.65 && rpmFactor > 1.15 &&
          (currentTool.shape === 'round' || currentTool.shape === 'flat');
        if (chatterOn) {
          const intensity = 0.4 * (pressureNorm - 0.5) * (rpmFactor - 1);
          next = jitterProfile(next, seg, Math.ceil(currentTool.width / 2) + 1, intensity);
          if (now - lastChatterTick.current > 150) {
            lastChatterTick.current = now;
            onChatterTick();
          }
        }

        if (currentTool.id === 'scraper') next = smooth(next, 0.35);
        profileRef.current = next;

        if (now - lastReactUpdate.current > 80) {
          lastReactUpdate.current = now;
          onProfile([...next]);
        }
      }

      if (now - lastWearUpdate.current > 300) {
        lastWearUpdate.current = now;
        const nextWear = clamp(wearNow + dist * WEAR_RATE * (currentTool.depth / 4), 0, 1);
        onWear(currentTool.id, nextWear);
      }
    }

    if (now - lastHoverUpdate.current > 100) {
      lastHoverUpdate.current = now;
      const r = profileRef.current[seg] ?? STOCK_RADIUS;
      hudRef.current?.setHover({ mm: r * 2 * PX_TO_MM, thin: r < MIN_SAFE_RADIUS });
    }

    rafRef.current = requestAnimationFrame(processCut);
  }, [onProfile, onCatch, onChatterTick, onWear, triggerCatchFx, spawnChips]);

  const startProcessing = useCallback(() => {
    if (!isProcessing.current) {
      isProcessing.current = true;
      rafRef.current = requestAnimationFrame(processCut);
    }
  }, [processCut]);

  const stopProcessing = useCallback(() => {
    isProcessing.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPoint.current = null;
    lastCutSample.current = { x: null, y: null, t: 0 };
    hudRef.current?.setHover(null);
  }, []);

  const syncReactState = useCallback(() => {
    const now = Date.now();
    if (now - lastReactUpdate.current > 30) {
      lastReactUpdate.current = now;
      onProfile([...profileRef.current]);
    }
    onCommit([...profileRef.current]);
  }, [onProfile, onCommit]);

  // ── Gesture: gated on power ───────────────────────────────────
  // onBegin/onUpdate bail immediately when isPoweredSV.value is
  // false, so with the motor off the tool cannot start or continue a
  // cut -- matching the stock, which is also stopped by isPowered in
  // the effect above. onEnd stays unconditional so a gesture that
  // started while powered (then power got toggled off mid-drag) still
  // cleans up and commits its history properly.
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      if (!isPoweredSV.value) return;
      fingerX.value = e.x;
      fingerY.value = e.y;
      const { tx, ty } = fingerToTip(e.x, e.y);
      runOnJS(startProcessing)();
      runOnJS(updatePendingPoint)(tx, ty - TOOL_LENGTH);
    })
    .onUpdate((e) => {
      'worklet';
      if (!isPoweredSV.value) return;
      fingerX.value = e.x;
      fingerY.value = e.y;
      const { tx, ty } = fingerToTip(e.x, e.y);
      runOnJS(updatePendingPoint)(tx, ty - TOOL_LENGTH);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(stopProcessing)();
      runOnJS(syncReactState)();
    });

  // ── Blade: real cutting-edge geometry per tool shape ────────
  const buildToolCursor = useCallback(() => {
    const bw = bladeVisualWidth(tool.width);
    const half = bw / 2;
    const p = Skia.Path.Make();

    switch (tool.shape) {
      case 'flat': {
        if (tool.id === 'skew') {
          const skew = half * 0.85;
          p.moveTo(-half, 0);
          p.lineTo(-half, -BLADE_LEN * 0.82);
          p.lineTo(-half + skew, -BLADE_LEN);
          p.lineTo(half, -BLADE_LEN * 0.55);
          p.lineTo(half, 0);
          p.close();
        } else {
          p.moveTo(-half, 0);
          p.lineTo(-half, -BLADE_LEN * 0.85);
          p.lineTo(-half * 0.9, -BLADE_LEN);
          p.lineTo(half * 0.9, -BLADE_LEN);
          p.lineTo(half, -BLADE_LEN * 0.85);
          p.lineTo(half, 0);
          p.close();
        }
        break;
      }
      case 'narrow': {
        p.moveTo(-half * 0.45, 0);
        p.lineTo(-half, -BLADE_LEN * 0.5);
        p.lineTo(-half * 0.3, -BLADE_LEN);
        p.lineTo(half * 0.3, -BLADE_LEN);
        p.lineTo(half, -BLADE_LEN * 0.5);
        p.lineTo(half * 0.45, 0);
        p.close();
        break;
      }
      case 'point': {
        p.moveTo(-half * 0.6, 0);
        p.lineTo(-half * 0.65, -BLADE_LEN * 0.72);
        p.quadTo(-half * 0.65, -BLADE_LEN, 0, -BLADE_LEN);
        p.quadTo(half * 0.65, -BLADE_LEN, half * 0.65, -BLADE_LEN * 0.72);
        p.lineTo(half * 0.6, 0);
        p.close();
        break;
      }
      case 'round':
      default: {
        p.moveTo(-half, 0);
        p.lineTo(-half, -BLADE_LEN * 0.72);
        p.quadTo(-half, -BLADE_LEN, 0, -BLADE_LEN);
        p.quadTo(half, -BLADE_LEN, half, -BLADE_LEN * 0.72);
        p.lineTo(half, 0);
        p.close();
        break;
      }
    }
    return p;
  }, [tool]);

  const buildToolFlute = useCallback(() => {
    if (tool.shape !== 'round') return null;
    const bw = bladeVisualWidth(tool.width);
    const half = (bw / 2) * 0.5;
    const p = Skia.Path.Make();
    p.moveTo(-half, -3);
    p.lineTo(-half, -BLADE_LEN * 0.66);
    p.quadTo(-half, -BLADE_LEN * 0.9, 0, -BLADE_LEN * 0.9);
    p.quadTo(half, -BLADE_LEN * 0.9, half, -BLADE_LEN * 0.66);
    p.lineTo(half, -3);
    p.close();
    return p;
  }, [tool]);

  const buildToolFerrule = useCallback(() => {
    const bw = bladeVisualWidth(tool.width);
    const half = Math.max(bw / 2, 5.5);
    const p = Skia.Path.Make();
    p.addRRect({
      rect: { x: -half, y: -(BLADE_LEN + SHANK_LEN), width: half * 2, height: SHANK_LEN },
      rx: 1, ry: 1,
    });
    return p;
  }, [tool]);

  const buildToolHandle = useCallback(() => {
    const bw = bladeVisualWidth(tool.width);
    const handleHalf = Math.max(bw * 0.85, 9);
    const top = -(BLADE_LEN + SHANK_LEN);
    const bottom = top - HANDLE_LEN;
    const p = Skia.Path.Make();
    p.moveTo(-handleHalf * 0.55, top);
    p.quadTo(-handleHalf, (top + bottom) / 2, -handleHalf * 0.4, bottom);
    p.quadTo(0, bottom + 6, handleHalf * 0.4, bottom);
    p.quadTo(handleHalf, (top + bottom) / 2, handleHalf * 0.55, top);
    p.close();
    return p;
  }, [tool]);

  const buildToolShadow = useCallback(() => {
    const bw = bladeVisualWidth(tool.width);
    const handleHalf = Math.max(bw * 0.85, 9) * 1.05;
    const top = -(BLADE_LEN + SHANK_LEN) + 2;
    const bottom = top - HANDLE_LEN + 4;
    const p = Skia.Path.Make();
    p.moveTo(-handleHalf * 0.55, top);
    p.quadTo(-handleHalf, (top + bottom) / 2, -handleHalf * 0.4, bottom);
    p.quadTo(0, bottom + 6, handleHalf * 0.4, bottom);
    p.quadTo(handleHalf, (top + bottom) / 2, handleHalf * 0.55, top);
    p.close();
    return p;
  }, [tool]);

  const fp = useMemo(() => fillPath(profile), [profile]);

  const toolCursorPath = useMemo(() => buildToolCursor(), [buildToolCursor]);
  const toolHandlePath = useMemo(() => buildToolHandle(), [buildToolHandle]);
  const toolShadowPath = useMemo(() => buildToolShadow(), [buildToolShadow]);
  const toolFerrulePath = useMemo(() => buildToolFerrule(), [buildToolFerrule]);
  const toolFlutePath = useMemo(() => buildToolFlute(), [buildToolFlute]);

  const depthLines = useMemo(() => Array.from({ length: 10 }), []);

  const CUT_TINT_COLOR = '#faf6ed';
  const cutOverlayPaths = useMemo(() => {
    const light = Skia.Path.Make();
    const medium = Skia.Path.Make();
    const heavy = Skia.Path.Make();
    const segW = STOCK_WIDTH / PROFILE_SEGS;
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const removal = clamp((STOCK_RADIUS - profile[i]) / STOCK_RADIUS, 0, 1);
      if (removal <= 0.03) continue;
      const x0 = STOCK_LEFT + (i / PROFILE_SEGS) * STOCK_WIDTH;
      const rect = { x: x0, y: AXIS_Y - STOCK_RADIUS - 2, width: segW + 0.5, height: STOCK_RADIUS * 2 + 4 };
      if (removal > 0.35) heavy.addRect(rect);
      else if (removal > 0.15) medium.addRect(rect);
      else light.addRect(rect);
    }
    return { light, medium, heavy };
  }, [profile]);

  const dangerSegments = useMemo(() => {
    const segs = [];
    let start = null;
    for (let i = 0; i < PROFILE_SEGS; i++) {
      const isDanger = profile[i] < MIN_SAFE_RADIUS;
      if (isDanger && start === null) start = i;
      if (!isDanger && start !== null) { segs.push([start, i - 1]); start = null; }
    }
    if (start !== null) segs.push([start, PROFILE_SEGS - 1]);
    return segs;
  }, [profile]);

  const dangerPaths = useMemo(() => dangerSegments.map(([s, e]) => {
    const x0 = STOCK_LEFT + (s / PROFILE_SEGS) * STOCK_WIDTH;
    const x1 = STOCK_LEFT + ((e + 1) / PROFILE_SEGS) * STOCK_WIDTH;
    const p = Skia.Path.Make();
    p.addRect({ x: x0, y: AXIS_Y - STOCK_RADIUS - 6, width: Math.max(1, x1 - x0), height: STOCK_RADIUS * 2 + 12 });
    return p;
  }), [dangerSegments]);

  const cuttingIndicator = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    const p = Skia.Path.Make();
    p.addCircle(tx, ty, tool.width / 2 + 4);
    return p;
  });

  const connectorPath = useDerivedValue(() => {
    const { tx, ty } = fingerToTip(fingerX.value, fingerY.value);
    const p = Skia.Path.Make();
    p.moveTo(fingerX.value, fingerY.value);
    p.lineTo(tx, ty);
    return p;
  });

  return (
    <View style={{ width: CANVAS_W, height: CANVAS_H }}>
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <GestureDetector gesture={gesture}>
          <SkiaCanvas style={{ width: CANVAS_W, height: CANVAS_H }}>
            {texImage && cylinderEffect ? (
              <Path path={fp} style="fill">
                <Shader source={cylinderEffect} uniforms={cylinderUniforms}>
                  <ImageShader
                    image={texImage}
                    tx="mirror"
                    ty="mirror"
                    fit="cover"
                    rect={{ x: 0, y: 0, width: SPIN_TEXTURE_CONFIG.TILE_SIZE, height: SPIN_TEXTURE_CONFIG.WRAP_HEIGHT }}
                  />
                </Shader>
              </Path>
            ) : (
              <>
                <Path path={fp} style="fill">
                  <LinearGradient
                    start={gradStart}
                    end={gradEnd}
                    colors={[
                      '#2a0e04', '#6a2c10', '#b86030', '#ecb898',
                      '#fad0b0', '#d08858', '#7a3a18', '#2a0e04',
                    ]}
                    mode="clamp"
                  />
                </Path>
                <Group clip={fp}>
                  <Path path={grainPath} style="stroke" strokeWidth={1} color="rgba(20,8,2,0.16)" />
                </Group>
              </>
            )}

            <Group clip={fp}>
              <Path path={cutOverlayPaths.light} style="fill" color={CUT_TINT_COLOR} opacity={0.14} />
              <Path path={cutOverlayPaths.medium} style="fill" color={CUT_TINT_COLOR} opacity={0.26} />
              <Path path={cutOverlayPaths.heavy} style="fill" color={CUT_TINT_COLOR} opacity={0.4} />
            </Group>

            {dangerPaths.map((p, i) => (
              <Group key={i} clip={fp}>
                <Path path={p} style="fill" color="rgba(255,40,40,0.20)" />
              </Group>
            ))}

            <Path path={cuttingIndicator} style="fill" color={tool.color + '10'} />
            <Path path={cuttingIndicator} style="stroke" strokeWidth={1} color={tool.color + '30'} />

            {depthLines.map((_, i) => {
              const idx = Math.floor((i / 10) * PROFILE_SEGS);
              const x = STOCK_LEFT + (idx / PROFILE_SEGS) * STOCK_WIDTH;
              const r = profile[idx];
              return (
                <Line key={i} p1={vec(x, AXIS_Y - r)} p2={vec(x, AXIS_Y + r)}
                  strokeWidth={0.3} color="rgba(140,60,20,0.12)" />
              );
            })}

            <Circle cx={CANVAS_W / 2} cy={AXIS_Y} r={2.5} color="#3b82f6" />
            {Array.from({ length: 4 }).map((_, i) => {
              const x = STOCK_LEFT + (i / 3) * STOCK_WIDTH;
              return (
                <Line key={i} p1={vec(x, AXIS_Y - 8)} p2={vec(x, AXIS_Y - 3)}
                  strokeWidth={1} color="rgba(70,110,160,0.45)" />
              );
            })}

            <ChipLayer chipSnapshot={chipSnapshot} />

            {/* ── TOOL BODY ── */}
            <Group opacity={1} transform={toolBodyTransform}>
              <Path path={toolShadowPath} style="fill" color="rgba(0,0,0,0.4)"
                transform={[{ translateX: 3 }, { translateY: 3 }]} />

              <Path path={toolHandlePath} style="fill" color={WOOD_HANDLE_DK}
                transform={[{ translateX: 1.5 }, { translateY: 1.5 }]} />
              <Path path={toolHandlePath} style="fill" color={WOOD_HANDLE} />
              {Array.from({ length: 3 }).map((_, i) => {
                const yPos = -(BLADE_LEN + SHANK_LEN) - HANDLE_LEN * 0.22 * (i + 1);
                const line = Skia.Path.Make();
                const w = bladeVisualWidth(tool.width) * 0.85 * (0.5 - i * 0.06);
                line.moveTo(-w, yPos);
                line.quadTo(0, yPos + 2, w, yPos);
                return (
                  <Path key={i} path={line} style="stroke" strokeWidth={0.4} color="rgba(80,50,20,0.15)" />
                );
              })}
              <Path path={toolHandlePath} style="fill" color="#ffffff" opacity={0.1}
                transform={[{ translateX: -1 }, { translateY: -1 }]} />

              <Path path={toolFerrulePath} style="fill" color="#5a6672"
                transform={[{ translateX: 1 }, { translateY: 1 }]} />
              <Path path={toolFerrulePath} style="fill" color={STEEL_DARK} />
              <Path path={toolFerrulePath} style="stroke" strokeWidth={0.5} color="#3d4650" />

              <Path path={toolCursorPath} style="fill" color="rgba(0,0,0,0.25)"
                transform={[{ translateX: 1 }, { translateY: 1 }]} />
              <Path path={toolCursorPath} style="fill" color={STEEL_MID} />
              <Path path={toolCursorPath} style="fill" color={STEEL_LIGHT} opacity={0.55}
                transform={[{ translateX: -0.8 }, { translateY: -0.8 }]} />
              {toolFlutePath && (
                <Path path={toolFlutePath} style="fill" color={STEEL_DARK} opacity={0.45} />
              )}
              <Path path={toolCursorPath} style="stroke" strokeWidth={0.8} color={STEEL_DARK} opacity={0.7} />
              <Path path={toolCursorPath} style="stroke" strokeWidth={2} color={tool.color} opacity={0.5} />

              {toolLabelFont && (
                <SkiaText
                  x={-tool.name.length * 1.8}
                  y={-TOTAL_VISUAL_LEN + 14}
                  text={tool.name}
                  font={toolLabelFont}
                  color="rgba(255,255,255,0.12)"
                />
              )}
            </Group>

            <Path path={connectorPath} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.35)" />
            <Group transform={gripTransform}>
              <Circle cx={0} cy={0} r={4} color="rgba(255,255,255,0.5)" />
              <Circle cx={0} cy={0} r={4} color="rgba(255,255,255,0.25)" style="stroke" strokeWidth={1} />
            </Group>

            {/* ── CUTTING TIP INDICATOR ── */}
            <Group transform={tipTransform}>
              <Circle cx={0} cy={0} r={tool.width / 2 + 6} color={tool.color + '15'} />
              <Circle cx={0} cy={0} r={tool.width / 2 + 3} color={tool.color + '25'} />
              <Circle cx={0} cy={0} r={tool.width / 2 + 1} color={tool.color} style="stroke" strokeWidth={1.2} opacity={0.5} />
              <Circle cx={0} cy={0} r={tool.width / 2} color={tool.color} style="stroke" strokeWidth={1.5} opacity={0.7} />
              <Circle cx={0} cy={0} r={2} color="#ffffff" opacity={0.9} />
              <Circle cx={0} cy={0} r={1.2} color={tool.color} opacity={0.8} />

              <Line p1={vec(-tool.width / 2 - 3, 0)} p2={vec(tool.width / 2 + 3, 0)} strokeWidth={0.4} color="rgba(255,255,255,0.15)" />
              <Line p1={vec(0, -tool.width / 2 - 3)} p2={vec(0, tool.width / 2 + 3)} strokeWidth={0.4} color="rgba(255,255,255,0.15)" />

              <Circle cx={0} cy={0} r={8} color="rgba(255,255,255,0.04)" />
              <Circle cx={0} cy={0} r={5} color="rgba(255,255,255,0.06)" />

              {DEBUG_SHOW_TIP && (
                <>
                  <Circle cx={0} cy={0} r={3} color="#ff0044" />
                  <Circle cx={0} cy={0} r={6} color="#ff0044" style="stroke" strokeWidth={1.5} opacity={0.9} />
                </>
              )}
            </Group>
          </SkiaCanvas>
        </GestureDetector>
      </Animated.View>

      <CutHUD ref={hudRef} />

      {/* Not visual -- just drives the stock texture load, with a
          fresh `key` on retry so a failed fetch gets remounted rather
          than staying null forever (see STOCK_TEXTURE_* above). */}
      <StockTextureLoader
        key={textureRetryKey}
        source={textureDef?.image ?? null}
        onImage={handleStockTexture}
      />

      {/* Distinguishes "still loading" from "genuinely stuck on the
          fallback" -- only shows while a retry is actually pending,
          so a slow dev-server fetch doesn't read as a rendering bug. */}
      {!texImage && textureStillLoading && (
        <View pointerEvents="none" style={styles.textureLoadingBadge}>
          <Text style={styles.textureLoadingText}>Loading stock texture…</Text>
        </View>
      )}
    </View>
  );
}
