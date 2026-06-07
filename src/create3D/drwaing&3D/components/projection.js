/**
 * OrthographicProjectionScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Premium engineering-education component — React Native
 * 3D viewer: @react-three/fiber/native  ·  PanResponder rotation (no drei needed)
 *
 * Drop-in dependencies:
 *   react-native-reanimated, @react-three/fiber (native), three
 *   (NO @react-three/drei — OrbitControls crashes on RN, replaced with PanResponder)
 *
 * GLB PLACEHOLDER ─ replace every 'YOUR_MODEL.glb' with your actual asset,
 * e.g.  require('../assets/models/orthographic_box.glb')
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState, useCallback, Suspense, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          '#0A0C10',
  surface:     '#111419',
  surfaceHi:   '#181D24',
  border:      '#1E2530',
  accent:      '#00C2FF',
  accentDim:   '#00C2FF22',
  accentSoft:  '#00C2FF11',
  gold:        '#F5A623',
  goldDim:     '#F5A62322',
  green:       '#00E096',
  greenDim:    '#00E09622',
  red:         '#FF4D6A',
  redDim:      '#FF4D6A22',
  text:        '#E8EDF5',
  textSub:     '#7A8599',
  textDim:     '#3A4455',
  white:       '#FFFFFF',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const VIEWS_DATA = [
  {
    id: 'front',
    label: 'Front View',
    plane: 'VP  (Vertical Plane)',
    symbol: 'F',
    color: C.accent,
    angle: '0°',
    description:
      'The projection on the Vertical Plane (VP) seen from the front of the object. Also called the Elevation. This is the most descriptive view and is always drawn first.',
    keyFact: 'Shows Height × Width',
  },
  {
    id: 'top',
    label: 'Top View',
    plane: 'HP  (Horizontal Plane)',
    symbol: 'T',
    color: C.green,
    angle: '90° ↓',
    description:
      'Projection on the Horizontal Plane (HP) seen from directly above. Also called the Plan View. Projected downward below the front view in First Angle, above in Third Angle.',
    keyFact: 'Shows Width × Depth',
  },
  {
    id: 'side',
    label: 'Side View (R/L)',
    plane: 'PP  (Profile Plane)',
    symbol: 'S',
    color: C.gold,
    angle: '90° →',
    description:
      'Projection on the Profile Plane (PP). Placed to the right (First Angle) or left (Third Angle) of the front view. Completes the three-view set needed to fully define most objects.',
    keyFact: 'Shows Height × Depth',
  },
];

const PRINCIPLES = [
  { icon: '⊞', title: 'Parallel Projectors', body: 'All projection lines are parallel to each other and perpendicular to the projection plane — unlike perspective drawing.' },
  { icon: '📐', title: 'True Shape & Size', body: 'Any face parallel to the projection plane projects as its true shape and true dimensions — no foreshortening on that plane.' },
  { icon: '🔄', title: 'Three Planes', body: 'VP (Frontal), HP (Horizontal), PP (Profile) are mutually perpendicular, meeting at the Origin. Together they fully define 3D space.' },
  { icon: '📏', title: 'Alignment Rule', body: 'Height is shared between Front and Side views. Width is shared between Front and Top views. Depth is shared between Top and Side views.' },
];

const MISTAKES = [
  { wrong: 'Confusing First Angle and Third Angle symbol on drawings', fix: 'First Angle → circle with truncated cone pointing left. Third Angle → cone pointing right.' },
  { wrong: 'Showing hidden edges with solid lines', fix: 'All hidden/invisible edges MUST be dashed lines (- - - - -).' },
  { wrong: 'Misaligning the three views', fix: 'Use construction lines: views must align horizontally (Front ↔ Side) and vertically (Front ↔ Top).' },
  { wrong: 'Mixing units or scale within one drawing', fix: 'One drawing = one scale. State it in the title block, e.g. 1:2.' },
];

const VIVA_QA = [
  { q: 'What is orthographic projection?', a: 'A method of representing a 3D object on a 2D plane using parallel projectors perpendicular to the plane, producing a view that shows true shape and size.' },
  { q: 'Name the three principal planes of projection.', a: 'Vertical Plane (VP), Horizontal Plane (HP), and Profile Plane (PP). They intersect at right angles at a common origin.' },
  { q: 'What is the difference between First and Third Angle projection?', a: 'In First Angle (ISO), the object is between the observer and the plane — Top view goes below Front view. In Third Angle (ANSI), the plane is between observer and object — Top view goes above Front view.' },
  { q: 'What does "true length" mean in projection?', a: 'A line is true length when it is parallel to the projection plane. It then projects at its actual measured length, with no foreshortening.' },
  { q: 'How many views are typically needed to fully describe an object?', a: 'Generally three views (Front, Top, Side), but simple symmetrical objects may need only two, while complex objects may require auxiliary views.' },
];

const EXAMPLES = [
  { object: 'Rectangular Block', front: 'Rectangle', top: 'Rectangle', side: 'Rectangle', note: 'All views are rectangles — simplest case.' },
  { object: 'Cylinder', front: 'Rectangle', top: 'Circle', side: 'Rectangle', note: 'Top view reveals the circular cross-section.' },
  { object: 'Cone', front: 'Triangle', top: 'Circle + centre point', side: 'Triangle', note: 'Apex visible as a point in top view.' },
  { object: 'Triangular Prism', front: 'Rectangle', top: 'Triangle', side: 'Rectangle/Triangle', note: 'Side view depends on orientation.' },
];

// ─── 3D Scene ─────────────────────────────────────────────────────────────────
// rotRef is a shared { x, y } object updated by PanResponder on the JS thread
// and read inside useFrame (also JS thread in RN R3F) — safe, no Reanimated needed.
function OrthographicScene({ rotRef }) {
  const groupRef = useRef();

  // Pre-build the edge geometry once (never inside JSX attributes)
  const axisGeo = useMemo(() => new THREE.BoxGeometry(3.2, 0.008, 0.008), []);

  useFrame(() => {
    if (!groupRef.current) return;
    // Smoothly lerp toward the target rotation driven by pan gesture
    groupRef.current.rotation.y += (rotRef.current.y - groupRef.current.rotation.y) * 0.12;
    groupRef.current.rotation.x += (rotRef.current.x - groupRef.current.rotation.x) * 0.12;
    // Gentle auto-rotate when user isn't dragging
    if (!rotRef.current.dragging) {
      rotRef.current.y += 0.004;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0.6, 0]}>
      {/* ── Main stepped block ── */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 1, 1.2]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.45} roughness={0.45} />
      </mesh>
      <mesh position={[0.42, 0.38, 0]}>
        <boxGeometry args={[0.78, 0.27, 1.22]} />
        <meshStandardMaterial color="#0A0C10" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ── Semi-transparent projection planes ── */}
      {/* Front – VP */}
      <mesh position={[0, 0, 1.5]}>
        <planeGeometry args={[2.6, 2.0]} />
        <meshStandardMaterial color="#00C2FF" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Top – HP */}
      <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 2.2]} />
        <meshStandardMaterial color="#00E096" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Side – PP */}
      <mesh position={[1.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.2, 2.0]} />
        <meshStandardMaterial color="#F5A623" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* ── Axis indicator (X-axis bar) ── */}
      <lineSegments geometry={axisGeo}>
        <lineBasicMaterial color="#00C2FF" transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, delay = 0 }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
}

function ViewCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const height = useSharedValue(0);
  const chevron = useSharedValue(0);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    height.value = withSpring(next ? 1 : 0, { damping: 14 });
    chevron.value = withTiming(next ? 1 : 0, { duration: 250 });
  };

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(height.value, [0, 1], [0, 200], Extrapolation.CLAMP),
    opacity: height.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevron.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 100).duration(400)}
      style={[styles.viewCard, { borderLeftColor: item.color }]}
    >
      <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.viewCardHeader}>
        <View style={[styles.viewSymbol, { backgroundColor: item.color + '22', borderColor: item.color + '55' }]}>
          <Text style={[styles.viewSymbolText, { color: item.color }]}>{item.symbol}</Text>
        </View>
        <View style={styles.viewCardMeta}>
          <Text style={styles.viewCardLabel}>{item.label}</Text>
          <Text style={styles.viewCardPlane}>{item.plane}</Text>
        </View>
        <View style={styles.viewCardRight}>
          <View style={[styles.anglePill, { borderColor: item.color + '55' }]}>
            <Text style={[styles.anglePillText, { color: item.color }]}>{item.angle}</Text>
          </View>
          <Animated.Text style={[styles.chevron, chevronStyle]}>›</Animated.Text>
        </View>
      </TouchableOpacity>

      <Animated.View style={bodyStyle}>
        <View style={[styles.viewCardBody, { borderTopColor: item.color + '22' }]}>
          <Text style={styles.viewCardDesc}>{item.description}</Text>
          <View style={[styles.keyFactChip, { backgroundColor: item.color + '15', borderColor: item.color + '40' }]}>
            <Text style={styles.keyFactIcon}>📏</Text>
            <Text style={[styles.keyFactText, { color: item.color }]}>{item.keyFact}</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function PrincipleCard({ item, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(350)} style={styles.principleCard}>
      <Text style={styles.principleIcon}>{item.icon}</Text>
      <View style={styles.principleBody}>
        <Text style={styles.principleTitle}>{item.title}</Text>
        <Text style={styles.principleText}>{item.body}</Text>
      </View>
    </Animated.View>
  );
}

function MistakeCard({ item, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70)} style={styles.mistakeCard}>
      <View style={styles.mistakeWrong}>
        <Text style={styles.mistakeTag}>✗ COMMON MISTAKE</Text>
        <Text style={styles.mistakeWrongText}>{item.wrong}</Text>
      </View>
      <View style={styles.mistakeFix}>
        <Text style={styles.mistakeTag2}>✓ CORRECT APPROACH</Text>
        <Text style={styles.mistakeFixText}>{item.fix}</Text>
      </View>
    </Animated.View>
  );
}

function VivaCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const prog = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    prog.value = withSpring(next ? 1 : 0, { damping: 16 });
  };

  const answerStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(prog.value, [0, 1], [0, 160], Extrapolation.CLAMP),
    opacity: prog.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={styles.vivaCard}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <View style={styles.vivaQ}>
          <Text style={styles.vivaNum}>Q{index + 1}</Text>
          <Text style={styles.vivaQText}>{item.q}</Text>
          <Text style={[styles.chevron, { marginLeft: 4 }]}>{open ? '∨' : '›'}</Text>
        </View>
      </TouchableOpacity>
      <Animated.View style={answerStyle}>
        <Text style={styles.vivaAText}>{item.a}</Text>
      </Animated.View>
    </Animated.View>
  );
}

function ExampleRow({ item, index }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={styles.exampleRow}>
      <Text style={styles.exampleObject}>{item.object}</Text>
      <View style={styles.exampleViews}>
        <View style={[styles.exampleViewPill, { borderColor: C.accent + '55' }]}>
          <Text style={[styles.exampleViewLabel, { color: C.accent }]}>F</Text>
          <Text style={styles.exampleViewText}>{item.front}</Text>
        </View>
        <View style={[styles.exampleViewPill, { borderColor: C.green + '55' }]}>
          <Text style={[styles.exampleViewLabel, { color: C.green }]}>T</Text>
          <Text style={styles.exampleViewText}>{item.top}</Text>
        </View>
        <View style={[styles.exampleViewPill, { borderColor: C.gold + '55' }]}>
          <Text style={[styles.exampleViewLabel, { color: C.gold }]}>S</Text>
          <Text style={styles.exampleViewText}>{item.side}</Text>
        </View>
      </View>
      <Text style={styles.exampleNote}>{item.note}</Text>
    </Animated.View>
  );
}

function KeyPointsSummary() {
  const points = [
    'Parallel projectors perpendicular to plane',
    'Three mutually perpendicular planes: VP, HP, PP',
    'True shape appears on the parallel plane',
    'First Angle (ISO) vs Third Angle (ANSI/ASME)',
    'Hidden edges shown as dashed lines',
    'Views must align using construction lines',
  ];
  return (
    <Animated.View entering={ZoomIn.duration(400)} style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>⚡ Key Points Summary</Text>
      {points.map((p, i) => (
        <View key={i} style={styles.summaryRow}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryText}>{p}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Canvas Viewer (self-contained, no OrbitControls) ─────────────────────────
// PanResponder runs entirely on the JS thread — no DOM event listeners involved.
function CanvasViewer() {
  // Plain mutable ref — not Reanimated, not React state — to share with useFrame
  const rotRef = useRef({ x: 0.25, y: 0.6, dragging: false });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          rotRef.current.dragging = true;
        },
        onPanResponderMove: (_, gs) => {
          rotRef.current.y += gs.dx * 0.008;
          rotRef.current.x += gs.dy * 0.008;
          // Clamp vertical tilt to avoid flipping
          rotRef.current.x = Math.max(-1.0, Math.min(1.0, rotRef.current.x));
        },
        onPanResponderRelease: () => {
          rotRef.current.dragging = false;
        },
        onPanResponderTerminate: () => {
          rotRef.current.dragging = false;
        },
      }),
    []
  );

  return (
    <View style={styles.canvas} {...panResponder.panHandlers}>
      <Canvas
        style={StyleSheet.absoluteFill}
        camera={{ position: [3, 2.5, 3.5], fov: 40 }}
      >
        <color attach="background" args={['#0D1117']} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} />
        <pointLight position={[-3, 3, -2]} color="#00C2FF" intensity={0.7} />
        <pointLight position={[3, -2, 3]} color="#00E096" intensity={0.45} />
        <Suspense fallback={null}>
          <OrthographicScene rotRef={rotRef} />
        </Suspense>
      </Canvas>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrthographicProjectionScreen({ navigation }) {
  const scrollRef = useRef(null);
  const headerOpacity = useSharedValue(0);
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' | 'quiz'
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);

  const QUIZ = [
    {
      q: 'In First Angle projection, where is the Top view placed relative to the Front view?',
      opts: ['Above', 'Below', 'To the Left', 'Anywhere'],
      ans: 1,
    },
    {
      q: 'What type of lines represent hidden edges in orthographic drawings?',
      opts: ['Solid thick', 'Centre line', 'Dashed thin', 'Chain line'],
      ans: 2,
    },
    {
      q: 'Which view reveals the circular cross-section of a vertical cylinder?',
      opts: ['Front view', 'Side view', 'Top view', 'Auxiliary view'],
      ans: 2,
    },
    {
      q: 'In orthographic projection, the projectors are:',
      opts: ['Converging at a point', 'Parallel & perpendicular to plane', 'Parallel & oblique to plane', 'Radiating from object'],
      ans: 1,
    },
  ];

  const handleScroll = ({ nativeEvent }) => {
    const y = nativeEvent.contentOffset.y;
    headerOpacity.value = withTiming(y > 60 ? 1 : 0, { duration: 200 });
  };

  const floatingHeaderStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const submitQuiz = (optIdx) => setQuizAnswer(optIdx);
  const nextQuiz = () => { setQuizAnswer(null); setQuizIdx((i) => (i + 1) % QUIZ.length); };

  const current = QUIZ[quizIdx];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Floating sticky header */}
      <Animated.View style={[styles.floatingHeader, floatingHeaderStyle]}>
        <Text style={styles.floatingHeaderText}>Orthographic Projection</Text>
      </Animated.View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {['learn', 'quiz'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'learn' ? '📖  Learn' : '🎯  Quiz'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'quiz' ? (
        /* ── QUIZ TAB ─────────────────────────────────────────────── */
        <View style={styles.quizContainer}>
          <Animated.View entering={FadeIn} style={styles.quizCard}>
            <Text style={styles.quizProgress}>Question {quizIdx + 1} / {QUIZ.length}</Text>
            <Text style={styles.quizQ}>{current.q}</Text>
            {current.opts.map((opt, i) => {
              let bg = styles.quizOpt;
              if (quizAnswer !== null) {
                if (i === current.ans) bg = styles.quizOptCorrect;
                else if (i === quizAnswer) bg = styles.quizOptWrong;
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.quizOpt, quizAnswer !== null && i === current.ans && styles.quizOptCorrect, quizAnswer !== null && i === quizAnswer && i !== current.ans && styles.quizOptWrong]}
                  disabled={quizAnswer !== null}
                  onPress={() => submitQuiz(i)}
                >
                  <Text style={styles.quizOptLetter}>{String.fromCharCode(65 + i)}</Text>
                  <Text style={styles.quizOptText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {quizAnswer !== null && (
              <Animated.View entering={FadeInDown} style={styles.quizResult}>
                <Text style={styles.quizResultText}>
                  {quizAnswer === current.ans ? '✅ Correct!' : `❌ Answer: ${current.opts[current.ans]}`}
                </Text>
                <TouchableOpacity onPress={nextQuiz} style={styles.quizNext}>
                  <Text style={styles.quizNextText}>Next →</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      ) : (
        /* ── LEARN TAB ────────────────────────────────────────────── */
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ENGINEERING DRAWING  ·  MODULE 02</Text>
            </View>
            <Text style={styles.heroTitle}>Orthographic{'\n'}Projection</Text>
            <Text style={styles.heroSub}>
              The universal language of engineering design — converting 3D objects into precise, measurable 2D views.
            </Text>
            <View style={styles.heroStats}>
              {[['3', 'Principal\nPlanes'], ['2', 'Standard\nSystems'], ['∞', 'Engineering\nApplications']].map(([val, lbl], i) => (
                <View key={i} style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{val}</Text>
                  <Text style={styles.heroStatLbl}>{lbl}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Definition ── */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.definitionCard}>
            <Text style={styles.definitionLabel}>DEFINITION</Text>
            <Text style={styles.definitionText}>
              Orthographic projection is a means of representing a three-dimensional object in two dimensions using{' '}
              <Text style={styles.definitionHighlight}>parallel projectors</Text> that are{' '}
              <Text style={styles.definitionHighlight}>perpendicular to the projection plane</Text>, producing views that preserve true shape and size.
            </Text>
          </Animated.View>

          {/* ── 3D Viewer ── */}
          <SectionHeader icon="🧊" title="Interactive 3D Model" subtitle="Drag to rotate" delay={150} />
          <Animated.View entering={FadeInDown.delay(200)} style={styles.canvasWrapper}>
            <CanvasViewer />
            <View style={styles.canvasLegend}>
              {[['■', C.accent, 'VP (Front)'], ['■', C.green, 'HP (Top)'], ['■', C.gold, 'PP (Side)']].map(([sym, col, lbl]) => (
                <View key={lbl} style={styles.legendItem}>
                  <Text style={[styles.legendDot, { color: col }]}>{sym}</Text>
                  <Text style={styles.legendLabel}>{lbl}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Why Important ── */}
          <SectionHeader icon="💡" title="Why It Matters" delay={250} />
          <Animated.View entering={FadeInDown.delay(280)} style={styles.whyCard}>
            <Text style={styles.whyText}>
              Every engineering drawing — from a smartphone bracket to an aircraft engine — uses orthographic projection.
              It provides the <Text style={styles.whyHighlight}>unambiguous, dimensioned views</Text> that machinists, fabricators,
              and inspectors rely on to manufacture and verify components to tight tolerances. Without it, global supply chains
              could not function.
            </Text>
          </Animated.View>

          {/* ── Three Views ── */}
          <SectionHeader icon="📐" title="The Three Principal Views" subtitle="Tap a card to expand" delay={300} />
          {VIEWS_DATA.map((item, i) => <ViewCard key={item.id} item={item} index={i} />)}

          {/* ── Principles ── */}
          <SectionHeader icon="⚙️" title="Core Principles" delay={400} />
          {PRINCIPLES.map((item, i) => <PrincipleCard key={i} item={item} index={i} />)}

          {/* ── Real Examples ── */}
          <SectionHeader icon="🔩" title="Real Engineering Examples" subtitle="What each view looks like" delay={450} />
          <View style={styles.exampleTable}>
            <View style={styles.exampleTableHeader}>
              <Text style={[styles.exampleHeaderCell, { flex: 1.4 }]}>Object</Text>
              <Text style={[styles.exampleHeaderCell, { color: C.accent }]}>Front</Text>
              <Text style={[styles.exampleHeaderCell, { color: C.green }]}>Top</Text>
              <Text style={[styles.exampleHeaderCell, { color: C.gold }]}>Side</Text>
            </View>
            {EXAMPLES.map((item, i) => (
              <ExampleRow key={i} item={item} index={i} />
            ))}
          </View>

          {/* ── Common Mistakes ── */}
          <SectionHeader icon="⚠️" title="Common Mistakes" subtitle="Avoid losing marks" delay={500} />
          {MISTAKES.map((item, i) => <MistakeCard key={i} item={item} index={i} />)}

          {/* ── Key Points ── */}
          <KeyPointsSummary />

          {/* ── Viva Questions ── */}
          <SectionHeader icon="🎓" title="Viva / Interview Questions" subtitle="Tap to reveal answers" delay={600} />
          {VIVA_QA.map((item, i) => <VivaCard key={i} item={item} index={i} />)}

          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Floating header
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
    backgroundColor: C.bg + 'EE', paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  floatingHeaderText: { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    marginTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabText: { color: C.textSub, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3 },
  tabTextActive: { color: C.accent },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14, marginTop: 28,
  },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  sectionSubtitle: { color: C.textSub, fontSize: 11.5, marginTop: 1 },

  // Hero
  hero: {
    backgroundColor: C.surface, borderRadius: 20,
    padding: 22, borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: C.accentDim,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.accent + '33', marginBottom: 14,
  },
  heroBadgeText: { color: C.accent, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 },
  heroTitle: { color: C.white, fontSize: 34, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5, marginBottom: 10 },
  heroSub: { color: C.textSub, fontSize: 13.5, lineHeight: 20, marginBottom: 20 },
  heroStats: { flexDirection: 'row', gap: 0 },
  heroStat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: C.border },
  heroStatVal: { color: C.accent, fontSize: 26, fontWeight: '800' },
  heroStatLbl: { color: C.textSub, fontSize: 10, textAlign: 'center', lineHeight: 13, marginTop: 2 },

  // Definition
  definitionCard: {
    backgroundColor: C.accentSoft, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: C.accent + '30', marginBottom: 8,
  },
  definitionLabel: { color: C.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  definitionText: { color: C.text, fontSize: 14, lineHeight: 22 },
  definitionHighlight: { color: C.accent, fontWeight: '700' },

  // Canvas
  canvasWrapper: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
    borderColor: C.border, marginBottom: 8,
    backgroundColor: '#0D1117',
  },
  canvas: { width: '100%', height: 240 },
  canvasLegend: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { fontSize: 12 },
  legendLabel: { color: C.textSub, fontSize: 11 },

  // Why card
  whyCard: {
    backgroundColor: C.surfaceHi, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  whyText: { color: C.textSub, fontSize: 13.5, lineHeight: 21 },
  whyHighlight: { color: C.text, fontWeight: '600' },

  // View cards
  viewCard: {
    backgroundColor: C.surface, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, overflow: 'hidden',
  },
  viewCardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  viewSymbol: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  viewSymbolText: { fontSize: 18, fontWeight: '800' },
  viewCardMeta: { flex: 1 },
  viewCardLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
  viewCardPlane: { color: C.textSub, fontSize: 11, marginTop: 2 },
  viewCardRight: { alignItems: 'flex-end', gap: 4 },
  anglePill: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
  },
  anglePillText: { fontSize: 11, fontWeight: '700' },
  chevron: { color: C.textSub, fontSize: 20, fontWeight: '300' },
  viewCardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  viewCardDesc: { color: C.textSub, fontSize: 13, lineHeight: 20, marginTop: 12, marginBottom: 10 },
  keyFactChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  keyFactIcon: { fontSize: 13 },
  keyFactText: { fontSize: 12, fontWeight: '700' },

  // Principles
  principleCard: {
    flexDirection: 'row', backgroundColor: C.surfaceHi, borderRadius: 13,
    padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: C.border,
  },
  principleIcon: { fontSize: 22, marginTop: 2 },
  principleBody: { flex: 1 },
  principleTitle: { color: C.text, fontSize: 13.5, fontWeight: '700', marginBottom: 4 },
  principleText: { color: C.textSub, fontSize: 13, lineHeight: 19 },

  // Example table
  exampleTable: {
    backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  exampleTableHeader: {
    flexDirection: 'row', backgroundColor: C.surfaceHi,
    paddingHorizontal: 14, paddingVertical: 10, gap: 4,
  },
  exampleHeaderCell: { flex: 1, color: C.textSub, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  exampleRow: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  exampleObject: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  exampleViews: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  exampleViewPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, flex: 1,
  },
  exampleViewLabel: { fontSize: 11, fontWeight: '800' },
  exampleViewText: { color: C.textSub, fontSize: 11, flex: 1 },
  exampleNote: { color: C.textDim, fontSize: 11.5, fontStyle: 'italic' },

  // Mistakes
  mistakeCard: {
    backgroundColor: C.surface, borderRadius: 13, overflow: 'hidden',
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  mistakeWrong: { backgroundColor: C.redDim, padding: 13, borderBottomWidth: 1, borderBottomColor: C.red + '22' },
  mistakeFix: { backgroundColor: C.greenDim, padding: 13 },
  mistakeTag: { color: C.red, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  mistakeTag2: { color: C.green, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  mistakeWrongText: { color: C.text, fontSize: 13, lineHeight: 19 },
  mistakeFixText: { color: C.text, fontSize: 13, lineHeight: 19 },

  // Summary
  summaryCard: {
    backgroundColor: C.accentDim, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.accent + '44', marginTop: 24, marginBottom: 8,
  },
  summaryTitle: { color: C.accent, fontSize: 15, fontWeight: '800', marginBottom: 14, letterSpacing: 0.2 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  summaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 6 },
  summaryText: { color: C.text, fontSize: 13, flex: 1, lineHeight: 19 },

  // Viva
  vivaCard: {
    backgroundColor: C.surface, borderRadius: 13, marginBottom: 8,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  vivaQ: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10,
  },
  vivaNum: {
    backgroundColor: C.accentDim, color: C.accent, fontSize: 11, fontWeight: '800',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.accent + '44',
  },
  vivaQText: { color: C.text, fontSize: 13.5, flex: 1, lineHeight: 20 },
  vivaAText: {
    color: C.textSub, fontSize: 13, lineHeight: 20,
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2,
  },

  // Quiz
  quizContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  quizCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  quizProgress: { color: C.textSub, fontSize: 11.5, marginBottom: 12, fontWeight: '600', letterSpacing: 0.5 },
  quizQ: { color: C.text, fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 20 },
  quizOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceHi, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  quizOptCorrect: { backgroundColor: C.greenDim, borderColor: C.green + '66' },
  quizOptWrong: { backgroundColor: C.redDim, borderColor: C.red + '66' },
  quizOptLetter: { color: C.textSub, fontSize: 13, fontWeight: '800', width: 20, textAlign: 'center' },
  quizOptText: { color: C.text, fontSize: 14, flex: 1, lineHeight: 20 },
  quizResult: { marginTop: 16, alignItems: 'center', gap: 12 },
  quizResultText: { color: C.text, fontSize: 15, fontWeight: '700' },
  quizNext: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  quizNextText: { color: '#000', fontWeight: '800', fontSize: 14 },
});