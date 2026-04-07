import { describe, expect, it } from 'vitest';

import {
  getSessionHealth,
  SESSION_HEALTH,
  startSessionProbe,
  stopSessionProbe,
} from '../src/app/legacy-session-api.js';

describe('legacy-session-api', () => {
  it('starts and stops probe idempotently', () => {
    var now = 1000;
    var probe = startSessionProbe({
      now: function () { return now; },
      intervalMs: 1000,
      unresponsiveAfterMs: 3000,
      getHeartbeat: function () { return 0; },
    });

    expect(probe.state).toBe(SESSION_HEALTH.STARTING);
    var second = startSessionProbe({
      now: function () { return now; },
      getHeartbeat: function () { return 0; },
    });
    expect(second.running).toBe(true);

    var stopped = stopSessionProbe();
    expect(stopped.state).toBe(SESSION_HEALTH.STOPPED);
    expect(stopped.running).toBe(false);
  });

  it('captures heartbeat metadata in health snapshot', () => {
    stopSessionProbe();
    var heartbeatTs = 2222;
    startSessionProbe({
      now: function () { return heartbeatTs; },
      intervalMs: 500,
      getHeartbeat: function () { return heartbeatTs; },
    });

    var health = getSessionHealth();
    expect(health.state === SESSION_HEALTH.HEALTHY || health.state === SESSION_HEALTH.STARTING).toBe(true);
    expect(health.intervalMs).toBeGreaterThanOrEqual(250);
    expect(Array.isArray(health.history)).toBe(true);

    stopSessionProbe();
  });
});
