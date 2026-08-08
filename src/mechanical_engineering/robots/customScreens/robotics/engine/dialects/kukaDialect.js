/**
 * kukaDialect.js
 *
 * Parses a realistic SUBSET of KUKA KRL syntax. Real KRL is a full
 * Pascal-like language (DEF/END, variables, LOOP, IF, tool/base
 * frames, multiple motion types) - this covers only PTP joint motion,
 * waits, and the $OUT digital-output convention for the gripper.
 *
 * Supported syntax (one statement per line; `;` starts a comment):
 *
 *   PTP HOME
 *   PTP {A1 -41, A2 -76, A3 -136, A4 96}
 *   PTP {A1 0, A2 0, A3 0, A4 0} VEL=60      (optional VEL= for speed)
 *   WAIT SEC 1
 *   $OUT[1] = TRUE     -> closes the gripper
 *   $OUT[1] = FALSE    -> opens the gripper
 *
 * The output number in $OUT[n] is accepted but not validated against
 * anything - this simulator assumes whichever output number is used
 * is the configured gripper signal, same as a real cell's I/O mapping
 * would be set up by the integrator.
 */

import { INSTRUCTION_TYPES, buildJointNameMap } from '../ProgramInterpreter';

export const KUKA_EXAMPLE = `PTP HOME
PTP {A1 -41, A2 -76, A3 -136, A4 96} VEL=60
WAIT SEC 0.5
$OUT[1] = TRUE
WAIT SEC 0.3
PTP {A1 -146, A2 -73, A3 -138, A4 74} VEL=60
WAIT SEC 0.5
$OUT[1] = FALSE
WAIT SEC 0.5
PTP HOME`;

export function parseKukaProgram(text, definition) {
  const jointIdByShortName = buildJointNameMap(definition);
  // KRL axis names are A1, A2, A3... - reuse the same J1/J2 mapping by index.
  const axisToJointId = {};
  Object.keys(jointIdByShortName).forEach((jKey) => {
    axisToJointId[jKey.replace('J', 'A')] = jointIdByShortName[jKey];
  });

  const instructions = [];
  const errors = [];

  (text || '').split('\n').forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.split(';')[0].trim(); // ';' starts a KRL comment

    if (!line) return;

    if (/^PTP\s+HOME$/i.test(line)) {
      instructions.push({ type: INSTRUCTION_TYPES.HOME, args: {}, line: lineNumber });
      return;
    }

    const ptpMatch = line.match(/^PTP\s*\{([^}]*)\}\s*(.*)$/i);
    if (ptpMatch) {
      const jointTargets = {};
      let hasError = false;

      ptpMatch[1].split(',').forEach((pair) => {
        const [axis, rawValue] = pair.trim().split(/\s+/);
        if (!axis || rawValue === undefined) {
          errors.push({ line: lineNumber, message: `Malformed axis entry: ${pair.trim()}` });
          hasError = true;
          return;
        }
        const jointId = axisToJointId[axis.toUpperCase()];
        if (!jointId) {
          errors.push({ line: lineNumber, message: `Invalid axis: ${axis}` });
          hasError = true;
          return;
        }
        const value = parseFloat(rawValue);
        if (Number.isNaN(value)) {
          errors.push({ line: lineNumber, message: `Invalid value: ${axis} ${rawValue}` });
          hasError = true;
          return;
        }
        jointTargets[jointId] = value;
      });

      if (!hasError) {
        const speedMatch = ptpMatch[2].match(/VEL\s*=\s*(\d+(?:\.\d+)?)/i);
        const speed = speedMatch ? parseFloat(speedMatch[1]) : undefined;
        instructions.push({ type: INSTRUCTION_TYPES.MOVEJ, args: { jointTargets, speed }, line: lineNumber });
      }
      return;
    }

    const waitMatch = line.match(/^WAIT\s+SEC\s+(\S+)/i);
    if (waitMatch) {
      const seconds = parseFloat(waitMatch[1]);
      if (Number.isNaN(seconds)) {
        errors.push({ line: lineNumber, message: `Invalid value: WAIT SEC ${waitMatch[1]}` });
        return;
      }
      instructions.push({ type: INSTRUCTION_TYPES.WAIT, args: { seconds }, line: lineNumber });
      return;
    }

    const outMatch = line.match(/^\$OUT\[\d+\]\s*=\s*(TRUE|FALSE)/i);
    if (outMatch) {
      const state = outMatch[1].toUpperCase() === 'TRUE' ? 'CLOSE' : 'OPEN';
      instructions.push({ type: INSTRUCTION_TYPES.GRIP, args: { state }, line: lineNumber });
      return;
    }

    errors.push({ line: lineNumber, message: `Unknown or unsupported KRL statement: ${line}` });
  });

  return { instructions, errors };
}
