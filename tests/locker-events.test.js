import { afterEach, describe, expect, it } from 'vitest';

import { LOCKER_EVENTS, checkLockerEvents } from '../src/systems/locker-events.js';
import { RNG } from '../src/utils/rng.js';

function makeTeam(overrides = {}) {
  return {
    wins: 0,
    losses: 0,
    streak: 0,
    lastMargin: 0,
    lastEvent: '',
    roster: [],
    ...overrides,
  };
}

describe('locker-events.js', () => {
  const originalAi = RNG.ai;

  afterEach(() => {
    RNG.ai = originalAi;
  });

  it('has unique event ids', () => {
    const ids = LOCKER_EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns null and clears lastEvent when no event passes RNG gate', () => {
    RNG.ai = () => 0.99;
    const team = makeTeam({
      lastEvent: 'star_demands',
      roster: [{ name: 'Depth Player', morale: 70, chemistry: 60, cliqueId: 0 }],
    });

    const triggered = checkLockerEvents(team, true);

    expect(triggered).toBeNull();
    expect(team.lastEvent).toBe('');
  });

  it('triggers players_meeting and applies morale/chemistry/dev changes', () => {
    RNG.ai = () => 0;
    const team = makeTeam({
      roster: [
        { name: 'Vet A', cliqueId: 0, chemistry: 30, morale: 70, devBonus: 0 },
        { name: 'Vet B', cliqueId: 0, chemistry: 32, morale: 71, devBonus: 1 },
        { name: 'Vet C', cliqueId: 0, chemistry: 34, morale: 69 },
      ],
    });

    const triggered = checkLockerEvents(team, true);

    expect(triggered?.id).toBe('players_meeting');
    team.roster.forEach((player) => {
      expect(player.morale).toBeGreaterThanOrEqual(71);
      expect(player.chemistry).toBeGreaterThanOrEqual(34);
      expect(player.devBonus).toBeLessThanOrEqual(0);
    });
    expect(team.lastEvent).toBe('players_meeting');
  });

  it('triggers chained media_leak from prior star_demands and applies penalties', () => {
    RNG.ai = () => 0;
    const team = makeTeam({
      wins: 5,
      losses: 6,
      lastEvent: 'star_demands',
      roster: [
        { name: 'Frustrated Star', cliqueId: 2, chemistry: 30, morale: 72, tradeValue: 100, ovr: 77 },
        { name: 'Role Player', cliqueId: 1, chemistry: 55, morale: 70, ovr: 68 },
      ],
    });

    const triggered = checkLockerEvents(team, true);

    expect(triggered?.id).toBe('media_leak');
    expect(team.roster[0].tradeValue).toBe(90);
    expect(team.roster[0].morale).toBe(71);
    expect(team.roster[1].morale).toBe(69);
    expect(team.lastEvent).toBe('media_leak');
  });

  it('surfaces a choice event without auto-applying changes', () => {
    RNG.ai = () => 0;
    const team = makeTeam({
      losses: 5,
      streak: -3,
      roster: [{ name: 'Starter', morale: 65, chemistry: 58, ovr: 70, age: 26 }],
    });

    const before = JSON.parse(JSON.stringify(team.roster));
    const triggered = checkLockerEvents(team, true);

    expect(triggered?.id).toBe('choice_team_meeting');
    expect(triggered?.choice).toBe(true);
    expect(triggered?.options).toHaveLength(2);
    expect(team.roster).toEqual(before);
    expect(team.lastEvent).toBe('choice_team_meeting');
  });

  it('triggers critical trade-demand crisis when conditions are met', () => {
    RNG.ai = () => 0;
    const team = makeTeam({
      roster: [
        { name: 'Franchise QB', ovr: 90, morale: 35, contract: { years: 2 }, age: 27, chemistry: 60 },
        { name: 'Starter 2', ovr: 72, morale: 66, chemistry: 61, age: 25 },
      ],
    });

    const triggered = checkLockerEvents(team, true);

    expect(triggered?.id).toBe('choice_trade_demand');
    expect(triggered?.crisis).toBe(true);
    expect(triggered?.crisisTier).toBe('URGENT');
    expect(triggered?.options).toHaveLength(3);
  });
});
