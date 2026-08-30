import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Logo from '../../assets/images/icons/logo.png';

const Header = ({
  title,
  subtitle,
  drawerItems = [],
  onDrawerItemPress,
  drawerBottomItem,
  onDrawerBottomPress,
  navigation,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const drawerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerOpen) {
      setDrawerVisible(true);

      Animated.timing(drawerAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();

      return;
    }

    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDrawerVisible(false);
      }
    });
  }, [drawerOpen, drawerAnim]);

  const drawerTranslateX = useMemo(
    () =>
      drawerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-340, 0],
      }),
    [drawerAnim],
  );

  const backdropOpacity = useMemo(
    () =>
      drawerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [drawerAnim],
  );

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const handleDrawerPress = item => {
    closeDrawer();

    if (onDrawerItemPress) {
      onDrawerItemPress(item);
    }
  };

  const handleBottomPress = () => {
    closeDrawer();

    if (onDrawerBottomPress) {
      onDrawerBottomPress(drawerBottomItem);
    }
  };

  return (
    <>
      {/* ================= HEADER ================= */}

      <View style={s.header}>
        {/* LEFT */}

        <View style={s.sideSection}>
          <Pressable
            style={({ pressed }) => [
              s.menuButton,
              pressed && s.buttonPressed,
            ]}
            onPress={openDrawer}
            hitSlop={10}
          >
            <Text style={s.menuIcon}>☰</Text>
          </Pressable>
        </View>

        {/* CENTER */}

        <View style={s.brandSection}>
          <Image
            source={Logo}
            style={s.logo}
            resizeMode="contain"
          />

          <View style={s.titleContainer}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>

            {!!subtitle && (
              <Text style={s.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* RIGHT */}

        <View style={[s.sideSection, s.rightSection]}>
          <Pressable
            style={({ pressed }) => [
              s.iconButton,
              s.notificationButton,
              pressed && s.buttonPressed,
            ]}
            onPress={() => navigation?.navigate('Notification')}
            hitSlop={10}
          >
            <Text style={s.notificationIcon}>🔔</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              s.iconButton,
              s.profileButton,
              pressed && s.buttonPressed,
            ]}
            onPress={() => navigation?.navigate('Profile')}
            hitSlop={10}
          >
            <Text style={s.profileIcon}>👤</Text>
          </Pressable>
        </View>
      </View>

      {/* ================= DRAWER ================= */}

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
      >
        <View style={s.drawerLayer}>
          <Animated.View
            style={[
              s.drawerBackdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          />

          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
          />

          <Animated.View
            style={[
              s.drawerPanel,
              {
                transform: [
                  {
                    translateX: drawerTranslateX,
                  },
                ],
              },
            ]}
          >
            {/* DRAWER HEADER */}

            <View style={s.drawerHeader}>
              <View style={s.drawerBrand}>
                <Image
                  source={Logo}
                  style={s.drawerLogo}
                  resizeMode="contain"
                />

                <Text style={s.drawerTitle}>Menu</Text>
              </View>

              <Pressable
                style={s.drawerCloseButton}
                onPress={closeDrawer}
                hitSlop={10}
              >
                <Text style={s.drawerClose}>✕</Text>
              </Pressable>
            </View>

            {/* DRAWER ITEMS */}

            <ScrollView
              style={s.drawerBody}
              contentContainerStyle={s.drawerContent}
              showsVerticalScrollIndicator={false}
            >
              {drawerItems.map(item => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    s.drawerItem,
                    pressed && s.drawerItemPressed,
                  ]}
                  onPress={() => handleDrawerPress(item)}
                >
                  <View style={s.drawerEmojiContainer}>
                    <Text style={s.drawerItemEmoji}>
                      {item.emoji || '•'}
                    </Text>
                  </View>

                  <Text style={s.drawerItemLabel}>
                    {item.label}
                  </Text>

                  <Text style={s.drawerItemArrow}>›</Text>
                </Pressable>
              ))}

              {drawerBottomItem && (
                <Pressable
                  style={({ pressed }) => [
                    s.drawerItem,
                    s.drawerBottomItem,
                    pressed && s.drawerItemPressed,
                  ]}
                  onPress={handleBottomPress}
                >
                  <View style={s.drawerEmojiContainer}>
                    <Text style={s.drawerItemEmoji}>
                      {drawerBottomItem.emoji || '•'}
                    </Text>
                  </View>

                  <Text style={s.drawerItemLabel}>
                    {drawerBottomItem.label}
                  </Text>

                  <Text style={s.drawerItemArrow}>›</Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

export default Header;

const s = StyleSheet.create({
  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  /* Fixed width for side sections */
  sideSection: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    
  },

  rightSection: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 6,
    paddingRight: 4,
  },

  /* =====================================================
     MENU BUTTON
  ===================================================== */

  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },

  menuIcon: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
    color: '#000',
  },

  /* =====================================================
     CENTER BRAND
  ===================================================== */

  brandSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: 0,
    height:'100%',
    
  },

  logo: {
    width: 36,
    height: 36,
    marginRight: 2,
    flexShrink: 0,
  },

  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },

  title: {
    fontSize: 20,
    lineHeight: 21,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },

  subtitle: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: '#1709e2',
  },

  /* =====================================================
     RIGHT SECTION BUTTONS
  ===================================================== */

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  notificationButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  notificationIcon: {
    fontSize: 18,
  },

  profileButton: {
    backgroundColor: '#F0EFFE',
    borderColor: '#D6D3F8',
  },

  profileIcon: {
    fontSize: 19,
  },

  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },

  /* =====================================================
     DRAWER
  ===================================================== */

  drawerLayer: {
    flex: 1,
  },

  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
  },

  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '84%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    paddingTop: 48,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: {
      width: 6,
      height: 0,
    },
    elevation: 20,
  },

  /* =====================================================
     DRAWER HEADER
  ===================================================== */

  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  drawerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  drawerLogo: {
    width: 34,
    height: 34,
    marginRight: 10,
  },

  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  drawerCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },

  drawerClose: {
    fontSize: 18,
    color: '#4B5563',
  },

  /* =====================================================
     DRAWER BODY
  ===================================================== */

  drawerBody: {
    flex: 1,
  },

  drawerContent: {
    paddingBottom: 30,
  },

  drawerItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  drawerItemPressed: {
    backgroundColor: '#F5F4FF',
    borderColor: '#D8D5FA',
  },

  drawerEmojiContainer: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 9,
    backgroundColor: '#F3F2FE',
  },

  drawerItemEmoji: {
    fontSize: 17,
  },

  drawerItemLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1F2937',
  },

  drawerItemArrow: {
    marginLeft: 8,
    fontSize: 24,
    lineHeight: 25,
    color: '#9CA3AF',
  },

  drawerBottomItem: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
});