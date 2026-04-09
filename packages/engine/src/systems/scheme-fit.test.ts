import { describe, expect, it } from 'vitest';
import type { CoordinatorSpecialty, Player, Team } from '../types';
import { makePlayer, makeTeam } from './test-helpers';
import {
  calcPersonalityFitAdj,
  calcPlayerIdentityFit,
  calcSchemeFit,
  calcSpecialtyFitAdj,
  calcTeamFit,
  fitTierFromScore,
  getPlayerSide,
  getSchemeMismatchWarnings,
  getSpecialtyBonus,
} from './scheme-fit';

function setRatings(player: Player, ratings: Partial<Player['ratings']>): Player {
  player.ratings = { ...player.ratings, ...ratings };
  return player;
}

function setPersonality(player: Player, personality: Partial<Player['personality']>): Player {
  player.personality = { ...player.personality, ...personality };
  return player;
}

function makeSpecialty(id: string, label = id): CoordinatorSpecialty {
  return {
    id,
    label,
    icon: id,
    effect: {},
    desc: `${label} effect`,
  };
}

function withSpecialty(team: Team, side: 'off' | 'def', specialty: CoordinatorSpecialty): Team {
  const role = side === 'off' ? 'oc' : 'dc';
  team.staff[role] = {
    id: `${role}-1`,
    name: role.toUpperCase(),
    role: role.toUpperCase() as 'OC' | 'DC',
    archetype: side === 'off' ? 'QB Guru' : 'Run Stuffer',
    traits: [],
    ratings: {},
    level: 5,
    specialty75: specialty,
  };
  return team;
}

describe('scheme-fit direct coverage', () => {
  it('maps fit score boundaries into stable tiers', () => {
    expect(fitTierFromScore(90)).toBe('ELITE');
    expect(fitTierFromScore(72)).toBe('STRONG');
    expect(fitTierFromScore(58)).toBe('SOLID');
    expect(fitTierFromScore(45)).toBe('FRINGE');
    expect(fitTierFromScore(44)).toBe('POOR');
  });

  it('calculates weighted scheme scores for supported position profiles', () => {
    const qb = setRatings(makePlayer('qb-fit', 'fit', 'QB', 78), {
      accuracy: 90,
      speed: 80,
      awareness: 70,
    });

    const result = calcSchemeFit(qb, 'spread');

    expect(result).toEqual({
      score: 82,
      grade: 'B+',
      label: 'Good Fit',
      boost: 1,
    });
  });

  it('falls back to neutral grading for unsupported profiles or schemes', () => {
    const kicker = makePlayer('k-neutral', 'fit', 'K', 73);

    expect(calcSchemeFit(kicker, 'spread')).toEqual({
      score: 73,
      grade: 'C',
      label: 'Neutral',
      boost: 0,
    });
    expect(calcSchemeFit(kicker, 'unknown-scheme')).toEqual({
      score: 73,
      grade: 'C',
      label: 'Neutral',
      boost: 0,
    });
  });

  it('detects offense, defense, and other player sides', () => {
    expect(getPlayerSide('QB')).toBe('off');
    expect(getPlayerSide('CB')).toBe('def');
    expect(getPlayerSide('K')).toBe('other');
  });

  it('returns the coordinator specialty for the correct side only', () => {
    const team = makeTeam('fit', 'AFC', 'East', true, 80);
    const offSpec = makeSpecialty('pass_arch', 'Pass Architect');
    const defSpec = makeSpecialty('cov_spec', 'Coverage Specialist');
    withSpecialty(team, 'off', offSpec);
    withSpecialty(team, 'def', defSpec);

    expect(getSpecialtyBonus(team, 'off')).toEqual(offSpec);
    expect(getSpecialtyBonus(team, 'def')).toEqual(defSpec);
    expect(getSpecialtyBonus(team, 'other')).toBeNull();
  });

  it.each([
    ['run_guru', 'RB', 'off', 6],
    ['pass_arch', 'QB', 'off', 6],
    ['rz_spec', 'TE', 'off', 4],
    ['tempo', 'QB', 'off', 3],
    ['blitz_des', 'LB', 'def', 6],
    ['cov_spec', 'S', 'def', 5],
    ['run_stop', 'DL', 'def', 6],
    ['turnover', 'LB', 'def', 2],
  ] as const)('applies %s specialty adjustments for %s players', (specId, pos, side, expected) => {
    const team = makeTeam(`team-${specId}`, 'AFC', 'North', false, 80);
    withSpecialty(team, side, makeSpecialty(specId));
    const player = makePlayer(`player-${specId}`, team.id, pos, 80);

    expect(calcSpecialtyFitAdj(team, player, side)).toBe(expected);
  });

  it('returns zero specialty adjustment when a coordinator has no matching bonus', () => {
    const team = makeTeam('plain', 'AFC', 'South', false, 80);
    const wideout = makePlayer('plain-wr', team.id, 'WR', 80);

    expect(calcSpecialtyFitAdj(team, wideout, 'off')).toBe(0);
    expect(calcSpecialtyFitAdj(team, wideout, 'other')).toBe(0);
  });

  it('clamps personality fit adjustments across positive and negative extremes', () => {
    const team = makeTeam('pers', 'AFC', 'West', false, 80);
    const positive = setPersonality(makePlayer('pers-pos', team.id, 'QB', 80), {
      workEthic: 10,
      loyalty: 10,
      ambition: 10,
    });
    const negative = setPersonality(makePlayer('pers-neg', team.id, 'QB', 80), {
      workEthic: 1,
      loyalty: 1,
      ambition: 1,
    });

    expect(calcPersonalityFitAdj(positive, team)).toBe(4);
    expect(calcPersonalityFitAdj(negative, team)).toBe(-5);
  });

  it('builds a combined identity fit from scheme, specialty, personality, and system fit', () => {
    const team = withSpecialty(makeTeam('combo', 'AFC', 'East', true, 82), 'off', makeSpecialty('pass_arch', 'Pass Architect'));
    const qb = setPersonality(setRatings(makePlayer('combo-qb', team.id, 'QB', 78), {
      accuracy: 90,
      speed: 80,
      awareness: 70,
    }), {
      workEthic: 10,
      loyalty: 10,
      ambition: 5,
    });
    qb.systemFit = 80;

    const fit = calcPlayerIdentityFit(qb, team);

    expect(fit.baseScore).toBe(82);
    expect(fit.specialtyAdj).toBe(6);
    expect(fit.personalityAdj).toBe(5);
    expect(fit.systemAdj).toBe(3);
    expect(fit.totalAdj).toBe(12);
    expect(fit.score).toBe(94);
    expect(fit.letter).toBe('A');
    expect(fit.specialtyId).toBe('pass_arch');
    expect(fit.schemeId).toBe('spread');
  });

  it('returns a neutral summary for empty rosters', () => {
    const team = makeTeam('empty', 'NFC', 'East', false, 75);
    team.roster = [];

    expect(calcTeamFit(team)).toEqual({
      avgFit: 50,
      bestFit: null,
      worstFit: null,
      mismatchCount: 0,
    });
  });

  it('summarizes best fit, worst fit, and starter-only mismatch counts', () => {
    const team = makeTeam('summary', 'NFC', 'South', false, 78);
    const qb = setRatings(makePlayer('summary-qb', team.id, 'QB', 80), {
      accuracy: 90,
      speed: 84,
      awareness: 88,
    });
    const starter = setRatings(makePlayer('summary-wr-starter', team.id, 'WR', 64), {
      routeRunning: 40,
      catching: 42,
      speed: 40,
    });
    starter.isStarter = true;
    const backup = setRatings(makePlayer('summary-wr-backup', team.id, 'WR', 61, false), {
      routeRunning: 35,
      catching: 36,
      speed: 34,
    });
    backup.isStarter = false;
    team.roster = [qb, starter, backup];

    const summary = calcTeamFit(team);

    expect(summary.bestFit?.name).toBe(qb.name);
    expect(summary.worstFit?.name).toBe(backup.name);
    expect(summary.mismatchCount).toBe(1);
    expect(summary.avgFit).toBeGreaterThan(40);
  });

  it('returns starter mismatch warnings sorted from worst fit upward', () => {
    const team = makeTeam('warn', 'NFC', 'North', false, 76);
    const worstStarter = setRatings(makePlayer('warn-worst', team.id, 'WR', 60), {
      routeRunning: 30,
      catching: 32,
      speed: 31,
    });
    const betterStarter = setRatings(makePlayer('warn-better', team.id, 'WR', 63), {
      routeRunning: 45,
      catching: 44,
      speed: 43,
    });
    const ignoredBackup = setRatings(makePlayer('warn-backup', team.id, 'WR', 59, false), {
      routeRunning: 20,
      catching: 20,
      speed: 20,
    });
    team.roster = [worstStarter, betterStarter, ignoredBackup];

    const warnings = getSchemeMismatchWarnings(team);

    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.name).toBe(worstStarter.name);
    expect(warnings[1]?.name).toBe(betterStarter.name);
    expect(warnings.every((warning) => warning.fitScore < 58)).toBe(true);
  });
});
