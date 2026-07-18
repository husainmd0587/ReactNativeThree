// utils/profile/profile.js
//
// Bridges the 2D Sketcher (main.js) to the native 3D CAD layer.
//
// The sketcher already produces a `shapeList` of segments with this schema
// (see main.js addSegment calls):
//   { type: 'line',      startPoint, endPoint }
//   { type: 'arc',       center, radius, startAngle, endAngle, clockwise, startPoint, endPoint }
//   { type: 'circle',    center, radius }
//   { type: 'rectangle', topLeft, bottomRight }
//
// This file turns that same shapeList into a validated, ordered list of
// plain {x, y} points — ready to hand straight to
// native/manifoldNativeApi.js's initExtrude()/initRevolve(), which build the
// solid with Manifold::Extrude / Manifold::Revolve on the native side. No
// THREE.js involved in this step at all.
//
// It also exposes Line / Rectangle / Circle constructors so the CAD API
// (cad/CadApi.js) can build profiles in code, not just from the sketcher UI.

const CLOSE_TOLERANCE = 1e-3

// ═══════════════════════════════════════════════════════════════════════════
// 2D ENTITY CONSTRUCTORS — same shape the sketcher's addSegment() produces
// ═══════════════════════════════════════════════════════════════════════════

export function Line({ start, end }) {
  return {
    type: 'line',
    startPoint: { x: start.x, y: start.y },
    endPoint: { x: end.x, y: end.y },
  }
}

export function Rectangle({ x = 0, y = 0, width = 10, height = 10 } = {}) {
  return {
    type: 'rectangle',
    topLeft: { x, y: y + height },
    bottomRight: { x: x + width, y },
  }
}

export function Circle({ center = { x: 0, y: 0 }, radius = 5 } = {}) {
  return { type: 'circle', center: { x: center.x, y: center.y }, radius }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESSELLATION — segments -> ordered list of {x, y} points
// ═══════════════════════════════════════════════════════════════════════════

function tessellateArc(seg, arcResolution) {
  const { center, radius, startAngle, endAngle, clockwise } = seg
  let delta = endAngle - startAngle

  if (clockwise) {
    if (delta > 0) delta -= Math.PI * 2
  } else {
    if (delta < 0) delta += Math.PI * 2
  }

  const steps = Math.max(2, Math.round((arcResolution * Math.abs(delta)) / (Math.PI * 2)))
  const points = []

  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (delta * i) / steps
    points.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius })
  }

  return points
}

function tessellateCircle(seg, arcResolution) {
  const points = []

  for (let i = 0; i < arcResolution; i++) {
    const a = (Math.PI * 2 * i) / arcResolution
    points.push({ x: seg.center.x + Math.cos(a) * seg.radius, y: seg.center.y + Math.sin(a) * seg.radius })
  }

  return points
}

function tessellateRectangle(seg) {
  const { topLeft: tl, bottomRight: br } = seg
  return [
    { x: tl.x, y: tl.y },
    { x: br.x, y: tl.y },
    { x: br.x, y: br.y },
    { x: tl.x, y: br.y },
  ]
}

// A lone circle / rectangle is a complete closed loop by itself.
function isSelfClosingSegment(seg) {
  return seg.type === 'circle' || seg.type === 'rectangle'
}

export function segmentsToPoints(segments, arcResolution = 32) {
  if (segments.length === 1 && isSelfClosingSegment(segments[0])) {
    const seg = segments[0]
    return seg.type === 'circle' ? tessellateCircle(seg, arcResolution) : tessellateRectangle(seg)
  }

  const points = []

  function pushPoint(p) {
    const last = points[points.length - 1]
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) points.push(p)
  }

  for (const seg of segments) {
    if (seg.type === 'line') {
      if (points.length === 0) pushPoint(seg.startPoint)
      pushPoint(seg.endPoint)
    } else if (seg.type === 'arc') {
      if (points.length === 0) pushPoint(seg.startPoint)
      tessellateArc(seg, arcResolution).forEach(pushPoint)
    } else {
      throw new Error(
        `Cannot chain a '${seg.type}' segment with other segments — circles and ` +
        `rectangles must be a profile's only segment`
      )
    }
  }

  return points
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOSED PROFILE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export function isClosedProfile(segments, tolerance = CLOSE_TOLERANCE) {
  if (!Array.isArray(segments) || segments.length === 0) return false

  if (segments.length === 1 && isSelfClosingSegment(segments[0])) return true

  let points
  try {
    points = segmentsToPoints(segments)
  } catch {
    return false
  }

  if (points.length < 3) return false

  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) <= tolerance
}

// Returns a point list guaranteed to start and end on the same vertex.
// Throws if the profile can't form a valid closed loop.
export function closeProfile(segments, arcResolution = 32) {
  const points = segmentsToPoints(segments, arcResolution)

  if (points.length < 3) {
    throw new Error('Profile needs at least 3 points to close')
  }

  const first = points[0]
  const last = points[points.length - 1]

  if (Math.hypot(first.x - last.x, first.y - last.y) > CLOSE_TOLERANCE) {
    if (segments.length === 1 && isSelfClosingSegment(segments[0])) {
      // circle / rectangle tessellation is already closed by construction
    } else {
      throw new Error('Profile is not closed: the sketch has a gap between its start and end points')
    }
  }

  return points
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE -> flat point list for native Extrude
// (native/manifoldNativeApi.js's initExtrude() takes exactly this)
// ═══════════════════════════════════════════════════════════════════════════

export function profileToExtrudePoints(segments, arcResolution = 32) {
  if (!isClosedProfile(segments)) {
    throw new Error('Profile is not closed: cannot extrude or revolve an open sketch')
  }

  return closeProfile(segments, arcResolution)
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE -> revolve points (native Revolve input)
// All points must lie on one side of the rotation axis (x >= 0).
// ═══════════════════════════════════════════════════════════════════════════

export function profileToRevolvePoints(segments, arcResolution = 32) {
  const points = closeProfile(segments, arcResolution)

  for (const p of points) {
    if (p.x < -CLOSE_TOLERANCE) {
      throw new Error('Revolve profile must not cross the rotation axis (all x must be >= 0)')
    }
  }

  return points.map((p) => ({ x: Math.max(p.x, 0), y: p.y }))
}
