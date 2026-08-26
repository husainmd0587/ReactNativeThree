import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Reused for Extrude direction (+/−), Revolve direction (CW/CCW), and
// Subtract's target/tool order — anywhere a command needs one of a small
// fixed set of choices rather than a numeric value (that's
// DistanceControl's job instead).
export default function OptionToggle({
  label, options, value, onChange, dark = false,
}) {
  const theme = dark ? darkTheme : lightTheme;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.label }]}>{label}</Text>
      <View style={styles.options}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.8}
              style={[
                styles.btn,
                { borderColor: theme.border },
                active && { backgroundColor: theme.activeBg, borderColor: theme.activeBorder },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.text }, active && { color: theme.activeText }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const lightTheme = {
  label: '#6B6B78', border: '#E8E6F0', text: '#6B6B78', activeBg: '#E7F3FA', activeBorder: '#BFE0F2', activeText: '#1D6FA5',
};
const darkTheme = {
  label: '#9A9AA6', border: '#3A3A42', text: '#9A9AA6', activeBg: '#1E3A52', activeBorder: '#3E6E96', activeText: '#5CA9E0',
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap',
  },
  label: { fontSize: 12, fontWeight: '700' },
  options: { flexDirection: 'row', gap: 6 },
  btn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  btnText: { fontSize: 12, fontWeight: '700' },
});
