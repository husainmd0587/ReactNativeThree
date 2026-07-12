// Workshop3DModal.jsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, BackHandler,
  useWindowDimensions, Platform, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing,
} from 'react-native-reanimated';
import Model3DPreview from '../../../../../utils/components/glbPreview';
import { usePortal, usePortalKey } from '../../../../../utils/ThreeJs_Utils/portal'

const ACCENT = '#F59E0B';
const BG = '#0f1012';
const SURFACE = '#1a1b1e';
const BORDER = '#2c2d30';
const TEXT = '#f0f2f5';
const MUTED = '#9aa1b0';
const CARD_HEIGHT = 250;

const Workshop3DModal = ({ title, subtitle, modelUrl }) => {
  const [mounted, setMounted] = useState(false);
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const { addPortal, removePortal } = usePortal();
  const portalKey = usePortalKey('workshop3d');
 console.log('Render 3D Modal:', title, modelUrl?.slice(-20));
  const closeModal = useCallback(() => {
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      }
    );
  }, [progress]);

  const openModal = useCallback(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      progress.value = withSpring(1, { damping: 18, stiffness: 170, mass: 0.9 });
    }
  }, [mounted, progress]);

  useEffect(() => {
    if (!mounted) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeModal();
      return true;
    });
    return () => sub.remove();
  }, [mounted, closeModal]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + progress.value * 0.06 },
      { translateY: (1 - progress.value) * 32 },
    ],
  }));

  // ── Push / remove the fullscreen overlay in the app-root portal ─────────
  useEffect(() => {
    if (!mounted) {
      removePortal(portalKey);
      return undefined;
    }

    addPortal(
      portalKey,
      <View style={[styles.modalRoot, { width, height }]} pointerEvents="box-none">
        <StatusBar hidden={Platform.OS === 'ios'} animated />

        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { width, height }, sheetStyle]}>
          {/* 3D Model - Full screen */}
          <View style={styles.sheetCanvas}>
            <Model3DPreview modelUrl={modelUrl} camPosition={[3, 3, 7]} />
          </View>

          {/* Header - Absolute positioned on top */}
          <View style={[styles.sheetHeader, styles.transparentHeader]} pointerEvents="box-none">
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                {!!title && <Text style={styles.sheetTitle} numberOfLines={1}>{title}</Text>}
                {!!subtitle && <Text style={styles.sheetSubtitle} numberOfLines={1}>{subtitle}</Text>}
              </View>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={closeModal} 
                activeOpacity={0.7}
                pointerEvents="auto"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    );

    // cleanup on unmount while still open (e.g. navigating away)
    return () => removePortal(portalKey);
    // backdropStyle/sheetStyle are stable animated-style objects; safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, width, height, title, subtitle, modelUrl, portalKey, addPortal, removePortal, closeModal]);

  return (
    <View style={styles.card}>
      {mounted ? (
        <View style={[styles.cardCanvas, styles.cardPlaceholder]}>
          <Text style={styles.placeholderIcon}>◈</Text>
        </View>
      ) : (
        <Model3DPreview modelUrl={modelUrl} camPosition={[2, 2, 5]} style={styles.cardCanvas} />
      )}

      <View style={styles.cardOverlay} pointerEvents="box-none">
        {(title || subtitle) && (
          <View style={styles.textBlock} pointerEvents="none">
            {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
          </View>
        )}

        <TouchableOpacity
          style={styles.expandBtn}
          onPress={openModal}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.expandIcon}>⛶</Text>
          <Text style={styles.expandLabel}>View in 3D</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default React.memo(Workshop3DModal);

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    marginVertical: 8,
  },
  cardCanvas: { ...StyleSheet.absoluteFillObject },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE },
  placeholderIcon: { fontSize: 32, color: MUTED },
  cardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 12 },
  textBlock: { maxWidth: '75%' },
  title: {
    fontSize: 14, fontWeight: '700', color: TEXT,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 11, color: MUTED, marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  expandBtn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)',
  },
  expandIcon: { fontSize: 13, color: ACCENT },
  expandLabel: { fontSize: 11, fontWeight: '700', color: TEXT },

  modalRoot: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    zIndex: 18, 
    elevation: 24 
  },
  backdrop: { 
    backgroundColor: 'rgba(0,0,0,0.85)' 
  },
  sheet: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  sheetCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  transparentHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContent: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 18, 
    paddingBottom: 14,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: Platform.OS === 'web' ? 'blur(20px)' : undefined,
  },
  sheetTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sheetSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeBtn: {
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeIcon: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fd0c0c' 
  },
});