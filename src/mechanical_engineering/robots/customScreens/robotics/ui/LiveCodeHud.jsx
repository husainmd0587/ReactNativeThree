/**
 * LiveCodeHud.jsx
 *
 * Shows the currently-loaded program floating over the 3D canvas in
 * program mode - very small monospace font, semi-transparent panel (the
 * model stays visible through it), only the active line gets a
 * different (opaque-ish) background. This is ALWAYS read-only - there
 * is no edit mode here at all, on purpose. Editing now lives
 * exclusively in ProgramEditorScreen (a separate, full-height, no-3D
 * screen); this HUD's only job is to show what's executing.
 *
 * The active-line highlight logic (a single Reanimated bar that slides
 * to position rather than restyling each row) is carried over from the
 * old RobotProgramEditor's CodeViewer, just restyled for transparency
 * and a much smaller font since this now floats over the model instead
 * of taking a fixed opaque panel's worth of screen height.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS, SPACING, RADII, FONT_SIZE } from '../core/theme';

const LINE_HEIGHT = 16;

export function LiveCodeHud({ text, activeLine, errorLines = new Set() }) {
  const scrollRef = useRef(null);
  const lines = (text || '').split('\n');

  const highlightTop = useSharedValue(0);
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (!activeLine) {
      highlightOpacity.value = withTiming(0, { duration: 150 });
      return;
    }
    highlightTop.value = withTiming((activeLine - 1) * LINE_HEIGHT, { duration: 160 });
    highlightOpacity.value = withTiming(1, { duration: 150 });

    if (scrollRef.current) {
      const y = Math.max(0, (activeLine - 1) * LINE_HEIGHT - LINE_HEIGHT * 3);
      scrollRef.current.scrollTo({ y, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLine]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: highlightTop.value }],
    opacity: highlightOpacity.value,
  }));

  if (!text) return null;

  return (
    <View style={styles.panel} pointerEvents="none">
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={{ height: lines.length * LINE_HEIGHT }}>
          <Animated.View style={[styles.highlightBar, highlightStyle]} />

          {lines.map((line, i) => {
            const lineNumber = i + 1;
            const isError = errorLines.has(lineNumber);
            return (
              <View key={i} style={[styles.line, isError && styles.lineError]}>
                <Text style={styles.lineNumber}>{lineNumber}</Text>
                <Text style={styles.lineText}>{line || ' '}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 130,
    backgroundColor: COLORS.overlay,
    borderRadius: RADII.md,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    backgroundColor: COLORS.accentSoft,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LINE_HEIGHT,
    paddingHorizontal: SPACING.sm,
  },
  lineError: {
    backgroundColor: COLORS.dangerSoft,
  },
  lineNumber: {
    width: 18,
    color: 'rgba(170,178,197,0.5)',
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.xxs - 1,
  },
  lineText: {
    color: 'rgba(245,247,250,0.92)',
    fontFamily: 'monospace',
    fontSize: FONT_SIZE.xxs,
  },
});
