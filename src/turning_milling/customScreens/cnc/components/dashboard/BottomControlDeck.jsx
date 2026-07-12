import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DialGauge from './DialGauge';

export default function BottomControlDeck({
  playing,
  onCycleStart,
  onFeedHold,
  onStop,
  onHome,
  spindleSpeed,
  feedRate,
  spindleOn,
  onToggleSpindle,
  feedOn,
  onToggleFeed,
}) {
  const [coolant, setCoolant] = useState(true);
  const [tailstock, setTailstock] = useState(false);
  const [light, setLight] = useState(true);

  return (
    <View style={styles.wrap}>
      <View style={styles.cycleCol}>
        <CycleBtn label="CYCLE START" icon="▮▮" color="#22c55e" onPress={onCycleStart} active={playing} />
        <CycleBtn label="FEED HOLD" icon="⏸" color="#ef4444" onPress={onFeedHold} />
        <CycleBtn label="STOP" icon="⏹" color="#ef4444" onPress={onStop} />
      </View>

      <View style={styles.jogCol}>
        <Text style={styles.deckLabel}>JOG / AXIS</Text>
        <View style={styles.jogGrid}>
          <JogBtn label="X+" />
          <JogBtn label="Z+" />
          <JogBtn label="X-" />
          <JogBtn label="Z-" />
        </View>
        <View style={styles.jogGrid}>
          <JogBtn label="RAPID" small />
          <JogBtn label="HOME" small onPress={onHome} />
        </View>
      </View>

      <View style={styles.dialCol}>
        <Text style={styles.deckLabel}>SPINDLE</Text>
        <DialGauge label="" value={spindleSpeed} min={0} max={3000} unit="RPM" size={78} accentColor="#f5a524" />
        <ToggleBtn label={spindleOn ? 'ON' : 'OFF'} active={spindleOn} onPress={onToggleSpindle} activeColor="#22c55e" />
      </View>

      <View style={styles.dialCol}>
        <Text style={styles.deckLabel}>FEED</Text>
        <DialGauge label="" value={feedRate} min={0.05} max={0.5} unit="mm/rev" size={78} accentColor="#4ade80" />
        <ToggleBtn label={feedOn ? 'ON' : 'OFF'} active={feedOn} onPress={onToggleFeed} activeColor="#22c55e" />
      </View>

      <View style={styles.togglesCol}>
        <MiniToggle icon="💧" label="COOLANT" active={coolant} onPress={() => setCoolant((v) => !v)} />
        <MiniToggle icon="🔩" label="TAILSTOCK" active={tailstock} onPress={() => setTailstock((v) => !v)} />
        <MiniToggle icon="💡" label="LIGHT" active={light} onPress={() => setLight((v) => !v)} />
      </View>
    </View>
  );
}

function CycleBtn({ label, icon, color, onPress, active }) {
  return (
    <TouchableOpacity style={[styles.cycleBtn, { borderColor: color }, active && { backgroundColor: color + '33' }]} onPress={onPress}>
      <Text style={[styles.cycleIcon, { color }]}>{icon}</Text>
      <Text style={styles.cycleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function JogBtn({ label, small, onPress }) {
  return (
    <TouchableOpacity style={[styles.jogBtn, small && styles.jogBtnSmall]} onPress={onPress}>
      <Text style={styles.jogLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleBtn({ label, active, onPress, activeColor }) {
  return (
    <TouchableOpacity style={[styles.toggleBtn, active && { backgroundColor: activeColor }]} onPress={onPress}>
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MiniToggle({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.miniToggle} onPress={onPress}>
      <Text style={styles.miniIcon}>{icon}</Text>
      <Text style={[styles.miniLabel, active && styles.miniLabelActive]}>{label}</Text>
      <Text style={[styles.miniState, active && styles.miniStateActive]}>{active ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#101215', padding: 10, borderTopWidth: 1, borderTopColor: '#22252b' },
  deckLabel: { color: '#6b7178', fontSize: 8, letterSpacing: 0.5, textAlign: 'center', marginBottom: 6 },

  cycleCol: { justifyContent: 'space-between' },
  cycleBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', marginBottom: 6, width: 70 },
  cycleIcon: { fontSize: 14 },
  cycleLabel: { color: '#c7ccd4', fontSize: 7, marginTop: 2, textAlign: 'center' },

  jogCol: { marginLeft: 10, alignItems: 'center' },
  jogGrid: { flexDirection: 'row', marginBottom: 4 },
  jogBtn: { backgroundColor: '#2b2f36', borderRadius: 6, width: 40, height: 34, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  jogBtnSmall: { width: 40, height: 26 },
  jogLabel: { color: '#e8eaed', fontSize: 10, fontWeight: '700' },

  dialCol: { marginLeft: 14, alignItems: 'center' },
  toggleBtn: { backgroundColor: '#2b2f36', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 14, marginTop: 6 },
  toggleLabel: { color: '#e8eaed', fontSize: 10, fontWeight: '700' },

  togglesCol: { marginLeft: 14, justifyContent: 'space-between' },
  miniToggle: { alignItems: 'center', marginBottom: 6, backgroundColor: '#15171b', borderRadius: 8, paddingVertical: 6, width: 62 },
  miniIcon: { fontSize: 14 },
  miniLabel: { color: '#6b7178', fontSize: 7, marginTop: 2 },
  miniLabelActive: { color: '#9aa0aa' },
  miniState: { color: '#ef4444', fontSize: 8, fontWeight: '700', marginTop: 1 },
  miniStateActive: { color: '#22c55e' },
});
