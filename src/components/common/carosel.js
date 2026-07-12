/**
 * Carousel.jsx
 * Fixed: Replaced useRef with useSharedValue inside worklets
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Dot Indicator ────────────────────────────────────────────────────────────

const Dot = ({ index, activeIndex, color, activeColor }) => {
  const style = useAnimatedStyle(() => {
    const isActive = Math.round(activeIndex.value) === index;
    return {
      width: withTiming(isActive ? 20 : 8, { duration: 250 }),
      backgroundColor: withTiming(isActive ? activeColor : color, { duration: 250 }),
      opacity: withTiming(isActive ? 1 : 0.5, { duration: 250 }),
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
};

// ─── Carousel ─────────────────────────────────────────────────────────────────

const CarouselInner = forwardRef(function CarouselInner(
  {
    data,
    renderItem,
    width = SCREEN_W,
    height = 220,
    interval = 3000,
    holdThreshold = 150,
    showDots = true,
    dotColor = 'rgba(255,255,255,0.4)',
    activeDotColor = '#FFFFFF',
    style,
    onIndexChange,
    springConfig = { damping: 20, stiffness: 180, mass: 0.8 },
    swipeThreshold = 0.25,
    itemWidth = width * 0.95,
    loop = true,
  },
  ref,
) {
  const count = data.length;

  // ── Shared values ──
  const activeIndex = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const isPaused = useSharedValue(false);
  const indexRef = useSharedValue(0); // CHANGED: was useRef(0)

  // ── Timer ref (JS-only, never touched in worklets) ──
  const timerRef = useRef(null);

  // ── Imperative API ──
  const goTo = useCallback(
    (next) => {
      const clamped = loop
        ? ((next % count) + count) % count
        : Math.max(0, Math.min(count - 1, next));
      indexRef.value = clamped; // CHANGED: was indexRef.current = clamped
      activeIndex.value = withSpring(clamped, springConfig);
      onIndexChange?.(clamped);
    },
    [activeIndex, count, loop, onIndexChange, springConfig, indexRef],
  );

  const next = useCallback(() => goTo(indexRef.value + 1), [goTo, indexRef]); // CHANGED
  const prev = useCallback(() => goTo(indexRef.value - 1), [goTo, indexRef]); // CHANGED

  useImperativeHandle(ref, () => ({ next, prev, goTo }), [next, prev, goTo]);

  // ── Auto-play ──
  const startTimer = useCallback(() => {
    if (interval <= 0 || count <= 1) return;
    timerRef.current = setInterval(() => {
      if (!isPaused.value) next();
    }, interval);
  }, [interval, count, isPaused, next]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  // ── Gestures ──
  const longPress = Gesture.LongPress()
    .minDuration(holdThreshold)
    .onBegin(() => {
      'worklet';
      isPaused.value = true;
    })
    .onFinalize(() => {
      'worklet';
      isPaused.value = false;
    });

const pan = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .onUpdate((e) => {
    'worklet';
    dragOffset.value = e.translationX;
    activeIndex.value = indexRef.value + e.translationX / itemWidth;
  })
  .onEnd((e) => {
    'worklet';
    const committed = Math.abs(e.translationX) > itemWidth * swipeThreshold;
    let nextIndex = indexRef.value;
    if (committed) {
      nextIndex = e.translationX < 0 ? indexRef.value + 1 : indexRef.value - 1;
    }
    dragOffset.value = 0;
    runOnJS(goTo)(nextIndex);
  });

  const gesture = Gesture.Simultaneous(longPress, pan);

  // ── Slide transforms ──
  const makeSlideStyle = (index) =>
    useAnimatedStyle(() => {
      const slideWidth = itemWidth;
      const offset = interpolate(
        activeIndex.value,
        [index - 1, index, index + 1],
        [-slideWidth, 0, slideWidth],
        Extrapolation.CLAMP,
      );
      const scale = interpolate(
        activeIndex.value,
        [index - 1, index, index + 1],
        [0.92, 1, 0.92],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        activeIndex.value,
        [index - 1.5, index - 0.5, index, index + 0.5, index + 1.5],
        [0, 0.6, 1, 0.6, 0],
        Extrapolation.CLAMP,
      );
      return {
        transform: [{ translateX: offset }, { scale }],
        opacity,
      };
    });

  // ── Render ──
  const slideLeft = (width - itemWidth) / 2;

  return (
    <GestureHandlerRootView style={[style, { width, height }]}> 
      <GestureDetector gesture={gesture}>
        <View style={{ width, height, overflow: 'hidden', alignItems: 'center' }}>
          {data.map((item, i) => (
            <Animated.View
              key={i}
              style={[
                {
                  position: 'absolute',
                  left: slideLeft,
                  top: 0,
                  width: itemWidth,
                  height,
                },
                makeSlideStyle(i),
              ]}
            >
              {renderItem(item, i)}
            </Animated.View>
          ))}
        </View>
      </GestureDetector>

      {showDots && count > 1 && (
        <View style={styles.dotsRow}>
          {data.map((_, i) => (
            <Dot
              key={i}
              index={i}
              activeIndex={activeIndex}
              color={dotColor}
              activeColor={activeDotColor}
            />
          ))}
        </View>
      )}
    </GestureHandlerRootView>
  );
});

export const Carousel = CarouselInner;

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});