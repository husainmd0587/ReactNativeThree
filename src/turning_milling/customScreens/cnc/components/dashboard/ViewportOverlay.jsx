import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ViewportOverlay({
  playing,
  onTogglePlay,
  onStop,
  onReset,
  onFullscreen,
  isFullscreen,
  viewMode = '3D',
  onChangeViewMode,
  showViewMenu,
}) {
  return (
    <>
      {/* Playback cluster: top-right */}
      <View style={styles.topRightStack}>
        <SideButton icon={playing ? '⏸' : '▶'} onPress={onTogglePlay} />
        <SideButton icon="■" color="#ef4444" onPress={onStop} />
        <SideButton icon="↺" color="#f5a524" onPress={onReset} />
      </View>

      {/* View-mode menu (3D/2D/CAM), only when toggled from the top bar - sits
          below the playback cluster so it never overlaps it. */}
      {showViewMenu ? (
        <View style={styles.viewToggle}>
          {['3D', '2D', 'CAM'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewBtn, viewMode === mode && styles.viewBtnActive]}
              onPress={() => onChangeViewMode?.(mode)}
            >
              <Text style={[styles.viewBtnText, viewMode === mode && styles.viewBtnTextActive]}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Fullscreen toggle: bottom-left, corner-bracket "[ ]" style icon */}
      <TouchableOpacity style={styles.fullscreenBtn} onPress={onFullscreen}>
        <FullscreenIcon inward={isFullscreen} />
      </TouchableOpacity>
    </>
  );
}

function SideButton({ icon, onPress, color = '#c7ccd4' }) {
  return (
    <TouchableOpacity style={styles.sideBtn} onPress={onPress}>
      <Text style={[styles.sideIcon, { color }]}>{icon}</Text>
    </TouchableOpacity>
  );
}

/** Classic "expand to fullscreen" icon: four corner brackets, built from plain Views. */
function FullscreenIcon({ size = 16, thickness = 2, color = '#5aa8ff', inward = false }) {
  const arm = size * 0.4;
  const corners = inward
    ? [
        { top: arm, left: arm },
        { top: arm, right: arm },
        { bottom: arm, left: arm },
        { bottom: arm, right: arm },
      ]
    : [{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }];

  return (
    <View style={{ width: size, height: size }}>
      {corners.map((pos, i) => {
        const isLeft = 'left' in pos;
        const isTop = 'top' in pos;
        return (
          <React.Fragment key={i}>
            <View
              style={{
                position: 'absolute',
                ...pos,
                width: arm,
                height: thickness,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                ...pos,
                width: thickness,
                height: arm,
                backgroundColor: color,
              }}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  topRightStack: { position: 'absolute', right: 8, top: 8, flexDirection: 'row', zIndex: 10 },
  sideBtn: {
    backgroundColor: 'rgba(20,22,26,0.85)',
    borderRadius: 7,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sideIcon: { fontSize: 12 },
  viewToggle: {
    position: 'absolute',
    right: 8,
    top: 44,
    flexDirection: 'row',
    backgroundColor: 'rgba(20,22,26,0.92)',
    borderRadius: 7,
    padding: 2,
    zIndex: 10,
  },
  viewBtn: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 5 },
  viewBtnActive: { backgroundColor: '#3b82f6' },
  viewBtnText: { color: '#8a919c', fontSize: 9, fontWeight: '700' },
  viewBtnTextActive: { color: '#fff' },
  fullscreenBtn: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: 'rgba(20,22,26,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
