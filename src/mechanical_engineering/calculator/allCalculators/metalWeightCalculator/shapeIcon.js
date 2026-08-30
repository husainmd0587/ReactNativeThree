import React from 'react';
import {
  Canvas,
  Circle,
  Rect,
  RoundedRect,
  Path,
  Skia,
  RadialGradient,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

const FILL   = '#90E0EF';
const STROKE = '#0077B6';
const FILL2  = '#C0E8F4';
const WHITE  = '#FFFFFF';

// ── 3D shading palette ────────────────────────────────────────────────────
// Every solid fill below is swapped for one of these gradients — a light
// hotspot toward the upper-left fading to a darker shadow edge — so flat
// cross-sections read as lit, dimensional metal instead of flat color fills.
const G_LIGHT  = '#E4F9FF';
const G_MID    = '#90E0EF';
const G_DARK   = '#0077B6';
const G2_LIGHT = '#C9EEF7';
const G2_MID   = '#5FB8CE';
const G2_DARK  = '#03567F';
const HOLE_LIGHT = '#FFFFFF';
const HOLE_DARK  = '#CFE0E8';

// Radial "glossy cylinder/sphere" shade for round profiles — highlight offset
// up-left, darkening toward the far rim.
function RadialShade({ cx, cy, r, dark }) {
  const colors = dark ? [G2_LIGHT, G2_MID, G2_DARK] : [G_LIGHT, G_MID, G_DARK];
  return (
    <RadialGradient
      c={vec(cx - r * 0.4, cy - r * 0.4)}
      r={r * 1.35}
      colors={colors}
      positions={[0, 0.55, 1]}
    />
  );
}

// Diagonal "beveled slab" shade for flat/angular profiles — light top-left
// corner fading to a dark bottom-right corner.
function RectShade({ x, y, width, height, dark }) {
  const colors = dark ? [G2_LIGHT, G2_MID, G2_DARK] : [G_LIGHT, G_MID, G_DARK];
  return (
    <LinearGradient
      start={vec(x, y)}
      end={vec(x + width, y + height)}
      colors={colors}
      positions={[0, 0.5, 1]}
    />
  );
}

// Same diagonal shade, but sized from an arbitrary Skia Path's own bounding
// box — used for the built-up profiles (T-bar, I-beam, channel, angle, Z,
// hexagon, octagon, triangle, trapezoid) whose silhouettes aren't a plain
// rect or circle.
function PathShade({ path, dark }) {
  const b = path.getBounds();
  const colors = dark ? [G2_LIGHT, G2_MID, G2_DARK] : [G_LIGHT, G_MID, G_DARK];
  return (
    <LinearGradient
      start={vec(b.x, b.y)}
      end={vec(b.x + b.width, b.y + b.height)}
      colors={colors}
      positions={[0, 0.5, 1]}
    />
  );
}

// Subtle recessed shading for a cut-through hole/bore — light center fading
// to a darker rim — so it reads as drilled into the material instead of a
// flat white patch sitting on top of it.
function HoleShadeCircle({ cx, cy, r }) {
  return (
    <RadialGradient
      c={vec(cx, cy)}
      r={r}
      colors={[HOLE_LIGHT, HOLE_LIGHT, HOLE_DARK]}
      positions={[0, 0.7, 1]}
    />
  );
}
function HoleShadeRect({ x, y, width, height }) {
  const cx = x + width / 2, cy = y + height / 2, r = Math.hypot(width, height) / 2;
  return (
    <RadialGradient
      c={vec(cx, cy)}
      r={r}
      colors={[HOLE_LIGHT, HOLE_LIGHT, HOLE_DARK]}
      positions={[0, 0.7, 1]}
    />
  );
}

// ── Shared helper ─────────────────────────────────────────────────────────────
function hexPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  const path = Skia.Path.Make();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) path.lineTo(pts[i].x, pts[i].y);
  path.close();
  return path;
}

// Single closed outline from a flat list of [x,y] points — used for the
// built-up profile shapes (T-bar, I-beam, channel, angle) so the cross
// section renders as one true silhouette instead of two overlapping
// rectangles with a visible seam line where they join.
function outlinePath(points) {
  const path = Skia.Path.Make();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
  path.close();
  return path;
}

function tBarOutline(fx, fy, fw, fh, wx, wy, ww, wh) {
  return outlinePath([
    [fx, fy], [fx + fw, fy], [fx + fw, fy + fh],
    [wx + ww, fy + fh], [wx + ww, wy + wh], [wx, wy + wh],
    [wx, fy + fh], [fx, fy + fh],
  ]);
}

function iBeamOutline(fx, fy1, fw, fh, fy2, wx, ww) {
  return outlinePath([
    [fx, fy1], [fx + fw, fy1], [fx + fw, fy1 + fh],
    [wx + ww, fy1 + fh], [wx + ww, fy2], [fx + fw, fy2],
    [fx + fw, fy2 + fh], [fx, fy2 + fh], [fx, fy2],
    [wx, fy2], [wx, fy1 + fh], [fx, fy1 + fh],
  ]);
}

function channelOutline(wx, fy, wt, ht, fx, fw, fh) {
  return outlinePath([
    [wx, fy], [fx + fw, fy], [fx + fw, fy + fh],
    [fx, fy + fh], [fx, fy + ht - fh], [fx + fw, fy + ht - fh],
    [fx + fw, fy + ht], [wx, fy + ht],
  ]);
}

function angleOutline(x0, y0, t, ht, bw) {
  return outlinePath([
    [x0, y0], [x0 + t, y0], [x0 + t, y0 + ht - t],
    [x0 + t + bw, y0 + ht - t], [x0 + t + bw, y0 + ht], [x0, y0 + ht],
  ]);
}

// Z-section: top flange extends right from the web's left edge, bottom
// flange extends left from the web's right edge — so the two flanges and
// the web share exact edges with no gap or overlap.
function zSectionOutline(wx, fy1, fy2, t, fw) {
  return outlinePath([
    [wx, fy1], [wx + fw, fy1], [wx + fw, fy1 + t],
    [wx + t, fy1 + t], [wx + t, fy2 + t], [wx + t - fw, fy2 + t],
    [wx + t - fw, fy2], [wx, fy2],
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  GRID THUMBNAILS  (small, 56×44)
// ─────────────────────────────────────────────────────────────────────────────

export function HexagonIcon({ size = 56 }) {
  const cx = size / 2, cy = size * 0.45, r = size * 0.38;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={hexPath(cx, cy, r)}><PathShade path={hexPath(cx, cy, r)} /></Path>
      <Path path={hexPath(cx, cy, r)} color={STROKE} style="stroke" strokeWidth={1.5} />
    </Canvas>
  );
}

export function RoundBarIcon({ size = 56 }) {
  // Solid rod, shown front-on as a circle — same visual language as
  // RoundTubeIcon (so the two read as a matched pair in the shape picker)
  // and as RoundBarPreview (dashed inner circle = diameter reference, not
  // a hole, so it doesn't get mistaken for a tube).
  const r = size * 0.38, ri = size * 0.19, cx = size / 2, cy = size / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={cx} cy={cy} r={r}><RadialShade cx={cx} cy={cy} r={r} /></Circle>
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={ri}><RadialShade cx={cx} cy={cy} r={ri} dark /></Circle>
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={1}
        strokeDash={{ intervals: [3, 2], phase: 0 }} opacity={0.5} />
    </Canvas>
  );
}

export function RoundTubeIcon({ size = 56 }) {
  const r = size * 0.38, ri = size * 0.22, cx = size / 2, cy = size / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={cx} cy={cy} r={r}><RadialShade cx={cx} cy={cy} r={r} /></Circle>
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={ri}><HoleShadeCircle cx={cx} cy={cy} r={ri} /></Circle>
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function SquareBarIcon({ size = 56 }) {
  const s1 = size * 0.52, s2 = size * 0.52, off = size * 0.14;
  const x1 = size * 0.1, y1 = size * 0.24;
  return (
    <Canvas style={{ width: size, height: size }}>
      {/* back face */}
      <Rect x={x1 + off} y={y1 - off} width={s2} height={s2}><RectShade x={x1 + off} y={y1 - off} width={s2} height={s2} dark /></Rect>
      <Rect x={x1 + off} y={y1 - off} width={s2} height={s2} color={STROKE} style="stroke" strokeWidth={1} />
      {/* front face */}
      <Rect x={x1} y={y1} width={s1} height={s1}><RectShade x={x1} y={y1} width={s1} height={s1} /></Rect>
      <Rect x={x1} y={y1} width={s1} height={s1} color={STROKE} style="stroke" strokeWidth={1.5} />
      {/* connecting edges */}
      {[[x1, y1, x1 + off, y1 - off],[x1 + s1, y1, x1 + s1 + off, y1 - off],[x1 + s1, y1 + s1, x1 + s1 + off, y1 + s1 - off]].map(([ax,ay,bx,by], i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1} />;
      })}
    </Canvas>
  );
}

export function SquareTubeIcon({ size = 56 }) {
  const s = size * 0.76, t = size * 0.18, x = (size - s) / 2, y = (size - s) / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x} y={y} width={s} height={s}><RectShade x={x} y={y} width={s} height={s} /></Rect>
      <Rect x={x} y={y} width={s} height={s} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x + t} y={y + t} width={s - t * 2} height={s - t * 2}><HoleShadeRect x={x + t} y={y + t} width={s - t * 2} height={s - t * 2} /></Rect>
      <Rect x={x + t} y={y + t} width={s - t * 2} height={s - t * 2} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function TBarIcon({ size = 56 }) {
  const fw = size * 0.84, fh = size * 0.2, fx = (size - fw) / 2, fy = size * 0.12;
  const ww = size * 0.22, wh = size * 0.56, wx = (size - ww) / 2, wy = fy + fh;
  const path = tBarOutline(fx, fy, fw, fh, wx, wy, ww, wh);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function BeamsIcon({ size = 56 }) {
  const fw = size * 0.84, fh = size * 0.16, fx = (size - fw) / 2;
  const fy1 = size * 0.1, fy2 = size * 0.74;
  const ww = size * 0.18, wh = size * 0.48, wx = (size - ww) / 2;
  const path = iBeamOutline(fx, fy1, fw, fh, fy2, wx, ww);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function ChannelIcon({ size = 56 }) {
  const wx = size * 0.1, wt = size * 0.18, ht = size * 0.76, fy = size * 0.12;
  const fx = wx + wt; // web's right edge = flange's left edge — contiguous, no seam
  const fw = size * 0.5, fh = size * 0.18;
  const path = channelOutline(wx, fy, wt, ht, fx, fw, fh);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function FlatBarIcon({ size = 56 }) {
  const w = size * 0.68, h = size * 0.3, off = size * 0.18;
  const x1 = size * 0.08, y1 = size * 0.38;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h}><RectShade x={x1 + off} y={y1 - off} width={w} height={h} dark /></Rect>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      <Rect x={x1} y={y1} width={w} height={h}><RectShade x={x1} y={y1} width={w} height={h} /></Rect>
      <Rect x={x1} y={y1} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      {[[x1,y1,x1+off,y1-off],[x1+w,y1,x1+w+off,y1-off],[x1,y1+h,x1+off,y1+h-off]].map(([ax,ay,bx,by], i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1} />;
      })}
    </Canvas>
  );
}

export function AngleIcon({ size = 56 }) {
  const t = size * 0.2, ht = size * 0.72, bw = size * 0.62, y0 = size * 0.12;
  const x0 = size * 0.1;
  const path = angleOutline(x0, y0, t, ht, bw);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CALC SCREEN LARGE PREVIEWS  (110×100)
// ─────────────────────────────────────────────────────────────────────────────

export function HexagonPreview() {
  const w = 110, h = 100, cx = 55, cy = 46, r = 40;
  const path = hexPath(cx, cy, r);
  const dashPath = Skia.Path.Make();
  dashPath.moveTo(cx - r, cy);
  dashPath.lineTo(cx + r, cy);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
      <Path path={dashPath} color={STROKE} style="stroke" strokeWidth={1}
        strokeDash={{ intervals: [4, 3], phase: 0 }} opacity={0.5} />
      {/* dimension line */}
      {(() => {
        const dim = Skia.Path.Make();
        dim.moveTo(15, 96); dim.lineTo(95, 96);
        dim.moveTo(15, 92); dim.lineTo(15, 96);
        dim.moveTo(95, 92); dim.lineTo(95, 96);
        return <Path path={dim} color="#333" style="stroke" strokeWidth={1.5} />;
      })()}
    </Canvas>
  );
}

export function RoundBarPreview() {
  const w = 110, h = 100, cx = 55, cy = 46, r = 40, ri = 20;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Circle cx={cx} cy={cy} r={r}><RadialShade cx={cx} cy={cy} r={r} /></Circle>
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={ri}><RadialShade cx={cx} cy={cy} r={ri} dark /></Circle>
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={1}
        strokeDash={{ intervals: [4, 3], phase: 0 }} opacity={0.5} />
    </Canvas>
  );
}

export function RoundTubePreview() {
  const w = 110, h = 100, cx = 55, cy = 46, r = 40, ri = 22;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Circle cx={cx} cy={cy} r={r}><RadialShade cx={cx} cy={cy} r={r} /></Circle>
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={ri}><HoleShadeCircle cx={cx} cy={cy} r={ri} /></Circle>
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function SquareBarPreview() {
  const w = 110, h = 100, s = 56, off = 20, x1 = 8, y1 = 26;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1 + off} y={y1 - off} width={s} height={s}><RectShade x={x1 + off} y={y1 - off} width={s} height={s} dark /></Rect>
      <Rect x={x1 + off} y={y1 - off} width={s} height={s} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={s} height={s}><RectShade x={x1} y={y1} width={s} height={s} /></Rect>
      <Rect x={x1} y={y1} width={s} height={s} color={STROKE} style="stroke" strokeWidth={2} />
      {[[x1,y1,x1+off,y1-off],[x1+s,y1,x1+s+off,y1-off],[x1+s,y1+s,x1+s+off,y1+s-off]].map(([ax,ay,bx,by],i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1.5} />;
      })}
    </Canvas>
  );
}

export function SquareTubePreview() {
  const w = 110, h = 100, s = 80, t = 18, x = 15, y = 10;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x} y={y} width={s} height={s}><RectShade x={x} y={y} width={s} height={s} /></Rect>
      <Rect x={x} y={y} width={s} height={s} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={x+t} y={y+t} width={s-t*2} height={s-t*2}><HoleShadeRect x={x+t} y={y+t} width={s-t*2} height={s-t*2} /></Rect>
      <Rect x={x+t} y={y+t} width={s-t*2} height={s-t*2} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function TBarPreview() {
  const w = 110, h = 100, fw = 94, fh = 16, fx = 8, fy = 8, ww = 22, wh = 60, wx = 44, wy = 24;
  const path = tBarOutline(fx, fy, fw, fh, wx, wy, ww, wh);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function BeamsPreview() {
  const w = 110, h = 100, fw = 94, fh = 14, fx = 8;
  const path = iBeamOutline(fx, 6, fw, fh, 78, 44, 22);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function ChannelPreview() {
  const w = 110, h = 100, wt = 18, ht = 76, fy = 12, fw = 60, fh = 14, fx = 26;
  const path = channelOutline(8, fy, wt, ht, fx, fw, fh);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function FlatBarPreview() {
  const w = 110, h = 100, bw = 72, bh = 28, off = 18, x1 = 8, y1 = 36;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1+off} y={y1-off} width={bw} height={bh}><RectShade x={x1+off} y={y1-off} width={bw} height={bh} dark /></Rect>
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={bw} height={bh}><RectShade x={x1} y={y1} width={bw} height={bh} /></Rect>
      <Rect x={x1} y={y1} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={2} />
      {[[x1,y1,x1+off,y1-off],[x1+bw,y1,x1+bw+off,y1-off],[x1,y1+bh,x1+off,y1+bh-off]].map(([ax,ay,bx,by],i)=>{
        const p=Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1.5}/>;
      })}
    </Canvas>
  );
}

export function AnglePreview() {
  const w = 110, h = 100, t = 18, ht = 72, bw = 62, y0 = 12;
  const path = angleOutline(8, y0, t, ht, bw);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

// ─── PASTE THESE INTO ShapeIcons.jsx ─────────────────────────────────────────
// Add after AnglePreview, then update SHAPE_ICONS and SHAPE_PREVIEWS maps.

// ─────────────────────────────────────────────────────────────────────────────
//  ICONS  (56×56)
// ─────────────────────────────────────────────────────────────────────────────

export function RectBarIcon({ size = 56 }) {
  const w = size * 0.72, h = size * 0.36, off = size * 0.16;
  const x1 = size * 0.08, y1 = size * 0.4;
  return (
    <Canvas style={{ width: size, height: size }}>
      {/* back face */}
      <Rect x={x1 + off} y={y1 - off} width={w} height={h}><RectShade x={x1 + off} y={y1 - off} width={w} height={h} dark /></Rect>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      {/* front face */}
      <Rect x={x1} y={y1} width={w} height={h}><RectShade x={x1} y={y1} width={w} height={h} /></Rect>
      <Rect x={x1} y={y1} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      {/* connecting edges */}
      {[[x1,y1,x1+off,y1-off],[x1+w,y1,x1+w+off,y1-off],[x1,y1+h,x1+off,y1+h-off]].map(([ax,ay,bx,by], i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1} />;
      })}
    </Canvas>
  );
}

export function RectTubeIcon({ size = 56 }) {
  const w = size * 0.76, h = size * 0.52, t = size * 0.1;
  const x = (size - w) / 2, y = (size - h) / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x} y={y} width={w} height={h}><RectShade x={x} y={y} width={w} height={h} /></Rect>
      <Rect x={x} y={y} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x + t} y={y + t} width={w - t * 2} height={h - t * 2}><HoleShadeRect x={x + t} y={y + t} width={w - t * 2} height={h - t * 2} /></Rect>
      <Rect x={x + t} y={y + t} width={w - t * 2} height={h - t * 2} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function SheetIcon({ size = 56 }) {
  const w = size * 0.8, h = size * 0.22, off = size * 0.14;
  const x1 = size * 0.06, y1 = size * 0.42;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h}><RectShade x={x1 + off} y={y1 - off} width={w} height={h} dark /></Rect>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      <Rect x={x1} y={y1} width={w} height={h}><RectShade x={x1} y={y1} width={w} height={h} /></Rect>
      <Rect x={x1} y={y1} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      {[[x1,y1,x1+off,y1-off],[x1+w,y1,x1+w+off,y1-off],[x1,y1+h,x1+off,y1+h-off],[x1+w,y1+h,x1+w+off,y1+h-off]].map(([ax,ay,bx,by], i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1} />;
      })}
    </Canvas>
  );
}

function octPath(cx, cy, r) {
  const path = Skia.Path.Make();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? path.moveTo(x, y) : path.lineTo(x, y);
  }
  path.close();
  return path;
}

export function OctagonBarIcon({ size = 56 }) {
  const cx = size / 2, cy = size * 0.46, r = size * 0.36;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={octPath(cx, cy, r)}><PathShade path={octPath(cx, cy, r)} /></Path>
      <Path path={octPath(cx, cy, r)} color={STROKE} style="stroke" strokeWidth={1.5} />
    </Canvas>
  );
}

export function HalfRoundIcon({ size = 56 }) {
  const r = size * 0.36, cx = size / 2, cy = size * 0.54;
  const arc = Skia.Path.Make();
  arc.moveTo(cx - r, cy);
  arc.arcToOval({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, 180, -180, false);
  arc.lineTo(cx - r, cy);
  arc.close();
  const flat = Skia.Path.Make();
  flat.moveTo(cx - r, cy);
  flat.lineTo(cx + r, cy);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={arc}><PathShade path={arc} /></Path>
      <Path path={arc} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Path path={flat} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function ZSectionIcon({ size = 56 }) {
  // Z shape: top flange extends right from the web's left edge, bottom
  // flange extends left from the web's right edge — exactly contiguous.
  const t = size * 0.18, fw = size * 0.58;
  const fy1 = size * 0.12, fy2 = size * 0.66;
  const wx = size * 0.42;
  const path = zSectionOutline(wx, fy1, fy2, t, fw);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function SphereIcon({ size = 56 }) {
  const c = size / 2, r = size * 0.38;
  const ovalH = Skia.Path.Make();
  ovalH.addOval({ x: c - r, y: c - r * 0.3, width: r * 2, height: r * 0.6 });
  const ovalV = Skia.Path.Make();
  ovalV.addOval({ x: c - r * 0.3, y: c - r, width: r * 0.6, height: r * 2 });
  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={c} cy={c} r={r}><RadialShade cx={c} cy={c} r={r} /></Circle>
      <Circle cx={c} cy={c} r={r} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Path path={ovalH} color={STROKE} style="stroke" strokeWidth={1} opacity={0.55} />
      <Path path={ovalV} color={STROKE} style="stroke" strokeWidth={1} opacity={0.55} />
    </Canvas>
  );
}

export function OvalIcon({ size = 56 }) {
  const c = size / 2;
  const path = Skia.Path.Make();
  path.addOval({ x: c - size * 0.42, y: c - size * 0.26, width: size * 0.84, height: size * 0.52 });
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function CrSquareIcon({ size = 56 }) {
  const s = size * 0.72, x = (size - s) / 2, y = (size - s) / 2, r = size * 0.14;
  return (
    <Canvas style={{ width: size, height: size }}>
      <RoundedRect x={x} y={y} width={s} height={s} r={r}><RectShade x={x} y={y} width={s} height={s} /></RoundedRect>
      <RoundedRect x={x} y={y} width={s} height={s} r={r} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function CrRectIcon({ size = 56 }) {
  const w = size * 0.8, h = size * 0.56, x = (size - w) / 2, y = (size - h) / 2, r = size * 0.12;
  return (
    <Canvas style={{ width: size, height: size }}>
      <RoundedRect x={x} y={y} width={w} height={h} r={r}><RectShade x={x} y={y} width={w} height={h} /></RoundedRect>
      <RoundedRect x={x} y={y} width={w} height={h} r={r} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function TriangleIcon({ size = 56 }) {
  const path = outlinePath([
    [size * 0.5, size * 0.14], [size * 0.88, size * 0.86], [size * 0.12, size * 0.86],
  ]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function TrapezoidIcon({ size = 56 }) {
  const path = outlinePath([
    [size * 0.34, size * 0.16], [size * 0.66, size * 0.16],
    [size * 0.86, size * 0.84], [size * 0.14, size * 0.84],
  ]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PREVIEWS  (110×100)
// ─────────────────────────────────────────────────────────────────────────────

export function RectBarPreview() {
  const w = 110, h = 100, bw = 72, bh = 36, off = 20, x1 = 8, y1 = 34;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1+off} y={y1-off} width={bw} height={bh}><RectShade x={x1+off} y={y1-off} width={bw} height={bh} dark /></Rect>
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={bw} height={bh}><RectShade x={x1} y={y1} width={bw} height={bh} /></Rect>
      <Rect x={x1} y={y1} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={2} />
      {[[x1,y1,x1+off,y1-off],[x1+bw,y1,x1+bw+off,y1-off],[x1,y1+bh,x1+off,y1+bh-off]].map(([ax,ay,bx,by],i)=>{
        const p=Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1.5}/>;
      })}
    </Canvas>
  );
}

export function RectTubePreview() {
  const w = 110, h = 100, rw = 90, rh = 68, t = 14, x = 10, y = 16;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x} y={y} width={rw} height={rh}><RectShade x={x} y={y} width={rw} height={rh} /></Rect>
      <Rect x={x} y={y} width={rw} height={rh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={x+t} y={y+t} width={rw-t*2} height={rh-t*2}><HoleShadeRect x={x+t} y={y+t} width={rw-t*2} height={rh-t*2} /></Rect>
      <Rect x={x+t} y={y+t} width={rw-t*2} height={rh-t*2} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function SheetPreview() {
  const w = 110, h = 100, sw = 88, sh = 20, off = 16, x1 = 6, y1 = 42;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1+off} y={y1-off} width={sw} height={sh}><RectShade x={x1+off} y={y1-off} width={sw} height={sh} dark /></Rect>
      <Rect x={x1+off} y={y1-off} width={sw} height={sh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={sw} height={sh}><RectShade x={x1} y={y1} width={sw} height={sh} /></Rect>
      <Rect x={x1} y={y1} width={sw} height={sh} color={STROKE} style="stroke" strokeWidth={2} />
      {[[x1,y1,x1+off,y1-off],[x1+sw,y1,x1+sw+off,y1-off],[x1,y1+sh,x1+off,y1+sh-off],[x1+sw,y1+sh,x1+sw+off,y1+sh-off]].map(([ax,ay,bx,by],i)=>{
        const p=Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1.5}/>;
      })}
    </Canvas>
  );
}

export function OctagonBarPreview() {
  const w = 110, h = 100, cx = 55, cy = 46, r = 40;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={octPath(cx, cy, r)}><PathShade path={octPath(cx, cy, r)} /></Path>
      <Path path={octPath(cx, cy, r)} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function HalfRoundPreview() {
  const w = 110, h = 100, r = 42, cx = 55, cy = 58;
  const arc = Skia.Path.Make();
  arc.moveTo(cx - r, cy);
  arc.arcToOval({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, 180, -180, false);
  arc.lineTo(cx - r, cy);
  arc.close();
  const flat = Skia.Path.Make();
  flat.moveTo(cx - r, cy); flat.lineTo(cx + r, cy);
  // dashed diameter line
  const diam = Skia.Path.Make();
  diam.moveTo(cx - r + 4, cy); diam.lineTo(cx + r - 4, cy);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={arc}><PathShade path={arc} /></Path>
      <Path path={arc} color={STROKE} style="stroke" strokeWidth={2} />
      <Path path={diam} color={STROKE} style="stroke" strokeWidth={1}
        strokeDash={{ intervals: [5, 4], phase: 0 }} opacity={0.5} />
    </Canvas>
  );
}

export function ZSectionPreview() {
  const w = 110, h = 100;
  const t = 14, fw = 54;
  const fy1 = 8, fy2 = 78;
  const wx = (w - t) / 2; // 48 — same center-web position as before
  const path = zSectionOutline(wx, fy1, fy2, t, fw);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function SpherePreview() {
  const cx = 55, cy = 46, r = 40;
  const ovalH = Skia.Path.Make();
  ovalH.addOval({ x: cx - r, y: cy - r * 0.3, width: r * 2, height: r * 0.6 });
  const ovalV = Skia.Path.Make();
  ovalV.addOval({ x: cx - r * 0.3, y: cy - r, width: r * 0.6, height: r * 2 });
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <Circle cx={cx} cy={cy} r={r}><RadialShade cx={cx} cy={cy} r={r} /></Circle>
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={2} />
      <Path path={ovalH} color={STROKE} style="stroke" strokeWidth={1.2} opacity={0.55} />
      <Path path={ovalV} color={STROKE} style="stroke" strokeWidth={1.2} opacity={0.55} />
    </Canvas>
  );
}

export function OvalPreview() {
  const path = Skia.Path.Make();
  path.addOval({ x: 10, y: 26, width: 90, height: 40 });
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function CrSquarePreview() {
  const s = 68, x = (110 - s) / 2, y = (100 - s) / 2, r = 14;
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <RoundedRect x={x} y={y} width={s} height={s} r={r}><RectShade x={x} y={y} width={s} height={s} /></RoundedRect>
      <RoundedRect x={x} y={y} width={s} height={s} r={r} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function CrRectPreview() {
  const w = 84, h = 56, x = (110 - w) / 2, y = (100 - h) / 2, r = 14;
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <RoundedRect x={x} y={y} width={w} height={h} r={r}><RectShade x={x} y={y} width={w} height={h} /></RoundedRect>
      <RoundedRect x={x} y={y} width={w} height={h} r={r} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function TrianglePreview() {
  const path = outlinePath([[55, 12], [98, 88], [12, 88]]);
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function TrapezoidPreview() {
  const path = outlinePath([[38, 14], [72, 14], [92, 86], [18, 86]]);
  return (
    <Canvas style={{ width: 110, height: 100 }}>
      <Path path={path}><PathShade path={path} /></Path>
      <Path path={path} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}


export const SHAPE_ICONS = {
  hexagon:   HexagonIcon,
  roundbar:  RoundBarIcon,
  roundtube: RoundTubeIcon,
  squarebar: SquareBarIcon,
  squaretube:SquareTubeIcon,
  tbar:      TBarIcon,
  beams:     BeamsIcon,
  channel:   ChannelIcon,
  flatbar:   FlatBarIcon,
  angle:     AngleIcon,
  rectbar:    RectBarIcon,
  recttube:   RectTubeIcon,
  sheet:      SheetIcon,
  octagonbar: OctagonBarIcon,
  halfround:  HalfRoundIcon,
  zsection:   ZSectionIcon,
  sphere:     SphereIcon,
  oval:       OvalIcon,
  crsquare:   CrSquareIcon,
  crrect:     CrRectIcon,
  triangle:   TriangleIcon,
  trapezoid:  TrapezoidIcon,
};

export const SHAPE_PREVIEWS = {
  hexagon:   HexagonPreview,
  roundbar:  RoundBarPreview,
  roundtube: RoundTubePreview,
  squarebar: SquareBarPreview,
  squaretube:SquareTubePreview,
  tbar:      TBarPreview,
  beams:     BeamsPreview,
  channel:   ChannelPreview,
  flatbar:   FlatBarPreview,
  angle:     AnglePreview,
  rectbar:    RectBarPreview,
  recttube:   RectTubePreview,
  sheet:      SheetPreview,
  octagonbar: OctagonBarPreview,
  halfround:  HalfRoundPreview,
  zsection:   ZSectionPreview,
  sphere:     SpherePreview,
  oval:       OvalPreview,
  crsquare:   CrSquarePreview,
  crrect:     CrRectPreview,
  triangle:   TrianglePreview,
  trapezoid:  TrapezoidPreview,
};