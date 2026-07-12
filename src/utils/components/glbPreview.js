import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useFrame } from '@react-three/fiber/native';
import { MeshStandardMaterial } from 'three';
import { useGLTF } from '../../hooks/useGLTFonline';
import CanvaProvider from '../ThreeJs_Utils/provider';


const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);


// SceneModel.jsx — only ever returns Three.js-valid JSX or null
function SceneModel({ 
   modelUrl, 
    materialConfig = EMPTY_OBJECT, 
   animations = EMPTY_ARRAY, 
   onMeshPress, 
   onLoad, 
   onError, 
   ...props }) {



  const group = useRef();
  const meshRefs = useRef({});
  const { scene, ready, error } = useGLTF(modelUrl);
    console.log('SceneModel Render:', modelUrl?.slice(-20));
  useEffect(() => {
    if (error) onError?.(error);
    else if (ready) onLoad?.();
  }, [ready, error, onLoad, onError]);

  useEffect(() => () => { meshRefs.current = {}; }, []);

  const clonedScene = useMemo(() => {
    if (!scene || error || !ready) return null;
    try {
      const clone = scene.clone(true);
      meshRefs.current = {};
      clone.traverse((child) => {
        if (!child.isMesh) return;
        meshRefs.current[child.name] = child;
        child.castShadow = true;
        child.receiveShadow = true;
        const material = materialConfig[child.name] || {};
        child.material = new MeshStandardMaterial({
          color: material.color ?? '#999',
          metalness: material.metalness ?? 0.9,
          roughness: material.roughness ?? 0.4,
          ...material,
        });
      });
      return clone;
    } catch (err) {
      onError?.(err);
      return null;
    }
  }, [scene, materialConfig, error, ready, onError]);

  useFrame((state, delta) => {
    if (!animations.length) return;
    animations.forEach((anim) => {
      const mesh = meshRefs.current[anim.name];
      if (!mesh) return;
      mesh.rotation.x += (anim.rotateX || 0) * delta;
      mesh.rotation.y += (anim.rotateY || 0) * delta;
      mesh.rotation.z += (anim.rotateZ || 0) * delta;
    });
  });

  // ⛔ never return RN <View>/<Text>/<ActivityIndicator> here — invalid inside Canvas
  if (!clonedScene) return null;

  return (
    <group ref={group} {...props}>
      {clonedScene.children.map((child, index) => (
        <primitive
          key={`${child.name || 'mesh'}_${index}`}
          object={child}
          onClick={(e) => {
            e.stopPropagation();
            onMeshPress?.(e.object.name, e);
          }}
        />
      ))}
    </group>
  );
}

const MemoSceneModel = React.memo(SceneModel);

// Model3DPreview.jsx — owns the loading/error UI, rendered as a sibling
// overlay OUTSIDE <Canvas>, absolutely positioned on top of it.
function Model3DPreview({ modelUrl, camPosition = [2, 2, 5], 
    materialConfig = EMPTY_OBJECT, 
   animations = EMPTY_ARRAY, 
  
  style, onLoad, onError, ...props }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const instanceId = useMemo(() => `preview_${modelUrl}`, [modelUrl]);

  useEffect(() => {
    setStatus('loading');
    setError(null);
  }, [modelUrl]);

  const handleError = useCallback((err) => {
    setError(err);
    setStatus('error');
    onError?.(err);
  }, [onError]);

  const handleLoad = useCallback(() => {
    setStatus('ready');
    onLoad?.();
  }, [onLoad]);

  if (!modelUrl) {
    return (
      <View style={[styles.container, style, styles.centerContent]}>
        <Text style={styles.noModelText}>No model URL provided</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CanvaProvider camPosition={camPosition} instanceId={instanceId}>
        <MemoSceneModel
          modelUrl={modelUrl}
          materialConfig={materialConfig}
          animations={animations}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </CanvaProvider>

      {/* Overlay sits OUTSIDE the Canvas — plain RN, totally safe */}
      {status === 'loading' && (
        <View style={styles.loadingContainer} pointerEvents="none">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading 3D Model...</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.errorContainer} pointerEvents="none">
          <Text style={styles.errorText}>Failed to load 3D model</Text>
          <Text style={styles.errorSubText}>{error?.message}</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  noModelText: {
    color: '#888',
    fontSize: 14,
  },
});

export default React.memo(Model3DPreview);