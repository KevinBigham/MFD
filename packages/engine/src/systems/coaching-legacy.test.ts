import { describe, expect, it } from 'vitest';
import type { CoachCareerHistory, StaffMember, StaffRole } from '../types';
import { buildCoachingLegacy } from './coaching-legacy';
import { makeLeagueState } from './test-helpers';

function makeCoach(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: overrides.id ?? 'coach-1',
    name: overrides.name ?? 'Coach Test',
    role: overrides.role ?? 'HC',
    archetype: overrides.archetype ?? 'balanced',
    traits: overrides.traits ?? [],
    ratings: overrides.ratings ?? {
      gameplan: 80,
      development: 78,
      motivation: 76,
      strategy: 79,
    },
    level: overrides.level ?? 5,
    age: overrides.age ?? 48,
    mentorCoachId: overrides.mentorCoachId ?? null,
    disciples: overrides.disciples ?? [],
    yearsUnderMentor: overrides.yearsUnderMentor ?? 0,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<CoachCareerHistory> = {}): CoachCareerHistory {
  return {
    coachId: overrides.coachId ?? 'coach-1',
    name: overrides.name ?? 'Coach Test',
    archetype: overrides.archetype ?? 'balanced',
    age: overrides.age ?? 62,
    seasonsCoached: overrides.seasonsCoached ?? 8,
    wins: overrides.wins ?? 72,
    losses: overrides.losses ?? 56,
    championships: overrides.championships ?? 0,
    awards: overrides.awards ?? 0,
    retired: overrides.retired ?? false,
    teams: overrides.teams ?? [{
      teamId: 'afce1',
      startYear: 2019,
      endYear: 2026,
      wins: overrides.wins ?? 72,
      losses: overrides.losses ?? 56,
      championships: overrides.championships ?? 0,
    }],
  };
}

function setStaff(
  game: ReturnType<typeof makeLeagueState>,
  teamId: string,
  role: StaffRole,
  coach: StaffMember,
): void {
  const team = game.teams[teamId]!;
  if (role === 'HC') team.staff.hc = coach;
  if (role === 'OC') team.staff.oc = coach;
  if (role === 'DC') team.staff.dc = coach;
}

describe('buildCoachingLegacy', () => {
  it('returns zeroed legacy metrics when the root coach has no disciples', () => {
    const game = makeLeagueState('offseason', 1);
    setStaff(game, 'afce1', 'HC', makeCoach({ id: 'root', name: 'Root Coach', disciples: [] }));

    expect(buildCoachingLegacy(game, 'root')).toEqual({
      treeDepth: 0,
      headCoachesProduced: 0,
      coordinatorsPlaced: 0,
      retiredWithEpilogue: 0,
      notableProteges: [],
    });
  });

  it('reports tree depth from the active disciple graph', () => {
    const game = makeLeagueState('offseason', 1);
    setStaff(game, 'afce1', 'HC', makeCoach({ id: 'root', disciples: ['coach-1'] }));
    setStaff(game, 'afce2', 'HC', makeCoach({ id: 'coach-1', mentorCoachId: 'root', disciples: ['coach-2'] }));
    setStaff(game, 'afcn1', 'OC', makeCoach({ id: 'coach-2', role: 'OC', mentorCoachId: 'coach-1', disciples: ['coach-3'] }));
    setStaff(game, 'afcn2', 'DC', makeCoach({ id: 'coach-3', role: 'DC', mentorCoachId: 'coach-2' }));

    const legacy = buildCoachingLegacy(game, 'root');

    expect(legacy.treeDepth).toBe(3);
  });

  it('counts only descendants that currently hold head-coach seats', () => {
    const game = makeLeagueState('offseason', 1);
    setStaff(game, 'afce1', 'HC', makeCoach({ id: 'root', disciples: ['hc-1', 'oc-1', 'retired-1'] }));
    setStaff(game, 'afce2', 'HC', makeCoach({ id: 'hc-1', mentorCoachId: 'root' }));
    setStaff(game, 'afcn1', 'OC', makeCoach({ id: 'oc-1', role: 'OC', mentorCoachId: 'root' }));
    game.coachingHistory = [
      makeHistory({ coachId: 'hc-1', name: 'Active HC', championships: 2 }),
      makeHistory({ coachId: 'oc-1', name: 'Active OC', championships: 1 }),
      makeHistory({ coachId: 'retired-1', name: 'Retired Coach', retired: true, championships: 4 }),
    ];

    const legacy = buildCoachingLegacy(game, 'root');

    expect(legacy.headCoachesProduced).toBe(1);
  });

  it('counts only active coordinators in OC and DC seats', () => {
    const game = makeLeagueState('offseason', 1);
    setStaff(game, 'afce1', 'HC', makeCoach({ id: 'root', disciples: ['oc-1', 'dc-1', 'hc-1'] }));
    setStaff(game, 'afce2', 'OC', makeCoach({ id: 'oc-1', role: 'OC', mentorCoachId: 'root' }));
    setStaff(game, 'afcn1', 'DC', makeCoach({ id: 'dc-1', role: 'DC', mentorCoachId: 'root' }));
    setStaff(game, 'afcn2', 'HC', makeCoach({ id: 'hc-1', mentorCoachId: 'root' }));

    const legacy = buildCoachingLegacy(game, 'root');

    expect(legacy.coordinatorsPlaced).toBe(2);
  });

  it('requires both retired history and a matching retirement event to count epilogues', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2028;
    setStaff(game, 'afce1', 'HC', makeCoach({ id: 'root', disciples: ['retired-1', 'retired-2', 'retired-3'] }));
    game.coachingHistory = [
      makeHistory({ coachId: 'retired-1', name: 'Eligible Retiree', retired: true }),
      makeHistory({ coachId: 'retired-2', name: 'Missing Flag', retired: false }),
      makeHistory({ coachId: 'retired-3', name: 'Missing Event', retired: true }),
    ];
    game.eventLog = [
      {
        id: 'event-1',
        type: 'coach_retirement',
        timestamp: 2027_001,
        description: 'Eligible Retiree heads to TV.',
        data: { coachId: 'retired-1', epilogue: 'broadcasting' },
      },
      {
        id: 'event-2',
        type: 'coach_retirement',
        timestamp: 2027_002,
        description: 'Missing Flag retires.',
        data: { coachId: 'retired-2', epilogue: 'retired_in_place' },
      },
    ];

    const legacy = buildCoachingLegacy(game, 'root');

    expect(legacy.retiredWithEpilogue).toBe(1);
  });

  it('limits notable proteges to five entries sorted by championships then seasons', () => {
    const game = makeLeagueState('offseason', 1);
    setStaff(game, 'afce1', 'HC', makeCoach({
      id: 'root',
      disciples: ['coach-a', 'coach-b', 'coach-c', 'coach-d', 'coach-e', 'coach-f'],
    }));
    setStaff(game, 'afce2', 'HC', makeCoach({ id: 'coach-a', mentorCoachId: 'root' }));
    setStaff(game, 'afcn1', 'OC', makeCoach({ id: 'coach-b', role: 'OC', mentorCoachId: 'root' }));
    setStaff(game, 'afcn2', 'DC', makeCoach({ id: 'coach-c', role: 'DC', mentorCoachId: 'root' }));
    setStaff(game, 'afcs1', 'HC', makeCoach({ id: 'coach-d', mentorCoachId: 'root' }));
    setStaff(game, 'afcs2', 'OC', makeCoach({ id: 'coach-e', role: 'OC', mentorCoachId: 'root' }));
    setStaff(game, 'afcw1', 'DC', makeCoach({ id: 'coach-f', role: 'DC', mentorCoachId: 'root' }));
    game.coachingHistory = [
      makeHistory({ coachId: 'coach-a', name: 'Coach A', championships: 3, seasonsCoached: 10 }),
      makeHistory({ coachId: 'coach-b', name: 'Coach B', championships: 3, seasonsCoached: 8 }),
      makeHistory({ coachId: 'coach-c', name: 'Coach C', championships: 2, seasonsCoached: 11 }),
      makeHistory({ coachId: 'coach-d', name: 'Coach D', championships: 2, seasonsCoached: 6 }),
      makeHistory({ coachId: 'coach-e', name: 'Coach E', championships: 1, seasonsCoached: 9 }),
      makeHistory({ coachId: 'coach-f', name: 'Coach F', championships: 0, seasonsCoached: 12 }),
    ];

    const legacy = buildCoachingLegacy(game, 'root');

    expect(legacy.notableProteges).toHaveLength(5);
    expect(legacy.notableProteges.map((entry) => entry.coachId)).toEqual([
      'coach-a',
      'coach-b',
      'coach-c',
      'coach-d',
      'coach-e',
    ]);
    expect(legacy.notableProteges[0]).toMatchObject({
      coachId: 'coach-a',
      name: 'Coach A',
      teamAbbr: 'AFC',
      role: 'HC',
      championships: 3,
    });
  });
});
