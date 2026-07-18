// utils/profile/loopDetection.js
//
// Groups the flat, mixed segment list the Sketcher (main.js) produces into
// closed loops, classifies them as outer boundaries or holes (one level of
// nesting: an outer loop plus any loops fully inside it), and lets you hit-
// test a tapped point against the result to find which profile the user
// meant to select.
//
// This is the missing piece between "a pile of segments" and "a profile you
// can Extrude/Revolve". Pure geometry, no React/Skia dependency — usable
// from the Sketcher UI, a headless test, or the CAD API directly.
//
// KNOWN LIMITATION: only ONE level of nesting is classified (an outer loop
// and holes directly inside it). An island sitting inside a hole (nested two
// levels deep) is not handled — such loops are flagged via
// `profile.nestingWarning` rather than silently misclassified.

const CLOSE_TOLERANCE = 1e-3
const ARC_RESOLUTION = 32

// ═══════════════════════════════════════════════════════════════════════════
// PER-SEGMENT ENDPOINTS + TESSELLATION
// ═══════════════════════════════════════════════════════════════════════════

function segStart(seg) {
  if (seg.type === 'line' || seg.type === 'arc') return seg.startPoint
  return null // circle/rectangle are standalone — no shared endpoints
}

function segEnd(seg) {
  if (seg.type === 'line' || seg.type === 'arc') return seg.endPoint
  return null
}

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

function pointKey(p) {
  return `${Math.round(p.x / CLOSE_TOLERANCE)},${Math.round(p.y / CLOSE_TOLERANCE)}`
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CLOSED LOOPS FROM A FLAT, MIXED SEGMENT LIST
// ═══════════════════════════════════════════════════════════════════════════
//
// Returns an array of:
//   { indices: [shapeList indices, in walk order], points: [{x,y}...], closed: bool }
//
// `indices` traces a loop back to the original segments (e.g. to highlight
// them in the Sketcher). `points` is the tessellated polygon used for
// containment tests and native Extrude input.

export function findClosedLoops(shapeList, arcResolution = ARC_RESOLUTION) {
  const loops = []
  const visited = new Array(shapeList.length).fill(false)

  // Self-closing segments (circle / rectangle) are each their own loop.
  shapeList.forEach((seg, idx) => {
    if (seg.type === 'circle' || seg.type === 'rectangle') {
      visited[idx] = true
      loops.push({
        indices: [idx],
        points: seg.type === 'circle' ? tessellateCircle(seg, arcResolution) : tessellateRectangle(seg),
        closed: true,
      })
    }
  })

  // Endpoint adjacency for line/arc segments only.
  const adjacency = new Map() // pointKey -> [{ idx, end: 'start' | 'end' }]

  shapeList.forEach((seg, idx) => {
    if (seg.type !== 'line' && seg.type !== 'arc') return
    const s = segStart(seg)
    const e = segEnd(seg)
    if (!s || !e) return

    const sKey = pointKey(s)
    const eKey = pointKey(e)

    if (!adjacency.has(sKey)) adjacency.set(sKey, [])
    if (!adjacency.has(eKey)) adjacency.set(eKey, [])
    adjacency.get(sKey).push({ idx, end: 'start' })
    adjacency.get(eKey).push({ idx, end: 'end' })
  })

  shapeList.forEach((seg, startIdx) => {
    if (visited[startIdx]) return
    if (seg.type !== 'line' && seg.type !== 'arc') return

    // Walk forward from this segment, through unvisited segments sharing
    // the current point, until we return to the loop's first point
    // (closed) or run out of connections (open chain).
    const chainIndices = [startIdx]
    visited[startIdx] = true

    const firstPoint = segStart(seg)
    let currentPoint = segEnd(seg)
    let closed = false
    let guard = 0 // safety net against malformed/cyclic adjacency data

    while (guard++ < shapeList.length + 1) {
      if (Math.hypot(currentPoint.x - firstPoint.x, currentPoint.y - firstPoint.y) <= CLOSE_TOLERANCE) {
        closed = true
        break
      }

      const candidates = adjacency.get(pointKey(currentPoint)) || []
      const next = candidates.find((c) => !visited[c.idx])
      if (!next) break // dead end — open chain

      const nextSeg = shapeList[next.idx]
      visited[next.idx] = true
      chainIndices.push(next.idx)

      currentPoint = next.end === 'start' ? segEnd(nextSeg) : segStart(nextSeg)
    }

    const points = []
    chainIndices.forEach((idx) => {
      const s = shapeList[idx]
      const segPoints = s.type === 'arc' ? tessellateArc(s, arcResolution) : [segStart(s), segEnd(s)]

      // The walk direction might be reversed vs. the segment's own
      // start->end — detect by comparing to the running point list.
      const running = points[points.length - 1]
      const forward = !running || Math.hypot(running.x - segPoints[0].x, running.y - segPoints[0].y) <= CLOSE_TOLERANCE
      const ordered = forward ? segPoints : [...segPoints].reverse()

      ordered.forEach((p) => {
        const last = points[points.length - 1]
        if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) points.push(p)
      })
    })

    loops.push({ indices: chainIndices, points, closed })
  })

  return loops
}

// ═══════════════════════════════════════════════════════════════════════════
// POLYGON MATH
// ═══════════════════════════════════════════════════════════════════════════

function signedArea(points) {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

export function isCCW(points) {
  return signedArea(points) > 0
}

export function pointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFY CLOSED LOOPS INTO PROFILES (outer boundary + its holes)
// ═══════════════════════════════════════════════════════════════════════════

export function classifyLoops(loops) {
  const closedLoops = loops.filter((l) => l.closed && l.points.length >= 3)

  const containers = closedLoops.map((loop, i) =>
    closedLoops.reduce((acc, other, j) => {
      if (i !== j && pointInPolygon(loop.points[0], other.points)) acc.push(j)
      return acc
    }, [])
  )

  const profiles = []
  const deeplyNestedExists = containers.some((c) => c.length > 1)

  closedLoops.forEach((loop, i) => {
    if (containers[i].length > 0) return // this loop sits inside something — it's a hole, not top-level

    const holes = closedLoops.filter((_, j) => containers[j].length === 1 && containers[j][0] === i)

    profiles.push({
      outer: loop,
      holes,
      nestingWarning: deeplyNestedExists
        ? 'Some loops are nested more than one level deep and were ignored — only an outer boundary plus direct holes is supported.'
        : null,
    })
  })

  return profiles
}

// ═══════════════════════════════════════════════════════════════════════════
// TAP-TO-SELECT
// ═══════════════════════════════════════════════════════════════════════════

export function hitTestProfiles(profiles, point) {
  for (const profile of profiles) {
    if (!pointInPolygon(point, profile.outer.points)) continue
    const insideAHole = profile.holes.some((hole) => pointInPolygon(point, hole.points))
    if (!insideAHole) return profile
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// NATIVE-READY FLATTENING
// ═══════════════════════════════════════════════════════════════════════════
//
// Manifold's polygon-with-holes convention: outer loop wound one way, every
// hole wound the OPPOSITE way. This normalizes winding regardless of which
// direction the user happened to draw in.

function dropClosingDuplicate(points) {
  if (points.length < 2) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (Math.hypot(first.x - last.x, first.y - last.y) <= 1e-6) return points.slice(0, -1)
  return points
}

export function profileToNativeInput(profile) {
  const outerRaw = dropClosingDuplicate(profile.outer.points)
  const outerPoints = isCCW(outerRaw) ? outerRaw : [...outerRaw].reverse()

  const holesPoints = profile.holes.map((hole) => {
    const raw = dropClosingDuplicate(hole.points)
    return isCCW(raw) ? [...raw].reverse() : raw
  })

  const allLoops = [outerPoints, ...holesPoints]
  const loopSizes = allLoops.map((pts) => pts.length)
  const points = []
  allLoops.forEach((pts) => pts.forEach((p) => points.push(p.x, p.y)))

  return { points, loopSizes }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE — the whole pipeline for a sketch expected to be ONE profile
// ═══════════════════════════════════════════════════════════════════════════
//
// Used as a fallback when the user hasn't explicitly tap-selected a profile
// yet (e.g. a sketch with exactly one shape). Throws a clear, UI-friendly
// error otherwise instead of guessing.

export function singleProfileFrom(shapeList) {
  const loops = findClosedLoops(shapeList)

  const openLoops = loops.filter((l) => !l.closed)
  if (openLoops.length > 0) {
    throw new Error('Sketch is not closed — there is a gap between segment endpoints')
  }

  const profiles = classifyLoops(loops)

  if (profiles.length === 0) {
    throw new Error('No closed profile found in this sketch')
  }
  if (profiles.length > 1) {
    throw new Error(
      `This sketch has ${profiles.length} separate closed regions — tap the one you want before extruding or revolving`
    )
  }

  return profiles[0]
}
