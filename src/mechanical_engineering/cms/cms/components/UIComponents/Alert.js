// Alert/Alert.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const Alert = ({ icon, title, text, accent, accentBg }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.85}
      style={[styles.alertCard, { backgroundColor: accentBg || '#FFECEF' }]}
    >
      <View style={[styles.alertIconWrap, { backgroundColor: accentBg || '#FFECEF' }]}>
        <Text style={styles.alertIcon}>{icon}</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={[styles.alertTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.alertText}>{text}</Text>
      </View>
      <Text style={styles.alertArrow}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    marginHorizontal: 16,
    marginBottom: 5,
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  alertIcon: { fontSize: 22 },
  alertContent: { flex: 1 },
  alertTitle: {
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
  },
  alertText: {
    fontSize: 10,
    color: '#555',
    lineHeight: 12,
  },
  alertArrow: {
    fontSize: 24,
    color: '#bbb',
    marginLeft: 8,
  },
});

export default Alert;