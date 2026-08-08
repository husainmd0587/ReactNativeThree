// hooks/useGLTFonline.js
import { useEffect, useState, useRef } from 'react';
import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from './meshopt_decoder_reference.js';

// ─── Optional map for exporters that emit generic names (Cube001, Mesh_45).
// Fill this in per-model if your GLBs need it; entries stamp userData.part
// onto the matching node once, right after load, so every cached clone
// inherits the same labels. Safe to leave empty — untouched nodes just use
// their own node.name as before.
const PART_NAME_MAP = {
  // Cube001: 'Head',
  // Cube002: 'LeftArm',
  // Mesh_45: 'RightHand',
};

function applyPartNameMap(scene) {
  if (!PART_NAME_MAP || Object.keys(PART_NAME_MAP).length === 0) return;

  scene.traverse((child) => {
    const label = PART_NAME_MAP[child.name];
    if (label) {
      child.userData.part = label;
    }
  });
}

class LRUCache {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const [oldestKey] = this.cache.keys();
      const oldest = this.cache.get(oldestKey);
      if (oldest && oldest.scene) {
        disposeScene(oldest.scene);
      }
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    for (const [key, value] of this.cache.entries()) {
      if (value && value.scene) {
        disposeScene(value.scene);
      }
    }
    this.cache.clear();
  }
}

// Dispose function for Three.js objects.
// Only ever called on the MASTER scene stored in the cache (on eviction/clear),
// never on a per-instance clone — clones share geometry/materials with the
// master, so disposing a clone's resources would break every other clone.
function disposeScene(scene) {
  if (!scene) return;

  scene.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach(material => {
          if (material.map) material.map.dispose();
          if (material.roughnessMap) material.roughnessMap.dispose();
          if (material.metalnessMap) material.metalnessMap.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.alphaMap) material.alphaMap.dispose();
          if (material.emissiveMap) material.emissiveMap.dispose();
          material.dispose();
        });
      }
    }
  });
}

// Clone a master result into a fresh, independent instance for one consumer.
// Node/material name-lookup maps are rebuilt against the CLONE so any
// downstream code indexing nodes/materials by name still gets objects that
// actually belong to that instance's own scene graph.
// userData (including userData.part set by applyPartNameMap) is preserved
// automatically by cloneSkeleton/Object3D.clone, so labels survive cloning.
function cloneResult(master) {
  if (!master || !master.scene) return master;

  const clonedScene = cloneSkeleton(master.scene);

  const nodes = {};
  const materials = {};
  clonedScene.traverse((child) => {
    if (child.name) {
      nodes[child.name] = child;
    }
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        if (mat.name) materials[mat.name] = mat;
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

const cache = new LRUCache(5);
let decoderInitialized = false;
const loadingPromises = {};



// Pre-configure the GLTFLoader with decoder
const getLoader = () => {
  const manager = new LoadingManager();
  manager.onStart = () => {};
  manager.onLoad = () => {};
  manager.onProgress = () => {};
  manager.onError = () => {};

  const loader = new GLTFLoader(manager);

  if (MeshoptDecoder) {
    try {
      loader.setMeshoptDecoder(MeshoptDecoder);
    } catch (e) {
      // Silent fail
    }
  }

  return loader;
};

let loaderInstance = null;

const getLoaderInstance = () => {
  if (!loaderInstance) {
    loaderInstance = getLoader();
  }
  return loaderInstance;
};

export function useGLTF(url) {
  const [state, setState] = useState({
    nodes: {},
    materials: {},
    animations: [],
    scene: null,
    ready: false,
    error: null
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset state when URL changes
    setState({
      nodes: {},
      materials: {},
      animations: [],
      scene: null,
      ready: false,
      error: null
    });

    if (!url) {
      setState(prev => ({
        ...prev,
        ready: false,
        error: new Error('No URL provided')
      }));
      return;
    }

    // Check cache — clone before handing to this consumer
    const cached = cache.get(url);
    if (cached) {
      setState(cloneResult(cached));
      return;
    }

    if (loadingPromises[url]) {
      loadingPromises[url].then((result) => {
        if (isMounted.current) {
          setState(cloneResult(result));
        }
      }).catch((error) => {
        if (isMounted.current) {
          setState({
            nodes: {},
            materials: {},
            animations: [],
            scene: null,
            ready: false,
            error: error
          });
        }
      });
      return;
    }

    async function load() {
      try {
        if (!decoderInitialized) {
          if (MeshoptDecoder.ready) {
            await MeshoptDecoder.ready;
          }
          decoderInitialized = true;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const loader = getLoaderInstance();

        try {
          loader.setMeshoptDecoder(MeshoptDecoder);
        } catch (e) {
          // Silent fail
        }

  const gltf = await new Promise((resolve, reject) => {
          loader.parse(
            arrayBuffer,
            '',
            (result) => {
              resolve(result);
            },
            (error) => {
              reject(error);
            }
          );
        });



        if (!isMounted.current) return;

        const scene = gltf.scene;

        // Stamp explicit part labels onto the MASTER scene once, before it's
        // cached — every subsequent cloneResult() call inherits these via
        // userData, so this only ever runs once per model, not per instance.
        applyPartNameMap(scene);

        // Process the master scene (this becomes the cached "template")
        const nodes = {};
        const materials = {};

        scene.traverse((child) => {
          if (child.name) {
            nodes[child.name] = child;
          }

          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];

            mats.forEach(mat => {
              if (mat.name) {
                materials[mat.name] = mat;
              }
            });
          }
        });

        const result = {
          nodes,
          materials,
          animations: gltf.animations || [],
          scene: scene,
          ready: true,
          error: null
        };

        cache.set(url, result);
        delete loadingPromises[url];

        if (isMounted.current) {
          // Give THIS consumer its own clone, never the master directly
          setState(cloneResult(result));
        }

      } catch (error) {
        console.error('GLTF Load Error:', error);
        delete loadingPromises[url];

        if (isMounted.current) {
          setState({
            nodes: {},
            materials: {},
            animations: [],
            scene: null,
            ready: false,
            error: error
          });
        }
      }
    }

    loadingPromises[url] = load();

  }, [url]);

  return state;
}