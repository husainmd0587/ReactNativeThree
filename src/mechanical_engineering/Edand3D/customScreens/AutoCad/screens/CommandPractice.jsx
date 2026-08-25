import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
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
  applyMove, applyRotate, applyScale, applyMirror, applyOffset, applyRectangularArray,
} from '../engine/operations/modify';
import { applyTrim } from '../engine/operations/trim';
import { findNearestShape } from '../engine/geometry/hitTest';
import { rectangleFromDragCorners } from '../engine/geometry/rectangleFrame';
import PracticeCanvas from '../components/PracticeCanvas';
import PropertiesPanel from '../components/PropertiesPanel';
import Toolbar from '../components/Toolbar';
import ArrayControls from '../components/ArrayControls';

const TAP_TYPES = new Set(['arc', 'polyline']);
const MODIFY_TYPES = new Set(['move', 'copy', 'rotate', 'scale', 'mirror', 'offset', 'array']);
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
// shape. This one IS keyed by command (practiceType), since it's the
// modify operation being practiced, not the shape's own type.
const MODIFY_APPLIERS = {
  move: applyMove,
  copy: applyMove, // identical transform; REPLACES_IN_PLACE decides in-place vs new shape
  rotate: applyRotate,
  scale: applyScale,
  mirror: applyMirror,
  offset: applyOffset,
  // 'array' is intentionally not here — it produces several new shapes at
  // once, not one, so it's special-cased directly in handleDrawComplete
  // rather than fitting the single-shape REPLACES_IN_PLACE/creates-new
  // pattern the other five use.
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
// so Move/Copy/Rotate/Scale/Mirror/Offset all have something to work with
// immediately, already selected and ready to drag.
function makeSampleShape() {
  return { id: makeShapeId(), type: 'rectangle', points: rectangleFromDragCorners({ x: 60, y: 90 }, { x: 160, y: 160 }) };
}

// Trim needs two crossing lines to practice on — the exact pairing the
// original spec's own example used ("Trim the horizontal line at the
// vertical boundary").
function makeTrimSeedShapes() {
  return [
    { id: makeShapeId(), type: 'line', points: [{ x: 40, y: 140 }, { x: 220, y: 140 }] },
    { id: makeShapeId(), type: 'line', points: [{ x: 130, y: 60 }, { x: 130, y: 220 }] },
  ];
}

export default function CommandPractice({ route }) {
  const commandId = route?.params?.commandId;
  const command = getCommandById(commandId);
  const practiceType = command?.practice?.type;
  const isTapType = TAP_TYPES.has(practiceType);
  const isModifyType = MODIFY_TYPES.has(practiceType);
  const hasEngine = Boolean(
    practiceType
    && (GEOMETRY_BUILDERS[practiceType] || MODIFY_APPLIERS[practiceType] || isModifyType || practiceType === 'trim'),
  );

  const [history, setHistory] = useState({ stack: [[]], index: 0 });
  const shapes = history.stack[history.index];
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  const [selectedId, setSelectedId] = useState(null);
  const [showDimensions, setShowDimensions] = useState(true);
  const [draftPoints, setDraftPoints] = useState([]);
  const [arrayRows, setArrayRows] = useState(3);
  const [arrayCols, setArrayCols] = useState(3);
  // Trim's own tiny 2-step state machine: null = "pick a cutting edge
  // next tap"; a shape id = "that's the cutting edge, pick the line (and
  // side) to trim next tap".
  const [trimCuttingEdgeId, setTrimCuttingEdgeId] = useState(null);

  const commitShapes = useCallback((newShapes) => {
    setHistory((prev) => {
      const truncated = prev.stack.slice(0, prev.index + 1);
      const nextStack = [...truncated, newShapes];
      return { stack: nextStack, index: nextStack.length - 1 };
    });
  }, []);

  // Seed sample shapes once, only if the canvas is genuinely empty (so
  // revisiting the screen after drawing/trimming several shapes never
  // overwrites anything) — a rectangle for Modify commands, two crossing
  // lines for Trim.
  useEffect(() => {
    if (isModifyType && shapes.length === 0) {
      const sample = makeSampleShape();
      commitShapes([sample]);
      setSelectedId(sample.id);
    } else if (practiceType === 'trim' && shapes.length === 0) {
      commitShapes(makeTrimSeedShapes());
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
    setSelectedId(null);
    setTrimCuttingEdgeId(null);
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => ({ ...prev, index: Math.min(prev.stack.length - 1, prev.index + 1) }));
    setSelectedId(null);
    setTrimCuttingEdgeId(null);
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
          // Produces several new shapes at once, not one — doesn't fit
          // the single-shape REPLACES_IN_PLACE/creates-new pattern below.
          const copiesPoints = applyRectangularArray(activeShape, points[0], points[1], arrayRows, arrayCols);
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
    [shapes, practiceType, hasEngine, isModifyType, activeShape, arrayRows, arrayCols, commitShapes],
  );

  const handleCanvasTap = useCallback(
    (point) => {
      if (practiceType === 'trim') {
        const lineShapes = shapes.filter((s) => s.type === 'line');
        const nearest = findNearestShape(point, lineShapes);
        if (!nearest) return;

        if (!trimCuttingEdgeId) {
          setTrimCuttingEdgeId(nearest.id);
          setSelectedId(nearest.id);
          return;
        }
        if (nearest.id === trimCuttingEdgeId) return; // can't trim a line against itself

        const cuttingEdge = shapes.find((s) => s.id === trimCuttingEdgeId);
        const newPoints = applyTrim(cuttingEdge, nearest, point);
        if (newPoints) {
          commitShapes(shapes.map((s) => (s.id === nearest.id ? { ...s, points: newPoints } : s)));
        }
        // Ready for another trim immediately — same cutting edge stays
        // pickable, or a new one can be chosen next tap.
        setTrimCuttingEdgeId(null);
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
    [isTapType, draftPoints, practiceType, shapes, trimCuttingEdgeId, handleDrawComplete, commitShapes],
  );

  const handleFinishDraft = useCallback(() => {
    if (draftPoints.length >= 2) {
      handleDrawComplete(draftPoints);
    }
    setDraftPoints([]);
  }, [draftPoints, handleDrawComplete]);

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
    setTrimCuttingEdgeId(null);
  }, [selectedId, shapes, commitShapes]);

  const handleClearAll = useCallback(() => {
    commitShapes([]);
    setSelectedId(null);
    setDraftPoints([]);
    setTrimCuttingEdgeId(null);
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
          <Text style={styles.desc}>{command.description}</Text>
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
        <Text style={styles.desc}>{command.description}</Text>
        {command.steps?.length > 0 && (
          <View style={styles.steps}>
            {command.steps.map((step, i) => (
              <Text key={step} style={styles.stepText}>{i + 1}. {step}</Text>
            ))}
          </View>
        )}
        {practiceType === 'trim' && (
          <Text style={styles.hint}>
            {trimCuttingEdgeId
              ? 'Now tap the side of the other line you want removed.'
              : 'Tap a line to use as the cutting edge.'}
          </Text>
        )}

        <Toolbar
          showFinish={practiceType === 'polyline'}
          onFinish={handleFinishDraft}
          canFinish={draftPoints.length >= 2}
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
            rows={arrayRows}
            cols={arrayCols}
            onRowsChange={setArrayRows}
            onColsChange={setArrayCols}
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
  desc: { fontSize: 13, color: '#8A8A9A', marginTop: 6, lineHeight: 18 },
  steps: { marginTop: 10, marginBottom: 4 },
  stepText: { fontSize: 12, color: '#6B6B78', marginTop: 2 },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7DAF',
    marginTop: 8,
    marginBottom: 4,
  },
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
