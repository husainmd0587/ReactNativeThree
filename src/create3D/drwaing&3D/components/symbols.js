import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ImageBackground
} from 'react-native';



const symbolsData = [
  // ── LINES ──────────────────────────────────────────────
  {
    category: 'Lines',
    symbol: '━━━━',
    title: 'Visible Line',
    about: 'Shows visible edges and outlines of an object. Drawn as a thick, continuous line.',
  },
  {
    category: 'Lines',
    symbol: '- - - -',
    title: 'Hidden Line',
    about: 'Represents edges or details not directly visible from the current view.',
  },
  {
    category: 'Lines',
    symbol: '—·—·—',
    title: 'Center Line',
    about: 'Shows the center of circles, holes, cylindrical parts, and symmetrical objects.',
  },
  {
    category: 'Lines',
    symbol: '— — —',
    title: 'Phantom Line',
    about: 'Shows alternate positions of moving parts, adjacent parts, or repeated details.',
  },
  {
    category: 'Lines',
    symbol: '〰〰',
    title: 'Break Line',
    about: 'Indicates a broken or shortened view of long objects to save drawing space.',
  },

  // ── DIMENSIONS ─────────────────────────────────────────
  {
    category: 'Dimensions',
    symbol: '↔',
    title: 'Dimension Line',
    about: 'Indicates the measurement of a part, with arrows pointing to extension lines.',
  },
  {
    category: 'Dimensions',
    symbol: '|——|',
    title: 'Extension Line',
    about: 'Shows the limits between dimension lines and the object being measured.',
  },
  {
    category: 'Dimensions',
    symbol: '⟶',
    title: 'Leader Line',
    about: 'Connects notes, labels, or dimensions to specific features on the drawing.',
  },

  // ── SECTION ────────────────────────────────────────────
  {
    category: 'Section',
    symbol: '▨▨',
    title: 'Section Line (Hatching)',
    about: 'Used in sectional views to represent cut surfaces of materials.',
  },
  {
    category: 'Section',
    symbol: '⤵',
    title: 'Cutting Plane Line',
    about: 'Indicates where an imaginary cut has been made through an object.',
  },

  // ── GD&T ───────────────────────────────────────────────
  {
    category: 'GD&T',
    symbol: '⌖',
    title: 'Datum Symbol',
    about: 'Represents a reference point, line, or surface in geometric dimensioning and tolerancing.',
  },
  {
    category: 'GD&T',
    symbol: '□—□',
    title: 'Feature Control Frame',
    about: 'A box containing the geometric tolerance symbol, tolerance value, and datum reference.',
  },
  {
    category: 'GD&T',
    symbol: '⊕',
    title: 'Position Symbol',
    about: 'Specifies the exact location of a feature relative to a datum reference frame.',
  },
  {
    category: 'GD&T',
    symbol: '⌒',
    title: 'Circularity (Roundness)',
    about: 'Controls how close cross-sections of a cylinder or cone are to a perfect circle.',
  },
  {
    category: 'GD&T',
    symbol: '⊙',
    title: 'Cylindricity',
    about: 'Combines roundness and straightness to define how close a surface is to a perfect cylinder.',
  },
  {
    category: 'GD&T',
    symbol: '//',
    title: 'Parallelism',
    about: 'Controls a surface or axis to be parallel to a datum within a specified tolerance zone.',
  },
  {
    category: 'GD&T',
    symbol: '⊥',
    title: 'Perpendicularity',
    about: 'Controls a surface or axis to be exactly 90° to a datum reference.',
  },
  {
    category: 'GD&T',
    symbol: '∠',
    title: 'Angularity',
    about: 'Controls a surface or axis at a specified angle other than 90° relative to a datum.',
  },

  // ── MEASUREMENT ────────────────────────────────────────
  {
    category: 'Measurement',
    symbol: '⌀',
    title: 'Diameter Symbol',
    about: 'Placed before a dimension value to denote diameter. Example: ⌀50 mm.',
  },
  {
    category: 'Measurement',
    symbol: 'R',
    title: 'Radius Symbol',
    about: 'Placed before a dimension value to denote radius. Example: R25 mm.',
  },
  {
    category: 'Measurement',
    symbol: 'SR',
    title: 'Spherical Radius',
    about: 'Indicates the radius of a spherical surface. Example: SR15 mm.',
  },
  {
    category: 'Measurement',
    symbol: 'S⌀',
    title: 'Spherical Diameter',
    about: 'Indicates the diameter of a spherical surface. Example: S⌀30 mm.',
  },
  {
    category: 'Measurement',
    symbol: '□',
    title: 'Square Symbol',
    about: 'Indicates a square cross-section feature. Example: □20 means 20×20 mm square.',
  },
  {
    category: 'Measurement',
    symbol: '▽▽▽',
    title: 'Surface Finish Symbol',
    about: 'Indicates surface texture and roughness requirements. More triangles = finer finish.',
  },
  {
    category: 'Measurement',
    symbol: '°',
    title: 'Degree Symbol',
    about: 'Denotes angular measurements in degrees. Example: 45° chamfer or 60° taper.',
  },
  {
    category: 'Measurement',
    symbol: 'C×',
    title: 'Chamfer Symbol',
    about: 'Indicates a chamfered (beveled) edge. Example: C2 means a 2 mm × 45° chamfer.',
  },
  {
    category: 'Measurement',
    symbol: '⌣',
    title: 'Arc Length Symbol',
    about: 'Placed above a dimension value to indicate the length of an arc on a curved surface.',
  },
];

// Per-category color tokens (box bg, box text, tag bg, tag text)
const categoryColors = {
  Lines: {
    boxBg: '#0E2040',
    boxText: '#5BA3E8',
    tagBg: '#0E2040',
    tagText: '#4A8FCF',
  },
  Dimensions: {
    boxBg: '#0F2918',
    boxText: '#5BBD7A',
    tagBg: '#0F2918',
    tagText: '#4CAD6A',
  },
  Section: {
    boxBg: '#271A08',
    boxText: '#D4933A',
    tagBg: '#271A08',
    tagText: '#C08030',
  },
  'GD&T': {
    boxBg: '#1A1230',
    boxText: '#9A80E8',
    tagBg: '#1A1230',
    tagText: '#8A70D8',
  },
  Measurement: {
    boxBg: '#28101A',
    boxText: '#D46090',
    tagBg: '#28101A',
    tagText: '#C45080',
  },
};

const DrawingSymbols = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
     <ImageBackground  style={{width:'100%',height:250}}
     source={{uri:'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/engineeringDrawing%26cad/drawing%263d/allSymbol.png'

     }}>
         
     </ImageBackground>
     <Text style={styles.subHeading}>
        Common symbols used in technical drawing and CAD.
      </Text>
      {symbolsData.map((item, index) => {
        const colors = categoryColors[item.category] || categoryColors.Lines;
        return (
          <View key={index} style={styles.card}>
            {/* Symbol Box */}
            <View style={[styles.symbolBox, { backgroundColor: colors.boxBg }]}>
              <Text style={[styles.symbolText, { color: colors.boxText }]}>
                {item.symbol}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              {/* Category Tag */}
              <View style={[styles.tag, { backgroundColor: colors.tagBg }]}>
                <Text style={[styles.tagText, { color: colors.tagText }]}>
                  {item.category}
                </Text>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.about}>{item.about}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

export default DrawingSymbols;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
  },

  content: {
    padding: 0,
    paddingBottom: 32,
  },
  subHeading: {
    fontSize: 13,
    color: '#6b51fd',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#181C27',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2A2D3A',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },

  symbolBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  symbolText: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  cardContent: {
    flex: 1,
  },

  tag: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 5,
  },

  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },

  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAEAEA',
    marginBottom: 4,
  },

  about: {
    fontSize: 12,
    lineHeight: 19,
    color: '#888',
  },
});