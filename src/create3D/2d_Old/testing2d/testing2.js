import { StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import React from 'react';
import { Canvas, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { Grid } from './utilFunctions';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;
const CANVAS_HEIGHT = height - HEADER_HEIGHT - FOOTER_HEIGHT;

const Testing2 = () => {
  const centerX = width / 2;
  const centerY = CANVAS_HEIGHT / 2;

  const scale     = useSharedValue(1);
  const translateX = useSharedValue(centerX);
  const translateY = useSharedValue(centerY);
  const savedX    = useSharedValue(centerX);
  const savedY    = useSharedValue(centerY);
  const savedScale = useSharedValue(1);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;
  const LIMIT = 500;

  const clamp = (val, min, max) => {
    'worklet';
    return Math.max(min, Math.min(val, max));
  };

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

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

  const composed = Gesture.Simultaneous(pinch, pan);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  return (
    <View style={styles.container}>
      <ScrollView horizontal style={styles.header} />

      <GestureDetector gesture={composed}>
        <Canvas style={styles.canvas}>
          <Group transform={transform}>
            <Grid />
          </Group>
        </Canvas>
      </GestureDetector>

      <ScrollView horizontal style={styles.footer} />
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
    width,
    height: CANVAS_HEIGHT,
    backgroundColor: '#fff',
  },
  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: '#fff',
  },
});