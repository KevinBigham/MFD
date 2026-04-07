export var SESSION_HEALTH = Object.freeze({
  STOPPED: 'stopped',
  STARTING: 'starting',
  HEALTHY: 'healthy',
  UNRESPONSIVE: 'unresponsive',
  RECOVERED: 'recovered',
});

var probe = {
  timer: null,
  state: SESSION_HEALTH.STOPPED,
  startedAt: 0,
  lastHeartbeatAt: 0,
  intervalMs: 1000,
  unresponsiveAfterMs: 6000,
  history: [],
  getHeartbeat: null,
  now: Date.now,
  onState: null,
};

function toTimestamp(value, now) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof value.timestamp === 'number') return value.timestamp;
  if (value === true) return now();
  return 0;
}

function emitState(next, detail) {
  if (probe.state === next && !detail) return;
  probe.state = next;
  var event = {
    at: probe.now(),
    state: next,
    detail: detail || '',
  };
  probe.history.push(event);
  if (typeof probe.onState === 'function') {
    probe.onState(Object.assign({}, event));
  }
}

function evaluateProbe() {
  if (!probe.getHeartbeat || typeof probe.getHeartbeat !== 'function') return;

  var now = probe.now();
  var beat = probe.getHeartbeat();
  var beatAt = toTimestamp(beat, probe.now);
  if (beatAt > 0) {
    var wasUnresponsive = probe.state === SESSION_HEALTH.UNRESPONSIVE;
    probe.lastHeartbeatAt = beatAt;
    if (wasUnresponsive) {
      emitState(SESSION_HEALTH.RECOVERED, 'heartbeat resumed');
    }
    emitState(SESSION_HEALTH.HEALTHY, 'heartbeat observed');
    return;
  }

  var reference = probe.lastHeartbeatAt || probe.startedAt || now;
  if (now - reference >= probe.unresponsiveAfterMs) {
    emitState(SESSION_HEALTH.UNRESPONSIVE, 'heartbeat timeout exceeded');
  }
}

export function startSessionProbe(options) {
  var opts = options || {};

  if (probe.timer) {
    return getSessionHealth();
  }

  probe.intervalMs = Math.max(250, Number(opts.intervalMs || 1000));
  probe.unresponsiveAfterMs = Math.max(500, Number(opts.unresponsiveAfterMs || 6000));
  probe.getHeartbeat = typeof opts.getHeartbeat === 'function' ? opts.getHeartbeat : null;
  probe.now = typeof opts.now === 'function' ? opts.now : Date.now;
  probe.onState = typeof opts.onState === 'function' ? opts.onState : null;
  probe.startedAt = probe.now();
  probe.lastHeartbeatAt = 0;
  probe.history = [];

  emitState(SESSION_HEALTH.STARTING, 'probe started');

  probe.timer = setInterval(function () {
    evaluateProbe();
  }, probe.intervalMs);

  evaluateProbe();
  return getSessionHealth();
}

export function stopSessionProbe() {
  if (probe.timer) {
    clearInterval(probe.timer);
    probe.timer = null;
  }
  emitState(SESSION_HEALTH.STOPPED, 'probe stopped');
  return getSessionHealth();
}

export function getSessionHealth() {
  return {
    state: probe.state,
    startedAt: probe.startedAt,
    lastHeartbeatAt: probe.lastHeartbeatAt,
    intervalMs: probe.intervalMs,
    unresponsiveAfterMs: probe.unresponsiveAfterMs,
    history: probe.history.slice(),
    running: !!probe.timer,
  };
}
