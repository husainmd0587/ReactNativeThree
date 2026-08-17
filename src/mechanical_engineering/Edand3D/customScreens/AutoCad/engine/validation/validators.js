import { angleDiff, withinTolerance } from '../geometry/math';

export function validateLine(actual, target) {
  const lengthOk = withinTolerance(actual.lengthMm, target.lengthMm, target.tolerance.lengthMm);
  const angleOk = angleDiff(actual.angleDeg, target.angleDeg) <= target.tolerance.angleDeg;
  return {
    correct: lengthOk && angleOk,
    checks: [
      { label: 'Length', required: `${target.lengthMm} mm`, actual: `${actual.lengthMm} mm`, ok: lengthOk },
      { label: 'Angle', required: `${target.angleDeg}°`, actual: `${actual.angleDeg}°`, ok: angleOk },
    ],
  };
}

export function validateCircle(actual, target) {
  const radiusOk = withinTolerance(actual.radiusMm, target.radiusMm, target.tolerance.radiusMm);
  return {
    correct: radiusOk,
    checks: [
      { label: 'Radius', required: `${target.radiusMm} mm`, actual: `${actual.radiusMm} mm`, ok: radiusOk },
    ],
  };
}

export function validateRectangle(actual, target) {
  const widthOk = withinTolerance(actual.widthMm, target.widthMm, target.tolerance.widthMm);
  const heightOk = withinTolerance(actual.heightMm, target.heightMm, target.tolerance.heightMm);
  return {
    correct: widthOk && heightOk,
    checks: [
      { label: 'Width', required: `${target.widthMm} mm`, actual: `${actual.widthMm} mm`, ok: widthOk },
      { label: 'Height', required: `${target.heightMm} mm`, actual: `${actual.heightMm} mm`, ok: heightOk },
    ],
  };
}

export const VALIDATORS = {
  line: validateLine,
  circle: validateCircle,
  rectangle: validateRectangle,
};
