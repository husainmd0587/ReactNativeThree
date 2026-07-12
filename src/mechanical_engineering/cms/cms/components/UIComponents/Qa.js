import React, { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'

// ─── Single QA Card ────────────────────────────────────────────
const QACard = ({ item, number }) => {
  const [revealed, setRevealed] = useState(false)

  return (
    <View style={styles.card}>
      {/* Question row */}
      <View style={styles.qRow}>
        <View style={styles.qBadge}>
          <Text style={styles.qBadgeText}>Q{number}</Text>
        </View>
        <Text style={styles.qText}>{item.q}</Text>
      </View>

      {/* Answer — hidden until revealed */}
      {revealed ? (
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>Answer</Text>
          <Text style={styles.answerText}>{item.a}</Text>
          <TouchableOpacity
            style={styles.hideBtn}
            onPress={() => setRevealed(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.hideBtnText}>Hide Answer  ↑</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.revealBtn}
          onPress={() => setRevealed(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.revealBtnText}>Show Answer  ›</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Main QA component ─────────────────────────────────────────
const Qa = ({ questions = [] }) => {
  const [allRevealed, setAllRevealed] = useState(false)
  // individual state managed inside each QACard
  // allRevealed used as a key reset trick
  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>✍️  {questions.length} Written Questions</Text>
        <Text style={styles.headerSub}>Press "Show Answer" to reveal each answer</Text>
      </View>

      {questions.map((q, i) => (
        <QACard key={i} item={q} number={i + 1} />
      ))}
    </View>
  )
}

export default Qa

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },

  // Header
  header: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSub: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8D8E8',
    marginBottom: 10,
    overflow: 'hidden',
  },

  // Question row
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 13,
    backgroundColor: '#F8FFF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0EEE0',
    gap: 10,
  },
  qBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
    marginTop: 1,
  },
  qBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  qText: {
    flex: 1,
    fontSize: 13,
    color: '#1A2E1A',
    lineHeight: 19,
    fontWeight: '600',
  },

  // Reveal button (answer hidden)
  revealBtn: {
    margin: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  revealBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Answer box (revealed)
  answerBox: {
    backgroundColor: '#F1F8F1',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
    padding: 14,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  answerText: {
    fontSize: 13,
    color: '#1A2E1A',
    lineHeight: 20,
  },

  // Hide button (inside answer box)
  hideBtn: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    alignItems: 'center',
  },
  hideBtnText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
})