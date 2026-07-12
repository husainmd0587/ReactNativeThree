import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

const Arrow = ({
  delay = 0,
  size,
  color = "#1976D2",
  inactiveColor = "#BDBDBD",
  duration = 500,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0, { duration })
        ),
        -1,
        false
      );
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, color]
    ),
  }));

  return (
    <Animated.Text
      style={[
        {
          fontSize: size,
          fontWeight: "600",
        },
        style,
      ]}
    >
      ❯
    </Animated.Text>
  );
};

const AnimatedArrow = ({
  size = 16,
  color = "#1976D2",
  inactiveColor = "#BDBDBD",
  count = 3,
  delay = 150,
  duration = 700,
}) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: count }).map((_, index) => (
        <Arrow
          key={index}
          size={size}
          color={color}
          inactiveColor={inactiveColor}
          delay={index * delay}
          duration={duration}
        />
      ))}
    </View>
  );
};

export default React.memo(AnimatedArrow);