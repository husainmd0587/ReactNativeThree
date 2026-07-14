/**
 * exampleLibrary.js
 *
 * Built-in starter programs for freshers to load and study - one per fundamental
 * lathe operation. Read-only (not deletable, unlike user-saved programs in
 * programStorage.js). Every gcode string here has been run through the actual
 * engine and checked for correct final geometry before being included.
 *
 * NOTE on boreThreshold: the engine classifies a near-axis, axial cut as either
 * "OD turning down to a small diameter" or "drilling/boring near the centerline"
 * using a heuristic (radius <= boreThreshold). Small-diameter OD work and small
 * bores genuinely look the same to this heuristic - if your own program turns a
 * shaft down below the default 6mm radius threshold, either keep clear of it or
 * raise/lower `boreThreshold` in your stockConfig as needed.
 */

export const EXAMPLE_PROGRAMS = [
  {
    id: 'example-step-turning',
    name: 'Step Turning',
    description: 'Multiple distinct diameters cut as square shoulders - the most fundamental turning operation.',
    stockConfig: { stockDiameter: 32, stockLength: 62, zFace: 2, resolution: 150 },
    gcode: `O2001 (STEP TURNING)
G21 G90 G95
T0101
G97 S1200 M3
; FACE
G0 X32 Z2
G1 X-1 Z2 F0.15
G0 X32 Z2
; STEP DOWN THROUGH THREE DIAMETERS
G0 X32 Z0
G1 X26 Z0 F0.15
G1 X26 Z-20
G1 X20 Z-20
G1 X20 Z-40
G1 X16 Z-40
G1 X16 Z-60
G0 X32 Z2
M5
M30`,
  },
  {
    id: 'example-taper-turning',
    name: 'Taper Turning',
    description: 'A single straight diagonal cut - X and Z change together in one move, producing a cone.',
    stockConfig: { stockDiameter: 32, stockLength: 52, zFace: 2, resolution: 150 },
    gcode: `O2002 (TAPER TURNING)
G21 G90 G95
T0101
G97 S1200 M3
; FACE
G0 X32 Z2
G1 X-1 Z2 F0.15
G0 X32 Z2
; TAPER FROM DIA 30 DOWN TO DIA 10 OVER 50mm
G0 X32 Z0
G1 X30 Z0 F0.15
G1 X10 Z-50
G0 X32 Z2
M5
M30`,
  },
  {
    id: 'example-contour-turning',
    name: 'Contour Turning',
    description: 'A profile combining straight cuts with a curved fillet (G3 arc) - shows the tool following a true radius, not a straight facet.',
    stockConfig: { stockDiameter: 32, stockLength: 37, zFace: 2, resolution: 150 },
    gcode: `O2003 (CONTOUR TURNING)
G21 G90 G95
T0101
G97 S1200 M3
; FACE
G0 X32 Z2
G1 X-1 Z2 F0.12
G0 X32 Z2
; STRAIGHT SECTION, THEN A CURVED FILLET (G3), THEN STRAIGHT AGAIN
G0 X32 Z0
G1 X30 Z0 F0.12
G1 X30 Z-10
G3 X20 Z-20 I0 K-10
G1 X20 Z-35
G0 X32 Z2
M5
M30`,
  },
  {
    id: 'example-drilling',
    name: 'Drilling',
    description: 'A straightforward peck-drilling cycle (G74) on the centerline.',
    stockConfig: { stockDiameter: 28, stockLength: 45, zFace: 2, resolution: 150, defaultDrillDiameter: 8 },
    gcode: `O2004 (DRILLING)
G21 G90 G95
T0606
G97 S900 M3
G0 X0 Z2
G74 Z-25 D8 K5 R1 F0.1
M5
M30`,
  },
  {
    id: 'example-boring',
    name: 'Boring',
    description: 'Pre-drill a hole, then enlarge it with an internal turning pass - boring is turning, just done inside a bore instead of on the outside.',
    stockConfig: { stockDiameter: 30, stockLength: 32, zFace: 2, resolution: 150, defaultDrillDiameter: 10, boreThreshold: 10 },
    gcode: `O2005 (BORING)
G21 G90 G95
; PRE-DRILL
T0606
G97 S900 M3
G0 X0 Z2
G74 Z-30 D10 K5 R1 F0.1
; BORE THE HOLE OUT FROM DIA 10 TO DIA 14
T0505
G97 S1100 M3
G0 X14 Z2
G1 X14 Z-25 F0.1
G0 X0 Z2
M5
M30`,
  },
  {
    id: 'example-radial-drilling',
    name: 'Radial / Cross Drilling',
    description: 'Two holes drilled radially into the side of the shaft (G184) - a non-axisymmetric feature, handled via real CSG boolean subtraction instead of the usual clip-plane technique. See engine/radialCSG.js.',
    stockConfig: { stockDiameter: 32, stockLength: 52, zFace: 2, resolution: 150 },
    gcode: `O2006 (RADIAL DRILLING DEMO)
G21 G90 G95
T0101
G97 S1200 M3
; FACE + TURN TO A CONSTANT DIAMETER SO THE CROSS-HOLES HAVE CLEAN MATERIAL TO SIT IN
G0 X32 Z2
G1 X-1 Z2 F0.15
G0 X32 Z2
G0 X32 Z0
G1 X24 Z0 F0.15
G1 X24 Z-50
G0 X32 Z2
; TWO RADIAL HOLES AT DIFFERENT Z / ANGLE
T0606
G184 Z-20 C0 D6 Q10
G184 Z-35 C90 D5 Q8
M5
M30`,
  },
];

export function findExampleById(id) {
  return EXAMPLE_PROGRAMS.find((p) => p.id === id) ?? null;
}

export default { EXAMPLE_PROGRAMS, findExampleById };
