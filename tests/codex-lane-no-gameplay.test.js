import { describe, expect, it } from 'vitest';

import { runNoGameplayDeltaCheck } from '../scripts/verify-no-gameplay-delta.mjs';

describe('codex lane no-gameplay regression', () => {
  it('passes codex-safe files and fails gameplay file edits', () => {
    var safe = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      strictLane: true,
      laneName: 'codex-hybrid-v3',
      changedFiles: [
        'src/app/launcher-shell.jsx',
        'scripts/report-playability.mjs',
        'docs/hybrid-v3-contracts.md',
      ],
    });
    expect(safe.ok).toBe(true);

    var forbidden = runNoGameplayDeltaCheck({
      allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
      strictLane: true,
      laneName: 'codex-hybrid-v3',
      changedFiles: ['src/systems/sim-game.js'],
    });
    expect(forbidden.ok).toBe(false);
    expect(forbidden.forbidden).toEqual(['src/systems/sim-game.js']);
  });
});
