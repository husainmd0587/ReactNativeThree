import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCommandById } from '../commands/registry';
import { computeLineGeometry } from '../engine/operations/line';
import { computeCircleGeometry } from '../engine/operations/circle';
import { computeRectangleGeometry } from '../engine/operations/rectangle';
import { computeArcGeometry } from '../engine/operations/arc';
import { computePolylineGeometry } from '../engine/operations/polyline';
import {
  applyLineEdit, applyCircleEdit, applyRectangleEdit, applyArcEdit, applyPolylineEdit,
} from '../engine/operations/edit';
import {
  applyMove, applyRotate, applyScale, applyMirror, applyOffset,
  applyRectangularArray, applyPolarArray,
} from '../engine/operations/modify';
import { applyTrim } from '../engine/operations/trim';
import { applyExtend } from '../engine/operations/extend';
import { applyChamfer } from '../engine/operations/chamfer';
import { applyFillet } from '../engine/operations/fillet';
import { findNearestShape } from '../engine/geometry/hitTest';
import { rectangleFromDragCorners } from '../engine/geometry/rectangleFrame';
import { mmToPx } from '../engine/geometry/units';
import PracticeCanvas from '../components/PracticeCanvas';
import PropertiesPanel from '../components/PropertiesPanel';
import Toolbar from '../components/Toolbar';
import ArrayControls from '../components/ArrayControls';
import DistanceControl from '../components/DistanceControl';

const TAP_TYPES = new Set(['arc', 'polyline']);
const MODIFY_TYPES = new Set(['move', 'copy', 'rotate', 'scale', 'mirror', 'offset', 'array']);
// Trim/Extend/Chamfer/Fillet all share the same "tap a line, then tap a
// second line" flow — see handleCanvasTap. What differs is only which
// operation runs once both lines are picked.
const TWO_LINE_TYPES = new Set(['trim', 'extend', 'chamfer', 'fillet']);
// move/rotate/scale edit the selected shape in place; copy/mirror/offset
// always produce a new shape and keep the original — same defaults
// AutoCAD itself uses for each of these commands.
const REPLACES_IN_PLACE = new Set(['move', 'rotate', 'scale']);

// Points array in -> measured geometry out, keyed by the SHAPE's own type
// (line/circle/rectangle/arc/polyline) — not the command being practiced,
// since a Modify command operates on a shape whose type is whatever it
// already was (e.g. Rotate acting on a rectangle).
const GEOMETRY_BUILDERS = {
  line: computeLineGeometry,
  circle: computeCircleGeometry,
  rectangle: computeRectangleGeometry,
  arc: computeArcGeometry,
  polyline: computePolylineGeometry,
};

// Edited property value -> new points array — also keyed by shape type.
const EDIT_APPLIERS = {
  line: applyLineEdit,
  circle: applyCircleEdit,
  rectangle: applyRectangleEdit,
  arc: applyArcEdit,
  polyline: applyPolylineEdit,
};

// Drag (base point -> destination) -> new points array for the selected
// shape. Keyed by command (practiceType), since it's the modify operation
// being practiced, not the shape's own type. 'array' isn't here — it
// produces several new shapes at once and is special-cased directly in
// handleDrawComplete.
const MODIFY_APPLIERS = {
  move: applyMove,
  copy: applyMove, // identical transform; REPLACES_IN_PLACE decides in-place vs new shape
  rotate: applyRotate,
  scale: applyScale,
  mirror: applyMirror,
  offset: applyOffset,
};

function toProperties(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'line') {
    return [
      { key: 'lengthMm', label: 'Length', value: geometry.lengthMm, unit: 'mm' },
      { key: 'angleDeg', label: 'Angle', value: geometry.angleDeg, unit: '°' },
    ];
  }
  if (geometry.type === 'circle') {
    return [
      { key: 'radiusMm', label: 'Radius', value: geometry.radiusMm, unit: 'mm' },
      {
        key: 'diameterMm',
        label: 'Diameter',
        value: Math.round(geometry.radiusMm * 2 * 10) / 10,
        unit: 'mm',
        editable: false,
      },
    ];
  }
  if (geometry.type === 'rectangle') {
    return [
      { key: 'widthMm', label: 'Width', value: geometry.widthMm, unit: 'mm' },
      { key: 'heightMm', label: 'Height', value: geometry.heightMm, unit: 'mm' },
      { key: 'angleDeg', label: 'Angle', value: geometry.angleDeg, unit: '°' },
    ];
  }
  if (geometry.type === 'arc') {
    return [
      { key: 'radiusMm', label: 'Radius', value: geometry.radiusMm, unit: 'mm' },
      {
        key: 'sweepDeg',
        label: 'Included angle',
        value: Math.round(Math.abs(geometry.sweepDeg) * 10) / 10,
        unit: '°',
      },
    ];
  }
  if (geometry.type === 'polyline') {
    return [
      { key: 'segments', label: 'Segments', value: geometry.segments, unit: '', editable: false },
      { key: 'totalLengthMm', label: 'Total length', value: geometry.totalLengthMm, unit: 'mm' },
    ];
  }
  return [];
}

let shapeCounter = 0;
function makeShapeId() {
  shapeCounter += 1;
  return `shape-${Date.now()}-${shapeCounter}`;
}

// Modify commands act on an existing shape, so opening one with an empty
// canvas would leave nothing to practice on — seed one sample rectangle
// so Move/Copy/Rotate/Scale/Mirror/Offset/Array all have something to
// work with immediately, already selected and ready to drag.
function makeSampleShape() {
  return { id: makeShapeId(), type: 'rectangle', points: rectangleFromDragCorners({ x: 60, y: 90 }, { x: 160, y: 160 }) };
}

// Trim needs two crossing lines — the exact pairing the original spec's
// own example used ("Trim the horizontal line at the vertical boundary").
function makeTrimSeedShapes() {
  return [
    { id: makeShapeId(), type: 'line', points: [{ x: 40, y: 140 }, { x: 220, y: 140 }] },
    { id: makeShapeId(), type: 'line', points: [{ x: 130, y: 60 }, { x: 130, y: 220 }] },
  ];
}

// Extend needs a line that DOESN'T yet reach a boundary, so extending it
// is meaningful.
function makeExtendSeedShapes() {
  return [
    { id: makeShapeId(), type: 'line', points: [{ x: 60, y: 140 }, { x: 140, y: 140 }] },
    { id: makeShapeId(), type: 'line', points: [{ x: 200, y: 60 }, { x: 200, y: 220 }] },
  ];
}

// Chamfer/Fillet need two lines meeting at (or near) a corner.
function makeCornerSeedShapes() {
  return [
    { id: makeShapeId(), type: 'line', points: [{ x: 60, y: 150 }, { x: 150, y: 150 }] },
    { id: makeShapeId(), type: 'line', points: [{ x: 150, y: 150 }, { x: 150, y: 60 }] },
  ];
}

export default function CommandPractice2D({ route }) {
  const commandId = route?.params?.commandId;
  const command = getCommandById(commandId);
  const practiceType = command?.practice?.type;
  const isTapType = TAP_TYPES.has(practiceType);
  const isModifyType = MODIFY_TYPES.has(practiceType);
  const isTwoLineType = TWO_LINE_TYPES.has(practiceType);
  const hasEngine = Boolean(
    practiceType
    && (GEOMETRY_BUILDERS[practiceType] || MODIFY_APPLIERS[practiceType] || isModifyType || isTwoLineType),
  );

  const [history, setHistory] = useState({ stack: [[]], index: 0 });
  const shapes = history.stack[history.index];
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  const [selectedId, setSelectedId] = useState(null);
  const [showDimensions, setShowDimensions] = useState(true);
  const [draftPoints, setDraftPoints] = useState([]);
  const [arrayMode, setArrayMode] = useState('rectangular');
  const [arrayRows, setArrayRows] = useState(3);
  const [arrayCols, setArrayCols] = useState(3);
  const [arrayCount, setArrayCount] = useState(6);
  const [chamferDistanceMm, setChamferDistanceMm] = useState(15);
  const [filletRadiusMm, setFilletRadiusMm] = useState(15);
  // Trim/Extend/Chamfer/Fillet's shared 2-tap state machine: null = "pick
  // the first line next tap"; a shape id = "that's the first line, pick
  // the second (and, for Trim/Extend, the side/end) next tap".
  const [pendingLineId, setPendingLineId] = useState(null);

  const commitShapes = useCallback((newShapes) => {
    setHistory((prev) => {
      const truncated = prev.stack.slice(0, prev.index + 1);
      const nextStack = [...truncated, newShapes];
      return { stack: nextStack, index: nextStack.length - 1 };
    });
  }, []);

  // Seed sample shapes once, only if the canvas is genuinely empty (so
  // revisiting the screen after drawing/modifying several shapes never
  // overwrites anything).
  useEffect(() => {
    if (shapes.length > 0) return;
    if (isModifyType) {
      const sample = makeSampleShape();
      commitShapes([sample]);
      setSelectedId(sample.id);
    } else if (practiceType === 'trim') {
      commitShapes(makeTrimSeedShapes());
    } else if (practiceType === 'extend') {
      commitShapes(makeExtendSeedShapes());
    } else if (practiceType === 'chamfer' || practiceType === 'fillet') {
      commitShapes(makeCornerSeedShapes());
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
    setSelectedId(null);
    setPendingLineId(null);
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => ({ ...prev, index: Math.min(prev.stack.length - 1, prev.index + 1) }));
    setSelectedId(null);
    setPendingLineId(null);
  }, []);

  const activeShape = useMemo(
    () => shapes.find((s) => s.id === selectedId) ?? shapes[shapes.length - 1] ?? null,
    [shapes, selectedId],
  );

  const activeGeometry = useMemo(
    () => (activeShape ? GEOMETRY_BUILDERS[activeShape.type]?.(activeShape.points) ?? null : null),
    [activeShape],
  );

  const handleDrawComplete = useCallback(
    (points) => {
      if (!hasEngine) return;

      if (isModifyType) {
        if (!activeShape) return; // nothing selected — nothing to modify

        if (practiceType === 'array') {
          const copiesPoints = arrayMode === 'polar'
            ? applyPolarArray(activeShape, points[0], arrayCount)
            : applyRectangularArray(activeShape, points[0], points[1], arrayRows, arrayCols);
          const newShapes = copiesPoints.map((pts) => ({
            id: makeShapeId(), type: activeShape.type, points: pts,
          }));
          commitShapes([...shapes, ...newShapes]);
          return;
        }

        const applyModify = MODIFY_APPLIERS[practiceType];
        if (!applyModify) return;
        const newPoints = applyModify(activeShape, points[0], points[1]);

        if (REPLACES_IN_PLACE.has(practiceType)) {
          const updated = { ...activeShape, points: newPoints };
          commitShapes(shapes.map((s) => (s.id === activeShape.id ? updated : s)));
        } else {
          const newShape = { id: makeShapeId(), type: activeShape.type, points: newPoints };
          commitShapes([...shapes, newShape]);
          setSelectedId(newShape.id);
        }
        return;
      }

      const newShape = {
        id: makeShapeId(),
        type: practiceType,
        // Rectangle drags produce 2 corners; every rectangle is stored as
        // 4 explicit corners (see engine/geometry/rectangleFrame.js) so
        // it can represent a rotation later, not just an axis-aligned box.
        points: practiceType === 'rectangle' ? rectangleFromDragCorners(points[0], points[1]) : points,
      };
      commitShapes([...shapes, newShape]);
      setSelectedId(newShape.id);
    },
    [
      shapes, practiceType, hasEngine, isModifyType, activeShape,
      arrayMode, arrayRows, arrayCols, arrayCount, commitShapes,
    ],
  );

  const handleCanvasTap = useCallback(
    (point) => {
      if (isTwoLineType) {
        const lineShapes = shapes.filter((s) => s.type === 'line');
        const nearest = findNearestShape(point, lineShapes);
        if (!nearest) return;

        if (!pendingLineId) {
          setPendingLineId(nearest.id);
          setSelectedId(nearest.id);
          return;
        }
        if (nearest.id === pendingLineId) return; // can't operate against itself

        const firstLine = shapes.find((s) => s.id === pendingLineId);

        if (practiceType === 'trim') {
          const newPoints = applyTrim(firstLine, nearest, point);
          if (newPoints) {
            commitShapes(shapes.map((s) => (s.id === nearest.id ? { ...s, points: newPoints } : s)));
          }
        } else if (practiceType === 'extend') {
          const newPoints = applyExtend(firstLine, nearest, point);
          if (newPoints) {
            commitShapes(shapes.map((s) => (s.id === nearest.id ? { ...s, points: newPoints } : s)));
          }
        } else if (practiceType === 'chamfer') {
          const result = applyChamfer(firstLine.points, nearest.points, mmToPx(chamferDistanceMm));
          if (result) {
            const bevel = { id: makeShapeId(), type: 'line', points: result.chamferLinePoints };
            commitShapes([
              ...shapes.map((s) => {
                if (s.id === firstLine.id) return { ...s, points: result.line1Points };
                if (s.id === nearest.id) return { ...s, points: result.line2Points };
                return s;
              }),
              bevel,
            ]);
          }
        } else if (practiceType === 'fillet') {
          const result = applyFillet(firstLine.points, nearest.points, mmToPx(filletRadiusMm));
          if (result) {
            const arc = { id: makeShapeId(), type: 'arc', points: result.arcPoints };
            commitShapes([
              ...shapes.map((s) => {
                if (s.id === firstLine.id) return { ...s, points: result.line1Points };
                if (s.id === nearest.id) return { ...s, points: result.line2Points };
                return s;
              }),
              arc,
            ]);
          }
        }

        setPendingLineId(null);
        setSelectedId(null);
        return;
      }

      if (!isTapType) {
        const nearest = findNearestShape(point, shapes);
        setSelectedId(nearest ? nearest.id : null);
        return;
      }
      if (draftPoints.length === 0) {
        const nearest = findNearestShape(point, shapes);
        if (nearest) {
          setSelectedId(nearest.id);
          return;
        }
      }
      const next = [...draftPoints, point];
      if (practiceType === 'arc' && next.length === 3) {
        setDraftPoints([]);
        handleDrawComplete(next);
      } else {
        setDraftPoints(next);
      }
    },
    [
      isTapType, isTwoLineType, draftPoints, practiceType, shapes, pendingLineId,
      chamferDistanceMm, filletRadiusMm, handleDrawComplete, commitShapes,
    ],
  );

  // Only Polyline supports finishing at an arbitrary point count (2+).
  // Arc always auto-completes at exactly 3 points on its own (see
  // handleCanvasTap) — calling handleDrawComplete with fewer than 3
  // points would crash computeArcGeometry, which destructures exactly
  // [p1, p2, p3]. So for Arc, "Enter" can only mean cancel the in-
  // progress draft, never commit it early.
  const handleFinishDraft = useCallback(() => {
    if (practiceType === 'polyline' && draftPoints.length >= 2) {
      handleDrawComplete(draftPoints);
    }
    setDraftPoints([]);
  }, [draftPoints, practiceType, handleDrawComplete]);

  const handleEditProperty = useCallback(
    (key, value) => {
      if (!activeShape || !activeGeometry) return;
      const applyEdit = EDIT_APPLIERS[activeShape.type];
      if (!applyEdit) return;
      const edited = { ...activeGeometry, [key]: value };
      const newPoints = applyEdit(activeShape.points, edited);
      const updatedShape = { ...activeShape, points: newPoints };
      commitShapes(shapes.map((s) => (s.id === activeShape.id ? updatedShape : s)));
    },
    [activeShape, activeGeometry, shapes, commitShapes],
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    commitShapes(shapes.filter((s) => s.id !== selectedId));
    setSelectedId(null);
    setPendingLineId(null);
  }, [selectedId, shapes, commitShapes]);

  const handleClearAll = useCallback(() => {
    commitShapes([]);
    setSelectedId(null);
    setDraftPoints([]);
    setPendingLineId(null);
  }, [commitShapes]);

  const handleToggleDimensions = useCallback(() => {
    setShowDimensions((v) => !v);
  }, []);

  if (!command) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Command not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasEngine) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Text style={styles.title}>{command.name}</Text>
          <Text style={styles.desc}>{command.details || command.description}</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Practice canvas coming soon.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{command.name}</Text>
        <Text style={styles.desc}>{command.details || command.description}</Text>
        {command.steps?.length > 0 && (
          <View style={styles.steps}>
            {command.steps.map((step, i) => (
              <Text key={step} style={styles.stepText}>{i + 1}. {step}</Text>
            ))}
          </View>
        )}
        {isTwoLineType && (
          <Text style={styles.hint}>
            {pendingLineId
              ? (practiceType === 'trim' || practiceType === 'extend'
                ? 'Now tap the other line (and side/end).'
                : 'Now tap the second line.')
              : 'Tap the first line.'}
          </Text>
        )}

        {practiceType === 'chamfer' && (
          <DistanceControl label="Distance" value={chamferDistanceMm} onChange={setChamferDistanceMm} />
        )}
        {practiceType === 'fillet' && (
          <DistanceControl label="Radius" value={filletRadiusMm} onChange={setFilletRadiusMm} />
        )}

        <Toolbar
          onUndo={handleUndo}
          canUndo={canUndo}
          onRedo={handleRedo}
          canRedo={canRedo}
          showDimensions={showDimensions}
          onToggleDimensions={handleToggleDimensions}
          onDelete={handleDelete}
          canDelete={!!selectedId}
          onClearAll={handleClearAll}
          canClearAll={shapes.length > 0}
        />

        {practiceType === 'array' && (
          <ArrayControls
            mode={arrayMode}
            onModeChange={setArrayMode}
            rows={arrayRows}
            cols={arrayCols}
            onRowsChange={setArrayRows}
            onColsChange={setArrayCols}
            count={arrayCount}
            onCountChange={setArrayCount}
          />
        )}

        <PracticeCanvas
          practiceType={practiceType}
          shapes={shapes}
          draftPoints={draftPoints}
          selectedId={selectedId}
          selectedShape={activeShape}
          showDimensions={showDimensions}
          onDrawComplete={handleDrawComplete}
          onCanvasTap={handleCanvasTap}
          onCanvasLongPress={handleFinishDraft}
        />

        {isTapType && draftPoints.length > 0 && (
          <TouchableOpacity style={styles.enterBtn} onPress={handleFinishDraft} activeOpacity={0.85}>
            <Text style={styles.enterBtnText}>
              {practiceType === 'polyline' ? 'Enter (finish)' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        )}

        <PropertiesPanel
          properties={toProperties(activeGeometry)}
          onEditValue={handleEditProperty}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  desc: { fontSize: 11, color: '#8A8A9A', marginTop: 6, lineHeight: 15, maxWidth: '96%' },
  steps: { marginTop: 10, marginBottom: 4 },
  stepText: { fontSize: 12, color: '#6B6B78', marginTop: 2 },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7DAF',
    marginTop: 8,
    marginBottom: 4,
  },
  enterBtn: {
    marginTop: 10,
    backgroundColor: '#2E7DAF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  enterBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  placeholder: {
    flex: 1,
    minHeight: 220,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 13, color: '#B7B7C0' },
});
