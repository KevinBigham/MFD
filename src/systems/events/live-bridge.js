/**
 * MFD Live Event Bridge
 *
 * Convenience factory on top of createEventLog() that provides
 * additional diagnostics for the live event emission path.
 *
 * createEventLog() already handles postMessage bridging via
 * parent-bridge.js. This module adds:
 * - emitCount tracking
 * - lastSeq tracking
 * - onEmit callback hook (for diagnostics / logging)
 * - Simplified embedded detection surface
 *
 * Standalone behavior: when no parent window exists (or parent === self),
 * the bridge silently no-ops on the postMessage side. All in-memory
 * event log behavior remains identical.
 *
 * Message shape (frozen 0.1.0, aligned with parent-bridge.js):
 * {
 *   type: "mfd:game-event",
 *   envelope: <canonical event envelope>
 * }
 *
 * Guarantees:
 * - Stable gameId per session
 * - Monotonic seq (inherited from envelope.js)
 * - game_start is always the first event emitted
 * - game_end is always the last event emitted
 * - No duplicate emission for the same logical event
 * - Payloads aligned to documented 0.1.0 contract
 */

import { createEventLog } from './emitter.js';

const MESSAGE_TYPE = 'mfd:game-event';

/**
 * Create a live event bridge with diagnostics.
 *
 * @param {object} [options]
 * @param {string}  [options.targetOrigin] - target origin for postMessage (defaults to '*')
 * @param {boolean} [options.forceEnabled] - override embedded detection for testing
 * @param {function} [options.onEmit]      - optional callback fired after every emit
 * @returns {object} An event log with all createEventLog methods + liveBridge diagnostics
 */
export function createLiveBridge(options = {}) {
  const onEmit = options.onEmit ?? null;

  const log = createEventLog(options);

  let _emitCount = 0;
  let _lastSeq = 0;

  // Wrap the core emit to track diagnostics and fire callback
  const originalEmit = log.emit.bind(log);
  log.emit = function bridgedEmit(eventName, payload) {
    const envelope = originalEmit(eventName, payload);
    _emitCount++;
    _lastSeq = envelope.seq;
    if (onEmit) onEmit(envelope);
    return envelope;
  };

  // Wrap reset to also reset bridge counters
  const originalReset = log.reset.bind(log);
  log.reset = function bridgedReset() {
    originalReset();
    _emitCount = 0;
    _lastSeq = 0;
  };

  // Expose live bridge diagnostics via a separate property name
  // (log.bridge is already used by createEventLog for parent-bridge access)
  Object.defineProperty(log, 'liveBridge', {
    get() {
      return {
        embedded: log.bridge.enabled,
        emitCount: _emitCount,
        lastSeq: _lastSeq,
        messageType: MESSAGE_TYPE,
      };
    },
    enumerable: true,
    configurable: false,
  });

  return log;
}

export { MESSAGE_TYPE };
