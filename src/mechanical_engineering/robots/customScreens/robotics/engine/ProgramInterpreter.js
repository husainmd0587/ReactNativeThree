/**
 * ProgramInterpreter.js
 *
 * Parses the small educational robot programming language into a list
 * of instructions the ProgramExecutor (see RobotEngine.js) can step
 * through. Pure functions only - no engine/state/rendering knowledge.
 *
 * Supported syntax (one instruction per line, blank lines and lines
 * starting with # are ignored):
 *
 *   HOME
 *   MOVEJ J1=30 J2=45 J3=20 SPEED=50
 *   WAIT 1
 *   GRIP OPEN
 *   GRIP CLOSE
 *
 * Pipeline:
 *   Program Text -> Tokenizer/Parser -> Instruction List -> Executor
 */

export const INSTRUCTION_TYPES = Object.freeze({
  HOME: 'HOME',
  MOVEJ: 'MOVEJ',
  WAIT: 'WAIT',
  GRIP: 'GRIP',
});

/**
 * Parses program text against a robot definition (so joint names like
 * J1/J2/J3 can be validated and mapped to real joint ids).
 *
 * Returns { instructions, errors }. `errors` is an array of
 * { line, message } - the caller decides whether to block execution
 * on errors or just surface them.
 */
export function parseProgram(text, definition) {
  const jointIdByShortName = buildJointNameMap(definition);
  const instructions = [];
  const errors = [];

  const lines = (text || '').split('\n');

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) return;

    const [commandRaw, ...rest] = line.split(/\s+/);
    const command = commandRaw.toUpperCase();

    if (command === INSTRUCTION_TYPES.HOME) {
      instructions.push({ type: INSTRUCTION_TYPES.HOME, args: {}, line: lineNumber });
      return;
    }

    if (command === INSTRUCTION_TYPES.WAIT) {
      const seconds = parseFloat(rest[0]);
      if (Number.isNaN(seconds)) {
        errors.push({ line: lineNumber, message: `Invalid value: WAIT ${rest[0] ?? ''}`.trim() });
        return;
      }
      instructions.push({ type: INSTRUCTION_TYPES.WAIT, args: { seconds }, line: lineNumber });
      return;
    }

    if (command === INSTRUCTION_TYPES.GRIP) {
      const state = (rest[0] || '').toUpperCase();
      if (state !== 'OPEN' && state !== 'CLOSE') {
        errors.push({ line: lineNumber, message: `Invalid GRIP state: ${rest[0] ?? ''}`.trim() });
        return;
      }
      instructions.push({ type: INSTRUCTION_TYPES.GRIP, args: { state }, line: lineNumber });
      return;
    }

    if (command === INSTRUCTION_TYPES.MOVEJ) {
      const jointTargets = {};
      let speed;
      let hasError = false;

      rest.forEach((token) => {
        const [key, rawValue] = token.split('=');
        if (!key || rawValue === undefined) {
          errors.push({ line: lineNumber, message: `Malformed argument: ${token}` });
          hasError = true;
          return;
        }

        if (key.toUpperCase() === 'SPEED') {
          const value = parseFloat(rawValue);
          if (Number.isNaN(value)) {
            errors.push({ line: lineNumber, message: `Invalid value: SPEED=${rawValue}` });
            hasError = true;
            return;
          }
          speed = value;
          return;
        }

        const jointId = jointIdByShortName[key.toUpperCase()];
        if (!jointId) {
          errors.push({ line: lineNumber, message: `Invalid joint: ${key}` });
          hasError = true;
          return;
        }

        const value = parseFloat(rawValue);
        if (Number.isNaN(value)) {
          errors.push({ line: lineNumber, message: `Invalid value: ${key}=${rawValue}` });
          hasError = true;
          return;
        }

        jointTargets[jointId] = value;
      });

      if (!hasError) {
        instructions.push({
          type: INSTRUCTION_TYPES.MOVEJ,
          args: { jointTargets, speed },
          line: lineNumber,
        });
      }
      return;
    }

    errors.push({ line: lineNumber, message: `Unknown command: ${commandRaw}` });
  });

  return { instructions, errors };
}

/**
 * Maps short program names (J1, J2, J3, ...) to the robot's actual
 * joint ids, in definition order - so this works for any joint count,
 * not just a hardcoded 3.
 */
function buildJointNameMap(definition) {
  const map = {};
  (definition?.joints || []).forEach((joint, index) => {
    map[`J${index + 1}`] = joint.id;
  });
  return map;
}
