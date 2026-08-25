// SplashScreenBranded.js - Using View with Image
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(1)).current;
  const textScale = useRef(new Animated.Value(0.5)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start circle animation
    Animated.sequence([
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(circleOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        delay: 500,
      }),
    ]).start();

    // Fade in text
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        delay: 300,
      }),
      Animated.timing(textScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        delay: 300,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();

    // Rotate ring
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Animate loading bar
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: true,
    }).start();

    // Auto-transition after animation
    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const rotateInterpolate = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/bg/splash.png')}
        style={styles.backgroundImage}
        resizeMode="stretch"
      />
      
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Animated Circle */}
          <Animated.View
            style={[
              styles.circleContainer,
              {
                opacity: circleOpacity,
                transform: [{ scale: circleScale }],
              },
            ]}
          >
            <View style={styles.circleInner}>
              <Animated.View
                style={[
                  styles.ring,
                  {
                    transform: [{ rotate: rotateInterpolate }],
                  },
                ]}
              >
                <View style={styles.ringPath} />
              </Animated.View>
              <Text style={styles.circleEmoji}>⚙️</Text>
            </View>
          </Animated.View>

          {/* Brand Text */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ scale: textScale }],
              },
            ]}
          >
            <Text style={styles.brandText}>ME Studio</Text>
            <Text style={styles.tagline}>Mechanical Engineering</Text>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingFill,
                  {
                    transform: [
                      {
                        scaleX: loadingProgress,
                      },
                    ],
                  },
                ]}
              />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A2E',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  content: {
    marginBottom:20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  circleContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ring: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  ringPath: {
    width: '100%',
    height: '100%',
    borderRadius: 85,
  },
  circleEmoji: {
    fontSize: 60,
  },
  textContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingBar: {
    width: width * 0.5,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{ scaleX: 0 }],
  },
});

export default SplashScreen;