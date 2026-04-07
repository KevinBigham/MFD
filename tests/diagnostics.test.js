import { describe, expect, it } from 'vitest';

import { buildDiagnosticsPayload } from '../src/app/diagnostics.js';

describe('launcher diagnostics payload', () => {
  it('returns stable diagnostics shape with defaults', () => {
    var payload = buildDiagnosticsPayload({});
    expect(payload.bootMode).toBe('status');
    expect(typeof payload.forcedMode).toBe('string');
    expect(typeof payload.runtime.loading).toBe('boolean');
    expect(typeof payload.runtime.ok).toBe('boolean');
    expect(typeof payload.playability.ok).toBe('boolean');
  });

  it('maps runtime/playability fields correctly', () => {
    var payload = buildDiagnosticsPayload({
      bootMode: 'play',
      forcedMode: 'status',
      runtime: {
        loading: false,
        error: 'x',
        validation: { checkCount: 500, ok: true },
      },
      playability: {
        loading: false,
        ok: false,
        missingFiles: ['legacy/game.js'],
      },
    });

    expect(payload.bootMode).toBe('play');
    expect(payload.forcedMode).toBe('status');
    expect(payload.runtime.checkCount).toBe(500);
    expect(payload.runtime.hasError).toBe(true);
    expect(payload.playability.ok).toBe(false);
    expect(payload.playability.missingCount).toBe(1);
  });
});
