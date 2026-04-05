import { describe, it, expect } from 'vitest';
import {
  getSnapShareByPosition,
  allocateGameSnaps,
  applySnapCounts,
  getSnapReport,
  getRotationAdvice,
} from './snap-counts';
import type { Player, Team, PlayerGameLine } from '../types';

// ── Helpers ────────────────────────────────────────────────

const rng = () => 0.5;

function makePlayer(overrides: Partial<Player> & { id: string; pos: Player['pos'] }): Player {
  return {
    id: overrides.id,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'Player',
    name: overrides.name ?? `${overrides.firstName ?? 'Test'} ${overrides.lastName ?? 'Player'}`,
    pos: overrides.pos,
    age: 25,
    ovr: overrides.ovr ?? 75,
    pot: 80,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId: 'team1',
    draftYear: 2024,
    draftRound: 1,
    draftPick: 1,
    college: 'Test U',
    yearsExp: 2,
    careerStats: { seasons: 1, gp: 10, snaps: overrides.careerStats?.snaps ?? 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: overrides.injury ?? null,
    morale: 50,
    chemistry: 50,
    systemFit: 50,
    cliqueId: null,
    jerseyNumber: 1,
    endorsements: [],
    isStarter: overrides.isStarter ?? false,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: { gamesPlayed: 0, passYds: 0, passTD: 0, passINT: 0, passAtt: 0, passComp: 0, rushYds: 0, rushAtt: 0, rushTD: 0, fumbles: 0, rec: 0, recYds: 0, recTD: 0, targets: 0, sacks: 0, defINT: 0, tackles: 0, fgMade: 0, fgAtt: 0, yacYds: 0 },
  } as unknown as Player;
}

function makeTeam(roster: Player[]): Team {
  return {
    id: 'team1',
    city: 'Test',
    name: 'Team',
    abbr: 'TST',
    icon: '',
    conference: 'AFC',
    division: 'East',
    roster,
    capSpace: 50_000_000,
    capUsed: 0,
    deadCap: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    offScheme: 'spread',
    defScheme: '4-3',
  } as unknown as Team;
}

// ── Tests ──────────────────────────────────────────────────

describe('snap-counts', () => {
  describe('getSnapShareByPosition', () => {
    it('returns higher min for starters', () => {
      const starter = getSnapShareByPosition('RB', true, 'normal');
      const backup = getSnapShareByPosition('RB', false, 'normal');
      expect(starter.min).toBeGreaterThan(backup.min);
      expect(starter.max).toBeGreaterThan(backup.max);
    });

    it('protect_starters reduces starter snap share max', () => {
      const normal = getSnapShareByPosition('WR', true, 'normal');
      const protect = getSnapShareByPosition('WR', true, 'protect_starters');
      expect(protect.max).toBeLessThan(normal.max);
    });

    it('ride_stars increases starter snap share min', () => {
      const normal = getSnapShareByPosition('LB', true, 'normal');
      const ride = getSnapShareByPosition('LB', true, 'ride_stars');
      expect(ride.min).toBeGreaterThan(normal.min);
    });
  });

  describe('allocateGameSnaps', () => {
    it('returns entries for players on roster', () => {
      const qb = makePlayer({ id: 'qb1', pos: 'QB', isStarter: true });
      const rb = makePlayer({ id: 'rb1', pos: 'RB', isStarter: true });
      const dl = makePlayer({ id: 'dl1', pos: 'DL', isStarter: true });
      const team = makeTeam([qb, rb, dl]);

      const allocs = allocateGameSnaps(team, 'normal', [], rng);
      expect(allocs.length).toBeGreaterThanOrEqual(3);

      const ids = allocs.map(a => a.playerId);
      expect(ids).toContain('qb1');
      expect(ids).toContain('rb1');
      expect(ids).toContain('dl1');
    });

    it('gives starters more snaps than backups at same position', () => {
      const rbStarter = makePlayer({ id: 'rb1', pos: 'RB', isStarter: true, name: 'Starter RB' });
      const rbBackup = makePlayer({ id: 'rb2', pos: 'RB', isStarter: false, name: 'Backup RB' });
      const team = makeTeam([rbStarter, rbBackup]);

      const allocs = allocateGameSnaps(team, 'normal', [], rng);
      const starterAlloc = allocs.find(a => a.playerId === 'rb1');
      const backupAlloc = allocs.find(a => a.playerId === 'rb2');

      expect(starterAlloc).toBeDefined();
      expect(backupAlloc).toBeDefined();
      expect(starterAlloc!.offensiveSnaps).toBeGreaterThan(backupAlloc!.offensiveSnaps);
    });

    it('excludes injured players', () => {
      const healthy = makePlayer({ id: 'qb1', pos: 'QB', isStarter: true });
      const injured = makePlayer({
        id: 'qb2',
        pos: 'QB',
        isStarter: false,
        injury: {
          id: 'inj1',
          type: 'knee_sprain',
          severity: 'out',
          severityTier: 'moderate',
          gamesOut: 3,
          gamesRecovered: 0,
          reinjuryRisk: 0.1,
          affectedRatings: [],
          ratingPenalty: 5,
          onIR: false,
        } as any,
      });
      const team = makeTeam([healthy, injured]);

      const allocs = allocateGameSnaps(team, 'normal', [], rng);
      const ids = allocs.map(a => a.playerId);
      expect(ids).toContain('qb1');
      expect(ids).not.toContain('qb2');
    });
  });

  describe('applySnapCounts', () => {
    it('increments careerStats.snaps', () => {
      const player = makePlayer({ id: 'p1', pos: 'QB' });
      const team = makeTeam([player]);

      expect(player.careerStats.snaps).toBe(0);

      applySnapCounts(team, [{
        playerId: 'p1',
        name: 'Test Player',
        pos: 'QB',
        offensiveSnaps: 50,
        defensiveSnaps: 0,
        specialTeamsSnaps: 0,
        totalSnaps: 50,
        snapShare: 1.0,
        isStarter: true,
      }]);

      expect(player.careerStats.snaps).toBe(50);

      // Apply again to verify accumulation
      applySnapCounts(team, [{
        playerId: 'p1',
        name: 'Test Player',
        pos: 'QB',
        offensiveSnaps: 60,
        defensiveSnaps: 0,
        specialTeamsSnaps: 0,
        totalSnaps: 60,
        snapShare: 1.0,
        isStarter: true,
      }]);

      expect(player.careerStats.snaps).toBe(110);
    });
  });

  describe('getSnapReport', () => {
    it('returns leaders sorted by snaps descending', () => {
      const p1 = makePlayer({ id: 'p1', pos: 'QB', name: 'High Snaps', careerStats: { seasons: 1, gp: 10, snaps: 500 } as any });
      const p2 = makePlayer({ id: 'p2', pos: 'RB', name: 'Med Snaps', careerStats: { seasons: 1, gp: 10, snaps: 300 } as any });
      const p3 = makePlayer({ id: 'p3', pos: 'WR', name: 'Low Snaps', careerStats: { seasons: 1, gp: 10, snaps: 100 } as any });
      const team = makeTeam([p3, p1, p2]); // intentionally unordered

      const report = getSnapReport(team);
      expect(report.leaders[0].playerId).toBe('p1');
      expect(report.leaders[1].playerId).toBe('p2');
      expect(report.leaders[2].playerId).toBe('p3');
    });

    it('flags workload warnings for players above threshold', () => {
      const p1 = makePlayer({ id: 'p1', pos: 'QB', name: 'Overworked', careerStats: { seasons: 1, gp: 10, snaps: 1000 } as any });
      const p2 = makePlayer({ id: 'p2', pos: 'RB', name: 'Normal', careerStats: { seasons: 1, gp: 10, snaps: 200 } as any });
      const team = makeTeam([p1, p2]);

      const report = getSnapReport(team);
      // p1 has share of 1.0 (max), which is > 0.95
      expect(report.workloadWarnings.length).toBeGreaterThanOrEqual(1);
      expect(report.workloadWarnings[0].playerId).toBe('p1');
    });
  });

  describe('getRotationAdvice', () => {
    it('suggests reducing overworked starters with capable backups', () => {
      const starter = makePlayer({
        id: 's1',
        pos: 'RB',
        name: 'Star RB',
        isStarter: true,
        ovr: 85,
        careerStats: { seasons: 1, gp: 10, snaps: 950 } as any,
      });
      const backup = makePlayer({
        id: 'b1',
        pos: 'RB',
        name: 'Backup RB',
        isStarter: false,
        ovr: 78, // within 10 of starter's 85
        careerStats: { seasons: 1, gp: 10, snaps: 100 } as any,
      });
      const team = makeTeam([starter, backup]);

      const advice = getRotationAdvice(team);
      expect(advice.length).toBeGreaterThanOrEqual(1);
      expect(advice[0].playerId).toBe('s1');
      expect(advice[0].suggestedShare).toBeLessThan(advice[0].currentShare);
      expect(advice[0].reason).toContain('Backup RB');
    });

    it('does not suggest rotation when no capable backup exists', () => {
      const starter = makePlayer({
        id: 's1',
        pos: 'QB',
        name: 'Star QB',
        isStarter: true,
        ovr: 90,
        careerStats: { seasons: 1, gp: 10, snaps: 950 } as any,
      });
      const backup = makePlayer({
        id: 'b1',
        pos: 'QB',
        name: 'Bad Backup',
        isStarter: false,
        ovr: 55, // gap of 35, well beyond 10
        careerStats: { seasons: 1, gp: 10, snaps: 50 } as any,
      });
      const team = makeTeam([starter, backup]);

      const advice = getRotationAdvice(team);
      expect(advice.length).toBe(0);
    });
  });
});
