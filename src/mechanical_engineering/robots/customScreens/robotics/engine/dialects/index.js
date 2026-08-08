/**
 * index.js (dialects)
 *
 * Registry of every supported program syntax. Every entry's parse()
 * returns the exact same { instructions, errors } shape (see
 * ProgramInterpreter.js's INSTRUCTION_TYPES) - RobotEngine and the
 * MotionController/executor never know which dialect a program was
 * written in, only the resulting instruction list. This is what lets
 * Fanuc/ABB/KUKA/Simple all run through the same execution pipeline.
 */

import { parseSimpleProgram, SIMPLE_EXAMPLE } from './simpleDialect';
import { parseFanucProgram, FANUC_EXAMPLE } from './fanucDialect';
import { parseAbbProgram, ABB_EXAMPLE } from './abbDialect';
import { parseKukaProgram, KUKA_EXAMPLE } from './kukaDialect';

export const DIALECTS = Object.freeze({
  simple: {
    id: 'simple',
    label: 'Simple',
    parse: parseSimpleProgram,
    example: SIMPLE_EXAMPLE,
  },
  fanuc: {
    id: 'fanuc',
    label: 'Fanuc (TP)',
    parse: parseFanucProgram,
    example: FANUC_EXAMPLE,
  },
  abb: {
    id: 'abb',
    label: 'ABB (RAPID)',
    parse: parseAbbProgram,
    example: ABB_EXAMPLE,
  },
  kuka: {
    id: 'kuka',
    label: 'KUKA (KRL)',
    parse: parseKukaProgram,
    example: KUKA_EXAMPLE,
  },
});

export function getDialect(dialectId) {
  return DIALECTS[dialectId] || DIALECTS.simple;
}
