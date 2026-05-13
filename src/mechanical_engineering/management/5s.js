import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, StyleSheet,
} from 'react-native'

const STEPS = [
  {
    id: 'S1',
    label: 'SEIRI',
    title: 'Sort',
    desc: 'Remove all unnecessary items from the workspace. Tag and eliminate what is not needed.',
  },
  {
    id: 'S2',
    label: 'SEITON',
    title: 'Set in order',
    desc: 'Arrange tools and materials so they are easy to find and use efficiently.',
  },
  {
    id: 'S3',
    label: 'SEISO',
    title: 'Shine',
    desc: 'Clean the area and equipment. Keep it spotless through daily discipline.',
  },
  {
    id: 'S4',
    label: 'SEIKETSU',
    title: 'Standardise',
    desc: 'Create procedures and visual standards to maintain the first three pillars.',
  },
  {
    id: 'S5',
    label: 'SHITSUKE',
    title: 'Sustain',
    desc: 'Build habits and team discipline to uphold standards long-term.',
  },
]

const FiveSScreen = () => {
  const [completed, setCompleted] = useState([0, 1, 2])  // S1–S3 done by default
  const activeIndex = completed.length < STEPS.length ? completed.length : STEPS.length - 1

  const markDone = () => {
    if (completed.length < STEPS.length) {
      setCompleted(prev => [...prev, prev.length])
    }
  }

  const getCardStyle = (index) => {
    if (completed.includes(index)) return styles.cardDone
    if (index === activeIndex) return styles.cardActive
    return styles.cardIdle
  }

  const getNumStyle = (index) => {
    if (completed.includes(index)) return styles.numDone
    if (index === activeIndex) return styles.numActive
    return styles.numIdle
  }

  const getNumTextStyle = (index) => {
    if (completed.includes(index)) return styles.numTextDone
    if (index === activeIndex) return styles.numTextActive
    return styles.numTextIdle
  }

  const getStatusLabel = (index) => {
    if (completed.includes(index)) return 'DONE'
    if (index === activeIndex) return 'IN PROGRESS'
    return 'PENDING'
  }

  const getStatusStyle = (index) => {
    if (completed.includes(index)) return styles.statusDone
    if (index === activeIndex) return styles.statusActive
    return styles.statusPending
  }

  const getStatusTextStyle = (index) => {
    if (completed.includes(index)) return styles.statusTextDone
    if (index === activeIndex) return styles.statusTextActive
    return styles.statusTextPending
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <Text style={styles.heading}>5S System</Text>
          <View style={styles.leanBadge}>
            <Text style={styles.leanBadgeText}>LEAN</Text>
          </View>
        </View>
        <Text style={styles.subHeading}>WORKPLACE ORGANISATION STANDARD</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completed.length / STEPS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{completed.length} / {STEPS.length} COMPLETE</Text>
        </View>

        {/* Cards */}
        {STEPS.map((step, index) => (
          <View key={step.id} style={[styles.card, getCardStyle(index)]}>
            <View style={[styles.numBox, getNumStyle(index)]}>
              <Text style={[styles.numText, getNumTextStyle(index)]}>{step.id}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
              <View style={[styles.statusBadge, getStatusStyle(index)]}>
                <Text style={[styles.statusText, getStatusTextStyle(index)]}>
                  {getStatusLabel(index)}
                </Text>
              </View>
            </View>
            {completed.includes(index) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.7}>
          <Text style={styles.btnSecondaryText}>SKIP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, completed.length === STEPS.length && styles.btnDisabled]}
          onPress={markDone}
          activeOpacity={0.8}
          disabled={completed.length === STEPS.length}
        >
          <Text style={styles.btnPrimaryText}>
            {completed.length === STEPS.length ? 'ALL DONE' : 'MARK DONE'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const AMBER = '#EF9F27'
const AMBER_BG = '#FFF8EC'
const AMBER_BORDER = '#F5C96A'
const GREEN = '#3B6D11'
const GREEN_BG = '#EAF3DE'
const GREEN_BORDER = '#97C459'
const DARK = '#F7F7F5'
const CARD_BG = '#FFFFFF'
const BORDER = '#E8E8E4'
const SURFACE = '#F1F0EB'

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111' },
  topBar: { backgroundColor: '#111', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  topBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: '#F5F5F5', fontSize: 20, fontWeight: '500', letterSpacing: 0.8, fontFamily: 'Courier New' },
  leanBadge: { backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 4, paddingHorizontal: 9, paddingVertical: 3 },
  leanBadgeText: { color: AMBER, fontSize: 10, letterSpacing: 1.8, fontFamily: 'Courier New' },
  subHeading: { color: '#555', fontSize: 10, marginTop: 4, letterSpacing: 1.2, fontFamily: 'Courier New' },

  scroll: { flex: 1, backgroundColor: DARK },
  body: { padding: 16, paddingBottom: 24 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  progressTrack: { flex: 1, height: 3, backgroundColor: BORDER, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: AMBER, borderRadius: 2 },
  progressLabel: { fontSize: 10, color: '#555', fontFamily: 'Courier New', letterSpacing: 0.6 },

  card: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  cardActive: { borderColor: AMBER },
  cardDone: { borderColor: BORDER },
  cardIdle: { borderColor: BORDER },

  numBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  numDone: { backgroundColor: GREEN_BG, borderColor: GREEN_BORDER },
  numActive: { backgroundColor: AMBER_BG, borderColor: AMBER_BORDER },
  numIdle: { backgroundColor: SURFACE, borderColor: BORDER },
  numText: { fontSize: 12, fontWeight: '500', fontFamily: 'Courier New' },
  numTextDone: { color: GREEN },
  numTextActive: { color: AMBER },
  numTextIdle: { color: '#555' },

  cardContent: { flex: 1 },
  stepLabel: { fontSize: 9, color: '#555', letterSpacing: 1.4, fontFamily: 'Courier New', marginBottom: 2 },
  stepTitle: { fontSize: 14, fontWeight: '500', color: '#E8E8E8', marginBottom: 4 },
  stepDesc: { fontSize: 11, color: '#666', lineHeight: 16 },

  statusBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  statusDone: { backgroundColor: GREEN_BG },
  statusActive: { backgroundColor: AMBER_BG },
  statusPending: { backgroundColor: SURFACE },
  statusText: { fontSize: 10, fontFamily: 'Courier New', letterSpacing: 0.6 },
  statusTextDone: { color: GREEN },
  statusTextActive: { color: AMBER },
  statusTextPending: { color: '#555' },

  checkmark: { color: GREEN, fontSize: 16, position: 'absolute', top: 12, right: 14 },

  footer: { backgroundColor: '#111', padding: 16, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  btnSecondary: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  btnSecondaryText: { color: '#888', fontSize: 12, fontFamily: 'Courier New', letterSpacing: 0.6 },
  btnPrimary: { flex: 2, padding: 12, borderRadius: 8, backgroundColor: AMBER, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#3A2E00', opacity: 0.6 },
  btnPrimaryText: { color: '#412402', fontSize: 12, fontWeight: '500', fontFamily: 'Courier New', letterSpacing: 0.6 },
})

export default FiveSScreen