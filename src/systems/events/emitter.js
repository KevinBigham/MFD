/**
 * MFD Game Event Emitter
 *
 * Central event bus for the game event spine.
 * Collects events during a game simulation and exposes them
 * for reducer consumption and read-model generation.
 *
 * Design:
 * - Deterministic order: events are appended in simulation order
 * - Seed-safe: no Date.now() in hot path; timestamp injected from gameState
 * - Serializable: all payloads are plain objects
 */

import { buildEnvelope, resetSeq } from './envelope.js';
import { EVENT_NAMES } from './event-types.js';
import { createParentBridge } from './parent-bridge.js';

export function createEventLog(options) {
  const events = [];
  let _gameState = {};
  const _bridge = createParentBridge(options);

  return {
    /** Bind the current game state so emitters don't need to pass it every time */
    bindGameState(gs) {
      _gameState = gs;
    },

    /** Core emit — builds envelope, appends, and sends live to parent bridge */
    emit(eventName, payload) {
      const envelope = buildEnvelope(eventName, _gameState, payload);
      events.push(envelope);
      _bridge.emitToParent(envelope);
      return envelope;
    },

    /** Reset for a new game */
    reset() {
      events.length = 0;
      _gameState = {};
      resetSeq();
      _bridge.reset();
    },

    /** Access the parent bridge instance (for diagnostics/testing) */
    get bridge() {
      return _bridge;
    },

    /** Get all events (immutable snapshot) */
    getEvents() {
      return events.slice();
    },

    /** Get events filtered by name */
    getByName(name) {
      return events.filter(e => e.eventName === name);
    },

    /** Get raw mutable ref (for reducers that need perf) */
    _raw() {
      return events;
    },

    // ═══ TYPED EMITTERS ═══

    emitGameStart(payload) {
      return this.emit(EVENT_NAMES.GAME_START, {
        homeTeam: payload.homeTeam,
        awayTeam: payload.awayTeam,
        weather: payload.weather || null,
        seed: payload.seed || 0,
        week: payload.week || 0,
        year: payload.year || 0,
      });
    },

    emitDriveStart(payload) {
      return this.emit(EVENT_NAMES.DRIVE_START, {
        driveNum: payload.driveNum,
        startFieldPos: payload.startFieldPos,
        team: payload.team,
        startClock: payload.startClock || 0,
        startQuarter: payload.startQuarter || 0,
      });
    },

    emitPlayCall(payload) {
      return this.emit(EVENT_NAMES.PLAY_CALL, {
        playId: payload.playId,
        playLabel: payload.playLabel,
        playType: payload.playType,
        formation: payload.formation || null,
        defenseCall: payload.defenseCall || null,
        defenseLabel: payload.defenseLabel || null,
        isUserCall: payload.isUserCall || false,
      });
    },

    emitTrenchResolution(payload) {
      return this.emit(EVENT_NAMES.TRENCH_RESOLUTION, {
        olGrade: payload.olGrade,
        dlGrade: payload.dlGrade,
        runLaneOpen: payload.runLaneOpen,
        pocketIntact: payload.pocketIntact,
        matchups: payload.matchups || [],
      });
    },

    emitPressureResolution(payload) {
      return this.emit(EVENT_NAMES.PRESSURE_RESOLUTION, {
        pressured: payload.pressured || false,
        sacked: payload.sacked || false,
        rusher: payload.rusher || null,
        blocker: payload.blocker || null,
        timeInPocket: payload.timeInPocket || 0,
        qbEscaped: payload.qbEscaped || false,
      });
    },

    emitPlayResult(payload) {
      return this.emit(EVENT_NAMES.PLAY_RESULT, {
        type: payload.type,
        yards: payload.yards,
        player: payload.player || null,
        passer: payload.passer || null,
        desc: payload.desc || '',
        big: payload.big || false,
        isRush: payload.isRush || false,
        isScramble: payload.isScramble || false,
        firstDown: payload.firstDown || false,
        touchdown: payload.touchdown || false,
      });
    },

    emitTurnover(payload) {
      return this.emit(EVENT_NAMES.TURNOVER, {
        type: payload.type,
        player: payload.player || null,
        forcedBy: payload.forcedBy || null,
        fieldPos: payload.fieldPos || 0,
        desc: payload.desc || '',
      });
    },

    emitPenalty(payload) {
      return this.emit(EVENT_NAMES.PENALTY, {
        type: payload.type,
        team: payload.team,
        player: payload.player || null,
        yards: payload.yards,
        accepted: payload.accepted !== false,
        desc: payload.desc || '',
        offsetting: payload.offsetting || false,
      });
    },

    emitInjury(payload) {
      return this.emit(EVENT_NAMES.INJURY, {
        player: payload.player,
        pos: payload.pos || '',
        team: payload.team,
        type: payload.type || 'unknown',
        severity: payload.severity || 'questionable',
        gamesOut: payload.gamesOut || 0,
        desc: payload.desc || '',
      });
    },

    emitScore(payload) {
      return this.emit(EVENT_NAMES.SCORE, {
        type: payload.type,
        points: payload.points,
        team: payload.team,
        player: payload.player || null,
        desc: payload.desc || '',
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
      });
    },

    emitHalftimeAdjustment(payload) {
      return this.emit(EVENT_NAMES.HALFTIME_ADJUSTMENT, {
        adjustmentId: payload.adjustmentId,
        adjustmentLabel: payload.adjustmentLabel,
        offEdge: payload.offEdge || 0,
        defEdge: payload.defEdge || 0,
        rationale: payload.rationale || '',
        scoreDiff: payload.scoreDiff || 0,
      });
    },

    emitDriveEnd(payload) {
      return this.emit(EVENT_NAMES.DRIVE_END, {
        driveNum: payload.driveNum,
        result: payload.result,
        plays: payload.plays || 0,
        yards: payload.yards || 0,
        timeUsed: payload.timeUsed || 0,
        startFieldPos: payload.startFieldPos || 0,
        endFieldPos: payload.endFieldPos || 0,
      });
    },

    emitGameEnd(payload) {
      return this.emit(EVENT_NAMES.GAME_END, {
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
        winner: payload.winner,
        loser: payload.loser,
        overtime: payload.overtime || false,
        totalPlays: payload.totalPlays || 0,
        mvp: payload.mvp || null,
      });
    },
  };
}
