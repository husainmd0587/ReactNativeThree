AutoCad plugin — Trim (line-on-line)
=======================================

Same drop-in rule: this zip's `AutoCad/` folder replaces yours wholesale.

WHAT'S NEW
----------
Trim: tap a line to use as the cutting edge, then tap the side of another
line (crossing it) that you want removed. That side gets cut back to the
crossing point; the other side stays. Tap a new cutting edge any time to
trim something else. A hint line above the canvas tells you which of the
two steps you're on.

Scoped to line-on-line — trimming against a circle/rectangle/arc/polyline
boundary needs real curve-intersection math per shape-type pair, which is
a genuinely bigger feature (same reasoning as everything else marked
"not done" so far). This covers the exact case the original spec itself
used as its own Trim example: "Trim the horizontal line at the vertical
boundary" — which is also what gets auto-seeded when you open the
command with an empty canvas (two crossing lines, ready to trim).

No new gesture code was needed — Trim only ever taps (never drags), and
the existing tap gesture already worked for that; the two-step "pick
cutting edge, then pick what to trim" logic lives entirely in
screens/CommandPractice.jsx as a tiny bit of state.

NEW FILE: engine/operations/trim.js — line-line intersection, and cutting
a line back to whichever side of that intersection wasn't tapped.

CHANGED
-------
  commands/registry.js — trim now implemented: true
  screens/CommandPractice.jsx — trim's 2-tap select-then-trim flow, the
    two-crossing-lines seed, a status hint above the canvas, and resetting
    the in-progress trim selection on Undo/Redo/Delete/Clear all so it
    never points at a shape that no longer exists in that history state

UNCHANGED: everything else, including PracticeCanvas.jsx (trim needed no
gesture changes at all).

A SAFETY CASE I FOUND WHILE TESTING
---------------------------------------
Trimming a line that's already been trimmed back to the same crossing a
second time would mathematically collapse it to a zero-length line (both
endpoints landing on the same point). Added a guard: if a trim would
leave less than ~1mm of line, it's declined instead of silently reducing
the line to nothing.

VERIFIED BEFORE SENDING
------------------------
  - All 24 files pass a Babel parse against this project's own
    babel.config.js.
  - Verified the intersection + correct-side-removal math directly:
    tapping either side of a crossing line correctly keeps the untapped
    side; non-intersecting lines correctly decline to trim.
  - Ran the full 2-tap flow end-to-end matching CommandPractice's actual
    handleCanvasTap logic: picked a cutting edge, trimmed a crossing
    line, confirmed the remaining segment was exactly right — then found
    (via my own test) the zero-length edge case above, fixed it, and
    re-verified both that the guard declines the degenerate case and
    that ordinary trims still work correctly afterward.

Still "Coming soon": Extend, Fillet, Chamfer, Polar Array, and all of 3D.
