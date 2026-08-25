/**
 * programTemplates.js
 *
 * Starter programs for NewProgramScreen, one text variant per dialect.
 *
 * IMPORTANT - these are intentionally conservative single-axis (J1
 * only) demonstrations, NOT verified pick/place or weld-seam
 * coordinates. The earlier version of this file used angles solved
 * via forward kinematics against the old procedural robot's known
 * geometry - that verification is meaningless now that the module
 * renders the real GLB rig instead (different joint count, different
 * link lengths/scale entirely, and this environment's network
 * allowlist blocks the model's CDN host, so there's no way to measure
 * it from here). Inventing new "looks right" multi-joint coordinates
 * for geometry nobody has actually verified would just reproduce the
 * exact bug that was already found and fixed once before.
 *
 * To get real pick/drop or weld-path coordinates for your rig: open
 * the Simulator's Manual tab, jog each joint with the sliders until
 * the gripper is where you want it, read the values off the joint
 * dropdown (it shows every joint's current degrees), then edit these
 * templates (or a saved program) with those real numbers.
 */

const SAFE_APPROACH = { simple: 'J1=30', fanucAxis: 'J1 30', krlAxis: 'A1 30', rapidArray: '30' };
const SAFE_RETREAT = { simple: 'J1=-30', fanucAxis: 'J1 -30', krlAxis: 'A1 -30', rapidArray: '-30' };

export const PROGRAM_TEMPLATES = {
  blank: {
    id: 'blank',
    label: 'Blank',
    description: 'An empty program in the syntax of your choice - start from scratch.',
    icon: '📄',
    textByDialect: {
      simple: '# New program\n',
      fanuc: '! New program\n',
      abb: '! New program\n',
      kuka: '; New program\n',
    },
  },

  pick_place: {
    id: 'pick_place',
    label: 'Pick and Place',
    description:
      'HOME, a conservative J1-only move, grip, move back, release, HOME. Uses a safe placeholder angle, not a verified reach to any specific point - jog the real arm in Manual mode to find your rig\u2019s actual pick/drop coordinates, then edit this.',
    icon: '📦',
    textByDialect: {
      simple: `HOME
MOVEJ ${SAFE_APPROACH.simple} SPEED=40
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ ${SAFE_RETREAT.simple} SPEED=40
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`,
      fanuc: `PR[1] = {${SAFE_APPROACH.fanucAxis}}
PR[2] = {${SAFE_RETREAT.fanucAxis}}
J HOME 100% FINE
J PR[1] 40% FINE
WAIT 0.5(sec)
DOUT[1]=ON
WAIT 0.3(sec)
J PR[2] 40% FINE
WAIT 0.5(sec)
DOUT[1]=OFF
WAIT 0.5(sec)
J HOME 100% FINE`,
      abb: `MoveAbsJ [[${SAFE_APPROACH.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.5;
Set doGripper;
WaitTime 0.3;
MoveAbsJ [[${SAFE_RETREAT.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.5;
Reset doGripper;
WaitTime 0.5;
Home;`,
      kuka: `PTP HOME
PTP {${SAFE_APPROACH.krlAxis}} VEL=40
WAIT SEC 0.5
$OUT[1] = TRUE
WAIT SEC 0.3
PTP {${SAFE_RETREAT.krlAxis}} VEL=40
WAIT SEC 0.5
$OUT[1] = FALSE
WAIT SEC 0.5
PTP HOME`,
    },
  },

  welding_pass: {
    id: 'welding_pass',
    label: 'Welding Pass',
    description:
      'A repeated back-and-forth J1 move at a slower speed - demonstrates programming a repeated motion pattern. Not a real weld seam shape or weld physics; the two points are a safe placeholder, not a measured path.',
    icon: '🔧',
    textByDialect: {
      simple: `HOME
MOVEJ ${SAFE_APPROACH.simple} SPEED=25
WAIT 0.3
MOVEJ ${SAFE_RETREAT.simple} SPEED=25
WAIT 0.3
MOVEJ ${SAFE_APPROACH.simple} SPEED=25
WAIT 0.3
MOVEJ ${SAFE_RETREAT.simple} SPEED=25
WAIT 0.3
HOME`,
      fanuc: `PR[1] = {${SAFE_APPROACH.fanucAxis}}
PR[2] = {${SAFE_RETREAT.fanucAxis}}
J HOME 100% FINE
J PR[1] 25% FINE
WAIT 0.3(sec)
J PR[2] 25% FINE
WAIT 0.3(sec)
J PR[1] 25% FINE
WAIT 0.3(sec)
J PR[2] 25% FINE
WAIT 0.3(sec)
J HOME 100% FINE`,
      abb: `MoveAbsJ [[${SAFE_APPROACH.rapidArray}],[0,0,0,0]], v25, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${SAFE_RETREAT.rapidArray}],[0,0,0,0]], v25, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${SAFE_APPROACH.rapidArray}],[0,0,0,0]], v25, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${SAFE_RETREAT.rapidArray}],[0,0,0,0]], v25, fine, tool0;
WaitTime 0.3;
Home;`,
      kuka: `PTP HOME
PTP {${SAFE_APPROACH.krlAxis}} VEL=25
WAIT SEC 0.3
PTP {${SAFE_RETREAT.krlAxis}} VEL=25
WAIT SEC 0.3
PTP {${SAFE_APPROACH.krlAxis}} VEL=25
WAIT SEC 0.3
PTP {${SAFE_RETREAT.krlAxis}} VEL=25
WAIT SEC 0.3
PTP HOME`,
    },
  },
};

export function getTemplate(templateId) {
  return PROGRAM_TEMPLATES[templateId] || PROGRAM_TEMPLATES.blank;
}

export function listTemplates() {
  return Object.values(PROGRAM_TEMPLATES);
}
