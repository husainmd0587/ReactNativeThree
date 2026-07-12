/**
 * toolpathToPasses.js
 *
 * Consumes the flat move list from latheInterpreter and produces:
 *  1. `passes`: an ordered array of { id, cycle, moves, outerProfile, innerProfile }
 *     - one pass = one continuous cutting excursion between two rapid retracts.
 *     - each pass carries the OUTER radius-vs-Z profile of the stock *after* that
 *       pass has completed (used to build the "reveal" mesh for that pass).
 *  2. `rawProfile`: the starting stock outer profile (before any cutting).
 *  3. `finalOuterProfile` / `finalInnerProfile`: profile after the last pass — used
 *     to build the finished-part mesh.
 *
 * Units: moves are in diameter units for X (see latheInterpreter.js). We convert to
 * RADIUS here since that's what geometry builders / THREE.LatheGeometry want.
 *
 * Z-SAMPLING: rather than tracking a continuous function, we sample the profile at a
 * fixed set of Z stations across the stock length (`resolution` stations). For every
 * cutting move we rasterize its (x,z) segment onto those stations and update the
 * min-radius-reached (for outer turning cuts) or max-radius-reached (for bores/holes).
 */

function radiusOf(diameterX) {
  return Math.max(0, diameterX / 2);
}

/** Build the Z station grid across [zMin, zMax] (zMin is more negative / deeper into stock). */
function buildStations(zMin, zMax, resolution) {
  const stations = [];
  const span = zMax - zMin || 1;
  for (let i = 0; i <= resolution; i++) {
    stations.push(zMin + (span * i) / resolution);
  }
  return stations;
}

/** Linear interpolation of radius along a straight (x,z) segment at a given z. */
function radiusAtZ(from, to, z) {
  if (Math.abs(to.z - from.z) < 1e-9) return Math.min(radiusOf(from.x), radiusOf(to.x));
  const t = (z - from.z) / (to.z - from.z);
  const clampedT = Math.max(0, Math.min(1, t));
  const x = from.x + (to.x - from.x) * clampedT;
  return radiusOf(x);
}

/**
 * Rasterize one cutting move onto the station grid, updating outer/inner radius arrays.
 * - "outer" cuts (tool approaches from stock OD inward) LOWER the outer radius.
 * - "bore" cuts (drilling/boring near/at centerline) RAISE the inner radius (hole size).
 * We classify a move as a bore cut if its average X is below `boreThreshold` (near axis)
 * AND it's primarily axial (Z-dominant) motion — i.e. drilling, not facing to center.
 */
function applyMoveToProfile(move, stations, outerR, innerR, boreThreshold) {
  const { from, to } = move;
  const zLo = Math.min(from.z, to.z);
  const zHi = Math.max(from.z, to.z);
  const isAxialDominant = Math.abs(to.z - from.z) >= Math.abs(to.x - from.x);
  const avgX = (from.x + to.x) / 2;
  const isBoreCut = isAxialDominant && radiusOf(avgX) <= boreThreshold;

  for (let i = 0; i < stations.length; i++) {
    const z = stations[i];
    if (z < zLo - 1e-6 || z > zHi + 1e-6) continue;
    const r = radiusAtZ(from, to, z);
    if (isBoreCut) {
      innerR[i] = Math.max(innerR[i], r);
    } else {
      outerR[i] = Math.min(outerR[i], r);
    }
  }
}

export function buildPasses(moves, stockConfig) {
  const { stockDiameter, stockLength, zFace = 0, resolution = 160, boreThreshold = 6 } = stockConfig;
  const stockRadius = radiusOf(stockDiameter);
  const zMin = zFace - stockLength;
  const zMax = zFace;
  const stations = buildStations(zMin, zMax, resolution);

  const rawOuter = stations.map(() => stockRadius);
  const rawInner = stations.map(() => 0);

  // Group moves into passes: a new pass starts after a rapid move that follows at
  // least one cutting move (i.e. a retract-and-reposition), and also whenever the
  // cycle type changes (manual -> G71 -> G76 etc.).
  const passesRaw = [];
  let current = [];
  let lastCycle = null;
  let sawCutInCurrent = false;

  for (const mv of moves) {
    const cycleChanged = lastCycle !== null && mv.cycle !== lastCycle;
    if (cycleChanged && current.length) {
      passesRaw.push(current);
      current = [];
      sawCutInCurrent = false;
    }
    current.push(mv);
    lastCycle = mv.cycle;
    if (mv.isCutting) sawCutInCurrent = true;
    if (mv.type === 'rapid' && sawCutInCurrent) {
      // Look ahead conceptually: we close the pass once we hit a rapid AFTER cutting,
      // but only if the rapid moves away significantly (real retract), not a tiny jog.
      const dist = Math.hypot(mv.to.x - mv.from.x, mv.to.z - mv.from.z);
      if (dist > 0.05) {
        passesRaw.push(current);
        current = [];
        sawCutInCurrent = false;
      }
    }
  }
  if (current.length) passesRaw.push(current);

  // Fold non-cutting-only groups (pure rapids with no cuts, e.g. initial approach) into
  // the next pass so we don't render empty "passes".
  const grouped = [];
  for (const grp of passesRaw) {
    const hasCut = grp.some((m) => m.isCutting);
    if (!hasCut && grouped.length === 0) {
      grouped.push(grp); // keep leading approach with first real pass below
      continue;
    }
    if (!hasCut && grouped.length > 0) {
      grouped[grouped.length - 1] = grouped[grouped.length - 1].concat(grp);
      continue;
    }
    if (grouped.length && !grouped[grouped.length - 1].some((m) => m.isCutting) && grouped.length === 1) {
      grouped[0] = grouped[0].concat(grp);
    } else {
      grouped.push(grp);
    }
  }

  let runningOuter = rawOuter.slice();
  let runningInner = rawInner.slice();
  const passes = [];

  grouped.forEach((grp, idx) => {
    const outerR = runningOuter.slice();
    const innerR = runningInner.slice();
    for (const mv of grp) {
      if (!mv.isCutting) continue;
      applyMoveToProfile(mv, stations, outerR, innerR, boreThreshold);
    }
    runningOuter = outerR;
    runningInner = innerR;

    const cuttingMoves = grp.filter((m) => m.isCutting);
    if (cuttingMoves.length === 0 && idx !== 0) return; // skip empty non-leading groups

    passes.push({
      id: idx,
      cycle: grp.find((m) => m.isCutting)?.cycle ?? grp[0]?.cycle ?? 'manual',
      moves: grp,
      stations,
      outerProfile: stations.map((z, i) => ({ z, r: outerR[i] })),
      innerProfile: stations.map((z, i) => ({ z, r: innerR[i] })),
    });
  });

  return {
    stations,
    stockRadius,
    zMin,
    zMax,
    rawProfile: stations.map((z, i) => ({ z, r: rawOuter[i] })),
    rawInnerProfile: stations.map((z, i) => ({ z, r: rawInner[i] })),
    passes,
    finalOuterProfile: passes.length ? passes[passes.length - 1].outerProfile : stations.map((z, i) => ({ z, r: rawOuter[i] })),
    finalInnerProfile: passes.length ? passes[passes.length - 1].innerProfile : stations.map((z, i) => ({ z, r: rawInner[i] })),
  };
}

export default { buildPasses };
