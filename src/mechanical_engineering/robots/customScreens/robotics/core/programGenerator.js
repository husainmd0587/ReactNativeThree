/**
 * programGenerator.js
 *
 * Builds a real pick-and-drop program from two ACTUAL captured joint
 * poses - not guessed reach coordinates. This is the honest fix for
 * the problem the earlier placeholder templates flagged (this
 * environment can't fetch the real GLB to verify multi-joint reach):
 * instead of inventing numbers, PickDropWizardScreen has the person
 * jog the real rig to the box, capture that exact pose, jog to the
 * drop zone, capture that - then this file turns those two captured
 * poses into a correctly-formatted program in whichever dialect they
 * pick. Every joint moves together (not just J1, unlike the earlier
 * placeholder examples), because the captured pose already accounts
 * for however many joints the real reach actually needs.
 */

function formatNumber(n) {
  // Captured joint values can have long float tails (e.g. from slider
  // drag) - round to 1 decimal for a readable, still-precise program.
  return Math.round(n * 10) / 10;
}

/**
 * @param dialectId one of 'simple' | 'fanuc' | 'abb' | 'kuka'
 * @param jointOrder array of joint ids in definition order (e.g. ['J1','J2','J3','J4','J5'])
 * @param pickPose { [jointId]: degrees } - captured pose at the box
 * @param dropPose { [jointId]: degrees } - captured pose at the drop zone
 * @param speed shared MOVEJ/PTP/MoveAbsJ speed for both moves
 */
export function generatePickDropProgram(dialectId, jointOrder, pickPose, dropPose, speed = 40) {
  switch (dialectId) {
    case 'fanuc':
      return generateFanuc(jointOrder, pickPose, dropPose, speed);
    case 'abb':
      return generateAbb(jointOrder, pickPose, dropPose, speed);
    case 'kuka':
      return generateKuka(jointOrder, pickPose, dropPose, speed);
    case 'simple':
    default:
      return generateSimple(jointOrder, pickPose, dropPose, speed);
  }
}

function poseToSimpleArgs(jointOrder, pose) {
  return jointOrder.map((id) => `${id}=${formatNumber(pose[id])}`).join(' ');
}

function generateSimple(jointOrder, pickPose, dropPose, speed) {
  return `HOME
MOVEJ ${poseToSimpleArgs(jointOrder, pickPose)} SPEED=${speed}
WAIT 0.5
GRIP CLOSE
WAIT 0.3
MOVEJ ${poseToSimpleArgs(jointOrder, dropPose)} SPEED=${speed}
WAIT 0.5
GRIP OPEN
WAIT 0.5
HOME`;
}

function poseToFanucAxes(jointOrder, pose) {
  return jointOrder.map((id) => `${id} ${formatNumber(pose[id])}`).join(', ');
}

function generateFanuc(jointOrder, pickPose, dropPose, speed) {
  return `PR[1] = {${poseToFanucAxes(jointOrder, pickPose)}}
PR[2] = {${poseToFanucAxes(jointOrder, dropPose)}}
J HOME 100% FINE
J PR[1] ${speed}% FINE
WAIT 0.5(sec)
DOUT[1]=ON
WAIT 0.3(sec)
J PR[2] ${speed}% FINE
WAIT 0.5(sec)
DOUT[1]=OFF
WAIT 0.5(sec)
J HOME 100% FINE`;
}

function poseToRapidArray(jointOrder, pose) {
  return jointOrder.map((id) => formatNumber(pose[id])).join(',');
}

function generateAbb(jointOrder, pickPose, dropPose, speed) {
  return `MoveAbsJ [[${poseToRapidArray(jointOrder, pickPose)}],[0,0,0,0]], v${speed}, fine, tool0;
WaitTime 0.5;
Set doGripper;
WaitTime 0.3;
MoveAbsJ [[${poseToRapidArray(jointOrder, dropPose)}],[0,0,0,0]], v${speed}, fine, tool0;
WaitTime 0.5;
Reset doGripper;
WaitTime 0.5;
Home;`;
}

function poseToKrlAxes(jointOrder, pose) {
  return jointOrder
    .map((id, i) => `${id.replace('J', 'A')} ${formatNumber(pose[id])}`)
    .join(', ');
}

function generateKuka(jointOrder, pickPose, dropPose, speed) {
  return `PTP HOME
PTP {${poseToKrlAxes(jointOrder, pickPose)}} VEL=${speed}
WAIT SEC 0.5
$OUT[1] = TRUE
WAIT SEC 0.3
PTP {${poseToKrlAxes(jointOrder, dropPose)}} VEL=${speed}
WAIT SEC 0.5
$OUT[1] = FALSE
WAIT SEC 0.5
PTP HOME`;
}
