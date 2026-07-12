import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function Shimmer({ style }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.shimmerBase, style, animatedStyle]} />;
}

function VideoCardSkeleton() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.thumbnail} />
      <View style={styles.metaRow}>
        <Shimmer style={styles.avatar} />
        <View style={styles.textCol}>
          <Shimmer style={styles.titleLine} />
          <Shimmer style={[styles.subLine, { width: "60%" }]} />
          <Shimmer style={[styles.subLine, { width: "40%" }]} />
        </View>
      </View>
    </View>
  );
}

export default function ProgressRing({
  itemCount = 4,
  indicatorPosition = "center", // "top" | "center"
  color = "red",
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}

      <View
        style={[
          styles.indicatorWrap,
          indicatorPosition === "center"
            ? styles.indicatorCenter
            : styles.indicatorTop,
        ]}
        pointerEvents="none"
      >
        <ActivityIndicator size="large" color={color} />
        <Text style={styles.timerText}>{seconds}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  card: {
    marginBottom: 20,
  },
  thumbnail: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    borderRadius: 0,
  },
  metaRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
  },
  titleLine: {
    height: 14,
    width: "90%",
    borderRadius: 4,
    marginBottom: 8,
  },
  subLine: {
    height: 11,
    borderRadius: 4,
    marginBottom: 6,
  },
  shimmerBase: {
    backgroundColor: "#e2e2e2",
  },
  indicatorWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 6,
    gap: 6,
  },
  indicatorTop: {
    top: 0,
  },
  indicatorCenter: {
    top: "50%",
    marginTop: -14,
  },
  timerText: {
    fontSize: 12,
    color: "#666",
  },
});