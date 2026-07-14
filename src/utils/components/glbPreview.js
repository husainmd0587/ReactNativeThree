// Model3DPreview.jsx - SIMPLIFIED FIX
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useFrame } from '@react-three/fiber/native';
import { useAnimations } from '@react-three/drei/native';
import { MeshStandardMaterial } from 'three';
import { useGLTF } from './hooks/useGLTFonline';
import CanvaProvider from '../ThreeJs_Utils/provider';
import SoundPlayer from '../sound/soundPlayer'

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function SceneModel({ 
  modelUrl, 
  materialConfig = EMPTY_OBJECT, 
  animations = EMPTY_ARRAY, 
  playClipAnimations = true,
  clipNames = null, 
  animationTimeScale = 1,
  soundUrl = null,
  soundLoop = true,
  onMeshPress, 
  onLoad, 
  onError, 
  onClipFinished,
  onSoundLoaded,
  onSoundError,
  ...props 
}) {
  const group = useRef();
  const meshRefs = useRef({});
  const previousSceneRef = useRef(null); 
  const { scene, ready, error, animations: clips } = useGLTF(modelUrl);
  const [processed, setProcessed] = useState(false);
  const mixerRef = useRef(null);
  const soundLoadTimeoutRef = useRef(null);
  const isPlayingRef = useRef(false);
  const soundUrlRef = useRef(soundUrl);
  const componentMountedRef = useRef(true);
  const animationStartedRef = useRef(false);
  const soundLoadedRef = useRef(false);
  
  // ✅ Use useAnimations from @react-three/drei
  const { actions, names, mixer } = useAnimations(
    playClipAnimations ? clips : [],
    group
  );

  // Store mixer reference
  useEffect(() => {
    if (mixer) {
      mixerRef.current = mixer;
    }
  }, [mixer]);

  // Cleanup on unmount
  useEffect(() => {
    componentMountedRef.current = true;
    soundUrlRef.current = soundUrl;
    soundLoadedRef.current = false;
    
    return () => {
      componentMountedRef.current = false;
      previousSceneRef.current = null;
      meshRefs.current = {};
      // Cleanup sound on unmount
      SoundPlayer.stop();
      SoundPlayer.release();
      isPlayingRef.current = false;
      if (soundLoadTimeoutRef.current) {
        clearTimeout(soundLoadTimeoutRef.current);
      }
    };
  }, [soundUrl]);

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const onClipFinishedRef = useRef(onClipFinished);
  const onSoundLoadedRef = useRef(onSoundLoaded);
  const onSoundErrorRef = useRef(onSoundError);
  
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
    onClipFinishedRef.current = onClipFinished;
    onSoundLoadedRef.current = onSoundLoaded;
    onSoundErrorRef.current = onSoundError;
  });

  // Load sound
  useEffect(() => {
    if (!soundUrl) {
      soundLoadedRef.current = false;
      return;
    }

    let mounted = true;
    soundLoadedRef.current = false;

    const loadSound = async () => {
      try {
        if (soundLoadTimeoutRef.current) {
          clearTimeout(soundLoadTimeoutRef.current);
        }

        const loadPromise = SoundPlayer.load(soundUrl);
        const timeoutPromise = new Promise((_, reject) => {
          soundLoadTimeoutRef.current = setTimeout(() => {
            reject(new Error('Sound loading timeout'));
          }, 10000);
        });

        await Promise.race([loadPromise, timeoutPromise]);
        
        if (!mounted || !componentMountedRef.current) return;

        soundLoadedRef.current = true;
        onSoundLoadedRef.current?.();
        console.log('✅ Sound loaded successfully');

        // Start sound if animation is already playing
        if (animationStartedRef.current && soundUrlRef.current === soundUrl) {
          startSound();
        }

      } catch (error) {
        console.error('❌ Failed to load sound:', error);
        if (mounted && componentMountedRef.current) {
          soundLoadedRef.current = false;
          onSoundErrorRef.current?.(error);
        }
      }
    };

    loadSound();

    return () => {
      mounted = false;
      if (soundLoadTimeoutRef.current) {
        clearTimeout(soundLoadTimeoutRef.current);
      }
    };
  }, [soundUrl]);

  // Start sound function
  const startSound = useCallback(() => {
    if (!soundLoadedRef.current || !soundUrl || isPlayingRef.current) {
      return;
    }

    try {
      if (soundLoop && SoundPlayer.getSound()) {
        SoundPlayer.setLoop(true);
      }
      
      SoundPlayer.play();
      isPlayingRef.current = true;
      console.log('🔊 Sound started');
    } catch (error) {
      console.error('Error starting sound:', error);
    }
  }, [soundUrl, soundLoop]);

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

  // ✅ ANIMATION ONLY - runs once when actions are ready
  useEffect(() => {
    // Skip if already started or no actions
    if (animationStartedRef.current || !playClipAnimations || !actions || Object.keys(actions).length === 0) {
      return;
    }

    // Determine which clips to play
    let targetActions = actions;
    if (clipNames && clipNames.length > 0) {
      targetActions = {};
      clipNames.forEach(name => {
        if (actions[name]) {
          targetActions[name] = actions[name];
        }
      });
    }

    const actionKeys = Object.keys(targetActions);
    if (actionKeys.length === 0) {
      return;
    }

    console.log(`Playing ${actionKeys.length} animations:`, actionKeys);

    // Play all target actions
    actionKeys.forEach((key) => {
      const action = targetActions[key];
      if (action) {
        action.reset();
        action.setLoop(Infinity, Infinity);
        action.timeScale = animationTimeScale;
        action.play();
      }
    });

    animationStartedRef.current = true;

    // Start sound if loaded
    if (soundLoadedRef.current && soundUrl) {
      startSound();
    }

    // Handle clip finished
    const handleFinished = (event) => {
      const clipName = event.action?.getClip()?.name;
      if (clipName) {
        console.log('Animation finished:', clipName);
        onClipFinishedRef.current?.(clipName);
      }
    };

    if (mixerRef.current) {
      mixerRef.current.addEventListener('finished', handleFinished);
    }

    return () => {
      // Stop animations but keep sound playing
      actionKeys.forEach((key) => {
        const action = targetActions[key];
        if (action) {
          action.stop();
        }
      });
      
      if (mixerRef.current) {
        mixerRef.current.removeEventListener('finished', handleFinished);
      }
    };
  }, [actions, playClipAnimations, clipNames, animationTimeScale, soundUrl, startSound]); // Only runs when actions change

  // ✅ Use useFrame for manual animations (rotation, etc.)
  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.03);

    // Drive manual per-mesh rotation config
    const currentAnimations = animations;
    if (currentAnimations && currentAnimations.length > 0 && processedScene) {
      currentAnimations.forEach((anim) => {
        const mesh = meshRefs.current[anim.name];
        if (!mesh) return;

        if (anim.rotateX) mesh.rotation.x += anim.rotateX * safeDelta;
        if (anim.rotateY) mesh.rotation.y += anim.rotateY * safeDelta;
        if (anim.rotateZ) mesh.rotation.z += anim.rotateZ * safeDelta;
      });
    }
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
    prevProps.animations === nextProps.animations &&
    prevProps.playClipAnimations === nextProps.playClipAnimations &&
    prevProps.animationTimeScale === nextProps.animationTimeScale &&
    prevProps.soundUrl === nextProps.soundUrl &&
    prevProps.soundLoop === nextProps.soundLoop &&
    JSON.stringify(prevProps.clipNames) === JSON.stringify(nextProps.clipNames)
  );
});

// Model3DPreview Component
function Model3DPreview({ 
  modelUrl, 
  camPosition = [2, 2, 5], 
  materialConfig = EMPTY_OBJECT, 
  animations = EMPTY_ARRAY, 
  playClipAnimations = true,
  clipNames,
  animationTimeScale = 1,
  soundUrl = null,
  soundLoop = true,
  style, 
  onLoad, 
  onError,
  onClipFinished,
  onSoundLoaded,
  onSoundError,
  loadingTimeout = 60000,
  isFullscreen = false,
  ...props 
}) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadCalledRef = useRef(false);

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  const instanceId = useMemo(() => {
    return `preview_${modelUrl}_${isFullscreen ? 'fs' : 'sm'}`;
  }, [modelUrl, isFullscreen]);

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
    playClipAnimations,
    clipNames,
    animationTimeScale,
    soundUrl,
    soundLoop,
    onLoad: handleLoad,
    onError: handleError,
    onClipFinished,
    onSoundLoaded,
    onSoundError,
    ...props
  }), [modelUrl, materialConfig, animations, playClipAnimations, clipNames, animationTimeScale, soundUrl, soundLoop, handleLoad, handleError, onClipFinished, onSoundLoaded, onSoundError, props]);

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