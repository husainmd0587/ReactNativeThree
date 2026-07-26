import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

function DefaultLights() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
    </>
  );
}

// Reads camera from the R3F context and updates its position every frame
// based on shared values that are written to on the UI thread by gestures.
function OrbitCameraRig({
  theta,
  phi,
  radius,
  targetX,
  targetY,
  targetZ,
}) {
  const { camera } = useThree();

  useFrame(() => {
    const r = radius.value;
    const t = theta.value;
    const p = phi.value;

    camera.position.x = targetX.value + r * Math.sin(p) * Math.sin(t);
    camera.position.y = targetY.value + r * Math.cos(p);
    camera.position.z = targetZ.value + r * Math.sin(p) * Math.cos(t);

    camera.lookAt(targetX.value, targetY.value, targetZ.value);
  });

  return null;
}

function useNativeOrbitControls({
  cameraPosition,
  enablePan,
  enableZoom,
  enableRotate,
  rotateSpeed = 0.005,
  panSpeed = 0.002,
  minDistance = 1,
  maxDistance = 50,
}) {
  const [px, py, pz] = cameraPosition;
  const initialRadius = Math.sqrt(px * px + py * py + pz * pz) || 1;
  const initialTheta = Math.atan2(px, pz);
  const initialPhi = Math.acos(Math.min(1, Math.max(-1, py / initialRadius)));

  const theta = useSharedValue(initialTheta);
  const phi = useSharedValue(initialPhi);
  const radius = useSharedValue(initialRadius);
  const savedRadius = useSharedValue(initialRadius);

  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const targetZ = useSharedValue(0);

  // track previous cumulative translation so we can derive a per-frame delta
  const prevRotateX = useSharedValue(0);
  const prevRotateY = useSharedValue(0);
  const prevPanX = useSharedValue(0);
  const prevPanY = useSharedValue(0);

  const EPS = 0.001;

  const rotateGesture = Gesture.Pan()
    .enabled(enableRotate)
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      prevRotateX.value = 0;
      prevRotateY.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.translationX - prevRotateX.value;
      const dy = e.translationY - prevRotateY.value;
      prevRotateX.value = e.translationX;
      prevRotateY.value = e.translationY;

      theta.value -= dx * rotateSpeed;
      phi.value -= dy * rotateSpeed;
      if (phi.value < EPS) phi.value = EPS;
      if (phi.value > Math.PI - EPS) phi.value = Math.PI - EPS;
    });

  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .minPointers(2)
    .maxPointers(2)
    .onBegin(() => {
      'worklet';
      prevPanX.value = 0;
      prevPanY.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.translationX - prevPanX.value;
      const dy = e.translationY - prevPanY.value;
      prevPanX.value = e.translationX;
      prevPanY.value = e.translationY;

      const t = theta.value;
      const p = phi.value;

      const rightX = Math.cos(t);
      const rightZ = -Math.sin(t);

      const upX = -Math.sin(t) * Math.cos(p);
      const upY = Math.sin(p);
      const upZ = -Math.cos(t) * Math.cos(p);

      const scale = panSpeed * radius.value;
      const ddx = -dx * scale;
      const ddy = dy * scale;

      targetX.value += rightX * ddx + upX * ddy;
      targetY.value += upY * ddy;
      targetZ.value += rightZ * ddx + upZ * ddy;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onBegin(() => {
      'worklet';
      savedRadius.value = radius.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = savedRadius.value / e.scale;
      radius.value = Math.min(maxDistance, Math.max(minDistance, next));
    });

  const gesture = Gesture.Simultaneous(rotateGesture, panGesture, pinchGesture);

  return { gesture, theta, phi, radius, targetX, targetY, targetZ };
}

export default function CanvasProvider({
  children,

  cameraPosition = [4, 3, 5],
  cameraFov = 45,

  background = '#202020',

  enablePan = true,
  enableZoom = true,
  enableRotate = true,

  style,
}) {
  const {
    gesture,
    theta,
    phi,
    radius,
    targetX,
    targetY,
    targetZ,
  } = useNativeOrbitControls({
    cameraPosition,
    enablePan,
    enableZoom,
    enableRotate,
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.container,
          { backgroundColor: background },
          style,
        ]}
      >
        <Canvas
          camera={{
            position: cameraPosition,
            fov: cameraFov,
          }}
        >
          <DefaultLights />

          <OrbitCameraRig
            theta={theta}
            phi={phi}
            radius={radius}
            targetX={targetX}
            targetY={targetY}
            targetZ={targetZ}
          />

          {children}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});