export default class Tokenizer {
   tokenize(line) {
    const tokens = {
      lineNumber: null,
      addresses: [],
      comment: null,
      raw: line.trim()
    };

    // Remove leading/trailing whitespace
    let processedLine = line.trim();

    // Extract bracket comments first (inline comments)
    const bracketCommentMatch = processedLine.match(/\(([^)]*)\)/);
    if (bracketCommentMatch) {
      tokens.comment = bracketCommentMatch[1].trim();
      processedLine = processedLine.replace(/\([^)]*\)/g, '').trim();
    }

    // Extract semicolon comments (end-of-line comments)
    const semicolonIndex = processedLine.indexOf(';');
    if (semicolonIndex !== -1) {
      if (!tokens.comment) {
        tokens.comment = processedLine.substring(semicolonIndex + 1).trim();
      }
      processedLine = processedLine.substring(0, semicolonIndex).trim();
    }

    // Skip empty lines
    if (!processedLine) {
      return tokens;
    }

    // Extract line number (N word)
    const lineNumberMatch = processedLine.match(/^N(\d+\.?\d*)/i);
    if (lineNumberMatch) {
      tokens.lineNumber = parseFloat(lineNumberMatch[1]);
      processedLine = processedLine.replace(/^N\d+\.?\d*/i, '').trim();
    }

    // Extract all address-value pairs (G, M, X, Y, Z, I, J, K, R, F, S, T, etc.)
    // Handles both integer and decimal values, including negative numbers
    const addressPattern = /([A-Z])([+-]?\d+\.?\d*)/gi;
    let match;

    while ((match = addressPattern.exec(processedLine)) !== null) {
      const address = match[1].toUpperCase();
      const value = parseFloat(match[2]);

      tokens.addresses.push({
        address: address,
        value: value,
        raw: match[0]
      });
    }

    return tokens;
  }

  tokenizeProgram(gcode) {
    const lines = gcode.split('\n');
    return lines
      .map((line, index) => ({
        ...this.tokenize(line),
        lineIndex: index + 1
      }))
      .filter(token => token.addresses.length > 0 || token.comment !== null);
  }
}