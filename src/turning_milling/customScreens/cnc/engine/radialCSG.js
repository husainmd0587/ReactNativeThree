/**
 * radialCSG.js
 *
 * A LatheGeometry is a profile spun around one axis - it can only ever represent
 * shapes that look the same at every angle. A hole drilled in from the SIDE isn't
 * that, so no amount of clip-plane cleverness can represent it; this needs real
 * boolean subtraction (CSG), layered on top of the axisymmetric solid the rest of
 * the engine already builds.
 *
 * COST AWARENESS: CSG subtraction is not run every frame the way the clip-plane
 * sweep is - it's precomputed once (a handful of depth stages for the plunge
 * animation) when a radial-drill pass is built, then cached and reused. See
 * CNCLatheSimulator.jsx for where that caching happens.
 *
 * THREE and the CSG classes (Brush/Evaluator/SUBTRACTION from three-bvh-csg) are
 * passed in as parameters rather than imported here - keeps engine/ free of any
 * specific 3D library dependency, matching the buildLatheGeometry(THREE, ...)
 * pattern in latheGeometryBuilder.js.
 *
 * COORDINATE CONVENTION: matches Chuck.jsx/Turret.jsx - local Y is the part's
 * axial axis, X/Z is the radius plane, angleDeg rotates around Y using the
 * standard THREE right-hand rotation (verified empirically: rotating +90 about Y
 * sweeps a point from +X to -Z).
 */

/** Build a Brush for one drill bit, positioned/oriented for its hole. */
function buildDrillBrush(THREE, Brush, feature, stockRadius) {
  const { z, angleDeg = 0, diameter = 6, depth = 5 } = feature;
  const radius = Math.max(0.3, diameter / 2);
  const overshoot = Math.max(5, stockRadius * 0.3); // ensures the drill fully spans from outside the stock surface
  const clampedDepth = Math.max(0.1, Math.min(depth, stockRadius * 1.98)); // can't drill past the far wall in this simple model
  const length = clampedDepth + overshoot;

  const drillGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
  const drillBrush = new Brush(drillGeo);
  drillBrush.rotation.z = Math.PI / 2; // cylinder axis Y -> X (radial direction)
  drillBrush.position.set((stockRadius + overshoot + stockRadius - clampedDepth) / 2, z, 0);
  drillBrush.updateMatrixWorld();

  // Rotate the drill to its angular position around the part via a pivot -
  // same pattern as Chuck's jaws / Turret's stations.
  const pivot = new THREE.Group();
  pivot.add(drillBrush);
  pivot.rotation.y = (angleDeg * Math.PI) / 180;
  pivot.updateMatrixWorld(true);

  return drillBrush;
}

/**
 * Subtract ALL given radial features from a base geometry in one pass. Use this
 * to carry already-drilled holes forward unchanged into later passes' base solid.
 */
export function applyRadialFeatures(THREE, CSG, baseGeometry, features, stockRadius) {
  if (!features || features.length === 0) return baseGeometry;
  const { Brush, Evaluator, SUBTRACTION } = CSG;

  let currentGeometry = baseGeometry;
  const evaluator = new Evaluator();

  for (const feature of features) {
    const baseBrush = new Brush(currentGeometry);
    baseBrush.updateMatrixWorld();
    const drillBrush = buildDrillBrush(THREE, Brush, feature, stockRadius);
    const result = evaluator.evaluate(baseBrush, drillBrush, SUBTRACTION);
    currentGeometry = result.geometry;
  }

  return currentGeometry;
}

/**
 * Build the progressive-depth-plunge animation frames for ONE radial hole being
 * drilled in THIS pass: stage[0] = hole not started yet (just prior holes baked
 * in), stage[stageCount] = full depth. Any PRIOR radial features (already-drilled
 * holes from earlier passes) are baked into every stage since they're permanent.
 *
 * Returns an array of BufferGeometry, length `stageCount + 1`.
 */
export function buildRadialDrillStages(THREE, CSG, baseGeometry, feature, priorFeatures, stockRadius, stageCount = 4) {
  const withPriorHoles = applyRadialFeatures(THREE, CSG, baseGeometry, priorFeatures, stockRadius);
  const { Brush, Evaluator, SUBTRACTION } = CSG;
  const evaluator = new Evaluator();

  const stages = [withPriorHoles];
  for (let i = 1; i <= stageCount; i++) {
    const depthThisStage = (feature.depth * i) / stageCount;
    const baseBrush = new Brush(withPriorHoles);
    baseBrush.updateMatrixWorld();
    const drillBrush = buildDrillBrush(THREE, Brush, { ...feature, depth: depthThisStage }, stockRadius);
    const result = evaluator.evaluate(baseBrush, drillBrush, SUBTRACTION);
    stages.push(result.geometry);
  }
  return stages;
}

export default { applyRadialFeatures, buildRadialDrillStages };
