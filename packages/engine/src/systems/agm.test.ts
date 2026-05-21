/**
 * Sprint 43 — AGM weekly recommendations + screen tips.
 */

import { describe, it, expect } from 'vitest';
import { getAGMWeeklyRecommendations, getScreenTip } from './agm';
import type { GameState, Team, Player } from '../types';

function makePlayer(id: string, pos: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    name: `Test ${id}`,
    pos: pos as Player['pos'],
    age: 25,
    ovr: 75,
    potential: 80,
    injury: null,
    contract: {} as Player['contract'],
    traits: [],
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't_user',
    city: 'Testville',
    name: 'Testers',
    abbr: 'TST',
    conference: 'NFC',
    division: 'NFC East',
    isUser: true,
    roster: [],
    depthChart: {},
    capSpace: 20_000_000,
    capUsed: 180_000_000,
    wins: 3,
    losses: 1,
    ties: 0,
    ...overrides,
  } as unknown as Team;
}

function makeGame(team: Team, opts: Partial<GameState> = {}): GameState {
  return {
    version: 31,
    seed: 1,
    year: 2026,
    week: 5,
    phase: 'regular_season',
    teams: { [team.id]: team },
    players: Object.fromEntries(team.roster.map((p) => [p.id, p])),
    schedule: [],
    ...opts,
  } as unknown as GameState;
}

describe('getAGMWeeklyRecommendations', () => {
  it('returns an empty list when there is no user team', () => {
    const game = makeGame(makeTeam({ isUser: false }));
    expect(getAGMWeeklyRecommendations(game)).toEqual([]);
  });

  it('flags injured starters as urgent priority', () => {
    const injured = makePlayer('p_qb', 'QB', {
      injury: {
        id: 'inj1',
        type: 'hamstring',
        severity: 'out',
        severityTier: 'moderate',
        gamesOut: 3,
        gamesRecovered: 0,
        reinjuryRisk: 0.1,
        affectedRatings: [],
        ratingPenalty: 0,
        onIR: false,
      },
    });
    const team = makeTeam({ roster: [injured] });
    const game = makeGame(team);

    const recs = getAGMWeeklyRecommendations(game);
    expect(recs[0]?.id).toBe('injury_watch');
    expect(recs[0]?.priority).toBe('urgent');
    expect(recs[0]?.targetRoute).toBe('/roster');
  });

  it('flags cap trouble when capSpace is below $1M', () => {
    const team = makeTeam({ capSpace: 500_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team));
    const capRec = recs.find((r) => r.id === 'cap_trouble');
    expect(capRec).toBeDefined();
    expect(capRec?.priority).toBe('high');
  });

  it('bumps cap trouble to urgent when over the cap', () => {
    const team = makeTeam({ capSpace: -250_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team));
    const capRec = recs.find((r) => r.id === 'cap_trouble');
    expect(capRec?.priority).toBe('urgent');
  });

  it('sorts urgent items above medium items and respects the limit', () => {
    const injured = makePlayer('p_rb', 'RB', {
      injury: {
        id: 'inj2',
        type: 'acl',
        severity: 'out',
        severityTier: 'severe',
        gamesOut: 6,
        gamesRecovered: 0,
        reinjuryRisk: 0.2,
        affectedRatings: [],
        ratingPenalty: 0,
        onIR: false,
      },
    });
    const team = makeTeam({ roster: [injured], capSpace: 200_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team), 2);
    expect(recs.length).toBeLessThanOrEqual(2);
    expect(recs[0]?.priority).toBe('urgent');
  });

  it('makes recommendations profile-aware for durable AGM identity', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000 });
    const opponent = makeTeam({ id: 't_opp', city: 'Rival', name: 'Rivals', isUser: false, wins: 4, losses: 0 });
    const game = makeGame(team, {
      teams: { [team.id]: team, [opponent.id]: opponent },
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'coach_d_hardaway',
        agmImpactLog: [],
      },
      schedule: [{
        week: 5,
        games: [{ homeTeamId: team.id, awayTeamId: opponent.id, result: null }],
      }],
    } as Partial<GameState>);

    const recs = getAGMWeeklyRecommendations(game, 3);
    const opponentRec = recs.find((rec) => rec.id === 'next_opponent');

    expect(opponentRec?.priority).toBe('high');
    expect(opponentRec?.body).toContain("Coach D's game-week edge");
  });
});

describe('getScreenTip', () => {
  it('returns a tip for a known route', () => {
    const tip = getScreenTip('/roster');
    expect(tip).not.toBeNull();
    expect(tip?.id).toMatch(/^tip_/);
    expect(tip?.title.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown route', () => {
    expect(getScreenTip('/nonexistent-route')).toBeNull();
  });
});
