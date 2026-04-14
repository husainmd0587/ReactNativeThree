import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';

const SectionHeader = ({ title, color }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
  </View>
);

const BulletItem = ({ text, color }) => (
  <View style={styles.bulletRow}>
    <View style={[styles.bulletDot, { backgroundColor: color }]} />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const SpecRow = ({ param, value, index }) => (
  <View style={[styles.specRow, { backgroundColor: index % 2 === 0 ? '#F8F9FA' : '#FFFFFF' }]}>
    <Text style={styles.specParam}>{param}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const TabButton = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    style={[styles.tabBtn, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabLabel, active && { color, fontWeight: '700' }]}>{label}</Text>
  </TouchableOpacity>
);

const HeroImage = ({ instrument, onBack }) => {
  const { color, name, categoryLabel, image } = instrument;

  if (!image) {
    return (
      <View style={[styles.heroBanner, { backgroundColor: color }]}>
        <TouchableOpacity
          style={styles.heroBackBtn}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.heroMeta}>
          <Text style={styles.heroCategoryLabel}>{categoryLabel}</Text>
          <Text style={styles.heroTitle}>{name}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.heroBackBtn}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Image
        source={typeof image === 'string' ? { uri: image } : image}
        style={styles.heroImage}
        resizeMode="cover"
      />

      <View style={[styles.heroMeta, { backgroundColor: color }]}>
        <Text style={styles.heroCategoryLabel}>{categoryLabel}</Text>
        <Text style={styles.heroTitle}>{name}</Text>
      </View>
    </View>
  );
};

const InstrumentDetailScreen = ({ route, navigation }) => {
  const { instrument } = route.params;
  const [tab, setTab] = useState('specs');
  const { color, lightColor } = instrument;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={color} translucent={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <HeroImage instrument={instrument} onBack={() => navigation.goBack()} />

        <View style={styles.body}>
          {instrument.images && instrument.images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
              style={styles.thumbScrollView}
            >
              {instrument.images.map((src, i) => (
                <Image
                  key={i}
                  source={typeof src === 'string' ? { uri: src } : src}
                  style={[styles.thumb, { borderColor: color }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={[styles.descCard, { borderLeftColor: color }]}>
            <Text style={styles.descText}>{instrument.description}</Text>
          </View>

          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: lightColor }]}>
              <Text style={[styles.pillLabel, { color }]}>Accuracy</Text>
              <Text style={[styles.pillValue, { color }]}>{instrument.accuracy}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: lightColor }]}>
              <Text style={[styles.pillLabel, { color }]}>Standard</Text>
              <Text style={[styles.pillValue, { color }]}>{instrument.standard}</Text>
            </View>
          </View>

          <View style={styles.tabBar}>
            <TabButton label="Specifications" active={tab === 'specs'} color={color} onPress={() => setTab('specs')} />
            <TabButton label="Use Cases" active={tab === 'usecases'} color={color} onPress={() => setTab('usecases')} />
            <TabButton label="Applications" active={tab === 'applications'} color={color} onPress={() => setTab('applications')} />
          </View>

          <View style={styles.tabContent}>
            {tab === 'specs' && (
              <View>
                <View style={[styles.specTableHead, { backgroundColor: color }]}>
                  <Text style={styles.specHeadText}>Parameter</Text>
                  <Text style={styles.specHeadText}>Specification</Text>
                </View>
                {instrument.specs.map((s, i) => (
                  <SpecRow key={i} param={s.param} value={s.value} index={i} />
                ))}
              </View>
            )}
            {tab === 'usecases' && (
              <View style={styles.section}>
                <SectionHeader title="Common Use Cases" color={color} />
                {instrument.useCases.map((u, i) => <BulletItem key={i} text={u} color={color} />)}
              </View>
            )}
            {tab === 'applications' && (
              <View style={styles.section}>
                <SectionHeader title="Industry Applications" color={color} />
                {instrument.applications.map((a, i) => <BulletItem key={i} text={a} color={color} />)}
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },

  heroImage: { width: '100%', height: 240 },
  heroBanner: {
    height: 180,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 12,
    paddingHorizontal: 16,
  },

  // KEY FIX: center both axes, remove any padding that offset the glyph
  heroBackBtn: {
    position: 'absolute',
    top: 15,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backArrow: {
    fontSize: 20,
    color: '#000',
    fontWeight: '700',
    lineHeight: 22,    // match fontSize to prevent vertical drift
    includeFontPadding: false,  // Android: strips extra font padding
    textAlignVertical: 'center', // Android: vertical centering for Text
  },

  heroMeta: { paddingHorizontal: 18, paddingVertical: 14 },
  heroCategoryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },

  body: { padding: 16 },

  thumbScrollView: { marginBottom: 14 },
  thumbStrip: { gap: 10, paddingRight: 4 },
  thumb: { width: 80, height: 60, borderRadius: 8, borderWidth: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  descCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descText: { fontSize: 14, color: '#4A5568', lineHeight: 22 },

  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  pillLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  pillValue: { fontSize: 14, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 12, color: '#718096', fontWeight: '500' },

  tabContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  specTableHead: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  specHeadText: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  specRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0' },
  specParam: { flex: 1, fontSize: 12, color: '#4A5568', fontWeight: '600', paddingRight: 8 },
  specValue: { flex: 1, fontSize: 12, color: '#2D3748', textAlign: 'right' },

  section: { padding: 14 },
  sectionHeader: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 12 },
  sectionHeaderText: { fontSize: 14, fontWeight: '700' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, marginRight: 10, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 20 },
});

export default InstrumentDetailScreen;