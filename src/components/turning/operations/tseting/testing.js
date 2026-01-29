import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

// Optimized Voxel Grid for Mobile
class MobileVoxelGrid {
  constructor(size = 48) {
    this.size = size;
    this.voxels = new Uint8Array(size * size * size);
    this.initialize();
  }

  initialize() {
    const center = this.size / 2;
    const radius = this.size * 0.35;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const dx = x - center;
          const dy = y - center;
          const dz = z - center;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const idx = x + y * this.size + z * this.size * this.size;
          this.voxels[idx] = dist < radius ? 1 : 0;
        }
      }
    }
  }

  getIndex(x, y, z) {
    x = Math.max(0, Math.min(this.size - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.size - 1, Math.floor(y)));
    z = Math.max(0, Math.min(this.size - 1, Math.floor(z)));
    return x + y * this.size + z * this.size * this.size;
  }

  removeVoxel(x, y, z) {
    const idx = this.getIndex(x, y, z);
    if (this.voxels[idx] === 1) {
      this.voxels[idx] = 0;
    }
  }

  getVoxel(x, y, z) {
    return this.voxels[this.getIndex(x, y, z)];
  }

  countVoxels() {
    let count = 0;
    for (let i = 0; i < this.voxels.length; i++) {
      if (this.voxels[i] === 1) count++;
    }
    return count;
  }
}

// Mesh Generator Component
const MeshGenerator = {
  generateGeometry: (grid) => {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const colors = [];

    const voxelSize = 0.5;
    const cx = grid.size / 2;
    const cy = grid.size / 2;
    const cz = grid.size / 2;

    const directions = [
      { offset: [1, 0, 0], normal: [1, 0, 0], color: [0.95, 0.75, 0.45] },
      { offset: [-1, 0, 0], normal: [-1, 0, 0], color: [0.85, 0.65, 0.35] },
      { offset: [0, 1, 0], normal: [0, 1, 0], color: [0.90, 0.70, 0.40] },
      { offset: [0, -1, 0], normal: [0, -1, 0], color: [0.80, 0.60, 0.30] },
      { offset: [0, 0, 1], normal: [0, 0, 1], color: [0.92, 0.72, 0.42] },
      { offset: [0, 0, -1], normal: [0, 0, -1], color: [0.88, 0.68, 0.38] },
    ];

    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        for (let z = 0; z < grid.size; z++) {
          if (grid.getVoxel(x, y, z) === 0) continue;

          const vx = (x - cx) * voxelSize;
          const vy = (y - cy) * voxelSize;
          const vz = (z - cz) * voxelSize;

          directions.forEach((dir) => {
            const nx = x + dir.offset[0];
            const ny = y + dir.offset[1];
            const nz = z + dir.offset[2];

            if (grid.getVoxel(nx, ny, nz) === 0) {
              const hs = voxelSize / 2;

              if (dir.offset[0] !== 0) {
                positions.push(
                  vx + (dir.offset[0] > 0 ? hs : -hs), vy - hs, vz - hs,
                  vx + (dir.offset[0] > 0 ? hs : -hs), vy + hs, vz - hs,
                  vx + (dir.offset[0] > 0 ? hs : -hs), vy + hs, vz + hs,
                  vx + (dir.offset[0] > 0 ? hs : -hs), vy - hs, vz + hs
                );
              } else if (dir.offset[1] !== 0) {
                positions.push(
                  vx - hs, vy + (dir.offset[1] > 0 ? hs : -hs), vz - hs,
                  vx + hs, vy + (dir.offset[1] > 0 ? hs : -hs), vz - hs,
                  vx + hs, vy + (dir.offset[1] > 0 ? hs : -hs), vz + hs,
                  vx - hs, vy + (dir.offset[1] > 0 ? hs : -hs), vz + hs
                );
              } else {
                positions.push(
                  vx - hs, vy - hs, vz + (dir.offset[2] > 0 ? hs : -hs),
                  vx + hs, vy - hs, vz + (dir.offset[2] > 0 ? hs : -hs),
                  vx + hs, vy + hs, vz + (dir.offset[2] > 0 ? hs : -hs),
                  vx - hs, vy + hs, vz + (dir.offset[2] > 0 ? hs : -hs)
                );
              }

              for (let i = 0; i < 4; i++) {
                normals.push(...dir.normal);
                colors.push(...dir.color);
              }
            }
          });
        }
      }
    }

    if (positions.length > 0) {
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

      const indices = [];
      for (let i = 0; i < positions.length / 3; i += 4) {
        if (i + 3 < positions.length / 3) {
          indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
        }
      }
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    }

    return geometry;
  },
};

// Workpiece Component - R3F
const Workpiece = ({ gridData, updateKey }) => {
  const meshRef = useRef(null);
  const [geometry, setGeometry] = useState(() => MeshGenerator.generateGeometry(gridData));

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  useEffect(() => {
    const newGeometry = MeshGenerator.generateGeometry(gridData);
    if (geometry) {
      geometry.dispose();
    }
    setGeometry(newGeometry);
  }, [updateKey]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial color={0xccaa44} shininess={100} vertexColors />
    </mesh>
  );
};

// Scene Setup Component
const SceneSetup = () => {
  const { scene, camera } = useThree();

  useEffect(() => {
    // Camera setup
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff8844, 0.5, 50);
    pointLight.position.set(10, 5, 10);
    scene.add(pointLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(40, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(15);
    scene.add(axesHelper);

    return () => {
      ambientLight.dispose();
      directionalLight.dispose();
      pointLight.dispose();
      gridHelper.dispose();
      axesHelper.dispose();
    };
  }, []);

  return null;
};

// CNC Operations
const CNCOperations = {
  facing: (grid, progress) => {
    const depth = Math.floor(progress * grid.size * 0.4);
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const radius = grid.size * 0.35;

    for (let x = 0; x < grid.size; x++) {
      for (let z = 0; z < grid.size; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        if (Math.sqrt(dx * dx + dz * dz) < radius) {
          for (let y = 0; y < depth && y < grid.size; y++) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  turning: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const targetRadius = grid.size * 0.35 * (1 - progress * 0.6);

    for (let x = 0; x < grid.size; x++) {
      for (let y = 0; y < grid.size; y++) {
        for (let z = 0; z < grid.size; z++) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const currentRadius = Math.sqrt(dx * dx + dz * dz);
          if (currentRadius > targetRadius) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  grooving: (grid, progress) => {
    const grooveWidth = 3;
    const grooveDepth = Math.floor(progress * grid.size * 0.2);
    const grooveStart = Math.floor(grid.size * 0.2);
    const grooveSpacing = 8;
    const centerX = grid.size / 2;

    for (let groove = 0; groove < 2; groove++) {
      const yPos = grooveStart + groove * grooveSpacing;
      if (yPos >= grid.size) break;

      for (let y = yPos; y < Math.min(yPos + grooveDepth, grid.size); y++) {
        for (let x = Math.max(0, centerX - grooveWidth); x < Math.min(grid.size, centerX + grooveWidth); x++) {
          for (let z = 0; z < grid.size; z++) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  drilling: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const drillRadius = 2;
    const drillDepth = Math.floor(progress * grid.size * 0.8);

    for (let x = 0; x < grid.size; x++) {
      for (let z = 0; z < grid.size; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        if (dx * dx + dz * dz <= drillRadius * drillRadius) {
          for (let y = grid.size - drillDepth; y < grid.size; y++) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  boring: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const boringRadius = 2 + progress * 3;

    for (let x = 0; x < grid.size; x++) {
      for (let z = 0; z < grid.size; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < boringRadius && dist > 1.5) {
          for (let y = grid.size - Math.floor(grid.size * 0.6); y < grid.size; y++) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  threading: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const threadRadius = grid.size * 0.3;
    const threadDepth = Math.floor(progress * grid.size * 0.15);

    for (let y = 0; y < grid.size; y++) {
      const angle = (y / 2.5) * Math.PI * 2;
      const threadX = centerX + Math.cos(angle) * threadRadius;
      const threadZ = centerZ + Math.sin(angle) * threadRadius;

      for (let d = 0; d < threadDepth; d++) {
        grid.removeVoxel(threadX - d * 0.05, y, threadZ - d * 0.05);
      }
    }
  },

  cutoff: (grid, progress) => {
    const cutoffPos = Math.floor(grid.size * (1 - progress * 0.5));
    for (let x = 0; x < grid.size; x++) {
      for (let y = cutoffPos; y < grid.size; y++) {
        for (let z = 0; z < grid.size; z++) {
          grid.removeVoxel(x, y, z);
        }
      }
    }
  },

  tapering: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const maxRadius = grid.size * 0.35;

    for (let y = 0; y < grid.size; y++) {
      const taper = 1 - (y / grid.size) * 0.5;
      const currentRadius = maxRadius * taper * (1 - progress * 0.4);

      for (let x = 0; x < grid.size; x++) {
        for (let z = 0; z < grid.size; z++) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > currentRadius) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },

  reaming: (grid, progress) => {
    const centerX = grid.size / 2;
    const centerZ = grid.size / 2;
    const reamRadius = 3.2 + progress * 0.5;
    const reamDepth = grid.size * 0.7;
    const tolerance = 0.3;

    for (let x = 0; x < grid.size; x++) {
      for (let z = 0; z < grid.size; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (Math.abs(dist - reamRadius) < tolerance) {
          for (let y = grid.size - reamDepth; y < grid.size; y++) {
            grid.removeVoxel(x, y, z);
          }
        }
      }
    }
  },
};

// Main Component
const CNCSimulatorR3F = () => {
  const [selectedOperation, setSelectedOperation] = useState('facing');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [logs, setLogs] = useState(['CNC Simulator Ready']);
  const [stats, setStats] = useState({ voxels: 0, quality: 'High' });
  const [updateKey, setUpdateKey] = useState(0);

  const gridRef = useRef(new MobileVoxelGrid(48));

  const runOperation = useCallback(async () => {
    if (simulationRunning || !gridRef.current) return;

    setSimulationRunning(true);
    const grid = gridRef.current;
    const operation = CNCOperations[selectedOperation];
    const startVoxels = grid.countVoxels();

    setLogs((prev) => [...prev, `► ${selectedOperation.toUpperCase()}`]);

    for (let progress = 0; progress <= 1; progress += 0.08) {
      operation(grid, progress);

      setOperationProgress(Math.round(progress * 100));
      setStats({
        voxels: grid.countVoxels(),
        quality: 'High',
      });

      setUpdateKey((prev) => prev + 1);

      await new Promise((r) => setTimeout(r, 60));
    }

    const endVoxels = grid.countVoxels();
    setLogs((prev) => [...prev, `✓ Complete. Removed: ${startVoxels - endVoxels}`]);
    setSimulationRunning(false);
    setOperationProgress(0);
  }, [selectedOperation, simulationRunning]);

  const resetWorkpiece = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.initialize();
      setStats({ voxels: gridRef.current.countVoxels(), quality: 'High' });
      setLogs((prev) => [...prev, '↻ Reset']);
      setUpdateKey((prev) => prev + 1);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas
          camera={{ position: [20, 15, 20], fov: 75 }}
          style={{ flex: 1 }}
        >
          <SceneSetup />
          <Workpiece gridData={gridRef.current} updateKey={updateKey} />
        </Canvas>
      </View>

      <ScrollView style={styles.controlPanel}>
        <Text style={styles.title}>CNC Simulator</Text>

        {/* Operation Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.operationScroll}>
          {Object.keys(CNCOperations).map((op) => (
            <Pressable
              key={op}
              onPress={() => setSelectedOperation(op)}
              disabled={simulationRunning}
              style={[
                styles.opButton,
                selectedOperation === op && styles.opButtonActive,
              ]}
            >
              <Text style={styles.opButtonText}>{op}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Progress Bar */}
        {operationProgress > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{operationProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${operationProgress}%` }]} />
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={runOperation}
            disabled={simulationRunning}
            style={[styles.button, styles.buttonGreen, simulationRunning && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {simulationRunning ? 'Running...' : 'Run Operation'}
            </Text>
          </Pressable>

          <Pressable
            onPress={resetWorkpiece}
            disabled={simulationRunning}
            style={[styles.button, styles.buttonBlue]}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <Text style={styles.statsText}>
          Voxels: {stats.voxels} | Quality: {stats.quality}
        </Text>

        {/* Logs */}
        <View style={styles.logsContainer}>
          {logs.slice(-5).map((log, idx) => (
            <Text key={idx} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  canvasContainer: {
    flex: 2,
    backgroundColor: '#1a1a1a',
  },
  controlPanel: {
    flex: 1,
    backgroundColor: '#111111',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  operationScroll: {
    marginBottom: 15,
  },
  opButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#333333',
    borderRadius: 6,
  },
  opButtonActive: {
    backgroundColor: '#ff8c00',
  },
  opButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    color: '#ff8c00',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff8c00',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGreen: {
    backgroundColor: '#22aa22',
  },
  buttonBlue: {
    backgroundColor: '#2266ff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsText: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '500',
  },
  logsContainer: {
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 6,
    maxHeight: 100,
  },
  logText: {
    color: '#22ff22',
    fontSize: 11,
    marginBottom: 3,
  },
});

export default CNCSimulatorR3F;