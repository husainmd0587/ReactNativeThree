// The practice canvas draws in on-screen pixels; exercises are authored in
// millimetres so instructions/results read like real CAD ("100 mm line").
// This is a fixed display scale for practice purposes only — not a real
// CAD unit/viewport system.
export const PX_PER_MM = 2;

export function pxToMm(px) {
  return px / PX_PER_MM;
}

export function mmToPx(mm) {
  return mm * PX_PER_MM;
}
