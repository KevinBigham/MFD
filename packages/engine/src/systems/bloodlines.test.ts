import { describe, expect, it } from 'vitest';
import type { DraftProspect, GameState, PlayerArchiveEntry } from '../types';
import { makeLeagueState } from './test-helpers';
import {
  BLOODLINE_CLASS_CHANCE,
  MAX_BLOODLINES_PER_CLASS,
  assignBloodlinesToDraftClass,
  selectEligibleBloodlineParents,
} from './bloodlines';

function archiveEntry(
  playerId: string,
  peakOvr: number,
  teamHistory: PlayerArchiveEntry['teamHistory'] = [{ teamId: 'afce1', firstYear: 2020, lastYear: 2027 }],
): PlayerArchiveEntry {
  return {
    playerId,
    firstName: playerId,
    lastName: 'Legend',
    name: `${playerId} Legend`,
    positions: ['QB'],
    jerseyNumber: 12,
    peakOvr,
    peakYear: 2025,
    firstYear: 2020,
    lastYear: 2027,
    retirementYear: 2028,
    teamHistory,
  };
}

function prospect(index: number, trueGrade = 82): DraftProspect {
  return {
    id: `prospect-${index}`,
    firstName: 'Draft',
    lastName: `Prospect${index}`,
    pos: 'QB',
    college: 'Test U',
    region: 'south',
    ratings: { awareness: trueGrade, speed: trueGrade, stamina: trueGrade },
    projectedRound: 1,
    scoutGrade: trueGrade - 3,
    trueGrade,
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.1,
    stealProbability: 0.1,
    scoutingReports: [],
    combine: null,
  };
}

function gameWithArchive(): GameState {
  const game = makeLeagueState('draft', 1);
  game.playerArchive = [
    archiveEntry('franchise-qb', 92, [{ teamId: 'afce1', firstYear: 2020, lastYear: 2027 }]),
    archiveEntry('no-team', 95, []),
    archiveEntry('solid-starter', 84, [{ teamId: 'afce2', firstYear: 2020, lastYear: 2023 }]),
    archiveEntry('hof-wr', 81, [{ teamId: 'afce2', firstYear: 2021, lastYear: 2027 }]),
  ];
  game.hallOfFame = [{
    playerId: 'hof-wr',
    name: 'hof-wr Legend',
    position: 'WR',
    inductionYear: 2033,
    peakOvr: 81,
    careerYears: 9,
    score: 95,
    awards: { mvps: 0, allPros: 2, proBowls: 5, championships: 1 },
    highlights: [],
    teams: ['afce2'],
  }];
  return game;
}

describe('bloodlines', () => {
  it('selects only archived high-signal parents with team stints', () => {
    const candidates = selectEligibleBloodlineParents(gameWithArchive());

    expect(candidates.map((candidate) => candidate.playerId)).toEqual(['franchise-qb', 'hof-wr']);
    expect(candidates[0]).toMatchObject({
      playerId: 'franchise-qb',
      primaryTeamId: 'afce1',
      position: 'QB',
      legacyTag: 'famous_name',
    });
  });

  it('uses a five percent class chance and caps generated bloodlines at three prospects', () => {
    expect(BLOODLINE_CLASS_CHANCE).toBe(0.05);
    expect(MAX_BLOODLINES_PER_CLASS).toBe(3);

    const prospects = Array.from({ length: 12 }, (_, index) => prospect(index + 1));
    const assigned = assignBloodlinesToDraftClass(prospects, gameWithArchive(), {
      chance: 1,
      maxPerClass: MAX_BLOODLINES_PER_CLASS,
      rand: () => 0,
    });

    const bloodlines = assigned.filter((entry) => entry.bloodline);
    expect(bloodlines).toHaveLength(3);
    expect(bloodlines.every((entry) => entry.bloodline?.relationship === 'son')).toBe(true);
  });

  it('is deterministic for a fixed seed and leaves prospect grades unchanged', () => {
    const game = gameWithArchive();
    game.seed = 1234;
    game.year = 2034;
    const prospects = Array.from({ length: 90 }, (_, index) => prospect(index + 1, 80 + (index % 8)));

    const left = assignBloodlinesToDraftClass(prospects, game);
    const right = assignBloodlinesToDraftClass(prospects, game);

    expect(left.map((entry) => entry.bloodline ?? null)).toEqual(right.map((entry) => entry.bloodline ?? null));
    expect(left.map((entry) => ({ id: entry.id, scoutGrade: entry.scoutGrade, trueGrade: entry.trueGrade })))
      .toEqual(prospects.map((entry) => ({ id: entry.id, scoutGrade: entry.scoutGrade, trueGrade: entry.trueGrade })));
  });
}
);
