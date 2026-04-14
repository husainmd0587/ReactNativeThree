export const AllGcodeMcode = [

  // ===========================
  // 🔵 G-CODES
  // ===========================

  // 🔵 MOTION
  {
    name: 'G0',
    description: 'Rapid positioning. Moves the tool to a specified location at maximum speed.',
    example: 'G0 X10 Y20 Z5',
    category: 'Motion',
  },
  {
    name: 'G1',
    description: 'Linear interpolation. Moves tool in a straight line with feed rate.',
    example: 'G1 X50 Y25 F100',
    category: 'Motion',
  },
  {
    name: 'G2',
    description: 'Clockwise circular interpolation.',
    example: 'G2 X50 Y50 I10 J0',
    category: 'Motion',
  },
  {
    name: 'G3',
    description: 'Counter-clockwise circular interpolation.',
    example: 'G3 X0 Y0 I-10 J0',
    category: 'Motion',
  },
  // 🔵 FEED & DWELL
  {
    name: 'G4',
    description: 'Dwell (pause for a specified time).',
    example: 'G4 P2',
    category: 'Control',
  },

  // 🔵 PLANE SELECTION
  {
    name: 'G17',
    description: 'Select XY plane (milling default).',
    example: 'G17',
    category: 'Plane',
  },
  {
    name: 'G18',
    description: 'Select XZ plane (turning default).',
    example: 'G18',
    category: 'Plane',
  },
  {
    name: 'G19',
    description: 'Select YZ plane.',
    example: 'G19',
    category: 'Plane',
  },

  // 🔵 UNITS
  {
    name: 'G20',
    description: 'Set units to inches.',
    example: 'G20',
    category: 'Units',
  },
  {
    name: 'G21',
    description: 'Set units to millimeters.',
    example: 'G21',
    category: 'Units',
  },

  // 🔵 REFERENCE / HOME
  {
    name: 'G28',
    description: 'Return to machine home (reference point) via intermediate point.',
    example: 'G28 Z0',
    category: 'Reference',
  },
  {
    name: 'G29',
    description: 'Return from reference point to intermediate position.',
    example: 'G29 X50 Y30',
    category: 'Reference',
  },
  {
    name: 'G30',
    description: 'Return to 2nd, 3rd, or 4th reference point.',
    example: 'G30 P2 Z0',
    category: 'Reference',
  },
 

  // 🔵 COMPENSATION
  {
    name: 'G40',
    description: 'Cancel cutter/tool nose radius compensation.',
    example: 'G40',
    category: 'Compensation',
  },
  {
    name: 'G41',
    description: 'Tool radius compensation LEFT (cutter left of workpiece).',
    example: 'G41 D1',
    category: 'Compensation',
  },
  {
    name: 'G42',
    description: 'Tool radius compensation RIGHT (cutter right of workpiece).',
    example: 'G42 D1',
    category: 'Compensation',
  },
  {
    name: 'G43',
    description: 'Tool length offset compensation (positive direction).',
    example: 'G43 H1 Z5',
    category: 'Compensation',
  },
  {
    name: 'G44',
    description: 'Tool length offset compensation (negative direction).',
    example: 'G44 H1 Z5',
    category: 'Compensation',
  },

  {
    name: 'G49',
    description: 'Cancel tool length offset compensation.',
    example: 'G49',
    category: 'Compensation',
  },

  // 🔵 SCALING & MIRRORING
  {
    name: 'G50',
    description: 'Set maximum spindle speed (turning) OR cancel scaling (milling).',
    example: 'G50 S3000',
    category: 'Spindle',
  },
 
  // 🔵 COORDINATE SYSTEM
  {
    name: 'G52',
    description: 'Local coordinate system shift.',
    example: 'G52 X10 Y10',
    category: 'Coordinate',
  },
  {
    name: 'G53',
    description: 'Move in machine coordinate system (absolute, bypasses offsets).',
    example: 'G53 Z0',
    category: 'Coordinate',
  },
  {
    name: 'G54',
    description: 'Work coordinate system 1 (WCS 1).',
    example: 'G54',
    category: 'Coordinate',
  },
  {
    name: 'G55',
    description: 'Work coordinate system 2 (WCS 2).',
    example: 'G55',
    category: 'Coordinate',
  },
  {
    name: 'G56',
    description: 'Work coordinate system 3 (WCS 3).',
    example: 'G56',
    category: 'Coordinate',
  },
  {
    name: 'G57',
    description: 'Work coordinate system 4 (WCS 4).',
    example: 'G57',
    category: 'Coordinate',
  },
  {
    name: 'G58',
    description: 'Work coordinate system 5 (WCS 5).',
    example: 'G58',
    category: 'Coordinate',
  },
  {
    name: 'G59',
    description: 'Work coordinate system 6 (WCS 6).',
    example: 'G59',
    category: 'Coordinate',
  },
  {
    name: 'G92',
    description: 'Set coordinate system origin / spindle speed clamp (turning).',
    example: 'G92 X0 Y0 Z0',
    category: 'Coordinate',
  },
  {
    name: 'G92.1',
    description: 'Reset G92 coordinate system offsets to zero.',
    example: 'G92.1',
    category: 'Coordinate',
  },

  // 🔵 CANNED CYCLES — MILLING
  {
    name: 'G73',
    description: 'High-speed peck drilling cycle (chip break, partial retract).',
    example: 'G73 X0 Y0 Z-30 R2 Q5 F80',
    category: 'Canned Cycle',
  },
  {
    name: 'G74',
    description: 'Left-hand tapping cycle (counter-clockwise tap).',
    example: 'G74 X0 Y0 Z-20 R2 F500',
    category: 'Canned Cycle',
  },
  {
    name: 'G76',
    description: 'Fine boring cycle (milling) OR threading cycle (turning).',
    example: 'G76 X0 Y0 Z-20 R2 Q0.1 F0.5',
    category: 'Canned Cycle',
  },
  {
    name: 'G80',
    description: 'Cancel canned cycle.',
    example: 'G80',
    category: 'Canned Cycle',
  },
  {
    name: 'G81',
    description: 'Drilling cycle (drill and retract).',
    example: 'G81 X0 Y0 Z-25 R2 F100',
    category: 'Canned Cycle',
  },
  {
    name: 'G82',
    description: 'Drilling cycle with dwell at bottom.',
    example: 'G82 X0 Y0 Z-25 R2 P500 F100',
    category: 'Canned Cycle',
  },
  {
    name: 'G83',
    description: 'Peck drilling cycle (full retract between pecks).',
    example: 'G83 X0 Y0 Z-50 R2 Q8 F80',
    category: 'Canned Cycle',
  },
  {
    name: 'G84',
    description: 'Right-hand tapping cycle.',
    example: 'G84 X0 Y0 Z-20 R2 F500',
    category: 'Canned Cycle',
  },
  {
    name: 'G85',
    description: 'Boring cycle (feed in, feed out).',
    example: 'G85 X0 Y0 Z-20 R2 F60',
    category: 'Canned Cycle',
  },
  {
    name: 'G86',
    description: 'Boring cycle (feed in, spindle stop, rapid out).',
    example: 'G86 X0 Y0 Z-20 R2 F60',
    category: 'Canned Cycle',
  },
  {
    name: 'G87',
    description: 'Back boring cycle.',
    example: 'G87 X0 Y0 Z-20 R-25 Q2 F60',
    category: 'Canned Cycle',
  },
  {
    name: 'G88',
    description: 'Boring cycle (feed in, dwell, manual retract).',
    example: 'G88 X0 Y0 Z-20 R2 P1000 F60',
    category: 'Canned Cycle',
  },
  {
    name: 'G89',
    description: 'Boring cycle (feed in, dwell, feed out).',
    example: 'G89 X0 Y0 Z-20 R2 P500 F60',
    category: 'Canned Cycle',
  },

  // 🔵 CANNED CYCLES — TURNING
  {
    name: 'G70',
    description: 'Finishing cycle (turning). Runs finishing pass after roughing.',
    example: 'G70 P10 Q20',
    category: 'Canned Cycle',
  },
  {
    name: 'G71',
    description: 'Outer/inner diameter roughing cycle (turning).',
    example: 'G71 U1.5 R0.5 P10 Q20 X0.3 Z0.1 F0.2',
    category: 'Canned Cycle',
  },
  {
    name: 'G72',
    description: 'Face roughing cycle (turning).',
    example: 'G72 W1.0 R0.5 P10 Q20 X0.2 Z0.1 F0.2',
    category: 'Canned Cycle',
  },
  {
    name: 'G75',
    description: 'Grooving / peck drilling cycle on OD or face (turning).',
    example: 'G75 R0.5 X20 Z-10 P3000 Q3000 F0.1',
    category: 'Canned Cycle',
  },

  // 🔵 THREADING — TURNING
  {
    name: 'G32',
    description: 'Thread cutting (single pass, turning).',
    example: 'G32 Z-30 F1.5',
    category: 'Threading',
  },
  {
    name: 'G33',
    description: 'Thread cutting / constant lead threading (controller-dependent).',
    example: 'G33 Z-40 K1.5',
    category: 'Threading',
  },
  {
    name: 'G76',
    description: 'Multi-pass threading cycle (turning). Fully automated thread cutting.',
    example: 'G76 P011060 Q100 R50 X18.9 Z-30 P1100 Q400 F1.5',
    category: 'Threading',
  },

  // 🔵 FEED RATE MODE
  {
    name: 'G93',
    description: 'Inverse time feed rate mode.',
    example: 'G93',
    category: 'Feed',
  },
  {
    name: 'G94',
    description: 'Feed rate per minute mode (mm/min or in/min).',
    example: 'G94',
    category: 'Feed',
  },
  {
    name: 'G95',
    description: 'Feed rate per revolution mode (mm/rev or in/rev).',
    example: 'G95',
    category: 'Feed',
  },
  {
    name: 'G96',
    description: 'Constant surface speed (CSS) mode. Controls spindle by diameter.',
    example: 'G96 S200',
    category: 'Spindle',
  },
  {
    name: 'G97',
    description: 'Constant spindle speed (RPM) mode. Cancels CSS.',
    example: 'G97 S1500',
    category: 'Spindle',
  },
  {
    name: 'G98',
    description: 'Canned cycle retract to initial point (milling).',
    example: 'G98',
    category: 'Canned Cycle',
  },
  {
    name: 'G99',
    description: 'Canned cycle retract to R-plane (milling) OR feed per revolution (turning).',
    example: 'G99',
    category: 'Canned Cycle',
  },

  // 🔵 POSITIONING
  {
    name: 'G90',
    description: 'Absolute positioning mode.',
    example: 'G90',
    category: 'Positioning',
  },
  {
    name: 'G91',
    description: 'Incremental positioning mode.',
    example: 'G91',
    category: 'Positioning',
  },

  // 🔵 SUBPROGRAM / MACRO
  {
    name: 'G65',
    description: 'Call macro / custom macro B call.',
    example: 'G65 P9001 A10 B20',
    category: 'Macro',
  },
  {
    name: 'G66',
    description: 'Modal macro call (called on every block).',
    example: 'G66 P9010 A5',
    category: 'Macro',
  },
  {
    name: 'G67',
    description: 'Cancel modal macro call.',
    example: 'G67',
    category: 'Macro',
  },

  // 🔵 ROTATION
  {
    name: 'G68',
    description: 'Coordinate system rotation ON.',
    example: 'G68 X0 Y0 R45',
    category: 'Transform',
  },
  {
    name: 'G69',
    description: 'Coordinate system rotation OFF.',
    example: 'G69',
    category: 'Transform',
  },

  // ===========================
  // 🔴 M-CODES
  // ===========================

  // 🔴 PROGRAM CONTROL
  {
    name: 'M0',
    description: 'Program stop (pauses execution, operator must resume).',
    example: 'M0',
    category: 'Misc',
  },
  {
    name: 'M1',
    description: 'Optional stop (pauses only if optional stop switch is ON).',
    example: 'M1',
    category: 'Misc',
  },
  {
    name: 'M2',
    description: 'End of program.',
    example: 'M2',
    category: 'End',
  },
  {
    name: 'M30',
    description: 'End program and reset to start.',
    example: 'M30',
    category: 'End',
  },
  {
    name: 'M47',
    description: 'Repeat program from start (loop, controller-dependent).',
    example: 'M47',
    category: 'End',
  },
  {
    name: 'M99',
    description: 'Return from subprogram OR loop main program.',
    example: 'M99',
    category: 'End',
  },
  {
    name: 'M98',
    description: 'Call subprogram.',
    example: 'M98 P1001 L3',
    category: 'Misc',
  },

  // 🔴 SPINDLE
  {
    name: 'M3',
    description: 'Spindle ON — clockwise rotation (CW).',
    example: 'M3 S1000',
    category: 'Spindle',
  },
  {
    name: 'M4',
    description: 'Spindle ON — counter-clockwise rotation (CCW).',
    example: 'M4 S800',
    category: 'Spindle',
  },
  {
    name: 'M5',
    description: 'Spindle OFF.',
    example: 'M5',
    category: 'Spindle',
  },
  {
    name: 'M19',
    description: 'Spindle orientation (orient spindle to a specific angle).',
    example: 'M19',
    category: 'Spindle',
  },

  // 🔴 COOLANT
  {
    name: 'M7',
    description: 'Mist coolant ON.',
    example: 'M7',
    category: 'Coolant',
  },
  {
    name: 'M8',
    description: 'Flood coolant ON.',
    example: 'M8',
    category: 'Coolant',
  },
  {
    name: 'M9',
    description: 'All coolant OFF.',
    example: 'M9',
    category: 'Coolant',
  },
  {
    name: 'M88',
    description: 'High-pressure coolant ON (through-spindle, controller-dependent).',
    example: 'M88',
    category: 'Coolant',
  },
  {
    name: 'M89',
    description: 'High-pressure coolant OFF.',
    example: 'M89',
    category: 'Coolant',
  },

  // 🔴 TOOL CHANGE
  {
    name: 'M6',
    description: 'Tool change. Executes tool change to T-word specified tool.',
    example: 'T4 M6',
    category: 'Tool',
  },
  {
    name: 'M61',
    description: 'Set current tool (without physical change, controller-dependent).',
    example: 'M61 Q3',
    category: 'Tool',
  },

  // 🔴 CHUCK & TAILSTOCK (TURNING)
  {
    name: 'M10',
    description: 'Chuck OPEN (turning).',
    example: 'M10',
    category: 'Turning',
  },
  {
    name: 'M11',
    description: 'Chuck CLOSE (turning).',
    example: 'M11',
    category: 'Turning',
  },
  {
    name: 'M78',
    description: 'Tailstock advance (controller-dependent).',
    example: 'M78',
    category: 'Turning',
  },
  {
    name: 'M79',
    description: 'Tailstock retract (controller-dependent).',
    example: 'M79',
    category: 'Turning',
  },

  // 🔴 AXIS CLAMP / BRAKE
  {
    name: 'M12',
    description: 'Quill / axis clamp ON.',
    example: 'M12',
    category: 'Misc',
  },
  {
    name: 'M13',
    description: 'Quill / axis clamp OFF.',
    example: 'M13',
    category: 'Misc',
  },

  // 🔴 CHIP CONVEYOR
  {
    name: 'M31',
    description: 'Chip conveyor forward ON.',
    example: 'M31',
    category: 'Misc',
  },
  {
    name: 'M33',
    description: 'Chip conveyor stop.',
    example: 'M33',
    category: 'Misc',
  },

  // 🔴 PALLET / FIXTURE
  {
    name: 'M60',
    description: 'Pallet change (automatic pallet changer, APC).',
    example: 'M60',
    category: 'Misc',
  },

  // 🔴 FEED / SPEED OVERRIDE
  {
    name: 'M48',
    description: 'Enable feed and spindle speed override.',
    example: 'M48',
    category: 'Misc',
  },
  {
    name: 'M49',
    description: 'Disable feed and spindle speed override.',
    example: 'M49',
    category: 'Misc',
  },

  // 🔴 PROBE / TOOL MEASUREMENT
  {
    name: 'M75',
    description: 'Set gauge point A (probing, controller-dependent).',
    example: 'M75',
    category: 'Misc',
  },
  {
    name: 'M76',
    description: 'Set gauge point B (probing, controller-dependent).',
    example: 'M76',
    category: 'Misc',
  },

];