import { describe, expect, it } from 'vitest';
import {
  assignJerseyNumber,
  detectRetirementCandidates,
  generateFarewellMoment,
  generateJerseyRetirement,
  shouldRetireJersey,
  startFarewellTour,
} from './jersey-retirement';
import { makeTeam } from './test-helpers';

describe('jersey retirement and farewell system', () => {
  it('detects retirement candidates by age and experience', () => {
    const team = makeTeam('retire', 'AFC', 'East', true, 82);
    const player = team.roster[0]!;
    player.age = 37;
    player.yearsExp = 12;

    const candidates = detectRetirementCandidates(team, {});

    expect(candidates.map((entry) => entry.id)).toContain(player.id);
  });

  it('builds farewell tours with three to five moments including the final home and final game', () => {
    const team = makeTeam('tour', 'AFC', 'East', true, 82);
    const player = team.roster[0]!;
    const schedule = [
      { week: 14, homeTeamId: team.id, awayTeamId: 'opp-1', result: null, primetime: false },
      { week: 15, homeTeamId: 'opp-2', awayTeamId: team.id, result: null, primetime: true },
      { week: 16, homeTeamId: team.id, awayTeamId: 'opp-3', result: null, primetime: false },
      { week: 17, homeTeamId: 'opp-4', awayTeamId: team.id, result: null, primetime: true },
    ] as any;
    const teamsById = {
      'opp-1': { city: 'Detroit', name: 'Dragons', division: 'North' },
      'opp-2': { city: 'Boston', name: 'Guard', division: 'East' },
      'opp-3': { city: 'Miami', name: 'Storm', division: 'South' },
      'opp-4': { city: 'Seattle', name: 'Surge', division: 'West' },
    } as any;

    const tour = startFarewellTour(player, team, 14, () => 0.1, schedule, teamsById);

    expect(tour.moments.length).toBeGreaterThanOrEqual(3);
    expect(tour.moments.length).toBeLessThanOrEqual(5);
    expect(tour.moments.some((moment) => moment.type === 'final_home_game')).toBe(true);
    expect(tour.moments.some((moment) => moment.type === 'final_game')).toBe(true);
  });

  it('qualifies a player for jersey retirement with tenure and peak OVR', () => {
    const team = makeTeam('legacy', 'AFC', 'East', true, 82);
    const archived = {
      playerId: 'p1',
      firstName: 'Marcus',
      lastName: 'Cole',
      name: 'Marcus Cole',
      positions: ['QB'],
      jerseyNumber: 12,
      peakOvr: 91,
      peakYear: 2028,
      firstYear: 2020,
      lastYear: 2029,
      retirementYear: 2030,
      teamHistory: [{ teamId: team.id, firstYear: 2020, lastYear: 2029 }],
      careerStats: { seasons: 10, gp: 170, snaps: 10000 },
    } as const;

    expect(shouldRetireJersey(archived, team, [])).toBe(true);
  });

  it('generates ceremony copy that includes the player and team', () => {
    const team = makeTeam('ceremony', 'AFC', 'East', true, 82);
    const archived = {
      playerId: 'p1',
      firstName: 'Marcus',
      lastName: 'Cole',
      name: 'Marcus Cole',
      positions: ['QB'],
      jerseyNumber: 12,
      peakOvr: 91,
      peakYear: 2028,
      firstYear: 2020,
      lastYear: 2029,
      retirementYear: 2030,
      teamHistory: [{ teamId: team.id, firstYear: 2020, lastYear: 2029 }],
      careerStats: { seasons: 10, gp: 170, snaps: 10000 },
    } as const;

    const ceremony = generateJerseyRetirement(archived, team, 2031, () => 0.2);

    expect(ceremony.headline).toContain(team.city);
    expect(ceremony.ceremony).toContain('Marcus Cole');
  });

  it('blocks retired jersey numbers when assigning new numbers', () => {
    const team = makeTeam('numbers', 'AFC', 'East', true, 82);
    team.retiredJerseys = [
      { id: 'jr-1', playerId: 'old', playerName: 'Old Vet', pos: 'QB', jerseyNumber: 12, teamId: team.id, year: 2030, peakOvr: 90, seasonsWithTeam: 10, championships: 2, headline: '', ceremony: '', legacyScore: 99 },
    ];
    const incoming = team.roster[1]!;
    incoming.pos = 'QB';
    incoming.jerseyNumber = 12;

    const assigned = assignJerseyNumber(team, incoming);

    expect(assigned).not.toBe(12);
  });

  it('only emits farewell moments on their scheduled weeks', () => {
    const team = makeTeam('moment', 'AFC', 'East', true, 82);
    const tour = {
      playerId: 'p1',
      playerName: 'Marcus Cole',
      teamId: team.id,
      finalSeason: true,
      announcedWeek: 10,
      moments: [
        { week: 15, type: 'standing_ovation' as const, narrative: 'A standing ovation.', opponent: 'Detroit Dragons' },
      ],
    };
    const opponent = makeTeam('opp', 'NFC', 'North', false, 78);

    expect(generateFarewellMoment(tour, 15, opponent, () => 0.1)).not.toBeNull();
    expect(generateFarewellMoment(tour, 14, opponent, () => 0.1)).toBeNull();
  });
});
