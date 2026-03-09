/**
 * MFD Parent Bridge — Bridge-safe live event emitter
 *
 * Sends mfd:game-event messages to the parent context when running
 * in an embedded/hybrid iframe. No-ops safely when running standalone
 * (direct window, Node/test, or when no parent frame exists).
 *
 * Contract: frozen at v0.1.0 — do not widen the message shape.
 *
 * Message shape posted to parent:
 * {
 *   type: 'mfd:game-event',
 *   envelope: <frozen envelope from envelope.js>
 * }
 */

/**
 * Detect whether we are running in an embedded context where
 * postMessage to a parent frame is available and meaningful.
 *
 * Returns true only when:
 * - window exists (browser, not Node)
 * - window.parent exists and differs from window (we are in an iframe)
 * - window.parent.postMessage is a function
 */
export function isEmbeddedContext() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.parent !== 'undefined' &&
      window.parent !== window &&
      typeof window.parent.postMessage === 'function'
    );
  } catch (_e) {
    // Cross-origin access to window.parent may throw — treat as not embedded
    return false;
  }
}

/**
 * Create a bridge-safe emitter function.
 *
 * In embedded context: posts { type: 'mfd:game-event', envelope } to parent.
 * In standalone context: returns a no-op that swallows calls silently.
 *
 * Options:
 * - targetOrigin: postMessage target origin (default '*')
 * - forceEnabled: override detection for testing (default undefined)
 */
export function createParentBridge(options) {
  var opts = options || {};
  var targetOrigin = opts.targetOrigin || '*';

  var enabled = typeof opts.forceEnabled === 'boolean'
    ? opts.forceEnabled
    : isEmbeddedContext();

  var _emittedSeqs = new Set();

  function emitToParent(envelope) {
    if (!enabled) return false;
    if (!envelope || typeof envelope !== 'object') return false;

    // Deduplicate: never emit the same seq twice for the same bridge instance
    var seq = envelope.seq;
    if (_emittedSeqs.has(seq)) return false;
    _emittedSeqs.add(seq);

    try {
      window.parent.postMessage({
        type: 'mfd:game-event',
        envelope: envelope,
      }, targetOrigin);
      return true;
    } catch (_e) {
      // postMessage failures should not crash the game
      return false;
    }
  }

  function reset() {
    _emittedSeqs.clear();
  }

  return {
    emitToParent: emitToParent,
    reset: reset,
    get enabled() { return enabled; },
    /** Exposed for testing — number of unique seqs emitted */
    get emittedCount() { return _emittedSeqs.size; },
  };
}
