import { describe, it, expect } from 'vitest';
import type { DriveNarrative, BroadcastOutput } from '../types';
import {
  getQuarterMomentum,
  getDriveEfficiency,
  getScoringRuns,
  getWinProbabilityCurve,
  identifyTurningPoint,
  analyzeGameFlow,
} from './game-flow';

// ── Test Constants ─────────────────────────────────────────────

const HOME_TEAM = 'home-team';
const AWAY_TEAM = 'away-team';

// ── Helpers ────────────────────────────────────────────────────

function mockDrive(
  teamId: string,
  result: DriveNarrative['endResult'],
  yards: number,
  plays: number,
): DriveNarrative {
  return {
    teamId,
    plays: Array.from({ length: plays }, (_, i) => ({
      type: 'run' as const,
      yardsGained: Math.floor(yards / plays),
      playerIds: [],
      commentary: `Play ${i + 1}`,
      excitement: i === 0 ? 8 : 3,
      isBigPlay: i === 0,
      isClutch: false,
    })),
    startYardLine: 25,
    yardsTotal: yards,
    timeElapsed: plays * 30,
    endResult: result,
    narrative: `Drive ending in ${result}`,
  };
}

function mockBroadcast(quarters: DriveNarrative[][]): BroadcastOutput {
  return {
    gameId: 'test-game',
    quarters,
    highlights: [],
    mvpPlayerIds: [],
    momentumSwings: [],
    broadcastNetwork: 'MFD',
    finalNarrative: 'Test game.',
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('getQuarterMomentum', () => {
  it('correctly counts drives and yards', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(AWAY_TEAM, 'punt', 20, 3),
        mockDrive(HOME_TEAM, 'fieldGoal', 45, 5),
      ],
      [], [], [],
    ];

    const momentum = getQuarterMomentum(quarters, 0, HOME_TEAM);

    expect(momentum.quarter).toBe(1);
    expect(momentum.homeDrives).toBe(2);
    expect(momentum.awayDrives).toBe(1);
    expect(momentum.homeYards).toBe(120);
    expect(momentum.awayYards).toBe(20);
    expect(momentum.homePoints).toBe(10);
    expect(momentum.awayPoints).toBe(0);
  });

  it('identifies dominant team when one side has 2x+ yards', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 80, 6),
        mockDrive(AWAY_TEAM, 'punt', 15, 3),
      ],
      [], [], [],
    ];

    const momentum = getQuarterMomentum(quarters, 0, HOME_TEAM);
    expect(momentum.dominantTeam).toBe('home');
  });

  it('returns even when yards are close', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'punt', 40, 4),
        mockDrive(AWAY_TEAM, 'punt', 35, 4),
      ],
      [], [], [],
    ];

    const momentum = getQuarterMomentum(quarters, 0, HOME_TEAM);
    expect(momentum.dominantTeam).toBe('even');
  });

  it('counts big plays with excitement >= 7', () => {
    const quarters: DriveNarrative[][] = [
      [mockDrive(HOME_TEAM, 'touchdown', 75, 6)],
      [], [], [],
    ];

    // mockDrive sets excitement=8 for the first play in each drive
    const momentum = getQuarterMomentum(quarters, 0, HOME_TEAM);
    expect(momentum.bigPlays).toBe(1);
  });
});

describe('getDriveEfficiency', () => {
  it('calculates scoring rate correctly', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(HOME_TEAM, 'fieldGoal', 40, 5),
        mockDrive(HOME_TEAM, 'punt', 20, 4),
        mockDrive(AWAY_TEAM, 'touchdown', 65, 7),
      ],
      [], [], [],
    ];

    const efficiency = getDriveEfficiency(quarters, HOME_TEAM);

    expect(efficiency.totalDrives).toBe(3);
    expect(efficiency.scoringDrives).toBe(2);
    expect(efficiency.scoringRate).toBeCloseTo(2 / 3);
  });

  it('counts three-and-outs', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'punt', 8, 3),
        mockDrive(HOME_TEAM, 'punt', 5, 2),
        mockDrive(HOME_TEAM, 'punt', 30, 5), // too many plays
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
      ],
      [], [], [],
    ];

    const efficiency = getDriveEfficiency(quarters, HOME_TEAM);

    // First two are three-and-outs (3 or fewer plays + punt)
    expect(efficiency.threeAndOuts).toBe(2);
  });

  it('tracks best drive yards', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 85, 8),
        mockDrive(HOME_TEAM, 'fieldGoal', 40, 5),
      ],
      [], [], [],
    ];

    const efficiency = getDriveEfficiency(quarters, HOME_TEAM);
    expect(efficiency.bestDriveYards).toBe(85);
  });

  it('returns zeroed report for team with no drives', () => {
    const quarters: DriveNarrative[][] = [
      [mockDrive(HOME_TEAM, 'touchdown', 75, 6)],
      [], [], [],
    ];

    const efficiency = getDriveEfficiency(quarters, AWAY_TEAM);
    expect(efficiency.totalDrives).toBe(0);
    expect(efficiency.scoringRate).toBe(0);
  });
});

describe('getScoringRuns', () => {
  it('detects consecutive scoring by same team', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(AWAY_TEAM, 'punt', 15, 3),
        mockDrive(HOME_TEAM, 'touchdown', 80, 7),
        mockDrive(AWAY_TEAM, 'punt', 10, 3),
        mockDrive(HOME_TEAM, 'fieldGoal', 45, 5),
      ],
      [], [], [],
    ];

    const runs = getScoringRuns(quarters, HOME_TEAM);

    expect(runs.length).toBe(1);
    expect(runs[0]!.teamSide).toBe('home');
    expect(runs[0]!.points).toBe(17); // 7 + 7 + 3
    expect(runs[0]!.drives).toBe(3);
  });

  it('does not count a single scoring drive as a run', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(AWAY_TEAM, 'touchdown', 70, 5),
      ],
      [], [], [],
    ];

    const runs = getScoringRuns(quarters, HOME_TEAM);
    expect(runs.length).toBe(0);
  });

  it('detects runs spanning multiple quarters', () => {
    const quarters: DriveNarrative[][] = [
      [mockDrive(HOME_TEAM, 'touchdown', 75, 6)],
      [mockDrive(HOME_TEAM, 'fieldGoal', 40, 5)],
      [], [],
    ];

    const runs = getScoringRuns(quarters, HOME_TEAM);

    expect(runs.length).toBe(1);
    expect(runs[0]!.startQuarter).toBe(1);
    expect(runs[0]!.endQuarter).toBe(2);
  });
});

describe('getWinProbabilityCurve', () => {
  it('starts at ~50 for first point', () => {
    const quarters: DriveNarrative[][] = [
      [mockDrive(HOME_TEAM, 'punt', 20, 4)],
      [], [], [],
    ];

    const curve = getWinProbabilityCurve(quarters, HOME_TEAM);

    expect(curve[0]!.homeWinProb).toBe(50);
  });

  it('shifts toward scoring team', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(AWAY_TEAM, 'punt', 15, 3),
      ],
      [], [], [],
    ];

    const curve = getWinProbabilityCurve(quarters, HOME_TEAM);

    // After home TD, probability should be > 50
    expect(curve[1]!.homeWinProb).toBeGreaterThan(50);
    // After away punt (no score change), should stay the same
    expect(curve[2]!.homeWinProb).toBe(curve[1]!.homeWinProb);
  });

  it('shifts away from home when away scores', () => {
    const quarters: DriveNarrative[][] = [
      [mockDrive(AWAY_TEAM, 'touchdown', 80, 7)],
      [], [], [],
    ];

    const curve = getWinProbabilityCurve(quarters, HOME_TEAM);

    expect(curve[1]!.homeWinProb).toBeLessThan(50);
  });
});

describe('identifyTurningPoint', () => {
  it('returns null for an even game', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'punt', 30, 4),
        mockDrive(AWAY_TEAM, 'punt', 25, 4),
      ],
      [
        mockDrive(HOME_TEAM, 'punt', 28, 4),
        mockDrive(AWAY_TEAM, 'punt', 22, 3),
      ],
      [], [],
    ];

    const tp = identifyTurningPoint(quarters, HOME_TEAM);
    expect(tp).toBeNull();
  });

  it('finds turning point on a big scoring play', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'punt', 20, 3),
        mockDrive(AWAY_TEAM, 'punt', 18, 3),
      ],
      [],
      [],
      [
        // Late TD in Q4 with high multiplier should cause big swing
        mockDrive(HOME_TEAM, 'touchdown', 85, 8),
      ],
    ];

    const tp = identifyTurningPoint(quarters, HOME_TEAM);

    expect(tp).not.toBeNull();
    expect(tp!.quarter).toBe(4);
    expect(tp!.winProbSwing).toBeGreaterThan(TURNING_POINT_MIN_SWING);
  });
});

// Use a local constant so the test is self-documenting
const TURNING_POINT_MIN_SWING = 5;

describe('analyzeGameFlow', () => {
  it('returns complete analysis with all sections', () => {
    const quarters: DriveNarrative[][] = [
      [
        mockDrive(HOME_TEAM, 'touchdown', 75, 6),
        mockDrive(AWAY_TEAM, 'punt', 15, 3),
      ],
      [
        mockDrive(HOME_TEAM, 'fieldGoal', 40, 5),
        mockDrive(AWAY_TEAM, 'touchdown', 80, 7),
      ],
      [
        mockDrive(HOME_TEAM, 'punt', 25, 4),
        mockDrive(AWAY_TEAM, 'fieldGoal', 35, 5),
      ],
      [
        mockDrive(HOME_TEAM, 'touchdown', 70, 6),
        mockDrive(AWAY_TEAM, 'punt', 10, 3),
      ],
    ];

    const broadcast = mockBroadcast(quarters);
    const analysis = analyzeGameFlow(broadcast, HOME_TEAM, AWAY_TEAM);

    expect(analysis.quarterMomentum).toHaveLength(4);
    expect(analysis.quarterMomentum[0]!.quarter).toBe(1);
    expect(analysis.quarterMomentum[3]!.quarter).toBe(4);

    expect(analysis.driveEfficiency.home.totalDrives).toBe(4);
    expect(analysis.driveEfficiency.away.totalDrives).toBe(4);

    expect(Array.isArray(analysis.scoringRuns)).toBe(true);
    expect(analysis.winProbability.length).toBeGreaterThan(0);
    expect(analysis.winProbability[0]!.homeWinProb).toBe(50);

    // turningPoint can be null or an object — just verify shape
    if (analysis.turningPoint !== null) {
      expect(analysis.turningPoint).toHaveProperty('driveIndex');
      expect(analysis.turningPoint).toHaveProperty('quarter');
      expect(analysis.turningPoint).toHaveProperty('winProbSwing');
    }
  });
});
