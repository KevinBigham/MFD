function now(clock) {
  if (clock && typeof clock.now === 'function') return clock.now();
  return Date.now();
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export async function waitForCondition(predicate, options) {
  var opts = options || {};
  var timeoutMs = Number(opts.timeoutMs || 4000);
  var intervalMs = Number(opts.intervalMs || 50);
  var clock = opts.clock || null;

  var start = now(clock);
  while (now(clock) - start <= timeoutMs) {
    var value = await predicate();
    if (value) {
      return {
        ok: true,
        value: value,
        elapsedMs: now(clock) - start,
      };
    }
    await sleep(intervalMs);
  }

  return {
    ok: false,
    value: null,
    elapsedMs: now(clock) - start,
  };
}
