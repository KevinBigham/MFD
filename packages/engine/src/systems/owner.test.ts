import { describe, it, expect, beforeEach } from 'vitest';
import { setSeed } from '../rng';
import { initOwner, updateOwnerApproval, getOwnerStatus, OWNER_ARCHETYPES } from './owner';
import {
  tickPatience, getPatienceStatus, calcConfidenceArc,
  generateUltimatums, checkHotSeat,
} from './owner-extended';
import { OWNER_GOALS, evaluateGoals } from './owner-goals';
import { GM_STRATEGIES, applyGmStrategy, suggestStrategy } from '../systems/gm-strategies';
import { calculateReputation, getRepLabel } from '../systems/gm-reputation';
import type { Team, OwnerState, SeasonContext, Player } from '../types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', firstName: 'Test', lastName: 'Player', name: 'Test Player',
    pos: 'QB', age: 25, ovr: 75, pot: 80, ratings: {},
    devTrait: 'normal', personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [], archetype: null, contract: null, teamId: 't1',
    draftYear: 2024, draftRound: 1, draftPick: 1, college: 'Test U',
    yearsExp: 1, careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {}, traitPowerLevel: {},
    injury: null, morale: 60, chemistry: 60, systemFit: 50,
    isStarter: true, role: null, roleWeeks: 0, tradeBlock: false,
    holdout: false, stats: { passYds: 0, passTD: 0, passINT: 0, passAtt: 0, passComp: 0, rushYds: 0, rushAtt: 0, rushTD: 0, fumbles: 0, rec: 0, recYds: 0, recTD: 0, targets: 0, sacks: 0, defINT: 0, tackles: 0, fgMade: 0, fgAtt: 0 },
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1', city: 'Test', name: 'Testers', abbr: 'TST', icon: 'T',
    conference: 'AFC', division: 'North',
    roster: [makePlayer()],
    capSpace: 50, capUsed: 100, deadCap: 5, deadCapByYear: {},
    wins: 8, losses: 4, ties: 0, streak: 2,
    offScheme: 'spread', defScheme: '4-3', schemeOff: 'spread', schemeDef: '4-3',
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: { hc: null, oc: null, dc: null },
    ownerId: 'o1',
    owner: { archetypeId: 'win_now', label: 'Win Now', approval: 60, history: [] },
    ownerMood: 60, ownerPatience80: 60,
    gmStrategy: 'neutral',
    draftPicks: [], rivalries: [], rivals: {},
    franchiseTag973: null, isUser: true,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: {
      gamesPlayed: 12,
      pointsFor: 280,
      pointsAgainst: 240,
      pointDifferential: 40,
      totalYards: 4200,
      passingYards: 2500,
      rushingYards: 1700,
      turnoversLost: 12,
      turnoversForced: 15,
      sacksFor: 28,
      sacksAgainst: 18,
    },
    ...overrides,
  } as Team;
}

describe('owner system', () => {
  beforeEach(() => setSeed(42));

  it('initOwner creates valid owner state', () => {
    const owner = initOwner();
    expect(owner.archetypeId).toBeTruthy();
    expect(owner.approval).toBe(60);
    expect(OWNER_ARCHETYPES.some((a) => a.id === owner.archetypeId)).toBe(true);
  });

  it('updateOwnerApproval modifies approval', () => {
    const owner: OwnerState = { archetypeId: 'win_now', label: 'Win Now', approval: 50, history: [] };
    const team = makeTeam({ wins: 10, losses: 2 });
    const season: SeasonContext = { year: 2026, week: 12, phase: 'regular_season' };
    const result = updateOwnerApproval(owner, team, season);
    expect(result.delta).not.toBe(0);
    expect(owner.history.length).toBe(1);
  });

  it('getOwnerStatus returns correct labels', () => {
    expect(getOwnerStatus(90).label).toBe('Thrilled');
    expect(getOwnerStatus(60).label).toBe('Content');
    expect(getOwnerStatus(20).label).toBe('Furious');
  });
});

describe('owner-extended', () => {
  beforeEach(() => setSeed(42));

  it('tickPatience increases on win', () => {
    const result = tickPatience(50, 'win_now', 'win', {});
    expect(result.patience).toBeGreaterThan(50);
  });

  it('tickPatience decreases on loss', () => {
    const result = tickPatience(50, 'win_now', 'loss', {});
    expect(result.patience).toBeLessThan(50);
  });

  it('tickPatience playoff multiplier', () => {
    const normal = tickPatience(50, 'win_now', 'loss', {});
    const playoff = tickPatience(50, 'win_now', 'loss', { isPlayoff: true });
    expect(playoff.patience).toBeLessThan(normal.patience);
  });

  it('tickPatience grants a week 9 checkpoint boost for .500 teams', () => {
    const result = tickPatience(50, 'win_now', 'loss', { week: 9, winPct: 0.5 });
    expect(result.delta).toBe(-1);
  });

  it('tickPatience uses the softer losing streak penalty', () => {
    const result = tickPatience(50, 'win_now', 'loss', { streak: -3 });
    expect(result.delta).toBe(-9);
  });

  it('tickPatience halves drain during the honeymoon season', () => {
    const result = tickPatience(50, 'win_now', 'loss', { firstSeason: true });
    expect(result.delta).toBe(-3);
  });

  it('calcConfidenceArc returns correct stages', () => {
    expect(calcConfidenceArc(80, 80).stage).toBe('PATIENT');
    expect(calcConfidenceArc(60, 60).stage).toBe('RESTLESS');
    expect(calcConfidenceArc(40, 40).stage).toBe('DEMANDING');
    expect(calcConfidenceArc(10, 10).stage).toBe('ULTIMATUM');
  });

  it('generateUltimatums returns requested count', () => {
    const ults = generateUltimatums(2);
    expect(ults.length).toBe(2);
    expect(ults[0]!.id).toBeTruthy();
  });

  it('checkHotSeat triggers on low mood/patience', () => {
    expect(checkHotSeat(20, 20).onHotSeat).toBe(true);
    expect(checkHotSeat(20, 20).severity).toBe(3);
    expect(checkHotSeat(80, 80).onHotSeat).toBe(false);
  });
});

describe('owner goals', () => {
  it('evaluateGoals checks team against goals', () => {
    const team = makeTeam({ wins: 10, losses: 3, capSpace: 30 });
    const results = evaluateGoals(team, ['winning_record', 'cap_health']);
    expect(results).toHaveLength(2);
    expect(results[0]!.met).toBe(true);
    expect(results[1]!.met).toBe(true);
  });
});

describe('GM strategies', () => {
  it('applyGmStrategy sets trade blocks for rebuild', () => {
    const team = makeTeam({
      roster: [
        makePlayer({ id: 'p1', age: 30, ovr: 80 }),
        makePlayer({ id: 'p2', age: 22, ovr: 65 }),
      ],
    });
    applyGmStrategy(team, 'rebuild');
    expect(team.gmStrategy).toBe('rebuild');
    expect(team.roster[0]!.tradeBlock).toBe(true);
    expect(team.roster[1]!.tradeBlock).toBe(false);
  });

  it('suggestStrategy returns based on win pct', () => {
    const team = makeTeam({ wins: 12, losses: 2, roster: [makePlayer({ ovr: 85 })] });
    expect(suggestStrategy(team)).toBe('contend');
  });
});

describe('GM reputation', () => {
  it('calculateReputation from empty log', () => {
    const rep = calculateReputation([], null);
    expect(rep.fairDealer).toBe(50);
    expect(rep.aggressive).toBe(30);
    expect(rep.overall).toBeGreaterThan(0);
  });

  it('getRepLabel returns tiers', () => {
    expect(getRepLabel(90).label).toBe('Elite GM');
    expect(getRepLabel(50).label).toBe('Average');
    expect(getRepLabel(10).label).toBe('Untrusted');
  });
});
