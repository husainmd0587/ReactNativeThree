/**
 * programValidator.js
 *
 * Runs BEFORE simulation starts, not during it - matches the requested flow:
 *   G-code -> Parser -> Validator -> Safety & Geometry Checks -> Simulation
 *
 * Combines:
 *  - gcodeLinter.js's existing syntax/semantic checks (unknown codes, bad P/Q
 *    blocks, etc.)
 *  - NEW: modal-state checks (feed/spindle/tool never set before a cutting move)
 *  - NEW: machine-limit checks (X/Z travel, spindle RPM, feed rate)
 *  - NEW: chuck/stock collision checks (tool path entering the chuck's physical
 *    envelope) - this is the actual protective mechanism behind "wrong taper
 *    direction" concerns: the engine has no hardcoded/assumed cutting direction
 *    (every move comes straight from the programmed X/Z), so there's nothing to
 *    be "wrong" about direction-wise - what actually matters is whether ANY
 *    move, from any operation, ends up somewhere unsafe. This check is
 *    direction-agnostic and catches that regardless of which operation caused it.
 *
 * Chuck geometry here is computed with the SAME formula components/Chuck.jsx
 * actually uses, so the reported safety boundary matches what's really on screen
 * (not a separate, possibly-inconsistent guess at where the chuck is).
 */

import { interpretGCode } from './engine/latheInterpreter.js';
import { tokenizeProgram } from './engine/tokenizer.js';
import { lintProgram } from './gcodeLinter.js';
import { DEFAULT_MACHINE_LIMITS } from './machineLimits.js';

function radiusOf(diameterX) {
  return Math.max(0, diameterX / 2);
}

/** Same boundary math as Chuck.jsx's chuckCenterY/resolvedGap - kept in sync deliberately. */
function chuckFrontFaceZ(stockConfig) {
  const stockRadius = (stockConfig?.stockDiameter ?? 40) / 2;
  const zMin = (stockConfig?.zFace ?? 0) - (stockConfig?.stockLength ?? 80);
  const gap = Math.max(4, stockRadius * 0.5);
  return { chuckFrontFace: zMin - gap, zMin };
}

function checkChuckSafety(moves, stockConfig) {
  const { chuckFrontFace, zMin } = chuckFrontFaceZ(stockConfig);
  const issues = [];
  for (const m of moves) {
    if (m.type === 'radialDrill') continue; // doesn't move the carriage
    const zEnd = m.to?.z;
    if (zEnd === undefined) continue;
    if (zEnd < chuckFrontFace) {
      issues.push({
        line: m.lineIndex,
        severity: 'error',
        message: `Tool path enters the chuck safety zone (Z=${zEnd.toFixed(2)}, chuck starts at Z=${chuckFrontFace.toFixed(2)}). X=${(m.to.x).toFixed(1)}.`,
        location: { x: m.to.x, z: zEnd },
        kind: 'chuck-collision',
      });
    } else if (zEnd < zMin) {
      issues.push({
        line: m.lineIndex,
        severity: 'warning',
        message: `Tool path travels beyond the programmed stock length (Z=${zEnd.toFixed(2)}, stock ends at Z=${zMin.toFixed(2)}).`,
        location: { x: m.to.x, z: zEnd },
        kind: 'beyond-stock',
      });
    }
  }
  return issues;
}

function checkMachineLimits(moves, limits) {
  const issues = [];
  let lastFlaggedSpindle = null;
  for (const m of moves) {
    if (m.to?.x !== undefined && m.to.x > limits.maxDiameter) {
      issues.push({
        line: m.lineIndex,
        severity: 'error',
        message: `X${m.to.x} exceeds machine diameter limit (max X${limits.maxDiameter}).`,
        location: { x: m.to.x, z: m.to.z },
        kind: 'machine-limit',
      });
    }
    if (m.to?.z !== undefined && (m.to.z < limits.minZ || m.to.z > limits.maxZ)) {
      issues.push({
        line: m.lineIndex,
        severity: 'error',
        message: `Z${m.to.z} is outside the machine's Z travel (${limits.minZ} to ${limits.maxZ}).`,
        location: { x: m.to.x, z: m.to.z },
        kind: 'machine-limit',
      });
    }
    // Only flag when the spindle speed actually CHANGES to a new over-limit
    // value - state persists onto every subsequent move, so without this the
    // same violation gets reported once per move for the rest of the program.
    if (m.spindleSpeed > limits.maxSpindleRPM && m.spindleSpeed !== lastFlaggedSpindle) {
      lastFlaggedSpindle = m.spindleSpeed;
      issues.push({
        line: m.lineIndex,
        severity: 'error',
        message: `S${m.spindleSpeed} exceeds max spindle speed (${limits.maxSpindleRPM} RPM).`,
        kind: 'machine-limit',
      });
    }
    if (m.isCutting && m.feed > limits.maxFeedRate) {
      issues.push({
        line: m.lineIndex,
        severity: 'warning',
        message: `F${m.feed} exceeds the configured max feed rate (${limits.maxFeedRate}).`,
        kind: 'machine-limit',
      });
    }
  }
  return issues;
}

/**
 * Modal-state checks: was feed/spindle/tool actually SET (as literal words in
 * the source) before the first cutting move that needs them? We scan raw
 * TOKENS rather than move.feed/move.spindleSpeed, because those always carry
 * the interpreter's default value (see latheInterpreter.js's makeState()) even
 * when the user never wrote an F or S word at all - checking the interpreted
 * state can never detect "this was never actually specified."
 */
function checkModalState(gcodeText, moves) {
  const issues = [];
  const firstCuttingMove = moves.find((m) => m.isCutting);
  if (!firstCuttingMove) return issues;
  const firstCutLine = firstCuttingMove.lineIndex;

  const tokens = tokenizeProgram(gcodeText);
  let sawF = false;
  let sawS = false;
  let sawSpindleOn = false;
  let sawT = false;
  for (const tok of tokens) {
    if (tok.lineIndex > firstCutLine) break;
    for (const a of tok.addresses) {
      if (a.address === 'F') sawF = true;
      if (a.address === 'S') sawS = true;
      if (a.address === 'T') sawT = true;
      if (a.address === 'M' && (a.value === 3 || a.value === 4)) sawSpindleOn = true;
    }
  }

  if (!sawF) {
    issues.push({ line: firstCutLine, severity: 'warning', message: 'No feed rate (F) was ever specified before the first cutting move.', kind: 'modal' });
  }
  if (!sawS) {
    issues.push({ line: firstCutLine, severity: 'warning', message: 'Spindle speed (S) was never specified before the first cutting move.', kind: 'modal' });
  }
  if (!sawSpindleOn) {
    issues.push({ line: firstCutLine, severity: 'warning', message: 'Spindle was never turned on (M3/M4) before the first cutting move.', kind: 'modal' });
  }
  if (!sawT) {
    issues.push({ line: firstCutLine, severity: 'warning', message: 'No tool (T) was ever selected before the first cutting move.', kind: 'modal' });
  }
  return issues;
}

/**
 * Full validation pass. Returns:
 *   { issues, blocked, blockingIssue }
 * `blocked` is true only for issues serious enough that running anyway is
 * genuinely risky (chuck collisions, hard machine-limit violations) - syntax
 * warnings and modal-state notes never block, matching "for serious
 * machine-limit violations, execution should preferably be blocked" while not
 * being so aggressive that ordinary warnings stop the user from ever running.
 */
export function validateProgram(gcodeText, stockConfig, machineLimits = DEFAULT_MACHINE_LIMITS) {
  const syntaxIssues = lintProgram(gcodeText);

  let moves = [];
  try {
    moves = interpretGCode(gcodeText).moves;
  } catch (err) {
    return {
      issues: [...syntaxIssues, { line: 0, severity: 'error', message: `Program failed to interpret: ${err.message}`, kind: 'interpret' }],
      blocked: true,
      blockingIssue: null,
    };
  }

  const issues = [
    ...syntaxIssues,
    ...checkChuckSafety(moves, stockConfig),
    ...checkMachineLimits(moves, machineLimits),
    ...checkModalState(gcodeText, moves),
  ];

  const BLOCKING_KINDS = new Set(['chuck-collision', 'machine-limit']);
  const blockingIssue = issues.find((i) => i.severity === 'error' && BLOCKING_KINDS.has(i.kind)) ?? null;

  return { issues, blocked: blockingIssue !== null, blockingIssue };
}

export default { validateProgram };
