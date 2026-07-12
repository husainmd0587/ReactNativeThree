import React, { useState } from 'react'
import {
  StyleSheet, Text, View,
  TouchableOpacity, ScrollView,
} from 'react-native'

// ─── Single Question Card ──────────────────────────────────────
const QuestionCard = ({ item, number }) => {
  const [selected, setSelected] = useState(null)   // index of tapped option
  const [revealed, setRevealed] = useState(false)  // show answer

  const handleOption = (i) => {
    if (revealed) return   // locked after reveal
    setSelected(i)
  }

  const handleReveal = () => {
    if (selected === null) return
    setRevealed(true)
  }

  const handleReset = () => {
    setSelected(null)
    setRevealed(false)
  }

  const getOptionStyle = (i) => {
    if (!revealed) {
      return selected === i ? styles.optionSelected : styles.option
    }
    if (i === item.answer)  return styles.optionCorrect
    if (i === selected)     return styles.optionWrong
    return styles.option
  }

  const getOptionTextStyle = (i) => {
    if (!revealed) {
      return selected === i ? styles.optionTextSelected : styles.optionText
    }
    if (i === item.answer)  return styles.optionTextCorrect
    if (i === selected)     return styles.optionTextWrong
    return styles.optionText
  }

  const getPrefix = (i) => {
    if (!revealed) return selected === i ? '◉ ' : '○ '
    if (i === item.answer)  return '✓ '
    if (i === selected)     return '✗ '
    return '○ '
  }

  return (
    <View style={styles.card}>
      {/* Question */}
      <View style={styles.qRow}>
        <View style={styles.qNumBadge}>
          <Text style={styles.qNumText}>Q{number}</Text>
        </View>
        <Text style={styles.qText}>{item.q}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsList}>
        {item.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={revealed ? 1 : 0.7}
            style={getOptionStyle(i)}
            onPress={() => handleOption(i)}
          >
            <Text style={getOptionTextStyle(i)}>
              {getPrefix(i)}{opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action row */}
      <View style={styles.actionRow}>
        {!revealed ? (
          <TouchableOpacity
            style={[styles.revealBtn, selected === null && styles.revealBtnDisabled]}
            onPress={handleReveal}
            activeOpacity={selected === null ? 1 : 0.8}
          >
            <Text style={styles.revealBtnText}>
              {selected === null ? 'Select an option' : 'Check Answer  ›'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.resetBtnText}>↺  Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Result badge */}
        {revealed && (
          <View style={selected === item.answer ? styles.badgeCorrect : styles.badgeWrong}>
            <Text style={styles.badgeText}>
              {selected === item.answer ? '✓ Correct' : '✗ Wrong'}
            </Text>
          </View>
        )}
      </View>

      {/* Explanation */}
      {revealed && item.explanation ? (
        <View style={styles.explanation}>
          <Text style={styles.explanationLabel}>Explanation</Text>
          <Text style={styles.explanationText}>{item.explanation}</Text>
        </View>
      ) : null}
    </View>
  )
}

// ─── Main MCQ component ────────────────────────────────────────
const MCQ = ({ questions = [] }) => {
  const [score, setScore]     = useState(null)
  const [answers, setAnswers] = useState({})   // { index: selectedIndex }

  // Track answers from child — optional scoreboard
  // Simple implementation: just render all cards
  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>📝  {questions.length} Questions</Text>
        <Text style={styles.headerSub}>Tap an option then press Check Answer</Text>
      </View>

      {questions.map((q, i) => (
        <QuestionCard key={i} item={q} number={i + 1} />
      ))}
    </View>
  )
}

export default MCQ

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },

  // Header
  header: {
    backgroundColor: '#E8EAF6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949AB',
  },
  headerSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8D8E8',
    marginBottom: 12,
    overflow: 'hidden',
  },

  // Question row
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#F8F8FD',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBF5',
    gap: 10,
  },
  qNumBadge: {
    backgroundColor: '#3949AB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
    marginTop: 1,
  },
  qNumText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  qText: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A3A',
    lineHeight: 19,
    fontWeight: '600',
  },

  // Options
  optionsList: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 7,
  },
  option: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D8D8E8',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3949AB',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionCorrect: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionWrong: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  optionText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 17,
  },
  optionTextSelected: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '600',
    lineHeight: 17,
  },
  optionTextCorrect: {
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '700',
    lineHeight: 17,
  },
  optionTextWrong: {
    fontSize: 12,
    color: '#B71C1C',
    fontWeight: '600',
    lineHeight: 17,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  revealBtn: {
    flex: 1,
    backgroundColor: '#3949AB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  revealBtnDisabled: {
    backgroundColor: '#C5CAE9',
  },
  revealBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#F5F5FB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  resetBtnText: {
    color: '#3949AB',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeCorrect: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  badgeWrong: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C62828',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },

  // Explanation
  explanation: {
    backgroundColor: '#FFFDE7',
    borderTopWidth: 1,
    borderTopColor: '#FFF9C4',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 12,
    color: '#4E342E',
    lineHeight: 18,
  },
})