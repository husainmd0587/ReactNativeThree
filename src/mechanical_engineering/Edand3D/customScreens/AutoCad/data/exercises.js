// One controlled exercise per implemented command (spec section 11: known
// geometry, known expected result — not a general-purpose CAD workspace).
// Adding a new exercise, or a harder variant later, only ever means adding
// data here.

export const EXERCISES = {
  line: {
    instruction: 'Draw a horizontal line of 100 mm.',
    target: {
      lengthMm: 100,
      angleDeg: 0,
      tolerance: { lengthMm: 3, angleDeg: 3 },
    },
  },
  circle: {
    instruction: 'Draw a circle with a 40 mm radius.',
    target: {
      radiusMm: 40,
      tolerance: { radiusMm: 3 },
    },
  },
  rectangle: {
    instruction: 'Draw a rectangle 80 mm wide and 50 mm tall.',
    target: {
      widthMm: 80,
      heightMm: 50,
      tolerance: { widthMm: 3, heightMm: 3 },
    },
  },
};
