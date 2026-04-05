import { describe, expect, it } from 'vitest';
import {
  getCrowdEnergy,
  calculateAtmosphere,
  getAtmosphereBonus,
} from './atmosphere';
import type { AtmosphereContext } from './atmosphere';
import type { Team, GameState } from '../types';

// ── Helpers ──────────────────────────────────────────────

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-home',
    city: 'Kansas City',
    name: 'Chiefs',
    abbr: 'KC',
    icon: '',
    conference: 'AFC',
    division: 'AFC West',
    roster: [],
    capSpace: 50_000_000,
    capUsed: 200_000_000,
    deadCap: 0,
    deadCapByYear: {},
    wins: 5,
    losses: 3,
    ties: 0,
    streak: 2,
    offScheme: 'spread',
    defScheme: 'cover3',
    schemeOff: 'spread',
    schemeDef: 'cover3',
    coachingStaff: {} as Team['coachingStaff'],
    staff: {} as Team['staff'],
    ownerId: 'owner-1',
    owner: {} as Team['owner'],
    ownerMood: 70,
    ownerPatience80: 80,
    gmStrategy: {} as Team['gmStrategy'],
    draftPicks: [],
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    isUser: false,
    clinic: {} as Team['clinic'],
    skillSelections: {},
    tradeState: {} as Team['tradeState'],
    txLog: [],
    seasonStats: {} as Team['seasonStats'],
    mentoringPairs: [],
    trainingAssignments: {},
    facilityState: {} as Team['facilityState'],
    practiceSquad: [],
    stadiumType: 'outdoor',
    franchiseIdentity: {
      fanbase: 50,
      prestige: 50,
      marketSize: 'large',
      marketModifier: 1,
      stadiumName: 'Arrowhead',
      stadiumDeal: null,
      stadiumLevel: 2,
      attendance: 0.95,
      relocationHistory: [],
    },
    lockerRoom: {} as Team['lockerRoom'],
    retiredJerseys: [],
    ...overrides,
  } as Team;
}

function makeGameState(): GameState {
  return {} as GameState;
}

// ── getCrowdEnergy ───────────────────────────────────────

describe('getCrowdEnergy', () => {
  it('returns a value between 10 and 100', () => {
    const team = makeTeam();
    const energy = getCrowdEnergy(team, 5, { wins: 5, losses: 3 });
    expect(energy).toBeGreaterThanOrEqual(10);
    expect(energy).toBeLessThanOrEqual(100);
  });

  it('returns a value between 10 and 100 for a winless team', () => {
    const team = makeTeam({ franchiseIdentity: { ...makeTeam().franchiseIdentity, fanbase: 10 } });
    const energy = getCrowdEnergy(team, 1, { wins: 0, losses: 10 });
    expect(energy).toBeGreaterThanOrEqual(10);
    expect(energy).toBeLessThanOrEqual(100);
  });

  it('boosts energy for dome teams', () => {
    const outdoor = makeTeam({ stadiumType: 'outdoor' });
    const dome = makeTeam({ stadiumType: 'dome' });
    const record = { wins: 5, losses: 3 };

    const outdoorEnergy = getCrowdEnergy(outdoor, 5, record);
    const domeEnergy = getCrowdEnergy(dome, 5, record);

    expect(domeEnergy).toBe(outdoorEnergy + 5);
  });

  it('boosts energy for undefeated teams with 3+ games', () => {
    const team = makeTeam();
    const undefeated = getCrowdEnergy(team, 5, { wins: 5, losses: 0 });
    const oneLoss = getCrowdEnergy(team, 5, { wins: 4, losses: 1 });

    expect(undefeated).toBeGreaterThan(oneLoss);
  });

  it('does not apply undefeated bonus with fewer than 3 games', () => {
    const team = makeTeam();
    const twoGames = getCrowdEnergy(team, 2, { wins: 2, losses: 0 });
    // Same win pct but 3+ games should get the bonus
    const threeGames = getCrowdEnergy(team, 3, { wins: 3, losses: 0 });

    expect(threeGames).toBeGreaterThan(twoGames);
  });
});

// ── calculateAtmosphere ──────────────────────────────────

describe('calculateAtmosphere', () => {
  it('adds playoff energy bonus', () => {
    const home = makeTeam();
    const away = makeTeam({ id: 'team-away' });
    const game = makeGameState();

    const regular = calculateAtmosphere(game, home, away, 10, false);
    const playoff = calculateAtmosphere(game, home, away, 10, true, 'wild_card');

    expect(playoff.crowdEnergy).toBeGreaterThan(regular.crowdEnergy);
    expect(playoff.factors).toContain('playoff atmosphere');
  });

  it('identifies rivalry games when heat >= 6', () => {
    const away = makeTeam({ id: 'team-away' });
    const home = makeTeam({
      rivals: { 'team-away': { heat: 8 } },
    });
    const game = makeGameState();

    const result = calculateAtmosphere(game, home, away, 5, false);

    expect(result.intensity).toBe('rivalry');
    expect(result.factors).toContain('rivalry game');
  });

  it('does not flag rivalry when heat < 6', () => {
    const away = makeTeam({ id: 'team-away' });
    const home = makeTeam({
      rivals: { 'team-away': { heat: 3 } },
    });
    const game = makeGameState();

    const result = calculateAtmosphere(game, home, away, 5, false);

    expect(result.intensity).toBe('regular');
    expect(result.factors).not.toContain('rivalry game');
  });

  it('returns super_bowl intensity for super_bowl round', () => {
    const home = makeTeam();
    const away = makeTeam({ id: 'team-away' });
    const game = makeGameState();

    const result = calculateAtmosphere(game, home, away, 20, true, 'super_bowl');

    expect(result.intensity).toBe('super_bowl');
    expect(result.factors).toContain('Super Bowl');
  });

  it('returns conference_championship intensity for conference round', () => {
    const home = makeTeam();
    const away = makeTeam({ id: 'team-away' });
    const game = makeGameState();

    const result = calculateAtmosphere(game, home, away, 20, true, 'conference');

    expect(result.intensity).toBe('conference_championship');
    expect(result.factors).toContain('conference championship');
  });
});

// ── getAtmosphereBonus ───────────────────────────────────

describe('getAtmosphereBonus', () => {
  it('returns +3 home bonus when crowdEnergy >= 90', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 95,
      hostility: 50,
      noise: 60,
      intensity: 'regular',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.homeOvrBonus).toBe(3);
  });

  it('returns +2 home bonus when crowdEnergy is 75-89', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 80,
      hostility: 50,
      noise: 60,
      intensity: 'regular',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.homeOvrBonus).toBe(2);
  });

  it('returns +1 home bonus when crowdEnergy is 50-74', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 60,
      hostility: 20,
      noise: 40,
      intensity: 'regular',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.homeOvrBonus).toBe(1);
  });

  it('returns -3 away penalty when hostility >= 80', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 95,
      hostility: 85,
      noise: 70,
      intensity: 'playoff',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.awayOvrPenalty).toBe(-3);
  });

  it('returns -2 away penalty when hostility is 60-79', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 70,
      hostility: 65,
      noise: 50,
      intensity: 'regular',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.awayOvrPenalty).toBe(-2);
  });

  it('returns 0 home bonus and 0 penalty for low energy', () => {
    const atmo: AtmosphereContext = {
      crowdEnergy: 30,
      hostility: 20,
      noise: 20,
      intensity: 'regular',
      factors: [],
    };
    const bonus = getAtmosphereBonus(atmo);
    expect(bonus.homeOvrBonus).toBe(0);
    expect(bonus.awayOvrPenalty).toBe(0);
  });
});
