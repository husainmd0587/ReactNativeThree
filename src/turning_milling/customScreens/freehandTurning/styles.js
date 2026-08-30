import { StyleSheet, Platform } from 'react-native';
import { TOOLBAR_H, CONTROL_STRIP_H } from './constants';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090910' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 10, paddingHorizontal: 14,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  hRightScroll: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logo: { fontSize: 24 },
  title: { fontSize: 15, fontWeight: '700', color: '#e2c9a0', letterSpacing: 0.3 },
  sub: { fontSize: 10, color: '#4a6080', marginTop: 1 },

  aBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 7, backgroundColor: '#182030',
    borderWidth: 1, borderColor: '#253050',
  },
  aTxt: { color: '#7a9ab8', fontSize: 11, fontWeight: '500' },

  toggle: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 7, backgroundColor: '#182030',
    borderWidth: 1.5, borderColor: '#3b82f6', marginLeft: 2,
  },
  toggleOn: { backgroundColor: '#3b82f6' },
  toggleTxt: { color: '#3b82f6', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  toggleTxtOn: { color: '#fff' },

  // ── RPM stepper ──
  rpmBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#182030', borderRadius: 7,
    borderWidth: 1, borderColor: '#253050',
    paddingHorizontal: 4,
  },
  rpmBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  rpmBtnTxt: { color: '#7a9ab8', fontSize: 14, fontWeight: '700' },
  rpmVal: { color: '#e2c9a0', fontSize: 11, fontWeight: '700', minWidth: 34, textAlign: 'center' },

  // ── Accuracy control strip ──
  controlStrip: {
    height: CONTROL_STRIP_H,
    backgroundColor: '#0d1220',
    borderBottomWidth: 1, borderBottomColor: '#182030',
    justifyContent: 'center',
  },
  controlStripRow: {
    paddingHorizontal: 12, gap: 8, alignItems: 'center',
  },
  ctrlBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 7, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#253050',
  },
  ctrlBtnDisabled: { opacity: 0.35 },
  ctrlTxt: { color: '#7a9ab8', fontSize: 11, fontWeight: '600' },
  statChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 7, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#1e2a3c',
    alignItems: 'center', minWidth: 54,
  },
  statLabel2: { fontSize: 7, color: '#4a6080', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  statVal2: { fontSize: 11, color: '#7a9ab8', fontWeight: '700', marginTop: 1 },

  // ── Catch flash / diameter callipers ──
  catchFlash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,0,40,0.16)',
  },
  hoverBadge: {
    position: 'absolute', top: 8, alignSelf: 'center',
    backgroundColor: 'rgba(9,9,16,0.82)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#253050',
  },
  hoverBadgeText: { fontSize: 11, color: '#e2c9a0', fontWeight: '700' },
  hoverBadgeTextWarn: { color: '#ff6b6b' },

  // ── Stock texture load retry indicator ──
  textureLoadingBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(9,9,16,0.7)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: '#253050',
  },
  textureLoadingText: { fontSize: 9, color: '#7a9ab8', fontWeight: '600' },

  // ── Saved parts modal (persisted via AsyncStorage) ──
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 420, maxHeight: '75%',
    backgroundColor: '#0d1220', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#253050',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#182030',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#e2c9a0' },
  modalCloseBtn: { padding: 4 },
  modalCloseTxt: { color: '#7a9ab8', fontSize: 16, fontWeight: '600' },
  modalSaveBtn: {
    margin: 14, marginBottom: 8,
    paddingVertical: 10, borderRadius: 9,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1.5, borderColor: '#3b82f6',
    alignItems: 'center',
  },
  modalSaveTxt: { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
  modalList: { paddingHorizontal: 14 },
  modalListContent: { paddingBottom: 14, gap: 8 },
  partsEmptyTxt: { color: '#4a6080', fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  partRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#141c2a',
    borderWidth: 1, borderColor: '#253050',
  },
  partRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  partChipText: { color: '#e2c9a0', fontSize: 13, fontWeight: '700' },
  partChipSub: { color: '#4a6080', fontSize: 10, fontWeight: '600', marginTop: 1 },
  partDeleteBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  partDeleteTxt: { color: '#4a6080', fontSize: 16, fontWeight: '700' },

  body: { flex: 1, overflow: 'hidden' },

  magazineToggle: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: '#0d1220',
    borderWidth: 1.5,
    borderColor: '#1a2a3f',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  magazineToggleOpen: {
    borderColor: '#3b82f6',
    backgroundColor: '#0d1a30',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2c9a0',
    letterSpacing: 0.5,
  },
  toggleBadge: {
    backgroundColor: '#1a2538',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  toggleBadgeText: {
    fontSize: 10,
    color: '#7a9ab8',
    fontWeight: '500',
  },
  toggleArrow: {
    fontSize: 14,
    color: '#4a6080',
  },
  toggleArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },

  toolBarMagazine: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    height: TOOLBAR_H + 40,
    backgroundColor: '#0d1220',
    borderTopWidth: 1.5,
    borderTopColor: '#182030',
    paddingVertical: 2,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  magazineCloseBtn: {
    position: 'absolute',
    top: 4,
    right: 12,
    padding: 4,
    zIndex: 10,
  },

  magazineCloseText: {
    color: '#4a6080',
    fontSize: 16,
    fontWeight: '300',
  },

  magazineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 2,
  },

  magazineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2c9a0',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  magazineSubtitle: {
    fontSize: 9,
    color: '#4a6080',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  magazineRow: {
    paddingHorizontal: 12,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },

  magazineItem: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: 'transparent',
    minWidth: 44,
    position: 'relative',
  },

  magazineItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  magazineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a2538',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#253050',
  },

  magazineIconWrapActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  magazineIcon: {
    fontSize: 22,
    color: '#5a7a9a',
  },

  magazineIconActive: {
    color: '#3b82f6',
  },

  magazineToolName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6a8aaa',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  magazineToolNameActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  magazineActiveIndicator: {
    position: 'absolute',
    top: -2,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  magazineTooltip: {
    position: 'absolute',
    top: -38,
    backgroundColor: '#0d1220',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  magazineTooltipText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  magazineDivider: {
    height: 1,
    backgroundColor: '#182030',
    marginHorizontal: 12,
    marginVertical: 4,
  },

  magazineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#182030',
    marginTop: 4,
    backgroundColor: 'rgba(13, 18, 32, 0.5)',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statLabel: {
    fontSize: 8,
    color: '#4a6080',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },

  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a9ab8',
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#182030',
  },

  matBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
    backgroundColor: 'rgba(9,9,16,0.88)',
    borderTopWidth: 1, borderTopColor: '#182030',
    justifyContent: 'center',
  },
  matRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  matBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#141c2a',
    borderWidth: 1.5, borderColor: '#1e2a3c',
  },
  swatch: { width: 11, height: 11, borderRadius: 6 },
  matTxt: { fontSize: 11, fontWeight: '600', color: '#4a6080' },

  hintWrap: {
    position: 'absolute', bottom: 10,
    left: 0, right: 0, alignItems: 'center',
  },
  hintTxt: {
    fontSize: 10, color: 'rgba(100,130,160,0.6)',
    backgroundColor: 'rgba(9,9,16,0.75)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, overflow: 'hidden',
  },

  toolCountBadge: {
    backgroundColor: '#1a2538',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },

  toolCountText: {
    fontSize: 9,
    color: '#4a6080',
    fontWeight: '500',
  },

  // ── Power Toggle Button Styles ──
  powerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 6,
    backgroundColor: '#182030',
  },
  powerOn: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  powerOff: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  powerToggleInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerToggleText: {
    fontSize: 18,
    fontWeight: '900',
  },
  powerTextOn: {
    color: '#4ade80',
  },
  powerTextOff: {
    color: '#ef4444',
  },
  powerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  powerIndicatorOn: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  powerIndicatorOff: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // ── Motor-mounted power switch (2D view only) ──
  // Positioned by the caller (bottom/left passed inline next to the
  // motor PNG) -- this just supplies the label + stacking, not the
  // placement, so it stays reusable if the motor image ever moves.
  motorSwitchWrap: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
  },
  motorSwitchLabel: {
    fontSize: 8,
    color: '#8a9bb0',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
