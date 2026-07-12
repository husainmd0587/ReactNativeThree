import React, { useRef, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';

import BlockRenderer from './components/BlockRenderer';

const { width } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Continuous animation components
const RotatingIcon = ({ children, duration = 3000 }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const PulsingStar = ({ children, duration = 2000 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: duration / 2, easing: Easing.ease }),
        withTiming(1, { duration: duration / 2, easing: Easing.ease })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration / 2 }),
        withTiming(0.6, { duration: duration / 2 })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const FloatingBadge = ({ children, style }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(translateY);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

const WorkshopHome = ({
  navigation,
  workshop = [],
  rootId,
  customCards = {},
  customComponents = {},
}) => {
  if (!workshop.length) {
    return null;
  }

  // Single workshop → skip the picker and render it directly
  if (workshop.length === 1) {
    const currentWorkshop = workshop[0];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gradientBg} />
        <Animated.ScrollView
          entering={FadeIn.duration(600)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <BlockRenderer
            blocks={currentWorkshop.blocks}
            rootBlocks={currentWorkshop.blocks}
            navigation={navigation}
            accent={currentWorkshop.accent}
            customCards={customCards}
            customComponents={customComponents}
          />
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradientBg} />
      <Animated.ScrollView
        entering={FadeIn.duration(600)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View 
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.heading}>Workshops</Text>
            <Text style={styles.subheading}>
              {workshop.length} available sessions
            </Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <RotatingIcon duration={4000}>
              <Text style={styles.filterText}>⚙️</Text>
            </RotatingIcon>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.grid}>
          {workshop.map((w, index) => (
            <WorkshopCard
              key={w.id}
              workshop={w}
              rootId={rootId}
              index={index}
              navigation={navigation}
            />
          ))}
        </View>

        <AnimatedTouchable 
          entering={FadeInUp.duration(600).delay(200 + workshop.length * 100)}
          style={styles.footer}
          onPress={() => {}}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const WorkshopCard = ({ workshop, index, navigation,rootId }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(glowOpacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 150,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  };

const handlePress = () => {
  if (isLoading) return;
  setIsLoading(true);
  navigation.navigate("ItemScreen", {
    item: workshop,
    rootBlocks: workshop.blocks,
    accent: workshop.accent,
    rootId,
    needToFetchBlock: true,
  });
  setIsLoading(false);
};

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(150 + index * 80)}
      style={styles.cardWrapper}
    >
      <AnimatedTouchable
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.cardWrapper,
          animatedStyle,
        ]}
        disabled={isLoading}
      >
        <Animated.View style={[styles.glowEffect, glowStyle]} />
        <ImageBackground
          source={{ uri: workshop.thumbnail }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay} />

          <View style={styles.topContent}>
            <FloatingBadge style={styles.typeBadge}>
              <View
                style={[
                  styles.typeBadgeInner,
                  { backgroundColor: workshop.accentBg || 'rgba(255,255,255,0.9)' },
                ]}
              >
                <View
                  style={[styles.typeDot, { backgroundColor: workshop.accent || '#333' }]}
                />
                <Text style={[styles.typeText, { color: workshop.accent || '#333' }]}>
                  {(workshop.type || 'workshop').toUpperCase()}
                </Text>
              </View>
            </FloatingBadge>
            
            <PulsingStar duration={2500}>
              <TouchableOpacity style={styles.bookmarkBtn}>
                <Text style={styles.bookmarkIcon}>★</Text>
              </TouchableOpacity>
            </PulsingStar>
          </View>

          <View style={styles.bottom}>
            <Animated.Text 
              entering={FadeInUp.duration(400).delay(300 + index * 80)}
              style={styles.cardTitle} 
              numberOfLines={2}
            >
              {workshop.title}
            </Animated.Text>

            <Animated.Text 
              entering={FadeInUp.duration(400).delay(300 + index * 80)}
              style={styles.cardSubTitle} 
              numberOfLines={2}
            >
              {workshop.subtitle}
            </Animated.Text>

            <Animated.View 
              entering={FadeInUp.duration(400).delay(350 + index * 80)}
              style={styles.metaRow}
            >
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱</Text>
                <Text style={styles.metaText}>30 min</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👤</Text>
                <Text style={styles.metaText}>Beginner</Text>
              </View>
            </Animated.View>

            <TouchableOpacity 
              onPress={handlePress}
              style={[
                styles.startBtn,
                { backgroundColor: workshop.accent || '#0B3A66',opacity:isLoading?0.6:1 }
              ]}
              disabled={isLoading}
            >
              <Text style={styles.startText}>
                {isLoading ? 'Loading...' : 'Start Workshop'}
              </Text>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <PulsingStar duration={1500}>
                  <Text style={styles.startArrow}>→</Text>
                </PulsingStar>
              )}
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </AnimatedTouchable>
    </Animated.View>
  );
};

export default WorkshopHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fe',
  },
  
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#e8edf5',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  content: {
    paddingBottom: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },

  headerLeft: {
    flex: 1,
  },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B3A66',
    letterSpacing: -0.5,
  },

  subheading: {
    fontSize: 14,
    color: '#6B7A8F',
    marginTop: 4,
    fontWeight: '500',
  },

  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 58, 102, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterText: {
    fontSize: 20,
  },

  grid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  cardWrapper: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },

  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    backgroundColor: 'rgba(11, 58, 102, 0.15)',
  },

  image: {
    height: 340,
    borderRadius: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  imageStyle: {
    borderRadius: 24,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 24,
  },

  topContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    zIndex: 1,
  },

  typeBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  typeBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  bookmarkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookmarkIcon: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: '700',
  },

  bottom: {
    padding: 20,
    paddingTop: 0,
    zIndex: 1,
  },

  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Oswald-Bold',
    marginBottom: 5,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  cardSubTitle: {
    color: '#dfdddd',
    fontSize: 15,
    fontFamily: 'Oswald-Regular',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaIcon: {
    fontSize: 14,
    marginRight: 4,
    color: 'rgba(255,255,255,0.9)',
  },

  metaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: '#0B3A66',
    shadowColor: '#0B3A66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 48,
  },

  startText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    marginRight: 8,
  },

  startArrow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    paddingVertical: 0,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 14,
    color: '#0B3A66',
    fontWeight: '600',
    opacity: 0.7,
  },
});
