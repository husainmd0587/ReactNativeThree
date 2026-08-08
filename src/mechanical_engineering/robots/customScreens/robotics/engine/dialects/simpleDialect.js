/**
 * simpleDialect.js
 *
 * The original custom teaching DSL (HOME/MOVEJ/WAIT/GRIP) - kept as
 * its own "dialect" entry so it sits alongside Fanuc/ABB/KUKA in the
 * same selector, unchanged.
 */

import { parseProgram } from '../ProgramInterpreter';

export const SIMPLE_EXAMPLE = `HOME
MOVEJ J1=-41 J2=-76 J3=-136 J4=96 SPEED=60
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ J1=-146 J2=-73 J3=-138 J4=74 SPEED=60
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`;

export function parseSimpleProgram(text, definition) {
  return parseProgram(text, definition);
}
