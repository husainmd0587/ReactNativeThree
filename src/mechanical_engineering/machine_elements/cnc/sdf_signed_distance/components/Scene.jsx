import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Workpiece } from './Workpiece';
import { CuttingTool } from './CuttingTool';
import CanvaProvider from '../../../../../provider'
// Chip particles
const ChipParticles = ({ toolPosition, isCutting }) => {
  const particlesRef = useRef(null);
  const count = 150;
  
  const positions = useRef(new Float32Array(count * 3));
  const velocities = useRef(new Float32Array(count * 3));
  const lifetimes = useRef(new Float32Array(count));
  
  const resetParticle = (i) => {
    const idx = i * 3;
    positions.current[idx] = toolPosition[0] + (Math.random() - 0.5) * 2;
    positions.current[idx + 1] = toolPosition[1];
    positions.current[idx + 2] = toolPosition[2] + (Math.random() - 0.5) * 2;
    velocities.current[idx] = (Math.random() - 0.5) * 5;
    velocities.current[idx + 1] = Math.random() * 6 + 2;
    velocities.current[idx + 2] = (Math.random() - 0.5) * 5;
    lifetimes.current[i] = Math.random() * 1.5 + 0.5;
  };
  
  for (let i = 0; i < count; i++) {
    resetParticle(i);
    lifetimes.current[i] = Math.random() * 2;
  }
  
  useFrame((state, delta) => {
    if (!particlesRef.current || !isCutting) return;
    const posArray = particlesRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      lifetimes.current[i] -= delta;
      if (lifetimes.current[i] <= 0) {
        resetParticle(i);
      } else {
        velocities.current[idx + 1] -= 9.8 * delta;
        posArray[idx] += velocities.current[idx] * delta;
        posArray[idx + 1] += velocities.current[idx + 1] * delta;
        posArray[idx + 2] += velocities.current[idx + 2] * delta;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions.current} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.25} color="#C4A35A" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

// Simulation runner - KEY COMPONENT
const SimulationRunner = ({ tick }) => {
  useFrame((state, delta) => {
    tick(delta);
  });
  return null;
};

export const Scene = ({ 
  dimensions, 
  tool, 
  sdfTexture, 
  toolPosition, 
  isRunning, 
  spindleSpeed, 
  cutDepth,
  tick 
}) => {
  return (
    <CanvaProvider camPosition={[50, 30, 50]}>
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 60, 150]} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#4455ff" />
      <pointLight position={[10, 5, 10]} intensity={0.3} color="#ffaa44" />
      
      <Environment preset="warehouse" />
      
      <Grid
        position={[0, -dimensions.height / 2 - 0.1, 0]}
        args={[100, 100]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#444466"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#666699"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
      />
      
      <Workpiece
        dimensions={dimensions}
        sdfTexture={sdfTexture}
        toolPosition={toolPosition}
        toolRadius={tool.radius}
        toolLength={tool.length}
        cutDepth={cutDepth}
      />
      
      <CuttingTool
        tool={tool}
        position={toolPosition}
        spindleSpeed={spindleSpeed}
        isCutting={isRunning}
      />
      
      <ChipParticles toolPosition={toolPosition} isCutting={isRunning} />
      
      {/* Machine bed */}
      <mesh position={[0, -dimensions.height / 2 - 2, 0]} receiveShadow>
        <boxGeometry args={[80, 4, 80]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Simulation tick - runs every frame */}
      <SimulationRunner tick={tick} />
    </CanvaProvider>
  );
};