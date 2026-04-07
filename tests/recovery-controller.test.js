import { describe, expect, it, vi } from 'vitest';

import {
  createRecoveryController,
  mapSessionHealthToRecoveryAction,
  RECOVERY_ACTIONS,
} from '../src/app/recovery-controller.js';

describe('recovery-controller', () => {
  it('runs all recovery branches and records audit events', async () => {
    // throttleMs:0 is treated as falsy by the implementation (0||1500=1500).
    // Use now() starting at 2000 so stamp-lastRecoveryAt(0) > 1500 on first call,
    // then advance 1600ms between calls to clear the throttle each time.
    var tick = 2000;
    var controller = createRecoveryController({
      throttleMs: 0,
      now: function () { return tick; },
      reloadIframe: function () { return { ok: true, detail: 'reloaded' }; },
      openDirect: function () { return { ok: true, detail: 'opened direct' }; },
      restoreLastGoodSlot: function () { return { ok: true, detail: 'restored' }; },
      fallbackToStatus: function () { return { ok: true, detail: 'status fallback' }; },
    });

    var a = await controller.recover(RECOVERY_ACTIONS.RELOAD_IFRAME);
    tick += 1600;
    var b = await controller.recover(RECOVERY_ACTIONS.OPEN_DIRECT);
    tick += 1600;
    var c = await controller.recover(RECOVERY_ACTIONS.RESTORE_LAST_GOOD_SLOT);
    tick += 1600;
    var d = await controller.recover(RECOVERY_ACTIONS.FALLBACK_STATUS);

    expect(a.ok && b.ok && c.ok && d.ok).toBe(true);
    expect(controller.getAuditLog().length).toBe(4);
  });

  it('throttles repeated recovery attempts', async () => {
    var now = 1000;
    var controller = createRecoveryController({
      throttleMs: 500,
      now: function () { return now; },
      reloadIframe: function () { return { ok: true, detail: 'reloaded' }; },
    });

    var first = await controller.recover(RECOVERY_ACTIONS.RELOAD_IFRAME);
    var second = await controller.recover(RECOVERY_ACTIONS.RELOAD_IFRAME);
    now += 700;
    var third = await controller.recover(RECOVERY_ACTIONS.RELOAD_IFRAME);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.throttled).toBe(true);
    expect(third.ok).toBe(true);
  });

  it('returns unsupported action error and captures thrown errors', async () => {
    var controller = createRecoveryController({
      throttleMs: 0,
      reloadIframe: vi.fn(function () { throw new Error('boom'); }),
    });
    var unsupported = await controller.recover('unknown_action');
    var thrown = await controller.recover(RECOVERY_ACTIONS.RELOAD_IFRAME);
    expect(unsupported.ok).toBe(false);
    expect(unsupported.event.detail).toContain('unsupported');
    expect(thrown.ok).toBe(false);
    expect(thrown.event.detail).toContain('boom');
  });

  it('maps session health states to deterministic recovery actions', async () => {
    expect(mapSessionHealthToRecoveryAction('unresponsive')).toBe(RECOVERY_ACTIONS.RELOAD_IFRAME);
    expect(mapSessionHealthToRecoveryAction('recovered')).toBe(RECOVERY_ACTIONS.OPEN_DIRECT);
    expect(mapSessionHealthToRecoveryAction('stopped')).toBe(RECOVERY_ACTIONS.FALLBACK_STATUS);
    expect(mapSessionHealthToRecoveryAction('healthy')).toBe('');

    var controller = createRecoveryController({
      throttleMs: 0,
      reloadIframe: function () { return { ok: true }; },
      openDirect: function () { return { ok: true }; },
      fallbackToStatus: function () { return { ok: true }; },
    });
    var out = await controller.recoverFromSessionHealth('unresponsive');
    expect(out.ok).toBe(true);
  });
});
