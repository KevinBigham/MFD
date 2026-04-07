/**
 * MFD Game Event Reducers
 *
 * Pure functions that fold an event log into accumulated state.
 * Each reducer processes the full event list and returns a plain object.
 * All output is serializable and deterministic.
 */

import { EVENT_NAMES } from './event-types.js';

/**
 * Reduce events into box-score-level team stats.
 */
export function reduceTeamStats(events) {
  const stats = {
    home: {
      passYds: 0, rushYds: 0, passTD: 0, rushTD: 0,
      interceptions: 0, sacks: 0, fumbles: 0,
      firstDowns: 0, plays: 0, penalties: 0, penYds: 0,
      totalYards: 0, drives: 0, scoringDrives: 0,
      turnovers: 0, points: 0,
    },
    away: {
      passYds: 0, rushYds: 0, passTD: 0, rushTD: 0,
      interceptions: 0, sacks: 0, fumbles: 0,
      firstDowns: 0, plays: 0, penalties: 0, penYds: 0,
      totalYards: 0, drives: 0, scoringDrives: 0,
      turnovers: 0, points: 0,
    },
  };

  for (const evt of events) {
    const poss = evt.possession;
    const side = poss === 'home' ? 'home' : 'away';
    const defSide = side === 'home' ? 'away' : 'home';
    const p = evt.payload;

    switch (evt.eventName) {
      case EVENT_NAMES.PLAY_RESULT: {
        stats[side].plays++;
        const yds = p.yards || 0;
        if (p.isRush) {
          stats[side].rushYds += yds;
          if (p.touchdown) stats[side].rushTD++;
        } else if (p.type === 'complete') {
          stats[side].passYds += yds;
          if (p.touchdown) stats[side].passTD++;
        } else if (p.type === 'sack') {
          stats[defSide].sacks++;
        }
        if (p.firstDown) stats[side].firstDowns++;
        stats[side].totalYards += yds;
        break;
      }
      case EVENT_NAMES.TURNOVER: {
        stats[side].turnovers++;
        if (p.type === 'interception') stats[side].interceptions++;
        if (p.type === 'fumble') stats[side].fumbles++;
        break;
      }
      case EVENT_NAMES.PENALTY: {
        if (p.accepted) {
          stats[p.team === 'home' ? 'home' : 'away'].penalties++;
          stats[p.team === 'home' ? 'home' : 'away'].penYds += (p.yards || 0);
        }
        break;
      }
      case EVENT_NAMES.SCORE: {
        const scoreSide = p.team === 'home' ? 'home' : 'away';
        stats[scoreSide].points += (p.points || 0);
        break;
      }
      case EVENT_NAMES.DRIVE_END: {
        stats[side].drives++;
        if (p.result === 'touchdown' || p.result === 'field_goal') {
          stats[side].scoringDrives++;
        }
        break;
      }
    }
  }

  return stats;
}

/**
 * Reduce events into a drive-by-drive summary.
 */
export function reduceDrives(events) {
  const drives = [];
  let current = null;

  for (const evt of events) {
    if (evt.eventName === EVENT_NAMES.DRIVE_START) {
      current = {
        driveNum: evt.payload.driveNum,
        team: evt.payload.team,
        startFieldPos: evt.payload.startFieldPos,
        startClock: evt.clock,
        startQuarter: evt.quarter,
        plays: 0,
        yards: 0,
        result: null,
        events: [],
      };
    }
    if (current) {
      current.events.push(evt);
      if (evt.eventName === EVENT_NAMES.PLAY_RESULT) {
        current.plays++;
        current.yards += (evt.payload.yards || 0);
      }
    }
    if (evt.eventName === EVENT_NAMES.DRIVE_END && current) {
      current.result = evt.payload.result;
      current.endFieldPos = evt.payload.endFieldPos;
      current.timeUsed = evt.payload.timeUsed;
      drives.push(current);
      current = null;
    }
  }
  // Push dangling drive (game might end mid-drive)
  if (current) drives.push(current);

  return drives;
}

/**
 * Reduce events into player stat lines.
 */
export function reducePlayerStats(events) {
  const players = {};

  function ensure(name) {
    if (!players[name]) {
      players[name] = {
        name,
        comp: 0, att: 0, passYds: 0, passTD: 0, int: 0,
        rushAtt: 0, rushYds: 0, rushTD: 0,
        rec: 0, recYds: 0, recTD: 0,
        sacks: 0, forcedFumbles: 0, tackles: 0,
      };
    }
    return players[name];
  }

  for (const evt of events) {
    const p = evt.payload;

    if (evt.eventName === EVENT_NAMES.PLAY_RESULT) {
      if (p.isRush && p.player) {
        const s = ensure(p.player);
        s.rushAtt++;
        s.rushYds += (p.yards || 0);
        if (p.touchdown) s.rushTD++;
      }
      if (p.type === 'complete' && p.passer) {
        const passer = ensure(p.passer);
        passer.comp++;
        passer.att++;
        passer.passYds += (p.yards || 0);
        if (p.touchdown) passer.passTD++;
        if (p.player) {
          const rec = ensure(p.player);
          rec.rec++;
          rec.recYds += (p.yards || 0);
          if (p.touchdown) rec.recTD++;
        }
      }
      if (p.type === 'incomplete' && p.passer) {
        ensure(p.passer).att++;
      }
      if (p.type === 'sack' && p.player) {
        ensure(p.player).sacks++;
      }
    }

    if (evt.eventName === EVENT_NAMES.TURNOVER) {
      if (p.type === 'interception' && p.forcedBy) {
        ensure(p.forcedBy).int = (ensure(p.forcedBy).int || 0) + 1;
      }
      if (p.type === 'fumble' && p.forcedBy) {
        ensure(p.forcedBy).forcedFumbles++;
      }
    }
  }

  return players;
}

/**
 * Reduce events into scoring plays timeline.
 */
export function reduceScoringPlays(events) {
  return events
    .filter(e => e.eventName === EVENT_NAMES.SCORE)
    .map(e => ({
      quarter: e.quarter,
      clock: e.clock,
      type: e.payload.type,
      team: e.payload.team,
      player: e.payload.player,
      points: e.payload.points,
      homeScore: e.payload.homeScore,
      awayScore: e.payload.awayScore,
      desc: e.payload.desc,
    }));
}

/**
 * Reduce events into turnover summary.
 */
export function reduceTurnovers(events) {
  return events
    .filter(e => e.eventName === EVENT_NAMES.TURNOVER)
    .map(e => ({
      quarter: e.quarter,
      clock: e.clock,
      type: e.payload.type,
      player: e.payload.player,
      forcedBy: e.payload.forcedBy,
      fieldPos: e.payload.fieldPos,
      desc: e.payload.desc,
    }));
}

/**
 * Reduce events into injury report.
 */
export function reduceInjuries(events) {
  return events
    .filter(e => e.eventName === EVENT_NAMES.INJURY)
    .map(e => ({
      quarter: e.quarter,
      clock: e.clock,
      player: e.payload.player,
      pos: e.payload.pos,
      team: e.payload.team,
      type: e.payload.type,
      severity: e.payload.severity,
      gamesOut: e.payload.gamesOut,
      desc: e.payload.desc,
    }));
}

/**
 * Reduce events into momentum chart data (per play).
 */
export function reduceMomentum(events) {
  let momentum = 0;
  const chart = [];

  for (const evt of events) {
    if (evt.eventName === EVENT_NAMES.PLAY_RESULT) {
      const p = evt.payload;
      if (p.big) {
        momentum += evt.possession === 'home' ? 3 : -3;
      } else if (p.yards > 10) {
        momentum += evt.possession === 'home' ? 1 : -1;
      } else if (p.yards < 0) {
        momentum += evt.possession === 'home' ? -1 : 1;
      }
      // Decay toward 0
      momentum *= 0.92;
      momentum = Math.max(-10, Math.min(10, momentum));
      chart.push({ seq: evt.seq, momentum: Math.round(momentum * 100) / 100 });
    }
    if (evt.eventName === EVENT_NAMES.TURNOVER) {
      momentum += evt.possession === 'home' ? -4 : 4;
      momentum = Math.max(-10, Math.min(10, momentum));
      chart.push({ seq: evt.seq, momentum: Math.round(momentum * 100) / 100 });
    }
    if (evt.eventName === EVENT_NAMES.SCORE) {
      const p = evt.payload;
      const swing = p.team === 'home' ? 2 : -2;
      momentum += swing;
      momentum = Math.max(-10, Math.min(10, momentum));
      chart.push({ seq: evt.seq, momentum: Math.round(momentum * 100) / 100 });
    }
  }

  return chart;
}
