import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Easing } from 'react-native';

/**
 * Single reusable Slider component - Inspired by @react-native-community/slider
 * Pass `horizontal` to switch orientation. Fully working with finger control.
 *
 * Both orientations share all value/step/animation math. The only things
 * that differ between orientations are: which page coordinate we read
 * (pageX vs pageY), which layout dimension we measure (width vs height),
 * and which transform axis moves the thumb (translateX vs translateY).
 * Everything else is orientation-agnostic.
 */
const Slider = ({
  // Value props
  value = 0,
  minimumValue = 0,
  maximumValue = 300,
  step = 1,

  // Orientation
  horizontal = false,

  // Styling
  length = 300, // main-axis size: height when vertical, width when horizontal
  trackThickness = 6, // cross-axis thickness of the track
  minimumTrackTintColor = '#4F46E5',
  maximumTrackTintColor = '#E5E7EB',
  thumbTintColor = '#4F46E5',
  thumbSize = 24,
  borderRadius = 3,

  // Thumb customization
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
  // Defaults: 'top' for vertical, 'left' for horizontal - pass your own to override.
  showLabel = false,
  labelPosition,
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
  const resolvedLabelPosition = labelPosition || (horizontal ? 'left' : 'top');

  const animatedValue = useRef(new Animated.Value(value)).current;
  const [localValue, setLocalValue] = useState(value);

  const [trackSize, setTrackSize] = useState(length);
  const trackSizeRef = useRef(length); // mirrors trackSize, read inside PanResponder callbacks
  const isAnimating = useRef(false);

  // Ref to the actual touchable view, so we can `measure()` its absolute
  // on-screen position - this is what avoids the "jump to 100%" / blink
  // bug that per-child-relative `locationX/Y` causes.
  const trackContainerRef = useRef(null);
  // Absolute page position of the start of the track (pageY for vertical,
  // pageX for horizontal). Single fixed reference point for all touch math.
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

  // Converts an absolute page coordinate into a value. Vertical inverts
  // the percent (top of track = max), horizontal doesn't (left = min).
  const getValueFromPageCoord = (pageCoord) => {
    const relative = pageCoord - trackPageOffsetRef.current;
    const clamped = Math.max(0, Math.min(relative, trackSizeRef.current));
    const percent = horizontal ? clamped / trackSizeRef.current : 1 - clamped / trackSizeRef.current;
    return roundToStep(percentToValue(percent));
  };

  const getValueFromEvent = (evt) =>
    getValueFromPageCoord(horizontal ? evt.nativeEvent.pageX : evt.nativeEvent.pageY);

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
    const measured = horizontal ? event.nativeEvent.layout.width : event.nativeEvent.layout.height;
    trackSizeRef.current = measured;
    setTrackSize((prev) => (prev !== measured ? measured : prev));

    // Re-measure absolute screen position on every layout change
    // (rotation, resize, parent re-layout) so the offset never goes stale.
    if (trackContainerRef.current) {
      trackContainerRef.current.measure((x, y, w, h, pageX, pageY) => {
        trackPageOffsetRef.current = horizontal ? pageX : pageY;
      });
    }
  };

  const thumbTranslate = animatedValue.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: horizontal
      ? [-thumbSize / 2, trackSize - thumbSize / 2]
      : [trackSize - thumbSize / 2, -thumbSize / 2],
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
    const transform = horizontal
      ? [{ translateX: thumbTranslate }, { translateY: -(thumbSize / 2) }]
      : [{ translateY: thumbTranslate }];

    return (
      <ThumbComponent
        source={thumbImage || undefined}
        // Thumb never eats touches meant for the track - keeps the touch
        // target simple regardless of child hit-testing quirks.
        pointerEvents="none"
        style={[
          horizontal ? styles.thumbHorizontal : styles.thumbVertical,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            marginLeft: horizontal ? undefined : -thumbSize / 2,
            backgroundColor: thumbImage ? undefined : thumbTintColor,
            transform,
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

  const labelPositionStyle = horizontal
    ? {
        top: '50%',
        transform: [{ translateY: -labelSize.height / 2 }],
        ...(resolvedLabelPosition === 'left'
          ? { left: -(labelSize.width + labelOffset) }
          : { right: -(labelSize.width + labelOffset) }),
      }
    : {
        left: '50%',
        transform: [{ translateX: -labelSize.width / 2 }],
        ...(resolvedLabelPosition === 'top'
          ? { top: -(labelSize.height + labelOffset) }
          : { bottom: -(labelSize.height + labelOffset) }),
      };

  return (
    <View
      style={[styles.container, containerStyle]}
      accessible
      accessibilityLabel={accessibilityLabel || (horizontal ? 'Horizontal Slider' : 'Vertical Slider')}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: localValue }}
      {...restProps}
    >
      <View
        ref={trackContainerRef}
        style={[
          horizontal ? styles.trackContainerHorizontal : styles.trackContainerVertical,
          horizontal
            ? { width: length, height: Math.max(trackThickness, thumbSize) }
            : { height: length, width: Math.max(trackThickness, thumbSize) },
          style,
        ]}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            horizontal ? styles.trackHorizontal : styles.trackVertical,
            horizontal
              ? { height: trackThickness, borderRadius, backgroundColor: maximumTrackTintColor }
              : { width: trackThickness, borderRadius, backgroundColor: maximumTrackTintColor },
            trackStyle,
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              horizontal ? styles.trackFillHorizontal : styles.trackFillVertical,
              horizontal
                ? { width: fillPercent, borderRadius, backgroundColor: minimumTrackTintColor }
                : { height: fillPercent, borderRadius, backgroundColor: minimumTrackTintColor },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContainerVertical: {
    alignItems: 'center',
  },
  trackContainerHorizontal: {
    justifyContent: 'center',
  },
  trackVertical: {
    height: '100%',
    overflow: 'hidden',
  },
  trackHorizontal: {
    width: '100%',
    overflow: 'hidden',
  },
  trackFillVertical: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  trackFillHorizontal: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  thumbVertical: {
    position: 'absolute',
    top: 0,
    left: '50%',
    borderWidth: 2,
    borderColor: 'white',
  },
  thumbHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  label: {
    position: 'absolute',
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width:30
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

// --- Examples -----------------------------------------------------------

export const SliderExample = () => {
  const [vValue, setVValue] = useState(0);
  const [hValue, setHValue] = useState(0);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Slider
        value={vValue}
        onValueChange={setVValue}
        minimumValue={0}
        maximumValue={300}
        step={1}
        length={300}
        trackThickness={6}
        thumbSize={24}
        showLabel
        labelPosition="top"
      />
      <Text style={{ marginTop: 20, fontSize: 16 }}>Vertical value: {vValue}</Text>

      <Slider
        horizontal
        value={hValue}
        onValueChange={setHValue}
        minimumValue={0}
        maximumValue={300}
        step={1}
        length={300}
        trackThickness={6}
        thumbSize={24}
        showLabel
        labelPosition="left"
      />
      <Text style={{ marginTop: 20, fontSize: 16 }}>Horizontal value: {hValue}</Text>
    </View>
  );
};