import { describe, it, expect, beforeEach } from 'vitest';
import { setSeed } from '../rng';
import { detectPositionBattles, buildCutAdvisor } from './roster-management';
import { ROLE_DEFS, assignDefaultRoles, getRoleSnapPct } from './role-defs';
import { calcSchemeFit, fitTierFromScore, getPlayerSide, calcTeamFit } from './scheme-fit';
import { chemistryMod, systemFitMod, updateSystemFit, resetSystemFit } from './chemistry';
import { earnXP, hasPerk, getClinicMods, CLINIC_TRACKS } from './coaching-clinic';
import { SKILL_TREES, getTreeKey, getActiveBonus } from './coach-skill-tree';
import { getCoachTraitMods } from './coach-trait-mods';
import { OC_SPECIALTIES, DC_SPECIALTIES, assignCoordSpecialty } from './coordinator-specialties';
import { generateHooks, checkNemesisTrigger, generateDraftCrush } from './hooks-engine';
import { buildCartridge, parseCartridge, generateFileName, shouldPromptBackup } from './dynasty-cartridge';
import { getTrustArrow, leagueSnapshot, getAgingMultiplier } from './trust-aging';
import { FRANCHISE_TAG_TYPES, getFranchiseTagSalary } from './franchise-tag';
import { INCENTIVE_DEFS, checkIncentives, getAvailableIncentives } from './incentives';
import { buildCapVisualization } from './cap-visualization';
import { makeContract } from './contracts';
import type { Player, Team, ClinicState, StaffMember } from '../types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', firstName: 'Test', lastName: 'Player', name: 'Test Player',
    pos: 'QB', age: 25, ovr: 75, pot: 80, ratings: { accuracy: 80, speed: 70, awareness: 75 },
    devTrait: 'normal', personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [], archetype: null, contract: makeContract(8, 3, 6, 5, 'p1', 't1'),
    teamId: 't1', draftYear: 2024, draftRound: 1, draftPick: 1, college: 'Test U',
    yearsExp: 1, careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {}, traitPowerLevel: {},
    injury: null, morale: 70, chemistry: 70, systemFit: 50,
    isStarter: true, role: null, roleWeeks: 0, tradeBlock: false,
    holdout: false, stats: { passYds: 4000, rushYds: 100, recYds: 0, sacks: 0, defINT: 0 },
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

describe('roster management', () => {
  it('detectPositionBattles finds close battles', () => {
    const battles = detectPositionBattles([
      makePlayer({ id: 'p1', pos: 'RB', ovr: 80 }),
      makePlayer({ id: 'p2', pos: 'RB', ovr: 78 }),
      makePlayer({ id: 'p3', pos: 'WR', ovr: 90 }),
    ]);
    expect(battles.length).toBeGreaterThanOrEqual(1);
    expect(battles[0]!.pos).toBe('RB');
  });

  it('buildCutAdvisor returns null if under cap', () => {
    expect(buildCutAdvisor([makePlayer()], 53)).toBeNull();
  });

  it('buildCutAdvisor returns suggestions when over', () => {
    const roster = Array.from({ length: 55 }, (_, i) =>
      makePlayer({ id: `p${i}`, ovr: 60 + (i % 20) })
    );
    const result = buildCutAdvisor(roster, 53);
    expect(result).not.toBeNull();
    expect(result!.overBy).toBe(2);
    expect(result!.suggestions.length).toBeGreaterThan(0);
  });
});

describe('role defs', () => {
  it('ROLE_DEFS has RB/WR/DL/LB', () => {
    expect(ROLE_DEFS.RB).toBeTruthy();
    expect(ROLE_DEFS.WR).toBeTruthy();
    expect(ROLE_DEFS.DL).toBeTruthy();
    expect(ROLE_DEFS.LB).toBeTruthy();
  });

  it('assignDefaultRoles assigns roles by OVR', () => {
    const roster = [
      makePlayer({ id: 'rb1', pos: 'RB', ovr: 85 }),
      makePlayer({ id: 'rb2', pos: 'RB', ovr: 70 }),
    ];
    assignDefaultRoles(roster);
    expect(roster[0]!.role).toBe('rb1');
    expect(roster[1]!.role).toBe('3rd_down');
  });

  it('getRoleSnapPct returns correct percentages', () => {
    expect(getRoleSnapPct('RB', 'rb1')).toBe(65);
    expect(getRoleSnapPct('QB', 'anything')).toBe(100);
  });
});

describe('scheme fit', () => {
  it('calcSchemeFit returns score and grade', () => {
    const player = makePlayer({ pos: 'QB', ratings: { accuracy: 90, speed: 85, awareness: 88 } });
    const result = calcSchemeFit(player, 'spread');
    expect(result.score).toBeGreaterThan(70);
    expect(result.grade).toBeTruthy();
  });

  it('fitTierFromScore returns correct tiers', () => {
    expect(fitTierFromScore(90)).toBe('ELITE');
    expect(fitTierFromScore(60)).toBe('SOLID');
    expect(fitTierFromScore(30)).toBe('POOR');
  });

  it('getPlayerSide identifies offense/defense', () => {
    expect(getPlayerSide('QB')).toBe('off');
    expect(getPlayerSide('CB')).toBe('def');
    expect(getPlayerSide('K')).toBe('other');
  });

  it('calcTeamFit returns summary', () => {
    const team = makeTeam();
    const fit = calcTeamFit(team);
    expect(fit.avgFit).toBeGreaterThan(0);
  });
});

describe('chemistry', () => {
  beforeEach(() => setSeed(42));

  it('chemistryMod returns modifier based on avg', () => {
    const team = makeTeam({ roster: [makePlayer({ chemistry: 85 })] });
    expect(chemistryMod(team)).toBe(3);
  });

  it('updateSystemFit grows system fit', () => {
    const team = makeTeam({ roster: [makePlayer({ systemFit: 30 })] });
    updateSystemFit(team);
    expect(team.roster[0]!.systemFit).toBeGreaterThan(30);
  });

  it('resetSystemFit reduces on scheme change', () => {
    const team = makeTeam({ roster: [makePlayer({ systemFit: 80 })] });
    resetSystemFit(team);
    expect(team.roster[0]!.systemFit).toBeLessThan(80);
  });
});

describe('coaching clinic', () => {
  it('earnXP accumulates XP and unlocks perks', () => {
    let clinic: ClinicState = { xp: {}, perks: [] };
    for (let i = 0; i < 7; i++) clinic = earnXP(clinic, 'gameplan_change', 5);
    expect(clinic.xp.offense).toBe(35);
    expect(clinic.perks).toContain('off1');
  });

  it('hasPerk checks correctly', () => {
    expect(hasPerk({ xp: {}, perks: ['off1'] }, 'off1')).toBe(true);
    expect(hasPerk({ xp: {}, perks: [] }, 'off1')).toBe(false);
  });

  it('getClinicMods returns defaults when no perks', () => {
    const mods = getClinicMods({ xp: {}, perks: [] });
    expect(mods.scoringBoost).toBe(0);
  });
});

describe('coach skill tree', () => {
  it('SKILL_TREES has all three trees', () => {
    expect(SKILL_TREES.Strategist).toBeTruthy();
    expect(SKILL_TREES.Motivator).toBeTruthy();
    expect(SKILL_TREES.Disciplinarian).toBeTruthy();
  });

  it('getTreeKey maps archetypes', () => {
    expect(getTreeKey('Strategist')).toBe('Strategist');
    expect(getTreeKey('Motivator')).toBe('Motivator');
    expect(getTreeKey('Run Stuffer')).toBe('Disciplinarian');
  });

  it('getActiveBonus returns empty for no selection', () => {
    expect(getActiveBonus({}, 'c1', 5, 'Strategist')).toEqual({});
  });
});

describe('coach trait mods', () => {
  it('getCoachTraitMods aggregates with caps', () => {
    const staff: Team['staff'] = {
      hc: { id: 'c1', name: 'HC', role: 'HC', archetype: 'Strategist', traits: ['AGGRESSIVE_4TH', 'REDZONE_SCRIPT'], ratings: {}, level: 5, specialty75: null },
      oc: null, dc: null,
    };
    const team = makeTeam({ staff });
    const mods = getCoachTraitMods(team);
    expect(mods.stallReduction).toBe(0.03);
    expect(mods.rzTdBoost).toBe(4);
  });
});

describe('coordinator specialties', () => {
  beforeEach(() => setSeed(42));

  it('OC and DC specialties are defined', () => {
    expect(OC_SPECIALTIES.length).toBe(5);
    expect(DC_SPECIALTIES.length).toBe(5);
  });

  it('assignCoordSpecialty assigns from pool', () => {
    const staff: StaffMember = { id: 'c1', name: 'OC', role: 'OC', archetype: 'QB Guru', traits: [], ratings: {}, level: 5 };
    const spec = assignCoordSpecialty(staff, 'OC');
    expect(spec.id).toBeTruthy();
    expect(staff.specialty75).toBe(spec);
  });
});

describe('hooks engine', () => {
  beforeEach(() => setSeed(42));

  it('generateHooks returns up to 3 hooks', () => {
    const team = makeTeam({
      ownerMood: 20,
      roster: [makePlayer({ holdout: true, ovr: 80 })],
    });
    const hooks = generateHooks({ my: team, myId: 't1', teams: [team], season: { year: 2026, week: 10, phase: 'regular_season' } });
    expect(hooks.length).toBeLessThanOrEqual(3);
    expect(hooks.length).toBeGreaterThan(0);
  });

  it('checkNemesisTrigger creates nemesis', () => {
    const nemesis = checkNemesisTrigger({ type: 'playoff_loss', oppId: 't2', oppName: 'Rivals' });
    expect(nemesis).not.toBeNull();
    expect(nemesis!.oppId).toBe('t2');
    expect(nemesis!.reason).toContain('playoffs');
  });

  it('generateDraftCrush works deterministically', () => {
    const crush = generateDraftCrush(2026);
    // May be null based on RNG, but if not, should have structure
    if (crush) {
      expect(crush.name).toBeTruthy();
      expect(crush.draftYear).toBe(2029);
    }
  });
});

describe('dynasty cartridge', () => {
  it('buildCartridge creates envelope', () => {
    const result = buildCartridge({ version: 1, data: 'test' }, { teamName: 'Eagles' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.cartridgeVersion).toBe('mfd-cartridge.v1');
      expect(result.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('parseCartridge round-trips', () => {
    const built = buildCartridge({ version: 1, data: 'test' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseCartridge(built.json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.save).toEqual({ version: 1, data: 'test' });
    }
  });

  it('parseCartridge rejects empty', () => {
    const result = parseCartridge('');
    expect(result.ok).toBe(false);
  });

  it('generateFileName creates slug', () => {
    expect(generateFileName({ teamName: 'Eagles', season: 3, week: 12 }))
      .toBe('Eagles-S3-W12.mfd');
  });

  it('shouldPromptBackup after 30 minutes', () => {
    expect(shouldPromptBackup(Date.now() - 60 * 60 * 1000, 1)).toBe(true);
    expect(shouldPromptBackup(Date.now() - 10 * 1000, 1)).toBe(false);
  });
});

describe('trust & aging', () => {
  it('getTrustArrow returns correct directions', () => {
    expect(getTrustArrow(70, 60)).toBe('big_gain');
    expect(getTrustArrow(50, 50)).toBe('flat');
    expect(getTrustArrow(30, 40)).toBe('big_loss');
  });

  it('leagueSnapshot analyzes trade state', () => {
    const snapshot = leagueSnapshot(
      { gmTrustByTeam: { t1: 80, t2: 40, t3: 20 }, recentTrades: [] },
      [],
    );
    expect(snapshot.avgTrust).toBeGreaterThan(0);
    expect(snapshot.tiers.high).toBe(1);
    expect(snapshot.tiers.low).toBe(1);
  });

  it('getAgingMultiplier varies by category and phase', () => {
    expect(getAgingMultiplier('speed', 'peak')).toBe(0);
    expect(getAgingMultiplier('awareness', 'peak')).toBe(-0.5);
    expect(getAgingMultiplier('speed', 'decline')).toBeGreaterThan(0);
  });
});

describe('franchise tag', () => {
  it('FRANCHISE_TAG_TYPES has 3 types', () => {
    expect(FRANCHISE_TAG_TYPES).toHaveLength(3);
  });

  it('getFranchiseTagSalary uses top-5 avg', () => {
    const teams = [
      makeTeam({
        roster: Array.from({ length: 5 }, (_, i) =>
          makePlayer({ id: `qb${i}`, pos: 'QB', contract: makeContract(20 + i * 2, 3, 5, 5) })
        ),
      }),
    ];
    const salary = getFranchiseTagSalary('QB', teams);
    expect(salary).toBeGreaterThan(0);
  });
});

describe('incentives', () => {
  it('INCENTIVE_DEFS has 7 types', () => {
    expect(INCENTIVE_DEFS).toHaveLength(7);
  });

  it('checkIncentives detects met incentives', () => {
    const player = makePlayer({
      stats: { passYds: 4000, rushYds: 0, recYds: 0, sacks: 0, defINT: 0 },
      contract: {
        ...makeContract(10, 3, 5, 5, 'p1', 't1'),
        incentives: [{ type: 'pass_yds', threshold: 3500, bonus: 2.0, achieved: false }],
      },
    });
    const result = checkIncentives(player, { madePlayoffs: false });
    expect(result.hit).toHaveLength(1);
    expect(result.totalBonus).toBe(2.0);
  });

  it('getAvailableIncentives filters by position', () => {
    const qbInc = getAvailableIncentives('QB');
    expect(qbInc.some((i) => i.id === 'pass_yds')).toBe(true);
    expect(qbInc.some((i) => i.id === 'rush_yds')).toBe(false);
  });
});

describe('cap visualization', () => {
  it('buildCapVisualization returns full breakdown', () => {
    const team = makeTeam({
      roster: [
        makePlayer({ pos: 'QB', contract: makeContract(20, 4, 10, 10) }),
        makePlayer({ id: 'p2', pos: 'RB', contract: makeContract(8, 3, 3, 3) }),
      ],
    });
    const viz = buildCapVisualization(team, 2026);
    expect(viz).not.toBeNull();
    expect(viz!.breakdown.length).toBeGreaterThan(0);
    expect(viz!.topHits.length).toBeGreaterThan(0);
    expect(viz!.projections).toHaveLength(3);
    expect(viz!.salaryCap).toBeGreaterThan(0);
  });

  it('returns null for null team', () => {
    expect(buildCapVisualization(null)).toBeNull();
  });
});
