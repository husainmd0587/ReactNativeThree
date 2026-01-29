/**
 * CustomGCodeParser - Usage Examples & Testing
 * Single class, no dependencies, pure JavaScript
 */

// ============================================
// BASIC USAGE EXAMPLES
// ============================================

/**
 * Example 1: Simple Parse
 */
function example1_simpleParse() {
  console.log('\n=== Example 1: Simple Parse ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90         ; Metric, absolute
    M3 S1000        ; Spindle on 1000 RPM
    G0 X10 Z5       ; Rapid move
    G1 X20 Z-10 F100 ; Linear move with feed
    M5              ; Spindle off
  `;
  
  const report = parser.parse(gcode);
  
  console.log('Success:', report.success);
  console.log('Commands:', report.commands.length);
  console.log('Errors:', report.errors.length);
  console.log('Stats:', report.stats);
}

/**
 * Example 2: Arc Motion
 */
function example2_arcMotion() {
  console.log('\n=== Example 2: Arc Motion ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    G0 X0 Z0
    G1 X10 Z0 F100
    G2 X20 Z10 R7.071 F100   ; Clockwise arc with radius
    G1 X30 Z10 F100
    G3 X40 Z20 I5 K5 F100    ; Counter-clockwise with offset
    M5
  `;
  
  const report = parser.parse(gcode);
  
  console.log('Commands:');
  report.commands.forEach(cmd => {
    if (cmd.type === 'ARC') {
      console.log(`  Line ${cmd.lineNumber}: ${cmd.description}`);
      console.log(`    From: (${cmd.from.x}, ${cmd.from.z})`);
      console.log(`    To: (${cmd.to.x}, ${cmd.to.z})`);
      console.log(`    Center: (${cmd.center.x.toFixed(2)}, ${cmd.center.z.toFixed(2)})`);
      console.log(`    Direction: ${cmd.clockwise ? 'CW' : 'CCW'}`);
      console.log(`    Distance: ${cmd.distance.toFixed(2)}`);
    }
  });
}

/**
 * Example 3: Multi-Tool Program
 */
function example3_multiTool() {
  console.log('\n=== Example 3: Multi-Tool Program ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    
    ; Tool 1 - Rough turn
    T1 M6
    M3 S1000
    G0 X30 Z10
    G1 X30 Z-20 F100
    G1 X5 Z-20 F100
    M5
    
    ; Tool 2 - Finish turn
    T2 M6
    M3 S1500
    G0 X32 Z10
    G1 X32 Z-20 F50
    G1 X2 Z-20 F50
    M5
    
    M30
  `;
  
  const report = parser.parse(gcode);
  
  console.log('Tool Changes:');
  const toolChanges = report.commands.filter(cmd => cmd.type === 'TOOL_CHANGE');
  toolChanges.forEach(tc => {
    console.log(`  Line ${tc.lineNumber}: Tool ${tc.tool}`);
  });
  
  console.log('\nSpindle Events:');
  const spindle = report.commands.filter(cmd => 
    cmd.type === 'SPINDLE' || cmd.type === 'SPINDLE_OFF'
  );
  spindle.forEach(sp => {
    if (sp.type === 'SPINDLE') {
      console.log(`  Line ${sp.lineNumber}: Spindle ${sp.direction} ${sp.speed} RPM`);
    } else {
      console.log(`  Line ${sp.lineNumber}: Spindle OFF`);
    }
  });
}

/**
 * Example 4: Incremental Mode
 */
function example4_incrementalMode() {
  console.log('\n=== Example 4: Incremental Mode ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G91         ; Metric, incremental
    M3 S1200
    G0 X10 Z5       ; Move +10, +5 from origin
    G1 X5 Z-2 F100  ; Move +5, -2 from current
    G1 X-3 Z3 F100  ; Move -3, +3 from current
    G90             ; Back to absolute
    G0 X0 Z0        ; Go to origin
    M5
  `;
  
  const report = parser.parse(gcode);
  
  console.log('Motion commands:');
  const motions = report.commands.filter(cmd => 
    ['RAPID', 'LINEAR', 'ARC'].includes(cmd.type)
  );
  motions.forEach(m => {
    console.log(`  Line ${m.lineNumber}: ${m.code}`);
    console.log(`    From: (${m.from.x}, ${m.from.z})`);
    console.log(`    To: (${m.to.x}, ${m.to.z})`);
    console.log(`    Distance: ${m.distance.toFixed(2)}`);
  });
  
  console.log('\nFinal position:', report.state.position);
}

/**
 * Example 5: Error Handling
 */
function example5_errorHandling() {
  console.log('\n=== Example 5: Error Handling ===');
  
  const parser = new CustomGCodeParser();
  
  const badGcode = `
    G21 G90
    G0 X0 Z0
    G2 X10 Z10         ; Missing arc center!
    G1 X20 Z0 F100
  `;
  
  const report = parser.parse(badGcode);
  
  console.log('Success:', report.success);
  console.log('Errors:');
  report.errors.forEach(err => {
    console.log(`  ${err}`);
  });
  
  console.log('\nWarnings:');
  report.warnings.forEach(warn => {
    console.log(`  ${warn}`);
  });
}

/**
 * Example 6: Dwell & Offsets
 */
function example6_dwellAndOffsets() {
  console.log('\n=== Example 6: Dwell & Offsets ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    M3 S800
    G0 X0 Z0
    G4 P2             ; Dwell 2 seconds
    G1 X10 Z-5 F100
    G4 P1             ; Dwell 1 second
    G54               ; Work offset 1
    G1 X20 Z-10 F100
    G55               ; Work offset 2
    G1 X30 Z-15 F100
    M5
  `;
  
  const report = parser.parse(gcode);
  
  console.log('All commands:');
  report.commands.forEach(cmd => {
    console.log(`  [${cmd.lineNumber}] ${cmd.code}: ${cmd.description}`);
  });
}

/**
 * Example 7: Complex Turning Profile
 */
function example7_complexProfile() {
  console.log('\n=== Example 7: Complex Turning Profile ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    M3 S1500
    G0 X40 Z10
    
    ; Main profile cut
    G1 X40 Z0 F100      ; Start at OD
    G2 X35 Z-2.5 R2.5   ; Radius blend
    G1 X35 Z-20 F80     ; Main taper
    G2 X30 Z-25 R7.071  ; Fillet
    G1 X10 Z-25 F80
    G1 X5 Z-25 F80
    
    G0 X50 Z10
    M5
    M30
  `;
  
  const report = parser.parse(gcode);
  
  console.log('Parse Report:');
  console.log(parser.toString());
}

/**
 * Example 8: Get Specific Data
 */
function example8_getSpecificData() {
  console.log('\n=== Example 8: Get Specific Data ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    T1 M6
    M3 S1000
    G0 X10 Z0
    G1 X20 Z-10 F100
    T2 M6
    M3 S1500
    G1 X30 Z-15 F80
    M5 M30
  `;
  
  const report = parser.parse(gcode);
  
  // Get toolpath only
  console.log('Toolpath:');
  const toolpath = parser.getToolpath();
  toolpath.forEach(cmd => {
    console.log(`  ${cmd.code}: (${cmd.from.x},${cmd.from.z}) -> (${cmd.to.x},${cmd.to.z})`);
  });
  
  // Get spindle events
  console.log('\nSpindle Events:');
  const spindle = parser.getSpindleEvents();
  spindle.forEach(cmd => {
    console.log(`  ${cmd.description} - ${cmd.speed || ''}`);
  });
  
  // Get tool changes
  console.log('\nTool Changes:');
  const tools = parser.getToolChanges();
  tools.forEach(cmd => {
    console.log(`  Tool ${cmd.tool} at line ${cmd.lineNumber}`);
  });
}

/**
 * Example 9: Program Statistics
 */
function example9_statistics() {
  console.log('\n=== Example 9: Statistics ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    M3 S1200
    G0 X0 Z0
    G1 X10 Z-5 F100
    G2 X20 Z-10 R7.071 F100
    G1 X30 Z-15 F100
    G0 X50 Z10
    M5
  `;
  
  const report = parser.parse(gcode);
  const stats = report.stats;
  
  console.log('Program Statistics:');
  console.log(`  Total Commands: ${stats.totalCommands}`);
  console.log(`  Motion Commands: ${stats.motionCommands}`);
  console.log(`  Total Distance: ${stats.totalDistance.toFixed(2)} units`);
  console.log(`  Rapid Distance: ${stats.rapidDistance.toFixed(2)}`);
  console.log(`  Feed Distance: ${stats.feedDistance.toFixed(2)}`);
  console.log(`  Arc Distance: ${stats.arcDistance.toFixed(2)}`);
  console.log('\nWork Envelope:');
  console.log(`  X: [${stats.bounds.x.min.toFixed(2)}, ${stats.bounds.x.max.toFixed(2)}]`);
  console.log(`  Z: [${stats.bounds.z.min.toFixed(2)}, ${stats.bounds.z.max.toFixed(2)}]`);
  console.log(`  Width: ${stats.bounds.width.toFixed(2)}`);
  console.log(`  Height: ${stats.bounds.height.toFixed(2)}`);
}

/**
 * Example 10: JSON Export
 */
function example10_jsonExport() {
  console.log('\n=== Example 10: JSON Export ===');
  
  const parser = new CustomGCodeParser();
  
  const gcode = `
    G21 G90
    M3 S1000
    G0 X10 Z0
    G1 X20 Z-10 F100
    M5
  `;
  
  const report = parser.parse(gcode);
  
  console.log('JSON Output:');
  const json = parser.toJSON();
  console.log(JSON.stringify(json, null, 2));
}

// ============================================
// TEST SUITE
// ============================================

function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  CustomGCodeParser - Examples & Tests     ║');
  console.log('╚════════════════════════════════════════════╝');
  
  example1_simpleParse();
  example2_arcMotion();
  example3_multiTool();
  example4_incrementalMode();
  example5_errorHandling();
  example6_dwellAndOffsets();
  example7_complexProfile();
  example8_getSpecificData();
  example9_statistics();
  example10_jsonExport();
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║         All Examples Complete!            ║');
  console.log('╚════════════════════════════════════════════╝\n');
}

// ============================================
// QUICK REFERENCE
// ============================================

function printQuickReference() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     CustomGCodeParser - Quick Reference              ║
╚═══════════════════════════════════════════════════════╝

BASIC USAGE:
  const parser = new CustomGCodeParser();
  const report = parser.parse(gcodeString);

PARSE SINGLE LINE:
  parser.reset();
  parser.parseLine('G0 X10 Z5');

GET DATA:
  parser.getToolpath()           // Motion commands only
  parser.getSpindleEvents()      // M3/M4/M5
  parser.getToolChanges()        // M6 commands
  parser.getCommandsByType(type) // Filter by type
  parser.toJSON()                // Export as JSON
  parser.toString()              // Formatted report

COMMAND TYPES:
  RAPID, LINEAR, ARC             // Motion
  SPINDLE, SPINDLE_OFF           // Spindle control
  TOOL_CHANGE                    // M6
  COOLANT, COOLANT_OFF           // M7/M8/M9
  PROGRAM_STOP, PROGRAM_END      // M0, M2, M30
  DWELL, HOME                    // G4, G28
  SET_OFFSET, TOOL_RADIUS_*      // Work offsets, comp

SUPPORTED G-CODES:
  G0  - Rapid          G1  - Linear       G2  - Arc CW
  G3  - Arc CCW        G4  - Dwell        G18 - XZ Plane
  G20 - Inches         G21 - Millimeters  G28/30 - Home
  G40 - Radius Off     G41/42 - Radius Left/Right
  G54/55 - Work Offset
  G90 - Absolute       G91 - Incremental

SUPPORTED M-CODES:
  M0/M1 - Stop         M2/M30 - End       M3/M4 - Spindle
  M5 - Spindle Off     M6 - Tool Change   M7/M8/M9 - Coolant
  M19 - Spindle Orient

STATE PROPERTIES:
  position             // { x: 0, z: 0 }
  feedRate             // Current F value
  units                // 'G20' or 'G21'
  distanceMode         // 'G90' or 'G91'
  motionMode           // 'G0', 'G1', 'G2', 'G3'
  plane                // 'G18', 'G19', 'G20'
  spindle              // { on, speed, direction }
  coolant              // { on, type }
  tool                 // Tool number

STATISTICS:
  stats.totalDistance      // Total movement distance
  stats.rapidDistance      // G0 distance
  stats.feedDistance       // G1 distance
  stats.arcDistance        // G2/G3 distance
  stats.bounds.x/z         // Work envelope
  stats.motionCommands     // Count of motion commands

REPORT OBJECT:
  success              // Boolean
  commands             // Array of commands
  errors               // Array of error messages
  warnings             // Array of warnings
  state                // Current machine state
  stats                // Statistics object

═══════════════════════════════════════════════════════
  `);
}

// ============================================
// RUN TESTS
// ============================================

// Uncomment to run:
// runAllExamples();
// printQuickReference();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    example1_simpleParse,
    example2_arcMotion,
    example3_multiTool,
    example4_incrementalMode,
    example5_errorHandling,
    example6_dwellAndOffsets,
    example7_complexProfile,
    example8_getSpecificData,
    example9_statistics,
    example10_jsonExport,
    runAllExamples,
    printQuickReference
  };
}