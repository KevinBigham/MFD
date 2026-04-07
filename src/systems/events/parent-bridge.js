/**
 * MFD Parent Bridge — Bridge-safe live event emitter
 *
 * Sends mfd:game-event messages to the parent context when running
 * in an embedded/hybrid iframe. No-ops safely when running standalone
 * (direct window, Node/test, or when no parent frame exists).
 *
 * Contract: frozen at v0.1.0 — do not widen the message shape.
 *
 * Message shapes posted to parent:
 *
 * Per-event (every emit):
 * {
 *   type: 'mfd:game-event',
 *   envelope: <frozen envelope from envelope.js>
 * }
 *
 * Consumer packet (once at game_end):
 * {
 *   type: 'mfd:consumer-packet',
 *   packet: {
 *     schemaVersion: '0.1.0',
 *     context: <game context>,
 *     envelope: <game_end envelope>,
 *     weeklyHook: <buildWeeklyHook output>,
 *     postgameAutopsy: <buildPostgameAutopsy output>
 *   }
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

  var _consumerPacketSent = false;

  /**
   * Post a consumer packet to the parent frame.
   * Called exactly once at game_end. No-ops if not embedded or already sent.
   *
   * @param {object} packet - { schemaVersion, context, envelope, weeklyHook, postgameAutopsy }
   * @returns {boolean} true if posted
   */
  function emitConsumerPacket(packet) {
    if (!enabled) return false;
    if (_consumerPacketSent) return false;
    if (!packet || typeof packet !== 'object') return false;

    _consumerPacketSent = true;

    try {
      window.parent.postMessage({
        type: 'mfd:consumer-packet',
        packet: packet,
      }, targetOrigin);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function reset() {
    _emittedSeqs.clear();
    _consumerPacketSent = false;
  }

  return {
    emitToParent: emitToParent,
    emitConsumerPacket: emitConsumerPacket,
    reset: reset,
    get enabled() { return enabled; },
    /** Exposed for testing — number of unique seqs emitted */
    get emittedCount() { return _emittedSeqs.size; },
    get consumerPacketSent() { return _consumerPacketSent; },
  };
}
