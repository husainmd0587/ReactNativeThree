import React from 'react';
import {
  Canvas,
  Circle,
  Rect,
  RoundedRect,
  Path,
  Skia,
  Paint,
} from '@shopify/react-native-skia';

const FILL   = '#90E0EF';
const STROKE = '#0077B6';
const FILL2  = '#C0E8F4';
const WHITE  = '#FFFFFF';

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

// ─────────────────────────────────────────────────────────────────────────────
//  GRID THUMBNAILS  (small, 56×44)
// ─────────────────────────────────────────────────────────────────────────────

export function HexagonIcon({ size = 56 }) {
  const cx = size / 2, cy = size * 0.45, r = size * 0.38;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={hexPath(cx, cy, r)} color={FILL} />
      <Path path={hexPath(cx, cy, r)} color={STROKE} style="stroke" strokeWidth={1.5} />
    </Canvas>
  );
}

export function RoundBarIcon({ size = 56 }) {
  const w = size * 0.78, h = size * 0.55, x = (size - w) / 2, y = (size - h) / 2;
  const rx = h / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <RoundedRect x={x} y={y} width={w} height={h} r={rx} color={FILL} />
      <RoundedRect x={x} y={y} width={w} height={h} r={rx} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Circle cx={x + rx} cy={y + h / 2} r={rx * 0.55} color={FILL2} />
      <Circle cx={x + rx} cy={y + h / 2} r={rx * 0.55} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function RoundTubeIcon({ size = 56 }) {
  const r = size * 0.38, ri = size * 0.22, cx = size / 2, cy = size / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={cx} cy={cy} r={r} color={FILL} />
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={ri} color={WHITE} />
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
      <Rect x={x1 + off} y={y1 - off} width={s2} height={s2} color={FILL2} />
      <Rect x={x1 + off} y={y1 - off} width={s2} height={s2} color={STROKE} style="stroke" strokeWidth={1} />
      {/* front face */}
      <Rect x={x1} y={y1} width={s1} height={s1} color={FILL} />
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
      <Rect x={x} y={y} width={s} height={s} color={FILL} />
      <Rect x={x} y={y} width={s} height={s} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x + t} y={y + t} width={s - t * 2} height={s - t * 2} color={WHITE} />
      <Rect x={x + t} y={y + t} width={s - t * 2} height={s - t * 2} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function TBarIcon({ size = 56 }) {
  const fw = size * 0.84, fh = size * 0.2, fx = (size - fw) / 2, fy = size * 0.12;
  const ww = size * 0.22, wh = size * 0.56, wx = (size - ww) / 2, wy = fy + fh;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={fx} y={fy} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={FILL} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function BeamsIcon({ size = 56 }) {
  const fw = size * 0.84, fh = size * 0.16, fx = (size - fw) / 2;
  const fy1 = size * 0.1, fy2 = size * 0.74;
  const ww = size * 0.18, wh = size * 0.48, wx = (size - ww) / 2, wy = fy1 + fh;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={fx} y={fy1} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy1} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={fx} y={fy2} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy2} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={FILL} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function ChannelIcon({ size = 56 }) {
  const wt = size * 0.18, h = size * 0.76, fy = size * 0.12;
  const fw = size * 0.54, fh = size * 0.18, fx = size * 0.26;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={size * 0.1} y={fy} width={wt} height={h} color={FILL} />
      <Rect x={size * 0.1} y={fy} width={wt} height={h} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={fx} y={fy + h - fh} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy + h - fh} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={1.2} />
    </Canvas>
  );
}

export function FlatBarIcon({ size = 56 }) {
  const w = size * 0.68, h = size * 0.3, off = size * 0.18;
  const x1 = size * 0.08, y1 = size * 0.38;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={FILL2} />
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      <Rect x={x1} y={y1} width={w} height={h} color={FILL} />
      <Rect x={x1} y={y1} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      {[[x1,y1,x1+off,y1-off],[x1+w,y1,x1+w+off,y1-off],[x1,y1+h,x1+off,y1+h-off]].map(([ax,ay,bx,by], i) => {
        const p = Skia.Path.Make(); p.moveTo(ax,ay); p.lineTo(bx,by);
        return <Path key={i} path={p} color={STROKE} style="stroke" strokeWidth={1} />;
      })}
    </Canvas>
  );
}

export function AngleIcon({ size = 56 }) {
  const t = size * 0.2, h = size * 0.72, w = size * 0.62, y0 = size * 0.12;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={size * 0.1} y={y0} width={t} height={h} color={FILL} />
      <Rect x={size * 0.1} y={y0} width={t} height={h} color={STROKE} style="stroke" strokeWidth={1.2} />
      <Rect x={size * 0.1 + t} y={y0 + h - t} width={w} height={t} color={FILL} />
      <Rect x={size * 0.1 + t} y={y0 + h - t} width={w} height={t} color={STROKE} style="stroke" strokeWidth={1.2} />
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
      <Path path={path} color={FILL} />
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
      <Circle cx={cx} cy={cy} r={r} color={FILL} />
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={ri} color={FILL2} />
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={1}
        strokeDash={{ intervals: [4, 3], phase: 0 }} opacity={0.5} />
    </Canvas>
  );
}

export function RoundTubePreview() {
  const w = 110, h = 100, cx = 55, cy = 46, r = 40, ri = 22;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Circle cx={cx} cy={cy} r={r} color={FILL} />
      <Circle cx={cx} cy={cy} r={r} color={STROKE} style="stroke" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={ri} color={WHITE} />
      <Circle cx={cx} cy={cy} r={ri} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function SquareBarPreview() {
  const w = 110, h = 100, s = 56, off = 20, x1 = 8, y1 = 26;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1 + off} y={y1 - off} width={s} height={s} color={FILL2} />
      <Rect x={x1 + off} y={y1 - off} width={s} height={s} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={s} height={s} color={FILL} />
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
      <Rect x={x} y={y} width={s} height={s} color={FILL} />
      <Rect x={x} y={y} width={s} height={s} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={x+t} y={y+t} width={s-t*2} height={s-t*2} color={WHITE} />
      <Rect x={x+t} y={y+t} width={s-t*2} height={s-t*2} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function TBarPreview() {
  const w = 110, h = 100, fw = 94, fh = 16, fx = 8, fy = 8, ww = 22, wh = 60, wx = 44, wy = 24;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={fx} y={fy} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={FILL} />
      <Rect x={wx} y={wy} width={ww} height={wh} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function BeamsPreview() {
  const w = 110, h = 100, fw = 94, fh = 14, fx = 8;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={fx} y={6}  width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={6}  width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={fx} y={78} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={78} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={44} y={20} width={22} height={58} color={FILL} />
      <Rect x={44} y={20} width={22} height={58} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function ChannelPreview() {
  const w = 110, h = 100, wt = 18, ht = 76, fy = 12, fw = 60, fh = 14, fx = 26;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={8}  y={fy} width={wt} height={ht} color={FILL} />
      <Rect x={8}  y={fy} width={wt} height={ht} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={fx} y={fy+ht-fh} width={fw} height={fh} color={FILL} />
      <Rect x={fx} y={fy+ht-fh} width={fw} height={fh} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function FlatBarPreview() {
  const w = 110, h = 100, bw = 72, bh = 28, off = 18, x1 = 8, y1 = 36;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={FILL2} />
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={bw} height={bh} color={FILL} />
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
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={8}   y={y0}       width={t}  height={ht} color={FILL} />
      <Rect x={8}   y={y0}       width={t}  height={ht} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={8+t} y={y0+ht-t} width={bw} height={t}  color={FILL} />
      <Rect x={8+t} y={y0+ht-t} width={bw} height={t}  color={STROKE} style="stroke" strokeWidth={2} />
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
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={FILL2} />
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      {/* front face */}
      <Rect x={x1} y={y1} width={w} height={h} color={FILL} />
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
      <Rect x={x} y={y} width={w} height={h} color={FILL} />
      <Rect x={x} y={y} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x + t} y={y + t} width={w - t * 2} height={h - t * 2} color={WHITE} />
      <Rect x={x + t} y={y + t} width={w - t * 2} height={h - t * 2} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function SheetIcon({ size = 56 }) {
  const w = size * 0.8, h = size * 0.22, off = size * 0.14;
  const x1 = size * 0.06, y1 = size * 0.42;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={FILL2} />
      <Rect x={x1 + off} y={y1 - off} width={w} height={h} color={STROKE} style="stroke" strokeWidth={1} />
      <Rect x={x1} y={y1} width={w} height={h} color={FILL} />
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
      <Path path={octPath(cx, cy, r)} color={FILL} />
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
      <Path path={arc} color={FILL} />
      <Path path={arc} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Path path={flat} color={STROKE} style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

export function ZSectionIcon({ size = 56 }) {
  // Z shape: top-right flange, diagonal web, bottom-left flange
  const t = size * 0.18;
  const fw = size * 0.52;
  const fy1 = size * 0.12, fy2 = size * 0.7;
  const fx1 = size * 0.42, fx2 = size * 0.06; // top flange starts right, bottom starts left
  return (
    <Canvas style={{ width: size, height: size }}>
      {/* top flange */}
      <Rect x={fx1} y={fy1} width={fw} height={t} color={FILL} />
      <Rect x={fx1} y={fy1} width={fw} height={t} color={STROKE} style="stroke" strokeWidth={1.2} />
      {/* web - diagonal-ish (rendered as a rect at slight offset) */}
      <Rect x={(size - t) / 2} y={fy1 + t} width={t} height={fy2 - fy1 - t} color={FILL} />
      <Rect x={(size - t) / 2} y={fy1 + t} width={t} height={fy2 - fy1 - t} color={STROKE} style="stroke" strokeWidth={1.2} />
      {/* bottom flange */}
      <Rect x={fx2} y={fy2} width={fw} height={t} color={FILL} />
      <Rect x={fx2} y={fy2} width={fw} height={t} color={STROKE} style="stroke" strokeWidth={1.2} />
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
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={FILL2} />
      <Rect x={x1+off} y={y1-off} width={bw} height={bh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={bw} height={bh} color={FILL} />
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
      <Rect x={x} y={y} width={rw} height={rh} color={FILL} />
      <Rect x={x} y={y} width={rw} height={rh} color={STROKE} style="stroke" strokeWidth={2} />
      <Rect x={x+t} y={y+t} width={rw-t*2} height={rh-t*2} color={WHITE} />
      <Rect x={x+t} y={y+t} width={rw-t*2} height={rh-t*2} color={STROKE} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

export function SheetPreview() {
  const w = 110, h = 100, sw = 88, sh = 20, off = 16, x1 = 6, y1 = 42;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={x1+off} y={y1-off} width={sw} height={sh} color={FILL2} />
      <Rect x={x1+off} y={y1-off} width={sw} height={sh} color={STROKE} style="stroke" strokeWidth={1.5} />
      <Rect x={x1} y={y1} width={sw} height={sh} color={FILL} />
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
      <Path path={octPath(cx, cy, r)} color={FILL} />
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
      <Path path={arc} color={FILL} />
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
  const fx1 = 50, fx2 = 6;
  const webH = fy2 - fy1 - t;
  const wx = (w - t) / 2;
  return (
    <Canvas style={{ width: w, height: h }}>
      {/* top-right flange */}
      <Rect x={fx1} y={fy1} width={fw} height={t} color={FILL} />
      <Rect x={fx1} y={fy1} width={fw} height={t} color={STROKE} style="stroke" strokeWidth={2} />
      {/* web */}
      <Rect x={wx} y={fy1+t} width={t} height={webH} color={FILL} />
      <Rect x={wx} y={fy1+t} width={t} height={webH} color={STROKE} style="stroke" strokeWidth={2} />
      {/* bottom-left flange */}
      <Rect x={fx2} y={fy2} width={fw} height={t} color={FILL} />
      <Rect x={fx2} y={fy2} width={fw} height={t} color={STROKE} style="stroke" strokeWidth={2} />
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
};