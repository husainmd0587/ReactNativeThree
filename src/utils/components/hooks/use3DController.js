import { useCallback, useEffect, useRef } from 'react';

const DEG2RAD = Math.PI / 180;

export function use3DController(scene, config = {}) {
  const objectsRef = useRef({});

  useEffect(() => {
    if (!scene) return;

    const objects = {};

    Object.entries(config).forEach(([id, settings]) => {
      const object = scene.getObjectByName(settings.object);

      if (object) {
        objects[id] = object;
      }
    });

    objectsRef.current = objects;
  }, [scene, config]);

  const setRotation = useCallback(
    (id, angle) => {
      const object = objectsRef.current[id];
      const settings = config[id];

      if (!object || !settings) return;

      const axis = settings.axis || 'y';

      let value = angle;

      if (settings.limit) {
        value = Math.max(
          settings.limit[0],
          Math.min(settings.limit[1], value)
        );
      }

      object.rotation[axis] = value * DEG2RAD;
    },
    [config]
  );

  return {
    setRotation,
  };
}