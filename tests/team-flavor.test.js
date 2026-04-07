import { describe, expect, it } from 'vitest';

import { TEAM_FLAVOR_991, getTeamFlavor991 } from '../src/data/team-flavor.js';

describe('team-flavor.js', () => {
  it('contains flavor entries for multiple teams with required fields', () => {
    const keys = Object.keys(TEAM_FLAVOR_991);
    expect(keys.length).toBeGreaterThan(20);

    const kc = TEAM_FLAVOR_991.KC;
    expect(kc).toBeTruthy();
    expect(kc.stadium.length).toBeGreaterThan(0);
    expect(kc.atmosphere.length).toBeGreaterThan(0);
    expect(kc.fans.length).toBeGreaterThan(0);
    expect(kc.homeAdvLine.length).toBeGreaterThan(0);
    expect(kc.rivalQuip.length).toBeGreaterThan(0);
  });

  it('getTeamFlavor991 returns values for valid keys and null for missing entries', () => {
    expect(getTeamFlavor991('KC', 'stadium')).toBe('Arrowhead West');
    expect(getTeamFlavor991('KC', 'nope')).toBe(null);
    expect(getTeamFlavor991('XYZ', 'stadium')).toBe(null);
  });
});
