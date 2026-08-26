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
        steps: ['Touch the first point', 'Drag to the second point and release'],
        practice: { type: 'line' },
      },
      {
        id: 'circle',
        name: 'Circle',
        description: 'Creates a circle from a center point and radius.',
        implemented: true,
        steps: ['Touch the center point', 'Drag out to the edge and release'],
        practice: { type: 'circle' },
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        description: 'Creates a rectangle from two opposite corners.',
        implemented: true,
        steps: ['Touch one corner', 'Drag to the opposite corner and release'],
        practice: { type: 'rectangle' },
      },
      {
        id: 'arc',
        name: 'Arc',
        description: 'Creates an arc through three points.',
        implemented: true,
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
        steps: ['Tap a shape to select it', 'Drag from a base point to where it should end up'],
        practice: { type: 'move' },
      },
      {
        id: 'copy',
        name: 'Copy',
        description: 'Duplicates an object.',
        implemented: true,
        steps: ['Tap a shape to select it', 'Drag from a base point to where the copy should go'],
        practice: { type: 'copy' },
      },
      {
        id: 'rotate',
        name: 'Rotate',
        description: 'Rotates an object about its own center.',
        implemented: true,
        steps: ['Tap a shape to select it', 'Drag in an arc around it to sweep the rotation'],
        practice: { type: 'rotate' },
      },
      {
        id: 'offset',
        name: 'Offset',
        description: 'Creates a parallel copy at a set distance.',
        implemented: true,
        steps: ['Tap a shape to select it', 'Drag outward to grow, or inward to shrink'],
        practice: { type: 'offset' },
      },
      {
        id: 'trim',
        name: 'Trim',
        description: 'Trims a line at another line that crosses it.',
        implemented: true,
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
        steps: ['Tap a shape to select it', 'Drag to define the mirror line'],
        practice: { type: 'mirror' },
      },
      {
        id: 'fillet',
        name: 'Fillet',
        description: 'Rounds the corner between two lines with a tangent arc.',
        implemented: true,
        steps: ['Set the radius', 'Tap the first line', 'Tap the second line'],
        practice: { type: 'fillet' },
      },
      {
        id: 'chamfer',
        name: 'Chamfer',
        description: 'Bevels the corner between two lines with a straight cut.',
        implemented: true,
        steps: ['Set the distance', 'Tap the first line', 'Tap the second line'],
        practice: { type: 'chamfer' },
      },
      {
        id: 'scale',
        name: 'Scale',
        description: 'Resizes an object about its own center.',
        implemented: true,
        steps: ['Tap a shape to select it', 'Drag outward to grow, or inward to shrink'],
        practice: { type: 'scale' },
      },
      {
        id: 'array',
        name: 'Array',
        description: 'Creates repeated copies in a grid or around a center point.',
        implemented: true,
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
        steps: ['Adjust the depth', 'Drag to orbit and inspect the solid'],
        practice: { type: 'extrude' },
      },
      {
        id: 'revolve',
        name: 'Revolve',
        description: 'Revolves a profile around an axis into a solid.',
        implemented: true,
        steps: ['Adjust the sweep angle', 'Drag to orbit and inspect the solid'],
        practice: { type: 'revolve' },
      },
      { id: 'sweep', name: 'Sweep', description: 'Sweeps a profile along a path.', implemented: false },
      { id: 'loft', name: 'Loft', description: 'Blends a solid between multiple profiles.', implemented: false },
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
        steps: ['Adjust how much the two solids overlap', 'Drag to orbit and inspect the result'],
        practice: { type: 'union' },
      },
      {
        id: 'subtract',
        name: 'Subtract',
        description: 'Cuts one solid away from another.',
        implemented: true,
        steps: ['Adjust how much the two solids overlap', 'Drag to orbit and inspect the result'],
        practice: { type: 'subtract' },
      },
      {
        id: 'intersect',
        name: 'Intersect',
        description: 'Keeps only the overlapping volume of two solids.',
        implemented: true,
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
