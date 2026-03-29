import { StyleSheet, View, Dimensions,ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Canvas, Path, Circle, Skia, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { shape1 } from './data';
import {
  getIntersection,
  circleLineIntersection,
  arcLineIntersectionPoint,
  SplineChart,
  buildPath,
  Grid,
} from './utilFunctions';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;
const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT; // ✅ Key fix

const toRad = (angle) => (angle * Math.PI) / 180;

const Testing2 = () => {
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2; // ✅ Use canvas height, not screen height

  const Line1 = [{ x: -150, y: 50 }, { x: 150, y: -50 }];
  const Line2 = [{ x: -150, y: -70 }, { x: 150, y: 40 }];
  const CircleCenter = { x: 50, y: -25 };
  const radius = 100;
  const Arc = { x: -40, y: 25, r: 90, startAngle: toRad(0), endAngle: toRad(180) };

  const scale = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX = useSharedValue(centerX);
  const savedY = useSharedValue(centerY);
  const savedScale = useSharedValue(1);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;
  const LIMIT = 500;

  const clamp = (val, min, max) => {
    'worklet';
    return Math.max(min, Math.min(val, max));
  };

  // 🔴 Line 1
  const path = Skia.Path.Make();
  path.moveTo(Line1[0].x, -Line1[0].y);
  path.lineTo(Line1[1].x, -Line1[1].y);

  // 🟢 Line 2
  const path2 = Skia.Path.Make();
  path2.moveTo(Line2[0].x, -Line2[0].y);
  path2.lineTo(Line2[1].x, -Line2[1].y);

  // 🔵 Circle Path
  const circlePath = Skia.Path.Make();
  circlePath.addCircle(CircleCenter.x, -CircleCenter.y, radius);

  // Intersections
  const intersection = getIntersection(Line1[0], Line1[1], Line2[0], Line2[1]);
  const intersections = circleLineIntersection(
    CircleCenter.x, CircleCenter.y, radius, Line1[0], Line1[1]
  );
  const arcIntersections = arcLineIntersectionPoint(
    Arc.x, Arc.y, Arc.r, Arc.startAngle, Arc.endAngle, Line1[0], Line1[1]
  );

  const DrawIntersection = () => {
    if (!intersection) return null;
    return <Circle cx={intersection.x} cy={-intersection.y} r={5} color="black" />;
  };

  const DrawCircleIntersection = () => {
    if (!intersections || intersections.length === 0) return null;
    return intersections.map((point, index) => (
      <Circle key={index} cx={point.x} cy={-point.y} r={5} color="blue" />
    ));
  };

  const DrawArcIntersection = () => {
    const arcPath = Skia.Path.Make();
    const startDeg = (Arc.startAngle * 180) / Math.PI;
    const sweepDeg = ((Arc.endAngle - Arc.startAngle) * 180) / Math.PI;
    arcPath.addArc(
      { x: Arc.x - Arc.r, y: -(Arc.y + Arc.r), width: Arc.r * 2, height: Arc.r * 2 },
      startDeg,
      sweepDeg
    );
    return (
      <>
        <Path path={arcPath} color="white" style="stroke" strokeWidth={4} />
        {arcIntersections?.map((point, index) => (
          <Circle key={index} cx={point.x} cy={-point.y} r={5} color="purple" />
        ))}
      </>
    );
  };
  const shape1Path = buildPath(shape1);

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart((e) => { console.log('Start drawing at', e.x, e.y); })
    .onUpdate((e) => { console.log('Drawing...', e.x, e.y); })
    .onEnd(() => { console.log('Finish line'); });

  const pan = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(savedX.value + e.translationX, -LIMIT, LIMIT);
      translateY.value = clamp(savedY.value + e.translationY, -LIMIT, LIMIT);
    });

  const composed = Gesture.Simultaneous(pinch, pan, drawGesture);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <ScrollView horizontal contentContainerStyle={styles.header}>
          
      </ScrollView>

      {/* Canvas — fills remaining space */}
      <GestureDetector gesture={composed}>
        <Canvas style={styles.canvas}>
          <Group transform={transform}>
            <Grid />
       
          </Group>
        </Canvas>
      </GestureDetector>

      {/* Footer */}
      <ScrollView horizontal contentContainerStyle={styles.footer}>
       
      </ScrollView>
    </View>
  );
};

export default Testing2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#fff',
  },
  canvas: {
    width: width,
    height: CANVAS_HEIGHT, // ✅ Explicit calculated height, not full screen
    backgroundColor: '#fff',
  },
  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: '#fff',
  },
});