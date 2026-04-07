import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLegacyBridgeState,
  LEGACY_BRIDGE_EVENTS,
  onLegacyEvent,
  startLegacyBridge,
  stopLegacyBridge,
} from '../src/app/legacy-bridge.js';

describe('legacy-bridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopLegacyBridge();
    vi.useRealTimers();
  });

  it('starts/stops idempotently and emits loaded event', async () => {
    var events = [];
    var unsubscribe = onLegacyEvent(function (evt) {
      events.push(evt.type);
    });
    var started = startLegacyBridge({ intervalMs: 10, probeFn: function () { return true; } });
    var startedAgain = startLegacyBridge({ intervalMs: 10, probeFn: function () { return true; } });
    await vi.advanceTimersByTimeAsync(15);
    var stopped = stopLegacyBridge();
    var stoppedAgain = stopLegacyBridge();
    unsubscribe();

    expect(started.started).toBe(true);
    expect(startedAgain.started).toBe(false);
    expect(stopped.stopped).toBe(true);
    expect(stoppedAgain.stopped).toBe(false);
    expect(events).toContain(LEGACY_BRIDGE_EVENTS.LOADED);
  });

  it('emits unresponsive and recovered events with watchdog/backoff', async () => {
    var events = [];
    var probePass = false;
    onLegacyEvent(function (evt) {
      events.push(evt.type);
    });
    startLegacyBridge({
      intervalMs: 10,       // clamped to 250ms min by implementation
      maxIntervalMs: 40,    // clamped to max(baseInterval, 40) = 250ms
      backoffFactor: 2,
      unresponsiveThreshold: 1,
      probeFn: function () { return probePass; },
    });

    await vi.advanceTimersByTimeAsync(300); // advance past 250ms clamped interval
    expect(events).toContain(LEGACY_BRIDGE_EVENTS.UNRESPONSIVE);
    var stateAfterFail = getLegacyBridgeState();
    expect(stateAfterFail.unresponsive).toBe(true);
    expect(stateAfterFail.intervalMs).toBeGreaterThanOrEqual(250);

    probePass = true;
    await vi.advanceTimersByTimeAsync(300); // advance past next probe interval
    expect(events).toContain(LEGACY_BRIDGE_EVENTS.RECOVERED);
    expect(getLegacyBridgeState().unresponsive).toBe(false);
  });
});
