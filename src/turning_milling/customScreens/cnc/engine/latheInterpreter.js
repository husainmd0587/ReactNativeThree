/**
 * latheInterpreter.js
 *
 * Turns tokenized G-code into a flat, ordered list of "moves" that the rest of the
 * pipeline (toolpathToPasses -> latheGeometryBuilder) consumes. This is the only
 * file that understands G-code semantics; everything downstream just sees moves.
 *
 * CONVENTIONS (standard Fanuc-style lathe, matches Indian ITI/polytechnic teaching):
 *  - X is DIAMETER, not radius (i.e. X40 means the tool is at a 40mm diameter).
 *    Internally we keep X in the same "diameter" units the program uses; radius
 *    conversion (X/2) happens in toolpathToPasses.js, not here.
 *  - Z is axial position. Z0 is conventionally the finished face of the part;
 *    stock extends in -Z. Tool approaches the work from +X toward the axis (X0).
 *  - I is the incremental radius-distance (not diameter) from the arc start point
 *    to the arc center along X. K is the incremental Z distance to the arc center.
 *  - U/W are incremental X/Z moves (U in diameter units, same as X).
 *
 * MOVE OBJECT SHAPE:
 *  {
 *    lineIndex, type: 'rapid'|'feed'|'arcCW'|'arcCCW'|'dwell',
 *    from: {x,z}, to: {x,z}, center: {x,z}|null,
 *    feed, feedMode: 'perMin'|'perRev', spindleSpeed, toolNumber,
 *    cycle: 'manual'|'G71'|'G72'|'G70'|'G74'|'G75'|'G76',
 *    isCutting: boolean   // false for rapids/retracts, true for feed moves that remove stock
 *  }
 */

import { tokenizeProgram } from './tokenizer.js';

const DEFAULTS = {
  units: 'mm', // 'mm' | 'in'
  diameterMode: true,
};

function makeState() {
  return {
    absolute: true,
    units: DEFAULTS.units,
    feedMode: 'perMin',
    x: 0,
    z: 0,
    feed: 0.2,
    spindleSpeed: 0,
    toolNumber: 0,
    spindleOn: false,
  };
}

function addrMap(tokens) {
  const m = {};
  for (const a of tokens.addresses) m[a.address] = a.value;
  return m;
}

/** Resolve a target X/Z given current position, absolute/incremental mode, and U/W/X/Z words present. */
function resolveTarget(state, a) {
  let x = state.x;
  let z = state.z;
  if (a.X !== undefined) x = state.absolute ? a.X : state.x + a.X;
  if (a.U !== undefined) x = state.x + a.U;
  if (a.Z !== undefined) z = state.absolute ? a.Z : state.z + a.Z;
  if (a.W !== undefined) z = state.z + a.W;
  return { x, z };
}

function pushMove(moves, { lineIndex, type, from, to, center, state, cycle, isCutting }) {
  moves.push({
    lineIndex,
    type,
    from: { ...from },
    to: { ...to },
    center: center ? { ...center } : null,
    feed: state.feed,
    feedMode: state.feedMode,
    spindleSpeed: state.spindleSpeed,
    toolNumber: state.toolNumber,
    cycle: cycle || 'manual',
    isCutting: !!isCutting,
  });
}

/* ---------------------------------------------------------------------- */
/* Canned cycle expansion helpers                                         */
/* ---------------------------------------------------------------------- */

/**
 * G71 stock-removal turning cycle.
 * G71 U(depth/cut, diameter) R(retract, diameter)
 * G71 P(start N) Q(end N) U(finish allowance X, diameter) W(finish allowance Z) F(feed)
 * The P..Q blocks describe the FINISH contour as a normal chain of G0/G1/G2/G3 moves.
 * We re-simulate that chain to get the finish profile, then generate roughing passes
 * that step down in X (diameter) from current stock X to the finish contour, each pass
 * following the finish contour's Z envelope, leaving `u`/`w` allowance for the G70 finish pass.
 */
function expandG71(state, params, profileChain, moves, lineIndex) {
  const depthCut = Math.abs(params.U ?? 2); // diameter units per pass
  const retract = Math.abs(params.R ?? 1);
  const finishU = params.finishU ?? 0.5; // diameter allowance
  const finishW = params.finishW ?? 0.1;
  const feed = params.F ?? state.feed;

  if (!profileChain || profileChain.length === 0) return state;

  const startX = state.x;
  const finishPoints = profileChain; // [{x,z}], first point should be near startX

  // Find min/max X across finish contour to know how many passes needed
  const maxFinishX = Math.max(...finishPoints.map((p) => p.x));
  const stockX = Math.max(startX, maxFinishX + finishU * 2 + depthCut);

  let currentX = stockX;
  const passes = [];
  while (currentX > maxFinishX + finishU) {
    currentX = Math.max(maxFinishX + finishU, currentX - depthCut);
    passes.push(currentX);
  }

  let cursor = { x: stockX, z: state.z };
  for (const passX of passes) {
    // Rapid to start radius at first Z of contour
    const startZ = finishPoints[0].z;
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: { x: passX, z: startZ }, state, cycle: 'G71' });
    cursor = { x: passX, z: startZ };

    // Follow the finish contour's Z path, but clamp X to passX (never cut deeper than this pass),
    // offset by finish allowance in Z where the contour would go below passX.
    for (const pt of finishPoints) {
      const cutX = Math.min(passX, pt.x + finishU); // don't cut into finish allowance
      const to = { x: Math.max(cutX, pt.x), z: pt.z + (pt.z <= finishPoints.at(-1).z ? finishW : 0) };
      pushMove(moves, { lineIndex, type: 'feed', from: cursor, to, state: { ...state, feed }, cycle: 'G71', isCutting: true });
      cursor = to;
    }

    // Retract diagonally and rapid back to start for next pass
    const retractPt = { x: cursor.x + retract, z: cursor.z };
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: retractPt, state, cycle: 'G71' });
    cursor = retractPt;
  }

  state.x = cursor.x;
  state.z = cursor.z;
  return state;
}

/** G72 rough facing cycle - same idea as G71 but roughing steps down in Z instead of X. */
function expandG72(state, params, profileChain, moves, lineIndex) {
  const depthCut = Math.abs(params.W ?? 2);
  const retract = Math.abs(params.R ?? 1);
  const finishU = params.finishU ?? 0.5;
  const finishW = params.finishW ?? 0.1;
  const feed = params.F ?? state.feed;

  if (!profileChain || profileChain.length === 0) return state;

  const startZ = state.z;
  const finishPoints = profileChain;
  const minFinishZ = Math.min(...finishPoints.map((p) => p.z));
  const stockZ = Math.min(startZ, minFinishZ - finishW * 2 - depthCut);

  let currentZ = stockZ;
  const passes = [];
  while (currentZ < minFinishZ - finishW) {
    currentZ = Math.min(minFinishZ - finishW, currentZ + depthCut);
    passes.push(currentZ);
  }

  let cursor = { x: state.x, z: stockZ };
  for (const passZ of passes) {
    const startX = finishPoints[0].x;
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: { x: startX, z: passZ }, state, cycle: 'G72' });
    cursor = { x: startX, z: passZ };

    for (const pt of finishPoints) {
      const cutZ = Math.max(passZ, pt.z - finishW);
      const to = { x: pt.x + finishU, z: Math.min(cutZ, pt.z) };
      pushMove(moves, { lineIndex, type: 'feed', from: cursor, to, state: { ...state, feed }, cycle: 'G72', isCutting: true });
      cursor = to;
    }

    const retractPt = { x: cursor.x, z: cursor.z - retract };
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: retractPt, state, cycle: 'G72' });
    cursor = retractPt;
  }

  state.x = cursor.x;
  state.z = cursor.z;
  return state;
}

/** G70 finishing pass - just runs the P..Q contour once at feed rate, no stepping. */
function expandG70(state, params, profileChain, moves, lineIndex) {
  if (!profileChain || profileChain.length === 0) return state;
  const feed = params.F ?? state.feed;
  let cursor = { x: state.x, z: state.z };
  pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: profileChain[0], state, cycle: 'G70' });
  cursor = profileChain[0];
  for (const pt of profileChain) {
    pushMove(moves, { lineIndex, type: 'feed', from: cursor, to: pt, state: { ...state, feed }, cycle: 'G70', isCutting: true });
    cursor = pt;
  }
  state.x = cursor.x;
  state.z = cursor.z;
  return state;
}

/**
 * G74 peck drilling cycle. The tool travels on the centerline (X0) in real G-code -
 * the resulting bore diameter is a property of the physical drill, NOT the X word.
 * We accept a `D` word for drill diameter (a common simulator/teaching-software
 * extension; falls back to `defaultDrillDiameter` from machine config if omitted).
 * The emitted moves carry X = drill diameter (not 0) so downstream profile code can
 * treat it exactly like any other radius-producing cut.
 */
function expandG74(state, params, moves, lineIndex, defaultDrillDiameter = 8) {
  const targetZ = params.Z ?? state.z;
  const peck = Math.abs(params.K ?? 5);
  const drillDia = params.D ?? defaultDrillDiameter;
  const retreat = params.R ?? 1; // Z retreat between pecks for chip clearing
  const feed = params.F ?? state.feed;

  let z = state.z;
  let cursor = { x: drillDia, z: state.z };
  while (Math.abs(z - targetZ) > 1e-6) {
    const step = targetZ > z ? Math.min(peck, targetZ - z) : Math.max(-peck, targetZ - z);
    const nextZ = z + step;
    pushMove(moves, { lineIndex, type: 'feed', from: cursor, to: { x: drillDia, z: nextZ }, state: { ...state, feed }, cycle: 'G74', isCutting: true });
    cursor = { x: drillDia, z: nextZ };
    z = nextZ;
    if (Math.abs(z - targetZ) > 1e-6) {
      const safeBack = { x: drillDia, z: targetZ > state.z ? Math.max(state.z, z - retreat) : Math.min(state.z, z + retreat) };
      pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: safeBack, state, cycle: 'G74' });
      pushMove(moves, { lineIndex, type: 'rapid', from: safeBack, to: cursor, state, cycle: 'G74' });
    }
  }
  // Real position afterwards is back on centerline, not at the "virtual" drill diameter.
  state.x = 0;
  state.z = targetZ;
  return state;
}

/** G75 peck grooving cycle (X axis pecks at a fixed Z, e.g. a groove tool plunging). */
function expandG75(state, params, moves, lineIndex) {
  const targetX = params.X ?? state.x;
  const peck = Math.abs(params.I ?? 2);
  const targetZ = params.Z ?? state.z;
  const retreat = params.J ?? 0.5;
  const feed = params.F ?? state.feed;

  let x = state.x;
  let cursor = { x: state.x, z: state.z };
  while (Math.abs(x - targetX) > 1e-6) {
    const step = targetX < x ? Math.max(-peck, targetX - x) : Math.min(peck, targetX - x);
    const nextX = x + step;
    pushMove(moves, { lineIndex, type: 'feed', from: cursor, to: { x: nextX, z: targetZ }, state: { ...state, feed }, cycle: 'G75', isCutting: true });
    cursor = { x: nextX, z: targetZ };
    x = nextX;
    if (Math.abs(x - targetX) > 1e-6) {
      const back = { x: Math.min(state.x, x + retreat), z: targetZ };
      pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: back, state, cycle: 'G75' });
      pushMove(moves, { lineIndex, type: 'rapid', from: back, to: cursor, state, cycle: 'G75' });
    }
  }
  state.x = targetX;
  state.z = targetZ;
  return state;
}

/**
 * G76 threading cycle.
 * G76 P(finishPasses,springPasses,threadAngle) Q(min depth) R(finish allowance)
 * G76 X/U(final minor dia) Z/W(thread end) R(taper) P(thread depth, radius um) Q(first cut depth, radius um) F(lead/pitch)
 * We implement a simplified but geometrically-correct version: constant taper-flank
 * infeed threading, stepping the cut depth using the common sqrt(n) degressive-pass rule
 * so early passes are shallow and later passes are progressively deeper (standard practice).
 */
function expandG76(state, params, moves, lineIndex) {
  const startX = state.x;
  const startZ = state.z;
  const endZ = params.Z ?? params.endZ ?? state.z;
  const finalMinorX = params.X ?? startX; // diameter at root of thread
  const threadDepthTotal = Math.max(0, (startX - finalMinorX) / 2); // radius value
  const firstCutDepth = Math.max(0.01, (params.firstCut ?? 0.3) / 2); // radius, per pass 1
  const feed = params.F ?? state.feed; // lead (mm/rev) - informational only here

  // Degressive depth-of-cut passes using constant-area rule: depth_n = firstCut * sqrt(n)
  const passes = [];
  let n = 1;
  let cumDepth = 0;
  while (cumDepth < threadDepthTotal) {
    const depth = Math.min(threadDepthTotal, firstCutDepth * Math.sqrt(n));
    cumDepth = depth;
    passes.push(depth);
    n += 1;
    if (n > 60) break; // safety
  }

  let cursor = { x: startX, z: startZ };
  for (const depth of passes) {
    const passX = startX - depth * 2; // diameter
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: { x: passX, z: startZ }, state, cycle: 'G76' });
    cursor = { x: passX, z: startZ };
    pushMove(moves, {
      lineIndex,
      type: 'feed',
      from: cursor,
      to: { x: passX, z: endZ },
      state: { ...state, feed },
      cycle: 'G76',
      isCutting: true,
    });
    cursor = { x: passX, z: endZ };
    const retract = { x: startX, z: endZ };
    pushMove(moves, { lineIndex, type: 'rapid', from: cursor, to: retract, state, cycle: 'G76' });
    const back = { x: startX, z: startZ };
    pushMove(moves, { lineIndex, type: 'rapid', from: retract, to: back, state, cycle: 'G76' });
    cursor = back;
  }

  state.x = finalMinorX;
  state.z = startZ;
  return state;
}

/* ---------------------------------------------------------------------- */
/* Main interpreter                                                        */
/* ---------------------------------------------------------------------- */

export function interpretGCode(gcodeText, opts = {}) {
  const config = { ...DEFAULTS, ...opts };
  const tokens = tokenizeProgram(gcodeText);
  const state = makeState();
  const moves = [];
  const warnings = [];

  // Real-world G71/G72 programs commonly split roughing params across two blocks:
  //   G71 U2.0 R1.0          <- depth of cut / retract (no P/Q here)
  //   G71 P10 Q20 U0.5 W0.1 F0.25   <- finish allowance + contour reference
  // We accumulate the first block's params and merge them in when the P/Q block arrives.
  const pendingRoughParams = { 71: {}, 72: {} };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const a = addrMap(tok);

    if (a.G === 90) state.absolute = true;
    if (a.G === 91) state.absolute = false;
    if (a.G === 20) state.units = 'in';
    if (a.G === 21) state.units = 'mm';
    if (a.G === 94) state.feedMode = 'perMin';
    if (a.G === 95) state.feedMode = 'perRev';
    if (a.F !== undefined) state.feed = a.F;
    if (a.S !== undefined) state.spindleSpeed = a.S;
    if (a.T !== undefined) state.toolNumber = a.T;
    if (a.M === 3 || a.M === 4) state.spindleOn = true;
    if (a.M === 5) state.spindleOn = false;

    if (a.G === 0 || a.G === 1) {
      const to = resolveTarget(state, a);
      const from = { x: state.x, z: state.z };
      pushMove(moves, {
        lineIndex: tok.lineIndex,
        type: a.G === 0 ? 'rapid' : 'feed',
        from,
        to,
        state,
        cycle: 'manual',
        isCutting: a.G === 1,
      });
      state.x = to.x;
      state.z = to.z;
      continue;
    }

    if (a.G === 2 || a.G === 3) {
      const to = resolveTarget(state, a);
      const from = { x: state.x, z: state.z };
      // I is radius-increment in X (NOT diameter), K is Z increment, both from start point
      const centerX = from.x + (a.I !== undefined ? a.I * 2 : 0); // store center in diameter units to match x
      const centerZ = from.z + (a.K !== undefined ? a.K : 0);
      pushMove(moves, {
        lineIndex: tok.lineIndex,
        type: a.G === 2 ? 'arcCW' : 'arcCCW',
        from,
        to,
        center: { x: centerX, z: centerZ },
        state,
        cycle: 'manual',
        isCutting: true,
      });
      state.x = to.x;
      state.z = to.z;
      continue;
    }

    if (a.G === 4) continue; // dwell - no geometry effect

    if (a.G === 71 || a.G === 72) {
      const pStart = a.P;
      const qEnd = a.Q;

      if (pStart === undefined || qEnd === undefined) {
        // First block of a split pair: just stash depth/retract params for later.
        if (a.G === 71) pendingRoughParams[71] = { U: a.U, R: a.R };
        if (a.G === 72) pendingRoughParams[72] = { W: a.W, R: a.R };
        continue;
      }

      // Second block: has P/Q, may also carry finish-allowance U/W + feed.
      const chainTokens = tokens.filter((t) => t.lineNumber !== null && t.lineNumber >= pStart && t.lineNumber <= qEnd);
      const chainState = { x: state.x, z: state.z, absolute: state.absolute };
      const chain = [];
      for (const ct of chainTokens) {
        const ca = addrMap(ct);
        if (ca.G === 90) chainState.absolute = true;
        if (ca.G === 91) chainState.absolute = false;
        if (ca.X !== undefined || ca.Z !== undefined || ca.U !== undefined || ca.W !== undefined) {
          const pt = resolveTarget(chainState, ca);
          chain.push(pt);
          chainState.x = pt.x;
          chainState.z = pt.z;
        }
      }
      if (chain.length === 0) warnings.push(`Line ${tok.lineIndex}: G${a.G} P/Q range had no motion blocks.`);

      if (a.G === 71) {
        const rough = pendingRoughParams[71];
        expandG71(state, { U: rough.U, R: rough.R, finishU: a.U, finishW: a.W, F: a.F }, chain, moves, tok.lineIndex);
      }
      if (a.G === 72) {
        const rough = pendingRoughParams[72];
        expandG72(state, { W: rough.W, R: rough.R, finishU: a.U, finishW: a.W, F: a.F }, chain, moves, tok.lineIndex);
      }
      continue;
    }

    if (a.G === 70) {
      const pStart = a.P;
      const qEnd = a.Q;
      let chain = [];
      if (pStart !== undefined && qEnd !== undefined) {
        const chainTokens = tokens.filter((t) => t.lineNumber !== null && t.lineNumber >= pStart && t.lineNumber <= qEnd);
        const chainState = { x: state.x, z: state.z, absolute: state.absolute };
        for (const ct of chainTokens) {
          const ca = addrMap(ct);
          if (ca.G === 90) chainState.absolute = true;
          if (ca.G === 91) chainState.absolute = false;
          if (ca.X !== undefined || ca.Z !== undefined || ca.U !== undefined || ca.W !== undefined) {
            const pt = resolveTarget(chainState, ca);
            chain.push(pt);
            chainState.x = pt.x;
            chainState.z = pt.z;
          }
        }
      } else {
        warnings.push(`Line ${tok.lineIndex}: G70 missing P/Q reference, skipped.`);
      }
      expandG70(state, { F: a.F }, chain, moves, tok.lineIndex);
      continue;
    }

    if (a.G === 74) {
      expandG74(state, { Z: a.Z, K: a.K, R: a.R, F: a.F, D: a.D }, moves, tok.lineIndex, config.defaultDrillDiameter);
      continue;
    }
    if (a.G === 75) {
      expandG75(state, { X: a.X, Z: a.Z, I: a.I, J: a.J, F: a.F }, moves, tok.lineIndex);
      continue;
    }
    if (a.G === 76) {
      expandG76(state, { X: a.X, Z: a.Z, firstCut: a.Q, F: a.F }, moves, tok.lineIndex);
      continue;
    }

    if (a.G === 32) {
      // Single-pass threading == a feed move, geometrically same as G1
      const to = resolveTarget(state, a);
      pushMove(moves, { lineIndex: tok.lineIndex, type: 'feed', from: { x: state.x, z: state.z }, to, state, cycle: 'manual', isCutting: true });
      state.x = to.x;
      state.z = to.z;
      continue;
    }
  }

  return { moves, warnings, config };
}

export default { interpretGCode };
