import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const Header = ({
  title,
  subtitle,
  showViewToggle = false,
  viewMode = 'grid',
  onToggleViewMode,
  drawerItems = [],
  onDrawerItemPress,
  drawerBottomItem,
  onDrawerBottomPress,
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
      if (finished) setDrawerVisible(false);
    });
  }, [drawerAnim, drawerOpen]);

  const drawerTranslateX = useMemo(
    () =>
      drawerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-320, 0],
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

  const handleDrawerPress = (item) => {
    closeDrawer();
    if (onDrawerItemPress) onDrawerItemPress(item);
  };

  const handleBottomPress = () => {
    closeDrawer();
    if (onDrawerBottomPress) onDrawerBottomPress(drawerBottomItem);
  };

  return (
    <>
      <View style={s.header}>
        <View>
          <Text style={s.title}>{title}</Text>
          {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </View>

        <View style={s.actionsRow}>
          {showViewToggle && (
            <Pressable style={s.iconBtn} onPress={onToggleViewMode} hitSlop={8}>
              <Text style={s.iconBtnText}>{viewMode === 'grid' ? '☰' : '▦'}</Text>
            </Pressable>
          )}
          <Pressable style={s.iconBtn} onPress={openDrawer} hitSlop={8}>
            <Text style={s.iconBtnText}>{drawerOpen ? '✕' : '☰'}</Text>
          </Pressable>
        </View>
      </View>

      {drawerVisible && (
        <View style={s.drawerLayer} pointerEvents="box-none">
          <Animated.View style={[s.drawerBackdrop, { opacity: backdropOpacity }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />

          <Animated.View style={[s.drawerPanel, { transform: [{ translateX: drawerTranslateX }] }]}>
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Menu</Text>
              <Pressable onPress={closeDrawer} hitSlop={8}>
                <Text style={s.drawerClose}>✕</Text>
              </Pressable>
            </View>

            <View style={s.drawerBody}>
              {drawerItems.map((item) => (
                <Pressable key={item.key} style={s.drawerItem} onPress={() => handleDrawerPress(item)}>
                  <Text style={s.drawerItemEmoji}>{item.emoji || '•'}</Text>
                  <Text style={s.drawerItemLabel}>{item.label}</Text>
                  <Text style={s.drawerItemArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
};

export default Header;

const s = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#7F77DD',
    fontWeight: '500',
    marginTop: 2,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    minWidth: 38,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEDFE',
    borderWidth: 1.5,
    borderColor: '#AFA9EC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconBtnText: { fontSize: 16, fontWeight: '700', color: '#534AB7' },

  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '86%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 14,
    shadowColor: '#020617',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 0 },
    elevation: 22,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 10,
  },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  drawerClose: { fontSize: 18, color: '#6B7280' },
  drawerBody: { flex: 1, justifyContent: 'flex-start', gap: 5 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  drawerItemEmoji: { fontSize: 16, marginRight: 12 },
  drawerItemLabel: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  drawerItemArrow: { fontSize: 16, color: '#9CA3AF' },
});
