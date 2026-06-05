import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Share, Alert, SafeAreaView, StatusBar,
} from 'react-native';
import { SHAPE_ICONS } from '../components/ShapeIcons';
import { COLORS, RADIUS, SHADOW, FONT } from '../utils/theme';
import {
  loadHistory, deleteHistoryEntry, clearAllHistory, buildShareText,
} from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const handleDelete = useCallback(async (id) => {
    const updated = await deleteHistoryEntry(id);
    setHistory(updated);
  }, []);

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Delete all saved calculations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            const updated = await clearAllHistory();
            setHistory(updated);
          },
        },
      ]
    );
  }, []);

  const handleShareAll = useCallback(async () => {
    if (!history.length) return;
    const text = history.map(e => buildShareText(e)).join('\n\n═══════════════\n\n');
    await Share.share({ message: text });
  }, [history]);

  const handleShareOne = useCallback(async (entry) => {
    const text = buildShareText(entry);
    await Share.share({ message: text });
  }, []);

  const renderItem = useCallback(({ item }) => {
    const Icon = SHAPE_ICONS[item.shapeId] || SHAPE_ICONS['hexagon'];
    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.histIcon}>
            <Icon size={36} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>
              {item.shapeName.charAt(0) + item.shapeName.slice(1).toLowerCase()}
            </Text>
            <Text style={styles.cardSub}>{item.shapeName} · {item.material}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.xBtn}>
            <Text style={styles.xTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Dimensions */}
        {item.dims.filter(d => d.value && !['pieces', 'kgPrice'].includes(d.id)).map((d, i) => (
          <Text key={i} style={styles.dimRow}>
            {d.label} : {d.value}{d.unit || 'mm'}
          </Text>
        ))}

        {/* Results */}
        <View style={styles.resultBox}>
          <View style={styles.resRow}>
            <Text style={styles.resLabel}>Piece Weight :</Text>
            <Text style={styles.resVal}>{item.weight} kg</Text>
          </View>
          <View style={styles.resRow}>
            <Text style={styles.resLabel}>Paint area :</Text>
            <Text style={styles.resVal}>{item.area} m²</Text>
          </View>
          {item.total && (
            <View style={styles.resRow}>
              <Text style={styles.resLabel}>Total :</Text>
              <Text style={styles.resVal}>{item.total}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateStr}>{item.date}</Text>
          <TouchableOpacity onPress={() => handleShareOne(item)} style={styles.shareBtn}>
            <Text style={styles.shareTxt}>Share ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleDelete, handleShareOne]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Last Calcs</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShareAll}>
          <Text style={styles.iconTxt}>↗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleClear}>
          <Text style={[styles.iconTxt, { color: COLORS.danger }]}>🗑</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No calculations yet</Text>
          <Text style={styles.emptyBody}>
            Run a calculation and tap 💾 to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 4,
  },
  backBtn: { padding: 6 },
  backTxt: { fontSize: 28, color: COLORS.text, lineHeight: 32 },
  title: { flex: 1, fontSize: 22, fontWeight: FONT.bold, color: COLORS.text, marginLeft: 4 },
  iconBtn: { padding: 6 },
  iconTxt: { fontSize: 20, color: COLORS.pink },
  list: { padding: 16, gap: 14 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  histIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: COLORS.resultBg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: FONT.bold, color: COLORS.text },
  cardSub:   { fontSize: 12, color: COLORS.text2, marginTop: 2 },
  xBtn: { padding: 4 },
  xTxt: { fontSize: 16, color: COLORS.pink },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
  dimRow: { fontSize: 13, color: COLORS.text, marginBottom: 4 },

  resultBox: {
    backgroundColor: COLORS.histResultBg,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  resRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resLabel: { fontSize: 13, color: COLORS.text2 },
  resVal:   { fontSize: 13, fontWeight: FONT.semibold, color: COLORS.text },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  dateStr:  { fontSize: 12, color: COLORS.pink },
  shareBtn: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: COLORS.cyanLight, borderRadius: RADIUS.full },
  shareTxt: { fontSize: 12, color: COLORS.cyanDark, fontWeight: FONT.semibold },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 17, fontWeight: FONT.bold, color: COLORS.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22 },
});