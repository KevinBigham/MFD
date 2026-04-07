function getNow(clock) {
  if (clock && typeof clock.now === 'function') return clock.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

var activeSpans = new Map();
var samples = [];
var sequence = 0;

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  var nums = values.map(function (value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }).sort(function (a, b) { return a - b; });
  var idx = Math.max(0, Math.min(nums.length - 1, Math.ceil((p / 100) * nums.length) - 1));
  return nums[idx];
}

export function startPerfSpan(name, meta) {
  sequence += 1;
  var id = 'span_' + sequence;
  var span = {
    id: id,
    name: String(name || 'unnamed_span'),
    startedAt: getNow(meta && meta.clock),
    clock: meta && meta.clock ? meta.clock : null,
    meta: meta || {},
  };
  activeSpans.set(id, span);
  return id;
}

export function endPerfSpan(spanId, meta) {
  if (!spanId || !activeSpans.has(spanId)) {
    return {
      ok: false,
      reason: 'unknown span id',
      sample: null,
    };
  }

  var span = activeSpans.get(spanId);
  activeSpans.delete(spanId);

  var endedAt = getNow(span.clock);
  var durationMs = Math.max(0, endedAt - span.startedAt);
  var sample = {
    id: span.id,
    name: span.name,
    durationMs: durationMs,
    startedAt: span.startedAt,
    endedAt: endedAt,
    meta: Object.assign({}, span.meta, meta || {}),
  };
  samples.push(sample);

  return {
    ok: true,
    reason: '',
    sample: sample,
  };
}

export function collectPerfStats(input) {
  var items = Array.isArray(input) ? input : [];
  var durations = items.map(function (item) {
    if (typeof item === 'number') return item;
    if (item && typeof item.durationMs === 'number') return item.durationMs;
    return 0;
  }).filter(function (value) {
    return Number.isFinite(value) && value >= 0;
  });

  return {
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    max: durations.length > 0 ? Math.max.apply(null, durations) : 0,
    count: durations.length,
  };
}

export function getPerfSamples() {
  return samples.slice();
}

export function clearPerfSamples() {
  samples = [];
  activeSpans.clear();
}
