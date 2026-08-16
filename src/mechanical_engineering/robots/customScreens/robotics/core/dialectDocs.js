/**
 * dialectDocs.js
 *
 * Structured documentation for each supported program language, shown
 * on LanguageReferenceScreen. Deliberately kept in lockstep with what
 * the parsers in engine/dialects/ actually accept - this is meant to
 * be a trustworthy reference for what will and won't parse, not
 * marketing copy. If a dialect parser's supported syntax changes,
 * update the matching entry here.
 */

export const DIALECT_DOCS = {
  simple: {
    id: 'simple',
    label: 'Simple',
    subtitle: 'The built-in teaching language',
    description:
      'A small custom language designed for this simulator specifically - not tied to any real robot brand. Good starting point before moving to a real industrial dialect.',
    statements: [
      {
        syntax: 'HOME',
        description: 'Moves every joint to 0°.',
        example: 'HOME',
      },
      {
        syntax: 'MOVEJ J1=<deg> J2=<deg> ... SPEED=<deg/s>',
        description:
          'Joint move. List only the joints you want to move - others hold their current position. SPEED is optional (defaults to 60°/s).',
        example: 'MOVEJ J1=-41 J2=-76 J3=-136 J4=96 SPEED=60',
      },
      {
        syntax: 'WAIT <seconds>',
        description: 'Pauses program execution for the given number of seconds.',
        example: 'WAIT 0.5',
      },
      {
        syntax: 'GRIP OPEN | GRIP CLOSE',
        description:
          'Opens or closes the gripper. Closing only picks up the box if the gripper is actually near it.',
        example: 'GRIP CLOSE',
      },
    ],
  },

  fanuc: {
    id: 'fanuc',
    label: 'Fanuc (TP)',
    subtitle: 'Teach-pendant style, subset',
    description:
      'Real Fanuc programs move to position registers taught on the physical pendant, not inline coordinates - this simulator models that: define a register\u2019s joint values first, then reference it in a motion line. Full TP also has skip conditions, offsets, and multiple motion types (J/L/C); only joint moves are supported here.',
    statements: [
      {
        syntax: 'PR[n] = {J1 <deg>, J2 <deg>, ...}',
        description: 'Defines a position register\u2019s joint values. Must appear before it\u2019s referenced.',
        example: 'PR[1] = {J1 -41, J2 -76, J3 -136, J4 96}',
      },
      {
        syntax: 'J HOME 100% FINE',
        description: 'Moves every joint to 0°.',
        example: 'J HOME 100% FINE',
      },
      {
        syntax: 'J PR[n] <speed>% FINE',
        description: 'Moves to the joint values stored in position register n. The speed percentage maps directly to this simulator\u2019s SPEED value.',
        example: 'J PR[1] 100% FINE',
      },
      {
        syntax: 'WAIT <seconds>(sec)',
        description: 'Pauses for the given number of seconds.',
        example: 'WAIT 0.5(sec)',
      },
      {
        syntax: 'DOUT[n]=ON | DOUT[n]=OFF',
        description:
          'Closes (ON) or opens (OFF) the gripper. The output number isn\u2019t validated against anything - it\u2019s treated as whichever output the gripper is wired to.',
        example: 'DOUT[1]=ON',
      },
    ],
  },

  abb: {
    id: 'abb',
    label: 'ABB (RAPID)',
    subtitle: 'RAPID syntax, subset',
    description:
      'Real RAPID is a full language (procedures, variables, IF/FOR, multiple motion types, work objects) - this covers only joint motion, waits, and a digital-output convention for the gripper.',
    statements: [
      {
        syntax: 'MoveAbsJ [[j1,j2,j3,j4],[0,0,0,0]], vN, fine, tool0;',
        description:
          'Joint move to the given values. The second array (axis configuration) is accepted but ignored - this simulator doesn\u2019t model axis turns. vN sets speed (e.g. v100).',
        example: 'MoveAbsJ [[-41,-76,-136,96],[0,0,0,0]], v100, fine, tool0;',
      },
      {
        syntax: 'WaitTime <seconds>;',
        description: 'Pauses for the given number of seconds.',
        example: 'WaitTime 0.5;',
      },
      {
        syntax: 'Set <signal>; | Reset <signal>;',
        description:
          'Closes (Set) or opens (Reset) the gripper. The signal name isn\u2019t validated - any name works.',
        example: 'Set doGripper;',
      },
      {
        syntax: 'Home;',
        description:
          'Not standard RAPID, but ABB programs conventionally define a PROC Home() that does exactly this - treated as a direct call here for teaching purposes.',
        example: 'Home;',
      },
    ],
  },

  kuka: {
    id: 'kuka',
    label: 'KUKA (KRL)',
    subtitle: 'KRL syntax, subset',
    description:
      'Real KRL is a full Pascal-like language (DEF/END, variables, LOOP, IF, tool/base frames, multiple motion types) - this covers only PTP joint motion, waits, and the $OUT digital-output convention for the gripper.',
    statements: [
      {
        syntax: 'PTP HOME',
        description: 'Moves every joint to 0°.',
        example: 'PTP HOME',
      },
      {
        syntax: 'PTP {A1 <deg>, A2 <deg>, ...} VEL=<n>',
        description: 'Joint move using KRL axis names (A1, A2, ...). VEL is optional (defaults to 60).',
        example: 'PTP {A1 -41, A2 -76, A3 -136, A4 96} VEL=60',
      },
      {
        syntax: 'WAIT SEC <seconds>',
        description: 'Pauses for the given number of seconds.',
        example: 'WAIT SEC 0.5',
      },
      {
        syntax: '$OUT[n] = TRUE | $OUT[n] = FALSE',
        description:
          'Closes (TRUE) or opens (FALSE) the gripper. As with Fanuc\u2019s DOUT, the output number is assumed to be whichever one the gripper is wired to.',
        example: '$OUT[1] = TRUE',
      },
    ],
  },
};

export function getDialectDocs(dialectId) {
  return DIALECT_DOCS[dialectId] || DIALECT_DOCS.simple;
}
