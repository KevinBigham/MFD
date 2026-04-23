import { describe, it, expect } from 'vitest';
import { buildBroadcastPresentation, getBroadcastBeat } from './broadcast-presentation';
import type {
  BroadcastOutput,
  DriveNarrative,
  GameResult,
  PlayDescription,
} from '../types/sim';

function mkPlay(overrides: Partial<PlayDescription>): PlayDescription {
  return {
    type: 'pass',
    yardsGained: 10,
    playerIds: [],
    commentary: 'Standard play.',
    excitement: 1,
    isBigPlay: false,
    isClutch: false,
    ...overrides,
  };
}

function mkDrive(teamId: string, plays: PlayDescription[], endResult: DriveNarrative['endResult'] = 'punt'): DriveNarrative {
  return {
    teamId,
    plays,
    startYardLine: 25,
    endResult,
    yardsTotal: plays.reduce((sum, p) => sum + (p.yardsGained ?? 0), 0),
    timeElapsed: 120,
    narrative: 'A drive.',
  };
}

function mkBroadcast(quarters: DriveNarrative[][]): BroadcastOutput {
  return {
    gameId: 'g1',
    quarters,
    highlights: [],
    mvpPlayerIds: [],
    momentumSwings: [],
    broadcastNetwork: 'ESPN8',
    finalNarrative: 'A tight one, right down to the wire.',
  };
}

function mkResult(homeScore: number, awayScore: number): GameResult {
  return {
    id: 'g1',
    homeTeamId: 'HOME',
    awayTeamId: 'AWAY',
    homeScore,
    awayScore,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {} as never,
    playerMatchupEvents: [],
  };
}

describe('broadcast-presentation / buildBroadcastPresentation', () => {
  it('returns opening + final only when broadcast is missing', () => {
    const presentation = buildBroadcastPresentation(mkResult(21, 17), null);
    expect(presentation.beats).toHaveLength(2);
    expect(presentation.beats[0]!.kind).toBe('opening');
    expect(presentation.beats[1]!.kind).toBe('final');
    expect(presentation.beats[1]!.chyron).toContain('21-17');
  });

  it('returns opening + final only when quarters are empty', () => {
    const presentation = buildBroadcastPresentation(mkResult(10, 3), mkBroadcast([]));
    expect(presentation.beats).toHaveLength(2);
    expect(presentation.totalDurationSec).toBe(2 * 8); // default 8s per beat
  });

  it('curates top-N beats by intensity, clamped to [3, 12]', () => {
    const manyPlays = Array.from({ length: 20 }, (_, i) =>
      mkPlay({ excitement: i, yardsGained: i, isBigPlay: i > 15 }),
    );
    const broadcast = mkBroadcast([[mkDrive('HOME', manyPlays)]]);
    const defaultRun = buildBroadcastPresentation(mkResult(14, 10), broadcast);
    // 6 content + opening + final = 8 beats
    expect(defaultRun.beats).toHaveLength(8);
    expect(defaultRun.beats[0]!.kind).toBe('opening');
    expect(defaultRun.beats[defaultRun.beats.length - 1]!.kind).toBe('final');

    const wide = buildBroadcastPresentation(mkResult(14, 10), broadcast, { maxHighlights: 50 });
    // Clamped to max 12 content + 2 bookends
    expect(wide.beats).toHaveLength(14);

    const tight = buildBroadcastPresentation(mkResult(14, 10), broadcast, { maxHighlights: 0 });
    expect(tight.beats).toHaveLength(5); // 3 (min) + 2 bookends
  });

  it('classifies the single highest-intensity play as turning-point', () => {
    const plays = [
      mkPlay({ excitement: 2, commentary: 'mild' }),
      mkPlay({ excitement: 10, isClutch: true, leverageIndex: 3, commentary: 'THE play' }),
      mkPlay({ excitement: 4, commentary: 'solid' }),
    ];
    const broadcast = mkBroadcast([[mkDrive('HOME', plays)]]);
    const pres = buildBroadcastPresentation(mkResult(10, 7), broadcast, { maxHighlights: 3 });
    const turningPoints = pres.beats.filter((b) => b.kind === 'turning-point');
    expect(turningPoints).toHaveLength(1);
    expect(turningPoints[0]!.commentary).toBe('THE play');
  });

  it('beats are ordered chronologically even though selection is by intensity', () => {
    const plays = [
      mkPlay({ excitement: 9, commentary: 'q1 early' }),
      mkPlay({ excitement: 8, commentary: 'q1 late' }),
    ];
    const playsQ2 = [
      mkPlay({ excitement: 10, commentary: 'q2 early' }),
    ];
    const broadcast = mkBroadcast([
      [mkDrive('HOME', plays)],
      [mkDrive('AWAY', playsQ2)],
    ]);
    const pres = buildBroadcastPresentation(mkResult(7, 3), broadcast, { maxHighlights: 3 });
    const content = pres.beats.filter((b) => b.kind !== 'opening' && b.kind !== 'final');
    // Should be q1 -> q1 -> q2 in time order
    expect(content.map((b) => b.quarter)).toEqual([1, 1, 2]);
  });

  it('marks plays at indices listed in momentumSwings as momentum-swing kind', () => {
    const plays = [mkPlay({ excitement: 5 }), mkPlay({ excitement: 5 }), mkPlay({ excitement: 5 })];
    const broadcast: BroadcastOutput = {
      ...mkBroadcast([[mkDrive('HOME', plays)]]),
      momentumSwings: [{ quarter: 1, play: 1, description: 'shift' }],
    };
    const pres = buildBroadcastPresentation(mkResult(7, 7), broadcast, { maxHighlights: 3 });
    const swing = pres.beats.find((b) => b.kind === 'momentum-swing');
    expect(swing).toBeDefined();
  });

  it('tracks cumulative score at each beat', () => {
    const plays = [
      mkPlay({ type: 'touchdown', yardsGained: 60, commentary: 'HOME TD', excitement: 8 }),
    ];
    const playsQ2 = [
      mkPlay({ type: 'fieldGoal', yardsGained: 0, commentary: 'AWAY FG', excitement: 4 }),
    ];
    const broadcast = mkBroadcast([
      [mkDrive('HOME', plays, 'touchdown')],
      [mkDrive('AWAY', playsQ2, 'fieldGoal')],
    ]);
    const pres = buildBroadcastPresentation(mkResult(7, 3), broadcast, { maxHighlights: 3 });
    const beatTd = pres.beats.find((b) => b.commentary === 'HOME TD');
    const beatFg = pres.beats.find((b) => b.commentary === 'AWAY FG');
    expect(beatTd?.homeScore).toBe(7);
    expect(beatTd?.awayScore).toBe(0);
    expect(beatFg?.homeScore).toBe(7);
    expect(beatFg?.awayScore).toBe(3);
  });

  it('does NOT mutate the broadcast input', () => {
    const plays = [mkPlay({ excitement: 9 }), mkPlay({ excitement: 2 })];
    const broadcast = mkBroadcast([[mkDrive('HOME', plays)]]);
    const snapshot = structuredClone(broadcast);
    buildBroadcastPresentation(mkResult(10, 3), broadcast, { maxHighlights: 3 });
    expect(broadcast).toEqual(snapshot);
  });
});

describe('broadcast-presentation / getBroadcastBeat', () => {
  it('returns the beat at a valid index', () => {
    const plays = [mkPlay({ excitement: 5 })];
    const broadcast = mkBroadcast([[mkDrive('HOME', plays)]]);
    const pres = buildBroadcastPresentation(mkResult(7, 0), broadcast, { maxHighlights: 3 });
    const beat = getBroadcastBeat(pres, 0);
    expect(beat).not.toBeNull();
    expect(beat?.kind).toBe('opening');
  });

  it('returns null for out-of-range indices', () => {
    const pres = buildBroadcastPresentation(mkResult(0, 0), null);
    expect(getBroadcastBeat(pres, -1)).toBeNull();
    expect(getBroadcastBeat(pres, 999)).toBeNull();
  });
});
