import  Tokenizer  from './tokenizer.js';

export default class Parser {
  constructor() {
    this.tokenizer = new Tokenizer();
  }

  /**
   * Parse a single block into AST node
   * @param {Object} tokens - Tokenized line
   * @returns {Object} AST node
   */
  parseBlock(tokens) {
    const block = {
      lineNumber: tokens.lineNumber,
      lineIndex: tokens.lineIndex,
      comment: tokens.comment,
      gCodes: [],
      mCodes: [],
      coordinates: {},
      arcParams: {},
      feedRate: null,
      spindleSpeed: null,
      toolNumber: null,
      dwellTime: null,
      raw: tokens.raw
    };

    // Group addresses by type
    tokens.addresses.forEach(({ address, value }) => {
      switch (address) {
        case 'G':
          block.gCodes.push(value);
          break;
        case 'M':
          block.mCodes.push(value);
          break;
        case 'X':
        case 'Y':
        case 'Z':
        case 'A':
        case 'B':
        case 'C':
        case 'U':
        case 'V':
        case 'W':
          block.coordinates[address] = value;
          break;
        case 'I':
        case 'J':
        case 'K':
        case 'R':
          block.arcParams[address] = value;
          break;
        case 'F':
          block.feedRate = value;
          break;
        case 'S':
          block.spindleSpeed = value;
          break;
        case 'T':
          block.toolNumber = Math.floor(value);
          break;
        case 'P':
          block.dwellTime = value;
          break;
        case 'Q':
          block.arcParams.Q = value; // Peck depth
          break;
        case 'D':
          block.arcParams.D = value; // Tool offset
          break;
        case 'E':
          block.arcParams.E = value; // Threading depth
          break;
        case 'L':
          block.arcParams.L = value; // Loop count
          break;
        default:
          // Store unknown addresses for extensions
          if (!block.extra) block.extra = {};
          block.extra[address] = value;
      }
    });

    return block;
  }

  /**
   * Parse complete G-code program
   * @param {string} gcode - Complete G-code text
   * @returns {Array} Array of AST nodes
   */
  parse(gcode) {
    const tokenizedLines = this.tokenizer.tokenizeProgram(gcode);
    return tokenizedLines.map(tokens => this.parseBlock(tokens));
  }

  /**
   * Validate a parsed block for syntax errors
   * @param {Object} block - Parsed block
   * @returns {Object} Validation result with errors array
   */
  validate(block) {
    const errors = [];

    // Check for conflicting modal groups in same block
    const motionCodes = block.gCodes.filter(g => 
      [0, 1, 2, 3, 33, 70, 71, 72, 73, 74, 75, 76].includes(g)
    );
    if (motionCodes.length > 1) {
      errors.push({
        type: 'MODAL_CONFLICT',
        message: `Multiple motion codes in same block: ${motionCodes.join(', ')}`,
        lineNumber: block.lineNumber
      });
    }

    // Check for arc parameters without arc motion
    const hasArcParams = Object.keys(block.arcParams).some(k => ['I', 'J', 'K', 'R'].includes(k));
    const hasArcMotion = block.gCodes.some(g => [2, 3].includes(g));
    if (hasArcParams && !hasArcMotion) {
      errors.push({
        type: 'INVALID_ARC_PARAMS',
        message: 'Arc parameters (I/J/K/R) without G2/G3',
        lineNumber: block.lineNumber
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}