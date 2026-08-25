/**
 * fanucDialect.js
 *
 * Parses a realistic SUBSET of Fanuc TP (teach pendant) syntax. Real
 * Fanuc programs move to POSITION REGISTERS taught on the physical
 * pendant, not inline coordinates - so unlike the other dialects here,
 * this one models that two-step structure: define a register's joint
 * values with `PR[n] = {...}`, then reference it in a motion line.
 * Full TP also has skip conditions, offsets, and multiple motion
 * types (J/L/C) - only joint moves are supported here, since that's
 * all this simulator can execute without real inverse kinematics.
 *
 * Supported syntax (one statement per line; `!` or `//` starts a
 * comment):
 *
 *   PR[1] = {J1 30}
 *   J HOME 100% FINE
 *   J PR[1] 100% FINE
 *   WAIT 0.5(sec)
 *   DOUT[1]=ON      -> closes the gripper
 *   DOUT[1]=OFF     -> opens the gripper
 *
 * As with the KUKA dialect, the DOUT number is accepted but not
 * validated against anything specific - it's treated as whichever
 * output the gripper is wired to, same as a real cell's I/O config.
 *
 * NOTE on FANUC_EXAMPLE below: only J1 moves, by a modest safe delta -
 * see simpleDialect.js's header for why (can't verify multi-joint
 * reach targets against geometry this environment can't fetch).
 */

import { INSTRUCTION_TYPES, buildJointNameMap } from '../ProgramInterpreter';

export const FANUC_EXAMPLE = `PR[1] = {J1 30}
PR[2] = {J1 -30}
J HOME 100% FINE
J PR[1] 40% FINE
WAIT 0.5(sec)
DOUT[1]=ON
WAIT 0.3(sec)
J PR[2] 40% FINE
WAIT 0.5(sec)
DOUT[1]=OFF
WAIT 0.5(sec)
J HOME 100% FINE`;

export function parseFanucProgram(text, definition) {
  const jointIdByShortName = buildJointNameMap(definition);
  const instructions = [];
  const errors = [];
  const registers = {}; // PR[n] -> { jointId: value }

  (text || '').split('\n').forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.split(/!|\/\//)[0].trim();

    if (!line) return;

    const prMatch = line.match(/^PR\[(\d+)\]\s*=\s*\{([^}]*)\}/i);
    if (prMatch) {
      const regNum = prMatch[1];
      const jointValues = {};
      let hasError = false;

      prMatch[2].split(',').forEach((pair) => {
        const [axis, rawValue] = pair.trim().split(/\s+/);
        const jointId = jointIdByShortName[(axis || '').toUpperCase()];
        if (!jointId) {
          errors.push({ line: lineNumber, message: `Invalid joint: ${axis}` });
          hasError = true;
          return;
        }
        const value = parseFloat(rawValue);
        if (Number.isNaN(value)) {
          errors.push({ line: lineNumber, message: `Invalid value: ${axis} ${rawValue}` });
          hasError = true;
          return;
        }
        jointValues[jointId] = value;
      });

      if (!hasError) registers[regNum] = jointValues;
      return;
    }

    if (/^J\s+HOME\b/i.test(line)) {
      instructions.push({ type: INSTRUCTION_TYPES.HOME, args: {}, line: lineNumber });
      return;
    }

    const moveMatch = line.match(/^J\s+PR\[(\d+)\]\s*(\d+(?:\.\d+)?)?%?/i);
    if (moveMatch) {
      const regNum = moveMatch[1];
      const jointTargets = registers[regNum];
      if (!jointTargets) {
        errors.push({ line: lineNumber, message: `Undefined position register: PR[${regNum}]` });
        return;
      }
      const speed = moveMatch[2] ? parseFloat(moveMatch[2]) : undefined;
      instructions.push({ type: INSTRUCTION_TYPES.MOVEJ, args: { jointTargets, speed }, line: lineNumber });
      return;
    }

    const waitMatch = line.match(/^WAIT\s+(\S+?)(?:\(sec\))?$/i);
    if (waitMatch) {
      const seconds = parseFloat(waitMatch[1]);
      if (Number.isNaN(seconds)) {
        errors.push({ line: lineNumber, message: `Invalid value: WAIT ${waitMatch[1]}` });
        return;
      }
      instructions.push({ type: INSTRUCTION_TYPES.WAIT, args: { seconds }, line: lineNumber });
      return;
    }

    const doutMatch = line.match(/^DOUT\[\d+\]\s*=\s*(ON|OFF)/i);
    if (doutMatch) {
      const state = doutMatch[1].toUpperCase() === 'ON' ? 'CLOSE' : 'OPEN';
      instructions.push({ type: INSTRUCTION_TYPES.GRIP, args: { state }, line: lineNumber });
      return;
    }

    errors.push({ line: lineNumber, message: `Unknown or unsupported TP statement: ${line}` });
  });

  return { instructions, errors };
}
