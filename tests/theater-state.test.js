import { describe, expect, it } from 'vitest';

import { buildTheaterState } from '../src/app/theater-state.js';

describe('theater-state.js', () => {
  it('starts normal theater mode at drive zero with decisions intact', () => {
    var result = { log: ['A', 'B', 'C'] };
    var state = buildTheaterState({
      result: result,
      homeTeam: { id: 'H' },
      awayTeam: { id: 'A' },
      gameRef: { week: 3 },
      decisions: [{ driveIdx: 1 }],
    });

    expect(state.driveIdx).toBe(0);
    expect(state.paused).toBe(false);
    expect(state.decisions).toHaveLength(1);
    expect(state.quickSim).toBe(false);
  });

  it('uses presentation skip mode for quickSim without changing the simulated result', () => {
    var result = { log: ['A', 'B', 'C', 'D'], home: 27, away: 20 };
    var state = buildTheaterState({
      result: result,
      homeTeam: { id: 'H' },
      awayTeam: { id: 'A' },
      gameRef: { week: 3 },
      decisions: [{ driveIdx: 1 }],
      skipPresentation: true,
    });

    expect(state.result).toBe(result);
    expect(state.driveIdx).toBe(result.log.length);
    expect(state.paused).toBe(true);
    expect(state.decisions).toEqual([]);
    expect(state.quickSim).toBe(true);
  });
});
