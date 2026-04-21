import { describe, expect, it } from 'vitest';
import { RNG, mulberry32 } from '../rng';
import type { CoachCareerHistory, StaffMember, StaffRole, Team } from '../types';
import { applyCoachRetirement } from './coach-retirement';
import { advanceOffseason } from './offseason';
import { makeLeagueState } from './test-helpers';

function makeCoach(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: overrides.id ?? 'coach-1',
    name: overrides.name ?? 'Coach Test',
    role: overrides.role ?? 'HC',
    archetype: overrides.archetype ?? 'balanced',
    traits: overrides.traits ?? [],
    ratings: overrides.ratings ?? {
      gameplan: 82,
      development: 78,
      motivation: 76,
      strategy: 80,
    },
    level: overrides.level ?? 5,
    age: overrides.age ?? 70,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<CoachCareerHistory> = {}): CoachCareerHistory {
  return {
    coachId: overrides.coachId ?? 'coach-1',
    name: overrides.name ?? 'Coach Test',
    archetype: overrides.archetype ?? 'balanced',
    age: overrides.age ?? 70,
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

function setCoach(gameRole: 'HC' | 'OC' | 'DC' = 'HC') {
  const game = makeLeagueState('offseason', 1);
  game.year = 2027;
  game.week = 1;
  const team = game.teams.afce1!;
  const coach = makeCoach({ role: gameRole, age: 70 });
  assignTeamCoach(team, coach, gameRole);
  team.wins = 10;
  team.losses = 7;
  return { game, team, coach };
}

function assignTeamCoach(team: Team, coach: StaffMember, role: StaffRole): void {
  if (role === 'HC') team.staff.hc = coach;
  if (role === 'OC') team.staff.oc = coach;
  if (role === 'DC') team.staff.dc = coach;

  team.coachingStaff.hc = team.staff.hc ? {
    id: team.staff.hc.id,
    firstName: 'Coach',
    lastName: 'Test',
    role: 'HC',
    archetype: team.staff.hc.archetype,
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 60,
    tenure: 1,
  } : null;
  team.coachingStaff.oc = team.staff.oc ? {
    id: team.staff.oc.id,
    firstName: 'Coach',
    lastName: 'Test',
    role: 'OC',
    archetype: team.staff.oc.archetype,
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 60,
    tenure: 1,
  } : null;
  team.coachingStaff.dc = team.staff.dc ? {
    id: team.staff.dc.id,
    firstName: 'Coach',
    lastName: 'Test',
    role: 'DC',
    archetype: team.staff.dc.archetype,
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 60,
    tenure: 1,
  } : null;
}

function seedLeagueStaff(game: ReturnType<typeof makeLeagueState>): void {
  for (const team of Object.values(game.teams)) {
    assignTeamCoach(team, makeCoach({ id: `${team.id}-hc`, name: `${team.city} HC`, role: 'HC', age: 49 }), 'HC');
    assignTeamCoach(team, makeCoach({ id: `${team.id}-oc`, name: `${team.city} OC`, role: 'OC', age: 44 }), 'OC');
    assignTeamCoach(team, makeCoach({ id: `${team.id}-dc`, name: `${team.city} DC`, role: 'DC', age: 45 }), 'DC');
  }
}

function setLosingHistory(game: ReturnType<typeof makeLeagueState>, teamId: string): void {
  game.franchiseHistory = [
    {
      year: 2024,
      teamId,
      wins: 4,
      losses: 13,
      ties: 0,
      record: '4-13',
      pointDifferential: -102,
      playoffFinish: 'missed',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year: 2025,
      teamId,
      wins: 5,
      losses: 12,
      ties: 0,
      record: '5-12',
      pointDifferential: -88,
      playoffFinish: 'missed',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year: 2026,
      teamId,
      wins: 3,
      losses: 14,
      ties: 0,
      record: '3-14',
      pointDifferential: -131,
      playoffFinish: 'missed',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
  ];
}

function latestRetirementEvent(game: ReturnType<typeof makeLeagueState>) {
  return game.eventLog.filter((event) => event.type === 'coach_retirement').at(-1) ?? null;
}

describe('applyCoachRetirement', () => {
  it('marks coaching history as retired when the retirement roll triggers', () => {
    const { game, coach } = setCoach('HC');

    applyCoachRetirement(game, 'afce1', 'HC', () => 0);

    const history = game.coachingHistory.find((entry) => entry.coachId === coach.id);
    expect(history?.retired).toBe(true);
  });

  it('emits exactly one coach_retirement event with the expected shape', () => {
    const { game, coach } = setCoach('HC');

    applyCoachRetirement(game, 'afce1', 'HC', () => 0);

    const retirementEvents = game.eventLog.filter((event) => event.type === 'coach_retirement');
    expect(retirementEvents).toHaveLength(1);
    expect(retirementEvents[0]).toMatchObject({
      type: 'coach_retirement',
      data: {
        coachId: coach.id,
        epilogue: 'broadcasting',
        yearsCoached: 1,
        championships: 0,
        label: 'ESPN Analyst',
      },
    });
  });

  it('hits all four epilogue paths across 1000 seeded rolls', () => {
    const counts = {
      broadcasting: 0,
      front_office: 0,
      college: 0,
      retired_in_place: 0,
    } as const satisfies Record<string, number>;
    const mutableCounts: Record<keyof typeof counts, number> = { ...counts };

    for (let seed = 1; seed <= 1000; seed += 1) {
      const { game } = setCoach('HC');
      game.teams.afce1!.staff.hc = makeCoach({ age: 85 });
      const rng = mulberry32(seed);
      applyCoachRetirement(game, 'afce1', 'HC', rng);
      const event = latestRetirementEvent(game);
      if (!event) continue;
      const epilogue = event.data['epilogue'] as keyof typeof mutableCounts;
      mutableCounts[epilogue] += 1;
    }

    expect(mutableCounts.broadcasting).toBeGreaterThanOrEqual(50);
    expect(mutableCounts.front_office).toBeGreaterThanOrEqual(50);
    expect(mutableCounts.college).toBeGreaterThanOrEqual(50);
    expect(mutableCounts.retired_in_place).toBeGreaterThanOrEqual(50);
  });

  it('skews successful coaches toward broadcasting and college exits', () => {
    let retirementCount = 0;
    let favoredCount = 0;

    for (let seed = 1; seed <= 1000; seed += 1) {
      const { game, coach } = setCoach('HC');
      game.teams.afce1!.staff.hc = makeCoach({ ...coach, age: 85 });
      game.coachingHistory = [makeHistory({
        coachId: coach.id,
        name: coach.name,
        championships: 3,
        wins: 98,
        losses: 54,
      })];
      const rng = mulberry32(seed);
      applyCoachRetirement(game, 'afce1', 'HC', rng);
      const event = latestRetirementEvent(game);
      if (!event) continue;
      retirementCount += 1;
      const epilogue = event.data['epilogue'];
      if (epilogue === 'broadcasting' || epilogue === 'college') {
        favoredCount += 1;
      }
    }

    expect(retirementCount).toBeGreaterThan(0);
    expect(favoredCount / retirementCount).toBeGreaterThan(0.6);
  });

  it('skews losing coaches toward retiring in place', () => {
    let retirementCount = 0;
    let retiredInPlaceCount = 0;

    for (let seed = 1; seed <= 1000; seed += 1) {
      const { game, coach } = setCoach('HC');
      game.teams.afce1!.staff.hc = makeCoach({ ...coach, age: 85 });
      game.coachingHistory = [makeHistory({
        coachId: coach.id,
        name: coach.name,
        championships: 0,
        wins: 44,
        losses: 61,
      })];
      const rng = mulberry32(seed);
      applyCoachRetirement(game, 'afce1', 'HC', rng);
      const event = latestRetirementEvent(game);
      if (!event) continue;
      retirementCount += 1;
      if (event.data['epilogue'] === 'retired_in_place') {
        retiredInPlaceCount += 1;
      }
    }

    expect(retirementCount).toBeGreaterThan(0);
    expect(retiredInPlaceCount / retirementCount).toBeGreaterThan(0.4);
  });

  it('removes the coach from team staff after retirement', () => {
    const { game } = setCoach('OC');

    applyCoachRetirement(game, 'afce1', 'OC', () => 0);

    expect(game.teams.afce1!.staff.oc).toBeNull();
    expect(game.teams.afce1!.coachingStaff.oc).toBeNull();
  });

  it('advanceOffseason retires an old head coach and fills the vacancy in the same pass', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedLeagueStaff(game);
    setLosingHistory(game, 'afce2');

    const oldCoach = makeCoach({
      id: 'old-hc',
      name: 'Old Head Coach',
      role: 'HC',
      age: 85,
      archetype: 'strategist',
    });
    assignTeamCoach(game.teams.afce2!, oldCoach, 'HC');
    game.coachingHistory = [
      makeHistory({
        coachId: oldCoach.id,
        name: oldCoach.name,
        age: 85,
        seasonsCoached: 12,
        wins: 51,
        losses: 110,
      }),
    ];

    const originalAi = RNG.ai;
    RNG.ai = () => 0;
    try {
      advanceOffseason(game);
    } finally {
      RNG.ai = originalAi;
    }

    expect(game.eventLog.some((event) =>
      event.type === 'coach_retirement' && event.data['coachId'] === oldCoach.id
    )).toBe(true);
    expect(game.teams.afce2!.staff.hc).not.toBeNull();
    expect(game.teams.afce2!.staff.hc?.id).not.toBe(oldCoach.id);
  });

  it('advanceOffseason backfills coordinator retirements from the coaching market', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedLeagueStaff(game);
    setLosingHistory(game, 'afcn1');

    const oldCoordinator = makeCoach({
      id: 'old-oc',
      name: 'Old Coordinator',
      role: 'OC',
      age: 85,
      archetype: 'strategist',
    });
    assignTeamCoach(game.teams.afcn1!, oldCoordinator, 'OC');
    game.coachingHistory = [
      makeHistory({
        coachId: oldCoordinator.id,
        name: oldCoordinator.name,
        age: 85,
        seasonsCoached: 10,
        wins: 42,
        losses: 99,
      }),
    ];

    const originalAi = RNG.ai;
    RNG.ai = () => 0;
    try {
      advanceOffseason(game);
    } finally {
      RNG.ai = originalAi;
    }

    expect(game.eventLog.some((event) =>
      event.type === 'coach_retirement' && event.data['coachId'] === oldCoordinator.id
    )).toBe(true);
    expect(game.teams.afcn1!.staff.oc).not.toBeNull();
    expect(game.teams.afcn1!.staff.oc?.id).not.toBe(oldCoordinator.id);
  });
});
