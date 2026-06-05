import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SHADOW, FONT } from '../utils/theme';
import { loadSettings, saveSettings } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

const CURRENCIES = [
  { label: 'None', value: '' },
  { label: '₹  Indian Rupee (INR)', value: '₹' },
  { label: '$  US Dollar (USD)',     value: '$' },
  { label: '€  Euro (EUR)',         value: '€' },
  { label: '£  British Pound (GBP)',value: '£' },
  { label: '¥  Japanese Yen (JPY)', value: '¥' },
  { label: '﷼  Saudi Riyal (SAR)',  value: '﷼' },
  { label: 'AED UAE Dirham',        value: 'AED' },
];

function RadioGroup({ value, options, onChange }) {
  return (
    <View style={styles.radioRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={styles.radioOpt}
          onPress={() => onChange(opt.value)}
        >
          <View style={[styles.radioCircle, value === opt.value && styles.radioCircleActive]}>
            {value === opt.value && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [showCurrPicker, setShowCurrPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );

  const update = useCallback(async (key, val) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      saveSettings(next);
      return next;
    });
  }, []);

  if (!settings) return null;

  const currLabel = CURRENCIES.find(c => c.value === settings.currency)?.label || 'Not selected';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('History')}>
          <Text style={styles.iconTxt}>↺</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Unit System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit System</Text>
          <Text style={styles.sectionDesc}>Choose the default measurement system for calculator screens.</Text>
          <RadioGroup
            value={settings.unitSystem}
            options={[
              { label: 'Metric (mm, cm, kg)', value: 'metric' },
              { label: 'Imperial (in, ft, lb)', value: 'imperial' },
            ]}
            onChange={v => update('unitSystem', v)}
          />
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Text style={styles.sectionDesc}>Light is the current default. Dark applies across the app.</Text>
          <RadioGroup
            value={settings.theme}
            options={[
              { label: 'Light Theme', value: 'light' },
              { label: 'Dark Theme',  value: 'dark' },
            ]}
            onChange={v => update('theme', v)}
          />
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <Text style={styles.sectionDesc}>Optional. Leave blank if you do not want a currency shown with prices.</Text>
          <TouchableOpacity
            style={styles.currRow}
            onPress={() => setShowCurrPicker(v => !v)}
          >
            <Text style={styles.currLeft}>Select Currency</Text>
            <Text style={styles.currRight}>
              {settings.currency ? settings.currency : 'Not selected'}
            </Text>
          </TouchableOpacity>
          {showCurrPicker && (
            <View style={styles.currDropdown}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.currOpt, settings.currency === c.value && styles.currOptActive]}
                  onPress={() => { update('currency', c.value); setShowCurrPicker(false); }}
                >
                  <Text style={[styles.currOptTxt, settings.currency === c.value && styles.currOptTxtActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Links */}
        <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Disclaimer', 'This app is for reference only. Results are approximate and should be verified by a qualified engineer before use.')}>
          <Text style={styles.linkIcon}>ℹ</Text>
          <Text style={styles.linkTxt}>Disclaimer</Text>
          <Text style={styles.linkChev}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('Privacy Policy', 'This app does not collect, transmit or share any personal data. All calculations are performed locally on your device.')}>
          <Text style={styles.linkIcon}>🛡</Text>
          <Text style={styles.linkTxt}>Privacy Policy</Text>
          <Text style={styles.linkChev}>›</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Metal Calculator v1.0.0</Text>
      </ScrollView>
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
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 10,
    ...SHADOW.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: FONT.bold, color: COLORS.cyanDark },
  sectionDesc:  { fontSize: 12, color: COLORS.text2, lineHeight: 18 },

  radioRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  radioOpt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: COLORS.cyan },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.cyan },
  radioLabel: { fontSize: 13, color: COLORS.text },

  currRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
  },
  currLeft:  { fontSize: 13, color: COLORS.text },
  currRight: { fontSize: 13, color: COLORS.cyan, fontWeight: FONT.medium },
  currDropdown: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card, overflow: 'hidden',
    ...SHADOW.md,
  },
  currOpt: { paddingHorizontal: 16, paddingVertical: 11 },
  currOptActive: { backgroundColor: COLORS.cyanLight },
  currOptTxt: { fontSize: 13, color: COLORS.text },
  currOptTxtActive: { color: COLORS.cyanDark, fontWeight: FONT.semibold },

  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, ...SHADOW.sm,
  },
  linkIcon: { fontSize: 18 },
  linkTxt:  { flex: 1, fontSize: 14, color: COLORS.text },
  linkChev: { fontSize: 18, color: COLORS.text3 },

  version: { textAlign: 'center', fontSize: 12, color: COLORS.text3, marginTop: 8 },
});