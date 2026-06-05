import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar, SafeAreaView,
} from 'react-native';
import { SHAPES, MATERIALS } from './shapes';
import { SHAPE_PREVIEWS, SHAPE_ICONS } from './shapeIcon';
import { COLORS, RADIUS, SHADOW, FONT } from './theme';
import { addHistoryEntry, formatDate, buildShareText } from './storage';

export default function HomeScreen({ navigation }) {
  const [isGrid, setIsGrid] = useState(true);

  const openCalc = useCallback((shape) => {
    navigation.navigate('Calculator', { shapeId: shape.id });
  }, [navigation]);

  // ── Grid item ──────────────────────────────────────────────────────────────
  const GridItem = useCallback(({ item }) => {
    const Icon = SHAPE_ICONS[item.id];
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => openCalc(item)}
        activeOpacity={0.75}
      >
        <View style={styles.iconBox}>
          <Icon size={52} />
        </View>
        <Text style={styles.gridLabel}>{item.name}</Text>
      </TouchableOpacity>
    );
  }, [openCalc]);

  // ── List item ──────────────────────────────────────────────────────────────
  const ListItem = useCallback(({ item }) => {
    const Icon = SHAPE_ICONS[item.id];
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => openCalc(item)}
        activeOpacity={0.75}
      >
        <View style={styles.iconBoxSm}>
          <Icon size={44} />
        </View>
        <Text style={styles.listLabel}>{item.name}</Text>
        <Text style={styles.listDots}>⋮⋮</Text>
      </TouchableOpacity>
    );
  }, [openCalc]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Metal Calculator</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsGrid(g => !g)}>
            <Text style={styles.iconTxt}>{isGrid ? '≡' : '⊞'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('History')}>
            <Text style={styles.iconTxt}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconTxt}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Shape list / grid ── */}
      {isGrid ? (
        <FlatList
          data={SHAPES}
          keyExtractor={i => i.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <GridItem item={item} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={SHAPES}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => <ListItem item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: FONT.bold,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTxt: {
    fontSize: 22,
    color: COLORS.pink,
  },

  // ── Grid ──
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
    ...SHADOW.sm,
  },
  iconBox: {
    width: 72,
    height: 60,
    backgroundColor: COLORS.cyan,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: FONT.bold,
    color: COLORS.text,
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  // ── List ──
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 14,
    ...SHADOW.sm,
  },
  iconBoxSm: {
    width: 56,
    height: 48,
    backgroundColor: COLORS.cyan,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: FONT.bold,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  listDots: {
    fontSize: 16,
    color: COLORS.pink,
    letterSpacing: -2,
  },
});