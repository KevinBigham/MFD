import { describe, expect, it } from 'vitest';
import type { AlumniMentor } from './alumni-mentors';
import {
  calculateMentorEffects,
  fireMentor,
  getAvailableMentors,
  hireMentor,
} from './alumni-mentors';
import { makeLeagueState, makePlayer } from './test-helpers';

function retiredLegend(playerId: string, teamId: string, pos: 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S', peakOvr: number) {
  return {
    playerId,
    firstName: 'Retired',
    lastName: playerId,
    name: `Retired ${playerId}`,
    positions: [pos],
    jerseyNumber: 12,
    peakOvr,
    peakYear: 2026,
    firstYear: 2020,
    lastYear: 2030,
    retirementYear: 2030,
    teamHistory: [{ teamId, firstYear: 2020, lastYear: 2030 }],
    careerStats: {
      gp: 160,
      seasons: 11,
      mvps: peakOvr >= 95 ? 1 : 0,
      allPros: peakOvr >= 90 ? 3 : 1,
      proBowls: 4,
      championships: peakOvr >= 90 ? 1 : 0,
    },
  };
}

function mentor(overrides: Partial<AlumniMentor> = {}): AlumniMentor {
  return {
    playerId: 'mentor-1',
    name: 'Mentor One',
    position: 'WR',
    peakOvr: 92,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2031,
    salary: 0.5,
    ...overrides,
  };
}

describe('alumni mentor network', () => {
  it('sources available mentors from retired franchise legends', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.playerArchive = [
      retiredLegend('legend-qb', userTeam.id, 'QB', 96),
      retiredLegend('legend-wr', userTeam.id, 'WR', 91),
    ];

    const mentors = getAvailableMentors(game);

    expect(mentors.some((entry) => entry.playerId === 'legend-qb')).toBe(true);
  });

  it('scales mentor rating from peak overall', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.playerArchive = [
      retiredLegend('legend-low', userTeam.id, 'QB', 60),
      retiredLegend('legend-high', userTeam.id, 'QB', 99),
    ];

    const mentors = getAvailableMentors(game);
    const low = mentors.find((entry) => entry.playerId === 'legend-low')!;
    const high = mentors.find((entry) => entry.playerId === 'legend-high')!;

    expect(low.mentorRating).toBe(1);
    expect(high.mentorRating).toBe(4);
    expect(high.mentorRating).toBeGreaterThan(low.mentorRating);
  });

  it('adds a hired mentor to the active list', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [retiredLegend('legend-qb', userTeam.id, 'QB', 96)];

    const nextState = hireMentor(game, 'legend-qb');

    expect(nextState.activeMentors?.map((entry) => entry.playerId)).toEqual(['legend-qb']);
  });

  it('deducts mentor salary from the runtime mentor budget on hire', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.playerArchive = [retiredLegend('legend-qb', userTeam.id, 'QB', 96)];

    const nextState = hireMentor(game, 'legend-qb');

    expect(nextState.mentorBudget).toBe(2);
  });

  it('removes a mentor from the active list when fired', () => {
    const game = makeLeagueState('offseason');
    game.activeMentors = [mentor()];

    const nextState = fireMentor(game, 'mentor-1');

    expect(nextState.activeMentors).toEqual([]);
  });

  it('targets compatible position groups when calculating mentor effects', () => {
    const effects = calculateMentorEffects(
      [mentor({ position: 'WR', specialty: 'technique' })],
      [
        makePlayer('wr-target', 'afce1', 'WR', 78),
        makePlayer('te-target', 'afce1', 'TE', 75),
        makePlayer('qb-target', 'afce1', 'QB', 80),
      ],
    );

    expect(effects.map((effect) => effect.targetPlayerId)).toContain('wr-target');
    expect(effects.map((effect) => effect.targetPlayerId)).toContain('te-target');
    expect(effects.map((effect) => effect.targetPlayerId)).not.toContain('qb-target');
  });

  it('limits each mentor to three affected players', () => {
    const effects = calculateMentorEffects(
      [mentor({ position: 'QB', specialty: 'technique' })],
      [
        makePlayer('qb-1', 'afce1', 'QB', 76),
        makePlayer('qb-2', 'afce1', 'QB', 75),
        makePlayer('qb-3', 'afce1', 'QB', 74),
        makePlayer('qb-4', 'afce1', 'QB', 73),
      ],
    );

    expect(effects).toHaveLength(3);
  });

  it('scales development bonuses with mentor rating', () => {
    const roster = [makePlayer('wr-1', 'afce1', 'WR', 78)];
    const lowEffect = calculateMentorEffects([mentor({ playerId: 'low', mentorRating: 1 })], roster)[0]!;
    const highEffect = calculateMentorEffects([mentor({ playerId: 'high', mentorRating: 5 })], roster)[0]!;

    expect(highEffect.devBonus).toBeGreaterThan(lowEffect.devBonus);
    expect(highEffect.traitChance).toBeGreaterThan(lowEffect.traitChance);
  });
});
