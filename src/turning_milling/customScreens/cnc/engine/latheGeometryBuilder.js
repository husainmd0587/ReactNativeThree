/**
 * latheGeometryBuilder.js
 *
 * THREE.LatheGeometry revolves a 2D polyline around the Y axis. We treat that Y axis
 * as the part's Z (spindle) axis, and X of the polyline as radius. To render a solid
 * bar we cap each end by dropping the profile straight to r=0 (a same-Z radial segment
 * revolves into a flat disk). To render a bore/drilled hole with NO CSG/voxels, we walk
 * out along the outer wall, step inward to the bore radius at the hole's bottom
 * (revolves into the flat bottom of the hole), then walk back along the inner wall to
 * the open face. This is the same "hollow vase" trick used for cups/pipes in any
 * lathe-based 3D tool, and matches the two-geometry / profile-sweep approach already
 * used in Turning.js.
 *
 * Assumption (matches real lathe programs): a bore always opens at one face (stations
 * are ordered z ascending; boreFace picks which end the drill enters from) and is
 * either blind or through — never floating in the middle disconnected from a face.
 */

const EPS = 0.03; // mm, below this we treat a station as "no bore here"

export function buildProfilePath(outerProfile, innerProfile, opts = {}) {
  const { boreFace = 'max' } = opts; // 'max' = bore enters from the last (zMax) station

  // Normalize so we always walk with the bore-entry face LAST, then flip back if needed.
  const outer = boreFace === 'max' ? outerProfile : [...outerProfile].reverse();
  const inner = boreFace === 'max' ? innerProfile : [...innerProfile].reverse();
  const n = outer.length;

  const outerR = outer.map((p) => Math.max(0, p.r));
  const innerR = inner.map((p) => Math.max(0, p.r));
  const zAt = (i) => outer[i].z;

  // Find last index with no bore (contiguous solid prefix).
  let b = n - 1;
  for (let i = 0; i < n; i++) {
    if (innerR[i] <= EPS) b = i;
    else break; // stop at first bored station; assumes bore is a contiguous suffix
  }

  const path = [];

  if (b === n - 1) {
    // No bore anywhere: simple solid bar, capped flat at both ends.
    path.push({ r: 0, z: zAt(0) });
    for (let i = 0; i < n; i++) path.push({ r: outerR[i], z: zAt(i) });
    path.push({ r: 0, z: zAt(n - 1) });
  } else {
    // Bore exists from station b+1 through to the open face at n-1.
    path.push({ r: 0, z: zAt(0) });
    for (let i = 0; i <= b; i++) path.push({ r: outerR[i], z: zAt(i) });
    const holeR = Math.max(innerR[b + 1] ?? 0.5, 0.5);
    path.push({ r: holeR, z: zAt(b) }); // flat bottom of the hole
    for (let i = b + 1; i < n; i++) path.push({ r: Math.max(innerR[i], 0.01), z: zAt(i) });
    // Open face at zAt(n-1): intentionally left open (that's the hole mouth).
  }

  return boreFace === 'max' ? path : path.reverse();
}

/** Convert a {r,z}[] path into THREE.Vector2[] for `new THREE.LatheGeometry(points, segments)`. */
export function pathToVector2(THREE, path) {
  return path.map((p) => new THREE.Vector2(p.r, p.z));
}

/** Convenience: build a THREE.LatheGeometry directly from an outer/inner profile pair. */
export function buildLatheGeometry(THREE, outerProfile, innerProfile, segments = 64, opts = {}) {
  const path = buildProfilePath(outerProfile, innerProfile, opts);
  const points = pathToVector2(THREE, path);
  return new THREE.LatheGeometry(points, segments);
}

/**
 * Linear-interpolate a profile's radius at an arbitrary Z. Profile is the
 * {z,r}[] station array from toolpathToPasses (assumed sorted ascending by z).
 * Used to size the "cap" disk that plugs the open cross-section at the clip
 * plane, so the cut face reads as solid material instead of a hollow shell.
 */
export function interpRadiusAtZ(profile, z) {
  if (!profile || profile.length === 0) return 0;
  if (z <= profile[0].z) return profile[0].r;
  const last = profile[profile.length - 1];
  if (z >= last.z) return last.r;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i].z >= z) {
      const p0 = profile[i - 1];
      const p1 = profile[i];
      const t = (z - p0.z) / (p1.z - p0.z || 1);
      return p0.r + (p1.r - p0.r) * t;
    }
  }
  return last.r;
}

export default { buildProfilePath, pathToVector2, buildLatheGeometry };
