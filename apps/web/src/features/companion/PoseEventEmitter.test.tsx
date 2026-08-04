import { describe, expect, it, vi } from 'vitest';
import type { GameResult, GameState } from '@mfd/engine';
import type { ChipPoseEvent, ChipPoseEventTrigger } from './eventBridge';
import {
  buildPoseEmitterSnapshot,
  derivePoseEvents,
  deriveUserWinProbPoints,
  dispatchPoseEvents,
  isComebackWinProfile,
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
    latestOpponentScore: -1,
    latestGameOvertime: false,
    latestUserTouchdowns: 0,
    userWinStreak: 0,
    capProjectionOverLimit: false,
    playoffUnderdogWin: false,
    tradeRumorSignature: null,
    userHallOfFameSignature: null,
    userCompletedTradeSignature: null,
    userBrokenRecordSignature: null,
    userDraftPickSignature: null,
    userFaSigningSignature: null,
    latestGameComebackWin: false,
    userClinchStatus: '',
    upcomingRivalrySignature: null,
    pendingDecisionTotal: 0,
    firstLaunchActive: false,
    ownerPatienceCritical: false,
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

  it('emits USER_TEAM_BLOWOUT_WIN for a new user win by at least 21', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1' });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 24,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_BLOWOUT_WIN']);
  });

  it('does not emit USER_TEAM_BLOWOUT_WIN for a narrow win', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1' });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 7,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).not.toContain('USER_TEAM_BLOWOUT_WIN');
  });

  it('emits USER_TEAM_SHUTOUT_WIN when the user blanks the opponent', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1' });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 17,
      latestOpponentScore: 0,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_SHUTOUT_WIN']);
  });

  it('does not emit USER_TEAM_SHUTOUT_WIN when the opponent scores or the user loses', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1' });
    const scoredOn = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 17,
      latestOpponentScore: 3,
    });
    const lostShutout = makeSnapshot({
      latestGameId: 'game-3',
      userWonLatestGame: false,
      latestGameMargin: 10,
      latestOpponentScore: 0,
    });

    expect(eventTriggers(derivePoseEvents(scoredOn, previous))).not.toContain('USER_TEAM_SHUTOUT_WIN');
    expect(eventTriggers(derivePoseEvents(lostShutout, previous))).not.toContain('USER_TEAM_SHUTOUT_WIN');
  });

  it('emits OWNER_PATIENCE_CRITICAL once when patience crosses into the critical zone', () => {
    const previous = makeSnapshot({ ownerPatienceCritical: false });
    const current = makeSnapshot({ ownerPatienceCritical: true });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['OWNER_PATIENCE_CRITICAL']);
    expect(eventTriggers(derivePoseEvents(current, current))).not.toContain('OWNER_PATIENCE_CRITICAL');
  });

  it('emits USER_TEAM_WIN_STREAK for a new game that extends a three-game streak', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', userWinStreak: 2 });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 10,
      userWinStreak: 3,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_WIN_STREAK']);
  });

  it('does not emit USER_TEAM_WIN_STREAK below three straight wins', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', userWinStreak: 1 });
    const current = makeSnapshot({
      latestGameId: 'game-2',
      userWonLatestGame: true,
      latestGameMargin: 10,
      userWinStreak: 2,
    });

    expect(eventTriggers(derivePoseEvents(current, previous))).not.toContain('USER_TEAM_WIN_STREAK');
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

  it('emits USER_TRADE_COMPLETED when a new accepted user trade signature appears', () => {
    const previous = makeSnapshot({ userCompletedTradeSignature: null });
    const current = makeSnapshot({ userCompletedTradeSignature: 'offer-9' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TRADE_COMPLETED']);
  });

  it('does not emit USER_TRADE_COMPLETED for an unchanged signature or no completed trades', () => {
    const previous = makeSnapshot({ userCompletedTradeSignature: 'offer-9' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userCompletedTradeSignature: 'offer-9' }), previous)))
      .not.toContain('USER_TRADE_COMPLETED');
    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userCompletedTradeSignature: null }), makeSnapshot({ userCompletedTradeSignature: null }))))
      .not.toContain('USER_TRADE_COMPLETED');
  });

  it('emits USER_TEAM_RECORD_BROKEN when a new user record signature appears', () => {
    const previous = makeSnapshot({ userBrokenRecordSignature: null });
    const current = makeSnapshot({ userBrokenRecordSignature: 'qb-1:passYards:2030:12' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_RECORD_BROKEN']);
  });

  it('does not emit USER_TEAM_RECORD_BROKEN for an unchanged signature or no user records', () => {
    const previous = makeSnapshot({ userBrokenRecordSignature: 'qb-1:passYards:2030:12' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userBrokenRecordSignature: 'qb-1:passYards:2030:12' }), previous)))
      .not.toContain('USER_TEAM_RECORD_BROKEN');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot())))
      .not.toContain('USER_TEAM_RECORD_BROKEN');
  });

  it('emits USER_DRAFT_PICK_MADE when a new user draft pick signature appears', () => {
    const previous = makeSnapshot({ userDraftPickSignature: null });
    const current = makeSnapshot({ userDraftPickSignature: '2031:prospect-7' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_DRAFT_PICK_MADE']);
  });

  it('does not emit USER_DRAFT_PICK_MADE for an unchanged signature or no picks', () => {
    const previous = makeSnapshot({ userDraftPickSignature: '2031:prospect-7' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userDraftPickSignature: '2031:prospect-7' }), previous)))
      .not.toContain('USER_DRAFT_PICK_MADE');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot())))
      .not.toContain('USER_DRAFT_PICK_MADE');
  });

  it('emits USER_FREE_AGENT_SIGNING when a new won-bid signature appears', () => {
    const previous = makeSnapshot({ userFaSigningSignature: null });
    const current = makeSnapshot({ userFaSigningSignature: 'wr-9:2' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_FREE_AGENT_SIGNING']);
  });

  it('does not emit USER_FREE_AGENT_SIGNING for an unchanged signature or no won bids', () => {
    const previous = makeSnapshot({ userFaSigningSignature: 'wr-9:2' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userFaSigningSignature: 'wr-9:2' }), previous)))
      .not.toContain('USER_FREE_AGENT_SIGNING');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot())))
      .not.toContain('USER_FREE_AGENT_SIGNING');
  });

  it('emits USER_TEAM_COMEBACK_WIN for a new user win with a comeback profile', () => {
    const previous = makeSnapshot({ latestGameId: 'game-1', userWonLatestGame: true });
    const current = makeSnapshot({ latestGameId: 'game-2', userWonLatestGame: true, latestGameComebackWin: true });

    expect(eventTriggers(derivePoseEvents(current, previous))).toContain('USER_TEAM_COMEBACK_WIN');
  });

  it('does not emit USER_TEAM_COMEBACK_WIN without a new game or a comeback profile', () => {
    const sameGame = makeSnapshot({ latestGameId: 'game-2', userWonLatestGame: true, latestGameComebackWin: true });

    expect(eventTriggers(derivePoseEvents(sameGame, sameGame)))
      .not.toContain('USER_TEAM_COMEBACK_WIN');

    const previous = makeSnapshot({ latestGameId: 'game-1', userWonLatestGame: true });
    const flatWin = makeSnapshot({ latestGameId: 'game-2', userWonLatestGame: true, latestGameComebackWin: false });

    expect(eventTriggers(derivePoseEvents(flatWin, previous)))
      .not.toContain('USER_TEAM_COMEBACK_WIN');
  });

  it('emits USER_TEAM_CLINCH when the user clinches a division (X) or berth (Y)', () => {
    const alive = makeSnapshot({ userClinchStatus: '' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userClinchStatus: 'X' }), alive)))
      .toEqual(['USER_TEAM_CLINCH']);
    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userClinchStatus: 'Y' }), alive)))
      .toEqual(['USER_TEAM_CLINCH']);
  });

  it('gives division (X) and wildcard (Y) clinches distinct event ids', () => {
    const alive = makeSnapshot({ userClinchStatus: '' });
    const [division] = derivePoseEvents(makeSnapshot({ userClinchStatus: 'X' }), alive);
    const [wildcard] = derivePoseEvents(makeSnapshot({ userClinchStatus: 'Y' }), alive);

    expect(division!.id).not.toBe(wildcard!.id);
  });

  it('does not refire USER_TEAM_CLINCH for an unchanged clinched status', () => {
    const clinched = makeSnapshot({ userClinchStatus: 'X' });

    expect(eventTriggers(derivePoseEvents(clinched, clinched)))
      .not.toContain('USER_TEAM_CLINCH');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot({ userClinchStatus: 'E' }))))
      .not.toContain('USER_TEAM_CLINCH');
  });

  it('emits USER_TEAM_ELIMINATED when the user is mathematically eliminated', () => {
    const alive = makeSnapshot({ userClinchStatus: '' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ userClinchStatus: 'E' }), alive)))
      .toEqual(['USER_TEAM_ELIMINATED']);
  });

  it('does not refire USER_TEAM_ELIMINATED for an unchanged eliminated status', () => {
    const eliminated = makeSnapshot({ userClinchStatus: 'E' });

    expect(eventTriggers(derivePoseEvents(eliminated, eliminated)))
      .not.toContain('USER_TEAM_ELIMINATED');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot({ userClinchStatus: 'X' }))))
      .not.toContain('USER_TEAM_ELIMINATED');
  });

  it('emits USER_TEAM_RIVALRY_WEEK when a new rivalry-week signature appears', () => {
    const previous = makeSnapshot({ upcomingRivalrySignature: null });
    const current = makeSnapshot({ upcomingRivalrySignature: '2030:9:rival::user:heated' });

    expect(eventTriggers(derivePoseEvents(current, previous))).toEqual(['USER_TEAM_RIVALRY_WEEK']);
  });

  it('does not emit USER_TEAM_RIVALRY_WEEK for an unchanged signature or no rivalry', () => {
    const previous = makeSnapshot({ upcomingRivalrySignature: '2030:9:rival::user:heated' });

    expect(eventTriggers(derivePoseEvents(makeSnapshot({ upcomingRivalrySignature: '2030:9:rival::user:heated' }), previous)))
      .not.toContain('USER_TEAM_RIVALRY_WEEK');
    expect(eventTriggers(derivePoseEvents(makeSnapshot(), makeSnapshot())))
      .not.toContain('USER_TEAM_RIVALRY_WEEK');
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

  it('keeps a live derive path for every registered pose trigger', () => {
    const quiet = makeSnapshot({ pendingDecisionTotal: 2 });

    const celebration = derivePoseEvents(
      makeSnapshot({
        latestGameId: 'game-9',
        latestGamePhase: 'playoffs',
        userWonLatestGame: true,
        latestGameMargin: 24,
        latestOpponentScore: 0,
        latestUserTouchdowns: 2,
        userWinStreak: 3,
        firstLaunchActive: true,
        capProjectionOverLimit: true,
        ownerPatienceCritical: true,
        playoffUnderdogWin: true,
        tradeRumorSignature: 'player-1',
        userHallOfFameSignature: 'hof-1',
        userCompletedTradeSignature: 'trade-1',
        userBrokenRecordSignature: 'rec-1',
        userDraftPickSignature: 'pick-1',
        userFaSigningSignature: 'fa-1',
        latestGameComebackWin: true,
        userClinchStatus: 'X',
        upcomingRivalrySignature: 'rivalry-1',
        pendingDecisionTotal: 1,
      }),
      quiet,
    );

    const bigLoss = derivePoseEvents(
      makeSnapshot({
        latestGameId: 'game-10',
        userWonLatestGame: false,
        latestGameMargin: 28,
      }),
      makeSnapshot({ latestGameId: 'game-9' }),
    );

    const eliminated = derivePoseEvents(
      makeSnapshot({ userClinchStatus: 'E' }),
      makeSnapshot({ userClinchStatus: '' }),
    );

    const covered = new Set([...celebration, ...bigLoss, ...eliminated].map((event) => event.trigger));
    const allTriggers: ChipPoseEventTrigger[] = [
      'USER_TEAM_TOUCHDOWN',
      'USER_TEAM_FIRST_LAUNCH',
      'CAP_PROJECTION_OVER_LIMIT',
      'OWNER_PATIENCE_CRITICAL',
      'USER_TEAM_LOSS_BIG',
      'USER_TEAM_BLOWOUT_WIN',
      'USER_TEAM_SHUTOUT_WIN',
      'USER_TEAM_WIN_STREAK',
      'PLAYOFF_UPSET_WIN',
      'TRADE_RUMOR_FOR_USER_PLAYER',
      'PLAYER_RETIREMENT_USER_HOF',
      'USER_TRADE_COMPLETED',
      'USER_TEAM_RECORD_BROKEN',
      'USER_DRAFT_PICK_MADE',
      'USER_FREE_AGENT_SIGNING',
      'USER_TEAM_COMEBACK_WIN',
      'USER_TEAM_CLINCH',
      'USER_TEAM_ELIMINATED',
      'USER_TEAM_RIVALRY_WEEK',
      'USER_DECISION_LOCKED_IN',
    ];
    for (const trigger of allTriggers) {
      expect(covered.has(trigger), trigger).toBe(true);
    }
    expect(covered.size).toBe(allTriggers.length);
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
      ['OWNER_PATIENCE_CRITICAL', 'warning', 5000, 'warning'],
      ['USER_TEAM_LOSS_BIG', 'facepalm', 6000, 'sad'],
      ['USER_TEAM_BLOWOUT_WIN', 'celebrate', 4500, 'celebrate'],
      ['USER_TEAM_SHUTOUT_WIN', 'celebrate', 4500, 'celebrate'],
      ['USER_TEAM_WIN_STREAK', 'excited', 4500, 'celebrate'],
      ['PLAYOFF_UPSET_WIN', 'laughing', 4000, 'routine'],
      ['TRADE_RUMOR_FOR_USER_PLAYER', 'on-phone', 3500, 'routine'],
      ['PLAYER_RETIREMENT_USER_HOF', 'head-in-hands', 4000, 'sad'],
      ['USER_TRADE_COMPLETED', 'thumbs-up', 4000, 'celebrate'],
      ['USER_TEAM_RECORD_BROKEN', 'proud', 4500, 'celebrate'],
      ['USER_DRAFT_PICK_MADE', 'football-in-hand', 4000, 'celebrate'],
      ['USER_FREE_AGENT_SIGNING', 'wave', 4000, 'celebrate'],
      ['USER_TEAM_COMEBACK_WIN', 'rallying', 4500, 'celebrate'],
      ['USER_TEAM_CLINCH', 'proud', 5000, 'celebrate'],
      ['USER_TEAM_ELIMINATED', 'disappointed', 5000, 'sad'],
      ['USER_TEAM_RIVALRY_WEEK', 'rallying', 4000, 'routine'],
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

  it('derives ownerPatienceCritical from the user team owner patience', () => {
    const makeGame = (patience: number) => ({
      year: 2030,
      week: 12,
      teams: {
        user: { id: 'user', isUser: true, ownerId: 'owner-1' },
      },
      owners: {
        'owner-1': { id: 'owner-1', patience },
      },
      schedule: [],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
    } as unknown as GameState);

    expect(buildPoseEmitterSnapshot(makeGame(18)).ownerPatienceCritical).toBe(true);
    expect(buildPoseEmitterSnapshot(makeGame(20)).ownerPatienceCritical).toBe(true);
    expect(buildPoseEmitterSnapshot(makeGame(21)).ownerPatienceCritical).toBe(false);
    expect(buildPoseEmitterSnapshot(makeGame(75)).ownerPatienceCritical).toBe(false);
  });

  it('derives userCompletedTradeSignature from accepted user trade offers only', () => {
    const makeGame = (offers: Array<Record<string, unknown>>) => ({
      year: 2030,
      week: 12,
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
      offseasonState: { tradeOffers: offers },
    } as unknown as GameState);

    const snapshot = buildPoseEmitterSnapshot(makeGame([
      { id: 'offer-b', status: 'accepted', fromTeamId: 'team-2', toTeamId: 'user' },
      { id: 'offer-a', status: 'accepted', fromTeamId: 'user', toTeamId: 'team-3' },
      { id: 'offer-c', status: 'pending', fromTeamId: 'team-4', toTeamId: 'user' },
      { id: 'offer-d', status: 'accepted', fromTeamId: 'team-5', toTeamId: 'team-6' },
      { id: 'offer-e', status: 'rejected', fromTeamId: 'user', toTeamId: 'team-7' },
    ]));

    expect(snapshot.userCompletedTradeSignature).toBe('offer-a|offer-b');
    expect(buildPoseEmitterSnapshot(makeGame([])).userCompletedTradeSignature).toBeNull();
    expect(buildPoseEmitterSnapshot(null).userCompletedTradeSignature).toBeNull();
  });

  it('derives userBrokenRecordSignature from user-team record entries only', () => {
    const game = {
      year: 2030,
      week: 12,
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
      recentBrokenRecords: [
        { playerId: 'qb-1', stat: 'passYards', teamId: 'user', year: 2030, week: 12 },
        { playerId: 'rb-9', stat: 'rushYards', teamId: 'team-2', year: 2030, week: 12 },
        { playerId: 'wr-2', stat: 'receptions', teamId: 'user', year: 2030, week: 11 },
      ],
    } as unknown as GameState;

    expect(buildPoseEmitterSnapshot(game).userBrokenRecordSignature)
      .toBe('qb-1:passYards:2030:12|wr-2:receptions:2030:11');
    expect(buildPoseEmitterSnapshot(null).userBrokenRecordSignature).toBeNull();
  });

  it('derives userDraftPickSignature from user draft recaps only, year-prefixed', () => {
    const game = {
      year: 2031,
      week: 1,
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
      draftRecaps: [
        { year: 2031, teamId: 'user', picks: [{ playerId: 'p-2' }, { playerId: 'p-1' }] },
        { year: 2031, teamId: 'team-2', picks: [{ playerId: 'p-9' }] },
        { year: 2030, teamId: 'user', picks: [{ playerId: 'p-0' }] },
      ],
    } as unknown as GameState;

    expect(buildPoseEmitterSnapshot(game).userDraftPickSignature)
      .toBe('2030:p-0|2031:p-1|2031:p-2');
    expect(buildPoseEmitterSnapshot(null).userDraftPickSignature).toBeNull();
  });

  it('derives userFaSigningSignature from won user bids only', () => {
    const makeGame = (freeAgencyBids: Record<string, Array<Record<string, unknown>>>) => ({
      year: 2031,
      week: 1,
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
      offseasonState: { freeAgencyBids },
    } as unknown as GameState);

    const snapshot = buildPoseEmitterSnapshot(makeGame({
      'wr-9': [
        { playerId: 'wr-9', teamId: 'user', round: 2, status: 'won' },
        { playerId: 'wr-9', teamId: 'team-2', round: 2, status: 'lost' },
      ],
      'cb-3': [
        { playerId: 'cb-3', teamId: 'user', round: 1, status: 'pending' },
      ],
    }));

    expect(snapshot.userFaSigningSignature).toBe('wr-9:2');
    expect(buildPoseEmitterSnapshot(makeGame({})).userFaSigningSignature).toBeNull();
    expect(buildPoseEmitterSnapshot(null).userFaSigningSignature).toBeNull();
  });

  it('flags comeback wins only when the win-probability profile dips low', () => {
    expect(isComebackWinProfile([62, 19, 55, 100])).toBe(true);
    expect(isComebackWinProfile([50, 25, 80, 100])).toBe(true);
    expect(isComebackWinProfile([50, 26, 80, 100])).toBe(false);
    expect(isComebackWinProfile([100])).toBe(false);
    expect(isComebackWinProfile([])).toBe(false);
  });

  it('returns no win-probability points without a stored broadcast', () => {
    const result = {
      id: 'game-1',
      homeTeamId: 'user',
      awayTeamId: 'away',
      homeScore: 24,
      awayScore: 20,
      year: 2030,
      week: 12,
      overtime: false,
      stats: {},
    } as unknown as GameResult;

    expect(deriveUserWinProbPoints(result, 'user')).toEqual([]);
    expect(deriveUserWinProbPoints(null, 'user')).toEqual([]);
    expect(deriveUserWinProbPoints(result, null)).toEqual([]);
  });

  it('keeps latestGameComebackWin false when the latest result has no broadcast', () => {
    const game = {
      year: 2030,
      week: 12,
      teams: {
        user: { id: 'user', isUser: true },
      },
      schedule: [
        {
          games: [
            {
              result: {
                id: 'game-1',
                homeTeamId: 'user',
                awayTeamId: 'away',
                homeScore: 24,
                awayScore: 20,
                year: 2030,
                week: 12,
                overtime: false,
                stats: {},
              },
            },
          ],
        },
      ],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
    } as unknown as GameState;

    const snapshot = buildPoseEmitterSnapshot(game);

    expect(snapshot.userWonLatestGame).toBe(true);
    expect(snapshot.latestGameComebackWin).toBe(false);
  });

  it('derives userClinchStatus from engine clinch math', () => {
    const makeTeam = (
      id: string,
      division: string,
      wins: number,
      losses: number,
      isUser = false,
    ) => ({
      id,
      isUser,
      conference: 'AFC',
      division,
      wins,
      losses,
      ties: 0,
      seasonStats: { pointDifferential: wins - losses },
    });
    const makeLeague = (teams: Array<ReturnType<typeof makeTeam>>) => ({
      year: 2030,
      week: 17,
      teams: Object.fromEntries(teams.map((team) => [team.id, team])),
      schedule: Array.from({ length: 18 }, (_, index) => ({ week: index + 1, games: [] })),
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
    } as unknown as GameState);

    // X: user 15-2, best division rival can reach only 12 wins.
    const clinchedDivision = buildPoseEmitterSnapshot(makeLeague([
      makeTeam('user', 'East', 15, 2, true),
      makeTeam('e2', 'East', 11, 6),
      makeTeam('e3', 'East', 6, 11),
      makeTeam('e4', 'East', 5, 12),
      makeTeam('w1', 'West', 13, 4),
      makeTeam('w2', 'West', 10, 7),
      makeTeam('w3', 'West', 9, 8),
      makeTeam('w4', 'West', 8, 9),
    ]));
    expect(clinchedDivision.userClinchStatus).toBe('X');

    // Y: season over, user is a locked wildcard behind the division leader.
    const clinchedBerth = buildPoseEmitterSnapshot(makeLeague([
      makeTeam('user', 'East', 12, 6, true),
      makeTeam('e1', 'East', 14, 4),
      makeTeam('e3', 'East', 6, 12),
      makeTeam('e4', 'East', 5, 13),
      makeTeam('w1', 'West', 11, 7),
      makeTeam('w2', 'West', 10, 8),
      makeTeam('w3', 'West', 9, 9),
      makeTeam('w4', 'West', 8, 10),
    ]));
    expect(clinchedBerth.userClinchStatus).toBe('Y');

    // E: season over, user finishes outside the seeds.
    const eliminated = buildPoseEmitterSnapshot(makeLeague([
      makeTeam('user', 'East', 4, 14, true),
      makeTeam('e1', 'East', 14, 4),
      makeTeam('e2', 'East', 12, 6),
      makeTeam('e3', 'East', 11, 7),
      makeTeam('w1', 'West', 13, 5),
      makeTeam('w2', 'West', 12, 6),
      makeTeam('w3', 'West', 10, 8),
      makeTeam('w4', 'West', 9, 9),
    ]));
    expect(eliminated.userClinchStatus).toBe('E');

    // '': user outside the seeds but mathematically alive with games left.
    const alive = buildPoseEmitterSnapshot(makeLeague([
      makeTeam('user', 'East', 8, 8, true),
      makeTeam('e1', 'East', 13, 3),
      makeTeam('e2', 'East', 12, 4),
      makeTeam('e3', 'East', 11, 5),
      makeTeam('w1', 'West', 12, 4),
      makeTeam('w2', 'West', 11, 5),
      makeTeam('w3', 'West', 10, 6),
      makeTeam('w4', 'West', 9, 7),
    ]));
    expect(alive.userClinchStatus).toBe('');

    expect(buildPoseEmitterSnapshot(null).userClinchStatus).toBe('');
  });

  it('derives upcomingRivalrySignature from the next unplayed rivalry matchup', () => {
    const makeGame = (
      intensity: number | null,
      options: { result?: unknown; gameWeek?: number; matchupWeek?: number } = {},
    ) => ({
      year: 2030,
      week: options.gameWeek ?? 8,
      teams: {
        user: {
          id: 'user', isUser: true, conference: 'AFC', division: 'East',
          wins: 0, losses: 0, ties: 0, seasonStats: { pointDifferential: 0 },
        },
        rival: {
          id: 'rival', isUser: false, conference: 'AFC', division: 'East',
          wins: 0, losses: 0, ties: 0, seasonStats: { pointDifferential: 0 },
        },
      },
      schedule: [
        {
          week: options.matchupWeek ?? 8,
          games: [
            { homeTeamId: 'user', awayTeamId: 'rival', result: options.result ?? null },
          ],
        },
      ],
      leagueRivalries: intensity === null ? [] : [
        {
          id: 'rival::user',
          teamA: 'rival',
          teamB: 'user',
          intensity,
          isDivision: true,
          history: [],
          lastMetYear: null,
          lastMetWeek: null,
        },
      ],
      playoffMomentum: {},
      gameDayState: { latestPackageId: null, recentPackages: [] },
      tradeSuggestions: [],
      hallOfFame: [],
    } as unknown as GameState);

    expect(buildPoseEmitterSnapshot(makeGame(60)).upcomingRivalrySignature)
      .toBe('2030:8:rival::user:heated');
    expect(buildPoseEmitterSnapshot(makeGame(76)).upcomingRivalrySignature)
      .toBe('2030:8:rival::user:blood_feud');
    expect(buildPoseEmitterSnapshot(makeGame(30)).upcomingRivalrySignature)
      .toBe('2030:8:rival::user:budding');
    expect(buildPoseEmitterSnapshot(makeGame(20)).upcomingRivalrySignature).toBeNull();
    expect(buildPoseEmitterSnapshot(makeGame(null)).upcomingRivalrySignature).toBeNull();
    // Already-played matchups are not "upcoming".
    expect(buildPoseEmitterSnapshot(makeGame(60, {
      result: {
        id: 'game-1', homeTeamId: 'user', awayTeamId: 'rival',
        homeScore: 24, awayScore: 20, year: 2030, week: 8, overtime: false, stats: {},
      },
    })).upcomingRivalrySignature).toBeNull();
    // Matchups before the current week are not "upcoming".
    expect(buildPoseEmitterSnapshot(makeGame(60, { matchupWeek: 7 })).upcomingRivalrySignature)
      .toBeNull();
    expect(buildPoseEmitterSnapshot(null).upcomingRivalrySignature).toBeNull();
  });
});
