import { describe, expect, it } from 'vitest';

import type { BroadcastOutput, DriveNarrative, PlayDescription } from '../types';

import {
  analyzeCoachingAdjustments,
  analyzePlayTendencies,
  analyzeSituationalSuccess,
  generateEnhancedFilmReport,
  getSeasonTendencies,
} from './film-room-analysis';

function mockPlay(overrides: Partial<PlayDescription> = {}): PlayDescription {
  return {
    type: 'run',
    yardsGained: 5,
    playerIds: [],
    commentary: '',
    excitement: 3,
    isBigPlay: false,
    isClutch: false,
    ...overrides,
  };
}

function mockBroadcast(teamId: string, drives: Partial<DriveNarrative>[]): BroadcastOutput {
  const quarters: DriveNarrative[][] = [[], [], [], []];
  drives.forEach((d, i) => {
    const q = Math.min(Math.floor(i / 2), 3);
    quarters[q].push({
      teamId,
      plays: d.plays ?? [
        mockPlay({ type: 'run', yardsGained: 5 }),
        mockPlay({ type: 'pass', yardsGained: 10 }),
      ],
      startYardLine: d.startYardLine ?? 25,
      yardsTotal: d.yardsTotal ?? 40,
      timeElapsed: d.timeElapsed ?? 120,
      endResult: d.endResult ?? 'punt',
      narrative: d.narrative ?? 'Drive narrative',
    });
  });
  return {
    gameId: 'test-game',
    quarters,
    highlights: [],
    momentumSwings: [],
    mvpPlayerIds: [],
    finalNarrative: '',
    broadcastNetwork: 'MFN',
  };
}

describe('film-room-analysis', () => {
  const TEAM = 'team-a';

  it('analyzePlayTendencies counts run and pass plays correctly', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'pass' }),
        ],
      },
      {
        plays: [
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'run' }),
        ],
      },
    ]);

    const report = analyzePlayTendencies(broadcast, TEAM);
    expect(report.runPlays).toBe(3);
    expect(report.passPlays).toBe(3);
    expect(report.totalPlays).toBe(6);
    expect(report.runRate).toBeCloseTo(0.5);
    expect(report.passRate).toBeCloseTo(0.5);
  });

  it('analyzePlayTendencies calculates big play rate', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run', excitement: 8 }),
          mockPlay({ type: 'pass', excitement: 3 }),
          mockPlay({ type: 'run', excitement: 9 }),
          mockPlay({ type: 'pass', excitement: 2 }),
        ],
      },
    ]);

    const report = analyzePlayTendencies(broadcast, TEAM);
    expect(report.bigPlayRate).toBeCloseTo(0.5); // 2 out of 4 plays have excitement >= 7
  });

  it('analyzePlayTendencies counts explosive plays', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run', yardsGained: 25 }),
          mockPlay({ type: 'pass', yardsGained: 5 }),
          mockPlay({ type: 'pass', yardsGained: 45 }),
        ],
      },
    ]);

    const report = analyzePlayTendencies(broadcast, TEAM);
    expect(report.explosivePlayCount).toBe(2);
  });

  it('analyzeSituationalSuccess tracks clutch plays', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ isClutch: true, yardsGained: 15 }),
          mockPlay({ isClutch: true, yardsGained: -2 }),
          mockPlay({ isClutch: false, yardsGained: 8 }),
        ],
      },
    ]);

    const report = analyzeSituationalSuccess(broadcast, TEAM);
    expect(report.clutchPlays.total).toBe(2);
    expect(report.clutchPlays.successful).toBe(1); // only the one with positive yards
    expect(report.clutchPlays.rate).toBeCloseTo(0.5);
  });

  it('analyzeCoachingAdjustments detects run rate changes', () => {
    // First half: mostly runs (Q1 drives)
    // Second half: mostly passes (Q3/Q4 drives)
    const broadcast: BroadcastOutput = {
      gameId: 'test-game',
      quarters: [
        // Q1 - heavy run
        [
          {
            teamId: TEAM,
            plays: [
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'pass' }),
            ],
            startYardLine: 25,
            yardsTotal: 40,
            timeElapsed: 120,
            endResult: 'punt',
            narrative: '',
          },
        ],
        // Q2 - heavy run
        [
          {
            teamId: TEAM,
            plays: [
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'run' }),
              mockPlay({ type: 'pass' }),
            ],
            startYardLine: 25,
            yardsTotal: 40,
            timeElapsed: 120,
            endResult: 'punt',
            narrative: '',
          },
        ],
        // Q3 - heavy pass
        [
          {
            teamId: TEAM,
            plays: [
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'run' }),
            ],
            startYardLine: 25,
            yardsTotal: 40,
            timeElapsed: 120,
            endResult: 'punt',
            narrative: '',
          },
        ],
        // Q4 - heavy pass
        [
          {
            teamId: TEAM,
            plays: [
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'pass' }),
              mockPlay({ type: 'run' }),
            ],
            startYardLine: 25,
            yardsTotal: 40,
            timeElapsed: 120,
            endResult: 'punt',
            narrative: '',
          },
        ],
      ],
      highlights: [],
      momentumSwings: [],
      mvpPlayerIds: [],
      finalNarrative: '',
      broadcastNetwork: 'MFN',
    };

    const adjustments = analyzeCoachingAdjustments(broadcast, TEAM);
    const runAdj = adjustments.find((a) => a.type === 'run_decrease');
    expect(runAdj).toBeDefined();
    expect(runAdj!.firstHalfValue).toBeCloseTo(0.75);
    expect(runAdj!.secondHalfValue).toBeCloseTo(0.25);
  });

  it('generateEnhancedFilmReport produces headline based on run/pass balance', () => {
    // Heavy run broadcast
    const runHeavy = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'pass' }),
        ],
      },
      {
        plays: [
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'pass' }),
        ],
      },
    ]);
    const runReport = generateEnhancedFilmReport(runHeavy, TEAM);
    expect(runReport.headline).toBe('Ground and Pound Attack');

    // Heavy pass broadcast
    const passHeavy = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'run' }),
        ],
      },
      {
        plays: [
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'run' }),
        ],
      },
    ]);
    const passReport = generateEnhancedFilmReport(passHeavy, TEAM);
    expect(passReport.headline).toBe('Air Raid Offense');

    // Balanced
    const balanced = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'pass' }),
          mockPlay({ type: 'run' }),
          mockPlay({ type: 'pass' }),
        ],
      },
    ]);
    const balancedReport = generateEnhancedFilmReport(balanced, TEAM);
    expect(balancedReport.headline).toBe('Balanced Attack');
  });

  it('getSeasonTendencies averages multiple reports', () => {
    const reports = [
      analyzePlayTendencies(
        mockBroadcast(TEAM, [
          { plays: [mockPlay({ type: 'run' }), mockPlay({ type: 'pass' })] },
        ]),
        TEAM,
      ),
      analyzePlayTendencies(
        mockBroadcast(TEAM, [
          { plays: [mockPlay({ type: 'run' }), mockPlay({ type: 'pass' })] },
        ]),
        TEAM,
      ),
    ];

    const season = getSeasonTendencies(reports);
    expect(season.gamesAnalyzed).toBe(2);
    expect(season.avgRunRate).toBeCloseTo(0.5);
    expect(season.avgPassRate).toBeCloseTo(0.5);
    expect(season.consistency).toBe(100); // identical games = 0 std dev = 100 consistency
  });

  it('generateEnhancedFilmReport assigns grade A for high performance', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run', excitement: 8, yardsGained: 25, isBigPlay: true }),
          mockPlay({ type: 'pass', excitement: 9, yardsGained: 30, isBigPlay: true }),
          mockPlay({ type: 'run', excitement: 7, yardsGained: 22 }),
        ],
        yardsTotal: 60,
        endResult: 'touchdown',
      },
      {
        plays: [
          mockPlay({ type: 'pass', excitement: 8, yardsGained: 40, isBigPlay: true }),
          mockPlay({ type: 'run', excitement: 2, yardsGained: 3 }),
        ],
        yardsTotal: 55,
        endResult: 'fieldGoal',
      },
    ]);

    const report = generateEnhancedFilmReport(broadcast, TEAM);
    // bigPlayRate = 3/5 excitement >= 7 = 0.6 > 0.15
    // redZone: 2 drives with yardsTotal >= 50, both score = efficiency 1.0 > 0.6
    expect(report.overallGrade).toBe('A');
  });

  it('generateEnhancedFilmReport assigns lower grade for poor performance', () => {
    const broadcast = mockBroadcast(TEAM, [
      {
        plays: [
          mockPlay({ type: 'run', excitement: 2, yardsGained: 3 }),
          mockPlay({ type: 'pass', excitement: 1, yardsGained: 2 }),
          mockPlay({ type: 'run', excitement: 2, yardsGained: 1 }),
        ],
        yardsTotal: 10,
        endResult: 'punt',
      },
    ]);

    const report = generateEnhancedFilmReport(broadcast, TEAM);
    expect(report.overallGrade).toBe('D');
  });
});
