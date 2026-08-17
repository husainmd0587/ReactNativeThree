/**
 * CAD Practice — command registry
 *
 * Commands are plain data, not code branches. The practice engine reads
 * `practice.type` / `validator.type` off a command definition instead of
 * switching on command id — see screens/CommandPractice.jsx. `line`,
 * `circle`, and `rectangle` are implemented; everything else is listed so
 * the home screen can show the full roadmap, but stays disabled until it
 * has a real practice engine behind it too.
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
        validator: { type: 'line' },
      },
      {
        id: 'circle',
        name: 'Circle',
        description: 'Creates a circle from a center point and radius.',
        implemented: true,
        steps: ['Touch the center point', 'Drag out to the edge and release'],
        practice: { type: 'circle' },
        validator: { type: 'circle' },
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        description: 'Creates a rectangle from two opposite corners.',
        implemented: true,
        steps: ['Touch one corner', 'Drag to the opposite corner and release'],
        practice: { type: 'rectangle' },
        validator: { type: 'rectangle' },
      },
      {
        id: 'arc',
        name: 'Arc',
        description: 'Creates an arc through a set of points.',
        implemented: false,
      },
      {
        id: 'polyline',
        name: 'Polyline',
        description: 'Creates a connected series of line segments.',
        implemented: false,
      },
    ],
  },
  {
    id: '2d-modify',
    label: '2D Modify',
    commands: [
      { id: 'move', name: 'Move', description: 'Moves an object to a new location.', implemented: false },
      { id: 'copy', name: 'Copy', description: 'Duplicates an object.', implemented: false },
      { id: 'rotate', name: 'Rotate', description: 'Rotates an object about a base point.', implemented: false },
      { id: 'offset', name: 'Offset', description: 'Creates a parallel copy at a set distance.', implemented: false },
      { id: 'trim', name: 'Trim', description: 'Trims an object at a cutting edge.', implemented: false },
      { id: 'extend', name: 'Extend', description: 'Extends an object to a boundary.', implemented: false },
      { id: 'mirror', name: 'Mirror', description: 'Creates a mirrored copy across a line.', implemented: false },
      { id: 'fillet', name: 'Fillet', description: 'Rounds a corner between two objects.', implemented: false },
      { id: 'chamfer', name: 'Chamfer', description: 'Bevels a corner between two objects.', implemented: false },
      { id: 'scale', name: 'Scale', description: 'Resizes an object about a base point.', implemented: false },
      { id: 'array', name: 'Array', description: 'Creates repeated copies in a pattern.', implemented: false },
    ],
  },
  {
    id: '3d-create',
    label: '3D Create',
    commands: [
      { id: 'extrude', name: 'Extrude', description: 'Extrudes a 2D profile into a 3D solid.', implemented: false },
      { id: 'revolve', name: 'Revolve', description: 'Revolves a profile around an axis.', implemented: false },
      { id: 'sweep', name: 'Sweep', description: 'Sweeps a profile along a path.', implemented: false },
      { id: 'loft', name: 'Loft', description: 'Blends a solid between multiple profiles.', implemented: false },
    ],
  },
  {
    id: '3d-boolean',
    label: '3D Boolean',
    commands: [
      { id: 'union', name: 'Union', description: 'Combines solids into one.', implemented: false },
      { id: 'subtract', name: 'Subtract', description: 'Removes one solid from another.', implemented: false },
      { id: 'intersect', name: 'Intersect', description: 'Keeps only the overlapping volume of two solids.', implemented: false },
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
