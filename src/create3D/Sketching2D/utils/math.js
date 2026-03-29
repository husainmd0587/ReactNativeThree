export  const clamp = (val, min, max) => {
    'worklet';
    return Math.max(min, Math.min(val, max));
  };



export const calcDist = (x1, y1, x2, y2) => {
  'worklet';
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

export const snapToGrid = (x, y, size = 10) => {
    'worklet';
  return {
    x: Math.round(x / size) * size,
    y: Math.round(y / size) * size
  };
};
