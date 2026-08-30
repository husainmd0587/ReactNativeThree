AutoCad plugin — Arc/Polyline: draggable point placement + Enter button
============================================================================

Same drop-in rule: this zip's `AutoCad/` folder replaces yours wholesale.

WHAT CHANGED
------------
Arc and Polyline used to place every point with a bare tap only — no
rubber-band, no drag. Line/Circle/Rectangle already had this (their
single continuous drag IS the AutoCAD-style "click, rubber-band, click"
motion for a 2-point shape). Now Arc/Polyline get the same feel for each
point after the first:

  - You can still TAP to place a point exactly there — unchanged, still
    the fastest way to place a precise point.
  - You can now also PRESS AND DRAG: a live rubber-band line follows your
    finger from the last confirmed point, and wherever you lift becomes
    the new point. This is the literal AutoCAD motion (click, watch the
    line follow the cursor, click again) adapted to touch, where "watch
    it follow the cursor" only makes sense while a finger is actually
    down (touchscreens can't track a hovering, non-touching finger the
    way a mouse can).
  - Both methods place a point through the exact same code path, so they
    always behave identically — verified by simulating an alternating
    tap/drag/tap sequence and confirming the resulting point list is
    identical either way.

A new "Enter" button now sits directly under the canvas whenever a
draft is in progress:
  - Polyline: "Enter (finish)" — commits the polyline right there,
    exactly like pressing Enter to end a real AutoCAD command. The
    existing long-press-to-finish still works too as a shortcut.
  - Arc: "Cancel" — Arc always auto-completes itself the moment a 3rd
    point is placed (by tap OR drag now), so there's no such thing as
    "finish early" for it; the only meaningful action while a 1- or
    2-point arc draft is sitting there is to cancel it and start over.
    (Calling a mid-arc "finish" would have been a real bug — Arc's
    geometry math needs exactly 3 points and would break on 2 — so this
    button is intentionally type-aware rather than a single generic
    action.)

The old "Finish" button that lived up in the Toolbar row is gone,
replaced by this one next to the canvas — a single clear action in the
place you're actually looking, instead of two different finish controls
in two different places.

HOW THE GESTURE ACTUALLY WORKS NOW
--------------------------------------
Arc/Polyline's gesture composition changed from `Exclusive(longPress,
tap)` to `Exclusive(longPress, pan, tap)`: long-press (finish/cancel)
is tried first, then a real drag (6px+ of movement) takes over as a
point-placing drag, and a quick stationary touch falls through to a
plain tap. Nothing about Line/Circle/Rectangle/Move/Copy/Rotate/Scale/
Mirror/Offset/Array changed, and Trim/Extend/Chamfer/Fillet are
unaffected too — dragging still does nothing on those (a stray drag
there would previously have needed guarding against creating a
malformed shape, which I checked for specifically while making this
change and confirmed is still correctly prevented).

CHANGED
-------
  components/PracticeCanvas.jsx — pan gesture now branches by whether
    the command is a tap-type (arc/polyline) or a drag-type, with the
    tap-type branch driving a new live rubber-band preview; gesture
    composition updated to include pan for tap-types
  screens/CommandPractice2D.jsx — new Enter/Cancel button under the
    canvas; removed the old Toolbar Finish button; fixed
    handleFinishDraft to only ever commit for Polyline (Arc always
    cancels instead of committing an invalid partial shape)

UNCHANGED: everything else, including components/Toolbar.jsx itself
(still supports a Finish button generically, just isn't passed one from
this screen anymore)

VERIFIED BEFORE SENDING
------------------------
  - All 34 files pass a Babel parse against this project's own
    babel.config.js.
  - Confirmed pan stays correctly disabled for Trim/Extend/Chamfer/
    Fillet (checked the exact `.enabled(...)` condition against every
    practice type, not just the ones I was actively changing).
  - Simulated placing polyline points via an alternating tap/drag/tap
    sequence and confirmed the resulting point list is identical to
    what an all-taps sequence would produce.
  - Simulated a mixed tap+drag arc sequence and confirmed it still
    correctly auto-completes at exactly 3 points regardless of which
    method placed each one.
