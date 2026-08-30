import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StatusBar, Platform,
  Animated, Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useControls from 'r3f-native-orbitcontrols';
import CanvaPovider from '../../../utils/ThreeJs_Utils/provider';
import * as THREE from 'three';

import {
  TOOLS, MATERIALS, BASE_RPM, MIN_RPM, MAX_RPM, RPM_STEP,
  SAVED_PARTS_KEY, TOOLBAR_H, PROFILE_SEGS,
  MOTOR_IMAGE_BOTTOM, MOTOR_IMAGE_LEFT, MOTOR_IMAGE_SIZE,
} from './constants';
import { clamp, makeProfile, smooth, getToolDescription } from './utils';
import { styles } from './styles';

import { DrawingCanvas } from './components/DrawingCanvas';
import { Scene3D } from './components/Scene3D';
import { MotorPreview } from './components/Motor3D';
import { MotorPowerSwitch, MagazineToggleButton, MagazineCloseButton } from './components/UIComponents';

// ── Main Screen ───────────────────────────────────────────────
export default function FreehandTurning() {
  const [profile, setProfile] = useState(makeProfile);
  const [tool, setTool] = useState(TOOLS[0]);
  const [is3D, setIs3D] = useState(false);
  const [matIdx, setMatIdx] = useState(0);
  const mat = MATERIALS[matIdx];
  const [autoRotate, setAutoRot] = useState(true);
  const [OrbitControls, events] = useControls();
  const [showTooltip, setShowTooltip] = useState(null);

  const orbitTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // ── Power: defaults OFF ────────────────────────────────────
  // The lathe starts powered down -- stock isn't spinning, the
  // motor/pulley rig is idle, and the cutting gesture (gated inside
  // DrawingCanvas via a shared value) won't carve. Flipping this on
  // is the single source of truth that brings every one of those
  // back in sync in the same render/frame -- nothing partially
  // "turns on".
  const [isPowered, setIsPowered] = useState(false);
  const togglePower = useCallback(() => {
    setIsPowered(prev => !prev);
  }, []);

  // ── Motor/pulley load gating ──
  // The 2D stock's spin texture shouldn't start until the 3D motor +
  // pulley assembly (MotorPreview) has actually loaded and is
  // visible -- otherwise the stock appears to spin with no visible
  // drive mechanism behind it. The timeout is a safety net: if
  // `onLoad` never fires, the stock still unblocks on its own after
  // a few seconds instead of staying frozen forever.
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const handleModelsLoaded = useCallback(() => setModelsLoaded(true), []);
  useEffect(() => {
    const t = setTimeout(() => setModelsLoaded(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // ── Spindle speed ──
  const [rpm, setRpm] = useState(BASE_RPM);
  const adjustRpm = useCallback((delta) => {
    setRpm(r => clamp(r + delta, MIN_RPM, MAX_RPM));
  }, []);

  // ── Live RPM ref for the frozen motor/pulley/belt preview ──
  const rpmRef = useRef(rpm);
  useEffect(() => { rpmRef.current = rpm; }, [rpm]);

  // ── Tool wear, catches, finish quality ──
  const [toolWear, setToolWear] = useState({});
  const [catches, setCatches] = useState(0);
  const [finishScore, setFinishScore] = useState(100);
  const currentWear = toolWear[tool.id] || 0;

  const handleWear = useCallback((toolId, val) => {
    setToolWear(w => ({ ...w, [toolId]: val }));
  }, []);
  const handleCatch = useCallback(() => {
    setCatches(c => c + 1);
    setFinishScore(s => clamp(s - 8, 0, 100));
  }, []);
  const handleChatterTick = useCallback(() => {
    setFinishScore(s => clamp(s - 1, 0, 100));
  }, []);
  const handleSharpen = useCallback(() => {
    setToolWear(w => ({ ...w, [tool.id]: 0 }));
  }, [tool.id]);

  // ── Undo / redo history ──
  const historyRef = useRef([Array.from(makeProfile())]);
  const historyIndexRef = useRef(0);
  const [historyTick, setHistoryTick] = useState(0);

  const pushHistory = useCallback((arr) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(arr);
    if (trimmed.length > 30) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const handleCommit = useCallback((arr) => { pushHistory(arr); }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setProfile(Float32Array.from(historyRef.current[historyIndexRef.current]));
      setHistoryTick(t => t + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setProfile(Float32Array.from(historyRef.current[historyIndexRef.current]));
      setHistoryTick(t => t + 1);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // ── Saved parts -- persisted via AsyncStorage ──
  // A "part" is a complete snapshot of a finished piece: the carved
  // profile AND which material/texture it was shown with, so loading
  // one restores exactly what you saved -- not just the shape.
  const [savedParts, setSavedParts] = useState([]);
  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const hasLoadedPartsRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_PARTS_KEY);
        if (raw) setSavedParts(JSON.parse(raw));
      } catch (e) {
        console.warn('Pottery Studio: failed to load saved parts', e);
      } finally {
        hasLoadedPartsRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedPartsRef.current) return;
    AsyncStorage.setItem(SAVED_PARTS_KEY, JSON.stringify(savedParts)).catch((e) => {
      console.warn('Pottery Studio: failed to save parts', e);
    });
  }, [savedParts]);

  const savePart = useCallback(() => {
    setSavedParts(p => [...p, {
      id: Date.now(),
      name: `Part ${p.length + 1}`,
      profile: Array.from(profile),
      matId: mat.id,
      createdAt: Date.now(),
    }]);
  }, [profile, mat.id]);

  const loadPart = useCallback((part) => {
    const arr = Float32Array.from(part.profile);
    setProfile(arr);
    pushHistory(Array.from(arr));
    const idx = MATERIALS.findIndex(m => m.id === part.matId);
    if (idx >= 0) setMatIdx(idx);
    setIs3D(true);
    setIsPartsOpen(false);
  }, [pushHistory]);

  const deletePart = useCallback((id) => {
    setSavedParts(p => p.filter(x => x.id !== id));
  }, []);

  // ── Magazine state ──
  const [isMagazineOpen, setIsMagazineOpen] = useState(false);
  const magazineAnim = useRef(new Animated.Value(0)).current;
  const magazineHeight = TOOLBAR_H + 40;

  const toggleMagazine = useCallback(() => {
    const toValue = isMagazineOpen ? 0 : 1;
    Animated.spring(magazineAnim, { toValue, useNativeDriver: true, friction: 8, tension: 40 }).start();
    setIsMagazineOpen(!isMagazineOpen);
  }, [isMagazineOpen, magazineAnim]);

  const closeMagazine = useCallback(() => {
    Animated.spring(magazineAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }).start();
    setIsMagazineOpen(false);
  }, [magazineAnim]);

  useEffect(() => {
    let timeoutId;
    if (isMagazineOpen) {
      timeoutId = setTimeout(() => {
        if (isMagazineOpen) {
          Animated.spring(magazineAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }).start();
          setIsMagazineOpen(false);
        }
      }, 5000);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [isMagazineOpen, magazineAnim]);

  const handleMagazineInteraction = useCallback(() => {
    Animated.spring(magazineAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }).start();
    setIsMagazineOpen(true);
  }, [magazineAnim]);

  const handleSmooth = useCallback(() => {
    setProfile(p => {
      const next = smooth(p, 0.5);
      pushHistory(Array.from(next));
      return next;
    });
  }, [pushHistory]);

  const handleReset = useCallback(() => {
    const fresh = makeProfile();
    setProfile(fresh);
    pushHistory(Array.from(fresh));
    setToolWear({});
    setCatches(0);
    setFinishScore(100);
  }, [pushHistory]);

  const finishColor = finishScore > 70 ? '#4ade80' : finishScore > 40 ? '#f59e0b' : '#ef4444';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#090910" />
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.hLeft}>
            <Text style={styles.logo}>🏺</Text>
            <View>
              <Text style={styles.title}>Pottery Studio</Text>
              {/* Subtitle reflects power state in 2D mode, so the
                  header text and actual carve-ability stay in sync. */}
              <Text style={styles.sub}>
                {is3D
                  ? `${mat.label} · ${rpm} RPM · drag to orbit`
                  : (isPowered ? `${tool.name} tool active` : 'Power off — spindle stopped')}
              </Text>
            </View>
          </View>

          <View style={styles.hRight}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={styles.hRightScroll}>
              <View style={styles.rpmBox}>
                <TouchableOpacity onPress={() => adjustRpm(-RPM_STEP)} style={styles.rpmBtn}>
                  <Text style={styles.rpmBtnTxt}>–</Text>
                </TouchableOpacity>
                <Text style={styles.rpmVal}>{rpm}</Text>
                <TouchableOpacity onPress={() => adjustRpm(RPM_STEP)} style={styles.rpmBtn}>
                  <Text style={styles.rpmBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>

              {!is3D ? (
                <>
                  <TouchableOpacity style={styles.aBtn} onPress={handleSmooth}>
                    <Text style={styles.aTxt}>Smooth</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aBtn} onPress={handleReset}>
                    <Text style={styles.aTxt}>Reset</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.aBtn, autoRotate && { borderColor: '#f59e0b' }]}
                  onPress={() => setAutoRot(v => !v)}
                >
                  <Text style={[styles.aTxt, autoRotate && { color: '#f59e0b' }]}>
                    {autoRotate ? '⟳ Spin' : '⟳ Stop'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Save/browse saved parts -- 3D only. A profile alone
                  isn't a finished "part" the way it looks with its
                  material/texture applied, and that's only visible in
                  3D, so these controls stay out of the 2D header. */}
              {is3D && (
                <>
                  <TouchableOpacity style={styles.aBtn} onPress={savePart}>
                    <Text style={styles.aTxt}>💾 Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.aBtn, isPartsOpen && { borderColor: '#3b82f6' }]}
                    onPress={() => setIsPartsOpen(true)}
                  >
                    <Text style={[styles.aTxt, isPartsOpen && { color: '#3b82f6' }]}>
                      📂 Parts{savedParts.length > 0 ? ` (${savedParts.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.toggle, is3D && styles.toggleOn]}
              onPress={() => setIs3D(v => !v)}
            >
              <Text style={[styles.toggleTxt, is3D && styles.toggleTxtOn]}>
                {is3D ? '3D' : '2D'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Accuracy / stats control strip -- 2D only */}
        {!is3D && (
          <View style={styles.controlStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlStripRow}>
              <TouchableOpacity
                style={[styles.ctrlBtn, !canUndo && styles.ctrlBtnDisabled]}
                disabled={!canUndo}
                onPress={undo}
              >
                <Text style={styles.ctrlTxt}>↶ Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, !canRedo && styles.ctrlBtnDisabled]}
                disabled={!canRedo}
                onPress={redo}
              >
                <Text style={styles.ctrlTxt}>↷ Redo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, currentWear < 0.05 && styles.ctrlBtnDisabled]}
                disabled={currentWear < 0.05}
                onPress={handleSharpen}
              >
                <Text style={styles.ctrlTxt}>🔪 Sharpen</Text>
              </TouchableOpacity>

              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Finish</Text>
                <Text style={[styles.statVal2, { color: finishColor }]}>{Math.round(finishScore)}%</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Catches</Text>
                <Text style={styles.statVal2}>{catches}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel2}>Wear</Text>
                <Text style={styles.statVal2}>{Math.round(currentWear * 100)}%</Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Body */}
        <View style={[styles.body, { paddingBottom: is3D ? 0 : 60 }]}>
          {is3D ? (
            <View style={{ flex: 1 }}>
              <CanvaPovider camPosition={[0, 0, 2]}>
                <OrbitControls enablePan={false} enableZoom target={orbitTarget} />
                <Scene3D profile={profile} mat={mat} autoRotate={autoRotate} rpm={rpm} />
              </CanvaPovider>

              <View style={styles.matBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.matRow}>
                  {MATERIALS.map((m, i) => (
                    <TouchableOpacity key={m.id}
                      style={[styles.matBtn, i === matIdx && { borderColor: m.color }]}
                      onPress={() => setMatIdx(i)}>
                      <View style={[styles.swatch, { backgroundColor: m.color }]} />
                      <Text style={[styles.matTxt, i === matIdx && { color: m.color }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#0c1018' }}>
              <DrawingCanvas
                profile={profile}
                onProfile={setProfile}
                onCommit={handleCommit}
                tool={tool}
                mat={mat}
                rpm={rpm}
                wear={currentWear}
                onWear={handleWear}
                onCatch={handleCatch}
                onChatterTick={handleChatterTick}
                spinEnabled={modelsLoaded}
                isPowered={isPowered}
              />
              <MotorPreview rpmRef={rpmRef} onLoad={handleModelsLoaded} isPowered={isPowered} />
              {/* Power switch mounted at the machine, not the header --
                  placed just right of the motor housing and vertically
                  centered on it, using the same MOTOR_IMAGE_* constants
                  Motor3D.js positions the motor PNG with, so the two
                  can't drift apart if that placement changes. */}
              <MotorPowerSwitch
                isOn={isPowered}
                onPress={togglePower}
                style={{
                  bottom: MOTOR_IMAGE_BOTTOM + MOTOR_IMAGE_SIZE / 2 - 20,
                  left: MOTOR_IMAGE_LEFT + MOTOR_IMAGE_SIZE + 10,
                }}
              />
              <View style={styles.hintWrap} pointerEvents="none">
                {/* Hint reflects power state too, in sync with the rest. */}
                <Text style={styles.hintTxt}>
                  {isPowered
                    ? 'Draw toward center ↑↓ to carve · both sides cut'
                    : '⏻ Turn on power to start the spindle'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Saved parts modal -- 3D only (see header). Lists every saved
            part vertically with its material; tapping one loads it. */}
        <Modal
          visible={isPartsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsPartsOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsPartsOpen(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🏺 Saved Parts</Text>
                <TouchableOpacity onPress={() => setIsPartsOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={savePart}>
                <Text style={styles.modalSaveTxt}>+ Save Current Part</Text>
              </TouchableOpacity>

              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {savedParts.length === 0 && (
                  <Text style={styles.partsEmptyTxt}>No saved parts yet -- carve something and tap Save.</Text>
                )}
                {savedParts.map(part => {
                  const partMat = MATERIALS.find(m => m.id === part.matId) || MATERIALS[0];
                  return (
                    <View key={part.id} style={styles.partRow}>
                      <TouchableOpacity style={styles.partRowMain} onPress={() => loadPart(part)}>
                        <View style={[styles.swatch, { backgroundColor: partMat.color, width: 16, height: 16, borderRadius: 8 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.partChipText}>{part.name}</Text>
                          <Text style={styles.partChipSub}>{partMat.label}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deletePart(part.id)} style={styles.partDeleteBtn}>
                        <Text style={styles.partDeleteTxt}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {!is3D && (
          <MagazineToggleButton isOpen={isMagazineOpen} onPress={toggleMagazine} tool={tool} />
        )}

        {!is3D && (
          <Animated.View
            style={[
              styles.toolBarMagazine,
              {
                transform: [{
                  translateY: magazineAnim.interpolate({ inputRange: [0, 1], outputRange: [magazineHeight, 0] })
                }],
                opacity: magazineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              }
            ]}
          >
            <MagazineCloseButton onPress={closeMagazine} />

            <View style={styles.magazineHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.magazineTitle}>🛠️ Tool Selection</Text>
                <View style={styles.toolCountBadge}>
                  <Text style={styles.toolCountText}>{TOOLS.length}</Text>
                </View>
              </View>
              <Text style={styles.magazineSubtitle}>Tap to select</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.magazineRow}
              decelerationRate="fast"
              scrollEventThrottle={16}
            >
              {TOOLS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.magazineItem, tool.id === t.id && styles.magazineItemActive]}
                  onPress={() => {
                    setTool(t);
                    setShowTooltip(t.id);
                    setTimeout(() => setShowTooltip(null), 1500);
                    handleMagazineInteraction();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.magazineIconWrap, tool.id === t.id && styles.magazineIconWrapActive]}>
                    <Text style={[styles.magazineIcon, tool.id === t.id && styles.magazineIconActive]}>
                      {t.icon}
                    </Text>
                  </View>

                  <Text style={[styles.magazineToolName, tool.id === t.id && styles.magazineToolNameActive]}>
                    {t.name}
                  </Text>

                  {tool.id === t.id && (
                    <View style={[styles.magazineActiveIndicator, { backgroundColor: t.color }]} />
                  )}

                  {showTooltip === t.id && (
                    <View style={[styles.magazineTooltip, { borderColor: t.color }]}>
                      <Text style={[styles.magazineTooltipText, { color: t.color }]}>
                        {getToolDescription(t.id)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.magazineDivider} />

            <View style={styles.magazineStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Active Tool</Text>
                <Text style={[styles.statValue, { color: tool.color }]}>{tool.name}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Tool Width</Text>
                <Text style={styles.statValue}>{tool.width}mm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Profile Points</Text>
                <Text style={styles.statValue}>{PROFILE_SEGS}</Text>
              </View>
            </View>
          </Animated.View>
        )}

      </View>
    </GestureHandlerRootView>
  );
}
