import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { applyRuleChange, initLeagueRules } from '../systems/league-rules';
import { getCapFloor, getSalaryCap } from './cap-math';

describe('cap math league rule overrides', () => {
  it('uses salary cap growth from league rules when active', () => {
    const leagueRules = applyRuleChange(initLeagueRules(2030), {
      key: 'salary_cap_growth',
      newValue: 0.06,
      source: 'cba',
      proposedBy: 'owners',
      effectiveYear: 2030,
      rationale: 'Raise cap growth.',
    });
    const game = { year: 2030, leagueRules } as unknown as GameState;

    expect(getSalaryCap(2030, game)).toBeGreaterThan(getSalaryCap(2030));
  });

  it('keeps future cap changes from affecting earlier seasons', () => {
    const leagueRules = applyRuleChange(initLeagueRules(2030), {
      key: 'cap_floor_pct',
      newValue: 0.92,
      source: 'cba',
      proposedBy: 'players',
      effectiveYear: 2032,
      rationale: 'Higher floor later.',
    });
    const currentGame = { year: 2030, leagueRules } as unknown as GameState;
    const futureGame = { year: 2032, leagueRules } as unknown as GameState;

    expect(getCapFloor(2030, currentGame)).toBe(getCapFloor(2030));
    expect(getCapFloor(2032, futureGame)).toBeGreaterThan(getCapFloor(2032));
  });
});
