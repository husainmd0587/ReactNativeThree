export const MATERIALS = [
  { label: 'Steel',      density: 7.85 },
  { label: 'Aluminium',  density: 2.70 },
  { label: 'Copper',     density: 8.96 },
  { label: 'Brass',      density: 8.50 },
  { label: 'Cast Iron',  density: 7.20 },
  { label: 'Lead',       density: 11.34 },
  { label: 'Titanium',   density: 4.51 },
  { label: 'Nickel',     density: 8.90 },
  { label: 'Bronze',     density: 8.80 },
  { label: 'Zinc',       density: 7.13 },
];

export const SHAPES = [
  {
    id: 'hexagon',
    name: 'HEXAGON',
    dims: [
      { id: 'A',      label: 'Width (A)',   unit: true,  default: 10  },
      { id: 'length', label: 'Length',      unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',      unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',    unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA);
      const L = toMM(d.length, d.unitLength);
      return (3 * Math.sqrt(3) / 2) * Math.pow(A / 10, 2) * (L / 10) * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA);
      const L = toMM(d.length, d.unitLength);
      return (6 * (A / 10) * (L / 10)) / 10000;
    },
  },
  {
    id: 'roundbar',
    name: 'ROUND BAR',
    dims: [
      { id: 'D',      label: 'Diameter (D)', unit: true,  default: 20  },
      { id: 'length', label: 'Length',       unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',       unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',     unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const D = toMM(d.D, d.unitD);
      const L = toMM(d.length, d.unitLength);
      const r = D / 20;
      return Math.PI * r * r * (L / 10) * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const D = toMM(d.D, d.unitD);
      const L = toMM(d.length, d.unitLength);
      return (Math.PI * (D / 10) * (L / 10)) / 10000;
    },
  },
  {
    id: 'roundtube',
    name: 'ROUND TUBE',
    dims: [
      { id: 'D',      label: 'Outer Dia (D)',  unit: true,  default: 30  },
      { id: 'T',      label: 'Thickness (T)',  unit: true,  default: 3   },
      { id: 'length', label: 'Length',         unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',         unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',       unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const D = toMM(d.D, d.unitD);
      const T = toMM(d.T, d.unitT);
      const L = toMM(d.length, d.unitLength);
      const ro = D / 20, ri = (D / 2 - T) / 10;
      return Math.PI * (ro * ro - ri * ri) * (L / 10) * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const D = toMM(d.D, d.unitD);
      const L = toMM(d.length, d.unitLength);
      return (Math.PI * (D / 10) * (L / 10)) / 10000;
    },
  },
  {
    id: 'squarebar',
    name: 'SQUARE BAR',
    dims: [
      { id: 'A',      label: 'Width (A)', unit: true,  default: 20  },
      { id: 'length', label: 'Length',    unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',    unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',  unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA);
      const L = toMM(d.length, d.unitLength);
      return Math.pow(A / 10, 2) * (L / 10) * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA);
      const L = toMM(d.length, d.unitLength);
      return (4 * (A / 10) * (L / 10)) / 10000;
    },
  },
  {
    id: 'squaretube',
    name: 'SQUARE TUBE',
    dims: [
      { id: 'A',      label: 'Width (A)',       unit: true,  default: 30  },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 3   },
      { id: 'length', label: 'Length',          unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA);
      const T = toMM(d.T, d.unitT);
      const L = toMM(d.length, d.unitLength);
      const a = A / 10, t = T / 10, l = L / 10;
      return (a * a - (a - 2 * t) * (a - 2 * t)) * l * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA);
      const L = toMM(d.length, d.unitLength);
      return (4 * (A / 10) * (L / 10)) / 10000;
    },
  },
  {
    id: 'tbar',
    name: 'T BAR',
    dims: [
      { id: 'W',      label: 'Width (W)',       unit: true,  default: 50   },
      { id: 'H',      label: 'Height (H)',      unit: true,  default: 50   },
      { id: 'TW',     label: 'Web Thickness',   unit: true,  default: 5    },
      { id: 'TF',     label: 'Flange Thickness',unit: true,  default: 5    },
      { id: 'length', label: 'Length',          unit: true,  default: 1000 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''   },
    ],
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10, H = toMM(d.H, d.unitH) / 10;
      const TW = toMM(d.TW, d.unitTW) / 10, TF = toMM(d.TF, d.unitTF) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (W * TF + TW * (H - TF)) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10, H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((2 * H + W) * L) / 10000;
    },
  },
  {
    id: 'beams',
    name: 'BEAMS',
    dims: [
      { id: 'H',      label: 'Height (H)',       unit: true,  default: 100  },
      { id: 'W',      label: 'Width (W)',        unit: true,  default: 50   },
      { id: 'TF',     label: 'Flange Thickness', unit: true,  default: 8    },
      { id: 'TW',     label: 'Web Thickness',    unit: true,  default: 5    },
      { id: 'length', label: 'Length',           unit: true,  default: 1000 },
      { id: 'pieces', label: 'Pieces',           unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',         unit: false, default: ''   },
    ],
    calcWeight: (d, density) => {
      const H = toMM(d.H, d.unitH) / 10, W = toMM(d.W, d.unitW) / 10;
      const TF = toMM(d.TF, d.unitTF) / 10, TW = toMM(d.TW, d.unitTW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (2 * W * TF + TW * (H - 2 * TF)) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const H = toMM(d.H, d.unitH) / 10, W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((4 * W + 2 * H) * L) / 10000;
    },
  },
  {
    id: 'channel',
    name: 'CHANNEL',
    dims: [
      { id: 'H',      label: 'Height (H)',       unit: true,  default: 80   },
      { id: 'W',      label: 'Width (W)',        unit: true,  default: 40   },
      { id: 'TF',     label: 'Flange Thickness', unit: true,  default: 7    },
      { id: 'TW',     label: 'Web Thickness',    unit: true,  default: 5    },
      { id: 'length', label: 'Length',           unit: true,  default: 1000 },
      { id: 'pieces', label: 'Pieces',           unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',         unit: false, default: ''   },
    ],
    calcWeight: (d, density) => {
      const H = toMM(d.H, d.unitH) / 10, W = toMM(d.W, d.unitW) / 10;
      const TF = toMM(d.TF, d.unitTF) / 10, TW = toMM(d.TW, d.unitTW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (2 * W * TF + TW * (H - 2 * TF)) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const H = toMM(d.H, d.unitH) / 10, W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((2 * W + H) * L) / 10000;
    },
  },
  {
    id: 'flatbar',
    name: 'FLAT BAR',
    dims: [
      { id: 'W',      label: 'Width (W)',       unit: true,  default: 30  },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 5   },
      { id: 'length', label: 'Length',          unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10, T = toMM(d.T, d.unitT) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return W * T * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10, L = toMM(d.length, d.unitLength) / 10;
      return (2 * W * L) / 10000;
    },
  },
  {
    id: 'angle',
    name: 'ANGLE',
    dims: [
      { id: 'A',      label: 'Width A',         unit: true,  default: 50   },
      { id: 'B',      label: 'Width B',         unit: true,  default: 50   },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 5    },
      { id: 'length', label: 'Length',          unit: true,  default: 1000 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''   },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA) / 10, B = toMM(d.B, d.unitB) / 10;
      const T = toMM(d.T, d.unitT) / 10, L = toMM(d.length, d.unitLength) / 10;
      return (A + B - T) * T * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10, B = toMM(d.B, d.unitB) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((A + B) * L) / 10000;
    },
  },
  // ─── PASTE THESE ENTRIES INTO YOUR SHAPES ARRAY ────────────────────────────
// Add after the 'angle' entry. Also uses the same toMM() helper already defined.

  {
    id: 'rectbar',
    name: 'RECTANGULAR BAR',
    dims: [
      { id: 'W',      label: 'Width (W)',       unit: true,  default: 40  },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 20  },
      { id: 'length', label: 'Length',          unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10;
      const T = toMM(d.T, d.unitT) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return W * T * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10;
      const T = toMM(d.T, d.unitT) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (2 * (W + T) * L) / 10000;
    },
  },

  {
    id: 'recttube',
    name: 'RECTANGULAR TUBE',
    dims: [
      { id: 'W',      label: 'Width (W)',       unit: true,  default: 60  },
      { id: 'H',      label: 'Height (H)',      unit: true,  default: 40  },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 3   },
      { id: 'length', label: 'Length',          unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const T = toMM(d.T, d.unitT) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (W * H - (W - 2 * T) * (H - 2 * T)) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (2 * (W + H) * L) / 10000;
    },
  },

  {
    id: 'sheet',
    name: 'SHEET / PLATE',
    dims: [
      { id: 'W',      label: 'Width (W)',       unit: true,  default: 1000 },
      { id: 'L',      label: 'Length (L)',      unit: true,  default: 2000 },
      { id: 'T',      label: 'Thickness (T)',   unit: true,  default: 5    },
      { id: 'pieces', label: 'Pieces',          unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',        unit: false, default: ''   },
    ],
    // Sheet uses W × L × T directly; 'length' key not used
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.L, d.unitL) / 10;
      const T = toMM(d.T, d.unitT) / 10;
      return W * L * T * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.L, d.unitL) / 10;
      return (W * L) / 10000;   // top face area in m²
    },
  },

  {
    id: 'octagonbar',
    name: 'OCTAGON BAR',
    dims: [
      { id: 'A',      label: 'Width (A)',   unit: true,  default: 20  },
      { id: 'length', label: 'Length',      unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',      unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',    unit: false, default: ''  },
    ],
    // Area of a regular octagon with across-flats width A: A² × (√2 − 1) × 2
    // = 2(√2 − 1) × A² ≈ 0.8284 × A²
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return 2 * (Math.SQRT2 - 1) * A * A * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (8 * A * L * Math.tan(Math.PI / 8)) / 10000;
    },
  },

  {
    id: 'halfround',
    name: 'HALF ROUND BAR',
    dims: [
      { id: 'D',      label: 'Diameter (D)', unit: true,  default: 20  },
      { id: 'length', label: 'Length',       unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',       unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',     unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const D = toMM(d.D, d.unitD) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const r = D / 2;
      return (Math.PI * r * r / 2) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const D = toMM(d.D, d.unitD) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      // perimeter: half circumference + diameter
      return ((Math.PI * D / 2 + D) * L) / 10000;
    },
  },

  {
    id: 'zsection',
    name: 'Z SECTION',
    dims: [
      { id: 'H',      label: 'Height (H)',        unit: true,  default: 80   },
      { id: 'W',      label: 'Flange Width (W)',  unit: true,  default: 40   },
      { id: 'T',      label: 'Thickness (T)',     unit: true,  default: 5    },
      { id: 'length', label: 'Length',            unit: true,  default: 1000 },
      { id: 'pieces', label: 'Pieces',            unit: false, default: ''   },
      { id: 'kgPrice',label: 'Kg Price',          unit: false, default: ''   },
    ],
    // Z = 2 flanges + 1 web, same cross-section as C-channel
    calcWeight: (d, density) => {
      const H = toMM(d.H, d.unitH) / 10;
      const W = toMM(d.W, d.unitW) / 10;
      const T = toMM(d.T, d.unitT) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return (2 * W * T + (H - 2 * T) * T) * L * (density / 1000) * 1000;
    },
    calcArea: (d) => {
      const H = toMM(d.H, d.unitH) / 10;
      const W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((2 * W + H) * L) / 10000;
    },
  },
];

function toMM(val, unit) {
  const v = parseFloat(val) || 0;
  return unit === 'cm' ? v * 10 : unit === 'm' ? v * 1000 : v;
}