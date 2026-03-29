import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, TextInput, Switch, Dimensions, Platform,Image
} from 'react-native'
import React, { useState, useMemo, useRef, useCallback,useEffect } from 'react'
import CanvasProvider from '../../provider'
import * as THREE from 'three'
import { useTextureLoader,Textures } from '../../assets/all_textures'
import {
  Show2DShape, Show2DShapeByPoints, Show3DExtruded,
  createCircle, createSquare, createRectangle,
  createTriangle, createStar, createHexagon,
  createPentagon, createHeart, createDiamond,
  createArrow, createCross, createRoundedRect,
  createEllipse, createOctagon,
} from './2dShapes/2dShapes'
import { useThree } from '@react-three/fiber/native'

const { width: SW, height: SH } = Dimensions.get('window')
const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

// ─── Shape Catalogue ──────────────────────────────────────────────────────────
const SHAPES = [
  { id: 'circle',     label: 'Circle',   icon: '◯', params: { radius: { default: 25, min: 1, max: 500, step: 1, label: 'Radius (mm)' } }, build: p => createCircle(p.radius) },
  { id: 'square',     label: 'Square',   icon: '▢', params: { size: { default: 25, min: 1, max: 500, step: 1, label: 'Side / 2 (mm)' } }, build: p => createSquare(p.size) },
  { id: 'rectangle',  label: 'Rect',     icon: '▭', params: { width: { default: 105, min: 1, max: 1000, step: 1, label: 'Width (mm)' }, height: { default: 74, min: 1, max: 1000, step: 1, label: 'Height (mm)' } }, build: p => createRectangle(p.width, p.height) },
  { id: 'triangle',   label: 'Triangle', icon: '△', params: { size: { default: 30, min: 1, max: 500, step: 1, label: 'Half-side (mm)' } }, build: p => createTriangle(p.size) },
  { id: 'star',       label: 'Star',     icon: '★', params: { outerRadius: { default: 25, min: 2, max: 300, step: 1, label: 'Outer R (mm)' }, innerRadius: { default: 10, min: 1, max: 200, step: 1, label: 'Inner R (mm)' }, points: { default: 5, min: 3, max: 12, step: 1, label: 'Points', integer: true } }, build: p => createStar({ outerRadius: p.outerRadius, innerRadius: p.innerRadius, points: p.points }) },
  { id: 'hexagon',    label: 'Hexagon',  icon: '⬡', params: { size: { default: 27, min: 1, max: 500, step: 1, label: 'Radius (mm)' } }, build: p => createHexagon(p.size) },
  { id: 'pentagon',   label: 'Pentagon', icon: '⬠', params: { size: { default: 25, min: 1, max: 500, step: 1, label: 'Radius (mm)' } }, build: p => createPentagon(p.size) },
  { id: 'octagon',    label: 'Octagon',  icon: '⬡', params: { size: { default: 38, min: 1, max: 500, step: 1, label: 'Radius (mm)' } }, build: p => createOctagon(p.size) },
  { id: 'ellipse',    label: 'Ellipse',  icon: '⬭', params: { rx: { default: 40, min: 1, max: 500, step: 1, label: 'Radius X (mm)' }, ry: { default: 25, min: 1, max: 500, step: 1, label: 'Radius Y (mm)' } }, build: p => createEllipse(p.rx, p.ry) },
  { id: 'heart',      label: 'Heart',    icon: '♥', params: { size: { default: 25, min: 1, max: 200, step: 1, label: 'Size (mm)' } }, build: p => createHeart(p.size) },
  { id: 'diamond',    label: 'Diamond',  icon: '◇', params: { width: { default: 20, min: 1, max: 300, step: 1, label: 'Half-W (mm)' }, height: { default: 35, min: 1, max: 300, step: 1, label: 'Half-H (mm)' } }, build: p => createDiamond(p.width, p.height) },
  { id: 'arrow',      label: 'Arrow',    icon: '➤', params: { length: { default: 80, min: 5, max: 500, step: 1, label: 'Length (mm)' }, width: { default: 20, min: 2, max: 200, step: 1, label: 'Body W (mm)' }, headLength: { default: 30, min: 2, max: 200, step: 1, label: 'Head L (mm)' }, headWidth: { default: 40, min: 4, max: 300, step: 1, label: 'Head W (mm)' } }, build: p => createArrow(p.length, p.width, p.headLength, p.headWidth) },
  { id: 'cross',      label: 'Cross',    icon: '✚', params: { size: { default: 25, min: 2, max: 300, step: 1, label: 'Arm (mm)' }, thickness: { default: 12, min: 1, max: 100, step: 1, label: 'Thickness (mm)' } }, build: p => createCross(p.size, p.thickness) },
  { id: 'roundedrect',label: 'R-Rect',   icon: '▢', params: { width: { default: 85.6, min: 2, max: 1000, step: 0.1, label: 'Width (mm)' }, height: { default: 54, min: 2, max: 1000, step: 0.1, label: 'Height (mm)' }, radius: { default: 3.2, min: 0.1, max: 50, step: 0.1, label: 'Corner R (mm)' } }, build: p => createRoundedRect(p.width, p.height, p.radius) },
]

const EXTRUDE_DEFAULTS = {
  depth:          { default: 10,  min: 0.5, max: 200, step: 0.5, label: 'Depth (mm)' },
  bevelEnabled:   { type: 'bool', default: true,                  label: 'Bevel' },
  bevelThickness: { default: 1.5, min: 0,   max: 20,  step: 0.5, label: 'Bevel T (mm)' },
  bevelSize:      { default: 1.0, min: 0,   max: 20,  step: 0.5, label: 'Bevel S (mm)' },
  bevelSegments:  { default: 4,   min: 1,   max: 10,  step: 1,   label: 'Bevel Seg', integer: true },
}

const COLORS = [
  { hex: '#585858' }, { hex: '#ff6b35' }, { hex: '#a8ff3e' },
  { hex: '#ff3eaa' }, { hex: '#ffe03e' }, { hex: '#c084fc' }, { hex: '#ffffff' },
]

const buildDefaults = (params) =>
  Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v.default]))
const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

const screenToWorld = (sx, sy, layout, camera) => {
  if (!layout || !camera) return null
  const { width: cw, height: ch } = layout
  const ndcX =  (sx / cw) * 2 - 1
  const ndcY = -(sy / ch) * 2 + 1
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5)
  vec.unproject(camera)
  const dir = vec.sub(camera.position).normalize()
  const dist = -camera.position.z / dir.z
  const pos = camera.position.clone().add(dir.multiplyScalar(dist))
  return [parseFloat(pos.x.toFixed(1)), parseFloat(pos.y.toFixed(1))]
}

const SNAP_DIST = 6

// ─── Dimension Helpers ────────────────────────────────────────────────────────
const computeDims = (pts) => {
  if (!pts || pts.length < 2) return null
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const edges = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]
    return parseFloat(Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2).toFixed(2))
  })
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return {
    width:     parseFloat((maxX - minX).toFixed(2)),
    height:    parseFloat((maxY - minY).toFixed(2)),
    perimeter: parseFloat(edges.reduce((s, e) => s + e, 0).toFixed(2)),
    area:      parseFloat((Math.abs(area) / 2).toFixed(2)),
    edges,
    minX, maxX, minY, maxY,
    centroid: [parseFloat(((minX+maxX)/2).toFixed(2)), parseFloat(((minY+maxY)/2).toFixed(2))],
  }
}

const getNamedDims = (shapeId, params) => {
  const n = []
  if (shapeId === 'circle')       n.push({ key: 'radius',      label: 'Radius',    value: params.radius,      min: 1,   max: 500  })
  if (shapeId === 'square')       n.push({ key: 'size',        label: 'Side/2',    value: params.size,        min: 1,   max: 500  })
  if (shapeId === 'rectangle')    n.push({ key: 'width',       label: 'Width',     value: params.width,       min: 1,   max: 1000 }, { key: 'height', label: 'Height', value: params.height, min: 1, max: 1000 })
  if (shapeId === 'ellipse')      n.push({ key: 'rx',          label: 'Radius X',  value: params.rx,          min: 1,   max: 500  }, { key: 'ry', label: 'Radius Y', value: params.ry, min: 1, max: 500 })
  if (['hexagon','pentagon','octagon'].includes(shapeId)) n.push({ key: 'size', label: 'Radius', value: params.size, min: 1, max: 500 })
  if (shapeId === 'triangle')     n.push({ key: 'size',        label: 'Half-side', value: params.size,        min: 1,   max: 500  })
  if (shapeId === 'star')         n.push({ key: 'outerRadius', label: 'Outer R',   value: params.outerRadius, min: 2,   max: 300  }, { key: 'innerRadius', label: 'Inner R', value: params.innerRadius, min: 1, max: 200 })
  if (shapeId === 'diamond')      n.push({ key: 'width',       label: 'Half-W',    value: params.width,       min: 1,   max: 300  }, { key: 'height', label: 'Half-H', value: params.height, min: 1, max: 300 })
  if (shapeId === 'roundedrect')  n.push({ key: 'width',       label: 'Width',     value: params.width,       min: 2,   max: 1000 }, { key: 'height', label: 'Height', value: params.height, min: 2, max: 1000 }, { key: 'radius', label: 'Corner R', value: params.radius, min: 0.1, max: 50 })
  if (shapeId === 'arrow')        n.push({ key: 'length',      label: 'Length',    value: params.length,      min: 5,   max: 500  }, { key: 'width', label: 'Body W', value: params.width, min: 2, max: 200 })
  if (shapeId === 'cross')        n.push({ key: 'size',        label: 'Arm',       value: params.size,        min: 2,   max: 300  }, { key: 'thickness', label: 'Thickness', value: params.thickness, min: 1, max: 100 })
  if (shapeId === 'heart')        n.push({ key: 'size',        label: 'Size',      value: params.size,        min: 1,   max: 200  })
  return n
}

// ─── In-canvas SolidWorks-style Dimension Annotations ────────────────────────
function DimAnnotations({ dims, pts, showDims, color: shapeColor }) {
  if (!showDims || !dims) return null
  const AC = '#ffe03e'  // annotation color
  const OFF = 8         // offset from bounding box edge

  // Build bounding-box dimension lines (width across top, height on right)
  const annotations = useMemo(() => {
    const items = []
    const { minX, maxX, minY, maxY, width, height } = dims

    // ── Width annotation (top horizontal)
    const topY = maxY + OFF
    const wMid = (minX + maxX) / 2
    items.push({
      type: 'linear',
      axis: 'x',
      x1: minX, y1: topY,
      x2: maxX, y2: topY,
      midX: wMid, midY: topY + 5,
      value: width,
      label: `${width.toFixed(1)}`,
      tickY1: maxY + 2, tickY2: topY + 3,
    })

    // ── Height annotation (right vertical)
    const rightX = maxX + OFF
    const hMid = (minY + maxY) / 2
    items.push({
      type: 'linear',
      axis: 'y',
      x1: rightX, y1: minY,
      x2: rightX, y2: maxY,
      midX: rightX + 5, midY: hMid,
      value: height,
      label: `${height.toFixed(1)}`,
      tickX1: maxX + 2, tickX2: rightX + 3,
    })

    // ── Edge length labels (midpoint of each edge, for freehand pts ≤ 12 edges)
    if (pts && pts.length >= 3 && pts.length <= 12) {
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length]
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2
        const len = dims.edges[i]
        const dx = b[0] - a[0], dy = b[1] - a[1]
        const norm = Math.sqrt(dx*dx + dy*dy) || 1
        // Offset label perpendicular to edge
        const ox = (-dy / norm) * 5
        const oy = ( dx / norm) * 5
        items.push({ type: 'edge', mx: mx + ox, my: my + oy, label: `${len.toFixed(1)}`, idx: i })
      })
    }

    return items
  }, [dims, pts])

  // Build geometry for all linear annotation lines
  const lineGeo = useMemo(() => {
    const verts = []
    annotations.filter(a => a.type === 'linear').forEach(a => {
      // Main dimension line
      verts.push(a.x1, a.y1, 0.05,  a.x2, a.y2, 0.05)
      if (a.axis === 'x') {
        // Tick marks (vertical)
        verts.push(a.x1, a.tickY1, 0.05,  a.x1, a.tickY2, 0.05)
        verts.push(a.x2, a.tickY1, 0.05,  a.x2, a.tickY2, 0.05)
        // Arrow heads
        verts.push(a.x1, a.y1, 0.05,  a.x1 + 3, a.y1 + 1.5, 0.05)
        verts.push(a.x1, a.y1, 0.05,  a.x1 + 3, a.y1 - 1.5, 0.05)
        verts.push(a.x2, a.y2, 0.05,  a.x2 - 3, a.y2 + 1.5, 0.05)
        verts.push(a.x2, a.y2, 0.05,  a.x2 - 3, a.y2 - 1.5, 0.05)
      } else {
        // Tick marks (horizontal)
        verts.push(a.tickX1, a.y1, 0.05,  a.tickX2, a.y1, 0.05)
        verts.push(a.tickX1, a.y2, 0.05,  a.tickX2, a.y2, 0.05)
        // Arrow heads
        verts.push(a.x1, a.y1, 0.05,  a.x1 + 1.5, a.y1 + 3, 0.05)
        verts.push(a.x1, a.y1, 0.05,  a.x1 - 1.5, a.y1 + 3, 0.05)
        verts.push(a.x2, a.y2, 0.05,  a.x2 + 1.5, a.y2 - 3, 0.05)
        verts.push(a.x2, a.y2, 0.05,  a.x2 - 1.5, a.y2 - 3, 0.05)
      }
    })
    if (verts.length < 6) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    return g
  }, [annotations])

  return (
    <group>
      {lineGeo && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial color={AC} />
        </lineSegments>
      )}
      {/* Label dots at midpoints */}
      {annotations.map((a, i) => (
        <mesh key={i} position={[a.midX ?? a.mx, a.midY ?? a.my, 0.06]}>
          <circleGeometry args={[1.2, 8]} />
          <meshBasicMaterial color={AC} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Draw overlay ─────────────────────────────────────────────────────────────
function DrawOverlay({ points, previewPoint, color }) {
  const allPts = useMemo(() => {
    if (points.length === 0) return []
    const pts = [...points]
    if (previewPoint) pts.push(previewPoint)
    return pts
  }, [points, previewPoint])

  const lineGeo = useMemo(() => {
    if (allPts.length < 2) return null
    const verts = []
    for (let i = 0; i < allPts.length - 1; i++) {
      verts.push(allPts[i][0], allPts[i][1], 0.01)
      verts.push(allPts[i+1][0], allPts[i+1][1], 0.01)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    return g
  }, [allPts])

  if (points.length === 0) return null

  return (
    <group>
      {lineGeo && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial color={color} />
        </lineSegments>
      )}
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], 0.02]}>
          <circleGeometry args={[i === 0 ? 2.2 : 1.4, 16]} />
          <meshBasicMaterial color={i === 0 ? '#ffffff' : color} />
        </mesh>
      ))}
      {points.length > 2 && previewPoint && (() => {
        const dx = previewPoint[0] - points[0][0], dy = previewPoint[1] - points[0][1]
        return Math.sqrt(dx*dx + dy*dy) < SNAP_DIST ? (
          <mesh position={[points[0][0], points[0][1], 0.03]}>
            <ringGeometry args={[3.5, 5, 24]} />
            <meshBasicMaterial color="#00ff88" />
          </mesh>
        ) : null
      })()}
    </group>
  )
}

// ─── Drawn Shape ──────────────────────────────────────────────────────────────
function DrawnShape({ points, color, extruded, extrudeParams }) {
  const shape = useMemo(() => {
    if (points.length < 3) return null
    const s = new THREE.Shape()
    s.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1])
    s.closePath()
    return s
  }, [points])
  if (!shape) return null
  if (extruded) return <Show3DExtruded shape={shape} depth={extrudeParams.depth} bevelEnabled={extrudeParams.bevelEnabled} bevelThickness={extrudeParams.bevelThickness} bevelSize={extrudeParams.bevelSize} bevelSegments={extrudeParams.bevelSegments} color={color} />
  return <Show2DShape shape={shape} color={color} />
}

function CameraBridge({ onCamera }) {
  const { camera } = useThree()
  React.useEffect(() => { onCamera(camera) }, [camera])
  return null
}

// ─── ParamRow ─────────────────────────────────────────────────────────────────
function ParamRow({ label, value, config, onChange }) {
  const isInt = config.integer
  const display = isInt ? Math.round(value) : parseFloat(value).toFixed(2)
  const nudge = dir => onChange(isInt ? Math.round(clamp(value + dir * config.step, config.min, config.max)) : clamp(parseFloat((value + dir * config.step).toFixed(4)), config.min, config.max))
  const handleText = t => { const n = parseFloat(t.replace(/[^\d.\-]/g, '')); if (!isNaN(n)) onChange(clamp(n, config.min, config.max)) }
  return (
    <View style={S.paramRow}>
      <Text style={S.paramLabel}>{label}</Text>
      <View style={S.paramControls}>
        <TouchableOpacity style={S.nudgeBtn} onPress={() => nudge(-1)}><Text style={S.nudgeText}>−</Text></TouchableOpacity>
        <TextInput style={S.paramInput} value={`${display} mm`} keyboardType="numeric" onChangeText={handleText} selectTextOnFocus />
        <TouchableOpacity style={S.nudgeBtn} onPress={() => nudge(1)}><Text style={S.nudgeText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )
}

function BoolRow({ label, value, onChange }) {
  return (
    <View style={S.paramRow}>
      <Text style={S.paramLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#2a2a2a', true: '#00d4ff33' }} thumbColor={value ? '#00d4ff' : '#555'} />
    </View>
  )
}

// ─── Editable Dim Cell ────────────────────────────────────────────────────────
function DimCell({ label, value, unit = 'mm', editable = false, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => { setDraft(parseFloat(value).toFixed(2)); setEditing(true) }
  const commit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n) && n > 0 && onEdit) onEdit(n)
    setEditing(false)
  }

  return (
    <TouchableOpacity
      style={[DS.cell, editable && DS.cellEditable]}
      onPress={editable ? start : undefined}
      activeOpacity={editable ? 0.7 : 1}
    >
      <Text style={DS.cellLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={DS.cellInput}
          value={draft}
          keyboardType="numeric"
          autoFocus
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
        />
      ) : (
        <View style={DS.cellValueRow}>
          <Text style={[DS.cellValue, editable && DS.cellValueEditable]}>
            {parseFloat(value).toFixed(2)}
          </Text>
          <Text style={DS.cellUnit}> {unit}</Text>
          {editable && <Text style={DS.editIcon}>✎</Text>}
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Dimensions Panel ─────────────────────────────────────────────────────────
function DimsPanel({ dims, isDrawn, extruded, extrudeDepth, namedDims, onEditNamed, onEditEdge, onClose }) {
  if (!dims) return null
  return (
    <View style={DS.panel}>
      {/* Header */}
      <View style={DS.header}>
        <View style={DS.headerLeft}>
          <View style={DS.dot} />
          <Text style={DS.title}>DIMENSIONS</Text>
          {isDrawn && <View style={DS.badge}><Text style={DS.badgeTxt}>FREEHAND</Text></View>}
        </View>
        <TouchableOpacity onPress={onClose} style={DS.closeBtn}><Text style={DS.closeTxt}>✕</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>

        {/* Bounding box — read-only */}
        <Text style={DS.section}>BOUNDING BOX</Text>
        <View style={DS.grid}>
          <DimCell label="WIDTH"      value={dims.width}           />
          <DimCell label="HEIGHT"     value={dims.height}          />
          <DimCell label="PERIMETER"  value={dims.perimeter}       />
          <DimCell label="AREA"       value={dims.area} unit="mm²" />
          <DimCell label="CENTROID X" value={dims.centroid[0]}     />
          <DimCell label="CENTROID Y" value={dims.centroid[1]}     />
        </View>

        {/* Extrusion */}
        {extruded && (
          <>
            <Text style={DS.section}>EXTRUSION</Text>
            <View style={DS.grid}>
              <DimCell label="DEPTH"    value={extrudeDepth} />
              <DimCell label="VOLUME ≈" value={(dims.area * extrudeDepth).toFixed(2)} unit="mm³" />
            </View>
          </>
        )}

        {/* Named shape params — editable */}
        {namedDims && namedDims.length > 0 && (
          <>
            <Text style={DS.section}>SHAPE PARAMS  <Text style={DS.sectionHint}>tap to edit</Text></Text>
            <View style={DS.grid}>
              {namedDims.map((n, i) => (
                <DimCell
                  key={i}
                  label={n.label.toUpperCase()}
                  value={n.value}
                  editable
                  onEdit={val => onEditNamed && onEditNamed(n.key, clamp(val, n.min, n.max))}
                />
              ))}
            </View>
          </>
        )}

        {/* Freehand edge lengths — editable (scales edge by moving endpoint) */}
        {isDrawn && dims.edges && dims.edges.length <= 20 && (
          <>
            <Text style={DS.section}>EDGES ({dims.edges.length})  <Text style={DS.sectionHint}>tap to edit</Text></Text>
            <View style={DS.grid}>
              {dims.edges.map((e, i) => (
                <DimCell
                  key={i}
                  label={`EDGE ${i + 1}`}
                  value={e}
                  editable
                  onEdit={val => onEditEdge && onEditEdge(i, val)}
                />
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </View>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Create2D = ({ route, navigation }) => {
  const { profile, sourceShapes } = route?.params ?? {};
  const [mode, setMode]           = useState('sketch')
  const [activeId, setActiveId]   = useState('circle')
  const [shapeParams, setShapeParams] = useState(() =>
    Object.fromEntries(SHAPES.map(s => [s.id, buildDefaults(s.params)]))
  )
 const [extrudeParams, setExtrudeParams] = useState(
  buildDefaults(EXTRUDE_DEFAULTS)  // ✅ 
)
  const [color, setColor]         = useState(COLORS[0].hex)
  const [texture,setTextures]    =useState(null)
  const [showPanel, setShowPanel] = useState(true)
  const [showDims, setShowDims]   = useState(false)
useEffect(() => {
  if (profile?.points && profile.points.length >= 3) {

    setDrawPoints(profile.points)
    setFinalPoints(profile.points)
    setDrawnClosed(true)

    // open directly in extrude mode (optional)
    setMode('extrude')
  }
}, [profile])

  // Draw state
// Draw state (Profile Support)
const [drawPoints, setDrawPoints] = useState(() => {
  if (profile?.points && profile.points.length) {
    return profile.points
  }
  return []
})

const [previewPoint, setPreviewPoint] = useState(null)

const [drawnClosed, setDrawnClosed] = useState(() => {
  if (profile?.points && profile.points.length >= 3) {
    return true
  }
  return false
})

const [finalPoints, setFinalPoints] = useState(() => {
  if (profile?.points && profile.points.length >= 3) {
    return profile.points
  }
  return []
})


  const cameraRef      = useRef(null)
  const canvasLayoutRef = useRef(null)
  const activeShape = SHAPES.find(s => s.id === activeId)
  const curParams   = shapeParams[activeId]
  const sketchShape = useMemo(() => activeShape.build(curParams), [activeId, curParams])

  const updateParam   = (key, val) => setShapeParams(prev => ({ ...prev, [activeId]: { ...prev[activeId], [key]: val } }))
  const updateExtrude = (key, val) => setExtrudeParams(prev => ({ ...prev, [key]: val }))

  const isDrawMode    = mode === 'draw'
  const isExtrudeMode = mode === 'extrude'
  const hasShape      = drawnClosed && finalPoints.length >= 3

  // ── Dimensions
  const activeDims = useMemo(() => hasShape ? computeDims(finalPoints) : computeDims(sketchShape?.getPoints(64).map(p => [p.x, p.y])), [hasShape, finalPoints, sketchShape])
  const namedDims  = useMemo(() => !hasShape ? getNamedDims(activeId, curParams) : null, [hasShape, activeId, curParams])

  // Edit a named shape param from dims panel
  const handleEditNamed = useCallback((key, val) => updateParam(key, val), [activeId])

  // Edit an edge length — scale the endpoint along the edge direction
  const handleEditEdge = useCallback((edgeIdx, newLen) => {
    setFinalPoints(prev => {
      const pts = [...prev]
      const i = edgeIdx
      const j = (i + 1) % pts.length
      const a = pts[i], b = pts[j]
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const curLen = Math.sqrt(dx*dx + dy*dy) || 1
      const scale = newLen / curLen
      pts[j] = [
        parseFloat((a[0] + dx * scale).toFixed(2)),
        parseFloat((a[1] + dy * scale).toFixed(2)),
      ]
      return pts
    })
  }, [])

  // ── Canvas tap/move handlers
  const handleCanvasTap = useCallback((evt) => {
    if (mode !== 'draw' || drawnClosed) return
    const { locationX: sx, locationY: sy } = evt.nativeEvent
    const world = screenToWorld(sx, sy, canvasLayoutRef.current, cameraRef.current)
    if (!world) return
    if (drawPoints.length > 2) {
      const dx = world[0] - drawPoints[0][0], dy = world[1] - drawPoints[0][1]
      if (Math.sqrt(dx*dx + dy*dy) < SNAP_DIST) {
        setFinalPoints(drawPoints); setDrawnClosed(true); setPreviewPoint(null); return
      }
    }
    setDrawPoints(prev => [...prev, world])
  }, [mode, drawnClosed, drawPoints])

  const handleCanvasMove = useCallback((evt) => {
    if (mode !== 'draw' || drawnClosed || drawPoints.length === 0) return
    const { locationX: sx, locationY: sy } = evt.nativeEvent
    const world = screenToWorld(sx, sy, canvasLayoutRef.current, cameraRef.current)
    if (world) setPreviewPoint(world)
  }, [mode, drawnClosed, drawPoints.length])

  const undoPoint  = () => { setDrawPoints(prev => prev.slice(0, -1)); setDrawnClosed(false); setFinalPoints([]) }
  const clearDraw  = () => { setDrawPoints([]); setPreviewPoint(null); setDrawnClosed(false); setFinalPoints([]) }
  const closeShape = () => { if (drawPoints.length < 3) return; setFinalPoints(drawPoints); setDrawnClosed(true); setPreviewPoint(null) }

  return (
    <View style={S.root}>

      {/* ── Canvas ── */}
      <View
        style={S.canvasWrap}
        onLayout={e => { canvasLayoutRef.current = e.nativeEvent.layout }}
        onStartShouldSetResponder={() => isDrawMode}
        onMoveShouldSetResponder={() => isDrawMode && !drawnClosed}
        onResponderGrant={handleCanvasTap}
        onResponderMove={handleCanvasMove}
      >
        <CanvasProvider style={S.canvas}>
          <CameraBridge onCamera={c => { cameraRef.current = c }} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          {/* Source Shapes */}
{sourceShapes?.map((s, i) => (
  <Show2DShapeByPoints
    key={i}
    points={s.points}
    color="#666"
  />
))}

          {/* Catalogue shape (no drawn shape) */}
          {!hasShape && (
            isExtrudeMode
              ? <Show3DExtruded shape={sketchShape} depth={extrudeParams.depth} bevelEnabled={extrudeParams.bevelEnabled} 
              bevelThickness={extrudeParams.bevelThickness} bevelSize={extrudeParams.bevelSize} bevelSegments={extrudeParams.bevelSegments} color={color}
              texture={texture?.name} />
              : <Show2DShape shape={sketchShape} color={color} />
          )}

          {/* Drawn shape — persists all modes */}
          {hasShape && <DrawnShape points={finalPoints} color={color} extruded={isExtrudeMode} extrudeParams={extrudeParams} />}

          {/* Live draw overlay */}
          {isDrawMode && !drawnClosed && <DrawOverlay points={drawPoints} previewPoint={previewPoint} color={color} />}

          {/* SolidWorks-style dimension annotations in canvas */}
          {showDims && (
            <DimAnnotations
              dims={activeDims}
              pts={hasShape ? finalPoints : null}
              showDims={showDims}
              color={color}
            />
          )}
        </CanvasProvider>

        {/* Draw HUD */}
        {isDrawMode && (
          <View style={S.drawHUD} pointerEvents="box-none">
            <View style={S.drawBadge}>
              <View style={[S.drawBadgeDot, { backgroundColor: drawnClosed ? '#00ff88' : '#00d4ff' }]} />
              <Text style={S.drawBadgeTxt}>
                {drawnClosed ? `CLOSED · ${finalPoints.length} pts`
                  : drawPoints.length === 0 ? 'TAP TO PLACE POINTS'
                  : drawPoints.length < 3 ? `${drawPoints.length} PTS · NEED ${3 - drawPoints.length} MORE`
                  : `${drawPoints.length} PTS · TAP ◉ TO CLOSE`}
              </Text>
            </View>
            <View style={S.drawActions}>
              {!drawnClosed && drawPoints.length > 0 && (
                <TouchableOpacity style={S.drawBtn} onPress={undoPoint}><Text style={S.drawBtnIcon}>↩</Text><Text style={S.drawBtnTxt}>UNDO</Text></TouchableOpacity>
              )}
              {!drawnClosed && drawPoints.length >= 3 && (
                <TouchableOpacity style={[S.drawBtn, S.drawBtnAccent]} onPress={closeShape}><Text style={S.drawBtnIcon}>⬡</Text><Text style={[S.drawBtnTxt, { color: '#00d4ff' }]}>CLOSE</Text></TouchableOpacity>
              )}
              {drawPoints.length > 0 && (
                <TouchableOpacity style={[S.drawBtn, S.drawBtnDanger]} onPress={clearDraw}><Text style={S.drawBtnIcon}>✕</Text><Text style={S.drawBtnTxt}>CLEAR</Text></TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Dims Panel — bottom when freehand, top-right otherwise ── */}
      {showDims && (
        <View style={hasShape ? S.dimsPanelBottom : S.dimsPanelTopRight} pointerEvents="box-none">
          <DimsPanel
            dims={activeDims}
            isDrawn={hasShape}
            extruded={isExtrudeMode}
            extrudeDepth={extrudeParams.depth}
            namedDims={namedDims}
            onEditNamed={handleEditNamed}
            onEditEdge={handleEditEdge}
            onClose={() => setShowDims(false)}
          />
        </View>
      )}

      {/* ── Mode Bar ── */}
      <View style={S.modeBar}>
        <TouchableOpacity style={[S.modeBtn, mode === 'sketch' && S.modeBtnActive]} onPress={() => setMode('sketch')}>
          <Text style={[S.modeTxt, mode === 'sketch' && S.modeTxtActive]}>◻ SKETCH</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.modeBtn, isDrawMode && S.modeBtnDraw]} onPress={() => setMode('draw')}>
          <Text style={[S.modeTxt, isDrawMode && S.modeTxtDraw]}>✏ DRAW</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.modeBtn, isExtrudeMode && S.modeBtnActive]} onPress={() => setMode('extrude')}>
          <Text style={[S.modeTxt, isExtrudeMode && S.modeTxtActive]}>⬛ EXTRUDE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.panelToggle} onPress={() => setShowPanel(p => !p)}>
          <Text style={S.modeTxt}>{showPanel ? '▼' : '▲'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.panelToggle, showDims && S.modeBtnDims]} onPress={() => setShowDims(d => !d)}>
          <Text style={[S.modeTxt, showDims && S.modeTxtDims]}>📐</Text>
        </TouchableOpacity>
      </View>

      {/* ── Shape Picker ── */}
      {!isDrawMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.pickerScroll} contentContainerStyle={S.pickerContent}>
          {SHAPES.map(s => (
            <TouchableOpacity key={s.id} style={[S.shapeChip, activeId === s.id && S.shapeChipActive]} onPress={() => setActiveId(s.id)}>
              <Text style={S.shapeIcon}>{s.icon}</Text>
              <Text style={[S.shapeLabel, activeId === s.id && S.shapeLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Properties Panel ── */}
      {showPanel && (
        <View style={S.panel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ScrollView horizontal contentContainerStyle={S.section}>
             <View>
              <Text style={S.sectionTitle}>COLOR</Text>
              <View style={S.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c.hex} onPress={() => setColor(c.hex)} style={[S.colorDot, { backgroundColor: c.hex }, color === c.hex && S.colorDotActive]} />
                ))}
              </View>
             </View>
             <View style={{borderLeftWidth:2,borderColor:'#fff',paddingLeft:5}}>
              <Text style={S.sectionTitle}>Textures</Text>
               <View style={S.colorRow}>
                 {
                  Textures.map(c=>
                  (
                 <TouchableOpacity  key={c.name} onPress={()=>{setTextures(c)}} style={{alignItems:'center'}}>
                   <Image  source={c.image}  style={[S.colorDot]}/>
                   <Text style={S.textureLabel}>{c.name}</Text>
                 </TouchableOpacity>
                
                )
                  )
                 }
               </View>
               
             </View>
            </ScrollView>
            {isDrawMode && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>DRAW MODE</Text>
                <View style={S.drawInfoBox}>
                  <Text style={S.drawInfoLine}>① Tap canvas to place points</Text>
                  <Text style={S.drawInfoLine}>② Tap ◉ first point to close</Text>
                  <Text style={S.drawInfoLine}>③ UNDO / CLOSE / CLEAR buttons</Text>
                  {hasShape && <Text style={[S.drawInfoLine, { color: '#00ff88', marginTop: 4 }]}>✓ Ready — switch to EXTRUDE for 3D</Text>}
                </View>
              </View>
            )}
            {!isDrawMode && hasShape && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>DRAWN SHAPE</Text>
                <View style={S.drawInfoBox}>
                  <Text style={[S.drawInfoLine, { color: '#00ff88' }]}>✓ Freehand active ({finalPoints.length} pts)</Text>
                  <TouchableOpacity style={[S.drawBtn, S.drawBtnDanger, { marginTop: 8, alignSelf: 'flex-start' }]} onPress={clearDraw}>
                    <Text style={S.drawBtnIcon}>✕</Text><Text style={S.drawBtnTxt}>CLEAR SHAPE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!isDrawMode && !hasShape && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>{activeShape.label.toUpperCase()} PARAMS</Text>
                {Object.entries(activeShape.params).map(([key, cfg]) => (
                  <ParamRow key={key} label={cfg.label} value={curParams[key]} config={cfg} onChange={val => updateParam(key, val)} />
                ))}
              </View>
            )}
            {isExtrudeMode && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>EXTRUDE</Text>
                {Object.entries(EXTRUDE_DEFAULTS).map(([key, cfg]) =>
                  cfg.type === 'bool'
                    ? <BoolRow key={key} label={cfg.label} value={extrudeParams[key]} onChange={val => updateExtrude(key, val)} />
                    : <ParamRow key={key} label={cfg.label} value={extrudeParams[key]} config={cfg} onChange={val => updateExtrude(key, val)} />
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

export default Create2D

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = { bg: '#0d0d0f', surface: '#141418', border: '#1e1e24', accent: '#00d4ff', draw: '#a8ff3e', dims: '#ffe03e', text: '#e0e0e8', muted: '#555565' }

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  canvasWrap: { flex: 1 },
  canvas: { flex: 1, backgroundColor: '#0a0a0c' },

  modeBar: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  modeBtn: { flex: 1, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modeBtnActive: { borderColor: C.accent, backgroundColor: '#00d4ff14' },
  modeBtnDraw:   { borderColor: C.draw,   backgroundColor: '#a8ff3e14' },
  modeBtnDims:   { borderColor: C.dims,   backgroundColor: '#ffe03e14' },
  modeTxt: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  modeTxtActive: { color: C.accent },
  modeTxtDraw:   { color: C.draw },
  modeTxtDims:   { color: C.dims },
  panelToggle: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  pickerScroll:  { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 72 },
  pickerContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8, alignItems: 'center' },
  shapeChip:     { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: '#0d0d0f', minWidth: 56 },
  shapeChipActive:  { borderColor: C.accent, backgroundColor: '#00d4ff12' },
  shapeIcon:        { fontSize: 16, color: C.text, lineHeight: 20 },
  shapeLabel:       { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  shapeLabelActive: { color: C.accent },

  panel: { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, maxHeight: 240, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  section:      { marginBottom: 10,padding:10,gap:10},
  sectionTitle: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },

  paramRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  paramLabel:   { color: C.text, fontSize: 12, fontWeight: '500', flex: 1 },
  paramControls:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  nudgeBtn:     { width: 28, height: 28, borderRadius: 4, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  nudgeText:    { color: C.text, fontSize: 16, fontWeight: '300', lineHeight: 20 },
  paramInput:   { width: 72, height: 28, backgroundColor: '#0d0d0f', borderWidth: 1,padding:0, borderColor: C.border, borderRadius: 4, color: C.accent, fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },

  colorRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorDot:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#fff', transform: [{ scale: 1.2 }] },

  drawHUD: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  drawBadge:    { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(13,13,15,0.82)', borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  drawBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  drawBadgeTxt: { fontFamily: MONO, fontSize: 10, color: C.text, letterSpacing: 1, fontWeight: '700' },
  drawActions:  { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  drawBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(13,13,15,0.88)', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  drawBtnAccent:{ borderColor: '#00d4ff60' },
  drawBtnDanger:{ borderColor: '#ff3e3e40' },
  drawBtnIcon:  { fontSize: 14, color: C.text },
  drawBtnTxt:   { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1 },

  drawInfoBox:  { backgroundColor: '#0d0d0f', borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: 10, gap: 4 },
  drawInfoLine: { color: C.muted, fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },

  // Dims panel positions
  dimsPanelTopRight: { position: 'absolute', top: 12, right: 12, zIndex: 30 },
  dimsPanelBottom:   { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30 },
  textureLabel:{color:'#fff',fontSize:10}
})

// ─── Dimension Panel Styles ───────────────────────────────────────────────────
const DS = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(13,13,15,0.97)',
    borderWidth: 1, borderColor: '#2a2a35',
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
    paddingBottom: 12,
    shadowColor: '#ffe03e', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e24' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffe03e', shadowColor: '#ffe03e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4 },
  title: { fontFamily: MONO, fontSize: 10, color: '#e0e0e8', fontWeight: '800', letterSpacing: 2 },
  badge: { backgroundColor: '#a8ff3e22', borderWidth: 1, borderColor: '#a8ff3e50', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTxt: { fontFamily: MONO, fontSize: 7, color: '#a8ff3e', fontWeight: '700', letterSpacing: 1 },
  closeBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#1e1e24', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#555565', fontSize: 11, fontWeight: '700' },

  section:     { fontFamily: MONO, fontSize: 8, color: '#555565', fontWeight: '800', letterSpacing: 2, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 5 },
  sectionHint: { fontSize: 7, color: '#ffe03e88', fontWeight: '600', letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 5 },

  cell: { width: '30%', flex: 1, minWidth: 80, backgroundColor: '#0d0d0f', borderWidth: 1, borderColor: '#1e1e24', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  cellEditable: { borderColor: '#ffe03e30', backgroundColor: '#ffe03e08' },
  cellLabel: { fontFamily: MONO, fontSize: 7, color: '#555565', fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  cellValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  cellValue: { fontFamily: MONO, fontSize: 12, color: '#e0e0e8', fontWeight: '700' },
  cellValueEditable: { color: '#ffe03e' },
  cellUnit:  { fontFamily: MONO, fontSize: 8, color: '#555565', fontWeight: '600' },
  editIcon:  { fontSize: 9, color: '#ffe03e88', marginLeft: 3 },
  cellInput: { fontFamily: MONO, fontSize: 12, color: '#ffe03e', fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#ffe03e', paddingVertical: 0, minWidth: 50 },

})