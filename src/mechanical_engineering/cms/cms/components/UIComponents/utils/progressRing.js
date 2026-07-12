import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";

const DEFAULT_THEME = {
  track: "#E6E6E6",
  inProgress: "#D9534F",
  complete: "#4CAF50",
  empty: "#BDBDBD",
  label: undefined,
};

function createArcPath(cx, cy, radius, progress) {
  const path = Skia.Path.Make();

  if (progress <= 0) return path;

  const rect = Skia.XYWHRect(
    cx - radius,
    cy - radius,
    radius * 2,
    radius * 2
  );

  path.addArc(rect, -90, (progress / 100) * 360);

  return path;
}

const ProgressRing = ({
  progress = 0,
  size =35,
  strokeWidth = 3,
  theme = {},
  showLabel = true,
  formatLabel = (value) => `${Math.round(value)}%`,
}) => {
  const colors = { ...DEFAULT_THEME, ...theme };

  const value = Math.max(0, Math.min(progress, 100));

  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;

  const ringColor =
    value >= 100
      ? colors.complete
      : value > 0
      ? colors.inProgress
      : colors.empty;

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    const rect = Skia.XYWHRect(
      center - radius,
      center - radius,
      radius * 2,
      radius * 2
    );
    path.addArc(rect, 0, 360);
    return path;
  }, [center, radius]);

  const progressPath = useMemo(
    () => createArcPath(center, center, radius, value),
    [center, radius, value]
  );

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: value,
      }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          color={colors.track}
        />

        {value > 0 && (
          <Path
            path={progressPath}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            color={ringColor}
          />
        )}
      </Canvas>

      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: Math.max(8, size * 0.22),
              color: colors.label ?? ringColor,
            },
          ]}
        >
          {formatLabel(value)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontWeight: "700",
    textAlign: "center",
  },
});

export default React.memo(ProgressRing);