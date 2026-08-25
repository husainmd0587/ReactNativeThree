// hooks/useGltfOnline.js

import { useEffect, useState, useRef } from 'react';
import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from './meshopt_decoder_reference.js';

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

// Keep this VERY small for React Native.
// A large cache can easily keep hundreds of MB alive.
const CACHE_SIZE = 1;

// Optional model-name mapping.
const PART_NAME_MAP = {
  // Cube001: 'Head',
  // Cube002: 'LeftArm',
  // Mesh_45: 'RightHand',
};

/**
 * ============================================================
 * PART NAME MAP
 * ============================================================
 */

function applyPartNameMap(scene) {
  if (!PART_NAME_MAP || Object.keys(PART_NAME_MAP).length === 0) {
    return;
  }

  scene.traverse((child) => {
    const label = PART_NAME_MAP[child.name];
    if (label) {
      child.userData = child.userData || {};
      child.userData.part = label;
    }
  });
}

/**
 * ============================================================
 * DISPOSE THREE.JS SCENE
 * ============================================================
 * Only ever called on the MASTER scene stored in the cache (on
 * eviction/clear), never on a per-instance clone — clones share
 * geometry/materials with the master, so disposing a clone's
 * resources would break every other clone.
 */

function disposeScene(scene) {
  if (!scene) return;

  scene.traverse((child) => {
    if (!child.isMesh) return;

    if (child.geometry) {
      child.geometry.dispose();
    }

    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      if (material.map) material.map.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      material.dispose();
    });
  });
}

/**
 * ============================================================
 * VERY SMALL LRU CACHE
 * ============================================================
 */

class LRUCache {
  constructor(maxSize = 1) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Move to newest position.
    this.cache.delete(key);
    this.cache.set(key, item);

    return item;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;

      const oldest = this.cache.get(oldestKey);
      if (oldest?.scene) {
        disposeScene(oldest.scene);
      }

      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  clear() {
    for (const value of this.cache.values()) {
      if (value?.scene) {
        disposeScene(value.scene);
      }
    }
    this.cache.clear();
  }
}

/** Only keep ONE model in memory. */
const cache = new LRUCache(CACHE_SIZE);

/**
 * ============================================================
 * CLONE RESULT
 * ============================================================
 *
 * IMPORTANT: use SkeletonUtils.clone here, NOT scene.clone(true).
 *
 * Plain Object3D.clone(true) deep-clones the node hierarchy
 * (including Bone nodes) but does NOT rebind each SkinnedMesh's
 * `.skeleton` / bone references to point at the newly cloned bones —
 * they keep pointing at the ORIGINAL scene's bones. Every clone then
 * silently shares (and fights over) the same skeleton, so animations
 * either don't move the clone at all or move every clone in lockstep
 * with whichever one last updated the shared bones.
 *
 * SkeletonUtils.clone() exists specifically to walk the hierarchy,
 * clone bones, and rebuild each SkinnedMesh's skeleton/bindMatrix
 * against the cloned bones. Required for any rigged/animated model
 * (robot joints included, if they're driven by an actual bone
 * hierarchy rather than plain Object3D/Group nodes).
 */

function cloneResult(master) {
  if (!master || !master.scene) {
    return master;
  }

  const clonedScene = cloneSkeleton(master.scene);

  const nodes = {};
  const materials = {};

  clonedScene.traverse((child) => {
    if (child.name) {
      nodes[child.name] = child;
    }

    if (child.isMesh && child.material) {
      const materialsArray = Array.isArray(child.material) ? child.material : [child.material];

      materialsArray.forEach((material) => {
        if (material?.name) {
          materials[material.name] = material;
        }
      });
    }
  });

  return {
    ...master,
    scene: clonedScene,
    nodes,
    materials,
  };
}

/**
 * ============================================================
 * FETCH GLB AS ARRAYBUFFER
 * ============================================================
 * RN's fetch/Blob bridge handles the binary transfer natively for
 * both remote and local file:// URLs — no manual base64 chunking.
 */

async function fetchArrayBuffer(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to fetch GLB: ${error?.message || error}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch GLB. HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Fetched GLB is empty');
  }

  return arrayBuffer;
}

/**
 * ============================================================
 * GLTF LOADER
 * ============================================================
 */

let loaderInstance = null;
let decoderInitialized = false;

function getLoader() {
  const manager = new LoadingManager();
  const loader = new GLTFLoader(manager);

  try {
    if (MeshoptDecoder) {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
  } catch (error) {
    // Silent fail for non-critical decoder setup.
  }

  return loader;
}

function getLoaderInstance() {
  if (!loaderInstance) {
    loaderInstance = getLoader();
  }
  return loaderInstance;
}

/**
 * ============================================================
 * PROMISE DEDUPLICATION
 * ============================================================
 */

const loadingPromises = {};

/**
 * ============================================================
 * MAIN HOOK
 * ============================================================
 */

export function useGLTF(url) {
  const [state, setState] = useState({
    nodes: {},
    materials: {},
    animations: [],
    scene: null,
    ready: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Reset state when URL changes.
    setState({
      nodes: {},
      materials: {},
      animations: [],
      scene: null,
      ready: false,
      error: null,
    });

    if (!url) {
      setState({
        nodes: {},
        materials: {},
        animations: [],
        scene: null,
        ready: false,
        error: new Error('No GLB URL provided'),
      });
      return () => {
        cancelled = true;
      };
    }

    // ---- CACHE ----
    const cached = cache.get(url);
    if (cached) {
      if (!cancelled && mountedRef.current) {
        setState(cloneResult(cached));
      }
      return () => {
        cancelled = true;
      };
    }

    // ---- ALREADY LOADING ----
    if (loadingPromises[url]) {
      loadingPromises[url]
        .then((result) => {
          if (cancelled || !mountedRef.current) return;
          setState(cloneResult(result));
        })
        .catch((error) => {
          if (cancelled || !mountedRef.current) return;
          setState({
            nodes: {},
            materials: {},
            animations: [],
            scene: null,
            ready: false,
            error,
          });
        });

      return () => {
        cancelled = true;
      };
    }

    // ---- LOAD ----
    const load = async () => {
      let arrayBuffer = null;

      try {
        if (!decoderInitialized && MeshoptDecoder) {
          try {
            if (MeshoptDecoder.ready) {
              await MeshoptDecoder.ready;
            }
            decoderInitialized = true;
          } catch (error) {
            // Silent fail for non-critical meshopt setup.
          }
        }

        // No download-to-disk step, no base64 stream reading, no
        // manual byte decoder — RN's fetch/Blob bridge handles this
        // natively for both remote and local file:// URLs.
        arrayBuffer = await fetchArrayBuffer(url);

        if (cancelled || !mountedRef.current) return null;

        const loader = getLoaderInstance();

        try {
          loader.setMeshoptDecoder(MeshoptDecoder);
        } catch (error) {
          // Silent fail for non-critical meshopt setup.
        }

        const gltf = await new Promise((resolve, reject) => {
          loader.parse(
            arrayBuffer,
            '',
            (result) => resolve(result),
            (error) => reject(error)
          );
        });

        // Allow GC to reclaim the binary buffer once parsed.
        arrayBuffer = null;

        if (cancelled || !mountedRef.current) return null;

        const scene = gltf.scene;
        if (!scene) {
          throw new Error('GLTF contains no scene');
        }

        applyPartNameMap(scene);

        const nodes = {};
        const materials = {};

        scene.traverse((child) => {
          if (child.name) {
            nodes[child.name] = child;
          }
          if (child.isMesh && child.material) {
            const materialsArray = Array.isArray(child.material) ? child.material : [child.material];
            materialsArray.forEach((material) => {
              if (material?.name) {
                materials[material.name] = material;
              }
            });
          }
        });

        const result = {
          nodes,
          materials,
          animations: gltf.animations || [],
          scene,
          ready: true,
          error: null,
        };

        // Only ONE model is cached.
        cache.set(url, result);
        delete loadingPromises[url];

        if (cancelled || !mountedRef.current) return null;

        // Give consumer its own scene, with bones correctly rebound.
        setState(cloneResult(result));

        return result;
      } catch (error) {
        arrayBuffer = null;
        delete loadingPromises[url];

        if (!cancelled && mountedRef.current) {
          setState({
            nodes: {},
            materials: {},
            animations: [],
            scene: null,
            ready: false,
            error,
          });
        }

        throw error;
      }
    };

    const promise = load();
    loadingPromises[url] = promise;

    // Prevent unhandled promise warnings — consumer gets the error via state.
    promise.catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

/**
 * ============================================================
 * OPTIONAL CACHE CONTROL
 * ============================================================
 */

export function clearGLTFCache() {
  cache.clear();
}

export function clearGLTF(url) {
  if (!url) return;

  const item = cache.cache.get(url);
  if (item?.scene) {
    disposeScene(item.scene);
  }
  cache.cache.delete(url);
}

//compressed models - gltfpack -i car.glb -o carC.glb -cc -kn -ke -vpf -vtf
