/**
 * ScientificCalculator.jsx
 * Advanced Scientific Calculator for React Native
 * Stack: React Native, react-native-reanimated
 * Features: Light/Dark Theme with System Preference
 */

import React, { useState, useCallback, useRef } from 'react';
// import storage from '../../../utils/store/localStorage/mmkvStore';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PAD = 10;
const COLS = 6;
const BTN_GAP = 6;
const ROWS = 8;
const BTN_W = (SCREEN_W - PAD * 2 - BTN_GAP * (COLS - 1)) / COLS;

const DISPLAY_H = Math.round(SCREEN_H * 0.23);
const STATUS_BAR_H = Platform.OS === 'android' ? 24 : 44;
const BOTTOM_PAD = Platform.OS === 'ios' ? 28 : 12;
const AVAILABLE_H = SCREEN_H - STATUS_BAR_H - BOTTOM_PAD - DISPLAY_H - 18;
const BTN_H = Math.floor((AVAILABLE_H - BTN_GAP * (ROWS - 1)) / ROWS);

// ─── Theme Definitions ────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#0A0C14',
    displayBg: '#0D1017',
    displayBorder: '#1E2535',
    accent: '#00E5FF',
    accentDim: '#00B8CC',
    accentGlow: 'rgba(0,229,255,0.18)',
    orange: '#FF6B35',
    orangeDim: '#CC5228',
    red: '#FF3B5C',
    btnBase: '#12161F',
    btnMid: '#1A2030',
    btnTop: '#232B3E',
    btnText: '#D4DCF0',
    btnTextDim: '#8892AA',
    shiftLabel: '#FFD166',
    white: '#FFFFFF',
    historyText: '#4A5568',
    equalsGrad1: '#00C8E8',
    equalsGrad2: '#0095B8',
    modalBg: '#111827',
    modalBorder: '#1E2535',
    modalRowBg: '#161D2B',
    modalRowBorder: '#1E2A3E',
    statusBar: 'light-content',
    overlayBg: 'rgba(0,0,0,0.7)',
    flashColor: '#90c089',
    historyBtnBg: 'rgba(255,255,255,0.05)',
    historyBtnBorder: 'rgba(255,255,255,0.1)',
    chipBg: 'rgba(0,229,255,0.08)',
    chipBorder: 'rgba(0,229,255,0.2)',
    glowColor: '#00E5FF',
  },
  light: {
    bg: '#4e4e4e',
    displayBg: '#FFFFFF',
    displayBorder: '#D9E1EC',
    accent: '#00A8C6',
    accentDim: '#00859B',
    accentGlow: 'rgba(0,168,198,0.12)',
    orange: '#FF7A45',
    orangeDim: '#E3622F',
    red: '#E63946',
    btnBase: '#c5c5c5',
    btnMid: '#F3F5F9',
    btnTop: '#E9EEF5',
    btnText: '#1F2937',
    btnTextDim: '#6B7280',
    shiftLabel: '#D97706',
    white: '#FFFFFF',
    historyText: '#64748B',
    equalsGrad1: '#00B4D8',
    equalsGrad2: '#0077B6',
    modalBg: '#FFFFFF',
    modalBorder: '#E2E8F0',
    modalRowBg: '#F8FAFC',
    modalRowBorder: '#E2E8F0',
    statusBar: 'dark-content',
    overlayBg: 'rgba(0,0,0,0.4)',
    flashColor: '#4ADE80',
    historyBtnBg: 'rgba(0,0,0,0.04)',
    historyBtnBorder: 'rgba(0,0,0,0.08)',
    chipBg: 'rgba(0,168,198,0.08)',
    chipBorder: 'rgba(0,168,198,0.2)',
    glowColor: '#00A8C6',
  },
};

// ─── Button Definitions ─────────────────────────────────────────────────────
const BUTTONS = [
  { label: 'SHIFT', sub: '', type: 'shift', wide: false },
  { label: 'α', sub: 'HYP', type: 'fn' },
  { label: 'DRG', sub: 'MODE', type: 'fn' },
  { label: 'CLR', sub: 'STO', type: 'clear' },
  { label: 'DEL', sub: 'RCL', type: 'clear' },
  { label: 'AC', sub: '', type: 'ac' },

  { label: 'x²', sub: 'x³', type: 'fn' },
  { label: '√', sub: '∛', type: 'fn' },
  { label: 'xⁿ', sub: 'ⁿ√', type: 'fn' },
  { label: '10ˣ', sub: '2ˣ', type: 'fn' },
  { label: 'eˣ', sub: 'ln⁻¹', type: 'fn' },
  { label: 'x⁻¹', sub: 'x!', type: 'fn' },

  { label: 'log', sub: 'log₂', type: 'fn' },
  { label: 'ln', sub: 'e', type: 'fn' },
  { label: 'sin', sub: 'sin⁻¹', type: 'trig' },
  { label: 'cos', sub: 'cos⁻¹', type: 'trig' },
  { label: 'tan', sub: 'tan⁻¹', type: 'trig' },
  { label: 'π', sub: 'φ', type: 'fn' },

  { label: '(', sub: 'nCr', type: 'fn' },
  { label: ')', sub: 'nPr', type: 'fn' },
  { label: 'M+', sub: 'STO', type: 'mem' },
  { label: 'M-', sub: 'RCL', type: 'mem' },
  { label: 'MR', sub: 'MC', type: 'mem' },
  { label: '%', sub: 'mod', type: 'op' },

  { label: '7', sub: '', type: 'num' },
  { label: '8', sub: '', type: 'num' },
  { label: '9', sub: '', type: 'num' },
  { label: '÷', sub: 'nPr', type: 'op' },
  { label: '×', sub: 'nCr', type: 'op' },
  { label: '⌫', sub: '', type: 'del' },

  { label: '4', sub: '', type: 'num' },
  { label: '5', sub: '', type: 'num' },
  { label: '6', sub: '', type: 'num' },
  { label: '+', sub: '', type: 'op' },
  { label: '−', sub: '', type: 'op' },
  { label: 'ANS', sub: '', type: 'fn' },

  { label: '1', sub: '', type: 'num' },
  { label: '2', sub: '', type: 'num' },
  { label: '3', sub: '', type: 'num' },
  { label: 'EXP', sub: 'E', type: 'fn' },
  { label: '(−)', sub: '', type: 'fn' },
  { label: '=', sub: '', type: 'eq' },

  { label: '0', sub: '', type: 'num', wide: false },
  { label: '.', sub: '', type: 'num' },
  { label: 'π', sub: '', type: 'fn' },
  { label: 'e', sub: '', type: 'fn' },
  { label: 'Rnd', sub: '', type: 'fn' },
  { label: '⇔', sub: '', type: 'fn' },
];

// ─── Expression evaluator ─────────────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;

function evaluateExpression(expr, angleMode = 'RAD') {
  try {
    let e = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, `(${Math.PI})`)
      .replace(/φ/g, `(${(1 + Math.sqrt(5)) / 2})`)
      .replace(/e(?!\^)/g, `(${Math.E})`)
      .replace(/²/g, '**2')
      .replace(/³/g, '**3')
      .replace(/⌫/g, '');

    e = e
      .replace(/sin\(/g, `Math.sin(` + (angleMode === 'DEG' ? `(Math.PI/180)*` : ''))
      .replace(/cos\(/g, `Math.cos(` + (angleMode === 'DEG' ? `(Math.PI/180)*` : ''))
      .replace(/tan\(/g, `Math.tan(` + (angleMode === 'DEG' ? `(Math.PI/180)*` : ''))
      .replace(/sin⁻¹\(/g, `(180/Math.PI)*Math.asin(`)
      .replace(/cos⁻¹\(/g, `(180/Math.PI)*Math.acos(`)
      .replace(/tan⁻¹\(/g, `(180/Math.PI)*Math.atan(`)
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/√\(/g, 'Math.sqrt(')
      .replace(/√(\d+\.?\d*)/g, 'Math.sqrt($1)')
      .replace(/(\d+\.?\d*)!/g, (_, n) => factorial(parseFloat(n)))
      .replace(/EXP/g, 'e');

    const result = Function('"use strict"; return (' + e + ')')();
    if (!isFinite(result)) return 'Error';
    if (Number.isInteger(result) && Math.abs(result) < 1e15) return String(result);
    const s = parseFloat(result.toPrecision(12));
    return String(s);
  } catch {
    return 'Error';
  }
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// ─── Theme Toggle Button ──────────────────────────────────────────────────────
const ThemeToggle = React.memo(({ theme, onToggle, colors }) => (
  <TouchableOpacity
    onPress={onToggle}
    style={{
      marginLeft: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.historyBtnBg,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.historyBtnBorder,
    }}
    activeOpacity={0.6}
  >
    <Text style={{ fontSize: 12, color: colors.btnTextDim }}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </Text>
  </TouchableOpacity>
));

// ─── Animated Button ──────────────────────────────────────────────────────────
const AnimButton = React.memo(({ btn, onPress, shiftActive, index, colors }) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const isEq = btn.type === 'eq';
  const isAC = btn.type === 'ac';
  const isOp = btn.type === 'op';
  const isTrig = btn.type === 'trig';
  const isMem = btn.type === 'mem';
  const isShift = btn.type === 'shift';
  const isDel = btn.type === 'del' || btn.label === '⌫';

  const bgColor = isEq
    ? colors.accentDim
    : isAC
    ? colors.red
    : isShift
    ? colors.theme === 'dark' ? '#1C2440' : '#E2E8F0'
    : isOp
    ? colors.btnMid
    : isTrig
    ? colors.theme === 'dark' ? '#161E2E' : '#F1F5F9'
    : isMem
    ? colors.theme === 'dark' ? '#141C2C' : '#F8FAFC'
    : colors.btnBase;

  const labelColor = isEq
    ? colors.bg
    : isAC
    ? colors.white
    : isShift
    ? colors.shiftLabel
    : isOp
    ? colors.accent
    : isTrig
    ? colors.accentDim
    : isMem
    ? colors.theme === 'dark' ? '#88B4FF' : '#3B82F6'
    : isDel
    ? colors.orange
    : colors.btnText;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [0, 0.7]),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.9, { duration: 70 });
    pressed.value = withTiming(1, { duration: 50 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
    pressed.value = withTiming(0, { duration: 180 });
    runOnJS(onPress)(btn);
  }, [btn, onPress]);

  const subLabel = shiftActive && btn.sub ? btn.sub : null;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[btnStyles.btnTouch, { width: BTN_W, height: BTN_H }]}
    >
      <Animated.View style={[btnStyles.btnInner, { backgroundColor: bgColor }, animStyle]}>
        <View style={[btnStyles.btnHighlight, isEq && { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
        <Animated.View style={[StyleSheet.absoluteFillObject, btnStyles.btnFlash, flashStyle, { backgroundColor: colors.flashColor }]} />
        {subLabel ? (
          <Text style={[btnStyles.subLabel, { color: colors.shiftLabel }]}>{subLabel}</Text>
        ) : null}
        <Text
          style={[
            btnStyles.btnLabel,
            { color: labelColor },
            (btn.type === 'fn' || btn.type === 'trig') && btnStyles.btnLabelSm,
            isEq && btnStyles.btnLabelEq,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {btn.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── History Modal ────────────────────────────────────────────────────────────
const HistoryModal = ({ visible, history, onClose, onUse, colors }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <View style={[modalStyles.modalOverlay, { backgroundColor: colors.overlayBg }]}>
      <View style={[modalStyles.modalBox, {
        backgroundColor: colors.modalBg,
        borderColor: colors.modalBorder,
      }]}>
        <View style={[modalStyles.modalHeader, { borderBottomColor: colors.modalBorder }]}>
          <Text style={[modalStyles.modalTitle, { color: colors.white }]}>History</Text>
          <TouchableOpacity onPress={onClose} style={[modalStyles.modalCloseBtn, {
            backgroundColor: colors.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }]}>
            <Text style={[modalStyles.modalCloseText, { color: colors.btnTextDim }]}>✕</Text>
          </TouchableOpacity>
        </View>
        {history.length === 0 ? (
          <View style={modalStyles.modalEmpty}>
            <Text style={[modalStyles.modalEmptyText, { color: colors.historyText }]}>No calculations yet</Text>
          </View>
        ) : (
          <ScrollView
            style={modalStyles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {[...history].reverse().map((h, i) => {
              const parts = h.split(' = ');
              return (
                <TouchableOpacity
                  key={i}
                  style={[modalStyles.modalRow, {
                    backgroundColor: colors.modalRowBg,
                    borderColor: colors.modalRowBorder,
                  }]}
                  onPress={() => onUse(parts[1] ?? '')}
                  activeOpacity={0.7}
                >
                  <Text style={[modalStyles.modalExpr, { color: colors.btnTextDim }]} numberOfLines={1}>{parts[0]}</Text>
                  <Text style={[modalStyles.modalResult, { color: colors.accent }]}>= {parts[1]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

// ─── Display ──────────────────────────────────────────────────────────────────
const CalcDisplay = ({ expression, result, history, angleMode, memActive, onShowHistory, theme, onToggleTheme, colors }) => {
  const histScrollRef = useRef(null);

  React.useEffect(() => {
    if (history.length > 0) {
      setTimeout(() => histScrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [history.length]);

  return (
    <View style={[displayStyles.display, {
      backgroundColor: colors.displayBg,
      borderColor: colors.displayBorder,
      shadowColor: colors.accent,
    }]}>
      <View style={displayStyles.displayStatus}>
        <Text style={[displayStyles.statusChip, {
          color: colors.accent,
          backgroundColor: colors.chipBg,
          borderColor: colors.chipBorder,
        }]}>{angleMode}</Text>
        {memActive && <Text style={[displayStyles.statusChip, {
          color: colors.accent,
          backgroundColor: colors.chipBg,
          borderColor: colors.chipBorder,
        }]}>M</Text>}
        <Text style={[displayStyles.statusChip, {
          color: colors.accent,
          backgroundColor: colors.chipBg,
          borderColor: colors.chipBorder,
        }]}>SCI</Text>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} colors={colors} />
        <TouchableOpacity onPress={onShowHistory} style={[displayStyles.historyBtn, {
          backgroundColor: colors.historyBtnBg,
          borderColor: colors.historyBtnBorder,
        }]}>
          <Text style={[displayStyles.historyBtnText, { color: colors.btnTextDim }]}>⏱ History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={histScrollRef}
        style={displayStyles.historyScroll}
        contentContainerStyle={displayStyles.historyContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {history.slice(-3).map((h, i) => (
          <Text key={i} style={[displayStyles.historyLine, { color: colors.historyText }]} numberOfLines={1} ellipsizeMode="head">
            {h}
          </Text>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        style={displayStyles.exprScroll}
        contentContainerStyle={displayStyles.exprContent}
        showsHorizontalScrollIndicator={false}
      >
        <Text style={[displayStyles.exprText, { color: colors.btnText }]} numberOfLines={2} adjustsFontSizeToFit>
          {expression || '0'}
        </Text>
      </ScrollView>

      {result !== '' && result !== expression && (
        <Text style={[displayStyles.resultText, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
          = {result}
        </Text>
      )}
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ScientificCalculator() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState(systemColorScheme === 'dark' ? 'dark' : 'light');

  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [shiftActive, setShiftActive] = useState(false);
  const [angleMode, setAngleMode] = useState('RAD');
  const [memory, setMemory] = useState(0);
  const [memActive, setMemActive] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [historyModal, setHistoryModal] = useState(false);

  const colors = { ...THEMES[theme], theme };

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const displayShake = useSharedValue(0);
  const displayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: displayShake.value }],
  }));

  const shakeDisplay = () => {
    displayShake.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 40 }),
    );
  };

  const handleButton = useCallback(
    (btn) => {
      const label = shiftActive && btn.sub ? btn.sub : btn.label;

      if (btn.type === 'shift') {
        setShiftActive((s) => !s);
        return;
      }
      if (shiftActive && btn.type !== 'shift') setShiftActive(false);

      if (btn.type === 'ac') {
        setExpression('');
        setResult('');
        return;
      }

      if (btn.type === 'del' || label === '⌫') {
        setExpression((e) => e.slice(0, -1));
        setResult('');
        return;
      }

      if (label === 'CLR') {
        setExpression('');
        setResult('');
        return;
      }

      if (label === 'DRG') {
        setAngleMode((m) => (m === 'RAD' ? 'DEG' : m === 'DEG' ? 'GRAD' : 'RAD'));
        return;
      }

      if (label === 'M+') {
        const val = parseFloat(result || expression || '0');
        if (!isNaN(val)) { setMemory((m) => m + val); setMemActive(true); }
        return;
      }
      if (label === 'M-') {
        const val = parseFloat(result || expression || '0');
        if (!isNaN(val)) { setMemory((m) => m - val); setMemActive(true); }
        return;
      }
      if (label === 'MR') {
        setExpression((e) => e + String(memory));
        return;
      }
      if (label === 'MC') {
        setMemory(0); setMemActive(false);
        return;
      }

      if (label === 'ANS') {
        setExpression((e) => e + (lastResult || '0'));
        return;
      }

      if (btn.type === 'eq') {
        if (!expression) return;
        const res = evaluateExpression(expression, angleMode);
        if (res === 'Error') {
          shakeDisplay();
          setResult('Error');
        } else {
          setResult(res);
          setLastResult(res);
          setHistory((h) => [...h, `${expression} = ${res}`]);
        }
        return;
      }

      const funcMap = {
        'x²': '²', 'x³': '³', '√': '√(', '∛': '∛(',
        'xⁿ': '^(', 'ⁿ√': 'ⁿ√(', '10ˣ': '10^(', '2ˣ': '2^(',
        'eˣ': 'e^(', sin: 'sin(', cos: 'cos(', tan: 'tan(',
        'sin⁻¹': 'sin⁻¹(', 'cos⁻¹': 'cos⁻¹(', 'tan⁻¹': 'tan⁻¹(',
        log: 'log(', 'log₂': 'log₂(', ln: 'ln(',
        Hyp: 'Hyp(', '(−)': '(-', Rnd: String(Math.random().toFixed(6)),
        mod: ' mod ', nCr: 'nCr(', nPr: 'nPr(', EXP: 'E', '⇔': '',
      };

      const insert = funcMap[label] ?? label;
      setExpression((e) => {
        if (result && !isNaN(insert) && e === '') return insert;
        return e + insert;
      });
      setResult('');
    },
    [shiftActive, expression, result, lastResult, memory, angleMode],
  );

  return (
    <SafeAreaView style={[rootStyles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <View style={[rootStyles.root, { backgroundColor: colors.bg }]}>

        <View style={[rootStyles.glowBehind, {
          backgroundColor: colors.accentGlow,
          shadowColor: colors.glowColor,
        }]} />

        <Animated.View style={[rootStyles.displayWrap, displayStyle]}>
          <CalcDisplay
            expression={expression}
            result={result}
            history={history}
            angleMode={angleMode}
            memActive={memActive}
            onShowHistory={() => setHistoryModal(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
            colors={colors}
          />
        </Animated.View>

        <View style={rootStyles.grid}>
          {BUTTONS.map((btn, idx) => (
            <AnimButton
              key={idx}
              btn={btn}
              onPress={handleButton}
              shiftActive={shiftActive}
              index={idx + 1}
              colors={colors}
            />
          ))}
        </View>

        <View style={rootStyles.bottomBar} />
      </View>

      <HistoryModal
        visible={historyModal}
        history={history}
        onClose={() => setHistoryModal(false)}
        onUse={(val) => {
          setExpression((e) => e + val);
          setHistoryModal(false);
        }}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Static Styles (layout only) ──────────────────────────────────────────────
const rootStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  root: {
    flex: 1,
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  glowBehind: {
    position: 'absolute',
    top: 60,
    left: SCREEN_W * 0.1,
    width: SCREEN_W * 0.8,
    height: 120,
    borderRadius: 80,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 0,
  },
  displayWrap: { marginBottom: 10, height: DISPLAY_H },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BTN_GAP,
    justifyContent: 'flex-start',
    alignContent: 'space-between',
  },
  bottomBar: { height: 0 },
});

const displayStyles = StyleSheet.create({
  display: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  displayStatus: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    alignItems: 'center',
  },
  statusChip: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  historyBtnText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  historyScroll: { maxHeight: 44 },
  historyContent: { alignItems: 'flex-end' },
  historyLine: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  exprScroll: { marginTop: 6 },
  exprContent: { alignItems: 'flex-end', flexGrow: 1 },
  exprText: {
    fontSize: 30,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  resultText: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 0.3,
  },
});

const btnStyles = StyleSheet.create({
  btnTouch: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  btnInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    position: 'relative',
    overflow: 'hidden',
  },
  btnHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  btnFlash: {
    borderRadius: 10,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  btnLabelSm: {
    fontSize: 13,
    fontWeight: '500',
  },
  btnLabelEq: {
    fontSize: 20,
    fontWeight: '700',
  },
  subLabel: {
    position: 'absolute',
    top: 4,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.72,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalExpr: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 4,
  },
  modalResult: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  modalEmptyText: {
    fontSize: 15,
  },
});