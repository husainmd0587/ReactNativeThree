import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const LINE_HEIGHT = 22;

export default function LiveGCodePanel({ gcode, activeLine }) {
  const lines = gcode.split('\n');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (activeLine == null || !scrollRef.current) return;
    // Keep the active line roughly centered in the viewport.
    const y = Math.max(0, (activeLine - 3) * LINE_HEIGHT);
    scrollRef.current.scrollTo({ y, animated: true });
  }, [activeLine]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>LIVE G-CODE</Text>
        <Text style={styles.lineIndicator}>
          LINE: <Text style={styles.lineNum}>{activeLine ?? '—'}</Text> / {lines.length}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lines.map((line, i) => {
          const num = i + 1;
          const isActive = num === activeLine;
          if (!line.trim()) return null;
          return (
            <View key={num} style={[styles.lineRow, isActive && styles.lineRowActive]}>
              {isActive ? <Text style={styles.cursor}>▶</Text> : <View style={styles.cursorSpacer} />}
              <Text style={styles.lineNumText}>{String(num).padStart(4, '0')}</Text>
              <Text style={[styles.lineText, isActive && styles.lineTextActive]} numberOfLines={1}>
                {line}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#0b0c0e', borderRadius: 10, padding: 10, height: 220 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: '#8a919c', fontSize: 10, letterSpacing: 0.5, fontWeight: '700' },
  lineIndicator: { color: '#8a919c', fontSize: 10 },
  lineNum: { color: '#5aa8ff', fontWeight: '700' },
  scroll: { flex: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', height: LINE_HEIGHT, paddingHorizontal: 4, borderRadius: 4 },
  lineRowActive: { backgroundColor: '#1c2b1c' },
  cursor: { color: '#4ade80', fontSize: 10, width: 14 },
  cursorSpacer: { width: 14 },
  lineNumText: { color: '#4b5158', fontSize: 11, fontFamily: 'monospace', width: 34 },
  lineText: { color: '#b8bcc4', fontSize: 12, fontFamily: 'monospace', flex: 1 },
  lineTextActive: { color: '#9df08a', fontWeight: '700' },
});
