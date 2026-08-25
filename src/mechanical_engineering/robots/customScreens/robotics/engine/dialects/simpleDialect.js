/**
 * simpleDialect.js
 *
 * The original custom teaching DSL (HOME/MOVEJ/WAIT/GRIP) - kept as
 * its own "dialect" entry so it sits alongside Fanuc/ABB/KUKA in the
 * same selector, unchanged.
 *
 * NOTE on the example program: it only moves J1 (base rotate), by a
 * modest, safe delta from its default. The old example targeted
 * specific multi-joint angles verified via forward kinematics against
 * the OLD procedural robot's geometry - that verification is
 * meaningless for the real GLB rig (different link lengths/scale
 * entirely, and this environment can't reach the model's CDN host to
 * measure it). Rather than guess new "reaches the box" coordinates
 * for geometry never seen, GRIP CLOSE here may simply miss (expected,
 * honest behavior - see RobotEngine.setGrip's PICK_RADIUS check).
 * Jog the real arm in Manual mode to find real pick/drop coordinates
 * for your rig, then edit this program with those values.
 */

import { parseProgram } from '../ProgramInterpreter';

export const SIMPLE_EXAMPLE = `HOME
MOVEJ J1=30 SPEED=40
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ J1=-30 SPEED=40
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`;

export function parseSimpleProgram(text, definition) {
  return parseProgram(text, definition);
}
