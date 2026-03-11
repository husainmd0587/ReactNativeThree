import { useMemo } from 'react';
import * as THREE from 'three';

// ─── 7x7 pixel font ───────────────────────────────────────────────────────────
const PIXEL_FONT = {
  X: [
    [1,1,0,0,0,1,1],
    [0,1,1,0,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
    [0,0,1,1,1,0,0],
    [0,1,1,0,1,1,0],
    [1,1,0,0,0,1,1],
  ],
  Y: [
    [1,1,0,0,0,1,1],
    [0,1,1,0,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
  ],
  Z: [
    [1,1,1,1,1,1,1],
    [0,0,0,0,1,1,0],
    [0,0,0,1,1,0,0],
    [0,0,1,1,0,0,0],
    [0,1,1,0,0,0,0],
    [1,1,0,0,0,0,0],
    [1,1,1,1,1,1,1],
  ],
};

// ─── Smooth anti-aliased DataTexture — no document, no canvas ─────────────────
function makeLetterTexture(letter, hexColor) {
  const grid   = PIXEL_FONT[letter];
  const GRID_H = grid.length;
  const GRID_W = grid[0].length;
  const SCALE  = 12;                 // ↑ higher = smoother appearance
  const PAD    = SCALE;              // generous padding
  const TEX_W  = GRID_W * SCALE + PAD * 2;
  const TEX_H  = GRID_H * SCALE + PAD * 2;
  const data   = new Uint8Array(TEX_W * TEX_H * 4);

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const HALF  = SCALE / 2;
  const SIGMA = SCALE * 0.40;   // gaussian blur radius — controls softness

  for (let row = 0; row < GRID_H; row++) {
    for (let col = 0; col < GRID_W; col++) {
      if (!grid[row][col]) continue;

      // center of this dot in texture space
      const cx = PAD + col * SCALE + HALF;
      const cy = PAD + row * SCALE + HALF;

      // paint a gaussian blob for each lit pixel → smooth edges
      const spread = Math.ceil(SIGMA * 2.5);
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          // ── FIX mirror: flip row when writing (TEX_H-1 - py) ──
          const px  = cx + dx;
          const py  = cy + dy;
          const pxF = Math.round(px);
          const pyF = TEX_H - 1 - Math.round(py);   // ← Y-flip here

          if (pxF < 0 || pxF >= TEX_W || pyF < 0 || pyF >= TEX_H) continue;

          // gaussian weight
          const dist   = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
          const alpha  = Math.round(weight * 255);

          const i = (pyF * TEX_W + pxF) * 4;
          // additive blend — overlapping dots reinforce each other
          const prev = data[i + 3];
          const next = Math.min(255, prev + alpha);
          if (next > prev) {
            data[i]     = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = next;
          }
        }
      }
    }
  }

  const tex       = new THREE.DataTexture(data, TEX_W, TEX_H, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter   = THREE.LinearFilter;   // smooth scaling up
  tex.minFilter   = THREE.LinearFilter;   // smooth scaling down
  tex.flipY       = false;                // we already flipped manually
  return tex;
}

// ─── Sprite label ─────────────────────────────────────────────────────────────
function AxisLabel({ text, position, color }) {
  const texture = useMemo(
    () => makeLetterTexture(text, color),
    [text, color]
  );

  return (
    <sprite position={position} scale={[1, 1, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        alphaTest={0.05}
        sizeAttenuation
      />
    </sprite>
  );
}

// ─── AxisLabels ───────────────────────────────────────────────────────────────
export function AxisLabels({ size = 5 }) {
  return (
    <>
      <axesHelper args={[size]} />
      <AxisLabel text="X" position={[size + 2.5, 0,          0         ]} color="#ff3333" />
      <AxisLabel text="Y" position={[0,          size + 2.5, 0         ]} color="#33cc33" />
      <AxisLabel text="Z" position={[0,          0,          size + 2.5]} color="#3388ff" />
    </>
  );
}