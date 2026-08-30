import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { ImageBackground, Image } from 'react-native';
import { Canvas, useFrame as useR3FFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { useTextureLoader } from '../../../../utils/materials/textures';
import { degToRad } from '../../../../utils/common';
import {
  BASE_RPM, MOTOR_RIG_SCALE,
  MOTOR_IMAGE_BOTTOM, MOTOR_IMAGE_LEFT, MOTOR_IMAGE_SIZE,
} from '../constants';
import motor from '../../../../assets/images/others/motor.png';

// ── Rotating pulley ────────────────────────────────────────────
export const RotatingPulley = memo(function RotatingPulley({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.8,
  thickness = 0.2,
  speed = 4,
  direction = 1,
  color = '#aa6e6e',
  texture = null,
  rpmRef = null,
  isPowered = true,
}) {
  const pulleyRef = useRef(null);

  useR3FFrame((_, delta) => {
    if (!pulleyRef.current) return;
    if (!isPowered) return;
    // Rotation speed tracks the same RPM control that drives the
    // stock's spin -- read live via a ref (not a prop) so this stays
    // in sync without needing this frozen preview to re-render.
    const rpmFactor = (rpmRef?.current ?? BASE_RPM) / BASE_RPM;
    pulleyRef.current.rotation.y += delta * speed * rpmFactor * direction;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={pulleyRef}>
        <mesh>
          <cylinderGeometry args={[radius, radius, thickness, 24]} />
          <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} map={texture} />
        </mesh>
      </group>
    </group>
  );
});

// ── V-belt ─────────────────────────────────────────────────────
// Belt texture load retry: same issue as the stock's wood texture --
// useTextureLoader fetches asynchronously (over HTTP from Metro in
// dev), and if that fetch fails or is mid-flight when the dev server
// restarts, there's no built-in retry. The belt is then stuck on its
// flat `color` fallback (no map) until something unrelated forces a
// remount -- which is exactly why a full screen reload "fixes" it
// but nothing else does. VBeltTextureProbe isolates the hook call so
// a failed load can be retried by remounting just the probe, via a
// fresh `key` from VBelt below, without remounting the belt mesh
// itself or losing its rotation/animation state.
const VBELT_TEXTURE_RETRY_MS = 1500;
const VBELT_TEXTURE_MAX_RETRIES = 5;

function VBeltTextureProbe({ onLoaded }) {
  const texture = useTextureLoader({
    flipY: false,
    type: 'wall',
    repeat: [1, 1],
  });
  useEffect(() => {
    onLoaded(texture ?? null);
  }, [texture, onLoaded]);
  return null;
}

export const VBelt = memo(function VBelt({
  center = [0, -1, 0],
  width = 0.10,
  height = 3.68,
  speed = 0.5,
  color = '#888686',
  rpmRef = null,
  isPowered = true,
}) {
  const beltRef = useRef(null);

  const [loadedTexture, setLoadedTexture] = useState(null);
  const [textureRetryKey, setTextureRetryKey] = useState(0);
  const retryCountRef = useRef(0);

  const handleLoaded = useCallback((tex) => {
    setLoadedTexture(tex);
    if (tex) retryCountRef.current = 0;
  }, []);

  useEffect(() => {
    if (loadedTexture) return; // already loaded -- nothing to retry
    if (retryCountRef.current >= VBELT_TEXTURE_MAX_RETRIES) return;
    const t = setTimeout(() => {
      retryCountRef.current += 1;
      setTextureRetryKey(k => k + 1);
    }, VBELT_TEXTURE_RETRY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedTexture, textureRetryKey]);

  const texture = useMemo(() => {
    if (!loadedTexture) return null;
    const cloned = loadedTexture.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.needsUpdate = true;
    return cloned;
  }, [loadedTexture]);

  useEffect(() => {
    return () => { texture?.dispose(); };
  }, [texture]);

  useR3FFrame((_, delta) => {
    if (!texture) return;
    if (!isPowered) return;
    const rpmFactor = (rpmRef?.current ?? BASE_RPM) / BASE_RPM;
    texture.offset.y -= delta * speed * rpmFactor;
  });

  return (
    <>
      <VBeltTextureProbe key={textureRetryKey} onLoaded={handleLoaded} />
      {texture && (
        <mesh ref={beltRef} position={center}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            color={color}
            map={texture}
            side={THREE.DoubleSide}
            roughness={0.9}
            metalness={0}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
});

// ── Gear box (static decoration) ────────────────────────────────
export const GearBox = memo(function GearBox({
  position = [0, 0, 0],
  rotation = [0, 10, 0],
  size = 0.5,
  color = '#fafafa',
}) {
  const texture = useTextureLoader({ flipY: true, type: 'default', repeat: [1, 1] });
  return (
    <group position={position} rotation={degToRad(rotation)}>
      <mesh>
        <boxGeometry args={[size / 1.5, size, size]} />
        <meshStandardMaterial color={color} map={texture} metalness={0.5} />
      </mesh>
    </group>
  );
});

// ── Pulley/belt assembly (no motor 3D model -- motor is a flat PNG) ──
function PulleysOnly({ rpmRef, isPowered = true }) {
  const texture = useTextureLoader({
    type: 'wall',
    flipY: false,
    repeat: [1, 1],
  });

  const AllPos = {
    pulley1: [-1.25, 0.9, 0],
    pulley2: [-1.1, 0.9, 0],
    pulley3: [-1.23, -1.5, 0],
    beltCenter: [-1.22, -0.098, 0],
    gearBox: [-0.8, -1.5, 0],
    pulley4: [-1.1, -1.5, 0],
  };

  return (
    <group>
      <RotatingPulley position={AllPos.pulley1} rotation={degToRad([0, 18, 90])} radius={0.8} thickness={0.2} speed={4} direction={-1} color="#aa6e6e" texture={texture} rpmRef={rpmRef} isPowered={isPowered} />
      <RotatingPulley position={AllPos.pulley2} rotation={degToRad([0, 10, 90])} radius={0.3} thickness={0.29} speed={4} direction={-1} color="#aa6e6e" texture={texture} rpmRef={rpmRef} isPowered={isPowered} />
      <RotatingPulley position={AllPos.pulley3} rotation={degToRad([0, 18, 90])} radius={0.4} thickness={0.2} speed={4} direction={-1} color="#aa6e6e" texture={texture} rpmRef={rpmRef} isPowered={isPowered} />
      <VBelt center={AllPos.beltCenter} rpmRef={rpmRef} isPowered={isPowered} />
      <GearBox position={AllPos.gearBox} rpmRef={rpmRef} />
      <RotatingPulley position={AllPos.pulley4} rotation={degToRad([0, 18, 90])} radius={0.1} thickness={0.25} speed={4} direction={-1} color="#aa6e6e" texture={texture} rpmRef={rpmRef} isPowered={isPowered} />
    </group>
  );
}

// ── Motor preview (frozen workshop background behind the 2D canvas) ──
// Wrapped in a custom-comparator memo: `rpm` changes shouldn't re-render
// this (rpm is read live via rpmRef inside each useR3FFrame above, to
// avoid re-rendering the whole preview ~10x/sec). `isPowered` is
// different -- it isn't read from a ref anywhere in this tree, so a
// change HAS to reach RotatingPulley/VBelt as a fresh prop, or they
// (and the motor image's opacity) freeze at whatever isPowered was on
// first mount.
export const MotorPreview = React.memo(
  function MotorPreview({ rpmRef, onLoad, isPowered = true }) {
    useEffect(() => {
      if (onLoad) onLoad();
    }, []);

    return (
      <ImageBackground
        source={{
          uri: 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/turning%26milling/mannualTurning/carpentryWorkshop.jpg',
        }}
        resizeMode="cover"
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: -1,
        }}
      >
        <Canvas
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          camera={{ position: [0, 0, 5], fov: 50 }}
        >
          <ambientLight intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={2} />
          {/* The Canvas above fills the full 2D-view height at a fixed
              camera FOV, so the pulley/belt world-space sizes (radius,
              belt height) render far larger on screen than intended --
              a full-height black belt and an oversized flywheel
              dominating the frame. Scaling the whole rig down here
              (MOTOR_RIG_SCALE, in constants.js) is the single place to
              retune how big the mechanism reads next to the motor PNG
              without touching every position/radius number below. */}
          <group scale={MOTOR_RIG_SCALE}>
            <PulleysOnly rpmRef={rpmRef} isPowered={isPowered} />
          </group>
        </Canvas>

        <Image
          source={motor}
          style={{
            position: 'absolute',
            bottom: MOTOR_IMAGE_BOTTOM,
            left: MOTOR_IMAGE_LEFT,
            width: MOTOR_IMAGE_SIZE,
            height: MOTOR_IMAGE_SIZE,
            resizeMode: 'contain',
            zIndex: 1,
            opacity: isPowered ? 1 : 0.5,
          }}
        />
      </ImageBackground>
    );
  },
  (prevProps, nextProps) =>
    prevProps.isPowered === nextProps.isPowered &&
    prevProps.rpmRef === nextProps.rpmRef &&
    prevProps.onLoad === nextProps.onLoad
);
