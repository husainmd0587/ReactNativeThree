// Model3DPreview.jsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useFrame } from '@react-three/fiber/native';
import { MeshStandardMaterial } from 'three';
import { useGLTF } from './hooks/useGLTFonline';
import CanvaProvider from '../ThreeJs_Utils/provider';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

// NOTE ON RESOURCE OWNERSHIP:
// useGLTF() now returns a fresh SkeletonUtils.clone() of the cached master
// scene for every hook call (see hooks/useGLTFonline.js). Clones share
// geometry/material objects with the master and with every other clone of
// the same URL. That means THIS component must NEVER dispose geometry or
// materials on unmount — doing so would free resources still in use by
// another mounted instance (e.g. the small card preview while the fullscreen
// modal is open, or vice versa). Disposal of the underlying GPU resources is
// handled centrally by the LRU cache in useGLTFonline.js when an entry is
// evicted or cleared. This component only needs to drop its own references.

function SceneModel({ 
  modelUrl, 
  materialConfig = EMPTY_OBJECT, 
  animations = EMPTY_ARRAY, 
  onMeshPress, 
  onLoad, 
  onError, 
  ...props 
}) {
  const group = useRef();
  const meshRefs = useRef({});
  const previousSceneRef = useRef(null);
  const { scene, ready, error } = useGLTF(modelUrl);
  const [processed, setProcessed] = useState(false);

  // Just drop references on unmount — do NOT dispose geometry/materials,
  // they're shared (see note above). The cache owns disposal.
  useEffect(() => {
    return () => {
      previousSceneRef.current = null;
      meshRefs.current = {};
    };
  }, []);

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (error) {
      console.error('SceneModel error:', error);
      onErrorRef.current?.(error);
    } else if (ready && scene) {
      onLoadRef.current?.();
    }
  }, [ready, error, scene]);

  const materialConfigKey = useMemo(() => {
    return JSON.stringify(materialConfig);
  }, [materialConfig]);

  const processedScene = useMemo(() => {
    if (!scene || error || !ready) return null;
    
    const needsReprocess = !processed || previousSceneRef.current !== scene;
    
    if (!needsReprocess) return scene;
    
    try {
      // NOTE: previous scene is a clone this instance owned; just drop the
      // reference. Do not traverse-and-dispose it — its geometry/materials
      // may still be referenced by other clones (small preview / fullscreen).
      meshRefs.current = {};
      
      const meshes = [];
      scene.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
        }
      });
      
      meshes.forEach((mesh) => {
        const key = mesh.name || mesh.uuid;
        meshRefs.current[key] = mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const config = materialConfig[key] || {};
        
        if (Object.keys(config).length > 0) {
          // Because this mesh's material may be shared with other clones of
          // the same source model, mutating it in place would leak visual
          // changes across instances. Always create a fresh material for
          // this instance instead of mutating a shared one.
          const baseMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const material = new MeshStandardMaterial({
            color: config.color ?? baseMaterial?.color ?? '#999',
            metalness: config.metalness ?? baseMaterial?.metalness ?? 0.9,
            roughness: config.roughness ?? baseMaterial?.roughness ?? 0.4,
            map: baseMaterial?.map ?? null,
            roughnessMap: baseMaterial?.roughnessMap ?? null,
            metalnessMap: baseMaterial?.metalnessMap ?? null,
            normalMap: baseMaterial?.normalMap ?? null,
            ...config,
          });
          mesh.material = material;
          
          ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap', 'emissiveMap', 'aoMap', 'bumpMap'].forEach(mapType => {
            if (material[mapType]) {
              const texture = material[mapType];
              texture.flipY = false;
              texture.premultiplyAlpha = false;
              texture.needsUpdate = true;
            }
          });
        }
      });
      
      previousSceneRef.current = scene;
      setProcessed(true);
      
      return scene;
    } catch (err) {
      console.error('Error processing scene:', err);
      onErrorRef.current?.(err);
      return null;
    }
  }, [scene, materialConfigKey, error, ready, processed]);

  const animationsRef = useRef(animations);
  useEffect(() => {
    animationsRef.current = animations;
  }, [animations]);

  useFrame((state, delta) => {
    const currentAnimations = animationsRef.current;
    if (!currentAnimations.length || !processedScene) return;
    
    const safeDelta = Math.min(delta, 0.03);
    
    currentAnimations.forEach((anim) => {
      const mesh = meshRefs.current[anim.name];
      if (!mesh) return;
      
      if (anim.rotateX) mesh.rotation.x += anim.rotateX * safeDelta;
      if (anim.rotateY) mesh.rotation.y += anim.rotateY * safeDelta;
      if (anim.rotateZ) mesh.rotation.z += anim.rotateZ * safeDelta;
    });
  });

  if (!processedScene) return null;

  const children = processedScene.children || [];
  if (children.length === 0) return null;

  return (
    <group ref={group} {...props}>
      {children.map((child, index) => (
        <primitive
          key={`${child.name || child.uuid || index}`}
          object={child}
          onClick={(e) => {
            e.stopPropagation();
            onMeshPress?.(e.object?.name || e.object?.uuid, e);
          }}
        />
      ))}
    </group>
  );
}

export const Scene = React.memo(SceneModel, (prevProps, nextProps) => {
  const prevConfig = JSON.stringify(prevProps.materialConfig);
  const nextConfig = JSON.stringify(nextProps.materialConfig);
  
  return (
    prevProps.modelUrl === nextProps.modelUrl &&
    prevConfig === nextConfig &&
    prevProps.animations === nextProps.animations
  );
});

// Model3DPreview Component
function Model3DPreview({ 
  modelUrl, 
  camPosition = [2, 2, 5], 
  materialConfig = EMPTY_OBJECT, 
  animations = EMPTY_ARRAY, 
  style, 
  onLoad, 
  onError,
  loadingTimeout = 60000,
  isFullscreen = false,
  ...props 
}) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadCalledRef = useRef(false);

  // Latest-ref pattern for onLoad/onError. Parent components (e.g.
  // Workshop3DModal) commonly pass these as inline arrow functions that get
  // a new identity on every render. If those identities appeared in a
  // dependency array below, an unrelated parent re-render (like the one that
  // happens continuously during a close animation) would re-trigger status
  // resets on a model that's already fully loaded — reopening the loading
  // spinner and re-arming the error timeout with nothing left to cancel it,
  // eventually surfacing a false "Failed to load" error. Reading the latest
  // callback from a ref sidesteps that entirely: effects only depend on
  // things that should actually restart loading (modelUrl, loadingTimeout).
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  // Stable instanceId — each logical "slot" (small vs fullscreen) gets its
  // own Canvas/GL context, and (via useGLTF) its own cloned scene graph.
  const instanceId = useMemo(() => {
    return `preview_${modelUrl}_${isFullscreen ? 'fs' : 'sm'}`;
  }, [modelUrl, isFullscreen]);

  // Stable across renders — no dependency on onLoad/onError identity.
  const handleError = useCallback((err) => {
    if (!isMountedRef.current) return;
    console.error('Model error:', err);
    setError(err);
    setStatus('error');
    onErrorRef.current?.(err);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Stable across renders — no dependency on onLoad/onError identity.
  const handleLoad = useCallback(() => {
    if (!isMountedRef.current) return;
    setStatus('ready');
    loadCalledRef.current = true;
    onLoadRef.current?.();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset state ONLY when the actual model URL (or timeout config) changes —
  // never because a parent re-rendered with a fresh onLoad/onError closure.
  useEffect(() => {
    isMountedRef.current = true;
    loadCalledRef.current = false;
    setStatus('loading');
    setError(null);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    timeoutRef.current = setTimeout(() => {
      if (!loadCalledRef.current && isMountedRef.current) {
        console.warn('Loading timeout for:', modelUrl);
        setError(new Error('Loading timeout'));
        setStatus('error');
        onErrorRef.current?.(new Error('Loading timeout'));
      }
    }, loadingTimeout);
    
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [modelUrl, loadingTimeout]);

  const sceneProps = useMemo(() => ({
    modelUrl,
    materialConfig,
    animations,
    onLoad: handleLoad,
    onError: handleError,
    ...props
  }), [modelUrl, materialConfig, animations, handleLoad, handleError, props]);

  if (!modelUrl) {
    return (
      <View style={[styles.container, style, styles.centerContent]}>
        <Text style={styles.noModelText}>No model URL provided</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CanvaProvider 
        camPosition={camPosition} 
        instanceId={instanceId}
      >
        <Scene key={`scene_${instanceId}`} {...sceneProps} />
      </CanvaProvider>

      {status === 'loading' && (
        <View style={styles.loadingContainer} pointerEvents="none">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading 3D Model...</Text>
        </View>
      )}
      
      {status === 'error' && (
        <View style={styles.errorContainer} pointerEvents="none">
          <Text style={styles.errorText}>Failed to load 3D model</Text>
          <Text style={styles.errorSubText}>{error?.message || 'Unknown error'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
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