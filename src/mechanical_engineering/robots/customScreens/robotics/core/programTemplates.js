/**
 * programTemplates.js
 *
 * Starter programs for NewProgramScreen, one text variant per dialect.
 * Pick and Place and Welding Pass both reuse the SAME two joint-angle
 * sets used by the dialect example programs (see engine/dialects/) -
 * those were solved with a forward-kinematics search against
 * RobotRenderer.jsx's actual transform math and verified to land
 * within PICK_RADIUS of the box/drop zone (see engine/RobotEngine.js).
 * Welding Pass is NOT a real weld path or weld physics simulation -
 * it's a repeated move between those same two verified points, at a
 * slower SPEED, to demonstrate programming a repeated motion pattern.
 * Inventing new unverified angles for a "real-looking" weld seam would
 * just reintroduce the exact bug already fixed once (guessed angles
 * that never actually reach where they claim to).
 */

const POINT_A = { simple: 'J1=-41 J2=-76 J3=-136 J4=96', fanucAxes: 'J1 -41, J2 -76, J3 -136, J4 96', krlAxes: 'A1 -41, A2 -76, A3 -136, A4 96', rapidArray: '-41,-76,-136,96' };
const POINT_B = { simple: 'J1=-146 J2=-73 J3=-138 J4=74', fanucAxes: 'J1 -146, J2 -73, J3 -138, J4 74', krlAxes: 'A1 -146, A2 -73, A3 -138, A4 74', rapidArray: '-146,-73,-138,74' };

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
    description: 'Move to the box, grip it, move to the drop zone, release, return home.',
    icon: '📦',
    textByDialect: {
      simple: `HOME
MOVEJ ${POINT_A.simple} SPEED=60
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ ${POINT_B.simple} SPEED=60
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`,
      fanuc: `PR[1] = {${POINT_A.fanucAxes}}
PR[2] = {${POINT_B.fanucAxes}}
J HOME 100% FINE
J PR[1] 100% FINE
WAIT 0.5(sec)
DOUT[1]=ON
WAIT 0.3(sec)
J PR[2] 100% FINE
WAIT 0.5(sec)
DOUT[1]=OFF
WAIT 0.5(sec)
J HOME 100% FINE`,
      abb: `MoveAbsJ [[${POINT_A.rapidArray}],[0,0,0,0]], v100, fine, tool0;
WaitTime 0.5;
Set doGripper;
WaitTime 0.3;
MoveAbsJ [[${POINT_B.rapidArray}],[0,0,0,0]], v100, fine, tool0;
WaitTime 0.5;
Reset doGripper;
WaitTime 0.5;
Home;`,
      kuka: `PTP HOME
PTP {${POINT_A.krlAxes}} VEL=60
WAIT SEC 0.5
$OUT[1] = TRUE
WAIT SEC 0.3
PTP {${POINT_B.krlAxes}} VEL=60
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
      'A repeated back-and-forth move between two points at a slower speed - demonstrates programming a repeated path, not a real weld seam or weld physics.',
    icon: '🔧',
    textByDialect: {
      simple: `HOME
MOVEJ ${POINT_A.simple} SPEED=40
WAIT 0.3
MOVEJ ${POINT_B.simple} SPEED=40
WAIT 0.3
MOVEJ ${POINT_A.simple} SPEED=40
WAIT 0.3
MOVEJ ${POINT_B.simple} SPEED=40
WAIT 0.3
HOME`,
      fanuc: `PR[1] = {${POINT_A.fanucAxes}}
PR[2] = {${POINT_B.fanucAxes}}
J HOME 100% FINE
J PR[1] 40% FINE
WAIT 0.3(sec)
J PR[2] 40% FINE
WAIT 0.3(sec)
J PR[1] 40% FINE
WAIT 0.3(sec)
J PR[2] 40% FINE
WAIT 0.3(sec)
J HOME 100% FINE`,
      abb: `MoveAbsJ [[${POINT_A.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${POINT_B.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${POINT_A.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.3;
MoveAbsJ [[${POINT_B.rapidArray}],[0,0,0,0]], v40, fine, tool0;
WaitTime 0.3;
Home;`,
      kuka: `PTP HOME
PTP {${POINT_A.krlAxes}} VEL=40
WAIT SEC 0.3
PTP {${POINT_B.krlAxes}} VEL=40
WAIT SEC 0.3
PTP {${POINT_A.krlAxes}} VEL=40
WAIT SEC 0.3
PTP {${POINT_B.krlAxes}} VEL=40
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
