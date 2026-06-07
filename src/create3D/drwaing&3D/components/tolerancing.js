import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Color Palette (matches cyan/blue + pink engineering app theme) ───
const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  card: '#1A2235',
  cardBorder: '#1E3A5F',
  cyan: '#00D4FF',
  cyanDim: '#00A8CC',
  blue: '#3B82F6',
  pink: '#FF2D78',
  pinkDim: '#CC1F5E',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  textPrimary: '#F0F4FF',
  textSecondary: '#8B9BB4',
  textMuted: '#4B5A72',
  divider: '#1E2D45',
};

// ─── Reusable Components ─────────────────────────────────────────────

const SectionHeader = ({ icon, title, subtitle, color = C.cyan }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconWrap, { borderColor: color + '40', backgroundColor: color + '15' }]}>
      <Text style={styles.sectionIcon}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const InfoCard = ({ children, accent = C.cyan, style }) => (
  <View style={[styles.infoCard, { borderLeftColor: accent }, style]}>
    {children}
  </View>
);

const Badge = ({ label, color = C.cyan }) => (
  <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

const FormulaBox = ({ formula, description }) => (
  <View style={styles.formulaBox}>
    <View style={styles.formulaInner}>
      <Text style={styles.formulaText}>{formula}</Text>
    </View>
    {description ? <Text style={styles.formulaDesc}>{description}</Text> : null}
  </View>
);

const Divider = () => <View style={styles.divider} />;

const KeyValueRow = ({ label, value, valueColor = C.cyan }) => (
  <View style={styles.kvRow}>
    <Text style={styles.kvLabel}>{label}</Text>
    <Text style={[styles.kvValue, { color: valueColor }]}>{value}</Text>
  </View>
);

// ─── Fit Type Card ───────────────────────────────────────────────────
const FitCard = ({ type, emoji, color, description, shaftRange, holeRange, uses }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.fitCard, { borderColor: color + '50' }]}
      onPress={() => setOpen(o => !o)}
      activeOpacity={0.8}
    >
      <View style={styles.fitCardHeader}>
        <View style={[styles.fitEmojiBg, { backgroundColor: color + '20' }]}>
          <Text style={styles.fitEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fitType, { color }]}>{type}</Text>
          <Text style={styles.fitDesc}>{description}</Text>
        </View>
        <Text style={[styles.fitChevron, { color }]}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <View style={styles.fitDetails}>
          <Divider />
          <KeyValueRow label="Shaft Tolerance" value={shaftRange} valueColor={color} />
          <KeyValueRow label="Hole Tolerance" value={holeRange} valueColor={color} />
          <Text style={styles.fitUsesLabel}>Common Uses:</Text>
          {uses.map((u, i) => (
            <Text key={i} style={styles.fitUse}>• {u}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Tolerance Type Card ─────────────────────────────────────────────
const ToleranceTypeCard = ({ title, color, symbol, desc, example }) => (
  <View style={[styles.tolTypeCard, { borderTopColor: color }]}>
    <View style={styles.tolTypeHeader}>
      <Text style={[styles.tolTypeSymbol, { color }]}>{symbol}</Text>
      <Text style={styles.tolTypeTitle}>{title}</Text>
    </View>
    <Text style={styles.tolTypeDesc}>{desc}</Text>
    {example ? (
      <View style={[styles.tolTypeExample, { backgroundColor: color + '15' }]}>
        <Text style={[styles.tolTypeExampleText, { color }]}>{example}</Text>
      </View>
    ) : null}
  </View>
);

// ─── Exam Tip Card ───────────────────────────────────────────────────
const ExamTip = ({ number, tip }) => (
  <View style={styles.examTip}>
    <View style={styles.examTipNum}>
      <Text style={styles.examTipNumText}>{number}</Text>
    </View>
    <Text style={styles.examTipText}>{tip}</Text>
  </View>
);

// ─── Main Component ──────────────────────────────────────────────────
export default function TolerancesScreen() {
  const scrollRef = useRef(null);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />



      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      > 
      <ImageBackground style={{height:200,width:'100%'}} source={{uri:'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/engineeringDrawing%26cad/drawing%263d/tolerances.png'}}>

      </ImageBackground>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <Text style={styles.heroTag}>Engineering Drawing</Text>
        <Text style={styles.heroTitle}>Tolerances</Text>
        <Text style={styles.heroSub}>
          Precision in manufacturing — understanding allowable variation
        </Text>
        <View style={styles.heroBadges}>
          <Badge label="ISO 286" color={C.cyan} />
          <Badge label="IS:919" color={C.blue} />
          <Badge label="Exam Ready" color={C.pink} />
        </View>
      </View>

        {/* ══════════════════════════════════════════
            📘  WHAT ARE TOLERANCES?
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="📘"
          title="What are Tolerances?"
          subtitle="The permissible limit of variation"
          color={C.cyan}
        />
        <InfoCard accent={C.cyan}>
          <Text style={styles.bodyText}>
            A <Text style={[styles.highlight, { color: C.cyan }]}>Tolerance</Text> is the
            total permissible variation of a dimension from its basic (nominal) size. It is
            the difference between the <Text style={styles.highlight}>upper limit</Text> and
            the <Text style={styles.highlight}>lower limit</Text> of a dimension.
          </Text>
        </InfoCard>

        <FormulaBox
          formula="Tolerance = Upper Limit − Lower Limit"
          description="Also written as: T = Lmax − Lmin"
        />

        <InfoCard accent={C.blue} style={{ marginTop: 8 }}>
          <Text style={styles.bodyText}>
            No manufacturing process can produce a dimension of <Text style={[styles.highlight, { color: C.pink }]}>exact</Text> size.
            Tolerances define the acceptable zone within which the actual size must fall for the
            part to function correctly and be interchangeable.
          </Text>
        </InfoCard>

        <Divider />

        {/* ══════════════════════════════════════════
            🎯  WHY TOLERANCES ARE IMPORTANT
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="🎯"
          title="Why Tolerances Are Important"
          color={C.blue}
        />

        {[
          { icon: '🔄', title: 'Interchangeability', desc: 'Parts made in different factories can be assembled together without selective fitting.' },
          { icon: '💰', title: 'Economy', desc: 'Wider tolerances reduce manufacturing cost. Tight tolerances increase cost exponentially.' },
          { icon: '⚙️', title: 'Functionality', desc: 'Ensures the part performs its intended function — a bearing must rotate, a piston must seal.' },
          { icon: '🏭', title: 'Mass Production', desc: 'Enables high-volume production with consistent quality across thousands of parts.' },
          { icon: '🔍', title: 'Quality Control', desc: 'Provides a clear accept/reject criterion for inspection and measurement.' },
        ].map((item, i) => (
          <View key={i} style={styles.importanceRow}>
            <View style={[styles.importanceIcon, { backgroundColor: C.blue + '20' }]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.importanceTitle}>{item.title}</Text>
              <Text style={styles.importanceDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <Divider />

        {/* ══════════════════════════════════════════
            🔧  KEY TERMS & DEFINITIONS
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="🔧"
          title="Key Terms & Definitions"
          color={C.purple}
        />

        {[
          { term: 'Basic / Nominal Size', def: 'The theoretical size from which limits are derived. Not the actual size.', color: C.cyan },
          { term: 'Actual Size', def: 'The measured size of the finished part.', color: C.blue },
          { term: 'Limits of Size', def: 'The maximum and minimum permissible sizes of the part.', color: C.purple },
          { term: 'Upper Deviation (ES/es)', def: 'Algebraic difference between the Maximum Limit and the Basic size.', color: C.green },
          { term: 'Lower Deviation (EI/ei)', def: 'Algebraic difference between the Minimum Limit and the Basic size.', color: C.amber },
          { term: 'Allowance', def: 'Intentional difference between the maximum shaft and minimum hole. It is the minimum clearance (positive) or maximum interference (negative).', color: C.pink },
          { term: 'Fundamental Deviation', def: 'The deviation closest to the zero line. Defines position of tolerance zone.', color: C.cyan },
        ].map((item, i) => (
          <View key={i} style={[styles.termCard, { borderLeftColor: item.color }]}>
            <Text style={[styles.termName, { color: item.color }]}>{item.term}</Text>
            <Text style={styles.termDef}>{item.def}</Text>
          </View>
        ))}

        <Divider />

        {/* ══════════════════════════════════════════
            ➕  LIMIT DIMENSIONS
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="➕"
          title="Limit Dimensions"
          subtitle="Specifying size on engineering drawings"
          color={C.green}
        />

        <InfoCard accent={C.green}>
          <Text style={styles.bodyText}>
            Limit dimensions specify the <Text style={[styles.highlight, { color: C.green }]}>maximum</Text> and{' '}
            <Text style={[styles.highlight, { color: C.green }]}>minimum</Text> acceptable sizes directly on the drawing.
            The larger value is always written on top.
          </Text>
        </InfoCard>

        {/* Visual representation of limits */}
        <View style={styles.limitDiagram}>
          <Text style={styles.limitDiagramTitle}>Limit Dimension on Drawing</Text>
          <View style={styles.limitVisual}>
            <View style={styles.limitBoxes}>
              <View style={[styles.limitBox, { backgroundColor: C.green + '25', borderColor: C.green }]}>
                <Text style={[styles.limitBoxLabel, { color: C.textMuted }]}>Upper Limit</Text>
                <Text style={[styles.limitBoxVal, { color: C.green }]}>25.05</Text>
              </View>
              <View style={[styles.limitBox, { backgroundColor: C.pink + '15', borderColor: C.pink }]}>
                <Text style={[styles.limitBoxLabel, { color: C.textMuted }]}>Lower Limit</Text>
                <Text style={[styles.limitBoxVal, { color: C.pink }]}>24.95</Text>
              </View>
            </View>
            <View style={styles.limitArrow}>
              <Text style={{ color: C.textSecondary, fontSize: 12 }}>←</Text>
              <Text style={[styles.limitToleranceLabel, { color: C.amber }]}>Tolerance = 0.10 mm</Text>
            </View>
          </View>
          <View style={styles.limitFormulas}>
            <FormulaBox formula="Upper Deviation = 25.05 − 25 = +0.05 mm" />
            <FormulaBox formula="Lower Deviation = 24.95 − 25 = −0.05 mm" />
          </View>
        </View>

        <Divider />

        {/* ══════════════════════════════════════════
            📏  UNILATERAL & BILATERAL TOLERANCE
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="📏"
          title="Unilateral & Bilateral Tolerance"
          color={C.amber}
        />

        <View style={styles.twoColGrid}>
          <View style={[styles.twoColCard, { borderColor: C.amber + '60' }]}>
            <Text style={[styles.twoColCardTitle, { color: C.amber }]}>⬅️ Unilateral</Text>
            <Text style={styles.twoColCardDesc}>
              Variation is allowed in <Text style={[styles.highlight, { color: C.amber }]}>one direction only</Text> from the basic size.
            </Text>
            <View style={[styles.exampleChip, { backgroundColor: C.amber + '20' }]}>
              <Text style={[styles.exampleChipText, { color: C.amber }]}>25 +0.00 / −0.05</Text>
            </View>
            <View style={[styles.exampleChip, { backgroundColor: C.amber + '20', marginTop: 4 }]}>
              <Text style={[styles.exampleChipText, { color: C.amber }]}>25 +0.05 / +0.00</Text>
            </View>
            <Text style={styles.twoColNote}>✓ Preferred for mating parts</Text>
          </View>

          <View style={[styles.twoColCard, { borderColor: C.cyan + '60' }]}>
            <Text style={[styles.twoColCardTitle, { color: C.cyan }]}>↔️ Bilateral</Text>
            <Text style={styles.twoColCardDesc}>
              Variation is allowed in <Text style={[styles.highlight, { color: C.cyan }]}>both directions</Text> from basic size.
            </Text>
            <View style={[styles.exampleChip, { backgroundColor: C.cyan + '20' }]}>
              <Text style={[styles.exampleChipText, { color: C.cyan }]}>25 ±0.05</Text>
            </View>
            <View style={[styles.exampleChip, { backgroundColor: C.cyan + '20', marginTop: 4 }]}>
              <Text style={[styles.exampleChipText, { color: C.cyan }]}>25 +0.03 / −0.07</Text>
            </View>
            <Text style={styles.twoColNote}>✓ Common for general dimensions</Text>
          </View>
        </View>

        <InfoCard accent={C.amber} style={{ marginTop: 12 }}>
          <Text style={[styles.highlight, { color: C.amber }]}>Equal Bilateral:</Text>
          <Text style={styles.bodyText}> Most economical; machinist can split error between two sides. Written as 25 ± 0.05.</Text>
          <Text style={[styles.highlight, { color: C.cyan, marginTop: 6 }]}>{'\n'}Unequal Bilateral:</Text>
          <Text style={styles.bodyText}> Allows more stock removal on one side. e.g., 25 +0.03/−0.07</Text>
        </InfoCard>

        <Divider />

        {/* ══════════════════════════════════════════
            🔧  TYPES OF TOLERANCES
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="🔧"
          title="Types of Tolerances"
          color={C.pink}
        />

        <View style={styles.tolTypeGrid}>
          <ToleranceTypeCard
            title="Dimensional"
            color={C.cyan}
            symbol="⬛"
            desc="Controls size — length, diameter, angle. Most common type on drawings."
            example="Ø 25 ± 0.05 mm"
          />
          <ToleranceTypeCard
            title="Geometrical"
            color={C.pink}
            symbol="⭕"
            desc="Controls form, orientation, location, and runout of features."
            example="Circularity ⊙ 0.02"
          />
          <ToleranceTypeCard
            title="Surface"
            color={C.green}
            symbol="〰️"
            desc="Controls surface texture roughness (Ra, Rz values)."
            example="Ra ≤ 1.6 μm"
          />
          <ToleranceTypeCard
            title="Angular"
            color={C.amber}
            symbol="📐"
            desc="Controls angular dimensions between features."
            example="90° ± 0.5°"
          />
        </View>

        <Divider />

        {/* ══════════════════════════════════════════
            ⚙️  FITS
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="⚙️"
          title="Fits — Shaft & Hole Relationship"
          subtitle="How mating parts assemble"
          color={C.cyan}
        />

        <InfoCard accent={C.cyan}>
          <Text style={styles.bodyText}>
            A <Text style={[styles.highlight, { color: C.cyan }]}>Fit</Text> describes the
            relationship between a <Text style={styles.highlight}>hole</Text> and a{' '}
            <Text style={styles.highlight}>shaft</Text> when assembled. It depends on the actual
            sizes of both parts and determines whether there will be clearance, interference, or
            uncertainty.
          </Text>
        </InfoCard>

        {/* Hole basis vs Shaft basis */}
        <View style={styles.basisRow}>
          <View style={[styles.basisCard, { borderColor: C.cyan + '50' }]}>
            <Text style={[styles.basisTitle, { color: C.cyan }]}>🕳️ Hole Basis</Text>
            <Text style={styles.basisDesc}>Hole size fixed. Shaft varied. Preferred system.</Text>
            <Text style={[styles.basisCode, { color: C.cyan }]}>Hole = H</Text>
          </View>
          <View style={[styles.basisCard, { borderColor: C.pink + '50' }]}>
            <Text style={[styles.basisTitle, { color: C.pink }]}>⚙️ Shaft Basis</Text>
            <Text style={styles.basisDesc}>Shaft size fixed. Hole varied. Used when shaft is standard.</Text>
            <Text style={[styles.basisCode, { color: C.pink }]}>Shaft = h</Text>
          </View>
        </View>

        <Text style={styles.fitSubheader}>Three Types of Fits</Text>

        <FitCard
          type="Clearance Fit"
          emoji="🟢"
          color={C.green}
          description="Shaft is always smaller than hole. Always has positive clearance (space between parts)."
          shaftRange="a to h (shaft smaller)"
          holeRange="A to H (hole larger)"
          uses={[
            'Sliding bearings & bushings',
            'Pistons in cylinders',
            'Keys and keyways (loose)',
            'Spindle in bearing housing',
          ]}
        />

        <FitCard
          type="Transition Fit"
          emoji="🟡"
          color={C.amber}
          description="May result in either clearance or interference depending on actual sizes. Zone overlaps zero line."
          shaftRange="j to n (overlap zone)"
          holeRange="J to N (overlap zone)"
          uses={[
            'Gear hubs on shafts',
            'Coupling flanges',
            'Pulleys and sprockets',
            'Precision location fits',
          ]}
        />

        <FitCard
          type="Interference Fit"
          emoji="🔴"
          color={C.pink}
          description="Shaft is always larger than hole. Always requires force, press, or heat to assemble. Parts become permanently joined."
          shaftRange="p to z (shaft larger)"
            holeRange="P to Z (hole smaller)"
          uses={[
            'Press-fit bearings',
            'Flywheel on crankshaft',
            'Shrink-fit couplings',
            'Permanent assemblies',
          ]}
        />

        {/* Fit formula block */}
        <View style={styles.fitFormulaBlock}>
          <Text style={styles.fitFormulaBlockTitle}>Quick Formulas</Text>
          <FormulaBox
            formula="Max Clearance = Max Hole − Min Shaft"
            description="Largest possible gap between parts"
          />
          <FormulaBox
            formula="Min Clearance = Min Hole − Max Shaft"
            description="Smallest possible gap (or allowance)"
          />
          <FormulaBox
            formula="Max Interference = Max Shaft − Min Hole"
            description="Largest overlap forcing assembly"
          />
          <FormulaBox
            formula="Allowance = Min Hole − Max Shaft"
            description="(+) for Clearance fit,  (−) for Interference fit"
          />
        </View>

        <Divider />

        {/* ══════════════════════════════════════════
            🏭  REAL-WORLD EXAMPLES
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="🏭"
          title="Real-World Examples"
          color={C.green}
        />

        {[
          {
            part: 'Engine Piston & Cylinder',
            fit: 'Clearance Fit',
            color: C.green,
            detail: 'Piston slides freely. Clearance ~0.05–0.15 mm allows thermal expansion.',
            designation: 'H7/f7',
          },
          {
            part: 'Rolling Bearing Inner Race',
            fit: 'Interference Fit',
            color: C.pink,
            detail: 'Bearing is press-fitted onto shaft. Prevents slipping under load.',
            designation: 'H7/r6',
          },
          {
            part: 'Gear Hub on Shaft',
            fit: 'Transition Fit',
            color: C.amber,
            detail: 'May need light press or tapping. Holds securely but can be disassembled.',
            designation: 'H7/k6',
          },
          {
            part: 'Journal Bearing',
            fit: 'Clearance Fit',
            color: C.green,
            detail: 'Oil film fills the clearance gap. Allows rotation with low friction.',
            designation: 'H8/f7',
          },
          {
            part: 'Shrink-fit Flywheel',
            fit: 'Interference Fit',
            color: C.pink,
            detail: 'Flywheel heated, shaft inserted, then cooled. Grip force: hundreds of kN.',
            designation: 'H6/s6',
          },
        ].map((item, i) => (
          <View key={i} style={[styles.realWorldCard, { borderLeftColor: item.color }]}>
            <View style={styles.realWorldTop}>
              <Text style={styles.realWorldPart}>{item.part}</Text>
              <View style={[styles.realWorldBadge, { backgroundColor: item.color + '20', borderColor: item.color + '50' }]}>
                <Text style={[styles.realWorldBadgeText, { color: item.color }]}>{item.fit}</Text>
              </View>
            </View>
            <Text style={styles.realWorldDetail}>{item.detail}</Text>
            <Text style={[styles.realWorldDesig, { color: item.color }]}>Designation: {item.designation}</Text>
          </View>
        ))}

        <Divider />

        {/* ══════════════════════════════════════════
            📊  FORMULA & WORKED EXAMPLES
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="📊"
          title="Formulas & Worked Examples"
          color={C.blue}
        />

        {/* Worked Example 1 */}
        <View style={styles.workedExample}>
          <View style={styles.workedExampleHeader}>
            <Text style={styles.workedExampleNum}>Example 1</Text>
            <Text style={styles.workedExampleTitle}>Find Tolerance, Allowance & Type of Fit</Text>
          </View>
          <InfoCard accent={C.blue}>
            <Text style={styles.bodyText}>
              A hole is specified as{' '}
              <Text style={[styles.highlight, { color: C.cyan }]}>Ø 50.000 / 50.039 mm</Text>
              {'\n'}A shaft is specified as{' '}
              <Text style={[styles.highlight, { color: C.pink }]}>Ø 49.950 / 49.975 mm</Text>
            </Text>
          </InfoCard>
          <FormulaBox formula="Hole Tolerance = 50.039 − 50.000 = 0.039 mm" />
          <FormulaBox formula="Shaft Tolerance = 49.975 − 49.950 = 0.025 mm" />
          <FormulaBox formula="Max Clearance = 50.039 − 49.950 = +0.089 mm" />
          <FormulaBox formula="Min Clearance = 50.000 − 49.975 = +0.025 mm" />
          <View style={[styles.resultBox, { borderColor: C.green, backgroundColor: C.green + '15' }]}>
            <Text style={[styles.resultText, { color: C.green }]}>
              ✅ Both clearances are positive → CLEARANCE FIT
            </Text>
          </View>
        </View>

        {/* Worked Example 2 */}
        <View style={styles.workedExample}>
          <View style={styles.workedExampleHeader}>
            <Text style={styles.workedExampleNum}>Example 2</Text>
            <Text style={styles.workedExampleTitle}>Interference Fit Check</Text>
          </View>
          <InfoCard accent={C.pink}>
            <Text style={styles.bodyText}>
              Hole: <Text style={[styles.highlight, { color: C.cyan }]}>Ø 40.000 / 40.025 mm</Text>
              {'\n'}Shaft: <Text style={[styles.highlight, { color: C.pink }]}>Ø 40.042 / 40.059 mm</Text>
            </Text>
          </InfoCard>
          <FormulaBox formula="Min Clearance = 40.000 − 40.059 = −0.059 mm" />
          <FormulaBox formula="Max Clearance = 40.025 − 40.042 = −0.017 mm" />
          <View style={[styles.resultBox, { borderColor: C.pink, backgroundColor: C.pink + '15' }]}>
            <Text style={[styles.resultText, { color: C.pink }]}>
              🔴 Both values negative → INTERFERENCE FIT{'\n'}Max Interference = 0.059 mm
            </Text>
          </View>
        </View>

        {/* ISO Tolerance Grades */}
        <View style={styles.isoBlock}>
          <Text style={styles.isoTitle}>ISO Tolerance Grades (IT Grades)</Text>
          <Text style={styles.isoSub}>IT01, IT0, IT1 … IT18 — finer to coarser</Text>
          {[
            { grade: 'IT01–IT4', use: 'Gauges, measuring instruments' },
            { grade: 'IT5–IT7', use: 'Precision fits, bearings, gears' },
            { grade: 'IT8–IT11', use: 'General engineering fits' },
            { grade: 'IT12–IT18', use: 'Rough machining, press work' },
          ].map((row, i) => (
            <View key={i} style={styles.isoRow}>
              <Text style={[styles.isoGrade, { color: C.cyan }]}>{row.grade}</Text>
              <Text style={styles.isoUse}>{row.use}</Text>
            </View>
          ))}
        </View>

        <Divider />

        {/* ══════════════════════════════════════════
            💡  IMPORTANT NOTES (EXAM / INTERVIEW)
        ══════════════════════════════════════════ */}
        <SectionHeader
          icon="💡"
          title="Important Notes"
          subtitle="For exams & interviews"
          color={C.pink}
        />

        <View style={[styles.examBanner, { backgroundColor: C.pink + '15', borderColor: C.pink + '40' }]}>
          <Text style={[styles.examBannerText, { color: C.pink }]}>
            🎓 Must-Know Points
          </Text>
        </View>

        {[
          'Tolerance is always POSITIVE (magnitude). It never has a sign — it\'s a range, not a direction.',
          'Allowance = Min Hole − Max Shaft. Positive = Clearance, Negative = Interference.',
          'Hole Basis System is preferred in practice (H is fixed). Capital letters = Hole, lowercase = Shaft.',
          'In ISO system: Fundamental deviation gives position; IT grade gives magnitude of tolerance.',
          'For a CLEARANCE FIT: Max shaft < Min hole always. The shaft is always smaller.',
          'Transition fits can produce either clearance or interference — you can\'t tell without measuring actual parts.',
          'Press fit (interference) creates stress in both shaft and hole. Lame\'s equations are used to calculate hoop stress.',
          'Surface roughness must be finer than tolerance value. Ra < T/4 is a common rule.',
          'Selective Assembly is used when tight tolerances are too costly — sort parts into groups and match them.',
          '"Go" gauge checks minimum material condition; "No-Go" gauge checks maximum material condition.',
        ].map((tip, i) => (
          <ExamTip key={i} number={i + 1} tip={tip} />
        ))}

        {/* Quick Reference Table */}
        <View style={styles.quickRefTable}>
          <Text style={styles.quickRefTitle}>Quick Reference — Fit Symbols</Text>
          {[
            ['Symbol', 'Hole System', 'Shaft System', 'Fit Type'],
            ['H/a–H/h', 'H', 'a to h', 'Clearance'],
            ['H/j–H/n', 'H', 'j to n', 'Transition'],
            ['H/p–H/z', 'H', 'p to z', 'Interference'],
          ].map((row, i) => (
            <View key={i} style={[styles.tableRow, i === 0 && styles.tableHeader]}>
              {row.map((cell, j) => (
                <Text
                  key={j}
                  style={[
                    styles.tableCell,
                    i === 0 && styles.tableCellHeader,
                    j === 3 && {
                      color:
                        cell === 'Clearance' ? C.green :
                        cell === 'Transition' ? C.amber :
                        cell === 'Interference' ? C.pink :
                        C.textPrimary,
                    },
                  ]}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Engineering Tolerances • ISO 286 / IS:919</Text>
          <Text style={styles.footerSub}>Swipe up for more engineering topics</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Hero ──
  hero: {
    backgroundColor: C.surface,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.cyan + '08',
    borderWidth: 1,
    borderColor: C.cyan + '20',
  },
  heroTag: {
    fontSize: 11,
    fontWeight: '700',
    color: C.cyan,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },

  // ── Info Card ──
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  bodyText: {
    fontSize: 13.5,
    color: C.textSecondary,
    lineHeight: 21,
  },
  highlight: {
    fontWeight: '700',
    color: C.textPrimary,
  },

  // ── Formula ──
  formulaBox: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  formulaInner: {
    backgroundColor: '#0D1829',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.cyan + '30',
  },
  formulaText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: C.cyan,
    letterSpacing: 0.3,
  },
  formulaDesc: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
    marginLeft: 2,
    fontStyle: 'italic',
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // ── KV Row ──
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  kvLabel: { fontSize: 12, color: C.textMuted },
  kvValue: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },

  // ── Importance list ──
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  importanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 2,
  },
  importanceDesc: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 18,
  },

  // ── Term Cards ──
  termCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  termName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  termDef: {
    fontSize: 12.5,
    color: C.textSecondary,
    lineHeight: 19,
  },

  // ── Limit Diagram ──
  limitDiagram: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  limitDiagramTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  limitVisual: { alignItems: 'center', gap: 8 },
  limitBoxes: { flexDirection: 'row', gap: 10 },
  limitBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
  },
  limitBoxLabel: { fontSize: 10, marginBottom: 4, letterSpacing: 0.5 },
  limitBoxVal: { fontSize: 22, fontWeight: '800', fontFamily: 'monospace' },
  limitArrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  limitToleranceLabel: { fontSize: 13, fontWeight: '700' },
  limitFormulas: { marginTop: 10, gap: 4 },

  // ── Two Col Grid ──
  twoColGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  twoColCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  twoColCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  twoColCardDesc: {
    fontSize: 11.5,
    color: C.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  exampleChip: {
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    marginBottom: 2,
  },
  exampleChipText: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  twoColNote: {
    fontSize: 10.5,
    color: C.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── Tolerance Type Grid ──
  tolTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  tolTypeCard: {
    width: (width - 42) / 2,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
  },
  tolTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tolTypeSymbol: { fontSize: 14 },
  tolTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  tolTypeDesc: {
    fontSize: 11.5,
    color: C.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  tolTypeExample: {
    borderRadius: 6,
    padding: 5,
    alignItems: 'center',
  },
  tolTypeExampleText: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },

  // ── Fit Cards ──
  fitCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  fitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  fitEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitEmoji: { fontSize: 22 },
  fitType: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  fitDesc: {
    fontSize: 11.5,
    color: C.textSecondary,
    lineHeight: 17,
  },
  fitChevron: { fontSize: 12, fontWeight: '700' },
  fitDetails: { paddingHorizontal: 14, paddingBottom: 14 },
  fitUsesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  fitUse: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 3,
    paddingLeft: 4,
  },

  // ── Basis cards ──
  basisRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  basisCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  basisTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  basisDesc: { fontSize: 11.5, color: C.textSecondary, lineHeight: 17, marginBottom: 8 },
  basisCode: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  fitSubheader: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // ── Fit Formula Block ──
  fitFormulaBlock: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  fitFormulaBlockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.cyan,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // ── Real World Cards ──
  realWorldCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  realWorldTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  realWorldPart: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  realWorldBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  realWorldBadgeText: { fontSize: 10, fontWeight: '700' },
  realWorldDetail: {
    fontSize: 12.5,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  realWorldDesig: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },

  // ── Worked Example ──
  workedExample: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  workedExampleHeader: {
    backgroundColor: C.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  workedExampleNum: {
    fontSize: 10,
    fontWeight: '700',
    color: C.cyan,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  workedExampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
    margin: 14,
    marginTop: 4,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },

  // ── ISO Block ──
  isoBlock: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  isoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 2,
  },
  isoSub: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  isoRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  isoGrade: { width: 120, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  isoUse: { flex: 1, fontSize: 12, color: C.textSecondary },

  // ── Exam Tips ──
  examBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  examBannerText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  examTip: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  examTipNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.pink + '25',
    borderWidth: 1,
    borderColor: C.pink + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  examTipNumText: { fontSize: 11, fontWeight: '800', color: C.pink },
  examTipText: { flex: 1, fontSize: 12.5, color: C.textSecondary, lineHeight: 20 },

  // ── Quick Ref Table ──
  quickRefTable: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  quickRefTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    padding: 12,
    paddingBottom: 0,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  tableHeader: {
    backgroundColor: C.surface,
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    color: C.textSecondary,
    padding: 9,
    paddingVertical: 8,
  },
  tableCellHeader: {
    color: C.textMuted,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  footerSub: { fontSize: 11, color: C.textMuted + '80', fontStyle: 'italic' },
});