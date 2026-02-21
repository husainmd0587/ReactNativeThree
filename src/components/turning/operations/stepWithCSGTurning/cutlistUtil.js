// COPY & PASTE CUT LIST EXAMPLES
// Replace the cutList in StepWithCsg-WORKING.jsx with any of these

// ════════════════════════════════════════════════════════════════════════════
//  EXAMPLE 1: SIMPLE BOX POCKET
// ════════════════════════════════════════════════════════════════════════════

const cutList = [
  {
    type: 'shape',
    shapeType: 1,        // 1 = box
    p0: 18,               // width
    p1: 15,              // height
    p2: 18,               // depth
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
]

// ════════════════════════════════════════════════════════════════════════════
//  EXAMPLE 2: CYLINDER HOLE (VERTICAL)
// ════════════════════════════════════════════════════════════════════════════

/*
const cutList = [
  {
    type: 'shape',
    shapeType: 0,        // 0 = cylinder
    p0: 3,               // radius
    p1: 40,              // height
    p2: 64,              // segments
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
]
*/

// ════════════════════════════════════════════════════════════════════════════
//  EXAMPLE 3: SPHERE POCKET
// ════════════════════════════════════════════════════════════════════════════

/*
const cutList = [
  {
    type: 'shape',
    shapeType: 2,        // 2 = sphere
    p0: 5,               // radius
    p1: 32,              // segments
    p2: 0,               // unused
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
]
*/

// ════════════════════════════════════════════════════════════════════════════
//  EXAMPLE 4: MULTIPLE CUTS
// ════════════════════════════════════════════════════════════════════════════

/*
const cutList = [
  // Main box pocket
  {
    type: 'shape',
    shapeType: 1,
    p0: 8, p1: 15, p2: 8,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
  // Cylinder hole through middle
  {
    type: 'shape',
    shapeType: 0,
    p0: 2, p1: 40, p2: 32,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
  // Sphere pocket at top
  {
    type: 'shape',
    shapeType: 2,
    p0: 4, p1: 32, p2: 0,
    position: { x: 0, y: 15, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  },
]
*/

// ════════════════════════════════════════════════════════════════════════════
//  EXAMPLE 5: ARRAY OF HOLES
// ════════════════════════════════════════════════════════════════════════════

/*
const cutList = [
  ...Array.from({ length: 6 }, (_, i) => ({
    type: 'shape',
    shapeType: 0,        // cylinder
    p0: 1.5,             // radius
    p1: 30,              // height
    p2: 16,              // segments
    position: {
      x: Math.cos((i / 6) * Math.PI * 2) * 8,
      y: 0,
      z: Math.sin((i / 6) * Math.PI * 2) * 8,
    },
    rotation: { x: 0, y: 0, z: 0 },
    cut: true,
    subtract: true
  }))
]
*/

// ════════════════════════════════════════════════════════════════════════════
//  SHAPE TYPE REFERENCE
// ════════════════════════════════════════════════════════════════════════════

/*
shapeType: 0 = Cylinder
  p0: radius
  p1: height
  p2: segments (0 = auto 64)

shapeType: 1 = Box
  p0: width
  p1: height
  p2: depth

shapeType: 2 = Sphere
  p0: radius
  p1: segments (0 = auto 64)
  p2: unused
*/

export { cutList }