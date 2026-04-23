import { STARTER_SLOTS } from '../systems/roster-management';
import type { GameState, Player, Team } from '../types';
import {
  canonicalJsonStringify,
  detectCapSanity,
  detectMonotonicTime,
  detectPerfBudget,
  detectPhaseBoundaries,
  detectRngChannel,
  detectRosterMinimums,
  detectSaveRoundTrip,
  saveRoundTripBytes,
} from './anomaly-detectors';
import { PLAYTEST_PERSONAS } from './personas';
import type { PlaytestDetectorContext } from './types';

function makePlayer(id: string, pos: Player['pos'], unavailable = false): Player {
  return {
    id,
    pos,
    injury: unavailable ? { gamesOut: 2, onIR: false } : null,
  } as unknown as Player;
}

function makeRoster(teamId: string): Player[] {
  return Object.entries(STARTER_SLOTS).flatMap(([pos, count]) =>
    Array.from({ length: count }, (_, index) => makePlayer(`${teamId}-${pos}-${index}`, pos as Player['pos'])),
  );
}

function makeTeam(id: string, roster = makeRoster(id)): Team {
  return {
    id,
    roster,
    capSpace: 25,
    capUsed: 210,
    deadCap: 5,
    isUser: false,
  } as unknown as Team;
}

function makeContext(overrides: Partial<PlaytestDetectorContext> = {}): PlaytestDetectorContext {
  return {
    step: 1,
    seed: 42,
    persona: PLAYTEST_PERSONAS[0]!,
    previousFrame: { year: 2026, week: 1, phase: 'regular_season' },
    currentFrame: { year: 2026, week: 2, phase: 'regular_season' },
    state: {
      version: 34,
      teams: {
        home: makeTeam('home'),
      },
    } as unknown as GameState,
    serializedState: '{"ok":true}',
    roundTripSerializedState: '{"ok":true}',
    mathRandomCalls: 0,
    elapsedMs: 120,
    elapsedHistoryMs: [100, 120, 150],
    completedSeasons: 0,
    weeksAdvanced: 1,
    ...overrides,
  };
}

describe('playtest anomaly detectors', () => {
  it('canonicalJsonStringify sorts object keys deterministically', () => {
    expect(canonicalJsonStringify({ z: 1, a: { d: 2, c: 1 } })).toBe('{"a":{"c":1,"d":2},"z":1}');
  });

  it('saveRoundTripBytes returns an error sentinel for invalid save payloads', () => {
    expect(saveRoundTripBytes({ bad: true } as unknown as GameState).startsWith('__PLAYTEST_ROUNDTRIP_ERROR__')).toBe(true);
  });

  it('detectCapSanity passes when all team cap fields are finite and in range', () => {
    expect(detectCapSanity(makeContext())).toEqual({ ok: true });
  });

  it('detectCapSanity fails when a team cap field is invalid', () => {
    const verdict = detectCapSanity(makeContext({
      state: {
        version: 34,
        teams: {
          bad: {
            ...makeTeam('bad'),
            capSpace: Number.NaN,
          },
        },
      } as unknown as GameState,
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectRosterMinimums passes with a full healthy starter set', () => {
    expect(detectRosterMinimums(makeContext())).toEqual({ ok: true });
  });

  it('detectRosterMinimums fails when a team is short at a required position', () => {
    const roster = makeRoster('short').filter((player) => !(player.pos === 'QB' && player.id.endsWith('-0')));
    const verdict = detectRosterMinimums(makeContext({
      state: {
        version: 34,
        teams: { short: makeTeam('short', roster) },
      } as unknown as GameState,
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('QB');
    expect(verdict.ok ? null : verdict.severity).toBe('medium');
  });

  it('detectMonotonicTime fails when the week regresses inside the same phase', () => {
    const verdict = detectMonotonicTime(makeContext({
      previousFrame: { year: 2026, week: 4, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 3, phase: 'regular_season' },
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectPhaseBoundaries accepts a normal regular-season week advance', () => {
    expect(detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 7, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 8, phase: 'regular_season' },
    }))).toEqual({ ok: true });
  });

  it('detectPhaseBoundaries fails on an unexpected transition', () => {
    const verdict = detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 18, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 1, phase: 'free_agency' },
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Unexpected phase boundary');
  });

  it('detectSaveRoundTrip passes when canonical bytes match', () => {
    expect(detectSaveRoundTrip(makeContext())).toEqual({ ok: true });
  });

  it('detectSaveRoundTrip fails when canonical bytes drift', () => {
    const verdict = detectSaveRoundTrip(makeContext({
      roundTripSerializedState: '{"ok":false}',
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectRngChannel fails when Math.random is observed', () => {
    const verdict = detectRngChannel(makeContext({ mathRandomCalls: 2 }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Math.random');
  });

  it('detectPerfBudget flags p99 latency overruns', () => {
    const verdict = detectPerfBudget(makeContext({ elapsedHistoryMs: [100, 110, 900] }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('medium');
  });
});
