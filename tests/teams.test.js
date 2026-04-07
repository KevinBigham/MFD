import { describe, expect, it } from 'vitest';

import {
  CALENDAR,
  LEAGUE_POOL_SCALE97,
  LEAGUE_STRUCTURE,
  LEAGUE_TEAM_COUNT97,
  MFD97_CONF_DIV_MAP,
  TD,
  applyLeagueAlignment97,
  getScaledCount97,
  getScaledDraftClassCount97,
} from '../src/data/teams.js';

describe('teams.js', () => {
  it('defines a 30-team league with conference/division structure', () => {
    expect(TD.length).toBe(30);
    expect(LEAGUE_TEAM_COUNT97).toBe(30);
    expect(LEAGUE_STRUCTURE.conferences.length).toBe(2);
    expect(LEAGUE_STRUCTURE.divisions.length).toBe(6);
    expect(Object.keys(MFD97_CONF_DIV_MAP).length).toBe(30);
  });

  it('applies alignment and independent fallback', () => {
    const aligned = applyLeagueAlignment97({ id: 'hawks' });
    expect(aligned.conf).toBe('EC');
    expect(aligned.divId).toBe('ECS');

    const fallback = applyLeagueAlignment97({ id: 'unknown' });
    expect(fallback.conf).toBe('LG');
    expect(fallback.divId).toBe('IND');
  });

  it('scales counts from pool scale and exposes season calendar', () => {
    expect(LEAGUE_POOL_SCALE97).toBeGreaterThan(1);
    expect(getScaledCount97(10)).toBe(Math.round(10 * LEAGUE_POOL_SCALE97));
    expect(getScaledDraftClassCount97()).toBe(getScaledCount97(300));
    expect(CALENDAR.length).toBeGreaterThan(10);
    expect(CALENDAR.some((e) => e.event === 'Draft')).toBe(true);
  });
});
