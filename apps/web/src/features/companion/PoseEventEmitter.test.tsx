import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '@mfd/engine';
import type { ChipPoseEvent, ChipPoseEventTrigger } from './eventBridge';
import {
  buildPoseEmitterSnapshot,
  derivePoseEvents,
  dispatchPoseEvents,
  type PoseEmitterSnapshot,
} from './PoseEventEmitter';

function makeSnapshot(overrides: Partial<PoseEmitterSnapshot> = {}): PoseEmitterSnapshot {
  return {
    week: 1,
    season: 2026,
    latestGameId: null,
    latestGamePhase: 'regular_season',
    userTeamId: 'user',
    userWonLatestGame: false,
    latestGameMargin: 0,
    latestGameOvertime: false,
    latestUserTouchdowns: 0,
    capProjectionOverLimit: false,
    playoffUnderdogWin: false,
    tradeRumorSignature: null,
    userHallOfFameSignature: null,
    pendingDecisionTotal: 0,
    firstLaunchActive: false,
    ...overrides,
  };
}

function eventTriggers(events: readonly ChipPoseEvent[]): ChipPoseEventTrigger[] {
  return events.map((event) => event.trigger);
}

describe('PoseEventEmitter event derivation', () => {
  it('emits USER_TEAM_TOUCHDOWN when a new user game result includes touchdowns', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', latestUserTouchdowns: 0 });
    const current = makeSnapshot({ latestGameId: 'game-2', latestUserTouchdowns: 3 });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_TOUCHDOWN']);
  });

  it('does not emit USER_TEAM_TOUCHDOWN for a scoreless new user result', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', latestUserTouchdowns: 2 });
    const current = makeSnapshot({ latestGameId: 'game-2', latestUserTouchdowns: 0 });

    expect(eventTriggers(derivePoseEvents(current, previous))).not.toContain('USER_TEAM_TOUCHDOWN');
  });

  it('emits USER_TEAM_FIRST_LAUNCH once when the setup first-launch signal appears', () => {
    const current = makeSnapshot({ firstLaunchActive: true });

    expect(eventTriggers(derivePoseEvents(current, null))).toEqual(['USER_TEAM_FIRST_LAUNCH']);
  });

  it('emits CAP_PROJECTION_OVER_LIMIT when the projection crosses over the cap', () => {
    const previous = makeSnapshot({ capProjectionOverLimit: false });
    const current = makeSnapshot({ capProjectionOverLimit: true });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['CAP_PROJECTION_OVER_LIMIT']);
  });

  it('emits USER_TEAM_LOSS_BIG for a new user loss by at least 21', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1' });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: false,
      latestGameMargin: 28,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_LOSS_BIG']);
  });

  it('emits PLAYOFF_UPSET_WIN for a new playoff underdog win', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', playoffUnderdogWin: false });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      latestGamePhase: 'playoffs',
      userWonLatestGame: true,
      playoffUnderdogWin: true,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['PLAYOFF_UPSET_WIN']);
  });

  it('emits TRADE_RUMOR_FOR_USER_PLAYER when the user-player trade rumor signature changes', () => {
    const previous = makeSnapshot({ tradeRumorSignature: null });
    const current = makeSnapshot({ tradeRumorSignature: 'trade:user-wr:team-2' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['TRADE_RUMOR_FOR_USER_PLAYER']);
  });

  it('emits PLAYER_RETIREMENT_USER_HOF when a new user Hall of Fame signature appears', () => {
    const previous = makeSnapshot({ userHallOfFameSignature: null });
    const current = makeSnapshot({ userHallOfFameSignature: 'hof:user-qb:2032' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['PLAYER_RETIREMENT_USER_HOF']);
  });

  it('emits USER_DECISION_LOCKED_IN when pending decisions decrease', () => {
    const previous = makeSnapshot({ pendingDecisionTotal: 3 });
    const current = makeSnapshot({ pendingDecisionTotal: 2 });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_DECISION_LOCKED_IN']);
  });

  it('does not refire for an unchanged same-state tick', () => {
    const previous = makeSnapshot({
      latestGameId: 'game-2',
      latestUserTouchdowns: 3,
      capProjectionOverLimit: true,
      tradeRumorSignature: 'trade:user-wr:team-2',
    });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      latestUserTouchdowns: 3,
      capProjectionOverLimit: true,
      tradeRumorSignature: 'trade:user-wr:team-2',
    });

    expect(derivePoseEvents(current, previous)).toEqual([]);
  });

  it('dedupes rapid double-trigger dispatches by event id', () => {
    const setPose = vi.fn();
    const emittedIds = new Set<string>();
    const events = [
      { id: 'chip.pose.cap.2026.1', trigger: 'CAP_PROJECTION_OVER_LIMIT' },
      { id: 'chip.pose.cap.2026.1', trigger: 'CAP_PROJECTION_OVER_LIMIT' },
    ] satisfies ChipPoseEvent[];

    dispatchPoseEvents(events, {
      emittedIds,
      nowMs: () => 10_000,
      setPose,
    });
    dispatchPoseEvents(events, {
      emittedIds,
      nowMs: () => 10_010,
      setPose,
    });

    expect(setPose).toHaveBeenCalledTimes(1);
    expect(setPose).toHaveBeenCalledWith('head-in-hands', {
      durationMs: 3500,
      nowMs: 10_000,
      priority: 'warning',
    });
  });

  it('dispatches every Sprint 43 pose trigger through the bridge mapping', () => {
    const setPose = vi.fn();
    const triggers = [
      ['USER_TEAM_TOUCHDOWN', 'rallying', 4000, 'celebrate'],
      ['USER_TEAM_FIRST_LAUNCH', 'greeting', 5000, 'routine'],
      ['CAP_PROJECTION_OVER_LIMIT', 'head-in-hands', 3500, 'warning'],
      ['USER_TEAM_LOSS_BIG', 'facepalm', 6000, 'sad'],
      ['PLAYOFF_UPSET_WIN', 'laughing', 4000, 'routine'],
      ['TRADE_RUMOR_FOR_USER_PLAYER', 'on-phone', 3500, 'routine'],
      ['PLAYER_RETIREMENT_USER_HOF', 'head-in-hands', 4000, 'sad'],
      ['USER_DECISION_LOCKED_IN', 'fist-bump', 1500, 'routine'],
    ] satisfies Array<[ChipPoseEventTrigger, string, number, string | undefined]>;

    dispatchPoseEvents(
      triggers.map(([trigger], index) => ({ id: `chip.pose.${trigger}.${index}`, trigger })),
      {
        emittedIds: new Set<string>(),
        nowMs: () => 12_345,
        setPose,
      },
    );

    for (const [index, [, pose, durationMs, priority]] of triggers.entries()) {
      expect(setPose).toHaveBeenNthCalledWith(index + 1, pose, {
        durationMs,
        nowMs: 12_345,
        priority,
      });
    }
  });

  it('builds snapshots from the latest user playoff result before older regular-season results', () => {
    const game = {
      week: 19,
      year: 2030,
      phase: 'playoffs',
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [
        {
          games: [
            {
              result: {
                id: 'regular-17',
                homeTeamId: 'user',
                awayTeamId: 'away',
                homeScore: 17,
                awayScore: 20,
                year: 2030,
                week: 17,
                overtime: false,
                stats: { user: { passTDs: 1, rushTDs: 0 } },
              },
            },
          ],
        },
      ],
      playoffBracket: {
        matchups: [
          {
            result: {
              id: 'playoff-19',
              homeTeamId: 'away',
              awayTeamId: 'user',
              homeScore: 20,
              awayScore: 24,
              year: 2030,
              week: 19,
              overtime: false,
              stats: { user: { passTDs: 2, rushTDs: 1 } },
            },
          },
        ],
      },
      gameDayState: {
        latestPackageId: 'gameday-2030-19-user',
        recentPackages: [
          {
            id: 'gameday-2030-19-user',
            year: 2030,
            week: 19,
            phase: 'playoffs',
            teamId: 'user',
          },
        ],
      },
      playoffMomentum: {
        user: { narrativeTag: 'underdog' },
      },
      tradeSuggestions: [],
      hallOfFame: [],
    } as unknown as GameState;

    expect(buildPoseEmitterSnapshot(game)).toMatchObject({
      latestGameId: 'playoff-19',
      latestGamePhase: 'playoffs',
      latestUserTouchdowns: 3,
      playoffUnderdogWin: true,
    });
  });
});
