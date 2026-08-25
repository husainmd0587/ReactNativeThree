import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';

import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { useFrame } from '@react-three/fiber/native';
import { useAnimations } from '@react-three/drei/native';
import { MeshStandardMaterial } from 'three';
import { useGLTF } from './hooks/useGLTFonline';
import CanvaProvider, { AutoFitCamera,useScene } from '../ThreeJs_Utils/provider';
import * as THREE from 'three';
import { useMaterialConfigs } from '../materials/materialConfigs.js';
import SoundPlayer from '../sound/soundPlayer';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function applyJointRotation(joint, rotation) {
  if (!joint || !rotation) return;
  if (rotation.x !== undefined && rotation.x !== null) {
    joint.rotation.x = THREE.MathUtils.degToRad(rotation.x);
  }
  if (rotation.y !== undefined && rotation.y !== null) {
    joint.rotation.y = THREE.MathUtils.degToRad(rotation.y);
  }
  if (rotation.z !== undefined && rotation.z !== null) {
    joint.rotation.z = THREE.MathUtils.degToRad(rotation.z);
  }
}

const SceneModel = forwardRef(function SceneModel(
  {
    modelUrl,
    modelConfig = EMPTY_OBJECT,
    jointConfig = EMPTY_OBJECT,
    materialConfig = EMPTY_OBJECT,
    animations = EMPTY_ARRAY,
    playClipAnimations = true,
    clipNames = null,
    animationTimeScale = 1,
    isPlaying = true,
    soundUrl = null,
    soundPlayWithoutAnimation = false,
    soundLoop = true,
    onMeshPress,
    onLoad,
    onError,
    autoFit = true,
    onClipFinished,
    onSoundLoaded,
    onSoundError,
    controller = null,
    ...props
  },
  ref
) {
  const group = useRef();
  const meshRefs = useRef({});
  const jointRefs = useRef({});
  const previousSceneRef = useRef(null);
  const processedRef = useRef(false);
  const { scene, ready, error, animations: rawClips } = useGLTF(modelUrl);
  const clips = rawClips ?? EMPTY_ARRAY;
  const mixerRef = useRef(null);
  const soundLoadTimeoutRef = useRef(null);
  const isSoundPlayingRef = useRef(false); // Tracks if sound is currently playing
  const soundUrlRef = useRef(soundUrl);
  const componentMountedRef = useRef(true);
  const animationStartedRef = useRef(false);
  const soundLoadedRef = useRef(false);
  const modelLoadedRef = useRef(false);
  const controllerInitializedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying); // Tracks animation playing state from props
  const materialConfigs = useMaterialConfigs();
  const { setCameraTarget } = useScene() || {};
  // ==========================================
  // GENERIC API SYSTEM
  // ==========================================
  const apiRef = useRef({
    // Core properties
    getScene: () => scene,
    getGroup: () => group.current,
    getJoint: (name) => jointRefs.current[name],
    getJoints: () => jointRefs.current,
    getMesh: (name) => meshRefs.current[name],
    getMeshes: () => meshRefs.current,
    getMixer: () => mixerRef.current,
    isReady: () => ready,
    getConfig: () => ({ jointConfig, modelConfig }),
    
    // Utility methods
    applyJointRotation: (joint, rotation) => {
      applyJointRotation(joint, rotation);
    },
    
    // Method registry
    _registry: {},
    register: (name, method) => {
      apiRef.current._registry[name] = method;
    },
    unregister: (name) => {
      delete apiRef.current._registry[name];
    },
    call: (methodName, ...args) => {
      if (apiRef.current._registry[methodName]) {
        return apiRef.current._registry[methodName](...args);
      }
      console.warn(`[SceneModel] Method "${methodName}" not registered`);
      return null;
    }
  });

  // ==========================================
  // INITIALIZE CONTROLLER
  // ==========================================
  useEffect(() => {
    if (!controller || controllerInitializedRef.current) return;
    
    controllerInitializedRef.current = true;
    
    if (typeof controller === 'function') {
      controller(apiRef.current);
    } else if (controller && typeof controller.init === 'function') {
      controller.init(apiRef.current);
    }
    
    return () => {
      if (controller && typeof controller.destroy === 'function') {
        controller.destroy();
      }
      controllerInitializedRef.current = false;
    };
  }, [controller]);

  // ==========================================
  // EXPOSE API TO PARENT
  // ==========================================
  useImperativeHandle(ref, () => apiRef.current, []);

  // ==========================================
  // MATERIAL CONFIG
  // ==========================================
  const { mainMaterial, meshConfigs } = useMemo(() => {
    if (typeof materialConfig === 'string') {
      return { mainMaterial: materialConfig, meshConfigs: {} };
    }
    if (materialConfig && materialConfig.material) {
      const { material, ...meshes } = materialConfig;
      return { mainMaterial: material, meshConfigs: meshes };
    }
    return { mainMaterial: null, meshConfigs: materialConfig || {} };
  }, [materialConfig]);

  // ==========================================
  // ANIMATIONS
  // ==========================================
  const animationClips = ready && scene && playClipAnimations ? clips : EMPTY_ARRAY;
  const animationRoot = ready && scene ? group : null;
  const { actions, names, mixer } = useAnimations(animationClips, animationRoot);

  useEffect(() => {
    if (mixer) {
      mixerRef.current = mixer;
    }
  }, [mixer]);

  // ==========================================
  // SOUND MANAGEMENT
  // ==========================================
  useEffect(() => {
    componentMountedRef.current = true;
    soundUrlRef.current = soundUrl;
    soundLoadedRef.current = false;
    modelLoadedRef.current = false;

    return () => {
      componentMountedRef.current = false;
      previousSceneRef.current = null;
      meshRefs.current = {};
      SoundPlayer.stop();
      SoundPlayer.release();
      isSoundPlayingRef.current = false;
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
      let timedOut = false;

      if (soundLoadTimeoutRef.current) {
        clearTimeout(soundLoadTimeoutRef.current);
      }

      soundLoadTimeoutRef.current = setTimeout(() => {
        timedOut = true;
        if (mounted && componentMountedRef.current) {
          onSoundErrorRef.current?.(new Error('Sound loading timeout'));
        }
      }, 10000);

      try {
        await SoundPlayer.load(soundUrl);

        if (soundLoadTimeoutRef.current) {
          clearTimeout(soundLoadTimeoutRef.current);
        }

        if (!mounted || !componentMountedRef.current) return;

        soundLoadedRef.current = true;
        if (!timedOut) onSoundLoadedRef.current?.();

        const shouldPlaySound = 
          soundPlayWithoutAnimation 
            ? modelLoadedRef.current
            : animationStartedRef.current;

        if (shouldPlaySound && soundUrlRef.current === soundUrl) {
          startSound();
        }
      } catch (error) {
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
  }, [soundUrl, soundPlayWithoutAnimation]);

  const startSound = useCallback(() => {
    if (!soundLoadedRef.current || !soundUrl || isSoundPlayingRef.current) {
      return;
    }

    try {
      if (soundLoop && SoundPlayer.getSound()) {
        SoundPlayer.setLoop(true);
      }

      SoundPlayer.play();
      isSoundPlayingRef.current = true;
    } catch (error) {
      // Silent fail
    }
  }, [soundUrl, soundLoop]);

  // ==========================================
  // MODEL LOAD HANDLER
  // ==========================================
  useEffect(() => {
    if (error) {
      onErrorRef.current?.(error);
    } else if (ready && scene) {
      onLoadRef.current?.();
      
      modelLoadedRef.current = true;
      
      if (soundPlayWithoutAnimation && soundLoadedRef.current && soundUrl) {
        startSound();
      }
    }
  }, [ready, error, scene, soundPlayWithoutAnimation, soundUrl, startSound]);

  // ==========================================
  // PROCESS SCENE
  // ==========================================
  const processedScene = useMemo(() => {
    if (!scene || error || !ready) return null;

    const needsReprocess = !processedRef.current || previousSceneRef.current !== scene;
    if (!needsReprocess) return scene;

    try {
      meshRefs.current = {};
      const meshes = [];
      jointRefs.current = {};
     
      // Get all gripper object names from config
      const gripperObjectNames = new Set();

        if (jointConfig?.GRIPPER?.open) {
          Object.values(jointConfig.GRIPPER.open).forEach(finger => {
            if (finger.object) gripperObjectNames.add(finger.object);
          });
        }
        if (jointConfig?.GRIPPER?.closed) {
          Object.values(jointConfig.GRIPPER.closed).forEach(finger => {
            if (finger.object) gripperObjectNames.add(finger.object);
          });
        }

      scene.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
        }
        // Register robot joints (J1, J2, etc.)
        if (child.isObject3D && /^J\d+$/.test(child.name)) {
          jointRefs.current[child.name] = child;
          console.log('[SceneModel] Found joint:', child.name);
        }
        
        // Register gripper objects
        if (child.isObject3D && gripperObjectNames.has(child.name)) {
          jointRefs.current[child.name] = child;
          console.log('[SceneModel] Found gripper part:', child.name);
        }
      });
      // Log all found joints and gripper parts
      console.log('[SceneModel] All registered objects:', Object.keys(jointRefs.current));
      // Notify controller when joints are found
      if (controller && typeof controller.onJointsReady === 'function') {
        controller.onJointsReady(jointRefs.current);
      }

      meshes.forEach((mesh) => {
        const key = mesh.name || mesh.uuid;
        meshRefs.current[key] = mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        let config = meshConfigs[key] || {};

        if (typeof config === 'string') {
          config = materialConfigs[config] || materialConfigs.default || {};
        }

        if (mainMaterial) {
          let mainConfig;

          if (typeof mainMaterial === 'string') {
            mainConfig = materialConfigs[mainMaterial] || materialConfigs.default || {};
          } else {
            mainConfig = mainMaterial;
          }

          config = { ...mainConfig, ...config };
        }

        const baseMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

        const material = new MeshStandardMaterial({
          color: config.color ?? baseMaterial?.color ?? '#999',
          metalness: config.metalness ?? baseMaterial?.metalness ?? 0.9,
          roughness: config.roughness ?? baseMaterial?.roughness ?? 0.4,
          map: config.map ?? baseMaterial?.map ?? null,
          roughnessMap: config.roughnessMap ?? baseMaterial?.roughnessMap ?? null,
          metalnessMap: config.metalnessMap ?? baseMaterial?.metalnessMap ?? null,
          normalMap: config.normalMap ?? baseMaterial?.normalMap ?? null,
          emissive: config.emissive ?? null,
          emissiveIntensity: config.emissiveIntensity ?? 0,
          transparent: config.transparent ?? false,
          opacity: config.opacity ?? 1,
          side: config.side ?? 2,
          envMapIntensity: config.envMapIntensity ?? 0.5,
          ...config,
        });

        mesh.material = material;

        ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap', 'emissiveMap', 'aoMap', 'bumpMap'].forEach(mapType => {
          if (material[mapType]) {
            const tex = material[mapType];
            tex.flipY = config.flipY ?? false;
            tex.premultiplyAlpha = false;
            tex.needsUpdate = true;
          }
        });
      });

      previousSceneRef.current = scene;
      processedRef.current = true;

      return scene;
    } catch (err) {
      onErrorRef.current?.(err);
      return null;
    }
  }, [scene, meshConfigs, error, ready, mainMaterial, materialConfigs, controller]);

  // ==========================================
  // APPLY DEFAULT JOINT CONFIG
  // ==========================================
  useEffect(() => {
    if (!processedScene || !jointConfig) return;
    
    // Let controller handle default pose if it exists
    if (controller && typeof controller.applyDefaultPose === 'function') {
      controller.applyDefaultPose();
    } else {
      // Fallback: apply default pose directly
      Object.entries(jointConfig).forEach(([jointName, cfg]) => {
        const joint = jointRefs.current[jointName];
        if (joint && cfg?.default) {
          applyJointRotation(joint, cfg.default);
        }
      });
    }
  }, [processedScene, jointConfig, controller]);

  // ==========================================
  // CLIP ANIMATION PLAYBACK WITH PAUSE/RESUME
  // ==========================================
  useEffect(() => {
    if (!playClipAnimations || !actions || Object.keys(actions).length === 0) {
      return;
    }

    // Update isPlayingRef
    isPlayingRef.current = isPlaying;

    // Build target actions
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

    // Handle animation playback based on isPlaying state
    if (isPlaying) {
      // PLAY or RESUME animation
      actionKeys.forEach((key) => {
        const action = targetActions[key];
        if (action) {
          // Check if action is paused or not started
          if (action.paused) {
            // Resume from where it was paused
            action.paused = false;
            action.play();
          } else if (!action.isRunning()) {
            // Start fresh if not running
            action.reset();
            action.setLoop(Infinity, Infinity);
            action.timeScale = animationTimeScale;
            action.play();
          }
        }
      });

      // Mark animation as started
      if (!animationStartedRef.current) {
        animationStartedRef.current = true;
      }

      // Start sound only when animation is playing and not set to play without animation
      if (!soundPlayWithoutAnimation && soundLoadedRef.current && soundUrl) {
        startSound();
      }
    } else {
      // PAUSE animation
      actionKeys.forEach((key) => {
        const action = targetActions[key];
        if (action && action.isRunning()) {
          action.paused = true;
        }
      });

      // Pause sound when animation pauses (only if sound shouldn't play without animation)
      if (!soundPlayWithoutAnimation && soundLoadedRef.current && soundUrl) {
        SoundPlayer.pause();
        isSoundPlayingRef.current = false;
      }
    }

    // Event listener for animation completion
    const handleFinished = (event) => {
      const clipName = event.action?.getClip()?.name;
      if (clipName) {
        onClipFinishedRef.current?.(clipName);
      }
    };

    if (mixerRef.current) {
      mixerRef.current.addEventListener('finished', handleFinished);
    }

    return () => {
      // Cleanup: Stop all actions and remove event listener
      actionKeys.forEach((key) => {
        const action = targetActions[key];
        if (action) {
          action.stop();
        }
      });

      if (mixerRef.current) {
        mixerRef.current.removeEventListener('finished', handleFinished);
      }

      // Don't reset animationStartedRef here to maintain state across re-renders
    };
  }, [actions, playClipAnimations, clipNames, animationTimeScale, isPlaying, soundUrl, startSound, soundPlayWithoutAnimation]);

  // ==========================================
  // MANUAL PER-MESH ROTATION ANIMATIONS
  // ==========================================
  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.03);

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

  // ==========================================
  // RENDER
  // ==========================================
  if (!processedScene) return null;

  const children = processedScene.children || [];
  if (children.length === 0) return null;

return (
  <>
    <group
      ref={group}
      {...props}
      position={modelConfig?.position || [0, 0, 0]}
      rotation={modelConfig?.rotation || [0, 0, 0]}
      scale={modelConfig?.scale || [1, 1, 1]}
    >
      {children.map((child, index) => (
        <primitive
          key={`${child.name || child.uuid || index}`}
          object={child}
          onClick={(e) => {
            e.stopPropagation();
            onMeshPress?.(
              e.object?.name || e.object?.uuid,
              e
            );
          }}
        />
      ))}
    </group>

    <AutoFitCamera
      groupRef={group}
      trigger={processedScene}
      enabled={autoFit && modelConfig?.autoFit !== false}
      showBounds={false}
       onTargetChange={setCameraTarget}
    />
  </>
);



});

export const Scene = React.memo(SceneModel, (prevProps, nextProps) => {
  const prevConfig = JSON.stringify(prevProps.materialConfig);
  const nextConfig = JSON.stringify(nextProps.materialConfig);

  return (
    prevProps.modelUrl === nextProps.modelUrl &&
    prevProps.modelConfig === nextProps.modelConfig &&
    prevProps.autoFit === nextProps.autoFit &&
    prevConfig === nextConfig &&
    prevProps.isPlaying === nextProps.isPlaying && 
    prevProps.animations === nextProps.animations &&
    prevProps.playClipAnimations === nextProps.playClipAnimations &&
    prevProps.animationTimeScale === nextProps.animationTimeScale &&
    prevProps.soundUrl === nextProps.soundUrl &&
    prevProps.soundPlayWithoutAnimation === nextProps.soundPlayWithoutAnimation &&
    prevProps.soundLoop === nextProps.soundLoop &&
    JSON.stringify(prevProps.clipNames) === JSON.stringify(nextProps.clipNames) &&
    prevProps.controller === nextProps.controller
  );
});

// ==========================================
// Model3DPreview Component
// ==========================================

const Model3DPreview = forwardRef(function Model3DPreview(
  {
    modelUrl,
    materialConfig = EMPTY_OBJECT,
    modelConfig = EMPTY_OBJECT,
    camPosition = [2, 2, 5],
    animations = EMPTY_ARRAY,
    playClipAnimations = true,
    isPlaying = true,
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
    onMeshPress,
    showTouchLabel = true,
    touchLabelDuration = 1500,
    loadingTimeout = 60000,
    isFullscreen = false,
    controller,
    ...props
  },
  ref
) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [touchedPart, setTouchedPart] = useState(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadCalledRef = useRef(false);
  const touchLabelTimeoutRef = useRef(null);
  const touchFade = useRef(new Animated.Value(0)).current;

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const onMeshPressRef = useRef(onMeshPress);
  
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
    onMeshPressRef.current = onMeshPress;
  });

  const instanceId = useMemo(() => {
    return `preview_${modelUrl}_${isFullscreen ? 'fs' : 'sm'}`;
  }, [modelUrl, isFullscreen]);

  const handlePartPress = useCallback((part, hit) => {
    const label = part?.customName ?? null;

    if (showTouchLabel && label) {
      setTouchedPart(label);
      touchFade.setValue(1);

      if (touchLabelTimeoutRef.current) {
        clearTimeout(touchLabelTimeoutRef.current);
      }
      touchLabelTimeoutRef.current = setTimeout(() => {
        Animated.timing(touchFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (isMountedRef.current) setTouchedPart(null);
        });
      }, touchLabelDuration);
    }

    onMeshPressRef.current?.(part, hit);
  }, [showTouchLabel, touchLabelDuration, touchFade]);

  const handleError = useCallback((err) => {
    if (!isMountedRef.current) return;
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
    setTouchedPart(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      if (!loadCalledRef.current && isMountedRef.current) {
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
      if (touchLabelTimeoutRef.current) {
        clearTimeout(touchLabelTimeoutRef.current);
        touchLabelTimeoutRef.current = null;
      }
    };
  }, [modelUrl, loadingTimeout]);

  const sceneProps = useMemo(() => ({
    modelUrl,
    materialConfig,
    animations,
    isPlaying,
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
    controller,
    ...props
  }), [modelUrl, materialConfig, animations,isPlaying, playClipAnimations, clipNames, animationTimeScale,
     soundUrl, soundLoop, handleLoad, handleError, onClipFinished, onSoundLoaded, onSoundError, props]);

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
        camPosition={modelConfig?.cameraAngle || [2, 2, 5]}
        instanceId={instanceId}
        onPartPress={handlePartPress}
        parts={modelConfig?.parts || []}
      >
        <Scene
          ref={ref}
          key={`scene_${instanceId}`}
          {...sceneProps}
        />
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

      {showTouchLabel && touchedPart && (
        <Animated.View
          style={[styles.touchLabelContainer, { opacity: touchFade }]}
          pointerEvents="none"
        >
          <Text style={styles.touchLabelText}>{touchedPart}</Text>
        </Animated.View>
      )}
    </View>
  );
});

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
  touchLabelContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  touchLabelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default React.memo(Model3DPreview);