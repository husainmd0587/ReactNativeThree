/**
 * abbDialect.js
 *
 * Parses a realistic SUBSET of ABB RAPID syntax into the same internal
 * instruction list every other dialect produces. Real RAPID is a full
 * language (procedures, variables, IF/FOR, multiple motion types,
 * work objects) - this covers only joint motion, waits, and a digital
 * output convention for the gripper, which is what this simulator can
 * actually act on.
 *
 * Supported syntax (one statement per line; `!` starts a comment;
 * trailing `;` optional):
 *
 *   MoveAbsJ [[j1,j2,j3,j4],[0,0,0,0]], v100, fine, tool0;
 *   WaitTime 1;
 *   Set doGripper;      -> closes the gripper
 *   Reset doGripper;    -> opens the gripper
 *   Home;                -> not standard RAPID, but ABB programs
 *                          conventionally define a PROC Home() that
 *                          does exactly this; treated as a direct call
 *                          for teaching purposes.
 *
 * The [[...],[...]] robjoint form's second array (configuration data)
 * is accepted but ignored - this simulator doesn't model axis
 * configuration/turns.
 */

import { INSTRUCTION_TYPES, buildJointNameMap } from '../ProgramInterpreter';

export const ABB_EXAMPLE = `MoveAbsJ [[-41,-76,-136,96],[0,0,0,0]], v100, fine, tool0;
WaitTime 0.5;
Set doGripper;
WaitTime 0.3;
MoveAbsJ [[-146,-73,-138,74],[0,0,0,0]], v100, fine, tool0;
WaitTime 0.5;
Reset doGripper;
WaitTime 0.5;
Home;`;

export function parseAbbProgram(text, definition) {
  const jointIdByShortName = buildJointNameMap(definition);
  const jointIds = Object.keys(jointIdByShortName)
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map((k) => jointIdByShortName[k]);

  const instructions = [];
  const errors = [];

  (text || '').split('\n').forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim().replace(/;$/, '');

    if (!line || line.startsWith('!')) return;

    if (/^home$/i.test(line)) {
      instructions.push({ type: INSTRUCTION_TYPES.HOME, args: {}, line: lineNumber });
      return;
    }

    const moveMatch = line.match(/^MoveAbsJ\s*\[\s*\[([^\]]*)\]/i);
    if (moveMatch) {
      const values = moveMatch[1].split(',').map((v) => parseFloat(v.trim()));
      if (values.some(Number.isNaN)) {
        errors.push({ line: lineNumber, message: `Invalid joint values in MoveAbsJ: [${moveMatch[1]}]` });
        return;
      }

      const jointTargets = {};
      values.forEach((value, i) => {
        if (jointIds[i]) jointTargets[jointIds[i]] = value;
      });

      const speedMatch = line.match(/\bv(\d+(?:\.\d+)?)\b/i);
      const speed = speedMatch ? parseFloat(speedMatch[1]) : undefined;

      instructions.push({ type: INSTRUCTION_TYPES.MOVEJ, args: { jointTargets, speed }, line: lineNumber });
      return;
    }

    const waitMatch = line.match(/^WaitTime\s+(\S+)/i);
    if (waitMatch) {
      const seconds = parseFloat(waitMatch[1]);
      if (Number.isNaN(seconds)) {
        errors.push({ line: lineNumber, message: `Invalid value: WaitTime ${waitMatch[1]}` });
        return;
      }
      instructions.push({ type: INSTRUCTION_TYPES.WAIT, args: { seconds }, line: lineNumber });
      return;
    }

    if (/^Set\s+\S+/i.test(line)) {
      instructions.push({ type: INSTRUCTION_TYPES.GRIP, args: { state: 'CLOSE' }, line: lineNumber });
      return;
    }

    if (/^Reset\s+\S+/i.test(line)) {
      instructions.push({ type: INSTRUCTION_TYPES.GRIP, args: { state: 'OPEN' }, line: lineNumber });
      return;
    }

    errors.push({ line: lineNumber, message: `Unknown or unsupported RAPID statement: ${line}` });
  });

  return { instructions, errors };
}
