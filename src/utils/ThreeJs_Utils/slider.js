import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Easing } from 'react-native';

/**
 * Horizontal-only Slider component - Inspired by @react-native-community/slider.
 * Fully working with finger control. Thumb renders as a round-rectangle
 * (configurable width/height/borderRadius) instead of a circle/pill.
 */
const Slider = ({
  // Value props
  value = 0,
  minimumValue = 0,
  maximumValue = 300,
  step = 1,

  // Styling
  length = null, // optional fixed width of the track (px). If omitted,
  // the track stretches to fill all available width of its parent —
  // more usable travel distance = finer-grained drag accuracy.
  trackThickness = 6,
  minimumTrackTintColor = '#4F46E5',
  maximumTrackTintColor = '#E5E7EB',
  thumbTintColor = '#4F46E5',
  borderRadius = 3,

  // Thumb customization (round-rectangle: wider/taller than a plain circle)
  thumbWidth = 14,
  thumbHeight = 26,
  thumbBorderRadius = 6,
  thumbImage = null,
  renderThumb = null,

  // Callbacks
  onValueChange = null,
  onSlidingStart = null,
  onSlidingComplete = null,

  // Animation
  animateTransitions = true,
  animationDuration = 100,

  // Accessibility
  accessibilityLabel,
  disabled = false,

  // Value label — fixed at the start or end of the track (does not
  // move with the thumb, only the number inside it updates).
  showLabel = false,
  labelPosition = 'left',
  labelOffset = 8,
  formatLabel = (val) => `${Math.round(val)}`,
  labelStyle,
  labelTextStyle,

  // Custom
  style,
  trackStyle,
  thumbStyle,
  containerStyle,
  ...restProps
}) => {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const [localValue, setLocalValue] = useState(value);

  const [trackSize, setTrackSize] = useState(length);
  const trackSizeRef = useRef(length); // mirrors trackSize, read inside PanResponder callbacks
  const isAnimating = useRef(false);

  // Ref to the actual touchable view, so we can `measure()` its absolute
  // on-screen position - this is what avoids the "jump to 100%" / blink
  // bug that per-child-relative `locationX` causes.
  const trackContainerRef = useRef(null);
  // Absolute page X of the start of the track. Single fixed reference
  // point for all touch math.
  const trackPageOffsetRef = useRef(0);

  // Measured size of the label bubble, so we can center/position it.
  const [labelSize, setLabelSize] = useState({ width: 0, height: 0 });

  const percentToValue = (percent) => {
    const clamped = Math.min(Math.max(percent, 0), 1);
    return minimumValue + clamped * (maximumValue - minimumValue);
  };

  const roundToStep = (val) => {
    if (step === 0) return val;
    const stepped = Math.round((val - minimumValue) / step) * step + minimumValue;
    return Math.min(Math.max(stepped, minimumValue), maximumValue);
  };

  // Converts an absolute page X coordinate into a value.
  const getValueFromPageCoord = (pageX) => {
    const relative = pageX - trackPageOffsetRef.current;
    const clamped = Math.max(0, Math.min(relative, trackSizeRef.current));
    const percent = clamped / trackSizeRef.current;
    return roundToStep(percentToValue(percent));
  };

  const getValueFromEvent = (evt) => getValueFromPageCoord(evt.nativeEvent.pageX);

  const updateValue = (newValue, callback) => {
    const clamped = Math.min(Math.max(newValue, minimumValue), maximumValue);
    const rounded = roundToStep(clamped);

    setLocalValue(rounded);

    if (animateTransitions && !isAnimating.current) {
      isAnimating.current = true;
      Animated.timing(animatedValue, {
        toValue: rounded,
        duration: animationDuration,
        easing: Easing.quad,
        useNativeDriver: false,
      }).start(() => {
        isAnimating.current = false;
        if (callback) callback(rounded);
      });
    } else {
      animatedValue.setValue(rounded);
      if (callback) callback(rounded);
    }
  };

  useEffect(() => {
    if (value !== localValue && !isAnimating.current) {
      updateValue(value);
    }
  }, [value]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (evt) => {
      const newValue = getValueFromEvent(evt);
      animatedValue.setValue(newValue);
      setLocalValue(newValue);
      onSlidingStart?.(newValue);
      onValueChange?.(newValue);
    },
    onPanResponderMove: (evt) => {
      const newValue = getValueFromEvent(evt);
      animatedValue.setValue(newValue);
      setLocalValue(newValue);
      onValueChange?.(newValue);
    },
    onPanResponderRelease: (evt) => {
      const newValue = getValueFromEvent(evt);
      updateValue(newValue, (finalValue) => onSlidingComplete?.(finalValue));
    },
    onPanResponderTerminate: (evt) => {
      const newValue = getValueFromEvent(evt);
      updateValue(newValue, (finalValue) => onSlidingComplete?.(finalValue));
    },
  });

  const onTrackLayout = (event) => {
    const measured = event.nativeEvent.layout.width;
    trackSizeRef.current = measured;
    setTrackSize((prev) => (prev !== measured ? measured : prev));

    // Re-measure absolute screen position on every layout change
    // (rotation, resize, parent re-layout) so the offset never goes stale.
    if (trackContainerRef.current) {
      trackContainerRef.current.measure((x, y, w, h, pageX) => {
        trackPageOffsetRef.current = pageX;
      });
    }
  };

  const thumbTranslate = animatedValue.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: [-thumbWidth / 2, trackSize - thumbWidth / 2],
    extrapolate: 'clamp',
  });

  const fillPercent = animatedValue.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const renderThumbComponent = () => {
    if (renderThumb) {
      return renderThumb({ value: localValue, position: thumbTranslate, animated: animatedValue });
    }

    const ThumbComponent = thumbImage ? Animated.Image : Animated.View;

    return (
      <ThumbComponent
        source={thumbImage || undefined}
        // Thumb never eats touches meant for the track - keeps the touch
        // target simple regardless of child hit-testing quirks.
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumbWidth,
            height: thumbHeight,
            borderRadius: thumbBorderRadius,
            backgroundColor: thumbImage ? undefined : thumbTintColor,
            transform: [{ translateX: thumbTranslate }, { translateY: -(thumbHeight / 2) }],
            shadowColor: thumbTintColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          },
          thumbStyle,
        ]}
      />
    );
  };

const labelPositionStyle = {
  top: 0,
  transform: [{ translateY: -labelSize.height / 2 }],
  ...(labelPosition === 'left'
    ? { left: labelOffset }
    : { right: labelOffset }),
};

  return (
    <View
      style={[styles.container, containerStyle]}
      accessible
      accessibilityLabel={accessibilityLabel || 'Horizontal Slider'}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: localValue }}
      {...restProps}
    >
      <View
        ref={trackContainerRef}
        style={[
          styles.trackContainer,
          length != null
            ? { width: length, height: Math.max(trackThickness, thumbHeight) }
            : { height: Math.max(trackThickness, thumbHeight) },
          style,
        ]}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.track,
            { height: trackThickness, borderRadius, backgroundColor: maximumTrackTintColor },
            trackStyle,
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.trackFill,
              { width: fillPercent, borderRadius, backgroundColor: minimumTrackTintColor },
            ]}
          />
        </View>

        {renderThumbComponent()}

        {showLabel && (
          <View
            pointerEvents="none"
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setLabelSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
            }}
            style={[styles.label, labelPositionStyle, labelStyle]}
          >
            <Text style={[styles.labelText, labelTextStyle]}>{formatLabel(localValue)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default Slider;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContainer: {
    justifyContent: 'center',
    minWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    left: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  label: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
});

