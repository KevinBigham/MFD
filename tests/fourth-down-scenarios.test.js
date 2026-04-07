import { describe, expect, it } from 'vitest';

import { calcFourthDownEV995 } from '../src/systems/contracts.js';

// Kevin's canonical 6 fourth-down scenarios (fieldPos = yards from own end zone)
describe('fourth-down scenarios', () => {
  it('Scenario 1: 4th-and-1 at opponent 35 (fieldPos 65), tied, Q3 → go', () => {
    var out = calcFourthDownEV995(1, 65, 0, 3, 900);
    expect(out.recommendation).toBe('go');
  });

  it('Scenario 2: 4th-and-1 at own 30, tied, Q2 → punt (own-territory risk)', () => {
    var out = calcFourthDownEV995(1, 30, 0, 2, 900);
    expect(out.recommendation).toBe('punt');
    expect(out.fieldGoal.applicable).toBe(false);
  });

  it('Scenario 3: 4th-and-7 at opponent 32 (fieldPos 68), trailing 3, Q4 2min → fg', () => {
    var out = calcFourthDownEV995(7, 68, -3, 4, 120);
    expect(out.recommendation).toBe('fg');
    expect(out.fieldGoal.applicable).toBe(true);
  });

  it('Scenario 4: 4th-and-15 at own 25, trailing 10, Q4 1min → go (desperation)', () => {
    var out = calcFourthDownEV995(15, 25, -10, 4, 60);
    expect(out.recommendation).toBe('go');
    expect(out.fieldGoal.applicable).toBe(false);
  });

  it('Scenario 5: 4th-and-2 at opponent 4 (fieldPos 96), trailing 3, Q4 → go (red zone, FG only ties)', () => {
    var out = calcFourthDownEV995(2, 96, -3, 4, 300);
    expect(out.recommendation).toBe('go');
    expect(out.fieldGoal.applicable).toBe(true);
  });

  it('Scenario 6: 4th-and-3 at opponent 18 (fieldPos 82), tied, Q3 → fg', () => {
    var out = calcFourthDownEV995(3, 82, 0, 3, 900);
    expect(out.recommendation).toBe('fg');
    expect(out.fieldGoal.applicable).toBe(true);
  });
});
