import { describe, expect, it } from 'vitest';
import type { HallOfFameEntry } from '../types';
import {
  generateAwardsNight,
  generateChampionshipCeremony,
  generateHOFInduction,
  generateRingCeremony,
  recordCeremony,
} from './ceremonies';
import { generateAwards } from './awards';
import { makeLeagueState } from './test-helpers';

function makeInductee(overrides: Partial<HallOfFameEntry> = {}): HallOfFameEntry {
  return {
    playerId: 'hof-1',
    name: 'Legend Player',
    position: 'QB',
    inductionYear: 2027,
    peakOvr: 97,
    careerYears: 14,
    score: 99,
    awards: {
      mvps: 2,
      allPros: 6,
      proBowls: 9,
      championships: 2,
    },
    highlights: ['Peak 97 OVR', '2 MVP', '2 championships'],
    teams: ['afce1'],
    ...overrides,
  };
}

describe('ceremonies', () => {
  it('championship ceremony includes the playoff path', () => {
    const game = makeLeagueState('playoffs', 22);
    game.playoffBracket = {
      season: 2026,
      afc: [],
      nfc: [],
      championTeamId: 'afce1',
      matchups: [
        {
          id: 'sb',
          round: 'super_bowl',
          conference: 'NFL',
          week: 22,
          homeTeamId: 'afce1',
          awayTeamId: 'nfce1',
          winnerTeamId: 'afce1',
          result: {
            id: 'sb-result',
            homeTeamId: 'afce1',
            awayTeamId: 'nfce1',
            homeScore: 31,
            awayScore: 20,
            week: 22,
            year: 2026,
            overtime: false,
            mvpPlayerId: game.teams.afce1.roster[0]!.id,
            stats: {},
            weather: 'clear',
            matchupHighlight: null,
          },
        },
      ],
    };

    const ceremony = generateChampionshipCeremony(game, 'afce1');

    expect(ceremony.headline).toContain('championship');
    expect(ceremony.description).toContain('31-20');
    expect(ceremony.highlights.some((highlight) => highlight.label.toLowerCase().includes('playoff path'))).toBe(true);
  });

  it('awards night includes the major award categories', () => {
    const game = makeLeagueState('offseason');
    generateAwards(game, 2026);

    const ceremony = generateAwardsNight(game);

    expect(ceremony.highlights.some((highlight) => highlight.label === 'MVP')).toBe(true);
    expect(ceremony.highlights.some((highlight) => highlight.label === 'Coach of the Year')).toBe(true);
  });

  it('hall of fame induction includes career highlights', () => {
    const game = makeLeagueState('offseason');

    const ceremony = generateHOFInduction(game, [makeInductee()]);

    expect(ceremony.highlights[0]?.value).toContain('Peak 97 OVR');
  });

  it('hall of fame induction prefers saved epilogue copy when present', () => {
    const game = makeLeagueState('offseason');

    const ceremony = generateHOFInduction(game, [
      makeInductee({
        epilogue: {
          playerId: 'hof-1',
          playerName: 'Legend Player',
          category: 'broadcasting',
          headline: 'Legend Player takes the booth',
          story: 'The retired quarterback turns film study into appointment television.',
        },
      }),
    ]);

    expect(ceremony.highlights[0]?.label).toBe('Legend Player');
    expect(ceremony.highlights[0]?.value).toContain('Legend Player takes the booth');
    expect(ceremony.highlights[0]?.value).toContain('turns film study into appointment television');
    expect(ceremony.highlights[0]?.value).not.toContain('Peak 97 OVR');
  });

  it('ring ceremony triggers in week one for defending champions', () => {
    const game = makeLeagueState('regular_season', 1);
    game.franchiseHistory.push({
      year: 2025,
      teamId: 'afce1',
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 120,
      playoffFinish: 'champion',
      majorEvents: ['Won the championship.'],
      awardsWon: [],
      recordsBroken: [],
    });

    const ceremony = generateRingCeremony(game, 'afce1');

    expect(ceremony).not.toBeNull();
    expect(ceremony?.headline).toContain('Ring');
  });

  it('ceremonies are trimmed to twenty max', () => {
    const game = makeLeagueState('offseason');

    for (let index = 0; index < 25; index += 1) {
      recordCeremony(game, {
        id: `ceremony-${index}`,
        type: 'awards_night',
        year: 2026 + index,
        headline: `Awards ${index}`,
        description: 'Desc',
        highlights: [],
        mvp: null,
      });
    }

    expect(game.ceremonies).toHaveLength(20);
    expect(game.ceremonies[0]?.id).toBe('ceremony-5');
  });
});
