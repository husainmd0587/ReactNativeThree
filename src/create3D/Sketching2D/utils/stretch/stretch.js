// utils/grip.js

const TAU = 2 * Math.PI;
const norm = (a) => ((a % TAU) + TAU) % TAU;

// ─────────────────────────────────────────────────────────────────────────────
// GRIP TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const GRIP = {
  // Line
  LINE_START:    'line_start',
  LINE_END:      'line_end',
  LINE_MID:      'line_mid',

  // Arc
  ARC_START:     'arc_start',
  ARC_END:       'arc_end',
  ARC_CENTER:    'arc_center',
  ARC_MID:       'arc_mid',       // midpoint of arc sweep (reshape bulge)
  ARC_RADIUS:    'arc_radius',    // drag to change radius

  // Circle
  CIRCLE_CENTER: 'circle_center',
  CIRCLE_RAD:    'circle_rad',    // 4 cardinal radius grips

  // Rectangle
  RECT_TL:       'rect_tl',
  RECT_TR:       'rect_tr',
  RECT_BR:       'rect_br',
  RECT_BL:       'rect_bl',
  RECT_TOP_MID:  'rect_top_mid',
  RECT_RIGHT_MID:'rect_right_mid',
  RECT_BOT_MID:  'rect_bot_mid',
  RECT_LEFT_MID: 'rect_left_mid',
};

// Grip colors by role
export const GRIP_COLOR = {
  endpoint: '#00aaff',   // blue  — move this point
  midpoint: '#00cc66',   // green — move one edge / change bulge
  center:   '#ff9900',   // orange — move whole shape
  radius:   '#cc44ff',   // purple — resize
};

// ─────────────────────────────────────────────────────────────────────────────
// COLLECT GRIPS for a segment
// Each grip: { id, type, x, y, color, role }
// ─────────────────────────────────────────────────────────────────────────────

export function getGrips(seg, segIndex) {
  const id = (type) => `${segIndex}_${type}`;

  if (seg.type === 'line') {
    const mx = (seg.startPoint.x + seg.endPoint.x) / 2;
    const my = (seg.startPoint.y + seg.endPoint.y) / 2;
    return [
      { id: id(GRIP.LINE_START), type: GRIP.LINE_START, segIndex,
        x: seg.startPoint.x, y: seg.startPoint.y,
        color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.LINE_END),   type: GRIP.LINE_END,   segIndex,
        x: seg.endPoint.x,   y: seg.endPoint.y,
        color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.LINE_MID),   type: GRIP.LINE_MID,   segIndex,
        x: mx, y: my,
        color: GRIP_COLOR.midpoint, role: 'midpoint' },
    ];
  }

  if (seg.type === 'arc') {
    const sx = seg.center.x + seg.radius * Math.cos(seg.startAngle);
    const sy = seg.center.y + seg.radius * Math.sin(seg.startAngle);
    const ex = seg.center.x + seg.radius * Math.cos(seg.endAngle);
    const ey = seg.center.y + seg.radius * Math.sin(seg.endAngle);

    // Midpoint of sweep
    const s = norm(seg.startAngle), e = norm(seg.endAngle);
    let sweep;
    if (seg.clockwise) {
      sweep = s <= e ? e - s : TAU - s + e;
    } else {
      sweep = s >= e ? s - e : TAU - e + s;
    }
    const midAngle = seg.startAngle + (seg.clockwise ? 1 : -1) * sweep / 2;
    const mx = seg.center.x + seg.radius * Math.cos(midAngle);
    const my = seg.center.y + seg.radius * Math.sin(midAngle);

    // Radius grip — outward from center along midAngle
    const radGripDist = seg.radius + 12;
    const rx = seg.center.x + radGripDist * Math.cos(midAngle);
    const ry = seg.center.y + radGripDist * Math.sin(midAngle);

    return [
      { id: id(GRIP.ARC_START),  type: GRIP.ARC_START,  segIndex,
        x: sx, y: sy, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.ARC_END),    type: GRIP.ARC_END,    segIndex,
        x: ex, y: ey, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.ARC_CENTER), type: GRIP.ARC_CENTER, segIndex,
        x: seg.center.x, y: seg.center.y,
        color: GRIP_COLOR.center, role: 'center' },
      { id: id(GRIP.ARC_MID),    type: GRIP.ARC_MID,    segIndex,
        x: mx, y: my, color: GRIP_COLOR.midpoint, role: 'midpoint' },
      { id: id(GRIP.ARC_RADIUS), type: GRIP.ARC_RADIUS, segIndex,
        x: rx, y: ry, color: GRIP_COLOR.radius, role: 'radius' },
    ];
  }

  if (seg.type === 'circle') {
    // 4 cardinal radius grips + center
    const r   = seg.radius;
    const { x: cx, y: cy } = seg.center;
    return [
      { id: id(GRIP.CIRCLE_CENTER), type: GRIP.CIRCLE_CENTER, segIndex,
        x: cx, y: cy, color: GRIP_COLOR.center, role: 'center' },
      { id: id(GRIP.CIRCLE_RAD)+'_r', type: GRIP.CIRCLE_RAD, segIndex,
        x: cx + r, y: cy, color: GRIP_COLOR.radius, role: 'radius', cardinal: 0 },
      { id: id(GRIP.CIRCLE_RAD)+'_t', type: GRIP.CIRCLE_RAD, segIndex,
        x: cx, y: cy - r, color: GRIP_COLOR.radius, role: 'radius', cardinal: 1 },
      { id: id(GRIP.CIRCLE_RAD)+'_l', type: GRIP.CIRCLE_RAD, segIndex,
        x: cx - r, y: cy, color: GRIP_COLOR.radius, role: 'radius', cardinal: 2 },
      { id: id(GRIP.CIRCLE_RAD)+'_b', type: GRIP.CIRCLE_RAD, segIndex,
        x: cx, y: cy + r, color: GRIP_COLOR.radius, role: 'radius', cardinal: 3 },
    ];
  }

  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;
    const tr = { x: br.x, y: tl.y };
    const bl = { x: tl.x, y: br.y };
    return [
      // Corners
      { id: id(GRIP.RECT_TL), type: GRIP.RECT_TL, segIndex,
        x: tl.x, y: tl.y, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.RECT_TR), type: GRIP.RECT_TR, segIndex,
        x: tr.x, y: tr.y, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.RECT_BR), type: GRIP.RECT_BR, segIndex,
        x: br.x, y: br.y, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      { id: id(GRIP.RECT_BL), type: GRIP.RECT_BL, segIndex,
        x: bl.x, y: bl.y, color: GRIP_COLOR.endpoint, role: 'endpoint' },
      // Edge midpoints
      { id: id(GRIP.RECT_TOP_MID),   type: GRIP.RECT_TOP_MID,   segIndex,
        x: (tl.x+br.x)/2, y: tl.y, color: GRIP_COLOR.midpoint, role: 'midpoint' },
      { id: id(GRIP.RECT_RIGHT_MID), type: GRIP.RECT_RIGHT_MID, segIndex,
        x: br.x, y: (tl.y+br.y)/2, color: GRIP_COLOR.midpoint, role: 'midpoint' },
      { id: id(GRIP.RECT_BOT_MID),   type: GRIP.RECT_BOT_MID,   segIndex,
        x: (tl.x+br.x)/2, y: br.y, color: GRIP_COLOR.midpoint, role: 'midpoint' },
      { id: id(GRIP.RECT_LEFT_MID),  type: GRIP.RECT_LEFT_MID,  segIndex,
        x: tl.x, y: (tl.y+br.y)/2, color: GRIP_COLOR.midpoint, role: 'midpoint' },
    ];
  }

  return [];
}

// Collect grips for all segments
export function getAllGrips(shapeList) {
  return shapeList.flatMap((seg, i) => getGrips(seg, i));
}

// ─────────────────────────────────────────────────────────────────────────────
// HIT TEST — find grip under tap
// ─────────────────────────────────────────────────────────────────────────────

export function hitTestGrip(px, py, grips, threshold = 10) {
  let best = null, bestDist = Infinity;
  for (const g of grips) {
    const d = Math.hypot(px - g.x, py - g.y);
    if (d < threshold && d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best;   // null if nothing hit
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY GRIP MOVE — return updated segment given dragged grip
// ─────────────────────────────────────────────────────────────────────────────

export function applyGripMove(seg, gripType, newX, newY) {

  // ── LINE ───────────────────────────────────────────────────────────────────
  if (seg.type === 'line') {
    switch (gripType) {
      case GRIP.LINE_START:
        return { ...seg, startPoint: { x: newX, y: newY } };

      case GRIP.LINE_END:
        return { ...seg, endPoint: { x: newX, y: newY } };

      case GRIP.LINE_MID: {
        // Move whole line (midpoint drag = translate)
        const dx = newX - (seg.startPoint.x + seg.endPoint.x) / 2;
        const dy = newY - (seg.startPoint.y + seg.endPoint.y) / 2;
        return {
          ...seg,
          startPoint: { x: seg.startPoint.x + dx, y: seg.startPoint.y + dy },
          endPoint:   { x: seg.endPoint.x   + dx, y: seg.endPoint.y   + dy },
        };
      }
    }
  }

  // ── ARC ────────────────────────────────────────────────────────────────────
  if (seg.type === 'arc') {
    switch (gripType) {
      case GRIP.ARC_START: {
        // Change start angle — keep center + radius + end angle
        const newStartAngle = Math.atan2(
          newY - seg.center.y,
          newX - seg.center.x
        );
        return {
          ...seg,
          startAngle: newStartAngle,
          startPoint: {
            x: seg.center.x + seg.radius * Math.cos(newStartAngle),
            y: seg.center.y + seg.radius * Math.sin(newStartAngle),
          },
        };
      }

      case GRIP.ARC_END: {
        const newEndAngle = Math.atan2(
          newY - seg.center.y,
          newX - seg.center.x
        );
        return {
          ...seg,
          endAngle: newEndAngle,
          endPoint: {
            x: seg.center.x + seg.radius * Math.cos(newEndAngle),
            y: seg.center.y + seg.radius * Math.sin(newEndAngle),
          },
        };
      }

      case GRIP.ARC_CENTER: {
        // Translate whole arc
        const dx = newX - seg.center.x;
        const dy = newY - seg.center.y;
        return {
          ...seg,
          center:     { x: newX, y: newY },
          startPoint: { x: seg.startPoint.x + dx, y: seg.startPoint.y + dy },
          endPoint:   { x: seg.endPoint.x   + dx, y: seg.endPoint.y   + dy },
          ...(seg.bulgePoint ? {
            bulgePoint: { x: seg.bulgePoint.x + dx, y: seg.bulgePoint.y + dy }
          } : {}),
        };
      }

      case GRIP.ARC_MID: {
        // Drag midpoint → change radius (distance from center to new mid)
        const newRadius = Math.hypot(newX - seg.center.x, newY - seg.center.y);
        if (newRadius < 1) return seg;
        const ratio = newRadius / seg.radius;
        return {
          ...seg,
          radius:     newRadius,
          startPoint: {
            x: seg.center.x + newRadius * Math.cos(seg.startAngle),
            y: seg.center.y + newRadius * Math.sin(seg.startAngle),
          },
          endPoint: {
            x: seg.center.x + newRadius * Math.cos(seg.endAngle),
            y: seg.center.y + newRadius * Math.sin(seg.endAngle),
          },
        };
      }

      case GRIP.ARC_RADIUS: {
        // Same as mid — distance from center = new radius
        const newRadius = Math.hypot(newX - seg.center.x, newY - seg.center.y);
        if (newRadius < 1) return seg;
        return {
          ...seg,
          radius:     newRadius,
          startPoint: {
            x: seg.center.x + newRadius * Math.cos(seg.startAngle),
            y: seg.center.y + newRadius * Math.sin(seg.startAngle),
          },
          endPoint: {
            x: seg.center.x + newRadius * Math.cos(seg.endAngle),
            y: seg.center.y + newRadius * Math.sin(seg.endAngle),
          },
        };
      }
    }
  }

  // ── CIRCLE ─────────────────────────────────────────────────────────────────
  if (seg.type === 'circle') {
    switch (gripType) {
      case GRIP.CIRCLE_CENTER:
        return { ...seg, center: { x: newX, y: newY } };

      case GRIP.CIRCLE_RAD: {
        const newRadius = Math.hypot(newX - seg.center.x, newY - seg.center.y);
        if (newRadius < 1) return seg;
        return { ...seg, radius: newRadius };
      }
    }
  }

  // ── RECTANGLE ──────────────────────────────────────────────────────────────
  if (seg.type === 'rectangle') {
    const { topLeft: tl, bottomRight: br } = seg;

    const update = (newTL, newBR) => ({
      ...seg,
      topLeft:     { x: Math.min(newTL.x, newBR.x), y: Math.min(newTL.y, newBR.y) },
      bottomRight: { x: Math.max(newTL.x, newBR.x), y: Math.max(newTL.y, newBR.y) },
      corner1:     newTL,
      corner2:     newBR,
    });

    switch (gripType) {
      case GRIP.RECT_TL:       return update({ x: newX, y: newY }, br);
      case GRIP.RECT_TR:       return update({ x: tl.x, y: newY }, { x: newX, y: br.y });
      case GRIP.RECT_BR:       return update(tl, { x: newX, y: newY });
      case GRIP.RECT_BL:       return update({ x: newX, y: tl.y }, { x: br.x, y: newY });
      case GRIP.RECT_TOP_MID:  return update({ x: tl.x, y: newY }, br);
      case GRIP.RECT_RIGHT_MID:return update(tl, { x: newX, y: br.y });
      case GRIP.RECT_BOT_MID:  return update(tl, { x: br.x, y: newY });
      case GRIP.RECT_LEFT_MID: return update({ x: newX, y: tl.y }, { x: br.x, y: br.y });
    }
  }

  return seg;
}


