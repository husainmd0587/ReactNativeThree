/**
 * tokenizer.js
 * Splits a raw G-code program into per-line tokens: { N, comment, addresses[] }
 * addresses: [{ address:'G', value:1 }, { address:'X', value:12.5 }, ...]
 *
 * Kept deliberately dumb (no modal interpretation here) - that's latheInterpreter's job.
 */

export function tokenizeLine(line) {
  const token = { lineNumber: null, comment: null, addresses: [], raw: line.trim() };

  let text = line.trim();
  if (!text) return token;

  // Bracket comments (...)
  const bracket = text.match(/\(([^)]*)\)/);
  if (bracket) {
    token.comment = bracket[1].trim();
    text = text.replace(/\([^)]*\)/g, '').trim();
  }

  // Semicolon / percent end-of-line comments
  const semi = text.indexOf(';');
  if (semi !== -1) {
    if (!token.comment) token.comment = text.slice(semi + 1).trim();
    text = text.slice(0, semi).trim();
  }

  if (!text || text === '%') return token;

  // Line number
  const nMatch = text.match(/^N(\d+)/i);
  if (nMatch) {
    token.lineNumber = parseInt(nMatch[1], 10);
    text = text.replace(/^N\d+/i, '').trim();
  }

  // Address-value pairs, e.g. G1 X12.5 Z-3.2 F0.2
  const re = /([A-Z])\s*([+-]?\d*\.?\d+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    token.addresses.push({ address: m[1].toUpperCase(), value: parseFloat(m[2]) });
  }

  return token;
}

export function tokenizeProgram(gcodeText) {
  return gcodeText
    .split('\n')
    .map((line, i) => ({ ...tokenizeLine(line), lineIndex: i + 1 }))
    .filter((t) => t.addresses.length > 0 || t.comment !== null);
}

export default { tokenizeLine, tokenizeProgram };
