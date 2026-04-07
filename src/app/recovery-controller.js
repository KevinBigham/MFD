export var RECOVERY_ACTIONS = Object.freeze({
  RELOAD_IFRAME: 'reload_iframe',
  OPEN_DIRECT: 'open_direct',
  RESTORE_LAST_GOOD_SLOT: 'restore_last_good_slot',
  FALLBACK_STATUS: 'fallback_status',
});

export function createRecoveryEvent(action, pass, detail) {
  return {
    action: action,
    pass: !!pass,
    detail: detail || '',
    at: new Date().toISOString(),
  };
}

export function mapSessionHealthToRecoveryAction(healthState) {
  var state = String(healthState || '');
  if (state === 'unresponsive') return RECOVERY_ACTIONS.RELOAD_IFRAME;
  if (state === 'recovered') return RECOVERY_ACTIONS.OPEN_DIRECT;
  if (state === 'stopped') return RECOVERY_ACTIONS.FALLBACK_STATUS;
  return '';
}

export function createRecoveryController(options) {
  var opts = options || {};
  var throttleMs = Math.max(250, Number(opts.throttleMs) || 1500);
  var now = typeof opts.now === 'function' ? opts.now : Date.now;
  var lastRecoveryAt = 0;
  var events = [];

  function push(action, pass, detail) {
    var evt = createRecoveryEvent(action, pass, detail);
    events.push(evt);
    return evt;
  }

  function blockedByThrottle() {
    var stamp = Number(now());
    if (stamp - lastRecoveryAt < throttleMs) {
      return true;
    }
    lastRecoveryAt = stamp;
    return false;
  }

  async function runAction(action, ctx) {
    var context = ctx || {};
    var fnMap = {};
    fnMap[RECOVERY_ACTIONS.RELOAD_IFRAME] = opts.reloadIframe;
    fnMap[RECOVERY_ACTIONS.OPEN_DIRECT] = opts.openDirect;
    fnMap[RECOVERY_ACTIONS.RESTORE_LAST_GOOD_SLOT] = opts.restoreLastGoodSlot;
    fnMap[RECOVERY_ACTIONS.FALLBACK_STATUS] = opts.fallbackToStatus;
    var fn = fnMap[action];

    if (!fn || typeof fn !== 'function') {
      var unsupported = push(action, false, 'unsupported recovery action');
      return { ok: false, event: unsupported };
    }

    if (blockedByThrottle()) {
      var throttled = push(action, false, 'recovery throttled');
      return { ok: false, event: throttled, throttled: true };
    }

    try {
      var result = await fn(context);
      var ok = !!(result !== false && !(result && result.ok === false));
      var detail = result && typeof result === 'object' && result.detail
        ? String(result.detail)
        : (ok ? 'recovery action succeeded' : 'recovery action failed');
      var event = push(action, ok, detail);
      return { ok: ok, result: result, event: event };
    } catch (err) {
      var failure = push(action, false, err && err.message ? err.message : String(err));
      return { ok: false, event: failure };
    }
  }

  return {
    recover: runAction,
    recoverFromSessionHealth: async function (healthState, ctx) {
      var action = mapSessionHealthToRecoveryAction(healthState);
      if (!action) {
        var evt = push('session_health_noop', true, 'no recovery action needed');
        return {
          ok: true,
          event: evt,
        };
      }
      return runAction(action, ctx || {});
    },
    getAuditLog: function () { return events.slice(); },
    getLastEvent: function () { return events.length > 0 ? events[events.length - 1] : null; },
    reset: function () { events = []; lastRecoveryAt = 0; },
  };
}
