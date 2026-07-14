import { tokenizeLine } from './engine/tokenizer.js';
import { interpretGCode } from './engine/latheInterpreter.js';
import { isKnownGCode, isKnownMCode, ADDRESS_WORDS } from './gcodeReference.js';

const KNOWN_ADDRESS_LETTERS = new Set(['G', 'M', 'N', ...ADDRESS_WORDS.map((a) => a.code)]);

/**
 * Lint a full G-code program. Returns an array of:
 *   { line: number, severity: 'error'|'warning', message: string }
 * `line` is 1-indexed to match the raw source, or 0 for whole-program issues.
 */
export function lintProgram(gcodeText) {
  const issues = [];
  const lines = gcodeText.split('\n');

  lines.forEach((raw, i) => {
    const lineNum = i + 1;
    const text = raw.trim();
    if (!text) return;

    // Unbalanced parenthesis comment.
    const opens = (text.match(/\(/g) || []).length;
    const closes = (text.match(/\)/g) || []).length;
    if (opens !== closes) {
      issues.push({ line: lineNum, severity: 'error', message: 'Unbalanced parentheses in comment.' });
    }

    const token = tokenizeLine(raw);
    for (const a of token.addresses) {
      if (!KNOWN_ADDRESS_LETTERS.has(a.address)) {
        issues.push({ line: lineNum, severity: 'error', message: `Unknown address letter "${a.address}".` });
        continue;
      }
      if (a.address === 'G' && !isKnownGCode(a.value)) {
        issues.push({ line: lineNum, severity: 'warning', message: `G${a.value} is not recognized by the simulator.` });
      }
      if (a.address === 'M' && !isKnownMCode(a.value)) {
        issues.push({ line: lineNum, severity: 'warning', message: `M${a.value} is not recognized by the simulator.` });
      }
    }
  });

  // Full interpreter pass: catches real semantic problems (bad P/Q references,
  // malformed cycles, etc.) that per-line checks above can't see.
  try {
    const { warnings } = interpretGCode(gcodeText);
    for (const w of warnings) {
      const match = /^Line (\d+):\s*(.*)$/.exec(w);
      if (match) {
        issues.push({ line: Number(match[1]), severity: 'warning', message: match[2] });
      } else {
        issues.push({ line: 0, severity: 'warning', message: w });
      }
    }
  } catch (err) {
    issues.push({ line: 0, severity: 'error', message: `Program failed to interpret: ${err.message}` });
  }

  return issues;
}

/** Group issues by line number for quick gutter lookup: { [line]: issue[] } */
export function groupIssuesByLine(issues) {
  const map = {};
  for (const issue of issues) {
    if (!map[issue.line]) map[issue.line] = [];
    map[issue.line].push(issue);
  }
  return map;
}

export default { lintProgram, groupIssuesByLine };
