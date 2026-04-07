export var LEGACY_BRIDGE_EVENTS = Object.freeze({
  LOADED: 'legacy_loaded',
  UNRESPONSIVE: 'legacy_unresponsive',
  RECOVERED: 'legacy_recovered',
});

var state = {
  running: false,
  timer: null,
  handlers: new Set(),
  baseIntervalMs: 1500,
  currentIntervalMs: 1500,
  maxIntervalMs: 12000,
  backoffFactor: 1.6,
  misses: 0,
  unresponsive: false,
  unresponsiveThreshold: 2,
  probeFn: null,
};

function nowIso() {
  return new Date().toISOString();
}

function emit(type, detail) {
  var evt = {
    type: type,
    at: nowIso(),
    detail: detail || {},
  };
  state.handlers.forEach(function (handler) {
    try {
      handler(evt);
    } catch (_err) {
      // Swallow handler failures; the bridge should not crash.
    }
  });
  return evt;
}

async function runProbeOnce() {
  if (!state.running) return;
  var ok = true;
  if (typeof state.probeFn === 'function') {
    try {
      ok = !!(await state.probeFn());
    } catch (_err) {
      ok = false;
    }
  }

  if (ok) {
    if (state.unresponsive) {
      state.unresponsive = false;
      emit(LEGACY_BRIDGE_EVENTS.RECOVERED, { misses: state.misses });
    }
    state.misses = 0;
    state.currentIntervalMs = state.baseIntervalMs;
  } else {
    state.misses += 1;
    if (!state.unresponsive && state.misses >= state.unresponsiveThreshold) {
      state.unresponsive = true;
      emit(LEGACY_BRIDGE_EVENTS.UNRESPONSIVE, { misses: state.misses });
    }
    state.currentIntervalMs = Math.min(
      state.maxIntervalMs,
      Math.floor(state.currentIntervalMs * state.backoffFactor)
    );
  }

  if (!state.running) return;
  state.timer = setTimeout(runProbeOnce, state.currentIntervalMs);
}

export function getLegacyBridgeState() {
  return {
    running: state.running,
    misses: state.misses,
    unresponsive: state.unresponsive,
    intervalMs: state.currentIntervalMs,
    handlerCount: state.handlers.size,
  };
}

export function startLegacyBridge(options) {
  var opts = options || {};
  if (state.running) {
    return { started: false, state: getLegacyBridgeState() };
  }

  state.baseIntervalMs = Math.max(250, Number(opts.intervalMs) || 1500);
  state.currentIntervalMs = state.baseIntervalMs;
  state.maxIntervalMs = Math.max(state.baseIntervalMs, Number(opts.maxIntervalMs) || 12000);
  state.backoffFactor = Math.max(1.1, Number(opts.backoffFactor) || 1.6);
  state.unresponsiveThreshold = Math.max(1, Number(opts.unresponsiveThreshold) || 2);
  state.probeFn = typeof opts.probeFn === 'function' ? opts.probeFn : null;
  state.misses = 0;
  state.unresponsive = false;
  state.running = true;
  state.timer = setTimeout(runProbeOnce, state.currentIntervalMs);
  emit(LEGACY_BRIDGE_EVENTS.LOADED, {
    intervalMs: state.currentIntervalMs,
    threshold: state.unresponsiveThreshold,
  });
  return { started: true, state: getLegacyBridgeState() };
}

export function stopLegacyBridge() {
  if (!state.running) {
    return { stopped: false, state: getLegacyBridgeState() };
  }
  state.running = false;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.misses = 0;
  state.unresponsive = false;
  state.currentIntervalMs = state.baseIntervalMs;
  return { stopped: true, state: getLegacyBridgeState() };
}

export function onLegacyEvent(handler) {
  if (typeof handler !== 'function') {
    return function noop() {};
  }
  state.handlers.add(handler);
  return function unsubscribe() {
    state.handlers.delete(handler);
  };
}
