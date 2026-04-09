import { describe, expect, it } from 'vitest';
import type { GameResult } from '../types';
import { buildWeeklySummary } from './weekly-summary';
import { makeTeam } from './test-helpers';

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'game-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeScore: 24,
    awayScore: 17,
    week: 5,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'mvp-1',
    stats: {},
    playerMatchupEvents: [],
    ...overrides,
  };
}

describe('weekly-summary direct coverage', () => {
  it('builds home-win summaries with the correct result, score, and headline', () => {
    const team = makeTeam('home', 'AFC', 'East', true, 82);
    team.city = 'Chicago';
    team.name = 'Blues';
    team.wins = 5;
    team.losses = 2;
    const opponent = makeTeam('away', 'AFC', 'West', false, 77);

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: makeResult({ homeTeamId: team.id, awayTeamId: opponent.id }),
      year: 2026,
      week: 5,
      phase: 'regular_season',
      ownerDelta: 3,
      injuries: [],
      notes: ['Big divisional win'],
    });

    expect(summary.result).toBe('win');
    expect(summary.teamScore).toBe(24);
    expect(summary.opponentScore).toBe(17);
    expect(summary.record).toBe('5-2');
    expect(summary.headline).toBe('Week 5: Chicago Blues beat AWAY Club 24-17');
  });

  it('builds away-loss summaries using the away score line', () => {
    const team = makeTeam('away', 'NFC', 'North', true, 80);
    team.wins = 4;
    team.losses = 3;
    const opponent = makeTeam('home', 'NFC', 'South', false, 79);

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: makeResult({ homeTeamId: opponent.id, awayTeamId: team.id, homeScore: 31, awayScore: 21 }),
      year: 2026,
      week: 8,
      phase: 'regular_season',
      ownerDelta: -2,
      injuries: [],
      notes: [],
    });

    expect(summary.result).toBe('loss');
    expect(summary.teamScore).toBe(21);
    expect(summary.opponentScore).toBe(31);
    expect(summary.headline).toContain('fell to');
  });

  it('renders ties with the drew wording and tie-inclusive records', () => {
    const team = makeTeam('home', 'AFC', 'North', true, 80);
    team.wins = 3;
    team.losses = 3;
    team.ties = 1;
    const opponent = makeTeam('away', 'AFC', 'South', false, 76);

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: makeResult({ homeTeamId: team.id, awayTeamId: opponent.id, homeScore: 20, awayScore: 20 }),
      year: 2026,
      week: 7,
      phase: 'regular_season',
      ownerDelta: 0,
      injuries: [],
      notes: [],
    });

    expect(summary.result).toBe('tie');
    expect(summary.record).toBe('3-3-1');
    expect(summary.headline).toContain('drew');
  });

  it('uses a bye-week pending headline when no result is available', () => {
    const team = makeTeam('bye', 'NFC', 'East', true, 81);
    team.wins = 6;
    team.losses = 2;

    const summary = buildWeeklySummary({
      team,
      opponent: null,
      result: null,
      year: 2026,
      week: 9,
      phase: 'regular_season',
      ownerDelta: 1,
      injuries: [],
      notes: ['Rest advantage next week'],
    });

    expect(summary.result).toBe('pending');
    expect(summary.opponentName).toBe('Bye Week');
    expect(summary.teamScore).toBeNull();
    expect(summary.headline).toBe('Week 9: BYE Club await Bye Week');
  });

  it('defaults playoff summaries to the playoff result label', () => {
    const team = makeTeam('play', 'AFC', 'East', true, 84);
    const opponent = makeTeam('opp', 'AFC', 'North', false, 79);

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: makeResult({ homeTeamId: team.id, awayTeamId: opponent.id }),
      year: 2026,
      week: 20,
      phase: 'playoffs',
      ownerDelta: 4,
      injuries: [],
      notes: [],
    });

    expect(summary.headline.startsWith('Playoff Result:')).toBe(true);
  });

  it('lets explicit labels override the default prefix', () => {
    const team = makeTeam('label', 'NFC', 'West', true, 82);
    const opponent = makeTeam('opp', 'NFC', 'South', false, 77);

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: makeResult({ homeTeamId: team.id, awayTeamId: opponent.id }),
      year: 2026,
      week: 18,
      phase: 'regular_season',
      ownerDelta: 2,
      injuries: [],
      notes: [],
      label: 'Wildcard Clincher',
    });

    expect(summary.headline.startsWith('Wildcard Clincher:')).toBe(true);
  });
});
