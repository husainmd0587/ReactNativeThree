/**
 * CAD Practice — command registry
 *
 * Commands are plain data, not code branches. The practice engine reads
 * `practice.type` off a command definition instead of switching on command
 * id — see screens/CommandPractice.jsx. `line`, `circle`, `rectangle`,
 * `arc`, and `polyline` are implemented; everything else is listed so the
 * home screen can show the full roadmap, but stays disabled until it has a
 * real practice engine behind it too.
 */

export const COMMAND_CATEGORIES = [
  {
    id: '2d-drawing',
    label: '2D Drawing',
    commands: [
      {
        id: 'line',
        name: 'Line',
        description: 'Creates a straight line between two points.',
        implemented: true,
        details: 'A straight segment between two points, drawn with a single drag. Length and angle are measured live as you draw, and both stay editable afterward in Properties.',
        steps: ['Touch the first point', 'Drag to the second point and release'],
        practice: { type: 'line' },
      },
      {
        id: 'circle',
        name: 'Circle',
        description: 'Creates a circle from a center point and radius.',
        implemented: true,
        details: 'A full circle from a center point and radius, drawn with one drag from center to edge. Radius updates live while dragging and stays editable afterward.',
        steps: ['Touch the center point', 'Drag out to the edge and release'],
        practice: { type: 'circle' },
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        description: 'Creates a rectangle from two opposite corners.',
        implemented: true,
        details: 'An axis-aligned rectangle from two opposite corners, drawn with one drag. Width, height, and angle are all editable afterward, and it can later be rotated to any orientation.',
        steps: ['Touch one corner', 'Drag to the opposite corner and release'],
        practice: { type: 'rectangle' },
      },
      {
        id: 'arc',
        name: 'Arc',
        description: 'Creates an arc through three points.',
        implemented: true,
        details: 'A curved segment through three points you tap in order: start, a point the arc passes through, and the end. Radius and included angle are both editable afterward.',
        steps: [
          'Tap the start point',
          'Tap a second point that the arc should pass through',
          'Tap the end point',
        ],
        practice: { type: 'arc' },
      },
      {
        id: 'polyline',
        name: 'Polyline',
        description: 'Creates a connected series of line segments.',
        implemented: true,
        details: 'A connected chain of straight segments, built by tapping each point in turn. Long-press anywhere to finish once you\'ve placed at least two points.',
        steps: ['Tap to place each point', 'Long-press anywhere to finish'],
        practice: { type: 'polyline' },
      },
    ],
  },
  {
    id: '2d-modify',
    label: '2D Modify',
    commands: [
      {
        id: 'move',
        name: 'Move',
        description: 'Moves an object to a new location.',
        implemented: true,
        details: 'Repositions the selected shape. Tap to select it, then drag from any base point to where it should end up — the shape follows exactly.',
        steps: ['Tap a shape to select it', 'Drag from a base point to where it should end up'],
        practice: { type: 'move' },
      },
      {
        id: 'copy',
        name: 'Copy',
        description: 'Duplicates an object.',
        implemented: true,
        details: 'Duplicates the selected shape at a new location. Works just like Move, but the original stays in place and a second copy appears at the offset.',
        steps: ['Tap a shape to select it', 'Drag from a base point to where the copy should go'],
        practice: { type: 'copy' },
      },
      {
        id: 'rotate',
        name: 'Rotate',
        description: 'Rotates an object about its own center.',
        implemented: true,
        details: 'Spins the selected shape around its own center. Drag in an arc around it — the angle you sweep with your finger is the angle it rotates.',
        steps: ['Tap a shape to select it', 'Drag in an arc around it to sweep the rotation'],
        practice: { type: 'rotate' },
      },
      {
        id: 'offset',
        name: 'Offset',
        description: 'Creates a parallel copy at a set distance.',
        implemented: true,
        details: 'Creates a parallel copy of the selected shape at a set distance. Drag outward to grow it or inward to shrink it; the original is left untouched.',
        steps: ['Tap a shape to select it', 'Drag outward to grow, or inward to shrink'],
        practice: { type: 'offset' },
      },
      {
        id: 'trim',
        name: 'Trim',
        description: 'Trims a line at another line that crosses it.',
        implemented: true,
        details: 'Cuts a line back to where it crosses another line. Tap the crossing line first as the cutting edge, then tap the side of the other line you want removed.',
        steps: [
          'Tap the line to use as the cutting edge',
          'Tap the side of the other line you want removed',
        ],
        practice: { type: 'trim' },
      },
      {
        id: 'extend',
        name: 'Extend',
        description: 'Extends a line to meet a boundary line.',
        implemented: true,
        details: 'Stretches a line out until it reaches another line. Tap the boundary line first, then tap near the open end of the line that should reach it.',
        steps: [
          'Tap the line to use as the boundary',
          'Tap near the end of the other line you want extended',
        ],
        practice: { type: 'extend' },
      },
      {
        id: 'mirror',
        name: 'Mirror',
        description: 'Creates a mirrored copy across a line.',
        implemented: true,
        details: 'Creates a mirrored copy of the selected shape across a line you drag out. The original stays in place; only the reflection is new.',
        steps: ['Tap a shape to select it', 'Drag to define the mirror line'],
        practice: { type: 'mirror' },
      },
      {
        id: 'fillet',
        name: 'Fillet',
        description: 'Rounds the corner between two lines with a tangent arc.',
        implemented: true,
        details: 'Rounds the corner where two lines meet, replacing it with a tangent arc of a radius you set. Both lines get trimmed back to meet the new arc smoothly.',
        steps: ['Set the radius', 'Tap the first line', 'Tap the second line'],
        practice: { type: 'fillet' },
      },
      {
        id: 'chamfer',
        name: 'Chamfer',
        description: 'Bevels the corner between two lines with a straight cut.',
        implemented: true,
        details: 'Bevels the corner where two lines meet with a single straight cut at a distance you set. Both lines get trimmed back to meet the new bevel line.',
        steps: ['Set the distance', 'Tap the first line', 'Tap the second line'],
        practice: { type: 'chamfer' },
      },
      {
        id: 'scale',
        name: 'Scale',
        description: 'Resizes an object about its own center.',
        implemented: true,
        details: 'Resizes the selected shape around its own center. Drag outward to enlarge it or inward to shrink it, watching the size change live.',
        steps: ['Tap a shape to select it', 'Drag outward to grow, or inward to shrink'],
        practice: { type: 'scale' },
      },
      {
        id: 'array',
        name: 'Array',
        description: 'Creates repeated copies in a grid or around a center point.',
        implemented: true,
        details: 'Creates repeated copies of the selected shape, either in a Rows x Columns grid or spaced evenly around a center point in Polar mode. The spacing or center comes from where you drag.',
        steps: [
          'Tap a shape to select it',
          'Choose Rectangular or Polar and set the count',
          'Drag to set spacing (Rectangular) or the center point (Polar)',
        ],
        practice: { type: 'array' },
      },
    ],
  },
  {
    id: '3d-create',
    label: '3D Create',
    commands: [
      {
        id: 'extrude',
        name: 'Extrude',
        description: 'Extrudes a 2D profile into a 3D solid.',
        implemented: true,
        details: 'Turns a flat 2D profile into a solid block by giving it depth. You set the depth and direction before committing, and can orbit the result to inspect it.',
        steps: ['Adjust the depth', 'Drag to orbit and inspect the solid'],
        practice: { type: 'extrude' },
      },
      {
        id: 'revolve',
        name: 'Revolve',
        description: 'Revolves a profile around an axis into a solid.',
        implemented: true,
        details: 'Turns a flat 2D profile into a solid by spinning it around an axis. You set the sweep angle and direction — a full 360° makes a complete solid of revolution.',
        steps: ['Adjust the sweep angle', 'Drag to orbit and inspect the solid'],
        practice: { type: 'revolve' },
      },
      {
        id: 'sweep',
        name: 'Sweep',
        description: 'Sweeps a profile along a path into a solid.',
        implemented: true,
        details: 'Turns a small 2D profile into a solid tube by carrying it along a path. You control how far the path bends before running the command.',
        steps: ['Adjust how far the path bends', 'Drag to orbit and inspect the solid'],
        practice: { type: 'sweep' },
      },
      {
        id: 'loft',
        name: 'Loft',
        description: 'Blends a solid between two differently-sized profiles.',
        implemented: true,
        details: 'Blends a solid between two differently sized cross-sections, tapering smoothly from one to the other. You control the top section\'s size and the height between them.',
        steps: ['Adjust the top size and height', 'Drag to orbit and inspect the solid'],
        practice: { type: 'loft' },
      },
    ],
  },
  {
    id: '3d-boolean',
    label: '3D Boolean',
    commands: [
      {
        id: 'union',
        name: 'Union',
        description: 'Combines two overlapping solids into one.',
        implemented: true,
        details: 'Merges two overlapping solids into a single combined shape. Adjust how much they overlap before combining them.',
        steps: ['Adjust how much the two solids overlap', 'Drag to orbit and inspect the result'],
        practice: { type: 'union' },
      },
      {
        id: 'subtract',
        name: 'Subtract',
        description: 'Cuts one solid away from another.',
        implemented: true,
        details: 'Cuts one solid away using the shape of another. Which solid is kept and which is the cutting tool matters — you can swap that order before running it.',
        steps: ['Adjust how much the two solids overlap', 'Drag to orbit and inspect the result'],
        practice: { type: 'subtract' },
      },
      {
        id: 'intersect',
        name: 'Intersect',
        description: 'Keeps only the overlapping volume of two solids.',
        implemented: true,
        details: 'Keeps only the volume where two solids overlap, discarding everything else. Adjust the overlap to see how the shared volume changes.',
        steps: ['Adjust how much the two solids overlap', 'Drag to orbit and inspect the result'],
        practice: { type: 'intersect' },
      },
    ],
  },
];

export function getCommandById(commandId) {
  for (const category of COMMAND_CATEGORIES) {
    const found = category.commands.find((c) => c.id === commandId);
    if (found) return found;
  }
  return null;
}
