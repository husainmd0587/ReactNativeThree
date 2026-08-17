AutoCad plugin — dimension lines, arrows, editable properties
================================================================

Same drop-in rule: this zip's `AutoCad/` folder replaces yours wholesale.
index.js's export/route names are unchanged.

FIXED
-----
The empty white box is gone. It was a Reanimated "animated text prop on
TextInput" trick used to show the live dimension, and that trick just
didn't reliably render text on your device (Skia's own text rendering
doesn't have that problem, so I moved the label onto the canvas itself —
see below).

NEW: real dimension annotations (AutoCAD/SolidWorks style)
------------------------------------------------------------
Every shape now gets drawn with actual dimension lines, not just a
floating number:

  Line:      extension lines from each endpoint, an offset dimension
             line between them with arrowheads at both ends, and a
             "100.0 mm   30.0°" label on the dimension line.
  Circle:    a radius line from center to edge with an arrowhead, a
             small center mark, and an "R 40.0 mm" label.
  Rectangle: a width dimension below (extension lines + arrows + label)
             and a height dimension to the right, same treatment.

This is drawn directly on the Skia canvas (not a separate floating
element), using the same font-loading pattern as your existing
SolidCad/main.js (`useFont(require('.../assets/fonts/roboto.ttf'), ...)`),
so text only appears once the font is actually loaded — no flash of an
empty box.

NEW: editable Properties (real AutoCAD behavior)
---------------------------------------------------
The Properties panel fields are now live inputs, not read-only text:
  - Line: edit Length or Angle
  - Circle: edit Radius (Diameter shown as read-only, since it's just
    2x radius)
  - Rectangle: edit Width or Height

Editing a field and confirming (return key / tapping away) redraws the
shape on the canvas to match — the fixed point (line's start, circle's
center, rectangle's first corner) stays put, exactly like editing a
dimension in AutoCAD.

NEW FILE: engine/operations/edit.js
  - the three "edited value -> new pixel points" functions
    (applyLineEdit, applyCircleEdit, applyRectangleEdit)

CHANGED: components/PracticeCanvas.jsx, components/PropertiesPanel.jsx,
screens/CommandPractice.jsx

UNCHANGED: index.js, components/CommandList.jsx, screens/CADPracticeHome.jsx,
commands/registry.js, engine/geometry/*, engine/operations/line.js,
circle.js, rectangle.js (measuring logic itself didn't need to change)

VERIFIED BEFORE SENDING
------------------------
  - All 13 files pass a Babel parse against this project's own
    babel.config.js.
  - Ran the actual edit-round-trip math: drew a line, edited its length
    to 150mm (angle stayed exactly what it was), edited angle to 45°
    separately (length stayed exactly what it was), and edited a circle's
    radius to 60mm — all landed on the exact edited value, confirming the
    fixed-point-preserved editing behaves correctly before you ever touch
    the app.

Still "Coming soon": Arc, Polyline, all 2D Modify, all 3D.

One known simplification worth knowing about: the rectangle's height
label sits beside the vertical dimension line but isn't rotated 90° like
AutoCAD would draw it (Skia text rotation needs a transform matrix I
didn't add yet) — happy to add that next if it's worth it to you.
