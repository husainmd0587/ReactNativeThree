/**
 * toolpathToPasses.js
 *
 * Consumes the flat move list from latheInterpreter and produces:
 *  1. `passes`: an ordered array of { id, cycle, moves, outerProfile, innerProfile,
 *     newRadialFeature, radialFeaturesSoFar }
 *     - one pass = one continuous cutting excursion between two rapid retracts.
 *     - each pass carries the OUTER radius-vs-Z profile of the stock *after* that
 *       pass has completed (used to build the "reveal" mesh for that pass).
 *     - radial-drill passes (G184) carry zero isCutting moves - they don't touch
 *       the axisymmetric profile at all - but ARE real passes; see radialCSG.js
 *       for how those get turned into actual geometry via boolean subtraction.
 *  2. `rawProfile`: the starting stock outer profile (before any cutting).
 *  3. `finalOuterProfile` / `finalInnerProfile` / `finalRadialFeatures`: state
 *     after the last pass — used to build the finished-part mesh.
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
 * Radius at a given Z along a TRUE arc (G2/G3), not the straight-line chord
 * between its endpoints. Works in radius units throughout (center/from/to are
 * all in diameter units per latheInterpreter.js's convention, so /2 first).
 *
 * Solves the circle (r - centerR)^2 + (z - centerZ)^2 = R^2 for r. This has two
 * solutions (the arc's "near" and "far" side of the center); we pick whichever
 * matches the side the endpoints are actually on. This assumes the arc doesn't
 * cross the center's radius level mid-arc (true for essentially all real corner
 * fillets and radiused profiles on a lathe - arcs that loop past their own
 * center are not something canned turning cycles produce).
 */
function radiusAtZForArc(from, to, center, z) {
  const fromR = radiusOf(from.x);
  const toR = radiusOf(to.x);
  const centerR = radiusOf(center.x);
  const centerZ = center.z;

  const R = Math.hypot(fromR - centerR, from.z - centerZ);
  if (R < 1e-6) return fromR; // degenerate arc, fall back to a point

  const dz = z - centerZ;
  const discriminant = R * R - dz * dz;
  if (discriminant < 0) {
    // z is outside the circle's reach at all (can happen right at a station
    // boundary due to floating point) - clamp to the nearest valid endpoint.
    return Math.abs(z - from.z) <= Math.abs(z - to.z) ? fromR : toR;
  }

  const halfChord = Math.sqrt(discriminant);
  const rPlus = centerR + halfChord;
  const rMinus = centerR - halfChord;

  // Pick the side matching the endpoints (whichever side of centerR they're on).
  const sign = Math.sign(fromR - centerR) || Math.sign(toR - centerR) || 1;
  return sign >= 0 ? rPlus : rMinus;
}

/**
 * Radius at a given Z for a threading move, using the move's `thread` metadata
 * (see expandG76 in latheInterpreter.js). Modulates the radius into a
 * symmetric triangular wave along Z - crest (majorRadius) at multiples of the
 * pitch from `zOrigin`, root (minorRadius) at odd half-pitch offsets - instead
 * of a flat constant-radius groove. This is a real V-thread PROFILE (correct
 * crest/root geometry at every Z station), not a true helical toolpath -
 * there's no X+Z+spindle-synchronized 3D motion here, just a radius-vs-Z
 * function shaped like one. `angleDeg` isn't used in the wave shape itself
 * (a symmetric triangle already approximates a standard V-thread reasonably
 * for visualization) - it's kept in the metadata for a future upgrade that
 * wants the true asymmetric flank geometry.
 */
function radiusAtZForThread(move, z) {
  const { pitch, majorRadius, minorRadius, zOrigin } = move.thread;
  const half = pitch / 2;
  let rel = Math.abs(z - zOrigin) % pitch;
  if (rel < 0) rel += pitch;
  const t = rel <= half ? rel / half : (pitch - rel) / half; // 0 at crest, 1 at root
  return majorRadius - (majorRadius - minorRadius) * t;
}

/**
 * Rasterize one cutting move onto the station grid, updating outer/inner radius arrays.
 * - "outer" cuts (tool approaches from stock OD inward) LOWER the outer radius.
 * - "bore" cuts (drilling/boring near/at centerline) RAISE the inner radius (hole size).
 * We classify a move as a bore cut if its average X is below `boreThreshold` (near axis)
 * AND it's primarily axial (Z-dominant) motion — i.e. drilling, not facing to center.
 */
function applyMoveToProfile(move, stations, outerR, innerR, boreThreshold) {
  const { from, to, center, type, thread } = move;
  const zLo = Math.min(from.z, to.z);
  const zHi = Math.max(from.z, to.z);
  const isAxialDominant = Math.abs(to.z - from.z) >= Math.abs(to.x - from.x);
  const avgX = (from.x + to.x) / 2;
  const isBoreCut = isAxialDominant && radiusOf(avgX) <= boreThreshold;
  const isArc = (type === 'arcCW' || type === 'arcCCW') && center;
  const isThread = !!thread;

  for (let i = 0; i < stations.length; i++) {
    const z = stations[i];
    if (z < zLo - 1e-6 || z > zHi + 1e-6) continue;
    const r = isThread ? radiusAtZForThread(move, z) : isArc ? radiusAtZForArc(from, to, center, z) : radiusAtZ(from, to, z);
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
  //
  // EXCEPTION: G74 (peck drilling) and G75 (peck grooving) retract between pecks
  // purely for chip clearing - that's not a new material-removal pass, it's one
  // continuous drilling/grooving operation. Splitting on every peck retreat turned
  // a single 15mm-deep hole into ~5 near-instant "passes" that flew by too fast to
  // see individually (and caused rapid mesh swaps / flicker). Roughing cycles
  // (G71/G72/G76) DO get a fresh pass per depth-of-cut - that's the correct,
  // visually meaningful granularity for those.
  const NO_RETRACT_SPLIT_CYCLES = new Set(['G74', 'G75']);

  const passesRaw = [];
  let current = [];
  let lastCycle = null;
  let sawCutInCurrent = false;

  for (const mv of moves) {
    if (mv.type === 'radialDrill') {
      // Each radial-drill line is its OWN pass, always - two consecutive G184
      // lines share the same cycle value ('G184'), so the cycleChanged check
      // below never separates them, and they're not 'rapid' type so the
      // retract-based split doesn't fire either. Force isolation explicitly.
      if (current.length) {
        passesRaw.push(current);
        current = [];
        sawCutInCurrent = false;
      }
      passesRaw.push([mv]);
      lastCycle = mv.cycle;
      continue;
    }

    const cycleChanged = lastCycle !== null && mv.cycle !== lastCycle;
    if (cycleChanged && current.length) {
      passesRaw.push(current);
      current = [];
      sawCutInCurrent = false;
    }
    current.push(mv);
    lastCycle = mv.cycle;
    if (mv.isCutting) sawCutInCurrent = true;
    if (mv.type === 'rapid' && sawCutInCurrent && !NO_RETRACT_SPLIT_CYCLES.has(mv.cycle)) {
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
  // the next pass so we don't render empty "passes". A group with a radial-drill
  // feature has zero isCutting moves (it doesn't touch the axisymmetric X/Z
  // profile at all) but is NOT empty - it must stay its own pass.
  const hasContent = (grp) => grp.some((m) => m.isCutting || m.type === 'radialDrill');
  const grouped = [];
  for (const grp of passesRaw) {
    const hasCut = hasContent(grp);
    if (!hasCut && grouped.length === 0) {
      grouped.push(grp); // keep leading approach with first real pass below
      continue;
    }
    if (!hasCut && grouped.length > 0) {
      grouped[grouped.length - 1] = grouped[grouped.length - 1].concat(grp);
      continue;
    }
    if (grouped.length && !hasContent(grouped[grouped.length - 1]) && grouped.length === 1) {
      grouped[0] = grouped[0].concat(grp);
    } else {
      grouped.push(grp);
    }
  }

  let runningOuter = rawOuter.slice();
  let runningInner = rawInner.slice();
  let runningRadialFeatures = [];
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

    const radialMoves = grp.filter((m) => m.type === 'radialDrill');
    const cuttingMoves = grp.filter((m) => m.isCutting);
    if (cuttingMoves.length === 0 && radialMoves.length === 0 && idx !== 0) return; // skip genuinely empty non-leading groups

    // Radial features accumulate permanently, same as outer/inner profiles - once
    // a hole is drilled it stays drilled through every subsequent pass.
    const newFeatures = radialMoves.map((m) => m.radial);
    if (newFeatures.length) runningRadialFeatures = [...runningRadialFeatures, ...newFeatures];

    passes.push({
      id: idx,
      cycle: grp.find((m) => m.isCutting || m.type === 'radialDrill')?.cycle ?? grp[0]?.cycle ?? 'manual',
      moves: grp,
      stations,
      outerProfile: stations.map((z, i) => ({ z, r: outerR[i] })),
      innerProfile: stations.map((z, i) => ({ z, r: innerR[i] })),
      // Only set on the pass that ACTUALLY drills a radial hole (drives the
      // stepped CSG plunge animation); radialFeaturesSoFar is the full
      // cumulative list every pass carries forward (drives the permanent cut).
      newRadialFeature: newFeatures[0] ?? null,
      radialFeaturesSoFar: runningRadialFeatures,
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
    finalRadialFeatures: passes.length ? passes[passes.length - 1].radialFeaturesSoFar : [],
  };
}

export default { buildPasses };
