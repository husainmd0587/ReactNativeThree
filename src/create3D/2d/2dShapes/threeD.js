/**
 * ToThreeDScreen.jsx
 * Receives a closed 2D shape2D from SketchScreen and renders it
 * as an extrudable 3D solid using Three.js inside a WebView.
 *
 * Navigation route: "ToThreeD"
 * Params: { shape2D, sourceShapes }
 *   shape2D.type   — "polygon" | "circle" | "ellipse" | "lineloop" | "polyline"
 *   shape2D.points — array of {x, y} in canvas coordinates
 *   shape2D.source — original shape (for metadata)
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity,
  useWindowDimensions, ScrollView, Platform,
} from "react-native";
import { WebView } from "react-native-webview";

// ─── DESIGN TOKENS ────────────────────────────────────────────
const C = {
  bg:         "#0D0F14",
  panel:      "#13161D",
  border:     "#1E2430",
  accent:     "#1ABCFE",
  success:    "#00FF9C",
  warn:       "#FF6B2B",
  danger:     "#FF3B3B",
  gold:       "#FFD600",
  text:       "#C8D0E0",
  textDim:    "#4A5568",
  textBright: "#EEF2FF",
};

// ─── MATERIALS ────────────────────────────────────────────────
const MATERIALS = [
  { id:"steel",    label:"Steel",    color:"#8EA8C0", metalness:0.9, roughness:0.2  },
  { id:"aluminium",label:"Aluminium",color:"#C0C8D0", metalness:0.8, roughness:0.3  },
  { id:"plastic",  label:"Plastic",  color:"#2060CC", metalness:0.0, roughness:0.6  },
  { id:"wood",     label:"Wood",     color:"#C8834A", metalness:0.0, roughness:0.85 },
  { id:"gold",     label:"Gold",     color:"#FFD600", metalness:1.0, roughness:0.1  },
  { id:"rubber",   label:"Rubber",   color:"#1A1A2E", metalness:0.0, roughness:0.95 },
  { id:"glass",    label:"Glass",    color:"#A0D8EF", metalness:0.0, roughness:0.05 },
  { id:"concrete", label:"Concrete", color:"#78808A", metalness:0.0, roughness:0.95 },
];

// ─── BUILD THREE.JS HTML ──────────────────────────────────────
/**
 * Generates a self-contained HTML page with Three.js that:
 * - Creates an ExtrudeGeometry from the 2D shape2D points
 * - Adds ambient + directional lights, shadow casting
 * - Handles touch-based rotate + pinch-zoom
 * - Listens for postMessage to update extrude depth and material
 */
function buildThreeHTML(shape2D, initialDepth, mat) {
  // Normalize points: centre the shape2D around (0,0), scale to unit size
  const pts = shape2D.points;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const range = Math.max(maxX - minX, maxY - minY, 1);
  const NORM = 2.0 / range; // normalise into [-1, 1]

  // Convert to normalised Three.js coords (flip Y: canvas Y-down → 3D Y-up)
  const normPts = pts.map(p => ({
    x: (p.x - cx) * NORM,
    y: -(p.y - cy) * NORM,  // flip Y
  }));

  const ptsJSON = JSON.stringify(normPts);
  const matJSON = JSON.stringify(mat);
  const depthNorm = (initialDepth / 100) * NORM * range / 2; // depth in scene units

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:#0A0C10}
  canvas{display:block;width:100%!important;height:100%!important}
  #info{
    position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
    background:rgba(13,15,20,0.8);border:1px solid rgba(26,188,254,0.2);
    border-radius:6px;padding:6px 14px;
    font-family:monospace;font-size:11px;color:#4A5568;
    white-space:nowrap;pointer-events:none;
  }
  #snap{
    position:absolute;top:12px;right:12px;
    background:rgba(0,255,156,0.12);border:1px solid rgba(0,255,156,0.4);
    border-radius:5px;padding:6px 12px;
    font-family:monospace;font-size:11px;color:#00FF9C;
    cursor:pointer;
  }
</style>
</head>
<body>
<div id="info">Drag to rotate · Pinch to zoom</div>
<div id="snap" onclick="snapView()">⬡ Top</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
  // ── Scene setup ──────────────────────────────────────────
  const W = window.innerWidth, H = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0C10);

  const camera = new THREE.PerspectiveCamera(50, W/H, 0.01, 100);
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0, 0);

  // ── Lights ───────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x334466, 1.0);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far  = 50;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6;
  sun.shadow.camera.right = sun.shadow.camera.top = 6;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x1ABCFE, 0.6);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  const rim = new THREE.PointLight(0xFFD600, 0.4, 20);
  rim.position.set(2, -2, 4);
  scene.add(rim);

  // ── Grid floor ───────────────────────────────────────────
  const grid = new THREE.GridHelper(10, 20, 0x1ABCFE, 0x1E2430);
  grid.position.y = -2;
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  scene.add(grid);

  // ── Profile shape ────────────────────────────────────────
  const rawPts = ${ptsJSON};
  const shape  = new THREE.Shape();
  shape.moveTo(rawPts[0].x, rawPts[0].y);
  for (let i=1; i<rawPts.length; i++) shape.lineTo(rawPts[i].x, rawPts[i].y);
  shape.closePath();

  // ── Material ─────────────────────────────────────────────
  let matDef = ${matJSON};
  let material = makeMaterial(matDef);

  function makeMaterial(m) {
    if (m.id === 'glass') {
      return new THREE.MeshPhysicalMaterial({
        color:       new THREE.Color(m.color),
        metalness:   m.metalness,
        roughness:   m.roughness,
        transmission: 0.85,
        transparent: true,
        opacity:     0.4,
      });
    }
    return new THREE.MeshStandardMaterial({
      color:     new THREE.Color(m.color),
      metalness: m.metalness,
      roughness: m.roughness,
    });
  }

  // ── Mesh ─────────────────────────────────────────────────
  let depth    = ${depthNorm.toFixed(4)};
  let mesh     = null;
  let wireframe= null;
  let showWire = false;

  function buildMesh() {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    if (wireframe) { scene.remove(wireframe); wireframe.geometry.dispose(); }

    const extrudeSettings = {
      depth,
      bevelEnabled:    true,
      bevelThickness:  depth * 0.04,
      bevelSize:       depth * 0.03,
      bevelSegments:   3,
      curveSegments:   32,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    mesh = new THREE.Mesh(geo, material);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (showWire) {
      const wgeo = new THREE.WireframeGeometry(geo);
      wireframe = new THREE.LineSegments(wgeo,
        new THREE.LineBasicMaterial({ color:0x1ABCFE, opacity:0.25, transparent:true })
      );
      scene.add(wireframe);
    }
  }
  buildMesh();

  // ── Orbit controls (manual, no import needed) ────────────
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let rotX = 0.35, rotY = -0.4;
  let camDist = 5;
  let pinchDist0 = null;

  function applyCamera() {
    const x = camDist * Math.sin(rotY) * Math.cos(rotX);
    const y = camDist * Math.sin(rotX);
    const z = camDist * Math.cos(rotY) * Math.cos(rotX);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }
  applyCamera();

  function snapView() {
    rotX = Math.PI/2 - 0.01; rotY = 0; camDist = 4;
    applyCamera();
    window.ReactNativeWebView?.postMessage(JSON.stringify({type:'snap'}));
  }
  window.snapView = snapView;

  const el = renderer.domElement;

  el.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist0 = Math.hypot(dx, dy);
    }
  }, {passive:false});

  el.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      rotY += dx * 0.008;
      rotX += dy * 0.008;
      rotX  = Math.max(-Math.PI/2+0.05, Math.min(Math.PI/2-0.05, rotX));
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      applyCamera();
    } else if (e.touches.length === 2 && pinchDist0) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      camDist    = Math.max(1, Math.min(20, camDist * (pinchDist0 / dist)));
      pinchDist0 = dist;
      applyCamera();
    }
  }, {passive:false});

  el.addEventListener('touchend', e => {
    e.preventDefault();
    isDragging = false; pinchDist0 = null;
  }, {passive:false});

  // ── postMessage bridge ───────────────────────────────────
  window.addEventListener('message', handleMsg);
  document.addEventListener('message', handleMsg); // Android

  function handleMsg(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); } catch(e) { return; }

    if (msg.type === 'setDepth') {
      depth = msg.value;
      buildMesh();
    }
    if (msg.type === 'setMaterial') {
      matDef = msg.mat;
      material = makeMaterial(matDef);
      if (mesh) mesh.material = material;
    }
    if (msg.type === 'toggleWire') {
      showWire = !showWire;
      buildMesh();
    }
    if (msg.type === 'setColor') {
      matDef.color = msg.color;
      material = makeMaterial(matDef);
      if (mesh) mesh.material = material;
    }
    if (msg.type === 'resetView') {
      rotX = 0.35; rotY = -0.4; camDist = 5;
      applyCamera();
    }
  }

  // ── Animate ──────────────────────────────────────────────
  let animId;
  function animate() {
    animId = requestAnimationFrame(animate);
    if (mesh && !isDragging) {
      mesh.rotation.y += 0.003;
      if (wireframe) wireframe.rotation.y = mesh.rotation.y;
    }
    renderer.render(scene, camera);
  }
  animate();

  // ── Resize ───────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Signal ready
  setTimeout(() => {
    window.ReactNativeWebView?.postMessage(JSON.stringify({type:'ready'}));
  }, 300);
})();
</script>
</body>
</html>`;
}

// ─── SLIDER COMPONENT ─────────────────────────────────────────
function SliderRow({ label, value, min, max, step, unit, onChange }) {
  const { width } = useWindowDimensions();
  const trackW = width - 48 - 120; // subtract label + value col

  // PanResponder-based slider since RN Slider needs extra install
  const trackRef = useRef(null);
  const [trackX, setTrackX] = useState(0);

  const ratio = (value - min) / (max - min);
  const thumbX = ratio * trackW;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      const rawX = e.nativeEvent.locationX;
      const clamped = Math.max(0, Math.min(trackW, rawX));
      const newRatio = clamped / trackW;
      const newVal = min + newRatio * (max - min);
      const stepped = Math.round(newVal / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    onPanResponderMove: (e, gs) => {
      const rawX = gs.x0 - trackX + gs.dx;
      const startRatio = (gs.x0 - trackX) / trackW;
      const deltaRatio = gs.dx / trackW;
      const newRatio = Math.max(0, Math.min(1, startRatio + deltaRatio));
      const newVal = min + newRatio * (max - min);
      const stepped = Math.round(newVal / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
  })).current;

  return (
    <View style={sStyles.sliderRow}>
      <Text style={sStyles.sliderLabel}>{label}</Text>
      <View
        style={[sStyles.sliderTrack, { width: trackW }]}
        {...pan.panHandlers}
        onLayout={e => setTrackX(e.nativeEvent.layout.x)}
      >
        <View style={[sStyles.sliderFill, { width: thumbX }]}/>
        <View style={[sStyles.sliderThumb, { left: thumbX - 10 }]}/>
      </View>
      <Text style={sStyles.sliderVal}>{value}{unit}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function ToThreeDScreen({ route, navigation }) {
  const { shape2D } = route?.params ?? {};
  console.log("Received shape2D:", shape2D);
  const { width, height } = useWindowDimensions();

  const [extrudeDepth, setExtrudeDepth]   = useState(50);   // in px units (same as canvas)
  const [selectedMat,  setSelectedMat]    = useState(MATERIALS[0]);
  const [showWire,     setShowWire]       = useState(false);
  const [webviewReady, setWebviewReady]   = useState(false);
  const [panelOpen,    setPanelOpen]      = useState(true);

  const webviewRef = useRef(null);

  // Send message to WebView
  const send = useCallback((msg) => {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  // Compute normalised depth for Three.js
  const pts = shape2D?.points ?? [];
  let minX = Infinity, maxX = -Infinity;
  for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; }
  const range = Math.max(maxX - minX, 1);
  const NORM  = 2.0 / range;

  const depthNorm = (extrudeDepth * NORM);

  const handleDepthChange = useCallback((v) => {
    setExtrudeDepth(v);
    const r2 = 2.0 / Math.max(range, 1);
    send({ type: "setDepth", value: v * r2 });
  }, [range, send]);

  const handleMatChange = useCallback((mat) => {
    setSelectedMat(mat);
    send({ type: "setMaterial", mat });
  }, [send]);

  const handleToggleWire = useCallback(() => {
    setShowWire(w => !w);
    send({ type: "toggleWire" });
  }, [send]);

  const handleWebViewMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") setWebviewReady(true);
    } catch(_) {}
  }, []);

  if (!shape2D||shape2D.type !=="POLYLINE"&&!shape2D.points?.length) {
    return (
      <View style={sStyles.errorContainer}>
        <Text style={sStyles.errorIcon}>⚠</Text>
        <Text style={sStyles.errorTitle}>No Profile Received</Text>
        <Text style={sStyles.errorSub}>Go back and draw a closed 2D geometry first.</Text>
        <TouchableOpacity style={sStyles.backBtn} onPress={() => navigation?.goBack()}>
          <Text style={sStyles.backBtnText}>← Back to Sketch</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const html = buildThreeHTML(
    shape2D,
    extrudeDepth,
    selectedMat,
  );

  return (
    <View style={sStyles.container}>

      {/* ── Header ── */}
      <View style={sStyles.header}>
        <TouchableOpacity style={sStyles.headerBack} onPress={() => navigation?.goBack()}>
          <Text style={sStyles.headerBackText}>← Sketch</Text>
        </TouchableOpacity>
        <View style={sStyles.headerCenter}>
          <View style={sStyles.headerDot}/>
          <Text style={sStyles.headerTitle}>3D Extrude</Text>
          <View style={[sStyles.headerBadge, {
            backgroundColor: webviewReady
              ? "rgba(0,255,156,0.12)" : "rgba(74,85,104,0.15)",
            borderColor: webviewReady ? "rgba(0,255,156,0.4)" : "rgba(74,85,104,0.3)",
          }]}>
            <Text style={[sStyles.headerBadgeText, {
              color: webviewReady ? C.success : C.textDim,
            }]}>{webviewReady ? "READY" : "LOADING"}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={sStyles.headerTogglePanel}
          onPress={() => setPanelOpen(o => !o)}
        >
          <Text style={sStyles.headerTogglePanelText}>
            {panelOpen ? "▼ Panel" : "▲ Panel"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Three.js WebView ── */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webviewRef}
          style={sStyles.webview}
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          androidLayerType="hardware"
        />

        {/* Reset view button (floating) */}
        <TouchableOpacity
          style={sStyles.resetViewBtn}
          onPress={() => send({ type: "resetView" })}
          activeOpacity={0.75}
        >
          <Text style={sStyles.resetViewBtnText}>⟳</Text>
        </TouchableOpacity>

        {/* Profile info badge */}
        <View style={sStyles.shape2DBadge}>
          <Text style={sStyles.shape2DBadgeText}>
            {(shape2D.type || "polygon").toUpperCase()} · {pts.length} pts
          </Text>
        </View>
      </View>

      {/* ── Control Panel ── */}
      {panelOpen && (
        <View style={sStyles.panel}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Extrude depth */}
            <View style={sStyles.section}>
              <Text style={sStyles.sectionTitle}>EXTRUDE DEPTH</Text>
              <SliderRow
                label="Depth"
                value={extrudeDepth}
                min={5} max={300} step={1}
                unit=" px"
                onChange={handleDepthChange}
              />
            </View>

            <View style={sStyles.divider}/>

            {/* Material picker */}
            <View style={sStyles.section}>
              <Text style={sStyles.sectionTitle}>MATERIAL</Text>
              <View style={sStyles.matGrid}>
                {MATERIALS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      sStyles.matChip,
                      selectedMat.id === m.id && sStyles.matChipSelected,
                    ]}
                    onPress={() => handleMatChange(m)}
                    activeOpacity={0.7}
                  >
                    <View style={[sStyles.matSwatch, { backgroundColor: m.color }]}/>
                    <Text style={[
                      sStyles.matLabel,
                      selectedMat.id === m.id && sStyles.matLabelSelected,
                    ]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={sStyles.divider}/>

            {/* View options */}
            <View style={sStyles.section}>
              <Text style={sStyles.sectionTitle}>VIEW</Text>
              <View style={sStyles.viewRow}>
                <TouchableOpacity
                  style={[sStyles.viewBtn, showWire && sStyles.viewBtnOn]}
                  onPress={handleToggleWire}
                  activeOpacity={0.7}
                >
                  <Text style={[sStyles.viewBtnText, showWire && sStyles.viewBtnTextOn]}>
                    ⬡ Wireframe
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={sStyles.viewBtn}
                  onPress={() => send({ type: "resetView" })}
                  activeOpacity={0.7}
                >
                  <Text style={sStyles.viewBtnText}>⟳ Reset View</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={sStyles.divider}/>

            {/* Profile metadata */}
            <View style={sStyles.section}>
              <Text style={sStyles.sectionTitle}>PROFILE INFO</Text>
              <View style={sStyles.infoGrid}>
                <InfoRow label="Type"   value={(shape2D.type||"polygon").toUpperCase()} />
                <InfoRow label="Points" value={pts.length} />
                <InfoRow label="Depth"  value={`${extrudeDepth} px`} />
                <InfoRow label="Material" value={selectedMat.label} />
              </View>
            </View>

          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <View style={sStyles.infoRow}>
      <Text style={sStyles.infoLabel}>{label}</Text>
      <Text style={sStyles.infoValue}>{String(value)}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
import { PanResponder } from "react-native";

const sStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection:"row", alignItems:"center",
    backgroundColor: C.panel,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8,
    minHeight: 46,
  },
  headerBack: {
    paddingHorizontal: 6, paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1, borderColor: "rgba(26,188,254,0.25)",
  },
  headerBackText: {
    color: C.accent, fontSize: 11, fontFamily:"monospace",
  },
  headerCenter: {
    flex: 1, flexDirection:"row", alignItems:"center",
    justifyContent:"center", gap: 8,
  },
  headerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.success,
  },
  headerTitle: {
    color: C.textBright, fontSize: 13,
    fontFamily:"monospace", fontWeight:"700", letterSpacing: 1.2,
  },
  headerBadge: {
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  headerBadgeText: {
    fontSize: 8, fontFamily:"monospace", letterSpacing: 0.8,
  },
  headerTogglePanel: {
    paddingHorizontal: 6, paddingVertical: 4,
  },
  headerTogglePanelText: {
    color: C.textDim, fontSize: 10, fontFamily:"monospace",
  },

  // ── WebView ─────────────────────────────────────────────
  webview: {
    flex: 1,
    backgroundColor: "#0A0C10",
  },
  resetViewBtn: {
    position:"absolute", top: 12, left: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor:"rgba(13,15,20,0.8)",
    borderWidth: 1, borderColor: C.border,
    alignItems:"center", justifyContent:"center",
  },
  resetViewBtnText: {
    color: C.accent, fontSize: 16, lineHeight: 20,
  },
  shape2DBadge: {
    position:"absolute", bottom: 12, left: 12,
    backgroundColor:"rgba(13,15,20,0.75)",
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
  },
  shape2DBadgeText: {
    color: C.textDim, fontSize: 9, fontFamily:"monospace",
  },

  // ── Control panel ────────────────────────────────────────
  panel: {
    backgroundColor: C.panel,
    borderTopWidth: 1, borderTopColor: C.border,
    maxHeight: 280,
  },
  section: {
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionTitle: {
    color: C.textDim, fontSize: 8, fontFamily:"monospace",
    letterSpacing: 1.5, marginBottom: 8,
  },
  divider: {
    height: 1, backgroundColor: C.border, marginHorizontal: 16,
  },

  // ── Slider ───────────────────────────────────────────────
  sliderRow: {
    flexDirection:"row", alignItems:"center", gap: 10,
  },
  sliderLabel: {
    color: C.text, fontSize: 10, fontFamily:"monospace",
    width: 44,
  },
  sliderTrack: {
    height: 4, backgroundColor:"#1E2430",
    borderRadius: 2, position:"relative",
  },
  sliderFill: {
    position:"absolute", left: 0, top: 0, height: 4,
    backgroundColor: C.accent, borderRadius: 2,
  },
  sliderThumb: {
    position:"absolute", top: -8, width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: C.accent,
    borderWidth: 2, borderColor: C.bg,
    shadowColor: C.accent, shadowOpacity: 0.5,
    shadowRadius: 4, shadowOffset:{width:0,height:0},
    elevation: 4,
  },
  sliderVal: {
    color: C.accent, fontSize: 10, fontFamily:"monospace",
    width: 56, textAlign:"right",
  },

  // ── Material ─────────────────────────────────────────────
  matGrid: {
    flexDirection:"row", flexWrap:"wrap", gap: 6,
  },
  matChip: {
    flexDirection:"row", alignItems:"center", gap: 5,
    backgroundColor:"rgba(30,36,48,0.5)",
    borderWidth: 1, borderColor: "#2A3140",
    borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5,
  },
  matChipSelected: {
    borderColor: C.accent,
    backgroundColor:"rgba(26,188,254,0.1)",
  },
  matSwatch: {
    width: 10, height: 10, borderRadius: 2,
    borderWidth: 1, borderColor:"rgba(255,255,255,0.15)",
  },
  matLabel: {
    color: C.textDim, fontSize: 10, fontFamily:"monospace",
  },
  matLabelSelected: {
    color: C.accent,
  },

  // ── View controls ────────────────────────────────────────
  viewRow: {
    flexDirection:"row", gap: 8,
  },
  viewBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#2A3140",
    borderRadius: 4, backgroundColor:"rgba(30,36,48,0.5)",
  },
  viewBtnOn: {
    borderColor: C.accent,
    backgroundColor:"rgba(26,188,254,0.1)",
  },
  viewBtnText: {
    color: C.textDim, fontSize: 10, fontFamily:"monospace",
  },
  viewBtnTextOn: { color: C.accent },

  // ── Info ─────────────────────────────────────────────────
  infoGrid: { gap: 3 },
  infoRow: {
    flexDirection:"row", justifyContent:"space-between",
    paddingVertical: 2,
  },
  infoLabel: {
    color: C.textDim, fontSize: 10, fontFamily:"monospace",
  },
  infoValue: {
    color: C.text, fontSize: 10, fontFamily:"monospace",
  },

  // ── Error state ──────────────────────────────────────────
  errorContainer: {
    flex:1, backgroundColor: C.bg,
    alignItems:"center", justifyContent:"center", padding: 40,
  },
  errorIcon:  { fontSize: 40, marginBottom: 16 },
  errorTitle: {
    color: C.textBright, fontSize: 16,
    fontFamily:"monospace", fontWeight:"700", marginBottom: 8,
  },
  errorSub: {
    color: C.textDim, fontSize: 12,
    fontFamily:"monospace", textAlign:"center", marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: C.accent,
    borderRadius: 6, backgroundColor:"rgba(26,188,254,0.1)",
  },
  backBtnText: {
    color: C.accent, fontSize: 11, fontFamily:"monospace",
  },
});