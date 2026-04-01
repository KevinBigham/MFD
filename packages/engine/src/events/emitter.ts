/**
 * MFD Game Event Emitter
 *
 * Central event bus for the game event spine.
 * Deterministic order, seed-safe, serializable payloads.
 */

import { buildEnvelope, resetSeq, type EventEnvelope, type LiveGameState } from './envelope';
import { EVENT_NAMES, type EventName } from './event-types';

export interface EventLog {
  bindGameState(gs: LiveGameState): void;
  emit(eventName: EventName, payload: Record<string, unknown>): EventEnvelope;
  reset(): void;
  getEvents(): EventEnvelope[];
  getByName(name: EventName): EventEnvelope[];

  emitGameStart(payload: GameStartPayload): EventEnvelope;
  emitDriveStart(payload: DriveStartPayload): EventEnvelope;
  emitPlayCall(payload: PlayCallPayload): EventEnvelope;
  emitTrenchResolution(payload: TrenchPayload): EventEnvelope;
  emitPressureResolution(payload: PressurePayload): EventEnvelope;
  emitPlayResult(payload: PlayResultPayload): EventEnvelope;
  emitTurnover(payload: TurnoverPayload): EventEnvelope;
  emitPenalty(payload: PenaltyPayload): EventEnvelope;
  emitInjury(payload: InjuryPayload): EventEnvelope;
  emitScore(payload: ScorePayload): EventEnvelope;
  emitHalftimeAdjustment(payload: HalftimePayload): EventEnvelope;
  emitDriveEnd(payload: DriveEndPayload): EventEnvelope;
  emitGameEnd(payload: GameEndPayload): EventEnvelope;
}

// ── Payload Types ───────────────────────────────────────

export interface GameStartPayload {
  homeTeam: string;
  awayTeam: string;
  weather?: string | null;
  seed?: number;
  week?: number;
  year?: number;
}

export interface DriveStartPayload {
  driveNum: number;
  startFieldPos: number;
  team: string;
  startClock?: number;
  startQuarter?: number;
}

export interface PlayCallPayload {
  playId: string;
  playLabel: string;
  playType: string;
  formation?: string | null;
  defenseCall?: string | null;
  defenseLabel?: string | null;
  isUserCall?: boolean;
}

export interface TrenchPayload {
  olGrade: number;
  dlGrade: number;
  runLaneOpen: boolean;
  pocketIntact: boolean;
  matchups?: unknown[];
}

export interface PressurePayload {
  pressured?: boolean;
  sacked?: boolean;
  rusher?: string | null;
  blocker?: string | null;
  timeInPocket?: number;
  qbEscaped?: boolean;
}

export interface PlayResultPayload {
  type: string;
  yards: number;
  player?: string | null;
  passer?: string | null;
  desc?: string;
  big?: boolean;
  isRush?: boolean;
  isScramble?: boolean;
  firstDown?: boolean;
  touchdown?: boolean;
}

export interface TurnoverPayload {
  type: string;
  player?: string | null;
  forcedBy?: string | null;
  fieldPos?: number;
  desc?: string;
}

export interface PenaltyPayload {
  type: string;
  team: string;
  player?: string | null;
  yards: number;
  accepted?: boolean;
  desc?: string;
  offsetting?: boolean;
}

export interface InjuryPayload {
  player: string;
  pos?: string;
  team: string;
  type?: string;
  severity?: string;
  gamesOut?: number;
  desc?: string;
}

export interface ScorePayload {
  type: string;
  points: number;
  team: string;
  player?: string | null;
  desc?: string;
  homeScore: number;
  awayScore: number;
}

export interface HalftimePayload {
  adjustmentId: string;
  adjustmentLabel: string;
  offEdge?: number;
  defEdge?: number;
  rationale?: string;
  scoreDiff?: number;
}

export interface DriveEndPayload {
  driveNum: number;
  result: string;
  plays?: number;
  yards?: number;
  timeUsed?: number;
  startFieldPos?: number;
  endFieldPos?: number;
}

export interface GameEndPayload {
  homeScore: number;
  awayScore: number;
  winner: string;
  loser: string;
  overtime?: boolean;
  totalPlays?: number;
  mvp?: string | null;
}

// ── Factory ─────────────────────────────────────────────

export function createEventLog(): EventLog {
  const events: EventEnvelope[] = [];
  let _gameState: LiveGameState = {};

  const log: EventLog = {
    bindGameState(gs: LiveGameState): void {
      _gameState = gs;
    },

    emit(eventName: EventName, payload: Record<string, unknown>): EventEnvelope {
      const envelope = buildEnvelope(eventName, _gameState, payload);
      events.push(envelope);
      return envelope;
    },

    reset(): void {
      events.length = 0;
      _gameState = {};
      resetSeq();
    },

    getEvents(): EventEnvelope[] {
      return events.slice();
    },

    getByName(name: EventName): EventEnvelope[] {
      return events.filter(e => e.eventName === name);
    },

    emitGameStart(p: GameStartPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.GAME_START, {
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        weather: p.weather ?? null,
        seed: p.seed ?? 0,
        week: p.week ?? 0,
        year: p.year ?? 0,
      });
    },

    emitDriveStart(p: DriveStartPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.DRIVE_START, {
        driveNum: p.driveNum,
        startFieldPos: p.startFieldPos,
        team: p.team,
        startClock: p.startClock ?? 0,
        startQuarter: p.startQuarter ?? 0,
      });
    },

    emitPlayCall(p: PlayCallPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.PLAY_CALL, {
        playId: p.playId,
        playLabel: p.playLabel,
        playType: p.playType,
        formation: p.formation ?? null,
        defenseCall: p.defenseCall ?? null,
        defenseLabel: p.defenseLabel ?? null,
        isUserCall: p.isUserCall ?? false,
      });
    },

    emitTrenchResolution(p: TrenchPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.TRENCH_RESOLUTION, {
        olGrade: p.olGrade,
        dlGrade: p.dlGrade,
        runLaneOpen: p.runLaneOpen,
        pocketIntact: p.pocketIntact,
        matchups: p.matchups ?? [],
      });
    },

    emitPressureResolution(p: PressurePayload): EventEnvelope {
      return log.emit(EVENT_NAMES.PRESSURE_RESOLUTION, {
        pressured: p.pressured ?? false,
        sacked: p.sacked ?? false,
        rusher: p.rusher ?? null,
        blocker: p.blocker ?? null,
        timeInPocket: p.timeInPocket ?? 0,
        qbEscaped: p.qbEscaped ?? false,
      });
    },

    emitPlayResult(p: PlayResultPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.PLAY_RESULT, {
        type: p.type,
        yards: p.yards,
        player: p.player ?? null,
        passer: p.passer ?? null,
        desc: p.desc ?? '',
        big: p.big ?? false,
        isRush: p.isRush ?? false,
        isScramble: p.isScramble ?? false,
        firstDown: p.firstDown ?? false,
        touchdown: p.touchdown ?? false,
      });
    },

    emitTurnover(p: TurnoverPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.TURNOVER, {
        type: p.type,
        player: p.player ?? null,
        forcedBy: p.forcedBy ?? null,
        fieldPos: p.fieldPos ?? 0,
        desc: p.desc ?? '',
      });
    },

    emitPenalty(p: PenaltyPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.PENALTY, {
        type: p.type,
        team: p.team,
        player: p.player ?? null,
        yards: p.yards,
        accepted: p.accepted !== false,
        desc: p.desc ?? '',
        offsetting: p.offsetting ?? false,
      });
    },

    emitInjury(p: InjuryPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.INJURY, {
        player: p.player,
        pos: p.pos ?? '',
        team: p.team,
        type: p.type ?? 'unknown',
        severity: p.severity ?? 'questionable',
        gamesOut: p.gamesOut ?? 0,
        desc: p.desc ?? '',
      });
    },

    emitScore(p: ScorePayload): EventEnvelope {
      return log.emit(EVENT_NAMES.SCORE, {
        type: p.type,
        points: p.points,
        team: p.team,
        player: p.player ?? null,
        desc: p.desc ?? '',
        homeScore: p.homeScore,
        awayScore: p.awayScore,
      });
    },

    emitHalftimeAdjustment(p: HalftimePayload): EventEnvelope {
      return log.emit(EVENT_NAMES.HALFTIME_ADJUSTMENT, {
        adjustmentId: p.adjustmentId,
        adjustmentLabel: p.adjustmentLabel,
        offEdge: p.offEdge ?? 0,
        defEdge: p.defEdge ?? 0,
        rationale: p.rationale ?? '',
        scoreDiff: p.scoreDiff ?? 0,
      });
    },

    emitDriveEnd(p: DriveEndPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.DRIVE_END, {
        driveNum: p.driveNum,
        result: p.result,
        plays: p.plays ?? 0,
        yards: p.yards ?? 0,
        timeUsed: p.timeUsed ?? 0,
        startFieldPos: p.startFieldPos ?? 0,
        endFieldPos: p.endFieldPos ?? 0,
      });
    },

    emitGameEnd(p: GameEndPayload): EventEnvelope {
      return log.emit(EVENT_NAMES.GAME_END, {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winner: p.winner,
        loser: p.loser,
        overtime: p.overtime ?? false,
        totalPlays: p.totalPlays ?? 0,
        mvp: p.mvp ?? null,
      });
    },
  };

  return log;
}
