import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { SHAPE_PREVIEWS } from './shapeIcon';

// Preview canvases are 110×100 — every coordinate below is in that same
// space, so the dimension lines line up exactly with the shape artwork.
const W = 110, H = 100;

// ── AutoCAD-style dimension line: extension ticks + arrowheads at both ends ──
// Works at any angle — horizontal, vertical, or diagonal (used for the
// isometric-style Length line below) — via plain vector math instead of
// separate horizontal/vertical cases.
function spanPath(x1, y1, x2, y2) {
  const p = Skia.Path.Make();
  const tick = 5, arrow = 7, spread = 0.4;

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;   // unit vector along the line
  const px = -uy, py = ux;              // perpendicular unit vector

  // extension ticks at each end
  p.moveTo(x1 - px * tick, y1 - py * tick); p.lineTo(x1 + px * tick, y1 + py * tick);
  p.moveTo(x2 - px * tick, y2 - py * tick); p.lineTo(x2 + px * tick, y2 + py * tick);
  // the dimension line itself
  p.moveTo(x1, y1); p.lineTo(x2, y2);

  // arrowhead at x1, pointing back along -u (i.e. toward x2 side visually reversed)
  const a1x = Math.cos(spread), a1y = Math.sin(spread);
  const ang = Math.atan2(uy, ux);
  const mkArrow = (px0, py0, dir) => {
    const baseAng = dir > 0 ? ang : ang + Math.PI;
    p.moveTo(px0, py0);
    p.lineTo(px0 + arrow * Math.cos(baseAng + spread), py0 + arrow * Math.sin(baseAng + spread));
    p.moveTo(px0, py0);
    p.lineTo(px0 + arrow * Math.cos(baseAng - spread), py0 + arrow * Math.sin(baseAng - spread));
  };
  mkArrow(x1, y1, 1);
  mkArrow(x2, y2, -1);

  return p;
}

// ── Leader/callout line: single arrowhead at the shape end, plain at the label end ──
// Used for thickness-type dims (T, TW, TF) where a full span would be too
// cramped at this size — same idea as a CAD leader note.
function leaderPath(x1, y1, x2, y2) {
  const p = Skia.Path.Make();
  p.moveTo(x1, y1); p.lineTo(x2, y2);
  const ang = Math.atan2(y1 - y2, x1 - x2);
  const ah = 6;
  p.moveTo(x1, y1); p.lineTo(x1 - ah * Math.cos(ang - 0.4), y1 - ah * Math.sin(ang - 0.4));
  p.moveTo(x1, y1); p.lineTo(x1 - ah * Math.cos(ang + 0.4), y1 - ah * Math.sin(ang + 0.4));
  return p;
}

// Per-shape cross-section dimension layouts (the 'length' axis is added
// automatically below for any shape that has one, as a bottom span, so it
// doesn't need to be repeated here).
const DIM_LAYOUTS = {
  hexagon:   [{ dimId: 'A', kind: 'span', x1: 15, y1: 46, x2: 95, y2: 46 }],
  roundbar:  [{ dimId: 'D', kind: 'span', x1: 15, y1: 46, x2: 95, y2: 46 }],
  roundtube: [
    { dimId: 'D', kind: 'span',   x1: 15, y1: 46, x2: 95, y2: 46 },
    { dimId: 'T', kind: 'leader', x1: 77, y1: 24, x2: 102, y2: 10 },
  ],
  squarebar: [{ dimId: 'A', kind: 'span', x1: 64, y1: 26, x2: 64, y2: 82 }],
  squaretube: [
    { dimId: 'A', kind: 'span',   x1: 15, y1: 8, x2: 95, y2: 8 },
    { dimId: 'T', kind: 'leader', x1: 24, y1: 19, x2: 4, y2: 4 },
  ],
  tbar: [
    { dimId: 'W',  kind: 'span',   x1: 8,  y1: 4,  x2: 102, y2: 4 },
    { dimId: 'H',  kind: 'span',   x1: 106, y1: 8, x2: 106, y2: 84 },
    { dimId: 'TF', kind: 'leader', x1: 55, y1: 12, x2: 55,  y2: 97 },
    { dimId: 'TW', kind: 'leader', x1: 55, y1: 54, x2: 90,  y2: 60 },
  ],
  beams: [
    { dimId: 'H',  kind: 'span',   x1: 4,  y1: 6,  x2: 4,   y2: 92 },
    { dimId: 'W',  kind: 'span',   x1: 8,  y1: 2,  x2: 102, y2: 2 },
    { dimId: 'TF', kind: 'leader', x1: 95, y1: 13, x2: 108, y2: 13 },
    { dimId: 'TW', kind: 'leader', x1: 55, y1: 49, x2: 78,  y2: 62 },
  ],
  channel: [
    { dimId: 'H',  kind: 'span',   x1: 4,  y1: 12, x2: 4,  y2: 88 },
    { dimId: 'W',  kind: 'span',   x1: 8,  y1: 6,  x2: 86, y2: 6 },
    { dimId: 'TF', kind: 'leader', x1: 56, y1: 19, x2: 90, y2: 22 },
    { dimId: 'TW', kind: 'leader', x1: 17, y1: 50, x2: 2,  y2: 62 },
  ],
  flatbar: [
    { dimId: 'W', kind: 'span', x1: 8,  y1: 32, x2: 80, y2: 32 },
    { dimId: 'T', kind: 'span', x1: 84, y1: 36, x2: 84, y2: 64 },
  ],
  angle: [
    { dimId: 'A', kind: 'span',   x1: 4,  y1: 12, x2: 4,  y2: 84 },
    { dimId: 'B', kind: 'span',   x1: 8,  y1: 88, x2: 88, y2: 88 },
    { dimId: 'T', kind: 'leader', x1: 17, y1: 75, x2: 2,  y2: 94 },
  ],
  rectbar: [
    { dimId: 'W', kind: 'span', x1: 8,  y1: 30, x2: 80, y2: 30 },
    { dimId: 'T', kind: 'span', x1: 84, y1: 34, x2: 84, y2: 70 },
  ],
  recttube: [
    { dimId: 'W', kind: 'span',   x1: 10, y1: 12, x2: 100, y2: 12 },
    { dimId: 'H', kind: 'span',   x1: 104, y1: 16, x2: 104, y2: 84 },
    { dimId: 'T', kind: 'leader', x1: 17, y1: 23, x2: 2,   y2: 6 },
  ],
  sheet: [
    { dimId: 'W', kind: 'span',   x1: 6,  y1: 38, x2: 94, y2: 38 },
    { dimId: 'L', kind: 'span',   x1: 98, y1: 42, x2: 98, y2: 62 },
    { dimId: 'T', kind: 'leader', x1: 8,  y1: 60, x2: 2,  y2: 78 },
  ],
  octagonbar: [{ dimId: 'A', kind: 'span', x1: 15, y1: 46, x2: 95, y2: 46 }],
  halfround:  [{ dimId: 'D', kind: 'span', x1: 13, y1: 58, x2: 97, y2: 58 }],
  zsection: [
    { dimId: 'H', kind: 'span',   x1: 4,  y1: 8,  x2: 4,   y2: 92 },
    { dimId: 'W', kind: 'span',   x1: 50, y1: 4,  x2: 104, y2: 4 },
    { dimId: 'T', kind: 'leader', x1: 55, y1: 50, x2: 84,  y2: 50 },
  ],
  sphere: [{ dimId: 'D', kind: 'span', x1: 15, y1: 46, x2: 95, y2: 46 }],
  oval: [
    { dimId: 'A', kind: 'span', x1: 10, y1: 46, x2: 100, y2: 46 },
    { dimId: 'B', kind: 'span', x1: 55, y1: 26, x2: 55,  y2: 66 },
  ],
  crsquare: [
    { dimId: 'A', kind: 'span',   x1: 89, y1: 16, x2: 89, y2: 84 },
    { dimId: 'R', kind: 'leader', x1: 25, y1: 20, x2: 4,  y2: 6  },
  ],
  crrect: [
    { dimId: 'W', kind: 'span',   x1: 13, y1: 18, x2: 97,  y2: 18 },
    { dimId: 'H', kind: 'span',   x1: 101,y1: 22, x2: 101, y2: 78 },
    { dimId: 'R', kind: 'leader', x1: 17, y1: 26, x2: 2,   y2: 6  },
  ],
  triangle: [
    { dimId: 'B', kind: 'span', x1: 12, y1: 92, x2: 98, y2: 92 },
    { dimId: 'H', kind: 'span', x1: 6,  y1: 12, x2: 6,  y2: 88 },
  ],
  trapezoid: [
    { dimId: 'A', kind: 'span', x1: 38, y1: 8,  x2: 72, y2: 8  },
    { dimId: 'B', kind: 'span', x1: 18, y1: 92, x2: 92, y2: 92 },
    { dimId: 'H', kind: 'span', x1: 6,  y1: 14, x2: 6,  y2: 86 },
  ],
};

const SHORT_LABEL = { length: 'L' };

function labelPos(a) {
  if (a.kind === 'leader') return { x: a.x2, y: a.y2 };

  const midX = (a.x1 + a.x2) / 2, midY = (a.y1 + a.y2) / 2;
  const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len, perpY = dx / len;
  const offset = 12;

  const candidate = (side) => ({ x: midX + perpX * offset * side, y: midY + perpY * offset * side });
  const outOfBounds = (p) => p.y < 6 || p.y > H - 6 || p.x < 4 || p.x > W - 44;

  let pos = candidate(1);
  if (outOfBounds(pos)) {
    const alt = candidate(-1);
    if (!outOfBounds(alt)) pos = alt;
  }
  pos.x = Math.max(4, Math.min(W - 44, pos.x));
  pos.y = Math.max(4, Math.min(H - 8, pos.y));
  return pos;
}

function unitKeyFor(dimId) {
  return 'unit' + dimId.charAt(0).toUpperCase() + dimId.slice(1);
}

// Live, labelled dimension overlay drawn on top of the shape's existing
// preview art. Updates the numbers on every keystroke without touching the
// underlying Skia geometry — only the RN <Text> labels re-render.
export function DimensionedPreview({ shape, inputs }) {
  const PreviewComp = SHAPE_PREVIEWS[shape.id];
  if (!PreviewComp) return null;

  const hasLength = shape.dims.some(d => d.id === 'length');
  const crossSection = DIM_LAYOUTS[shape.id] || [];
  // Length runs along the extrusion axis (into the page), not across the
  // cross-section — so instead of a flat horizontal bar that reads the same
  // as a width/diameter dim, draw it as a shallow diagonal, dashed line, the
  // way an axonometric/isometric depth axis is drawn in CAD.
  const annotations = hasLength
    ? [...crossSection, { dimId: 'length', kind: 'span', x1: 14, y1: 97, x2: 100, y2: 75, dashed: true }]
    : crossSection;

  return (
    <View style={{ width: W, height: H }}>
      <PreviewComp />
      <Canvas style={StyleSheet.absoluteFill}>
        {annotations.map((a, i) => (
          <Path
            key={i}
            path={a.kind === 'leader' ? leaderPath(a.x1, a.y1, a.x2, a.y2) : spanPath(a.x1, a.y1, a.x2, a.y2)}
            color="#334155"
            style="stroke"
            strokeWidth={1.1}
            {...(a.dashed ? { strokeDash: { intervals: [4, 3], phase: 0 } } : {})}
          />
        ))}
      </Canvas>
      {annotations.map((a, i) => {
        const dim = shape.dims.find(d => d.id === a.dimId);
        const value = inputs?.[a.dimId];
        const unit = dim?.unit ? (inputs?.[unitKeyFor(a.dimId)] || 'mm') : '';
        const pos = labelPos(a);
        return (
          <Text
            key={i}
            style={[styles.label, { left: pos.x - 24, top: pos.y - 7 }]}
            numberOfLines={1}
          >
            {SHORT_LABEL[a.dimId] || a.dimId}{value ? ` ${value}${unit}` : ''}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    width: 48,
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
});
