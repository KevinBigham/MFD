import { describe, it, expect } from 'vitest';
import {
  generateDevelopmentReport,
  projectDevelopmentCurve,
  identifyBreakoutCandidates,
  createDevelopmentSnapshot,
} from './development-insights';

// ── Helpers ──────────────────────────────────────────────

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Test Player',
    pos: 'WR',
    age: 23,
    ovr: 75,
    archetype: {
      archetype: 'deep_threat',
      label: 'Deep Threat',
      description: 'A burner who stretches the field.',
    },
    ratings: {
      speed: 88,
      deepRoute: 72,
      separation: 70,
      spectacularCatch: 65,
      catching: 60,
      blocking: 45,
    } as Record<string, number>,
    careerStats: {
      previousSeasonOvr: 71,
      seasonStartOvr: 71,
      seasons: 2,
    },
    ...overrides,
  } as any;
}

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team1',
    roster: [makePlayer()],
    positionCoaches: { coaches: [] },
    ...overrides,
  } as any;
}

function makeGameState(teams: Record<string, unknown> = {}) {
  return { teams } as any;
}

// ── Tests ────────────────────────────────────────────────

describe('development-insights', () => {
  describe('generateDevelopmentReport', () => {
    it('returns a valid report with archetype info', () => {
      const player = makePlayer();
      const team = makeTeam();

      const report = generateDevelopmentReport(player, team);

      expect(report.playerId).toBe('p1');
      expect(report.playerName).toBe('Test Player');
      expect(report.pos).toBe('WR');
      expect(report.age).toBe(23);
      expect(report.ovr).toBe(75);
      expect(report.archetypeLabel).toBe('Deep Threat');
      expect(report.archetypeAlignment).toBeGreaterThanOrEqual(0);
      expect(report.archetypeAlignment).toBeLessThanOrEqual(100);
      expect(report.evolutionRisk).toMatch(/^(none|possible|likely)$/);
      expect(report.projectedOvr).toBeGreaterThanOrEqual(40);
      expect(report.projectedOvr).toBeLessThanOrEqual(99);
    });

    it('includes coachImpact narrative when team has position coaches', () => {
      const player = makePlayer();
      const team = makeTeam({
        positionCoaches: {
          coaches: [
            {
              id: 'c1',
              name: 'Coach Smith',
              role: 'WR',
              specialty: 'route_running',
              quality: 8,
              yearsWithTeam: 3,
            },
          ],
        },
      });

      const report = generateDevelopmentReport(player, team);

      expect(report.coachImpact.length).toBeGreaterThan(0);
      expect(report.coachImpact).toContain('Coach Smith');
    });
  });

  describe('projectDevelopmentCurve', () => {
    it('returns projections for the requested number of years', () => {
      const player = makePlayer();
      const team = makeTeam();

      const projections = projectDevelopmentCurve(player, team, 4);

      expect(projections).toHaveLength(4);
      expect(projections[0]!.year).toBe(1);
      expect(projections[3]!.year).toBe(4);
      for (const p of projections) {
        expect(p.projectedOvr).toBeGreaterThanOrEqual(40);
        expect(p.projectedOvr).toBeLessThanOrEqual(99);
        expect(p.confidence).toBeGreaterThanOrEqual(10);
        expect(p.confidence).toBeLessThanOrEqual(90);
      }
    });

    it('shows decline for older players (age 33+)', () => {
      const youngPlayer = makePlayer({ age: 24 });
      const oldPlayer = makePlayer({ age: 33 });

      const youngProjections = projectDevelopmentCurve(youngPlayer, null, 3);
      const oldProjections = projectDevelopmentCurve(oldPlayer, null, 3);

      // Old player should project lower OVR than young player by year 3
      const youngFinal = youngProjections[2]!.projectedOvr;
      const oldFinal = oldProjections[2]!.projectedOvr;
      expect(oldFinal).toBeLessThan(youngFinal);
    });
  });

  describe('identifyBreakoutCandidates', () => {
    it('finds players with 3+ OVR growth', () => {
      const breakoutPlayer = makePlayer({
        id: 'bp1',
        name: 'Breakout Star',
        age: 22,
        ovr: 78,
        careerStats: { previousSeasonOvr: 72, seasonStartOvr: 72, seasons: 1 },
      });
      const stagnantPlayer = makePlayer({
        id: 'sp1',
        name: 'Stagnant Guy',
        age: 23,
        ovr: 70,
        careerStats: { previousSeasonOvr: 69, seasonStartOvr: 69, seasons: 2 },
      });

      const team = makeTeam({ roster: [breakoutPlayer, stagnantPlayer] });
      const game = makeGameState({ team1: team });

      const candidates = identifyBreakoutCandidates(game, 'team1');

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.playerId).toBe('bp1');
      expect(candidates[0]!.ovrDelta).toBe(6);
      expect(candidates[0]!.reason).toContain('6-point');
    });

    it('ignores players over 27', () => {
      const oldBreakout = makePlayer({
        id: 'ob1',
        name: 'Old Breakout',
        age: 28,
        ovr: 85,
        careerStats: { previousSeasonOvr: 79, seasonStartOvr: 79, seasons: 7 },
      });

      const team = makeTeam({ roster: [oldBreakout] });
      const game = makeGameState({ team1: team });

      const candidates = identifyBreakoutCandidates(game, 'team1');

      expect(candidates).toHaveLength(0);
    });
  });

  describe('createDevelopmentSnapshot', () => {
    it('captures rating deltas correctly', () => {
      const player = makePlayer({
        ratings: { speed: 90, catching: 65, blocking: 48 },
      });
      const previousRatings: Record<string, number> = {
        speed: 88,
        catching: 65,
        blocking: 45,
      };

      const snapshot = createDevelopmentSnapshot(player, 2027, previousRatings);

      expect(snapshot.year).toBe(2027);
      expect(snapshot.ovr).toBe(75);
      // speed went from 88 → 90 = +2
      expect(snapshot.ratingDeltas['speed']).toBe(2);
      // catching unchanged, should not appear
      expect(snapshot.ratingDeltas['catching']).toBeUndefined();
      // blocking went from 45 → 48 = +3
      expect(snapshot.ratingDeltas['blocking']).toBe(3);
      expect(snapshot.archetypeAlignment).toBeGreaterThanOrEqual(0);
      expect(snapshot.archetypeAlignment).toBeLessThanOrEqual(100);
    });
  });
});
