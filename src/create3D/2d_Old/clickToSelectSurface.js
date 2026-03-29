
import React, { useRef, useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'
import CanvasProvider from '../../provider'
const CYLINDER_RADIUS = 3.5
const CYLINDER_HEIGHT = 5
const CYLINDER_SEGMENTS = 64
const csgEvaluator = new Evaluator()

function detectFaceType(intersection, mesh) {
    const n = intersection.face.normal.clone().transformDirection(mesh.matrixWorld)
    const dot = n.dot(new THREE.Vector3(0, 1, 0))
    if (dot > 0.9) return 'top'
    if (dot < -0.9) return 'bottom'
    return 'side'
}

function buildSketchPlane(faceType, intersection, mesh) {
    const g = new THREE.Group()
    if (faceType === 'top') { g.position.set(0, CYLINDER_HEIGHT / 2 + 0.003, 0); g.rotation.x = -Math.PI / 2 }
    else if (faceType === 'bottom') { g.position.set(0, -(CYLINDER_HEIGHT / 2) - 0.003, 0); g.rotation.x = Math.PI / 2 }
    else { const n = intersection.face.normal.clone().transformDirection(mesh.matrixWorld); g.position.copy(intersection.point); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n) }
    return g
}
function createSketchOverlayMesh(faceType, color) {
    let shape = new THREE.Shape()
    if (faceType === 'top' || faceType === 'bottom') {
        shape.moveTo(-0.6, -0.6); shape.lineTo(0.6, -0.6); shape.lineTo(0.6, 0.6); shape.lineTo(-0.6, 0.6); shape.closePath()
        const h = new THREE.Path(); h.absarc(0, 0, 0.25, 0, Math.PI * 2, false); shape.holes.push(h)
    } else {
        shape.absarc(0, 0, 0.35, 0, Math.PI * 2, false)
        const h = new THREE.Path(); h.absarc(0, 0, 0.15, 0, Math.PI * 2, false); shape.holes.push(h)
    }
    const geo = new THREE.ShapeGeometry(shape, 32)
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }))
}
// ── CHAMFER: triangular wedge subtracted from rim ──
function buildChamferBrush(edgeLocation, radius) {
    const r = Math.min(radius, CYLINDER_RADIUS * 0.75)
    const points = [
        new THREE.Vector2(CYLINDER_RADIUS - r, 0),
        new THREE.Vector2(CYLINDER_RADIUS + 0.06, 0),
        new THREE.Vector2(CYLINDER_RADIUS + 0.06, r),
    ]
    const geo = new THREE.LatheGeometry(points, 64)
    const brush = new Brush(geo, new THREE.MeshStandardMaterial({ color: '#ff8800', side: THREE.FrontSide }))
    if (edgeLocation === 'top-rim') { brush.position.set(0, CYLINDER_HEIGHT / 2 - r, 0) }
    else { brush.rotation.x = Math.PI; brush.position.set(0, -(CYLINDER_HEIGHT / 2) + r, 0) }
    brush.updateMatrixWorld()
    return brush
}
// ── FILLET: quarter-circle arc subtracted from rim ──
function buildFilletBrush(edgeLocation, radius) {
    const r = Math.min(radius, CYLINDER_RADIUS * 0.75)
    const points = [new THREE.Vector2(CYLINDER_RADIUS + 0.06, 0)]
    for (let i = 0; i <= 48; i++) {
        const a = (Math.PI / 2) * (i / 48)
        points.push(new THREE.Vector2((CYLINDER_RADIUS - r) + r * Math.cos(a), r - r * Math.sin(a)))
    }
    points.push(new THREE.Vector2(CYLINDER_RADIUS + 0.06, r + 0.06))
    const geo = new THREE.LatheGeometry(points, 64)
    const brush = new Brush(geo, new THREE.MeshStandardMaterial({ color: '#00aaff', side: THREE.FrontSide }))
    if (edgeLocation === 'top-rim') { brush.position.set(0, CYLINDER_HEIGHT / 2 - r, 0) }
    else { brush.rotation.x = Math.PI; brush.position.set(0, -(CYLINDER_HEIGHT / 2) + r, 0) }
    brush.updateMatrixWorld()
    return brush
}
function computeEdgeLocation(f1, f2) {
    const p = new Set([f1, f2])
    if (p.has('top') && p.has('side')) return 'top-rim'
    if (p.has('bottom') && p.has('side')) return 'bottom-rim'
    return null
}
function buildToolBrush(feature) {
    const { faceType, depth, cutOffset = {}, intersectionPoint, faceNormal, operationType } = feature
    let shape = new THREE.Shape()
    if (faceType === 'top' || faceType === 'bottom') {
        shape.moveTo(-0.6, -0.6); shape.lineTo(0.6, -0.6); shape.lineTo(0.6, 0.6); shape.lineTo(-0.6, 0.6); shape.closePath()
    } else { shape.absarc(0, 0, 0.35, 0, Math.PI * 2, false) }
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 2 })
    const brush = new Brush(geo, new THREE.MeshStandardMaterial({ color: operationType === 'cut' ? '#e84040' : '#5bc8f5', side: THREE.FrontSide }))
    const ox = cutOffset.x ?? 0, oy = cutOffset.y ?? 0, oz = cutOffset.z ?? 0
    if (faceType === 'top') { brush.position.set(ox, operationType === 'boss' ? CYLINDER_HEIGHT / 2 + oy : CYLINDER_HEIGHT / 2 - depth + oy, oz); brush.rotation.x = -Math.PI / 2 }
    else if (faceType === 'bottom') { brush.position.set(ox, operationType === 'boss' ? -(CYLINDER_HEIGHT / 2) - depth + oy : -(CYLINDER_HEIGHT / 2) + oy, oz); brush.rotation.x = Math.PI / 2 }
    else {
        const nd = faceNormal.clone().normalize()
        brush.position.copy(operationType === 'boss' ? intersectionPoint.clone().add(new THREE.Vector3(ox, oy, oz)) : intersectionPoint.clone().addScaledVector(nd, -depth).add(new THREE.Vector3(ox, oy, oz)))
        brush.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nd)
    }
    brush.updateMatrixWorld()
    return brush
}
function computeCSGMesh(features, edgeFeatures) {
    const mat = new THREE.MeshStandardMaterial({ color: '#2a6099', roughness: 0.3, metalness: 0.7, side: THREE.FrontSide })
    let current = new Brush(new THREE.CylinderGeometry(CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_HEIGHT, CYLINDER_SEGMENTS), mat)
    current.updateMatrixWorld()
    for (const f of features) {
        try {
            const r = csgEvaluator.evaluate(current, buildToolBrush(f), f.operationType === 'cut' ? SUBTRACTION : ADDITION)
            r.material = mat.clone(); r.geometry.computeVertexNormals(); r.updateMatrixWorld(); current = r
        } catch (e) { console.warn('[CSG] extrude failed:', e?.message) }
    }
    for (const ef of edgeFeatures) {
        try {
            const tool = ef.edgeType === 'chamfer' ? buildChamferBrush(ef.edgeLocation, ef.radius) : buildFilletBrush(ef.edgeLocation, ef.radius)
            const r = csgEvaluator.evaluate(current, tool, SUBTRACTION)
            r.material = mat.clone(); r.geometry.computeVertexNormals(); r.updateMatrixWorld(); current = r
        } catch (e) { console.warn('[CSG] edge failed:', e?.message) }
    }
    return current
}
function FaceHighlight({ faceType }) {
    const matRef = useRef()
    useFrame(({ clock }) => { if (matRef.current) matRef.current.opacity = 0.5 + Math.sin(clock.elapsedTime * 6) * 0.35 })
    if (faceType === 'side') return (
        <mesh><torusGeometry args={[CYLINDER_RADIUS + 0.05, 0.12, 8, 64]} /><meshBasicMaterial ref={matRef} color="#ffdd00" transparent opacity={0.8} /></mesh>
    )
    const yPos = faceType === 'top' ? CYLINDER_HEIGHT / 2 + 0.02 : -(CYLINDER_HEIGHT / 2) - 0.02
    return (
        <mesh position={[0, yPos, 0]} rotation={[faceType === 'top' ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
            <ringGeometry args={[CYLINDER_RADIUS - 0.25, CYLINDER_RADIUS + 0.15, 64]} />
            <meshBasicMaterial ref={matRef} color="#ffdd00" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
    )
}
function SketchOverlay({ sketch, isSelected, onClick }) {
    const ref = useRef()
    useFrame(({ clock }) => { if (ref.current && isSelected) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04) })
    return <primitive ref={ref} object={sketch.group} onClick={(e) => { e.stopPropagation(); onClick?.() }} />
}
function Scene({ isSketchMode, edgeSelectionMode, sketches, features, edgeFeatures, onFaceClick, onEdgeFaceClick, selectedSketchIdx, onSketchSelect, pendingEdgeFace }) {
    const meshRef = useRef()
    const resultMesh = useMemo(() => computeCSGMesh(features, edgeFeatures), [features, edgeFeatures])
    useFrame(({ clock }) => {
        if (meshRef.current && !isSketchMode && !edgeSelectionMode && features.length === 0 && edgeFeatures.length === 0)
            meshRef.current.rotation.y = clock.elapsedTime * 0.25
    })
    const handleClick = useCallback((e) => {
        e.stopPropagation()
        const hit = e.intersections?.[0]
        if (!hit || !meshRef.current) return
        const faceType = detectFaceType(hit, meshRef.current)
        const faceNormal = hit.face.normal.clone().transformDirection(meshRef.current.matrixWorld)
        if (edgeSelectionMode) { onEdgeFaceClick({ faceType, faceNormal, intersectionPoint: hit.point.clone() }); return }
        if (!isSketchMode) return
        const sp = buildSketchPlane(faceType, hit, meshRef.current)
        sp.add(createSketchOverlayMesh(faceType, { top: '#00e5ff', bottom: '#ff6b35', side: '#a8ff3e' }[faceType]))
        onFaceClick({ group: sp, faceType, intersectionPoint: hit.point.clone(), faceNormal })
    }, [isSketchMode, edgeSelectionMode, onFaceClick, onEdgeFaceClick])
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[6, 10, 6]} intensity={1.4} castShadow />
            <pointLight position={[-5, -5, 5]} intensity={0.5} color="#4488ff" />
            <hemisphereLight skyColor="#aaccff" groundColor="#334455" intensity={0.3} />
            <primitive ref={meshRef} object={resultMesh} onClick={handleClick} />
            {pendingEdgeFace && <FaceHighlight faceType={pendingEdgeFace.faceType} />}
            {sketches.map((sk, i) => <SketchOverlay key={i} sketch={sk} isSelected={i === selectedSketchIdx} onClick={() => onSketchSelect(i)} />)}
        </>
    )
}
function OperationPanel({ sketch, onApply, onCancel }) {
    const [depth, setDepth] = useState('1.5')
    const [showOffset, setShowOffset] = useState(false)
    const [offset, setOffset] = useState({ x: '0', y: '0', z: '0' })
    const faceLabels = { top: '🔵 Top', bottom: '🟠 Bottom', side: '🟢 Side' }
    const po = { x: parseFloat(offset.x) || 0, y: parseFloat(offset.y) || 0, z: parseFloat(offset.z) || 0 }
    return (
        <View style={S.opPanel}>
            <View style={S.opTitleRow}><Text style={S.opTitle}>⚙️ New Feature</Text><TouchableOpacity onPress={onCancel}><Text style={S.opClose}>✕</Text></TouchableOpacity></View>
            <Text style={S.opFace}>{faceLabels[sketch.faceType]} face</Text>
            <View style={S.depthRow}>
                <Text style={S.depthLabel}>Depth</Text>
                <TextInput style={S.depthInput} value={depth} onChangeText={setDepth} keyboardType="numeric" />
            </View>
            <TouchableOpacity style={S.posToggle} onPress={() => setShowOffset(v => !v)}>
                <Text style={S.posToggleText}>{showOffset ? '▼' : '▶'}  Position Offset</Text>
                <View style={S.posPreview}><Text style={S.posPreviewText}>X:{offset.x} Y:{offset.y} Z:{offset.z}</Text></View>
            </TouchableOpacity>
            {showOffset && (
                <View style={S.posGrid}>
                    {['x', 'y', 'z'].map(a => (
                        <View key={a} style={S.posAxisRow}>
                            <Text style={[S.posAxisLabel, a === 'x' && { color: '#e85555' }, a === 'y' && { color: '#34C759' }, a === 'z' && { color: '#3a9fe8' }]}>{a.toUpperCase()}</Text>
                            <TextInput style={S.posInput} value={offset[a]} onChangeText={v => setOffset(p => ({ ...p, [a]: v }))} keyboardType="numeric" />
                        </View>
                    ))}
                    <TouchableOpacity style={S.resetPosBtn} onPress={() => setOffset({ x: '0', y: '0', z: '0' })}><Text style={S.resetPosBtnText}>↺ Reset</Text></TouchableOpacity>
                </View>
            )}
            <View style={S.opBtnRow}>
                <TouchableOpacity style={[S.opBtn, S.bossBtn]} onPress={() => onApply('boss', parseFloat(depth) || 1.5, po)}><Text style={S.opBtnText}>⬆️  Extrude Boss</Text></TouchableOpacity>
                <TouchableOpacity style={[S.opBtn, S.cutBtn]} onPress={() => onApply('cut', parseFloat(depth) || 1.5, po)}><Text style={S.opBtnText}>⬇️  Extrude Cut</Text></TouchableOpacity>
            </View>
        </View>
    )
}
function EdgeSelectionGuide({ edgeMode, step, pendingFace, onCancel }) {
    return (
        <View style={S.edgeGuidePanel}>
            <View style={S.opTitleRow}>
                <Text style={S.edgeGuideTitle}>{edgeMode === 'fillet' ? '🟢 Fillet' : '🔶 Chamfer'} — Step {step}/2</Text>
                <TouchableOpacity onPress={onCancel}><Text style={S.opClose}>✕</Text></TouchableOpacity>
            </View>
            <View style={S.edgeGuideStepsRow}>
                <View style={[S.edgeGuideStepBox, step >= 1 && S.edgeGuideStepBoxActive]}>
                    <Text style={S.edgeGuideStepNum}>1</Text>
                    <Text style={S.edgeGuideStepLabel}>{pendingFace ? `✅ ${pendingFace.faceType}` : 'Face 1'}</Text>

                </View>
                <Text style={S.edgeGuideArrow}>→</Text>
                <View style={[S.edgeGuideStepBox, step >= 2 && S.edgeGuideStepBoxActive]}>
                    <Text style={S.edgeGuideStepNum}>2</Text>
                    <Text style={S.edgeGuideStepLabel}>Face 2</Text>
                </View>
            </View>
            <Text style={S.edgeGuideHint}>
                {!pendingFace ? '💡 Tap top, bottom, or side face'
                    : pendingFace.faceType === 'side' ? '💡 Now tap top or bottom face'
                        : '💡 Now tap the side face'}
            </Text>
        </View>
    )
}
function EdgeFeaturePanel({ edgeLocation, onApply, onCancel }) {
    const [radius, setRadius] = useState('0.4')
    return (
        <View style={S.opPanel}>
            <View style={S.opTitleRow}><Text style={S.opTitle}>🔷 Edge Feature</Text><TouchableOpacity onPress={onCancel}><Text style={S.opClose}>✕</Text></TouchableOpacity></View>
            <Text style={S.opFace}>{edgeLocation === 'top-rim' ? '🔵 Top Rim' : '🟠 Bottom Rim'} edge selected</Text>
            <View style={S.depthRow}>
                <Text style={S.depthLabel}>Radius / Dist</Text>
                <TextInput style={S.depthInput} value={radius} onChangeText={setRadius} keyboardType="numeric" placeholder="0.4" />
            </View>
            <View style={S.edgePreviewRow}>
                <View style={[S.edgePreviewBox, { backgroundColor: '#F0FFF4', borderColor: '#34C759' }]}><Text style={S.edgePreviewIcon}>🟢</Text><Text style={S.edgePreviewLabel}>Fillet</Text><Text style={S.edgePreviewSub}>Smooth curve</Text></View>
                <View style={[S.edgePreviewBox, { backgroundColor: '#FFFBF0', borderColor: '#FFA500' }]}><Text style={S.edgePreviewIcon}>🔶</Text><Text style={S.edgePreviewLabel}>Chamfer</Text><Text style={S.edgePreviewSub}>Flat bevel</Text></View>
            </View>
            <View style={S.opBtnRow}>
                <TouchableOpacity style={[S.opBtn, { backgroundColor: '#F0FFF4', borderColor: '#34C759' }]} onPress={() => onApply('fillet', parseFloat(radius) || 0.4)}><Text style={S.opBtnText}>🟢  Apply Fillet</Text></TouchableOpacity>
                <TouchableOpacity style={[S.opBtn, { backgroundColor: '#FFFBF0', borderColor: '#FFA500' }]} onPress={() => onApply('chamfer', parseFloat(radius) || 0.4)}><Text style={S.opBtnText}>🔶  Apply Chamfer</Text></TouchableOpacity>
            </View>
        </View>
    )
}
function EditPanel({ feature, onSave }) {
    const isEdge = feature.edgeType !== undefined
    const [val, setVal] = useState(String(isEdge ? feature.radius : feature.depth))
    const [offset, setOffset] = useState({ x: String(feature.cutOffset?.x ?? 0), y: String(feature.cutOffset?.y ?? 0), z: String(feature.cutOffset?.z ?? 0) })
    if (isEdge) return (
        <View>
            <Text style={S.opFace}>{feature.edgeType === 'fillet' ? '🟢 Fillet' : '🔶 Chamfer'} — {feature.edgeLocation === 'top-rim' ? 'Top Rim' : 'Bottom Rim'}</Text>
            <View style={S.depthRow}><Text style={S.depthLabel}>Radius</Text><TextInput style={S.depthInput} value={val} onChangeText={setVal} keyboardType="numeric" /></View>
            <TouchableOpacity style={[S.opBtn, S.saveBtn]} onPress={() => onSave({ radius: parseFloat(val) || 0.4 })}><Text style={S.opBtnText}>💾  Save & Rebuild</Text></TouchableOpacity>
        </View>
    )
    const fl = { top: '🔵 Top', bottom: '🟠 Bottom', side: '🟢 Side' }
    return (
        <View>
            <Text style={S.opFace}>{fl[feature.faceType]} face</Text>
            <View style={S.depthRow}><Text style={S.depthLabel}>Depth</Text><TextInput style={S.depthInput} value={val} onChangeText={setVal} keyboardType="numeric" /></View>
            <View style={S.posGrid}>
                <Text style={[S.sectionLabel, { marginBottom: 8 }]}>OFFSET</Text>
                {['x', 'y', 'z'].map(a => (
                    <View key={a} style={S.posAxisRow}>
                        <Text style={[S.posAxisLabel, a === 'x' && { color: '#e85555' }, a === 'y' && { color: '#34C759' }, a === 'z' && { color: '#3a9fe8' }]}>{a.toUpperCase()}</Text>
                        <TextInput style={S.posInput} value={offset[a]} onChangeText={v => setOffset(p => ({ ...p, [a]: v }))} keyboardType="numeric" />
                    </View>
                ))}
            </View>
            <TouchableOpacity style={[S.opBtn, S.saveBtn]} onPress={() => onSave({ depth: parseFloat(val) || 1, cutOffset: { x: parseFloat(offset.x) || 0, y: parseFloat(offset.y) || 0, z: parseFloat(offset.z) || 0 } })}><Text style={S.opBtnText}>💾  Save & Rebuild</Text></TouchableOpacity>
        </View>
    )
}
function FeatureTreeItem({ feature, index, featureType, onDelete, onEdit }) {
    const isEdge = featureType === 'edge'
    const icon = isEdge ? (feature.edgeType === 'fillet' ? '🟢' : '🔶') : (feature.operationType === 'cut' ? '⬇️' : '⬆️')
    const name = isEdge ? (feature.edgeType === 'fillet' ? 'Fillet' : 'Chamfer') : (feature.operationType === 'cut' ? 'Extrude Cut' : 'Extrude Boss')

    const meta = isEdge
        ? `${feature.edgeLocation === 'top-rim' ? 'Top Rim' : 'Bottom Rim'} · R ${feature.radius.toFixed(2)}`
        : `${{ top: 'Top', bottom: 'Bottom', side: 'Side' }[feature.faceType]} · depth ${feature.depth.toFixed(2)}`



    const bg = isEdge ? (feature.edgeType === 'fillet' ? '#f0fff4' : '#fffbf0') : (feature.operationType === 'cut' ? '#fff5f5' : '#f0f8ff')
    const bc = isEdge ? (feature.edgeType === 'fillet' ? '#b2dfdb' : '#ffe0b2') : (feature.operationType === 'cut' ? '#f5c0c0' : '#c8e0f8')
    return (
        <View style={[S.featureItem, { backgroundColor: bg, borderColor: bc }]}>
            <Text style={S.featureIcon}>{icon}</Text>
            <View style={S.featureInfo}>
                <Text style={S.featureName}>{name}</Text>
                <Text style={S.featureMeta}>{meta}</Text>
                {!isEdge && feature.cutOffset && <Text style={S.featureOffset}>📍 X:{(feature.cutOffset.x ?? 0).toFixed(1)} Y:{(feature.cutOffset.y ?? 0).toFixed(1)} Z:{(feature.cutOffset.z ?? 0).toFixed(1)}</Text>}
            </View>
            <TouchableOpacity style={S.editBtn} onPress={() => onEdit(index, featureType)}><Text style={S.editBtnText}>✏️</Text></TouchableOpacity>
            <TouchableOpacity style={S.deleteBtn} onPress={() => onDelete(index, featureType)}><Text style={S.deleteBtnText}>🗑</Text></TouchableOpacity>
        </View>
    )
}
export default function CylinderFaceSketch() {
    const [isSketchMode, setIsSketchMode] = useState(false)
    const [sketches, setSketches] = useState([])
    const [features, setFeatures] = useState([])
    const [edgeFeatures, setEdgeFeatures] = useState([])
    const [selectedSketchIdx, setSelectedSketchIdx] = useState(null)
    const [editingFeatureIdx, setEditingFeatureIdx] = useState(null)
    const [editingFeatureType, setEditingFeatureType] = useState(null)
    const [activeTab, setActiveTab] = useState('sketch')
    const [bottomMinimized, setBottomMinimized] = useState(false)
    const [edgeSelectionMode, setEdgeSelectionMode] = useState(null)
    const [pendingEdgeFace, setPendingEdgeFace] = useState(null)
    const [pendingEdgeLocation, setPendingEdgeLocation] = useState(null)
    const handleFaceClick = useCallback((sketchData) => {
        setSketches(prev => { const next = [...prev, sketchData]; setSelectedSketchIdx(next.length - 1); return next })
    }, [])
    const handleSketchSelect = useCallback((idx) => { setSelectedSketchIdx(p => p === idx ? null : idx) }, [])
    const handleApplyFeature = useCallback((operationType, depth, cutOffset) => {
        if (selectedSketchIdx === null) return
        const sketch = sketches[selectedSketchIdx]
        setFeatures(prev => [...prev, { id: Date.now(), operationType, faceType: sketch.faceType, depth, cutOffset, intersectionPoint: sketch.intersectionPoint, faceNormal: sketch.faceNormal }])
        if (sketch.group) {
            sketch.group.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { Array.isArray(obj.material) ? obj.material.forEach(m => m.dispose()) : obj.material.dispose() } })
            if (sketch.group.parent) sketch.group.parent.remove(sketch.group)
        }
        setSketches(prev => prev.filter((_, i) => i !== selectedSketchIdx)); setSelectedSketchIdx(null); setActiveTab('features'); setBottomMinimized(false)
    }, [selectedSketchIdx, sketches])
    const handleEdgeFaceClick = useCallback((faceData) => {
        if (!pendingEdgeFace) { setPendingEdgeFace(faceData) }
        else {
            const edgeLocation = computeEdgeLocation(pendingEdgeFace.faceType, faceData.faceType)
            if (!edgeLocation) { setPendingEdgeFace(faceData); return }
            setPendingEdgeLocation(edgeLocation); setPendingEdgeFace(null)
        }
    }, [pendingEdgeFace])
    const handleApplyEdgeFeature = useCallback((edgeType, radius) => {
        if (!pendingEdgeLocation) return
        setEdgeFeatures(prev => [...prev, { id: Date.now(), edgeType, edgeLocation: pendingEdgeLocation, radius }])
        setPendingEdgeLocation(null); setEdgeSelectionMode(null); setPendingEdgeFace(null); setActiveTab('features'); setBottomMinimized(false)
    }, [pendingEdgeLocation])
    const cancelEdgeSelection = useCallback(() => { setEdgeSelectionMode(null); setPendingEdgeFace(null); setPendingEdgeLocation(null) }, [])
    const startEdgeMode = useCallback((mode) => {
        setIsSketchMode(false); setPendingEdgeFace(null); setPendingEdgeLocation(null)
        setEdgeSelectionMode(prev => prev === mode ? null : mode)
    }, [])
    const handleEditFeature = useCallback((idx, type) => { setEditingFeatureIdx(idx); setEditingFeatureType(type); setActiveTab('edit'); setBottomMinimized(false) }, [])
    const handleSaveFeature = useCallback((idx, type, updates) => {
        if (type === 'extrude') setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f))
        else setEdgeFeatures(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f))
        setEditingFeatureIdx(null); setEditingFeatureType(null); setActiveTab('features')
    }, [])
    const handleDeleteFeature = useCallback((idx, type) => {
        if (type === 'extrude') {
            setFeatures(prev => prev.filter((_, i) => i !== idx))
        } else {
            setEdgeFeatures(prev => prev.filter((_, i) => i !== idx))
        }
    }, [])

    const clearAll = () => { setSketches([]); setFeatures([]); setEdgeFeatures([]); setSelectedSketchIdx(null); setEditingFeatureIdx(null); setEditingFeatureType(null); cancelEdgeSelection() }
    const selectedSketch = selectedSketchIdx !== null ? sketches[selectedSketchIdx] : null
    const editingFeature =
        editingFeatureIdx !== null
            ? editingFeatureType === 'edge'
                ? edgeFeatures[editingFeatureIdx]
                : features[editingFeatureIdx]
            : null

    const totalFeatureCount = features.length + edgeFeatures.length
    const showEdgePanel = pendingEdgeLocation !== null
    const showSketchOpPanel = selectedSketch && !showEdgePanel && !editingFeature
    const showEdgeGuide = edgeSelectionMode && !pendingEdgeLocation
    const edgeStep = pendingEdgeFace ? 2 : 1
    return (
        <View style={S.container}>
            <View style={S.canvasArea}>
                <CanvasProvider>
                    <Scene isSketchMode={isSketchMode} edgeSelectionMode={edgeSelectionMode} sketches={sketches} features={features} edgeFeatures={edgeFeatures} onFaceClick={handleFaceClick} onEdgeFaceClick={handleEdgeFaceClick} selectedSketchIdx={selectedSketchIdx} onSketchSelect={handleSketchSelect} pendingEdgeFace={pendingEdgeFace} />
                </CanvasProvider>
            </View>
            {showSketchOpPanel && <View style={S.floatingPanelRight}><OperationPanel sketch={selectedSketch} onApply={handleApplyFeature} onCancel={() => setSelectedSketchIdx(null)} /></View>}
            {showEdgeGuide && <View style={S.floatingPanelLeft}><EdgeSelectionGuide edgeMode={edgeSelectionMode} step={edgeStep} pendingFace={pendingEdgeFace} onCancel={cancelEdgeSelection} /></View>}
            {showEdgePanel && <View style={S.floatingPanelRight}><EdgeFeaturePanel edgeLocation={pendingEdgeLocation} onApply={handleApplyEdgeFeature} onCancel={cancelEdgeSelection} /></View>}

            <View style={[S.bottomSheet, bottomMinimized && S.bottomSheetMinimized]}>
                <View style={S.sheetHeader}>
                    <View style={S.sheetPill} />
                    <View style={S.sheetHeaderRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll}>
                            {[
                                { key: 'sketch', label: '✏️  Sketch' },
                                { key: 'edge', label: `🔷  Edge${edgeFeatures.length > 0 ? ` (${edgeFeatures.length})` : ''}` },
                                { key: 'features', label: `📐  Features${totalFeatureCount > 0 ? ` (${totalFeatureCount})` : ''}` },
                                ...(editingFeature ? [{ key: 'edit', label: '✏️  Edit' }] : []),
                                { key: 'guide', label: '📖  Guide' },
                            ].map(({ key, label }) => (
                                <TouchableOpacity key={key} style={[S.tab, activeTab === key && S.tabActive]} onPress={() => { setActiveTab(key); setBottomMinimized(false) }}>
                                    <Text style={[S.tabText, activeTab === key && S.tabTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={S.minimizeBtn} onPress={() => setBottomMinimized(v => !v)}>
                            <Text style={S.minimizeBtnText}>{bottomMinimized ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!bottomMinimized && (
                    <ScrollView style={S.sheetBody} contentContainerStyle={S.sheetBodyContent} showsVerticalScrollIndicator={false}>

                        {activeTab === 'sketch' && (
                            <>
                                <View style={S.sheetSection}>
                                    <Text style={S.sectionLabel}>MODE</Text>
                                    <TouchableOpacity style={[S.modeBtn, isSketchMode && S.modeBtnActive]} onPress={() => { if (edgeSelectionMode) cancelEdgeSelection(); setIsSketchMode(v => !v) }}>
                                        <Text style={S.modeBtnIcon}>{isSketchMode ? '✏️' : '🔒'}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[S.modeBtnTitle, isSketchMode && S.modeBtnTitleActive]}>{isSketchMode ? 'Sketch Mode ON' : 'Sketch Mode OFF'}</Text>
                                            <Text style={S.modeBtnSub}>{isSketchMode ? 'Tap a face to place sketch' : 'Enable to start sketching'}</Text>
                                        </View>
                                        <View style={[S.modeIndicator, isSketchMode && S.modeIndicatorActive]} />
                                    </TouchableOpacity>
                                </View>
                                {sketches.length > 0 && (
                                    <View style={S.sheetSection}>
                                        <Text style={S.sectionLabel}>ACTIVE SKETCHES</Text>
                                        {sketches.map((sk, i) => (
                                            <TouchableOpacity key={i} style={[S.sketchChip, selectedSketchIdx === i && S.sketchChipSelected]} onPress={() => handleSketchSelect(i)}>
                                                <Text style={S.sketchChipIcon}>{sk.faceType === 'top' ? '🔵' : sk.faceType === 'bottom' ? '🟠' : '🟢'}</Text>
                                                <Text style={S.sketchChipText}>Sketch #{i + 1} — {sk.faceType} face</Text>
                                                {selectedSketchIdx === i && <Text style={S.sketchChipBadge}>SELECTED</Text>}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {(sketches.length > 0 || totalFeatureCount > 0) && <TouchableOpacity style={S.clearBtn} onPress={clearAll}><Text style={S.clearBtnText}>🗑  Clear All</Text></TouchableOpacity>}
                            </>
                        )}

                        {activeTab === 'edge' && (
                            <View style={S.sheetSection}>
                                <Text style={S.sectionLabel}>EDGE FEATURES</Text>
                                <Text style={S.edgeTabInfo}>Select fillet or chamfer, then tap two adjacent faces on the model to define the edge.</Text>
                                <View style={S.edgeBtnGroup}>
                                    <TouchableOpacity style={[S.edgeTypeBtn, edgeSelectionMode === 'fillet' && { backgroundColor: '#eefbf0', borderColor: '#34C759' }]} onPress={() => startEdgeMode('fillet')}>
                                        <Text style={S.edgeTypeBtnIcon}>🟢</Text>
                                        <View style={{ flex: 1 }}><Text style={S.edgeTypeBtnTitle}>Fillet</Text><Text style={S.edgeTypeBtnSub}>Smooth rounded edge</Text></View>
                                        {edgeSelectionMode === 'fillet' && <View style={[S.modeIndicator, S.modeIndicatorActive]} />}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[S.edgeTypeBtn, edgeSelectionMode === 'chamfer' && { backgroundColor: '#fffbf0', borderColor: '#FFA500' }]} onPress={() => startEdgeMode('chamfer')}>
                                        <Text style={S.edgeTypeBtnIcon}>🔶</Text>
                                        <View style={{ flex: 1 }}><Text style={S.edgeTypeBtnTitle}>Chamfer</Text><Text style={S.edgeTypeBtnSub}>Flat 45° angled bevel</Text></View>
                                        {edgeSelectionMode === 'chamfer' && <View style={[S.modeIndicator, { backgroundColor: '#FFA500' }]} />}
                                    </TouchableOpacity>
                                </View>
                                {edgeSelectionMode && (
                                    <View style={S.edgeStepStatus}>
                                        <Text style={S.edgeStepStatusTitle}>{edgeSelectionMode === 'fillet' ? '🟢 Fillet' : '🔶 Chamfer'} — Select 2 Faces</Text>
                                        <View style={S.edgeStepRow}><View style={[S.edgeStepDot, pendingEdgeFace && S.edgeStepDotDone]} /><Text style={S.edgeStepText}>{pendingEdgeFace ? `✅ Face 1: ${pendingEdgeFace.faceType}` : '⬡  Tap Face 1 on model'}</Text></View>
                                        <View style={S.edgeStepRow}><View style={[S.edgeStepDot, pendingEdgeLocation && S.edgeStepDotDone]} /><Text style={S.edgeStepText}>{pendingEdgeLocation ? `✅ Edge: ${pendingEdgeLocation}` : '⬡  Tap adjacent Face 2'}</Text></View>
                                        <TouchableOpacity style={S.cancelEdgeBtn} onPress={cancelEdgeSelection}><Text style={S.cancelEdgeBtnText}>✕  Cancel</Text></TouchableOpacity>
                                    </View>
                                )}
                                {edgeFeatures.length > 0 && (
                                    <View style={{ marginTop: 14 }}>
                                        <Text style={[S.sectionLabel, { marginBottom: 8 }]}>APPLIED</Text>
                                        {edgeFeatures.map((ef, i) => (
                                            <View key={ef.id} style={[S.featureItem, { backgroundColor: ef.edgeType === 'fillet' ? '#f0fff4' : '#fffbf0', borderColor: ef.edgeType === 'fillet' ? '#b2dfdb' : '#ffe0b2' }]}>
                                                <Text style={S.featureIcon}>{ef.edgeType === 'fillet' ? '🟢' : '🔶'}</Text>
                                                <View style={S.featureInfo}><Text style={S.featureName}>{ef.edgeType === 'fillet' ? 'Fillet' : 'Chamfer'}</Text><Text style={S.featureMeta}>{ef.edgeLocation === 'top-rim' ? 'Top Rim' : 'Bottom Rim'} · R {ef.radius.toFixed(2)}</Text></View>
                                                <TouchableOpacity style={S.editBtn} onPress={() => handleEditFeature(i, 'edge')}><Text style={S.editBtnText}>✏️</Text></TouchableOpacity>
                                                <TouchableOpacity style={S.deleteBtn} onPress={() => handleDeleteFeature(i, 'edge')}><Text style={S.deleteBtnText}>🗑</Text></TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'features' && (
                            <View style={S.sheetSection}>
                                <Text style={S.sectionLabel}>FEATURE TREE</Text>
                                {totalFeatureCount === 0 ? (
                                    <View style={S.emptyState}><Text style={S.emptyStateIcon}>📭</Text><Text style={S.emptyStateText}>No features yet</Text><Text style={S.emptyStateSub}>Sketch a face or select an edge</Text></View>
                                ) : (
                                    <>
                                        {features.map((f, i) => <FeatureTreeItem key={f.id} feature={f} index={i} featureType="extrude" onDelete={handleDeleteFeature} onEdit={handleEditFeature} />)}
                                        {edgeFeatures.map((f, i) => <FeatureTreeItem key={f.id} feature={f} index={i} featureType="edge" onDelete={handleDeleteFeature} onEdit={handleEditFeature} />)}
                                    </>
                                )}
                            </View>
                        )}

                        {activeTab === 'edit' && editingFeature && (
                            <View style={S.sheetSection}>
                                <View style={S.editTabHeader}>
                                    <Text style={S.sectionLabel}>{editingFeatureType === 'edge' ? (editingFeature.edgeType === 'fillet' ? '🟢 EDIT FILLET' : '🔶 EDIT CHAMFER') : (editingFeature.operationType === 'cut' ? '⬇️  EDIT CUT' : '⬆️  EDIT BOSS')}</Text>
                                    <TouchableOpacity style={S.editTabClose} onPress={() => { setEditingFeatureIdx(null); setEditingFeatureType(null); setActiveTab('features') }}><Text style={S.editTabCloseText}>✕ Done</Text></TouchableOpacity>
                                </View>
                                <EditPanel feature={editingFeature} onSave={(u) => handleSaveFeature(editingFeatureIdx, editingFeatureType, u)} />
                            </View>
                        )}

                        {activeTab === 'guide' && (
                            <View style={S.sheetSection}>
                                <Text style={S.sectionLabel}>HOW TO USE</Text>
                                {[
                                    { n: '1', icon: '✏️', title: 'Extrude Boss / Cut', sub: 'Sketch tab → Enable Sketch Mode → tap face → set depth → Boss or Cut' },
                                    { n: '2', icon: '🟢', title: 'Fillet (Rounded Edge)', sub: 'Edge tab → tap Fillet → tap top face → tap side face → set radius → Apply Fillet' },
                                    { n: '3', icon: '🔶', title: 'Chamfer (Flat Bevel)', sub: 'Edge tab → tap Chamfer → tap top/bottom face → tap side face → set distance → Apply Chamfer' },
                                    { n: '4', icon: '📐', title: 'Feature Tree', sub: 'Features tab shows all operations. CSG rebuilds from scratch in order.' },
                                    { n: '5', icon: '✏️', title: 'Edit / Delete', sub: 'Tap ✏️ to update depth/radius. Tap 🗑 to remove. Auto-rebuilds.' },
                                ].map(({ n, icon, title, sub }) => (
                                    <View key={n} style={S.guideStep}>
                                        <View style={S.guideStepNum}><Text style={S.guideStepNumText}>{n}</Text></View>
                                        <Text style={S.guideStepIcon}>{icon}</Text>
                                        <View style={S.guideStepInfo}><Text style={S.guideStepTitle}>{title}</Text><Text style={S.guideStepSub}>{sub}</Text></View>
                                    </View>
                                ))}
                            </View>
                        )}

                    </ScrollView>
                )}
            </View>
        </View>
    )
}
const S = StyleSheet.create({
    container: { flex: 1, flexDirection: 'column', backgroundColor: '#0d0f14' },
    canvasArea: { flex: 1 },
    floatingPanelRight: { position: 'absolute', top: 20, right: 16, width: 256, zIndex: 20 },
    floatingPanelLeft: { position: 'absolute', top: 20, left: 16, width: 220, zIndex: 20 },
    opPanel: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 16 },
    opTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    opTitle: { flex: 1, color: '#1a1a2e', fontSize: 14, fontWeight: '700' },
    opClose: { color: '#aaa', fontSize: 18, fontWeight: '700', paddingLeft: 8 },
    opFace: { color: '#888', fontSize: 11, marginBottom: 12 },
    depthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    depthLabel: { color: '#555', fontSize: 13, flex: 1, fontWeight: '600' },
    depthInput: { backgroundColor: '#f5f7fa', borderWidth: 1.5, borderColor: '#d0d8e8', borderRadius: 8, color: '#1a1a2e', fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, width: 76, textAlign: 'center' },
    posToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#d0e8f5', backgroundColor: '#f0f8ff', marginBottom: 8 },
    posToggleText: { color: '#2a7fc0', fontSize: 11, fontWeight: '600' },
    posPreview: { backgroundColor: '#ddeeff', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
    posPreviewText: { color: '#336699', fontSize: 9, fontWeight: '600' },
    posGrid: { backgroundColor: '#f7faff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#dde8f5' },
    posAxisRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    posAxisLabel: { fontSize: 13, fontWeight: '800', width: 18, textAlign: 'center' },
    posInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#c8d8ee', borderRadius: 7, color: '#1a1a2e', fontSize: 13, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 6, textAlign: 'center' },
    resetPosBtn: { alignItems: 'center', paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: '#dde8f5', backgroundColor: '#fff', marginTop: 2 },
    resetPosBtnText: { color: '#6688aa', fontSize: 10, fontWeight: '600' },
    opBtnRow: { gap: 8 },
    opBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, marginBottom: 4 },
    bossBtn: { backgroundColor: '#EBF8FF', borderColor: '#3bb5e8' },
    cutBtn: { backgroundColor: '#FFF0F0', borderColor: '#e85555' },
    saveBtn: { backgroundColor: '#F0FFF4', borderColor: '#34C759' },
    opBtnText: { color: '#1a1a2e', fontSize: 13, fontWeight: '700' },
    edgePreviewRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    edgePreviewBox: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5 },
    edgePreviewIcon: { fontSize: 20, marginBottom: 3 },
    edgePreviewLabel: { fontSize: 12, fontWeight: '700', color: '#333' },
    edgePreviewSub: { fontSize: 9, color: '#888', marginTop: 2 },
    edgeGuidePanel: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 14 },
    edgeGuideTitle: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
    edgeGuideStepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    edgeGuideStepBox: { flex: 1, backgroundColor: '#2a2a4e', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3a3a5e' },
    edgeGuideStepBoxActive: { backgroundColor: '#1a3a5e', borderColor: '#3a9fe8' },
    edgeGuideStepNum: { color: '#aaa', fontSize: 20, fontWeight: '800' },
    edgeGuideStepLabel: { color: '#ccc', fontSize: 9, textAlign: 'center', marginTop: 2 },
    edgeGuideArrow: { color: '#444', fontSize: 18 },
    edgeGuideHint: { color: '#88aacc', fontSize: 10, textAlign: 'center', lineHeight: 15 },
    bottomSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.13, shadowRadius: 18, elevation: 22, zIndex: 10, height: 350 },
    bottomSheetMinimized: { maxHeight: 62 },
    sheetHeader: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 2, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#fff' },
    sheetPill: { width: 38, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
    sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    tabScroll: { flex: 1 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: '#f4f5f7' },
    tabActive: { backgroundColor: '#1a1a2e' },
    tabText: { color: '#888', fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    minimizeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f4f5f7', alignItems: 'center', justifyContent: 'center' },
    minimizeBtnText: { fontSize: 12, color: '#555', fontWeight: '700' },
    sheetBody: { flex: 1 },
    sheetBodyContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
    sheetSection: { marginBottom: 8 },
    sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#aaa', marginBottom: 8 },
    modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f4f5f7', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#e8eaed' },
    modeBtnActive: { backgroundColor: '#eefbf0', borderColor: '#34C759' },
    modeBtnIcon: { fontSize: 22 },
    modeBtnTitle: { fontSize: 13, fontWeight: '700', color: '#333' },
    modeBtnTitleActive: { color: '#1a7a30' },
    modeBtnSub: { fontSize: 10, color: '#999', marginTop: 1 },
    modeIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd', marginLeft: 'auto' },
    modeIndicatorActive: { backgroundColor: '#34C759' },
    edgeTabInfo: { color: '#888', fontSize: 11, marginBottom: 14, lineHeight: 16 },
    edgeBtnGroup: { gap: 8, marginBottom: 12 },
    edgeTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9f9fb', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#e8eaed' },
    edgeTypeBtnIcon: { fontSize: 22 },
    edgeTypeBtnTitle: { fontSize: 13, fontWeight: '700', color: '#333' },
    edgeTypeBtnSub: { fontSize: 10, color: '#999', marginTop: 1 },
    edgeStepStatus: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginTop: 4 },
    edgeStepStatusTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 10 },
    edgeStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    edgeStepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#444', borderWidth: 2, borderColor: '#666' },
    edgeStepDotDone: { backgroundColor: '#34C759', borderColor: '#34C759' },
    edgeStepText: { color: '#ccc', fontSize: 11 },
    cancelEdgeBtn: { alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#2a2a3e', marginTop: 4 },
    cancelEdgeBtnText: { color: '#e85555', fontSize: 11, fontWeight: '700' },
    sketchChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9f9fb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#e8eaed', marginBottom: 6 },
    sketchChipSelected: { backgroundColor: '#EBF5FF', borderColor: '#3a9fe8' },
    sketchChipIcon: { fontSize: 16 },
    sketchChipText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#333' },
    sketchChipBadge: { fontSize: 9, fontWeight: '700', color: '#3a9fe8', letterSpacing: 0.8, backgroundColor: '#daeeff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    clearBtn: { borderRadius: 10, paddingVertical: 10, backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#ffcccc', alignItems: 'center', marginTop: 4 },
    clearBtnText: { color: '#cc3333', fontSize: 12, fontWeight: '700' },
    featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, gap: 10 },
    featureIcon: { fontSize: 18 },
    featureInfo: { flex: 1 },
    featureName: { color: '#1a1a2e', fontSize: 12, fontWeight: '700' },
    featureMeta: { color: '#888', fontSize: 10, marginTop: 2 },
    featureOffset: { color: '#5588bb', fontSize: 10, marginTop: 2, fontWeight: '600' },
    editBtn: { padding: 6, backgroundColor: '#EBF5FF', borderRadius: 8 },
    editBtnText: { fontSize: 14 },
    deleteBtn: { padding: 6, backgroundColor: '#fff0f0', borderRadius: 8 },
    deleteBtnText: { fontSize: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 28 },
    emptyStateIcon: { fontSize: 34, marginBottom: 8 },
    emptyStateText: { fontSize: 14, fontWeight: '700', color: '#555' },
    emptyStateSub: { fontSize: 11, color: '#aaa', marginTop: 4 },
    guideStep: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9f9fb', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
    guideStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
    guideStepNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    guideStepIcon: { fontSize: 18 },
    guideStepInfo: { flex: 1 },
    guideStepTitle: { fontSize: 12, fontWeight: '700', color: '#222' },
    guideStepSub: { fontSize: 10, color: '#888', marginTop: 1 },
    editTabHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    editTabClose: { backgroundColor: '#f4f5f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    editTabCloseText: { fontSize: 11, fontWeight: '700', color: '#555' },
})

