// Modal3DScreen.jsx
import React, { useEffect } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Model3DPreview from './glbPreview';

const Modal3DScreen = ({ navigation, route }) => {
  const params = route?.params || {};
  const modelUrl = params.modelUrl || params.url || params.uri;
  const title = params.title || '3D Model Preview';
  const soundUrl=params.soundUrl || null
  const subtitle = params.subtitle || '';
  const { width, height } = useWindowDimensions();
  
  const progress = useSharedValue(0);

  useEffect(() => {
    // Animate in when component mounts
    progress.value = withSpring(1, { 
      damping: 18, 
      stiffness: 170, 
      mass: 0.9 
    });
  }, []);

  const closeModal = () => {
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(navigation.goBack)();
        }
      }
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({ 
    opacity: progress.value 
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + progress.value * 0.06 },
      { translateY: (1 - progress.value) * 32 },
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={Platform.OS === 'ios'} animated />

      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={closeModal} 
        />
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        {/* 3D Model - Full Screen */}
        <View style={styles.modelContainer}>
          <Model3DPreview 
            modelUrl={modelUrl} 
            soundUrl={soundUrl}
            camPosition={[3, 3, 7]} 
            style={styles.modelPreview}
          />
        </View>

        {/* Header - Glassmorphism */}
        <View style={styles.headerContainer} pointerEvents="box-none">
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {title && (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
  

        {/* Model Info Badge */}
        <View style={styles.infoBadge} pointerEvents="none">
          <View style={styles.badgeContent}>
            <Text style={styles.badgeText}>● Interactive 3D</Text>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Drag to rotate</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default Modal3DScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  modelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modelPreview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  
  // Header Styles
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: Platform.OS === 'web' ? 'blur(20px)' : undefined,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Info Badge
  infoBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    zIndex: 5,
    alignItems: 'center',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : undefined,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  badgeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
  },
});