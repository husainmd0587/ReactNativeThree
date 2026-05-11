// React Three Fiber Canvas Provider — Modern CAD UI
import React, { Suspense, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber/native'
import { AxisLabels } from './utils/ThreeJs_Utils/text_show';
import {
  View, TouchableOpacity, Text,
  useWindowDimensions, StyleSheet, Animated, Platform,ScrollView
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { PerspectiveCamera, Vector3 } from 'three';
import useControls from 'r3f-native-orbitcontrols';
import { Lightings } from './components/three3d_Objects/lights';
import { CanvaOnCreated, Fallback } from './utils/canvaConfig';
import { playSpindle, stopSpindle, releaseSpindle } from './utils/sound/audio/spindleSound';
import OrbitGestureProvider, {
  CameraOrbitController, useGestureBridge
} from './utils/getsureUtility';

// ─── View Presets ─────────────────────────────────────────────────────────────
const VIEW_PRESETS = [
  { id: 'xy',  label: 'XY',  icon: 'F',  pos: [0,   0,   100], hint: 'Front' },
  { id: 'yz',  label: 'YZ',  icon: 'R',  pos: [100, 0,   0  ], hint: 'Right' },
  { id: 'xz',  label: 'XZ',  icon: 'T',  pos: [0,   100, 0  ], hint: 'Top'   },
  { id: 'iso', label: 'ISO', icon: '⬡', pos: [70,  70,  70 ], hint: 'Iso'   },
];

// ─── Animated Tooltip ─────────────────────────────────────────────────────────
function ViewBtn({ item, onPress, active }) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress(item.pos);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[S.viewBtn, active && S.viewBtnActive]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[S.viewBtnIcon, active && S.viewBtnIconActive]}>{item.icon}</Text>
        <Text style={[S.viewBtnLabel, active && S.viewBtnLabelActive]}>{item.hint}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Compact Item (icon + tiny label, matches original viewBtn style) ──────────
function RailItem({ icon, label, active, onPress, accent }) {
  const scale = useMemo(() => new Animated.Value(1), []);
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  const ac = accent || ACCENT;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, { flex: 1, marginHorizontal: 3 }]}>
      <TouchableOpacity
        style={[
          S.railItem,
          active && {
            backgroundColor: `${ac}14`,
            borderColor: `${ac}60`,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[S.railItemIcon, active && { color: ac }]}>{icon}</Text>
        <Text style={[S.railItemLabel, active && { color: ac }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Sliding Feature Panel (slides right→left from bottom-right) ─────────────
function FeaturePanel({
  visible,
  onToggle,
  activeView,
  onViewChange,
  customGesture,
  onToggleGesture,
  sound,
  onToggleSound,
  onScrollStart,
  onScrollEnd,
  onShowGrid,
  gridHelper
}) {
  const PANEL_W = 380;
  const slideX = useRef(new Animated.Value(PANEL_W)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: visible ? 0 : PANEL_W,
      useNativeDriver: true,
      friction: 18,
      tension: 120,
    }).start();
  }, [visible]);

  return (
    <>
      {/* ‹ › toggle — bottom-right, above status strip */}
      <TouchableOpacity style={[S.panelTab,{bottom:visible?50:0}]} onPress={onToggle} activeOpacity={0.8}>
        <Text style={S.panelTabIcon}>{visible ? '›' : '‹'}</Text>
        <Text style={S.panelTabLabel}>Control</Text>
      </TouchableOpacity>

      {/* Clip wrapper: fixed width anchored to right, hides overflow */}
      <View style={S.panelClip} pointerEvents="box-none">
        <Animated.View
          style={[S.featurePanel, { transform: [{ translateX: slideX }] }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.railRow}
        snapToAlignment="start"
        decelerationRate="fast"
        onScrollBeginDrag={onScrollStart}
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
            >
            {VIEW_PRESETS.map(item => (
              <RailItem
                key={item.id}
                icon={item.icon}
                label={item.hint}
                active={activeView === item.id}
                onPress={() => onViewChange(item.pos, item.id)}
                accent={ACCENT}
              />
            ))}

            <View style={S.railDivider} />

            <RailItem
              icon={customGesture ? '✋' : '⊕'}
              label={customGesture ? 'GES' : 'ORB'}
              active={customGesture}
              onPress={onToggleGesture}
              accent={ACCENT2}
            />

            <RailItem
              icon={sound ? '🔊' : '🔇'}
              label={sound ? 'SND' : 'MUT'}
              active={sound}
              onPress={onToggleSound}
              accent={ACCENT2}
            />

            <RailItem
              icon={'#'}
              label={'GRID'}
              active={gridHelper}
              onPress={onShowGrid}
              accent={ACCENT2}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </>
  );
}

// ─── Canvas Overlay — top-right coordinate badge ──────────────────────────────
function CoordBadge({ pos }) {
  const fmt = (n) => n.toFixed(0)
  return (
    <View style={S.coordBadge} pointerEvents="none">
      <Text style={S.coordText}>
        X<Text style={S.coordVal}> {fmt(pos[0])}</Text>{'  '}
        Y<Text style={S.coordVal}> {fmt(pos[1])}</Text>{'  '}
        Z<Text style={S.coordVal}> {fmt(pos[2])}</Text>
      </Text>
    </View>
  );
}

// ─── Camera Tracker ───────────────────────────────────────────────────────────
function CameraPositionTracker({ onChange }) {
  const { camera } = useThree();
  const last = useRef([0, 0, 0]);

  useFrame(() => {
    const { x, y, z } = camera.position;
    if (last.current[0] !== x || last.current[1] !== y || last.current[2] !== z) {
      last.current = [x, y, z];
      onChange([x, y, z]);
    }
  });

  return null;
}

// ─── Main Provider ────────────────────────────────────────────────────────────
const CanvaProvider = ({ children, style = { flex: 1 },camPosition=[0, 0, 100] }) => {
  const [customGesture, setCustomGesture] = useState(false);
  const [sound, setSound]                 = useState(true);
  const [activeView, setActiveView]       = useState('xy');
  const [camPos, setCamPos]               = useState(camPosition);
  const [panelOpen, setPanelOpen]         = useState(false);
  
  const { width, height } = useWindowDimensions();
  const [OrbitControls, events] = useControls();
  const [gridHelper, setGridHelper] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const camera = useMemo(() => {
    const cam = new PerspectiveCamera(75, width / height, 0.1, 1000);
    cam.position.set(...camPosition);
    cam.lookAt(0, 0, 0);
    return cam;
  }, [width, height]);

const changePlane = useCallback((pos, id) => {

  const distance = camera.position.length()
  let dir = new Vector3(...pos).normalize()
  const newPos = dir.multiplyScalar(distance)

  camera.position.copy(newPos)

  // 🔥 FIX: set proper up vector
  if (id === 'xz') {            // TOP
    camera.up.set(0, 0, -1)     // or (0,0,1) depending on orientation
  } 
  else {
    camera.up.set(0, 1, 0)      // default for front/right
  }

  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  setActiveView(id)
  setCamPos([newPos.x, newPos.y, newPos.z])

}, [camera])


  const toggleSound = useCallback(() => {
    if (sound) stopSpindle(); else playSpindle();
    setSound(s => !s);
  }, [sound]);

  const toggleGesture = useCallback(() => setCustomGesture(g => !g), []);
  const togglePanel   = useCallback(() => setPanelOpen(p => !p), []);

  useEffect(() => {
    return () => { stopSpindle(); releaseSpindle(); };
  }, []);

  const gesture = useGestureBridge();

  return (
    <OrbitGestureProvider
      enabled={customGesture}
      onGestureChange={gesture.onGestureChange}
      onGestureEnd={gesture.onGestureEnd}
    >
    <View style={[S.root, style]}{...(!customGesture && !isScrolling ? events : {})}>
        <Canvas
          camera={camera}
          shadows
          dpr={[1, 2]}
          gl={{ physicallyCorrectLights: true }}
          onCreated={CanvaOnCreated}
          fallback={Fallback}
        >
          <Suspense fallback={null}>
            <CameraOrbitController
              vx={gesture?.vx}
              vy={gesture?.vy}
              enabled={customGesture}
            />
            {children}
          </Suspense>
          <color attach="background" args={['#434344']} />
          <Lightings />
            {!customGesture && ( <OrbitControls enabled={!isScrolling} />)}
          <CameraPositionTracker onChange={setCamPos} />
          {gridHelper && <gridHelper args={[100, 80, '#1a2a3a', '#1a2a3a']} position={[0, 0, 0]} />}
          <AxisLabels size={20} />
        </Canvas>

        {/* ── Grid lines overlay ── */}
        <View style={S.gridOverlay} pointerEvents="none">
          <View style={S.gridH} />
          <View style={S.gridV} />
        </View>

      

        {/* ── Sliding Feature Panel + Toggle Tab ── */}
        <FeaturePanel
          visible={panelOpen}
          onToggle={togglePanel}
          activeView={activeView}
          onViewChange={changePlane}
          customGesture={customGesture}
          onToggleGesture={toggleGesture}
          sound={sound}
          onToggleSound={toggleSound}
          onScrollStart={() => setIsScrolling(true)}
          onScrollEnd={() => setIsScrolling(false)}
          onShowGrid={ ()=>setGridHelper(!gridHelper)}
          gridHelper={gridHelper}
        />

        {/* ── Bottom status strip ── */}
        <View style={[S.statusStrip,{display:'none'}]} pointerEvents="none" >
          <View style={S.statusDot} />
          <Text style={S.statusTxt}>
            {/* {customGesture ? 'GESTURE MODE' : 'ORBIT MODE'} */}
            {/* {'  ·  '} */}
            {VIEW_PRESETS.find(v => v.id === activeView)?.hint ?? ''} VIEW
          </Text>
            {/* ── Coordinate Badge ── */}
           <CoordBadge pos={camPos} />
        </View>

      </View>
    </OrbitGestureProvider>
  );
};

export default CanvaProvider;

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACCENT   = '#0066cc';
const ACCENT2  = '#00aa88';
const BG       = '#f0f2f5';
const SURFACE  = '#e8eaed';
const BORDER   = '#9fa1a5';
const TEXT     = '#1a1f2e';
const MUTED    = '#7a8299';
const GLASS_BG = 'rgba(240,242,245,0.95)';

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    overflow: 'hidden', 
  },

  // ── Grid cross-hair overlay
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridH: {
    position: 'absolute',
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,170,255,0.06)',
  },
  gridV: {
    position: 'absolute',
    height: '100%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,170,255,0.06)',
  },

  // ── Coordinate badge
  coordBadge: {
  },
  coordText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 10,
    color: MUTED,
  },
  coordVal: {
    color: ACCENT,
    fontWeight: '700',
  },

  // ── ‹ › toggle button — bottom-right, above status strip
  panelTab: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    height: 40,
    // backgroundColor: GLASS_BG,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    zIndex: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 1, height: 1},
    shadowRadius: 6,
    elevation: 0,
  },
  panelTabIcon: {
    fontSize: 20,
    color: ACCENT,
    fontWeight: '700',
    lineHeight:20
  },
  panelTabLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 10,
    color: MUTED,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── Panel — anchored bottom-right, slides right→left via translateX
  featurePanel: {
    position: 'absolute',
    bottom: 0,          // above status strip (26) + tab (28)
    right: 0,
    left: 10,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    zIndex: 15,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Horizontal row — space-between
railRow: {
  alignItems: 'center',
  paddingHorizontal: 6,
  gap: 8, // clean spacing between items
},

  // ── Each item gets a card-style box
railItem: {
  minWidth:35,
  height:35,
  paddingVertical: 2,
  paddingHorizontal:5,
  borderRadius: 7,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#d6d8dc',
  shadowColor: '#bdeeb6',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.8,
  shadowRadius: 2,
  elevation: 1,
},
  railItemIcon: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: MUTED,
    fontWeight: '800',
    lineHeight: 18,
  },
  railItemLabel: {
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: MUTED,
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ── Vertical divider between groups
  railDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: BORDER,
    marginHorizontal: 2,
  },

  // ── Status strip
  statusStrip: {
    position: 'absolute',
    top: -8,
    left: 0,
    height: 26,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
   
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ACCENT2,
    shadowColor: ACCENT2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  statusTxt: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 9,
    color: MUTED,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
});