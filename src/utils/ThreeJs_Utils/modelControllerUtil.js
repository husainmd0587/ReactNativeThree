import * as THREE from 'three';


/*
 * ============================================================
 * CLAMP
 * ============================================================
 */

export function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


/*
 * ============================================================
 * MOVE TOWARD
 *
 * Moves current value toward target without overshooting.
 *
 * speed = units per second
 * delta = frame time
 * ============================================================
 */

export function moveToward(
  current,
  target,
  speed,
  delta
) {

  const distance =
    target - current;


  const maxStep =
    Math.abs(speed) * delta;


  if (
    Math.abs(distance) <= maxStep
  ) {
    return target;
  }


  return (
    current +
    Math.sign(distance) *
    maxStep
  );
}


/*
 * ============================================================
 * CREATE CONTROL STATE
 * ============================================================
 */

export function createControlState(
  config,
  initialValue
) {

  const min =
    config.min ?? 0;

  const max =
    config.max ?? 1;


  const value =
    initialValue ??
    config.default ??
    min;


  const safeValue =
    clamp(
      value,
      min,
      max
    );


  return {

    current: safeValue,

    target: safeValue,

    speed:
      config.speed ?? 1,

    active: false,

  };

}


/*
 * ============================================================
 * GET TRANSFORM VALUE
 *
 * value:
 *
 * 0 → from
 * 1 → to
 * ============================================================
 */

export function getTransformValue(
  transform,
  value
) {

  return THREE.MathUtils.lerp(
    transform.from ?? 0,
    transform.to ?? 0,
    value
  );

}