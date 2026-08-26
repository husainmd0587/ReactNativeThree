AutoCad plugin — Command Reference page
==========================================

Same drop-in rule: this zip's `AutoCad/` folder replaces yours wholesale.

WHAT'S NEW
----------
A new 📖 button next to the ⚙️ settings button in CAD Practice Home's
header opens a Command Reference page: every command across all 4
categories (2D Drawing, 2D Modify, 3D Create, 3D Boolean), with its
description and — for every implemented command — the same step-by-step
"how to draw it" instructions already shown on that command's own
practice screen (no new content was written; this reuses the `steps`
field already in commands/registry.js, so the reference page and the
practice screen can never drift out of sync with each other).

Tapping any implemented command jumps straight into practicing it — the
reference page doubles as a launcher, not just a read-only list.
Not-yet-implemented commands (currently just Sweep and Loft — see the
last delivery for why those two specifically aren't done) show the same
"Coming soon" treatment as they do on the home screen, so the reference
page is honest about what's actually usable, not just an aspirational
feature list.

NEW FILE: screens/CommandReferenceScreen.jsx

CHANGED
-------
  index.js — added the CommandReference route, and the header now shows
    two icons (📖 then ⚙️) instead of one

UNCHANGED: everything else, including CADPracticeHome.jsx, CommandList.jsx,
CommandPractice.jsx/2D.jsx/3D.jsx, commands/registry.js (the reference
page reads its existing data, doesn't need any new fields added to it)

VERIFIED BEFORE SENDING
------------------------
  - All 34 files pass a Babel parse against this project's own
    babel.config.js.
  - Actually loaded the real commands/registry.js (not a mock) and
    confirmed every one of the 23 commands renders with the right
    status: 21 implemented commands each carry real step instructions
    (2-3 steps each), and Sweep/Loft correctly come back as "coming
    soon" — exactly what the reference page will show.
