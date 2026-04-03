import { describe, expect, it } from 'vitest';
import type { InjuryDetail, MedicalStaff, Player } from '../types';
import {
  activateFromIR,
  calculateRecoveryGames,
  generateInjury,
  placeOnIR,
  processInjuryRecovery,
} from './injury-system';
import { makeLeagueState, makePlayer } from './test-helpers';

const eliteMedical: MedicalStaff = {
  id: 'med-elite',
  name: 'Elite Med',
  tier: 'elite',
  salary: 2.5,
  recoveryBonus: 0.8,
  preventionBonus: 0.8,
};

function withTrait(player: Player, trait: Player['traits'][number]): Player {
  player.traits = [trait];
  return player;
}

function severeInjury(overrides: Partial<InjuryDetail> = {}): InjuryDetail {
  return {
    id: 'inj-1',
    type: 'acl',
    severity: 'out',
    severityTier: 'severe',
    gamesOut: 1,
    gamesRecovered: 0,
    reinjuryRisk: 0.2,
    affectedRatings: ['speed'],
    ratingPenalty: 0,
    onIR: false,
    ...overrides,
  };
}

describe('injury system', () => {
  it('high fatigue increases injury chance', () => {
    const player = makePlayer('p1', 't1', 'QB', 82);

    const lowFatigue = generateInjury(() => 0.045, player, 20, null, 1, 1);
    const highFatigue = generateInjury(() => 0.045, player, 80, null, 1, 1);

    expect(lowFatigue).toBeNull();
    expect(highFatigue).not.toBeNull();
  });

  it('elite medical staff reduces recovery time to 80%', () => {
    expect(calculateRecoveryGames(10, eliteMedical, 1)).toBe(8);
  });

  it('glass trait increases injury chance', () => {
    const player = withTrait(makePlayer('p1', 't1', 'WR', 80), 'glass');

    expect(generateInjury(() => 0.06, player, 40, null, 1, 1)).not.toBeNull();
  });

  it('ironman trait decreases injury chance', () => {
    const player = withTrait(makePlayer('p1', 't1', 'WR', 80), 'ironman');

    expect(generateInjury(() => 0.04, player, 40, null, 1, 1)).toBeNull();
  });

  it('severe injuries keep a lingering OVR penalty after return', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1.roster[0]!;
    player.injury = severeInjury();

    processInjuryRecovery(game, 'afce1', () => 0.95);

    expect(player.injury).not.toBeNull();
    expect(player.injury?.gamesOut).toBe(0);
    expect(player.injury?.ratingPenalty).toBeGreaterThanOrEqual(1);
  });

  it('IR placement and activation work correctly', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1.roster[0]!;
    player.injury = severeInjury({ gamesOut: 2 });

    expect(placeOnIR(game, 'afce1', player.id)).toBe(true);
    expect(player.injury?.onIR).toBe(true);
    expect(player.injury?.gamesOut).toBe(4);

    player.injury!.gamesOut = 0;
    expect(activateFromIR(game, 'afce1', player.id)).toBe(true);
    expect(player.injury?.onIR).toBe(false);
  });

  it('reinjury risk can trigger a reaggravation', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1.roster[0]!;
    player.injury = severeInjury({ gamesOut: 0, gamesRecovered: 1, ratingPenalty: 2 });

    processInjuryRecovery(game, 'afce1', () => 0.05);

    expect(player.injury).not.toBeNull();
    expect(player.injury?.gamesOut).toBeGreaterThan(0);
  });
});
