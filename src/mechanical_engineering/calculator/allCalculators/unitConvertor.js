import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  Pressable,
} from "react-native";

// ─── Conversions ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "length",      icon: "⟷", label: "Length" },
  { id: "weight",      icon: "⊕", label: "Weight" },
  { id: "pressure",    icon: "↯", label: "Pressure" },
  { id: "temperature", icon: "◈", label: "Temp" },
  { id: "torque",      icon: "↻", label: "Torque" },
];

const UNITS = {
  length:      [{ id:"mm", label:"mm", name:"Millimetre" },{ id:"cm", label:"cm", name:"Centimetre" },{ id:"m", label:"m", name:"Metre" },{ id:"km", label:"km", name:"Kilometre" },{ id:"inch", label:"in", name:"Inch" },{ id:"ft", label:"ft", name:"Foot" },{ id:"yd", label:"yd", name:"Yard" },{ id:"mi", label:"mi", name:"Mile" },{ id:"nmi", label:"nmi", name:"Nautical Mile" },{ id:"um", label:"μm", name:"Micrometre" }],
  weight:      [{ id:"kg", label:"kg", name:"Kilogram" },{ id:"lb", label:"lb", name:"Pound" },{ id:"ton", label:"ton", name:"Metric Ton" }],
  pressure:    [{ id:"bar", label:"bar", name:"Bar" },{ id:"psi", label:"psi", name:"PSI" },{ id:"mpa", label:"MPa", name:"Megapascal" }],
  temperature: [{ id:"c", label:"°C", name:"Celsius" },{ id:"f", label:"°F", name:"Fahrenheit" },{ id:"k", label:"K", name:"Kelvin" }],
  torque:      [{ id:"nm", label:"N·m", name:"Newton-Metre" },{ id:"lbft", label:"lb·ft", name:"Pound-Foot" }],
};

const TO_BASE = {
  mm: v=>v/1000, cm: v=>v/100, m: v=>v, km: v=>v*1000, inch: v=>v*0.0254, ft: v=>v*0.3048, yd: v=>v*0.9144, mi: v=>v*1609.344, nmi: v=>v*1852, um: v=>v/1e6,
  kg: v=>v, lb: v=>v*0.45359237, ton: v=>v*1000,
  bar: v=>v*1e5, psi: v=>v*6894.757, mpa: v=>v*1e6,
  c: v=>v+273.15, f: v=>(v-32)*5/9+273.15, k: v=>v,
  nm: v=>v, lbft: v=>v*1.355818,
};
const FROM_BASE = {
  mm: v=>v*1000, cm: v=>v*100, m: v=>v, km: v=>v/1000, inch: v=>v/0.0254, ft: v=>v/0.3048, yd: v=>v/0.9144, mi: v=>v/1609.344, nmi: v=>v/1852, um: v=>v*1e6,
  kg: v=>v, lb: v=>v/0.45359237, ton: v=>v/1000,
  bar: v=>v/1e5, psi: v=>v/6894.757, mpa: v=>v/1e6,
  c: v=>v-273.15, f: v=>(v-273.15)*9/5+32, k: v=>v,
  nm: v=>v, lbft: v=>v/1.355818,
};

function convert(val, from, to) {
  if (from === to) return val;
  return FROM_BASE[to](TO_BASE[from](val));
}

function fmt(n) {
  if (n === null || isNaN(n)) return "";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e7 || (abs < 0.0001 && abs > 0)) return n.toExponential(4);
  return parseFloat(n.toPrecision(7)).toString();
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const DARK_P = {
  bg:      "#08090D",
  surface: "#0F1117",
  card:    "#14171F",
  border:  "#1C2030",
  input:   "#191D28",
  text:    "#EDF0F7",
  dim:     "#5A6378",
  muted:   "#333849",
  cat: {
    length:      "#29D4F5",
    weight:      "#2EE5A8",
    pressure:    "#F5A832",
    temperature: "#FF6B75",
    torque:      "#A78EFF",
  },
};
const LIGHT_P = {
  bg:      "#F0F2F7",
  surface: "#FFFFFF",
  card:    "#FFFFFF",
  border:  "#DDE1ED",
  input:   "#F5F7FC",
  text:    "#0D1017",
  dim:     "#8892A4",
  muted:   "#C8CEDC",
  cat: {
    length:      "#0BB8D9",
    weight:      "#14C98A",
    pressure:    "#D4880A",
    temperature: "#E04550",
    torque:      "#7B5FE0",
  },
};

// ─── Dropdown Modal ───────────────────────────────────────────────────────────
function UnitDropdown({ visible, units, selected, color, onSelect, onClose, P }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={dd.overlay} onPress={onClose}>
        <View style={[dd.sheet, { borderColor: color + "44", backgroundColor: P.card }]}>
          <View style={[dd.sheetBar, { backgroundColor: color }]} />
          {units.map(u => {
            const sel = u.id === selected;
            return (
              <TouchableOpacity
                key={u.id}
                style={[dd.item, sel && { backgroundColor: color + "18" }]}
                onPress={() => { onSelect(u.id); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[dd.itemLabel, { color: sel ? color : P.text }]}>{u.label}</Text>
                <Text style={[dd.itemName, { color: sel ? color + "99" : P.dim }]}>{u.name}</Text>
                {sel && <Text style={[dd.check, { color }]}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const dd = StyleSheet.create({
  overlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.72)", justifyContent:"center", alignItems:"center" },
  sheet:     { borderRadius:18, borderWidth:1, width:230, overflow:"hidden" },
  sheetBar:  { height:3, width:"100%" },
  item:      { flexDirection:"row", alignItems:"center", paddingHorizontal:18, paddingVertical:14, gap:10 },
  itemLabel: { fontSize:18, fontFamily: Platform.OS==="ios"?"Courier New":"monospace", fontWeight:"700", width:56 },
  itemName:  { flex:1, fontSize:11, fontFamily: Platform.OS==="ios"?"Courier New":"monospace" },
  check:     { fontSize:16, fontWeight:"700" },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnitConverter() {
  const [cat,     setCat]     = useState("length");
  const [fromId,  setFromId]  = useState("mm");
  const [toId,    setToId]    = useState("m");
  const [fromVal, setFromVal] = useState("1000");
  const [dropFor, setDropFor] = useState(null);
  const [dark,    setDark]    = useState(true);

  const P     = dark ? DARK_P : LIGHT_P;
  const color = P.cat[cat];
  const units   = UNITS[cat];
  const numFrom = parseFloat(fromVal);
  const toVal   = fmt(convert(numFrom, fromId, toId));

  const handleFromChange = useCallback((txt) => {
    setFromVal(txt.replace(/[^0-9.\-]/g, ""));
  }, []);

  const handleCat = useCallback((id) => {
    const u = UNITS[id];
    setCat(id);
    setFromId(u[0].id);
    setToId(u[Math.min(1, u.length - 1)].id);
    setFromVal("1");
  }, []);

  const swap = useCallback(() => {
    const newFrom = fmt(convert(numFrom, fromId, toId));
    setFromId(toId);
    setToId(fromId);
    setFromVal(isNaN(numFrom) ? "0" : newFrom);
  }, [fromId, toId, numFrom]);

  const fromUnit = units.find(u => u.id === fromId);
  const toUnit   = units.find(u => u.id === toId);

  return (
    <View style={[s.root, { backgroundColor: P.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={P.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={[s.headerBar, { backgroundColor: color }]} />
        <View style={s.headerTextBlock}>
          <Text style={[s.title, { color: P.text }]}>CONVERTER</Text>
          <Text style={[s.subtitle, { color }]}>Engineering Units</Text>
        </View>
        <TouchableOpacity
          style={[s.themeBtn, { backgroundColor: P.surface, borderColor: P.border }]}
          onPress={() => setDark(d => !d)}
          activeOpacity={0.75}
        >
          <Text style={[s.themeIcon, { color: P.dim }]}>{dark ? "☀" : "☾"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Pills ── */}
      <View style={s.catRow}>
        {CATEGORIES.map(c => {
          const active = c.id === cat;
          const cc = P.cat[c.id];
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => handleCat(c.id)}
              style={[s.catPill, { backgroundColor: P.surface, borderColor: P.border }, active && { backgroundColor: cc + "22", borderColor: cc }]}
              activeOpacity={0.7}
            >
              <Text style={[s.catIcon, { color: active ? cc : P.dim }]}>{c.icon}</Text>
              <Text style={[s.catText, { color: active ? cc : P.dim }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Converter Card ── */}
      <View style={[s.converterCard, { borderColor: color + "33", backgroundColor: P.card }]}>

        {/* FROM */}
        <View style={s.fieldBlock}>
          <Text style={[s.fieldLabel, { color: P.dim }]}>FROM</Text>
          <View style={[s.field, { borderColor: color + "66" }]}>
            <TextInput
              style={[s.fieldInput, { color: P.text }]}
              value={fromVal}
              onChangeText={handleFromChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={P.muted}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[s.unitPill, { backgroundColor: color + "22", borderColor: color + "55" }]}
              onPress={() => setDropFor("from")}
              activeOpacity={0.7}
            >
              <Text style={[s.unitPillText, { color }]}>{fromUnit?.label}</Text>
              <Text style={[s.chevron, { color }]}>▾</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.unitFullName, { color: P.dim }]}>{fromUnit?.name}</Text>
        </View>

        {/* Swap */}
        <View style={s.swapRow}>
          <View style={[s.swapLine, { backgroundColor: P.border }]} />
          <TouchableOpacity
            style={[s.swapBtn, { borderColor: color + "55", backgroundColor: color + "15" }]}
            onPress={swap}
            activeOpacity={0.7}
          >
            <Text style={[s.swapIcon, { color }]}>⇅</Text>
          </TouchableOpacity>
          <View style={[s.swapLine, { backgroundColor: P.border }]} />
        </View>

        {/* TO */}
        <View style={s.fieldBlock}>
          <Text style={[s.fieldLabel, { color: P.dim }]}>TO</Text>
          <View style={[s.field, { borderColor: P.border }]}>
            <Text style={[s.fieldResult, { color: P.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {isNaN(numFrom) || fromVal === "" ? "—" : toVal}
            </Text>
            <TouchableOpacity
              style={[s.unitPill, { backgroundColor: P.muted + "55", borderColor: P.border }]}
              onPress={() => setDropFor("to")}
              activeOpacity={0.7}
            >
              <Text style={[s.unitPillText, { color: P.dim }]}>{toUnit?.label}</Text>
              <Text style={[s.chevron, { color: P.dim }]}>▾</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.unitFullName, { color: P.dim }]}>{toUnit?.name}</Text>
        </View>
      </View>

      {/* ── Formula strip ── */}
      <View style={[s.formulaStrip, { borderColor: color + "22", backgroundColor: color + "0C" }]}>
        <Text style={[s.formulaText, { color: color + "BB" }]}>
          1 {fromUnit?.label} = {fmt(convert(1, fromId, toId))} {toUnit?.label}
        </Text>
      </View>

      {/* ── All-units grid ── */}
      <View style={[s.gridCard, { backgroundColor: P.card, borderColor: P.border }]}>
        <Text style={[s.gridTitle, { color: P.dim }]}>ALL UNITS  ·  tap to set output</Text>
        <View style={s.grid}>
          {units.map(u => {
            const val  = fmt(convert(numFrom, fromId, u.id));
            const isSrc = u.id === fromId;
            const isDst = u.id === toId;
            return (
              <TouchableOpacity
                key={u.id}
                style={[
                  s.gridCell,
                  { backgroundColor: P.input, borderColor: P.border },
                  isSrc && { borderColor: color,         backgroundColor: color + "18" },
                  isDst && { borderColor: color + "55",  backgroundColor: color + "0A" },
                ]}
                onPress={() => setToId(u.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.gridUnit, { color: isSrc ? color : isDst ? color + "AA" : P.dim }]}>
                  {u.label}
                </Text>
                <Text
                  style={[s.gridVal, { color: isSrc ? P.text : isDst ? P.text : P.dim + "CC" }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {isNaN(numFrom) || fromVal === "" ? "—" : val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Dropdowns */}
      <UnitDropdown
        visible={dropFor === "from"}
        units={units}
        selected={fromId}
        color={color}
        onSelect={setFromId}
        onClose={() => setDropFor(null)}
        P={P}
      />
      <UnitDropdown
        visible={dropFor === "to"}
        units={units}
        selected={toId}
        color={color}
        onSelect={setToId}
        onClose={() => setDropFor(null)}
        P={P}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  headerBar: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 1,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  themeIcon: {
    fontSize: 16,
  },
  catRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  catPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  catIcon: { fontSize: 14 },
  catText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  converterCard: {
    marginHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  fieldBlock: { gap: 5 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 3,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    height: 56,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: "300",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  fieldResult: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: "300",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  
  },
  unitPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  unitPillText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  chevron: { fontSize: 10 },
  unitFullName: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    paddingLeft: 4,
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 10,
  },
  swapLine: { flex: 1, height: 1 },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  swapIcon: { fontSize: 20, fontWeight: "700" },
  formulaStrip: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  formulaText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.5,
  },
  gridCard: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  gridTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    minWidth: "25%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: "center",
  },
  gridUnit: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: "300",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
});