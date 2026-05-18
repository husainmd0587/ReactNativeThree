
// TriangleMeshCutting.js - WORKING VERSION for React Native + Expo + R3F
// Fixes: UV attributes, proper Brush setup, imperative cutting API

import React, { useRef, useMemo, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

// ============================================================
// UTILITY: Ensure geometry has required attributes for CSG
// three-bvh-csg REQUIRES uv, normal, and position attributes
// ============================================================

function ensureCSGReady(geometry) {
  if (!geometry) return null;

  const geom = geometry.clone();

  // MUST have position
  if (!geom.attributes.position) {
    console.error('Geometry missing position attribute');
    return null;
  }

  // MUST have UVs for three-bvh-csg
  if (!geom.attributes.uv) {
    const count = geom.attributes.position.count;
    const uvArray = new Float32Array(count * 2);
    // Fill with basic UVs (0,0 to 1,1 based on vertex index)
    for (let i = 0; i < count; i++) {
      uvArray[i * 2] = (i % 2);
      uvArray[i * 2 + 1] = Math.floor(i / 2) % 2;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  }

  // MUST have normals
  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  }

  // MUST be indexed for CSG
  if (!geom.index) {
    // If not indexed, we need to create an index
    // For non-indexed geometry, we treat each vertex as unique
    const count = geom.attributes.position.count;
    const indices = new Uint32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  // Compute bounds tree - REQUIRED for three-bvh-csg
  if (!geom.boundsTree) {
    geom.computeBoundsTree = function(options) {
      const { MeshBVH } = require('three-mesh-bvh');
      this.boundsTree = new MeshBVH(this, options);
      return this.boundsTree;
    };
    geom.computeBoundsTree({ maxLeafTris: 3 });
  }

  return geom;
}

// ============================================================
// PLANE-BASED TRIANGLE CUTTING (No CSG dependency)
// This is the most reliable method for React Native
// ============================================================

function cutGeometryByPlane(geometry, plane, keepSide = 'positive') {
  if (!geometry || !plane) return geometry;

  const posAttr = geometry.attributes.position;
  if (!posAttr) return geometry;

  const normal = plane.normal.clone().normalize();
  const constant = plane.constant;

  const vertices = [];
  const indices = [];
  const uvs = geometry.attributes.uv ? [] : null;
  const normals = geometry.attributes.normal ? [] : null;

  const indexAttr = geometry.index;
  const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

  let newIndex = 0;

  for (let i = 0; i < triCount; i++) {
    let i0, i1, i2;

    if (indexAttr) {
      i0 = indexAttr.getX(i * 3);
      i1 = indexAttr.getX(i * 3 + 1);
      i2 = indexAttr.getX(i * 3 + 2);
    } else {
      i0 = i * 3;
      i1 = i * 3 + 1;
      i2 = i * 3 + 2;
    }

    const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0);
    const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i1);
    const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i2);

    const d0 = normal.dot(v0) - constant;
    const d1 = normal.dot(v1) - constant;
    const d2 = normal.dot(v2) - constant;

    const threshold = 0.0001;

    const keep0 = keepSide === 'positive' ? d0 > -threshold : d0 < threshold;
    const keep1 = keepSide === 'positive' ? d1 > -threshold : d1 < threshold;
    const keep2 = keepSide === 'positive' ? d2 > -threshold : d2 < threshold;

    const keepCount = (keep0 ? 1 : 0) + (keep1 ? 1 : 0) + (keep2 ? 1 : 0);

    // Helper to add triangle
    const addTri = (a, b, c, ai, bi, ci) => {
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);

      if (uvs && geometry.attributes.uv) {
        const uva = new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, ai);
        const uvb = new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, bi);
        const uvc = new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, ci);
        uvs.push(uva.x, uva.y, uvb.x, uvb.y, uvc.x, uvc.y);
      }

      if (normals && geometry.attributes.normal) {
        const na = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, ai);
        const nb = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, bi);
        const nc = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, ci);
        normals.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
      }

      indices.push(newIndex, newIndex + 1, newIndex + 2);
      newIndex += 3;
    };

    // Helper: lerp vertex with UV and normal
    const lerpVert = (a, b, t, ai, bi) => {
      const pos = new THREE.Vector3().lerpVectors(a, b, t);

      let uv = null;
      if (uvs && geometry.attributes.uv) {
        const uva = new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, ai);
        const uvb = new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, bi);
        uv = new THREE.Vector2().lerpVectors(uva, uvb, t);
      }

      let norm = null;
      if (normals && geometry.attributes.normal) {
        const na = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, ai);
        const nb = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, bi);
        norm = new THREE.Vector3().lerpVectors(na, nb, t).normalize();
      }

      return { pos, uv, norm };
    };

    if (keepCount === 3) {
      addTri(v0, v1, v2, i0, i1, i2);
    } else if (keepCount === 2) {
      // Two kept, one removed - create quad (2 triangles)
      let kept = [], removed = [], keptIdx = [], removedIdx = [];

      if (keep0) { kept.push(v0); keptIdx.push(i0); } else { removed.push(v0); removedIdx.push(i0); }
      if (keep1) { kept.push(v1); keptIdx.push(i1); } else { removed.push(v1); removedIdx.push(i1); }
      if (keep2) { kept.push(v2); keptIdx.push(i2); } else { removed.push(v2); removedIdx.push(i2); }

      const ka = kept[0], kb = kept[1];
      const ra = removed[0];
      const kai = keptIdx[0], kbi = keptIdx[1];
      const rai = removedIdx[0];

      const da = keepSide === 'positive' ? normal.dot(ka) - constant : -(normal.dot(ka) - constant);
      const db = keepSide === 'positive' ? normal.dot(kb) - constant : -(normal.dot(kb) - constant);
      const dr = keepSide === 'positive' ? normal.dot(ra) - constant : -(normal.dot(ra) - constant);

      const ta = dr / (dr - da);
      const tb = dr / (dr - db);

      const interA = lerpVert(ra, ka, Math.max(0.001, Math.min(0.999, ta)), rai, kai);
      const interB = lerpVert(ra, kb, Math.max(0.001, Math.min(0.999, tb)), rai, kbi);

      // Triangle 1: ka, kb, interB
      vertices.push(ka.x, ka.y, ka.z, kb.x, kb.y, kb.z, interB.pos.x, interB.pos.y, interB.pos.z);
      if (uvs) uvs.push(
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kai).x,
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kai).y,
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kbi).x,
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kbi).y,
        interB.uv.x, interB.uv.y
      );
      if (normals) normals.push(
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).x,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).y,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).z,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kbi).x,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kbi).y,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kbi).z,
        interB.norm.x, interB.norm.y, interB.norm.z
      );
      indices.push(newIndex, newIndex + 1, newIndex + 2);
      newIndex += 3;

      // Triangle 2: ka, interB, interA
      vertices.push(ka.x, ka.y, ka.z, interB.pos.x, interB.pos.y, interB.pos.z, interA.pos.x, interA.pos.y, interA.pos.z);
      if (uvs) uvs.push(
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kai).x,
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, kai).y,
        interB.uv.x, interB.uv.y,
        interA.uv.x, interA.uv.y
      );
      if (normals) normals.push(
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).x,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).y,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, kai).z,
        interB.norm.x, interB.norm.y, interB.norm.z,
        interA.norm.x, interA.norm.y, interA.norm.z
      );
      indices.push(newIndex, newIndex + 1, newIndex + 2);
      newIndex += 3;

    } else if (keepCount === 1) {
      // One kept, two removed - create single triangle
      let kept = null, keptIdx = null;
      let removed = [], removedIdx = [];

      if (keep0) { kept = v0; keptIdx = i0; } else { removed.push(v0); removedIdx.push(i0); }
      if (keep1) { kept = v1; keptIdx = i1; } else { removed.push(v1); removedIdx.push(i1); }
      if (keep2) { kept = v2; keptIdx = i2; } else { removed.push(v2); removedIdx.push(i2); }

      const ra = removed[0], rb = removed[1];
      const rai = removedIdx[0], rbi = removedIdx[1];

      const dk = keepSide === 'positive' ? normal.dot(kept) - constant : -(normal.dot(kept) - constant);
      const da = keepSide === 'positive' ? normal.dot(ra) - constant : -(normal.dot(ra) - constant);
      const db = keepSide === 'positive' ? normal.dot(rb) - constant : -(normal.dot(rb) - constant);

      const ta = dk / (dk - da);
      const tb = dk / (dk - db);

      const interA = lerpVert(kept, ra, Math.max(0.001, Math.min(0.999, ta)), keptIdx, rai);
      const interB = lerpVert(kept, rb, Math.max(0.001, Math.min(0.999, tb)), keptIdx, rbi);

      vertices.push(kept.x, kept.y, kept.z, interA.pos.x, interA.pos.y, interA.pos.z, interB.pos.x, interB.pos.y, interB.pos.z);
      if (uvs) uvs.push(
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, keptIdx).x,
        new THREE.Vector2().fromBufferAttribute(geometry.attributes.uv, keptIdx).y,
        interA.uv.x, interA.uv.y,
        interB.uv.x, interB.uv.y
      );
      if (normals) normals.push(
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, keptIdx).x,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, keptIdx).y,
        new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, keptIdx).z,
        interA.norm.x, interA.norm.y, interA.norm.z,
        interB.norm.x, interB.norm.y, interB.norm.z
      );
      indices.push(newIndex, newIndex + 1, newIndex + 2);
      newIndex += 3;
    }
    // keepCount === 0: discard entire triangle
  }

  if (vertices.length === 0) {
    // Return empty geometry if everything was cut
    return new THREE.BufferGeometry();
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  if (uvs && uvs.length > 0) newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (normals && normals.length > 0) newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  newGeometry.setIndex(indices);
  newGeometry.computeVertexNormals();

  return newGeometry;
}

// ============================================================
// COMPONENT: CuttablePart - The mesh that gets cut
// Exposes imperative handle with cut() and reset() methods
// ============================================================

export const CuttablePart = forwardRef(function CuttablePart({
  children,
  initialGeometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  material,
  onCut,
  onReset,
  ...props
}, ref) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(() => {
    const geom = initialGeometry ? initialGeometry.clone() : new THREE.BoxGeometry(2, 2, 2, 4, 4, 4);
    // Ensure UVs exist
    if (!geom.attributes.uv) {
      const count = geom.attributes.position.count;
      const uvArray = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        uvArray[i * 2] = (i % 2);
        uvArray[i * 2 + 1] = Math.floor(i / 2) % 2;
      }
      geom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    }
    if (!geom.attributes.normal) geom.computeVertexNormals();
    return geom;
  });
  const originalGeometry = useRef(geometry.clone());
  const cutCount = useRef(0);

  const defaultMaterial = useMemo(() => {
    return material || new THREE.MeshStandardMaterial({
      color: '#4488ff',
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
  }, [material]);

  // Imperative API: partRef.current.cut(plane)
  useImperativeHandle(ref, () => ({
    cut: (plane, keepSide = 'positive') => {
      if (!plane) {
        console.warn('CuttablePart.cut() called without a plane');
        return false;
      }

      console.log('Cutting with plane:', plane.normal.toArray(), plane.constant);

      const newGeom = cutGeometryByPlane(geometry, plane, keepSide);

      if (newGeom.attributes.position.count === 0) {
        console.warn('Cut resulted in empty geometry');
        return false;
      }

      // Dispose old geometry
      geometry.dispose();

      setGeometry(newGeom);
      cutCount.current += 1;

      if (onCut) {
        onCut({ geometry: newGeom, cutCount: cutCount.current, plane });
      }

      return true;
    },

    reset: () => {
      geometry.dispose();
      const resetGeom = originalGeometry.current.clone();
      setGeometry(resetGeom);
      cutCount.current = 0;
      if (onReset) onReset({ geometry: resetGeom });
    },

    getCutCount: () => cutCount.current,
    getGeometry: () => geometry,
  }), [geometry, onCut, onReset]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      geometry={geometry}
      material={defaultMaterial}
      castShadow
      receiveShadow
      {...props}
    >
      {children}
    </mesh>
  );
});

// ============================================================
// COMPONENT: CuttingTool - Visual tool with cutting plane
// ============================================================

export const CuttingTool = forwardRef(function CuttingTool({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  color = '#ff4444',
  opacity = 0.5,
  onCutStart,
  onCutEnd,
  visible = true,
  ...props
}, ref) {
  const meshRef = useRef();
  const [isActive, setIsActive] = useState(false);

  // Calculate cutting plane from tool orientation
  const cuttingPlane = useMemo(() => {
    const normal = new THREE.Vector3(0, 1, 0);
    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
    normal.applyEuler(euler);
    normal.normalize();

    const pos = new THREE.Vector3(position[0], position[1], position[2]);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(normal, pos);
    return plane;
  }, [position, rotation]);

  // Visual pulse when active
  useFrame((state) => {
    if (meshRef.current && isActive) {
      const pulse = Math.sin(state.clock.elapsedTime * 10) * 0.3 + 0.7;
      meshRef.current.material.opacity = pulse;
    }
  });

  useImperativeHandle(ref, () => ({
    getPlane: () => cuttingPlane,
    getPosition: () => new THREE.Vector3(...position),
    getRotation: () => new THREE.Euler(...rotation),
    activate: () => setIsActive(true),
    deactivate: () => setIsActive(false),
    meshRef: meshRef.current,
  }), [cuttingPlane, position, rotation]);

  if (!visible) return null;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Tool body - flat blade */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsActive(true);
          if (onCutStart) onCutStart(cuttingPlane);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsActive(false);
          if (onCutEnd) onCutEnd(cuttingPlane);
        }}
        {...props}
      >
        <boxGeometry args={[1, 0.05, 1]} />
        <meshStandardMaterial
          color={isActive ? '#ff0000' : color}
          transparent
          opacity={isActive ? 0.8 : opacity}
          side={THREE.DoubleSide}
          emissive={isActive ? '#ff0000' : '#000000'}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>

      {/* Cutting plane visual indicator */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Normal direction arrow */}
      <arrowHelper
        args={[
          cuttingPlane.normal,
          new THREE.Vector3(0, 0, 0),
          0.8,
          '#00ff00',
          0.2,
          0.1
        ]}
      />
    </group>
  );
});

// ============================================================
// COMPONENT: CuttingController - Wires tool to part
// Call controllerRef.current.executeCut() to perform cut
// ============================================================

export const CuttingController = forwardRef(function CuttingController({
  toolRef,
  partRef,
  onCutComplete,
  onCutFail,
}, ref) {
  const [lastCut, setLastCut] = useState(null);

  const executeCut = useCallback((keepSide = 'positive') => {
    if (!toolRef?.current) {
      console.error('CuttingController: toolRef not available');
      if (onCutFail) onCutFail('Tool not ready');
      return false;
    }

    if (!partRef?.current) {
      console.error('CuttingController: partRef not available');
      if (onCutFail) onCutFail('Part not ready');
      return false;
    }

    const plane = toolRef.current.getPlane();
    if (!plane) {
      console.error('CuttingController: tool has no cutting plane');
      if (onCutFail) onCutFail('No cutting plane');
      return false;
    }

    console.log('Executing cut with plane normal:', plane.normal.toArray());

    const success = partRef.current.cut(plane, keepSide);

    if (success) {
      setLastCut({ plane, timestamp: Date.now(), keepSide });
      if (onCutComplete) onCutComplete({ plane, keepSide });
    } else {
      if (onCutFail) onCutFail('Cut returned empty geometry');
    }

    return success;
  }, [toolRef, partRef, onCutComplete, onCutFail]);

  useImperativeHandle(ref, () => ({
    executeCut,
    getLastCut: () => lastCut,
  }), [executeCut, lastCut]);

  return null; // Logic-only component
});

// ============================================================
// EXAMPLE: Complete Working Scene
// ============================================================

export function CuttingDemoScene() {
  const partRef = useRef();
  const toolRef = useRef();
  const controllerRef = useRef();
  const [cutCount, setCutCount] = useState(0);
  const [status, setStatus] = useState('Ready');

  // Create a subdivided box for better cutting visuals
  const partGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(3, 3, 3, 8, 8, 8);
    // Add UVs
    const count = geom.attributes.position.count;
    const uvArray = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      uvArray[i * 2] = (i % 2);
      uvArray[i * 2 + 1] = Math.floor(i / 2) % 2;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geom.computeVertexNormals();
    return geom;
  }, []);

  const handleCut = useCallback(() => {
    setStatus('Cutting...');
    const success = controllerRef.current?.executeCut('positive');
    if (success) {
      setCutCount(c => c + 1);
      setStatus('Cut complete!');
    } else {
      setStatus('Cut failed');
    }
    setTimeout(() => setStatus('Ready'), 1000);
  }, []);

  const handleReset = useCallback(() => {
    partRef.current?.reset();
    setCutCount(0);
    setStatus('Reset');
    setTimeout(() => setStatus('Ready'), 500);
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 3, -5]} intensity={0.5} />

      {/* The part to cut */}
      <CuttablePart
        ref={partRef}
        initialGeometry={partGeometry}
        position={[0, 0, 0]}
        onCut={(data) => console.log('Cut completed:', data.cutCount)}
      />

      {/* The cutting tool */}
      <CuttingTool
        ref={toolRef}
        position={[0, 2, 0]}
        rotation={[Math.PI / 6, 0, Math.PI / 4]}
        scale={[2, 1, 2]}
        color="#ff4444"
        opacity={0.4}
      />

      {/* Controller connects them */}
      <CuttingController
        ref={controllerRef}
        toolRef={toolRef}
        partRef={partRef}
        onCutComplete={(data) => console.log('Controller: cut done', data)}
        onCutFail={(err) => console.error('Controller: cut failed', err)}
      />

      {/* UI Buttons - in 3D space for demo */}
      <group position={[0, -3, 0]}>
        {/* Cut button */}
        <mesh
          position={[-1.5, 0, 0]}
          onPointerDown={handleCut}
        >
          <boxGeometry args={[1.2, 0.5, 0.2]} />
          <meshStandardMaterial color="#00aa00" />
        </mesh>

        {/* Reset button */}
        <mesh
          position={[1.5, 0, 0]}
          onPointerDown={handleReset}
        >
          <boxGeometry args={[1.2, 0.5, 0.2]} />
          <meshStandardMaterial color="#aa0000" />
        </mesh>
      </group>

      {/* Status display */}
      <mesh position={[0, 3.5, 0]}>
        <planeGeometry args={[3, 0.5]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
    </>
  );
}

// ============================================================
// CSG VERSION (if three-bvh-csg works in your setup)
// Use this instead of plane-based cutting for more complex shapes
// ============================================================

export function useCSGCut() {
  const evaluator = useMemo(() => new Evaluator(), []);

  const performCSG = useCallback((partGeometry, toolMesh, operation = SUBTRACTION) => {
    try {
      // Prepare part geometry
      const partGeom = ensureCSGReady(partGeometry.clone());
      if (!partGeom) throw new Error('Failed to prepare part geometry');

      // Create part brush
      const partBrush = new Brush(partGeom);

      // Prepare tool geometry
      const toolGeom = ensureCSGReady(toolMesh.geometry.clone());
      if (!toolGeom) throw new Error('Failed to prepare tool geometry');

      // Create tool brush with transform
      const toolBrush = new Brush(toolGeom);
      toolBrush.position.copy(toolMesh.position);
      toolBrush.rotation.copy(toolMesh.rotation);
      toolBrush.scale.copy(toolMesh.scale);
      toolBrush.updateMatrixWorld();

      // Evaluate
      const result = evaluator.evaluate(partBrush, toolBrush, operation);

      return result.geometry;
    } catch (error) {
      console.error('CSG operation failed:', error);
      return null;
    }
  }, [evaluator]);

  return { performCSG };
}

// ============================================================
// EXPORTS
// ============================================================

export { cutGeometryByPlane, ensureCSGReady };
export default {
  CuttablePart,
  CuttingTool,
  CuttingController,
  CuttingDemoScene,
  cutGeometryByPlane,
  ensureCSGReady,
  useCSGCut,
};