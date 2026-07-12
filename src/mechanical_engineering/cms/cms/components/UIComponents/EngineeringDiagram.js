import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Shape2D from './Shape2D';

const C = { dBg: '#FAFAF7', dObject: '#1A1814', dDim: '#B86A00', dExt: '#6A6660' };

// Overlay label — mirrors the original DimLabel pattern (RN Text over Canvas)
const DimLabel = ({ x, y, label, rotate = 0, bg = true }) => (
  <View pointerEvents="none" style={[styles.label, { left: x, top: y, transform: rotate ? [{ rotate: `${rotate}deg` }] : [] }]}>
    <Text style={[styles.labelText, bg && styles.labelBg]}>{label}</Text>
  </View>
);

// ── Generators — each returns { height, shapes, labels } for a given width ──

function buildFundamentals(w) {
  const h = 195, px = 30, py = 44, pw = w - 68, ph = 76;
  const stepX = px + pw * 0.56, stepY = py + ph * 0.44;
  const dY = py + ph + 34, dX = px + pw + 34, extGap = 4;
  const ext1x = px, ext2x = px + pw;
  const lx1 = stepX + 10, ly1 = stepY - 4, lx2 = lx1 + 26, ly2 = ly1 - 22;
  const overallW = Math.round((pw / w) * 160);
  const overallH = Math.round((ph / h) * 100);
  const stepW = Math.round(((px + pw - stepX) / w) * 160);

  const shapes = [
    { kind: 'path', d: `M${px} ${py} L${px+pw} ${py} L${px+pw} ${stepY} L${stepX} ${stepY} L${stepX} ${py+ph} L${px} ${py+ph} Z`, color: C.dObject, strokeWidth: 2 },
    // overall width dim
    { kind: 'line', x1: ext1x, y1: py+ph+extGap, x2: ext1x, y2: dY+6, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: ext2x, y1: py+ph+extGap, x2: ext2x, y2: dY+6, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: ext2x, y1: dY, x2: ext1x, y2: dY, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: ext1x, y1: dY, x2: ext2x, y2: dY, color: C.dDim, strokeWidth: 1.2 },
    // height dim
    { kind: 'line', x1: ext2x+extGap, y1: py, x2: dX+6, y2: py, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: ext2x+extGap, y1: py+ph, x2: dX+6, y2: py+ph, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: dX, y1: py+ph, x2: dX, y2: py, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: dX, y1: py, x2: dX, y2: py+ph, color: C.dDim, strokeWidth: 1.2 },
    // step width dim
    { kind: 'line', x1: stepX, y1: stepY-extGap, x2: stepX, y2: stepY-22, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: px+pw, y1: stepY-extGap, x2: px+pw, y2: stepY-22, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: px+pw, y1: stepY-16, x2: stepX, y2: stepY-16, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: stepX, y1: stepY-16, x2: px+pw, y2: stepY-16, color: C.dDim, strokeWidth: 1.2 },
    // leader
    { kind: 'path', d: `M${lx1} ${ly1} L${lx2} ${ly2} L${lx2+26} ${ly2}`, color: C.dDim, strokeWidth: 1 },
  ];

  const labels = [
    { x: (ext1x + ext2x) / 2 - 14, y: dY - 10, text: `${overallW}` },
    { x: dX + 4, y: (py + py+ph) / 2 - 6, text: `${overallH}`, rotate: -90 },
    { x: (stepX + px+pw) / 2 - 10, y: stepY - 28, text: `${stepW}` },
    { x: lx2 + 4, y: ly2 - 8, text: 'STEP', bg: false },
  ];
  return { height: h, shapes, labels };
}

function buildSystems(w) {
  const h = 168, col = w / 2 - 8, cBase = 16, cy = 78;
  const pts1 = [cBase, cBase + (col-cBase)*0.33, cBase + (col-cBase)*0.66, col-4];
  const dimY = cy + 30, chainVals = ['30', '30', '40'];
  const bx0 = col + 20;
  const bPts = [bx0, bx0 + (col-20)*0.32, bx0 + (col-20)*0.62, bx0 + (col-20)];
  const bBase = 52;
  const bDimYs = [bBase + 26, bBase + 40, bBase + 54];
  const baseVals = ['32', '62', '100'];

  const shapes = [
    { kind: 'line', x1: pts1[0], y1: cy, x2: pts1[3], y2: cy, color: C.dObject, strokeWidth: 1.8 },
    ...pts1.map((x) => ({ kind: 'line', x1: x, y1: cy-10, x2: x, y2: cy, color: C.dObject, strokeWidth: 1.4 })),
    ...[[pts1[0],pts1[1]],[pts1[1],pts1[2]],[pts1[2],pts1[3]]].flatMap(([x1,x2]) => ([
      { kind: 'line', x1, y1: cy, x2: x1, y2: dimY+4, color: C.dExt, strokeWidth: 0.7 },
      { kind: 'line', x1: x2, y1: cy, x2, y2: dimY+4, color: C.dExt, strokeWidth: 0.7 },
      { kind: 'arrow', x1: x2, y1: dimY, x2: x1, y2: dimY, color: C.dDim, strokeWidth: 1 },
      { kind: 'arrow', x1, y1: dimY, x2, y2: dimY, color: C.dDim, strokeWidth: 1 },
    ])),
    { kind: 'line', x1: bPts[0], y1: bBase, x2: bPts[3], y2: bBase, color: C.dObject, strokeWidth: 1.8 },
    ...bPts.map((x) => ({ kind: 'line', x1: x, y1: bBase-10, x2: x, y2: bBase, color: C.dObject, strokeWidth: 1.4 })),
    ...[1,2,3].flatMap((pi, i) => ([
      { kind: 'line', x1: bPts[pi], y1: bBase, x2: bPts[pi], y2: bDimYs[i]+4, color: C.dExt, strokeWidth: 0.7 },
      { kind: 'arrow', x1: bPts[0], y1: bDimYs[i], x2: bPts[pi], y2: bDimYs[i], color: C.dDim, strokeWidth: 1 },
      { kind: 'arrow', x1: bPts[pi], y1: bDimYs[i], x2: bPts[0], y2: bDimYs[i], color: C.dDim, strokeWidth: 1 },
    ])),
    { kind: 'line', x1: bPts[0], y1: bBase, x2: bPts[0], y2: bDimYs[2]+4, color: C.dExt, strokeWidth: 0.7 },
    { kind: 'line', x1: col+2, y1: 8, x2: col+2, y2: h-8, color: '#D4D0C8', strokeWidth: 1 },
  ];

  const labels = [
    ...chainVals.map((v, i) => ({ x: (pts1[i] + pts1[i+1]) / 2 - 8, y: dimY - 11, text: v })),
    { x: col*0.3, y: 4, text: 'CHAIN', bg: false },
    ...baseVals.map((v, i) => ({ x: (bPts[0] + bPts[i+1]) / 2 - 8, y: bDimYs[i] - 11, text: v })),
    { x: bPts[0] + (bPts[3]-bPts[0])*0.3, y: 4, text: 'BASELINE', bg: false },
  ];
  return { height: h, shapes, labels };
}

function buildRules(w) {
  const h = 152, fx = 22, fy = 28, fw = 92, fh = 70;
  const tx = fx, ty = fy - 38, tw = fw, th = 22;
  const dimY = fy + fh + 28, dimX = fx + fw + 28, dimTY = ty - 16;

  const shapes = [
    { kind: 'rect', x: fx, y: fy, w: fw, h: fh, color: C.dObject, strokeWidth: 1.8 },
    { kind: 'rect', x: tx, y: ty, w: tw, h: th, color: C.dObject, strokeWidth: 1.8 },
    { kind: 'line', x1: fx, y1: fy+fh+4, x2: fx, y2: dimY+5, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: fx+fw, y1: fy+fh+4, x2: fx+fw, y2: dimY+5, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: fx+fw, y1: dimY, x2: fx, y2: dimY, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: fx, y1: dimY, x2: fx+fw, y2: dimY, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'line', x1: fx+fw+4, y1: fy, x2: dimX+5, y2: fy, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: fx+fw+4, y1: fy+fh, x2: dimX+5, y2: fy+fh, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: dimX, y1: fy+fh, x2: dimX, y2: fy, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: dimX, y1: fy, x2: dimX, y2: fy+fh, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'line', x1: tx, y1: ty-4, x2: tx, y2: dimTY-4, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: tx+tw, y1: ty-4, x2: tx+tw, y2: dimTY-4, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: tx+tw, y1: dimTY, x2: tx, y2: dimTY, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: tx, y1: dimTY, x2: tx+tw, y2: dimTY, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'line', x1: fx+fw*0.18, y1: ty+th, x2: fx+fw*0.18, y2: fy, color: C.dExt, strokeWidth: 0.6 },
    { kind: 'line', x1: fx+fw*0.82, y1: ty+th, x2: fx+fw*0.82, y2: fy, color: C.dExt, strokeWidth: 0.6 },
    { kind: 'path', d: `M${fx-12} ${fy+fh/2} L${fx-2} ${fy+fh/2-6} L${fx-2} ${fy+fh/2+6} Z`, color: '#B86A00', filled: true },
  ];

  const labels = [
    { x: (fx + fx+fw)/2 - 10, y: dimY - 10, text: '92' },
    { x: dimX + 4, y: (fy + fy+fh)/2 - 6, text: '70', rotate: -90 },
    { x: (tx + tx+tw)/2 - 10, y: dimTY - 10, text: '92' },
    { x: fx + fw/2 - 14, y: fy + fh + 6, text: 'FRONT', bg: false },
    { x: tx + tw/2 - 10, y: ty + th/2 - 5, text: 'TOP', bg: false },
  ];
  return { height: h, shapes, labels };
}

function buildTypes(w) {
  const h = 188, cx = w * 0.27, cy = h / 2 + 4, r = 50;
  const dx1 = cx - r, dx2 = cx + r, rAngle = -Math.PI / 4;
  const rx2 = cx + r * Math.cos(rAngle), ry2 = cy + r * Math.sin(rAngle);
  const aCx = w * 0.75, aCy = h * 0.56, aLen = 52, a2 = -Math.PI / 3;
  const ax2e = aCx + aLen * Math.cos(a2), ay2e = aCy + aLen * Math.sin(a2);
  const arcR = 26;
  const rMidX = cx + (r/2) * Math.cos(rAngle), rMidY = cy + (r/2) * Math.sin(rAngle);
  const arcMidAngle = a2 / 2;
  const arcLabelX = aCx + (arcR + 12) * Math.cos(arcMidAngle);
  const arcLabelY = aCy + (arcR + 12) * Math.sin(arcMidAngle);

  const shapes = [
    { kind: 'circle', cx, cy, r, color: C.dObject, strokeWidth: 2 },
    { kind: 'line', x1: cx-8, y1: cy, x2: cx+8, y2: cy, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: cx, y1: cy-8, x2: cx, y2: cy+8, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: dx2, y1: cy, x2: dx1, y2: cy, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: dx1, y1: cy, x2: dx2, y2: cy, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'arrow', x1: cx, y1: cy, x2: rx2, y2: ry2, color: C.dDim, strokeWidth: 1.2 },
    { kind: 'line', x1: w*0.53, y1: 10, x2: w*0.53, y2: h-10, color: '#D4D0C8', strokeWidth: 1 },
    { kind: 'line', x1: aCx, y1: aCy, x2: aCx+aLen, y2: aCy, color: C.dObject, strokeWidth: 1.8 },
    { kind: 'line', x1: aCx, y1: aCy, x2: ax2e, y2: ay2e, color: C.dObject, strokeWidth: 1.8 },
    { kind: 'path', d: `M${aCx+arcR} ${aCy} A${arcR} ${arcR} 0 0 1 ${aCx+arcR*Math.cos(a2)} ${aCy+arcR*Math.sin(a2)}`, color: C.dDim, strokeWidth: 1.2 },
  ];

  const labels = [
    { x: cx - 14, y: cy - 20, text: '⌀50' },
    { x: rMidX - 2, y: rMidY - 14, text: 'R25' },
    { x: arcLabelX - 8, y: arcLabelY - 6, text: '60°' },
    { x: cx - 28, y: 10, text: 'DIAMETER / RADIUS', bg: false },
    { x: w*0.58, y: 10, text: 'ANGULAR', bg: false },
  ];
  return { height: h, shapes, labels };
}

function buildSpecial(w) {
  const h = 168, px = 18, py = 32, pw = w - 36, ph = 88;
  const csX = px + pw*0.27, csTopW = 20, csDepth = 26;
  const cbX = px + pw*0.65, cbTopW = 22, cbBotW = 10, cbDepth = 38, cbBotDepth = 16;
  const cfSize = 14;
  const csLx1 = csX + csTopW, csLy1 = py, csLx2 = csLx1 + 16, csLy2 = csLy1 - 18;
  const cfLx1 = px + pw - cfSize + 5, cfLy1 = py + 5, cfLx2 = cfLx1 + 14, cfLy2 = cfLy1 - 16;
  const cbDimX = cbX + cbTopW + 14;

  const outline = [
    `M${px} ${py}`, `L${px+pw-cfSize} ${py}`, `L${px+pw} ${py+cfSize}`, `L${px+pw} ${py+ph}`, `L${px} ${py+ph}`, 'Z',
    `M${csX-csTopW} ${py}`, `L${csX} ${py+csDepth}`, `L${csX+csTopW} ${py}`,
    `M${cbX-cbTopW} ${py}`, `L${cbX-cbTopW} ${py+cbBotDepth}`, `L${cbX-cbBotW} ${py+cbBotDepth}`,
    `L${cbX-cbBotW} ${py+cbDepth}`, `L${cbX+cbBotW} ${py+cbDepth}`, `L${cbX+cbBotW} ${py+cbBotDepth}`,
    `L${cbX+cbTopW} ${py+cbBotDepth}`, `L${cbX+cbTopW} ${py}`,
  ].join(' ');

  const shapes = [
    { kind: 'path', d: outline, color: C.dObject, strokeWidth: 1.8 },
    { kind: 'path', d: `M${cfLx1} ${cfLy1} L${cfLx2} ${cfLy2} L${cfLx2+28} ${cfLy2}`, color: C.dDim, strokeWidth: 1 },
    { kind: 'path', d: `M${csLx1} ${csLy1} L${csLx2} ${csLy2} L${csLx2+26} ${csLy2}`, color: C.dDim, strokeWidth: 1 },
    { kind: 'line', x1: cbX+cbTopW+3, y1: py, x2: cbDimX+5, y2: py, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: cbX+cbTopW+3, y1: py+cbDepth, x2: cbDimX+5, y2: py+cbDepth, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: cbDimX, y1: py+cbDepth, x2: cbDimX, y2: py, color: C.dDim, strokeWidth: 1.1 },
    { kind: 'arrow', x1: cbDimX, y1: py, x2: cbDimX, y2: py+cbDepth, color: C.dDim, strokeWidth: 1.1 },
    { kind: 'line', x1: cbX-cbBotW, y1: py+cbDepth+4, x2: cbX-cbBotW, y2: py+cbDepth+18, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'line', x1: cbX+cbBotW, y1: py+cbDepth+4, x2: cbX+cbBotW, y2: py+cbDepth+18, color: C.dExt, strokeWidth: 0.8 },
    { kind: 'arrow', x1: cbX+cbBotW, y1: py+cbDepth+12, x2: cbX-cbBotW, y2: py+cbDepth+12, color: C.dDim, strokeWidth: 1.1 },
    { kind: 'arrow', x1: cbX-cbBotW, y1: py+cbDepth+12, x2: cbX+cbBotW, y2: py+cbDepth+12, color: C.dDim, strokeWidth: 1.1 },
  ];

  const labels = [
    { x: cfLx2 + 4, y: cfLy2 - 9, text: '2×45°', bg: false },
    { x: csLx2 + 2, y: csLy2 - 9, text: '⌀18 ⌵90°', bg: false },
    { x: cbDimX + 4, y: (py + py+cbDepth)/2 - 6, text: '38', rotate: -90 },
    { x: cbX - 8, y: py+cbDepth+14, text: '⌴⌀20' },
  ];
  return { height: h, shapes, labels };
}

const BUILDERS = {
  fundamentals: buildFundamentals,
  systems: buildSystems,
  rules: buildRules,
  types: buildTypes,
  special: buildSpecial,
};

/**
 * EngineeringDiagram
 * Props: title, diagramType ('fundamentals'|'systems'|'rules'|'types'|'special'), width
 */
const EngineeringDiagram = ({ title, diagramType, width = 320 }) => {
  const build = BUILDERS[diagramType];
  if (!build) return null;
  const { height, shapes, labels } = build(width);

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={[styles.canvasWrap, { width, height }]}>
        <Shape2D width={width} height={height} shapes={shapes} backgroundColor={C.dBg} />
        {labels.map((l, i) => (
          <DimLabel key={i} {...l} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginVertical: 10, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#D4D0C8', alignSelf: 'flex-start' },
  title: { fontSize: 11, fontWeight: '700', color: '#4A4640', letterSpacing: 1, padding: 8, backgroundColor: '#ECEAE4' },
  canvasWrap: { backgroundColor: C.dBg },
  label: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 9, fontWeight: '700', color: '#B86A00', fontFamily: 'monospace', letterSpacing: 0.3 },
  labelBg: { backgroundColor: '#FAFAF7', paddingHorizontal: 2 },
});

export default EngineeringDiagram;