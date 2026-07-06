import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { seedPlayoffBracket } from './playoff-bracket';
import { makeLeagueState } from './test-helpers';

function emptySchedule(weeks: number) {
  return Array.from({ length: weeks }, (_, index) => ({ week: index + 1, games: [] }));
}

function applyRecords(game: GameState) {
  const records: Record<string, [number, number, number]> = {
    afce1: [13, 4, 120],
    afce2: [10, 7, 40],
    afcn1: [12, 5, 80],
    afcn2: [10, 7, 30],
    afcs1: [11, 6, 55],
    afcs2: [8, 9, -20],
    afcw1: [11, 6, 60],
    afcw2: [10, 7, 30],
    nfce1: [14, 3, 110],
    nfce2: [9, 8, 10],
    nfcn1: [12, 5, 70],
    nfcn2: [10, 7, 25],
    nfcs1: [11, 6, 50],
    nfcs2: [8, 9, -25],
    nfcw1: [11, 6, 50],
    nfcw2: [10, 7, 25],
  };

  for (const [teamId, [wins, losses, pointDifferential]] of Object.entries(records)) {
    game.teams[teamId]!.wins = wins;
    game.teams[teamId]!.losses = losses;
    game.teams[teamId]!.seasonStats.pointDifferential = pointDifferential;
  }
}

describe('playoff bracket league rule overrides', () => {
  it('supports six seeds per conference with two byes', () => {
    const game = makeLeagueState('regular_season', 19);
    applyRecords(game);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'playoff_seeds_per_conf',
      newValue: 6,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Tighten the field.',
    });

    const bracket = seedPlayoffBracket(game);

    expect(bracket.afc).toHaveLength(6);
    expect(bracket.nfc).toHaveLength(6);
    expect(bracket.matchups.filter((matchup) => matchup.round === 'wild_card' && matchup.conference === 'AFC')).toHaveLength(2);
  });

  it('supports eight seeds per conference with no byes', () => {
    const game = makeLeagueState('regular_season', 19);
    applyRecords(game);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'playoff_seeds_per_conf',
      newValue: 8,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Expand the field.',
    });

    const bracket = seedPlayoffBracket(game);

    expect(bracket.afc).toHaveLength(8);
    expect(bracket.nfc).toHaveLength(8);
    expect(bracket.matchups.filter((matchup) => matchup.round === 'wild_card' && matchup.conference === 'NFC')).toHaveLength(4);
  });

  it('starts the wild card after the generated regular-season schedule', () => {
    const game = makeLeagueState('regular_season', 19);
    applyRecords(game);
    game.schedule = emptySchedule(19);

    const bracket = seedPlayoffBracket(game);

    expect(bracket.matchups.every((matchup) => matchup.round === 'wild_card')).toBe(true);
    expect(bracket.matchups.every((matchup) => matchup.week === 20)).toBe(true);
  });
});
