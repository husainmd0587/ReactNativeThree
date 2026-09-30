/**
 * Command runner.
 *
 * Owns the in-flight command session and turns typed or tapped input into
 * document operations. It is a plain function of state, so the UI can hold it
 * in a ref or a reducer and a test can drive it a step at a time.
 *
 *   const s = startCommand('LINE', ctx).session;
 *   const s2 = feedCommand(s, {x: 0, y: 0}, ctx);   // asks for the next point
 *   const r  = feedCommand(s2, {x: 50, y: 0}, ctx); // r.ops holds the line
 *
 * All the runner does is record an answer under the key the prompt declared
 * and hand the accumulated answers to the command. Deciding what an answer
 * *means* belongs to the command, which is why the runner has no switch on
 * command names.
 */

import {PROMPT, findCommand} from './commands';
import {parseAngle, parseDistance, parseNumber, parsePoint} from './parse';

export const newSession = (command, answers = {}) => ({
  command,
  answers,
  prompt: command.prompts[0] ?? {kind: PROMPT.NONE, key: null, text: ''},
  active: true,
});

/**
 * Begin a command, or report that the name is unknown.
 *
 * A command that asks nothing (ZOOMEXTENTS, SELECTALL, LIST) runs its step
 * straight away, so the caller never has to invent an input to get an answer.
 */
export function startCommand(name, ctx, answers = {}) {
  const command = findCommand(name);
  if (!command)
    return {session: null, ops: [], message: `Unknown command: ${name}`};
  const session = newSession(command, answers);
  if (!command.prompts.length) return feedCommand(session, null, ctx);
  return {session, ops: [], message: null};
}

export const isActive = s => Boolean(s?.active);
export const currentPrompt = s => s?.prompt ?? {kind: PROMPT.NONE, text: ''};

/**
 * Feed one input to the running command.
 *
 * `answers` holds only what previous steps confirmed. The runner deliberately
 * does *not* record the incoming input before calling the step: a step has to
 * be able to tell "this is my first answer" from "I am already waiting for
 * the next one", and pre-recording makes those two cases identical. Each step
 * therefore reads `input`, decides what it means, and assigns it itself.
 */
export function feedCommand(session, input, ctx) {
  if (!session?.active) return {session: null, ops: [], message: null};

  const answers = session.answers;

  let result;
  try {
    result = session.command.step({answers, input, ctx, session});
  } catch (err) {
    // A broken command should end the session, not wedge the command line
    // with no way back to a prompt.
    return {
      session: null,
      ops: [],
      message: `Command failed: ${err?.message ?? err}`,
    };
  }

  if (result?.done) {
    const ops = result.ops ?? [];
    if (result.repeat) {
      // Stay in the command for another pass, as AutoCAD does for LINE,
      // PLINE and the dimension commands. `nextAnswers` lets a chained
      // command carry its last point forward.
      return {
        session: newSession(session.command, result.nextAnswers ?? {}),
        ops,
        message: result.message ?? null,
        repeat: true,
      };
    }
    return {session: null, ops, message: result.message ?? null};
  }

  if (result?.prompt) {
    // `nextAnswers` is how a step carries state forward while staying in the
    // command, which is what PLINE's Undo needs.
    return {
      session: {
        ...session,
        answers: result.nextAnswers
          ? {...answers, ...result.nextAnswers}
          : answers,
        prompt: result.prompt,
      },
      ops: [],
      message: result.message ?? null,
    };
  }

  return {
    session: null,
    ops: [],
    message: result?.message ?? 'Command cancelled.',
  };
}

/**
 * Interpret raw typed text as whatever the current prompt wants.
 *
 * This is where AutoCAD's input shorthands are resolved, so no command ever
 * sees a string: `@50,0` and `100<45` both arrive as points, a bare number
 * arrives as a distance, and "ALL" arrives as a selection.
 */
export function parseInput(text, prompt, ctx = {}) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  if (prompt.kind === PROMPT.TEXT) return raw;
  if (prompt.kind === PROMPT.CONFIRM) return /^Y(ES)?$/i.test(raw);
  if (prompt.kind === PROMPT.SELECTION) {
    const upper = raw.toUpperCase();
    if (upper === 'ALL') return ctx.allIds ?? [];
    // W and C start a window or crossing drag on the canvas.
    if (upper === 'W' || upper === 'C') return {dragMode: upper.toLowerCase()};
    return null;
  }
  if (prompt.kind === PROMPT.POINT) {
    const p = parsePoint(raw, ctx.from);
    if (p) return p;
    // A bare number is a distance from the previous point, along the current
    // rubber-band direction. Resolving it here keeps every command working
    // with plain absolute points.
    const n = parseNumber(raw);
    if (n == null) return null;
    const base = ctx.from;
    if (!base) return null;
    const dir = ctx.dir ?? {x: 1, y: 0};
    const len = Math.hypot(dir.x, dir.y) || 1;
    return {x: base.x + (dir.x / len) * n, y: base.y + (dir.y / len) * n};
  }
  if (prompt.kind === PROMPT.DISTANCE || prompt.kind === PROMPT.RADIUS)
    return parseDistance(raw);
  if (prompt.kind === PROMPT.ANGLE) return parseAngle(raw);
  if (prompt.kind === PROMPT.NUMBER) return parseNumber(raw);
  return null;
}

/** Cancel whatever is running. */
export const cancelCommand = () => ({session: null, ops: [], message: null});
