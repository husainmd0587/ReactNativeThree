export const MATERIALS = [
  { label: 'Steel',           density: 7.85 },
  { label: 'Stainless Steel', density: 7.90 },
  { label: 'Aluminium',       density: 2.70 },
  { label: 'Copper',          density: 8.96 },
  { label: 'Brass',           density: 8.50 },
  { label: 'Cast Iron',       density: 7.20 },
  { label: 'Lead',            density: 11.34 },
  { label: 'Titanium',        density: 4.51 },
  { label: 'Nickel',          density: 8.90 },
  { label: 'Bronze',          density: 8.80 },
  { label: 'Zinc',            density: 7.133 },
  { label: 'Acrylic',         density: 1.18 },
  { label: 'Beryllium',       density: 1.85 },
  { label: 'Chrome',          density: 7.19 },
  { label: 'Columbium',       density: 8.57 },
  { label: 'Duralumin',       density: 2.79 },
  { label: 'Glass',           density: 2.50 },
  { label: 'Gold',            density: 19.30 },
  { label: 'Magnesium',       density: 1.74 },
  { label: 'Mercury',         density: 13.60 },
  { label: 'Molybdenum',      density: 10.22 },
  { label: 'Nylon',           density: 1.15 },
  { label: 'PB / Gunmetal',   density: 8.77 },
  { label: 'Platinum',        density: 21.45 },
  { label: 'Polycarbonate',   density: 1.20 },
  { label: 'Polyethylene',    density: 0.96 },
  { label: 'Polypropylene',   density: 0.91 },
  { label: 'Potassium',       density: 0.86 },
  { label: 'PVDF',            density: 1.78 },
  { label: 'Silver',          density: 10.49 },
  { label: 'Tantalum',        density: 16.69 },
  { label: 'Teflon',          density: 2.20 },
  { label: 'Tin',             density: 7.30 },
  { label: 'Tungsten',        density: 19.30 },
  { label: 'Water',           density: 1.00 },
  { label: 'Zirconium',       density: 6.51 },
  { label: 'Custom...',       density: null },
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
      return (3 * Math.sqrt(3) / 2) * Math.pow(A / 10, 2) * (L / 10) * (density / 1000);
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
      return Math.PI * r * r * (L / 10) * (density / 1000);
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
      return Math.PI * (ro * ro - ri * ri) * (L / 10) * (density / 1000);
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
      return Math.pow(A / 10, 2) * (L / 10) * (density / 1000);
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
      return (a * a - (a - 2 * t) * (a - 2 * t)) * l * (density / 1000);
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
      return (W * TF + TW * (H - TF)) * L * (density / 1000);
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
      return (2 * W * TF + TW * (H - 2 * TF)) * L * (density / 1000);
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
      return (2 * W * TF + TW * (H - 2 * TF)) * L * (density / 1000);
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
      return W * T * L * (density / 1000);
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
      return (A + B - T) * T * L * (density / 1000);
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10, B = toMM(d.B, d.unitB) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((A + B) * L) / 10000;
    },
  },
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
      return W * T * L * (density / 1000);
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
      return (W * H - (W - 2 * T) * (H - 2 * T)) * L * (density / 1000);
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
      return W * L * T * (density / 1000);
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
      return 2 * (Math.SQRT2 - 1) * A * A * L * (density / 1000);
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
      return (Math.PI * r * r / 2) * L * (density / 1000);
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
      return (2 * W * T + (H - 2 * T) * T) * L * (density / 1000);
    },
    calcArea: (d) => {
      const H = toMM(d.H, d.unitH) / 10;
      const W = toMM(d.W, d.unitW) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      return ((2 * W + H) * L) / 10000;
    },
  },
  {
    id: 'sphere',
    name: 'SPHERE / BALL',
    dims: [
      { id: 'D',      label: 'Diameter (D)', unit: true,  default: 50 },
      { id: 'pieces', label: 'Pieces',       unit: false, default: '' },
      { id: 'kgPrice',label: 'Kg Price',     unit: false, default: '' },
    ],
    // No 'length' dim — a sphere isn't extruded, so weight comes straight
    // from ball volume rather than cross-section × length.
    calcWeight: (d, density) => {
      const D = toMM(d.D, d.unitD);
      const r = D / 20;
      return (4 / 3) * Math.PI * r * r * r * (density / 1000);
    },
    calcArea: (d) => {
      const D = toMM(d.D, d.unitD);
      const r = D / 20;
      return (4 * Math.PI * r * r) / 10000;
    },
  },
  {
    id: 'oval',
    name: 'OVAL',
    dims: [
      { id: 'A',      label: 'Major Axis (A)', unit: true,  default: 60  },
      { id: 'B',      label: 'Minor Axis (B)', unit: true,  default: 30  },
      { id: 'length', label: 'Length',         unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',         unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',       unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA) / 10;
      const B = toMM(d.B, d.unitB) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const a = A / 2, b = B / 2;
      return Math.PI * a * b * L * (density / 1000);
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10;
      const B = toMM(d.B, d.unitB) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const a = A / 2, b = B / 2;
      // Ramanujan's ellipse-perimeter approximation
      const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
      const perimeter = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
      return (perimeter * L) / 10000;
    },
  },
  {
    id: 'crsquare',
    name: 'CR SQUARE',
    dims: [
      { id: 'A',      label: 'Side (A)',          unit: true,  default: 50  },
      { id: 'R',      label: 'Corner Radius (R)', unit: true,  default: 8   },
      { id: 'length', label: 'Length',            unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',            unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',          unit: false, default: ''  },
    ],
    // Corner-radius (rounded-corner) square bar: a square with the 4 corners
    // rounded off — a real stock shape, distinct from a plain square bar.
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA) / 10;
      const R = toMM(d.R, d.unitR) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const area = A * A - (4 - Math.PI) * R * R;
      return area * L * (density / 1000);
    },
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10;
      const R = toMM(d.R, d.unitR) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const perimeter = 4 * (A - 2 * R) + 2 * Math.PI * R;
      return (perimeter * L) / 10000;
    },
  },
  {
    id: 'crrect',
    name: 'CR RECTANGLE',
    dims: [
      { id: 'W',      label: 'Width (W)',         unit: true,  default: 60  },
      { id: 'H',      label: 'Height (H)',        unit: true,  default: 40  },
      { id: 'R',      label: 'Corner Radius (R)', unit: true,  default: 8   },
      { id: 'length', label: 'Length',            unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',            unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',          unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const W = toMM(d.W, d.unitW) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const R = toMM(d.R, d.unitR) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const area = W * H - (4 - Math.PI) * R * R;
      return area * L * (density / 1000);
    },
    calcArea: (d) => {
      const W = toMM(d.W, d.unitW) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const R = toMM(d.R, d.unitR) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const perimeter = 2 * (W - 2 * R) + 2 * (H - 2 * R) + 2 * Math.PI * R;
      return (perimeter * L) / 10000;
    },
  },
  {
    id: 'triangle',
    name: 'TRIANGLE',
    dims: [
      { id: 'B',      label: 'Base (B)',   unit: true,  default: 50  },
      { id: 'H',      label: 'Height (H)', unit: true,  default: 43  },
      { id: 'length', label: 'Length',     unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',     unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',   unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const B = toMM(d.B, d.unitB) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const area = 0.5 * B * H;
      return area * L * (density / 1000);
    },
    // Perimeter assumes an isosceles triangle (base + two equal sides) since
    // only base and height are captured — a reasonable default for stock bar.
    calcArea: (d) => {
      const B = toMM(d.B, d.unitB) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const side = Math.sqrt((B / 2) * (B / 2) + H * H);
      const perimeter = B + 2 * side;
      return (perimeter * L) / 10000;
    },
  },
  {
    id: 'trapezoid',
    name: 'TRAPEZOID',
    dims: [
      { id: 'A',      label: 'Top Width (A)',    unit: true,  default: 30  },
      { id: 'B',      label: 'Bottom Width (B)', unit: true,  default: 60  },
      { id: 'H',      label: 'Height (H)',       unit: true,  default: 40  },
      { id: 'length', label: 'Length',           unit: true,  default: 100 },
      { id: 'pieces', label: 'Pieces',           unit: false, default: ''  },
      { id: 'kgPrice',label: 'Kg Price',         unit: false, default: ''  },
    ],
    calcWeight: (d, density) => {
      const A = toMM(d.A, d.unitA) / 10;
      const B = toMM(d.B, d.unitB) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const area = 0.5 * (A + B) * H;
      return area * L * (density / 1000);
    },
    // Perimeter assumes an isosceles trapezoid (both slant sides equal)
    calcArea: (d) => {
      const A = toMM(d.A, d.unitA) / 10;
      const B = toMM(d.B, d.unitB) / 10;
      const H = toMM(d.H, d.unitH) / 10;
      const L = toMM(d.length, d.unitLength) / 10;
      const slant = Math.sqrt(Math.pow((B - A) / 2, 2) + H * H);
      const perimeter = A + B + 2 * slant;
      return (perimeter * L) / 10000;
    },
  },
];

function toMM(val, unit) {
  const v = parseFloat(val) || 0;
  if (unit === 'cm') return v * 10;
  if (unit === 'm')  return v * 1000;
  if (unit === 'in') return v * 25.4;
  return v; // mm
}