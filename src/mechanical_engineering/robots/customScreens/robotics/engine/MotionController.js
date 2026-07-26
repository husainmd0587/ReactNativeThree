/**
 * MotionController.js
 *
 * Frame/update-based joint interpolation. Nothing here knows about
 * Three.js, React, or the program language - it just takes a set of
 * per-joint targets and a speed, and produces smoothly interpolated
 * values on each update(deltaTime) call.
 *
 * Pipeline this plugs into:
 *   Current joint values -> Target joint values -> Interpolation -> Robot movement
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Ease-in-out so motion doesn't start/stop with a visible jolt.
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class MotionController {
  constructor() {
    // jointId -> { from, to, duration, elapsed }
    this.moves = {};
  }

  /**
   * Begin moving from currentValues toward targetValues.
   * speedDegPerSec controls how fast the slowest-relative joint moves;
   * all joints arrive together (classic MOVEJ behavior - joint
   * interpolation, not independent per-joint speed).
   */
  moveJ(currentValues, targetValues, speedDegPerSec = 60) {
    const distances = Object.keys(targetValues).map((jointId) => {
      const from = currentValues[jointId] ?? 0;
      const to = targetValues[jointId];
      return Math.abs(to - from);
    });
    const maxDistance = Math.max(0, ...distances);
    const duration = maxDistance / Math.max(speedDegPerSec, 1);

    this.moves = {};
    Object.keys(targetValues).forEach((jointId) => {
      const from = currentValues[jointId] ?? 0;
      const to = targetValues[jointId];
      this.moves[jointId] = { from, to, duration, elapsed: 0 };
    });
  }

  isMoving() {
    return Object.values(this.moves).some((m) => m.elapsed < m.duration);
  }

  stop() {
    this.moves = {};
  }

  /**
   * Advances all in-flight moves by deltaTime (seconds).
   * Returns { values, moving } - values is only the joints that are
   * actively interpolating this call (caller merges into full state).
   */
  update(deltaTime) {
    const values = {};
    let moving = false;

    Object.entries(this.moves).forEach(([jointId, move]) => {
      move.elapsed = Math.min(move.duration, move.elapsed + deltaTime);
      const progress = move.duration === 0 ? 1 : move.elapsed / move.duration;
      values[jointId] = lerp(move.from, move.to, easeInOutQuad(progress));
      if (move.elapsed < move.duration) moving = true;
    });

    return { values, moving };
  }
}

export function createMotionController() {
  return new MotionController();
}
