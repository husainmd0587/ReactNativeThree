# Freehand Turning — split by feature

Drop this whole `freehand-turning/` folder in place of the original single
`.js` screen file, at the same location it used to live (same depth as
before, so the `../../../utils/...` and `../../../assets/...` imports
below still resolve). Then import the screen from `FreehandTurning.js`
instead of the old file, e.g.:

```js
import FreehandTurning from './freehand-turning/FreehandTurning';
```

## Layout

- **constants.js** — every tunable number, TOOLS/MATERIALS tables, the
  cylinder shader source, and derived layout math (canvas size, stock
  geometry). Nothing here is a component.
- **utils.js** — pure functions only: profile carving math
  (`applyTool`, `smooth`, `jitterProfile`), Skia path builders
  (`fillPath`), the `fingerToTip` worklet, and small formatting
  helpers. No React, no state.
- **styles.js** — the single `StyleSheet.create({...})`, unchanged
  from the original, so every screen/component below imports the same
  `styles` object.
- **components/Motor3D.js** — the 3D motor/pulley/belt rig
  (`RotatingPulley`, `VBelt`, `GearBox`, `MotorPreview`) — the frozen
  workshop background behind the 2D canvas, gated on `isPowered`.
- **components/Scene3D.js** — the full 3D lathe view (`PotteryMesh`,
  `Scene3D`) shown when the 3D toggle is on.
- **components/DrawingCanvas.js** — the 2D freehand cutting surface:
  gesture handling, chip particles, tool blade rendering, and the
  `CutHUD` overlay. This is the biggest piece and owns all the
  cutting/spin logic.
- **components/UIComponents.js** — small presentational chrome:
  `PowerToggleButton`, `MagazineToggleButton`, `MagazineCloseButton`.
- **FreehandTurning.js** — the main screen (Home). Owns all top-level
  state (profile, tool, power, rpm, undo/redo history, saved parts,
  magazine animation) and composes every component above.

## Notes

- `isPowered` defaults to `false` and is threaded through
  `DrawingCanvas` (gates the cut gesture + spin) and `MotorPreview`
  (gates the pulley/belt rotation + motor image opacity) from the one
  state value in `FreehandTurning.js` — toggling it syncs everything
  in the same render/frame.
- If your project structure differs from the original, only the
  `../../../` and `../../../../` relative imports in
  `FreehandTurning.js` and the files under `components/` need
  adjusting — everything else is self-contained within this folder.
