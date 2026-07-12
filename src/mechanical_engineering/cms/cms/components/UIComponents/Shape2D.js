import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Rect,
  Line,
  Text as SkText,
  Skia,
  Fill,
} from '@shopify/react-native-skia';

// ─────────────────────────────────────────────────────────────
// Shape2D — pure 2D vector renderer for CMS-driven diagrams.
// No font loading here — pass a loaded Skia font in via `font`
// if any of your shapes are kind: 'text'. Load it once in the
// parent with useFont() and share it across all text shapes.
//
// Supported kinds:
//   line     { x1,y1,x2,y2, color, strokeWidth }
//   rect     { x,y,w,h, color, filled, strokeWidth, radius }
//   circle   { cx,cy,r, color, filled, strokeWidth }
//   ellipse  { cx,cy,rx,ry, color, filled, strokeWidth }
//   arc      { cx,cy,r, startAngle, sweepAngle, color, strokeWidth, filled }
//   path     { d (SVG string) | points:[{x,y}], color, filled, strokeWidth, closed }
//   polygon  { points:[{x,y}...], color, filled, strokeWidth, closed }
//   polyline { points:[{x,y}...], color, strokeWidth }
//   arrow    { x1,y1,x2,y2, color, strokeWidth, headSize }
//   text     { x,y, text, color, fontSize } — requires `font` prop on Shape2D
// ─────────────────────────────────────────────────────────────

const DEFAULT_COLOR = '#333333';

const pointsToPath = (points = [], closed = false) => {
  const p = Skia.Path.Make();
  points.forEach((pt, i) => (i === 0 ? p.moveTo(pt.x, pt.y) : p.lineTo(pt.x, pt.y)));
  if (closed) p.close();
  return p;
};

const svgStringToPath = (d) => {
  try {
    return Skia.Path.MakeFromSVGString(d) || Skia.Path.Make();
  } catch {
    return Skia.Path.Make();
  }
};

const arrowHeadPath = (x1, y1, x2, y2, size = 8, headAngle = 0.45) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  const lx = x2 - size * (ux * Math.cos(headAngle) - uy * Math.sin(headAngle));
  const ly = y2 - size * (uy * Math.cos(headAngle) + ux * Math.sin(headAngle));
  const rx = x2 - size * (ux * Math.cos(headAngle) + uy * Math.sin(headAngle));
  const ry = y2 - size * (uy * Math.cos(headAngle) - ux * Math.sin(headAngle));

  const p = Skia.Path.Make();
  p.moveTo(x2, y2);
  p.lineTo(lx, ly);
  p.lineTo(rx, ry);
  p.close();
  return p;
};

// Each ShapeItem is its own component so hooks (useMemo) stay
// in a stable order per shape instance, even though `kind` never
// changes for a given item once mounted.
const ShapeItem = ({ shape, font }) => {
  const {
    kind,
    color = DEFAULT_COLOR,
    filled = false,
    strokeWidth = 1.5,
    strokeCap = 'round',
    strokeJoin = 'round',
    opacity = 1,
  } = shape;

  const style = filled ? 'fill' : 'stroke';

  switch (kind) {
    case 'line':
      return (
        <Line
          p1={{ x: shape.x1, y: shape.y1 }}
          p2={{ x: shape.x2, y: shape.y2 }}
          color={color}
          strokeWidth={strokeWidth}
          strokeCap={strokeCap}
          opacity={opacity}
        />
      );

    case 'rect': {
      const path = useMemo(() => {
        const p = Skia.Path.Make();
        if (shape.radius) {
          p.addRRect(
            Skia.RRectXY(Skia.XYWHRect(shape.x, shape.y, shape.w, shape.h), shape.radius, shape.radius)
          );
        } else {
          p.addRect(Skia.XYWHRect(shape.x, shape.y, shape.w, shape.h));
        }
        return p;
      }, [shape.x, shape.y, shape.w, shape.h, shape.radius]);
      return <Path path={path} color={color} style={style} strokeWidth={strokeWidth} opacity={opacity} />;
    }

    case 'circle': {
      const path = useMemo(() => {
        const p = Skia.Path.Make();
        p.addCircle(shape.cx, shape.cy, shape.r);
        return p;
      }, [shape.cx, shape.cy, shape.r]);
      return <Path path={path} color={color} style={style} strokeWidth={strokeWidth} opacity={opacity} />;
    }

    case 'ellipse': {
      const path = useMemo(() => {
        const p = Skia.Path.Make();
        p.addOval(Skia.XYWHRect(shape.cx - shape.rx, shape.cy - shape.ry, shape.rx * 2, shape.ry * 2));
        return p;
      }, [shape.cx, shape.cy, shape.rx, shape.ry]);
      return <Path path={path} color={color} style={style} strokeWidth={strokeWidth} opacity={opacity} />;
    }

    case 'arc': {
      const path = useMemo(() => {
        const p = Skia.Path.Make();
        p.addArc(
          { x: shape.cx - shape.r, y: shape.cy - shape.r, width: shape.r * 2, height: shape.r * 2 },
          shape.startAngle ?? 0,
          shape.sweepAngle ?? 90
        );
        return p;
      }, [shape.cx, shape.cy, shape.r, shape.startAngle, shape.sweepAngle]);
      return (
        <Path path={path} color={color} style={style} strokeWidth={strokeWidth} strokeCap={strokeCap} opacity={opacity} />
      );
    }

    case 'path': {
      const path = useMemo(() => {
        if (typeof shape.d === 'string') return svgStringToPath(shape.d);
        if (Array.isArray(shape.points)) return pointsToPath(shape.points, shape.closed);
        return Skia.Path.Make();
      }, [shape.d, shape.points, shape.closed]);
      return (
        <Path
          path={path}
          color={color}
          style={style}
          strokeWidth={strokeWidth}
          strokeCap={strokeCap}
          strokeJoin={strokeJoin}
          opacity={opacity}
        />
      );
    }

    case 'polygon': {
      const path = useMemo(() => pointsToPath(shape.points || [], shape.closed !== false), [shape.points, shape.closed]);
      return (
        <Path path={path} color={color} style={style} strokeWidth={strokeWidth} strokeJoin={strokeJoin} opacity={opacity} />
      );
    }

    case 'polyline': {
      const path = useMemo(() => pointsToPath(shape.points || [], false), [shape.points]);
      return (
        <Path
          path={path}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap={strokeCap}
          strokeJoin={strokeJoin}
          opacity={opacity}
        />
      );
    }

    case 'arrow': {
      const linePath = useMemo(() => {
        const p = Skia.Path.Make();
        p.moveTo(shape.x1, shape.y1);
        p.lineTo(shape.x2, shape.y2);
        return p;
      }, [shape.x1, shape.y1, shape.x2, shape.y2]);
      const headPath = useMemo(
        () => arrowHeadPath(shape.x1, shape.y1, shape.x2, shape.y2, shape.headSize || 8),
        [shape.x1, shape.y1, shape.x2, shape.y2, shape.headSize]
      );
      return (
        <>
          <Path path={linePath} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" opacity={opacity} />
          <Path path={headPath} color={color} style="fill" opacity={opacity} />
        </>
      );
    }

    case 'text':
      if (!font) return null; // silently skip until font loads, same as before
      return (
        <SkText x={shape.x} y={shape.y} text={shape.text ?? ''} font={font} color={color} opacity={opacity} />
      );

    default:
      return null;
  }
};

/**
 * Shape2D
 * Props:
 *  - width, height       canvas size
 *  - shapes              array of shape descriptors
 *  - font                optional Skia font (load once with useFont in parent) — required for 'text' shapes
 *  - backgroundColor     canvas fill color (default transparent)
 *  - style                wrapper style override
 */
const Shape2D = ({ width = 300, height = 200, shapes = [], font = null, backgroundColor, style }) => (
  <View style={[styles.wrapper, { width, height }, style]}>
    <Canvas style={{ width, height }}>
      {backgroundColor ? <Fill color={backgroundColor} /> : null}
      {shapes.map((shape, i) => (
        <ShapeItem key={shape.id || i} shape={shape} font={font} />
      ))}
    </Canvas>
  </View>
);

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start' },
});

export default Shape2D;