import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  Dimensions,
  StyleSheet,
  Animated
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const PADDING_H = 5;   // matches carouselContainer paddingHorizontal
const GAP = 10;         // matches carouselContainer gap
const DEFAULT_AUTOPLAY_INTERVAL = 3000;

const Dot = ({ isActive, activeColor, inactiveColor }) => {
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      useNativeDriver: false, // width/backgroundColor aren't supported by native driver
    }).start();
  }, [isActive, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 18],
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });
  return <Animated.View style={[styles.dot, { width, backgroundColor }]} />;
};


const Carousel = ({
  items = [],
  caroselConfig = {},
  onItemPress,
  activeDotColor = '#FFFFFF',
  inactiveDotColor = 'rgba(255,255,255,0.4)',
  autoplayInterval = DEFAULT_AUTOPLAY_INTERVAL,
}) => {
  const {
    animate = false,
    itemPerPage = 3,
    loop = false,
    slidingSide = 'leftToRight', // 'leftToRight' = autoplay advances forward through items
  } = caroselConfig;

  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const timerRef = useRef(null);
  const activeIndexRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [containerW, setContainerW] = useState(0);

  const itemCount = items?.length ?? 0;
  const maxIndex = Math.max(itemCount - 1, 0);

  // Card width driven by itemPerPage from config, not a hardcoded constant
 const CARD_W = (SCREEN_W - PADDING_H * 2 - GAP * (Math.max(itemPerPage, 1) - 1)) /Math.max(itemPerPage, 1);

 const SNAP_INTERVAL = CARD_W + GAP;
const aspectRatio =
  itemPerPage <= 1 ? 16 / 9 :
  itemPerPage === 2 ? 4 / 3 :
  1; // itemPerPage >= 3

  const CARD_H = caroselConfig.cardHeight ?? CARD_W / aspectRatio;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const scrollToIndex = useCallback(
    (index, animated = true) => {
      scrollRef.current?.scrollTo({ x: index * SNAP_INTERVAL, y: 0, animated });
    },
    [SNAP_INTERVAL],
  );

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const maxOffsetX = Math.max(contentW - containerW, 0);

    // Near the true end, force the last dot active — there may not be
    // enough scrollable width left to ever reach the "ideal" snap offset
    // for the last item when several cards are visible per page.
    if (maxOffsetX > 0 && offsetX >= maxOffsetX - 2) {
      if (activeIndex !== maxIndex) setActiveIndex(maxIndex);
      return;
    }

    const index = Math.round(offsetX / SNAP_INTERVAL);
    const clamped = Math.min(Math.max(index, 0), maxIndex);
    if (clamped !== activeIndex) setActiveIndex(clamped);
  };

  // ── Autoplay (only when animate=true and there's more than one page) ──
  useEffect(() => {
    if (!animate || itemCount <= itemPerPage) return;

    timerRef.current = setInterval(() => {
      if (isDragging.current) return;

      const current = activeIndexRef.current;
      const direction = slidingSide === 'rightToLeft' ? -1 : 1;
      let next = current + direction;

      if (next > maxIndex) next = loop ? 0 : maxIndex;
      else if (next < 0) next = loop ? maxIndex : 0;

      if (next !== current) {
        scrollToIndex(next);
        setActiveIndex(next);
      }
    }, autoplayInterval);

    return () => clearInterval(timerRef.current);
  }, [animate, itemCount, itemPerPage, loop, slidingSide, maxIndex, autoplayInterval, scrollToIndex]);

  const pauseAutoplay = () => {
    isDragging.current = true;
  };
  const resumeAutoplay = () => {
    isDragging.current = false;
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
        onScrollBeginDrag={pauseAutoplay}
        onScrollEndDrag={resumeAutoplay}
        onMomentumScrollEnd={resumeAutoplay}
        onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentW(w)}
      >
        {items.map((item, index) => (
       <TouchableOpacity
          key={item.id || index}
          style={[styles.carouselCard, { width: CARD_W, height: CARD_H }]}
          activeOpacity={0.88}
          onPress={() => onItemPress?.(item, index)}
                >
            <Image source={{ uri: item.thumbnail }} style={styles.carouselImage} />
            <View style={styles.carouselOverlay} />
            <View style={styles.carouselBody}>
              <Text style={styles.carouselTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.carouselSub} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

  {itemCount > 1 && (
  <View style={styles.dotsContainer}>
    {items.map((item, index) => (
      <Dot
        key={item.id || `dot-${index}`}
        isActive={index === activeIndex}
        activeColor={activeDotColor}
        inactiveColor={inactiveDotColor}
      />
    ))}
  </View>
)}
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    paddingHorizontal: PADDING_H,
    paddingBottom: 3,
    gap: GAP,
    marginTop: 10,
  },
  carouselCard: {
    borderRadius: 16,
    overflow: 'hidden',
    // height: 120,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  carouselBody: {
    position: 'absolute',
    bottom: 8,
    left: 6,
    right: 6,
  },
  carouselTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  carouselSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    gap:6
  },
  dot: {
    height: 6,
    borderRadius: 4,
  },
});

export default Carousel;