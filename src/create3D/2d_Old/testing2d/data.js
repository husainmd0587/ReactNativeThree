

export const shape1 = [
  {
    type: "line",
    p1: { x: -100, y: -250 },
    p2: { x: 100, y: -250 }
  },
{
  type: "arc",
  cx: 0,
  cy: -150,
  r: 100,
  startAngle: Math.atan2(-100, 100), // 🔥 correct
  endAngle: Math.PI / 2,
  clockwise: false
}

];
