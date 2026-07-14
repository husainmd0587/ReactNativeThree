/**
 * toolLibrary.js
 *
 * Describes the turret's tool stations. Station 1 corresponds to T01xx in the
 * G-code (T0101 = station 1, offset 1), station 2 to T02xx, etc. - the standard
 * lathe convention where the first two digits of a T-word are the tool/station
 * number and the last two are the offset/geometry number.
 *
 * Used by:
 *  - components/Turret.jsx - to know how many stations to draw and label them
 *  - ToolMagazine.js - to render the full tool data sheet
 */

export const TOOL_STATIONS = [
  {
    station: 1,
    toolNumber: 'T0101',
    name: 'OD Rough Turning Tool',
    type: 'External turning',
    insert: 'CNMG 120408',
    insertShape: '80° diamond (C)',
    material: 'Carbide, TiN coated',
    noseRadius: '0.8 mm',
    leadAngle: '95°',
    maxDepthOfCut: '3.0 mm',
    notes: 'Primary roughing tool - used for G71 stock removal cycles.',
  },
  {
    station: 2,
    toolNumber: 'T0202',
    name: 'OD Finish Turning Tool',
    type: 'External turning',
    insert: 'VNMG 160404',
    insertShape: '35° diamond (V)',
    material: 'Carbide, fine grain',
    noseRadius: '0.4 mm',
    leadAngle: '93°',
    maxDepthOfCut: '0.5 mm',
    notes: 'Finishing pass - used for G70 cycles, light cuts for surface finish.',
  },
  {
    station: 3,
    toolNumber: 'T0303',
    name: 'Grooving / Parting Tool',
    type: 'Grooving / parting',
    insert: 'MGMN 300-M',
    insertShape: 'Rectangular, 3mm width',
    material: 'Carbide, uncoated',
    noseRadius: '0.1 mm',
    leadAngle: '90° (straight plunge)',
    maxDepthOfCut: 'Full radius (parting)',
    notes: 'Used for G75 peck grooving and manual parting-off moves.',
  },
  {
    station: 4,
    toolNumber: 'T0404',
    name: 'Threading Tool',
    type: 'Threading',
    insert: '16ER / 16IR, 60° V-profile',
    insertShape: '60° V-thread',
    material: 'Carbide, ground profile',
    noseRadius: '0.05-0.2 mm (thread pitch dependent)',
    leadAngle: '29.5° (flank relief)',
    maxDepthOfCut: 'Per-pass, degressive',
    notes: 'Used for G76 threading cycles.',
  },
  {
    station: 5,
    toolNumber: 'T0505',
    name: 'Boring Bar',
    type: 'Internal turning',
    insert: 'CCMT 09T304',
    insertShape: '80° rhombic (C)',
    material: 'Carbide, anti-vibration steel shank',
    noseRadius: '0.4 mm',
    leadAngle: '93°',
    maxDepthOfCut: '1.5 mm',
    notes: 'For internal turning of previously drilled/bored bores.',
  },
  {
    station: 6,
    toolNumber: 'T0606',
    name: 'Center Drill / Twist Drill',
    type: 'Drilling',
    insert: 'HSS-Co twist drill (or carbide-tipped)',
    insertShape: '118° point angle',
    material: 'HSS-Cobalt / solid carbide',
    noseRadius: 'N/A',
    leadAngle: '118° point',
    maxDepthOfCut: 'Peck cycle, per G74 K value',
    notes: 'Used for G74 peck drilling. Diameter set via the D word on the G74 line.',
  },
  {
    station: 7,
    toolNumber: 'T0707',
    name: 'Facing Tool',
    type: 'Facing',
    insert: 'DNMG 150408',
    insertShape: '55° diamond (D)',
    material: 'Carbide, TiAlN coated',
    noseRadius: '0.8 mm',
    leadAngle: '91°',
    maxDepthOfCut: '2.5 mm',
    notes: 'Dedicated facing tool for squaring the stock end.',
  },
  {
    station: 8,
    toolNumber: 'T0808',
    name: 'Knurling Tool',
    type: 'Knurling',
    insert: 'Straight/diamond knurl wheels',
    insertShape: 'N/A (form rolling)',
    material: 'Hardened tool steel wheels',
    noseRadius: 'N/A',
    leadAngle: 'N/A',
    maxDepthOfCut: 'Form rolled, not cut',
    notes: 'Not currently driven by any canned cycle in the interpreter - reserved station.',
  },
];

export function stationFromToolNumber(toolNumber) {
  // T0101 -> station 1, T0303 -> station 3, etc.
  if (toolNumber == null) return null;
  const n = Number(toolNumber);
  if (Number.isNaN(n)) return null;
  const station = Math.floor(n / 100);
  return station > 0 ? station : null;
}

export function toolByStation(station) {
  return TOOL_STATIONS.find((t) => t.station === station) ?? null;
}

export default { TOOL_STATIONS, stationFromToolNumber, toolByStation };
