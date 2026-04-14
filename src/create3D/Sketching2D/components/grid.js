import { Skia } from "@shopify/react-native-skia";
import { useState, useMemo } from "react";
import { Path } from "@shopify/react-native-skia";


export const createGrid = (minor = 20, major = 100, extent = 1000) => {
  const minorPath = Skia.Path.Make();
  const majorPath = Skia.Path.Make();
  const bgRect = Skia.Path.Make();
  const xAxisPath = Skia.Path.Make();
  const yAxisPath = Skia.Path.Make();
  xAxisPath.moveTo(-extent, 0);
  xAxisPath.lineTo(extent, 0);
  yAxisPath.moveTo(0, -extent);
  yAxisPath.lineTo(0, extent);

  for (let x = -extent; x <= extent; x += minor) {
    const isMajor = x % major === 0;
    if(isMajor){
      majorPath.moveTo(x, -extent) ;majorPath.lineTo(x, extent)
    }else{
      minorPath.moveTo(x, -extent) ;minorPath.lineTo(x, extent)}
  }

  for (let y = -extent; y <= extent; y += minor) {
    const isMajor = y % major === 0;
    if(isMajor){
      majorPath.moveTo(-extent, -y) ;majorPath.lineTo(extent, -y)
    }else{
      minorPath.moveTo(-extent, -y) ;minorPath.lineTo(extent, -y)}
  }

  bgRect.addRect({
  x: -extent,
  y: -extent,
  width: extent*2,
  height: extent*2
});
  return { minorPath, majorPath, xAxisPath, yAxisPath ,bgRect};
};


 const Grid = ({
  minor = 20,
  major = 100,
  extent = 1000,
  minorColor = "#999",
  majorColor = "#999",
  axisXColor = "red",
  axisYColor = "blue",
  bgRectColor = "#fff",
  minorWidth = .5,
  majorWidth = 1,
  axisWidth = 1,
  minorOpacity = 0.3,
  majorOpacity = 0.6,

}) => {
  const { minorPath, majorPath, xAxisPath, yAxisPath ,bgRect} = useMemo(() =>
    createGrid(minor, major, extent), [minor, major, extent]
  );

  return (
    <>
    <Path   path={bgRect} color={bgRectColor} style="fill" />
      <Path path={minorPath} color={minorColor} style="stroke" strokeWidth={minorWidth} opacity={minorOpacity} />
      <Path path={majorPath} color={majorColor} style="stroke" strokeWidth={majorWidth} opacity={majorOpacity} />
      <Path path={xAxisPath} color={axisXColor} style="stroke" strokeWidth={axisWidth} />
      <Path path={yAxisPath} color={axisYColor} style="stroke" strokeWidth={axisWidth} />  
    </>
  );
};
export default Grid;

export const Crosshair = ({ size = 10, color = "red", strokeWidth = 2.5 ,transform}) => {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-size, 0);
    p.lineTo(size, 0);
    p.moveTo(0, -size);
    p.lineTo(0, size);
    return p;
  }, [size]);

  return <Path path={path} color={color} style="stroke" strokeWidth={strokeWidth} 
   transform={transform}
  />;
}


// components/grid.js

/**
 * Decide active grid size based on zoom level.
 * When minor grid lines are closer than 8px on screen → switch to major.
 *
 * @param {number} scale      current viewport scale (from scale.value)
 * @param {number} minor      minor grid spacing (default 20)
 * @param {number} major      major grid spacing (default 100)
 * @returns {number}          active grid size in world units
 */
export function getActiveGridSize(scale, minor = 20, major = 100) {
  const minorScreenSize = minor * scale;
  if (minorScreenSize < 8) return major;
  return minor;
}
// Add this to the bottom of your grid.js file

/**
 * Resolves the final snap point combining OSNAP and grid snap.
 * @param {number} wx - world x
 * @param {number} wy - world y
 * @param {object|null} osnapResult - result from findSnapPoint (or null)
 * @param {number} activeGrid - current active grid size
 * @param {number} gridThreshold - max world-unit distance for grid snap
 * @param {boolean} gridSnapEnabled - whether grid snap is on
 * @returns {{ x, y, snapType: 'osnap'|'grid'|null }}
 */
export function resolveSnap(wx, wy, osnapResult, activeGrid, gridThreshold, gridSnapEnabled) {
  // OSNAP wins over grid snap
  if (osnapResult) {
    return { x: osnapResult.x, y: osnapResult.y, snapType: 'osnap' };
  }

  if (gridSnapEnabled) {
    const snappedX = Math.round(wx / activeGrid) * activeGrid;
    const snappedY = Math.round(wy / activeGrid) * activeGrid;
    const dist = Math.hypot(wx - snappedX, wy - snappedY);
    if (dist <= gridThreshold) {
      return { x: snappedX, y: snappedY, snapType: 'grid' };
    }
  }

  return { x: wx, y: wy, snapType: null };
}

/**
 * Snaps a world coordinate to the nearest grid point.
 */
export function snapToGrid(wx, wy, gridSize) {
  return {
    x: Math.round(wx / gridSize) * gridSize,
    y: Math.round(wy / gridSize) * gridSize,
  };
}
