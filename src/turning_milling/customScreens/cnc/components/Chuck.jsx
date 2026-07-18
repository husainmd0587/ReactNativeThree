import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';

/**
 * Chuck
 *
 * Renders a 3-jaw lathe chuck clamping the far end of the stock, and spins it
 * (and the jaws) continuously around the part's axial axis while the spindle is
 * "on" - matching the workpiece's own rotation during cutting.
 *
 * COORDINATE CONVENTION: this lives in the same local space as CNCLatheSimulator
 * (local Y = the part's axial/Z direction, X/Z = the radius plane), so render it
 * as a SIBLING inside the same rotated wrapping <group> your scene already uses
 * for CNCLatheSimulator (e.g. <group rotation={[0,0,-Math.PI/2]}>). It does not
 * rotate itself into that convention - only around its own spin axis.
 *
 * Props:
 *  - stockConfig: { stockDiameter, stockLength, zFace } - same object you pass to
 *    CNCLatheSimulator. Used to auto-position the chuck just past the stock's far
 *    (un-machined / clamped) end so it never overlaps the part geometry.
 *  - spinning: boolean - whether to animate rotation (tie this to your `playing` state)
 *  - rpm: number - spindle speed driving the spin rate (defaults to a reasonable
 *    idle rate if not provided, so the chuck still visibly spins even before
 *    telemetry reports a real value)
 *  - jawCount: number of jaws (default 3, the standard lathe chuck)
 *  - chuckRadius, chuckDepth, gap: override the auto-sized chuck body dimensions
 */
export default function Chuck({
  stockConfig,
  spinning = false,
  rpm = 400,
  jawCount = 3,
  chuckRadius,
  chuckDepth,
  gap,
}) {
  const spinGroupRef = useRef();

  const stockRadius = (stockConfig?.stockDiameter ?? 40) / 2;
  const radius = chuckRadius ?? stockRadius * 1.7;
  const depth = chuckDepth ?? stockRadius * 1.4;
  const zMin = (stockConfig?.zFace ?? 0) - (stockConfig?.stockLength ?? 80);
  // Sit just past the stock's far (clamped) end so the chuck body and the raw
  // stock never intersect. Gap scales with stock size - a fixed small gap was
  // proportionally tiny (under 10% of diameter) next to larger stock, and read
  // as the chuck touching/covering the part rather than a clear separation.
  const resolvedGap = gap ?? Math.max(4, stockRadius * 0.5);
  const chuckCenterY = zMin - resolvedGap - depth / 2;

  const jawLength = stockRadius * 0.9;
  const jawWidth = radius * 0.4;
  // Jaws span radially from the chuck body's face out near `radius` down to just
  // touching the stock's outer surface - NOT embedded inside the solid stock.
  // (A too-small grip radius here would bury the jaw geometry inside the part.)
  const jawInnerRadius = stockRadius * 0.95;
  const jawOuterRadius = radius * 0.92;
  const jawThickness = Math.max(1, jawOuterRadius - jawInnerRadius);
  const jawGripRadius = (jawInnerRadius + jawOuterRadius) / 2;
  const jawY = chuckCenterY + depth / 2 + jawLength / 2 - stockRadius * 0.15; // jaws lead slightly past the chuck face, into gripping position on the stock

  useFrame((_, delta) => {
    if (!spinGroupRef.current || !spinning) return;
    const radiansPerSec = (rpm / 60) * Math.PI * 2;
    spinGroupRef.current.rotation.y += radiansPerSec * delta;
  });

  return (
    <group ref={spinGroupRef}>
      {/* Chuck body */}
      <mesh position={[0, chuckCenterY, 0]}>
        <cylinderGeometry args={[radius, radius * 1.05, depth, 48]} />
        <meshStandardMaterial color="#3a3d42" metalness={0.75} roughness={0.4} />
      </mesh>

      {/* Front face plate (slightly larger disk where the jaws mount) */}
      <mesh position={[0, chuckCenterY + depth / 2, 0]}>
        <cylinderGeometry args={[radius * 1.08, radius * 1.08, radius * 0.12, 48]} />
        <meshStandardMaterial color="#2c2f34" metalness={0.8} roughness={0.35} />
      </mesh>

      {jawCount > 0 &&
        Array.from({ length: jawCount }).map((_, i) => {
          const angle = (i / jawCount) * Math.PI * 2;
          return (
            <Jaw
              key={i}
              angle={angle}
              radius={jawGripRadius}
              y={jawY}
              length={jawLength}
              width={jawWidth}
              thickness={jawThickness}
            />
          );
        })}
    </group>
  );
}

function Jaw({ angle, radius, y, length, width, thickness }) {
  return (
    <group rotation={[0, angle, 0]}>
      <mesh position={[radius, y, 0]}>
        <boxGeometry args={[thickness, length, width]} />
        <meshStandardMaterial color="#4a4e55" metalness={0.65} roughness={0.45} />
      </mesh>
      {/* Small gripping tooth on the inner face, facing the stock */}
      <mesh position={[radius - thickness / 2 - width * 0.08, y, 0]}>
        <boxGeometry args={[width * 0.16, length * 0.7, width * 0.7]} />
        <meshStandardMaterial color="#5a5e66" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}
