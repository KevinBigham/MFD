import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { getSalaryCap } from '../config/cap-math';
import { buildCapVisualization } from './cap-visualization';
import { makeContract } from './contracts';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { makePlayer, makeTeam } from './test-helpers';

describe('cap visualization', () => {
  it('builds positional cap breakdown, top hits, and future projections from v36 cap hits', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.deadCap = 6;
    team.roster = [
      makePlayer('qb-1', team.id, 'QB', 82),
      makePlayer('rb-1', team.id, 'RB', 72),
      makePlayer('wr-1', team.id, 'WR', 68),
      makePlayer('fa-1', team.id, 'TE', 79),
    ];
    team.roster[0]!.contract = makeContract(20, 4, 10, 10, 'qb-1', team.id);
    team.roster[1]!.contract = makeContract(8, 3, 3, 3, 'rb-1', team.id);
    team.roster[2]!.contract = makeContract(15, 1, 0, 0, 'wr-1', team.id);
    team.roster[3]!.contract = null;

    const viz = buildCapVisualization(team, 2026);

    expect(viz).toMatchObject({
      totalUsed: 46.5,
      capRoom: 202.5,
      deadCap: 6,
      salaryCap: 255,
    });
    expect(viz?.breakdown).toEqual([
      { pos: 'QB', cap: 22.5, pct: 48.4 },
      { pos: 'WR', cap: 15, pct: 32.3 },
      { pos: 'RB', cap: 9, pct: 19.4 },
    ]);
    expect(viz?.topHits).toEqual([
      { name: 'qb-1 Player', pos: 'QB', ovr: 82, age: 26, salary: 22.5, years: 4, value: 'Fair' },
      { name: 'wr-1 Player', pos: 'WR', ovr: 68, age: 26, salary: 15, years: 1, value: 'Overpay' },
      { name: 'rb-1 Player', pos: 'RB', ovr: 72, age: 26, salary: 9, years: 3, value: 'Watch' },
    ]);
    expect(viz?.projections).toEqual([
      { year: 2027, committed: 31.5, expiring: 15, space: 235.5, warning: '' },
      { year: 2028, committed: 31.5, expiring: 15, space: 249.5, warning: '' },
      { year: 2029, committed: 22.5, expiring: 24, space: 272.5, warning: '' },
    ]);
  });

  it('returns an empty zeroed visualization for teams with no active contracts', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.deadCap = 4;
    team.roster = [makePlayer('qb-1', team.id, 'QB', 82)];
    team.roster[0]!.contract = null;

    expect(buildCapVisualization(team, 2026)).toEqual({
      breakdown: [],
      topHits: [],
      projections: [
        { year: 2027, committed: 0, expiring: 0, space: 267, warning: '' },
        { year: 2028, committed: 0, expiring: 0, space: 281, warning: '' },
        { year: 2029, committed: 0, expiring: 0, space: 295, warning: '' },
      ],
      totalUsed: 0,
      capRoom: 251,
      deadCap: 4,
      salaryCap: 255,
    });
  });

  it('uses active salary cap growth rules for current and future display caps', () => {
    const team = makeTeam('afce1', 'AFC', 'East', true);
    team.deadCap = 4;
    team.roster = [];
    const leagueRules = applyRuleChange(initLeagueRules(2028), {
      key: 'salary_cap_growth',
      newValue: 0.1,
      source: 'cba',
      proposedBy: 'owners',
      effectiveYear: 2028,
      rationale: 'Open room for a new media deal.',
    });
    const game = { year: 2028, leagueRules } as unknown as GameState;

    const viz = buildCapVisualization(team, 2028, game);

    expect(viz?.salaryCap).toBe(getSalaryCap(2028, game));
    expect(viz?.salaryCap).toBeGreaterThan(getSalaryCap(2028));
    expect(viz?.capRoom).toBe(getSalaryCap(2028, game) - 4);
    expect(viz?.projections[0]?.space).toBe(getSalaryCap(2029, game));
    expect(viz?.projections[0]?.space).toBeGreaterThan(getSalaryCap(2029));
  });

  it('returns null when no team is available', () => {
    expect(buildCapVisualization(null)).toBeNull();
  });
});
