import { Skia } from "@shopify/react-native-skia";
import { useState, useMemo } from "react";

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
import { Path } from "@shopify/react-native-skia";
import { exp } from "three/webgpu";

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

