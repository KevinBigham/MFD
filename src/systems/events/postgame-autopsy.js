/**
 * MFD Postgame Autopsy Read Model
 *
 * Detailed game breakdown that dissects every phase of the game
 * with evidence-backed analysis. Used by the Postgame Autopsy screen.
 *
 * Output shape (frozen):
 * {
 *   summary: string,
 *   phases: [
 *     { quarter: number, label: string, narrative: string, events: object[] }
 *   ],
 *   trenchReport: { grade: string, olWins: number, dlWins: number, narrative: string },
 *   pressureReport: { sacks: number, pressures: number, rate: number, narrative: string },
 *   turnoverBattle: { forced: number, lost: number, margin: number, narrative: string },
 *   bigPlays: object[],
 *   missedOpportunities: object[],
 *   adjustmentImpact: { adjustment: string, preStats: object, postStats: object, narrative: string },
 *   playerGrades: object[],
 *   coachingGrade: { grade: string, narrative: string },
 * }
 *
 * Every narrative line is traceable to game events. No flavor text without evidence.
 */

import { EVENT_NAMES } from './event-types.js';
import { reduceTeamStats, reduceDrives, reducePlayerStats, reduceMomentum } from './reducers.js';

export function buildPostgameAutopsy(events, context) {
  const { userSide, homeTeam, awayTeam } = context;
  const oppSide = userSide === 'home' ? 'away' : 'home';

  const teamStats = reduceTeamStats(events);
  const drives = reduceDrives(events);
  const playerStats = reducePlayerStats(events);
  const momentumChart = reduceMomentum(events);

  const us = teamStats[userSide];
  const them = teamStats[oppSide];

  const gameEnd = events.find(e => e.eventName === EVENT_NAMES.GAME_END);
  const homeScore = gameEnd ? gameEnd.payload.homeScore : 0;
  const awayScore = gameEnd ? gameEnd.payload.awayScore : 0;
  const userScore = userSide === 'home' ? homeScore : awayScore;
  const oppScore = userSide === 'home' ? awayScore : homeScore;
  const won = userScore > oppScore;
  const userTeam = userSide === 'home' ? homeTeam : awayTeam;
  const oppTeam = userSide === 'home' ? awayTeam : homeTeam;

  // Summary
  const margin = Math.abs(userScore - oppScore);
  let summary;
  if (won && margin >= 17) {
    summary = userTeam + ' dominated ' + oppTeam + ' ' + userScore + '-' + oppScore + '. A complete team victory.';
  } else if (won && margin >= 8) {
    summary = userTeam + ' handled ' + oppTeam + ' ' + userScore + '-' + oppScore + '. Solid win across the board.';
  } else if (won) {
    summary = userTeam + ' edged ' + oppTeam + ' ' + userScore + '-' + oppScore + ' in a competitive game.';
  } else if (margin <= 7) {
    summary = userTeam + ' fell ' + userScore + '-' + oppScore + ' to ' + oppTeam + ' in a close contest.';
  } else {
    summary = userTeam + ' lost ' + userScore + '-' + oppScore + ' to ' + oppTeam + '. Plenty to fix going forward.';
  }

  // Quarter-by-quarter phases
  const phases = [1, 2, 3, 4].map(q => {
    const qEvents = events.filter(e => e.quarter === q);
    const qPlays = qEvents.filter(e => e.eventName === EVENT_NAMES.PLAY_RESULT);
    const qScores = qEvents.filter(e => e.eventName === EVENT_NAMES.SCORE);
    const qTurnovers = qEvents.filter(e => e.eventName === EVENT_NAMES.TURNOVER);

    let narrative = 'Q' + q + ': ';
    if (qPlays.length === 0) {
      narrative += 'No plays recorded.';
    } else {
      const qYards = qPlays.reduce((s, e) => s + (e.payload.yards || 0), 0);
      const qBig = qPlays.filter(e => e.payload.big).length;
      narrative += qPlays.length + ' plays, ' + qYards + ' yards';
      if (qBig > 0) narrative += ', ' + qBig + ' explosive play' + (qBig > 1 ? 's' : '');
      if (qScores.length > 0) narrative += ', ' + qScores.length + ' scoring play' + (qScores.length > 1 ? 's' : '');
      if (qTurnovers.length > 0) narrative += ', ' + qTurnovers.length + ' turnover' + (qTurnovers.length > 1 ? 's' : '');
      narrative += '.';
    }

    return {
      quarter: q,
      label: 'Quarter ' + q,
      narrative,
      events: qEvents.slice(0, 10).map(e => ({ eventName: e.eventName, desc: e.payload.desc || '' })),
    };
  });

  // Trench report from trench_resolution events
  const trenchEvents = events.filter(e => e.eventName === EVENT_NAMES.TRENCH_RESOLUTION);
  let olWins = 0;
  let dlWins = 0;
  for (const te of trenchEvents) {
    if (te.payload.runLaneOpen || te.payload.pocketIntact) olWins++;
    else dlWins++;
  }
  const trenchTotal = olWins + dlWins;
  const trenchGrade = trenchTotal === 0 ? 'N/A' :
    olWins / trenchTotal >= 0.7 ? 'A' :
    olWins / trenchTotal >= 0.55 ? 'B' :
    olWins / trenchTotal >= 0.4 ? 'C' : 'D';
  const trenchNarrative = trenchTotal === 0 ? 'No trench data available.' :
    'O-line won ' + olWins + ' of ' + trenchTotal + ' battles. ' +
    (trenchGrade === 'A' ? 'Dominant at the point of attack.' :
     trenchGrade === 'B' ? 'Solid protection and run blocking.' :
     trenchGrade === 'C' ? 'Inconsistent work up front.' :
     'The trenches were lost — DL controlled the line.');

  // Pressure report
  const pressureEvents = events.filter(e => e.eventName === EVENT_NAMES.PRESSURE_RESOLUTION);
  const pressured = pressureEvents.filter(e => e.payload.pressured).length;
  const sacked = pressureEvents.filter(e => e.payload.sacked).length;
  const pressureRate = pressureEvents.length > 0 ? Math.round((pressured / pressureEvents.length) * 100) : 0;
  const pressureNarrative = pressureEvents.length === 0 ? 'No pressure data available.' :
    'QB was pressured on ' + pressured + ' of ' + pressureEvents.length + ' dropbacks (' + pressureRate + '%). ' +
    (sacked > 0 ? sacked + ' sack' + (sacked > 1 ? 's' : '') + ' taken. ' : '') +
    (pressureRate > 40 ? 'Protection was a major issue.' :
     pressureRate > 25 ? 'Some pressure leaks to address.' :
     'Pass protection held up well.');

  // Turnover battle
  const turnoverMargin = them.turnovers - us.turnovers;
  let turnoverNarrative;
  if (turnoverMargin > 0) {
    turnoverNarrative = 'Won the turnover battle +' + turnoverMargin + '. Forced ' + them.turnovers + ', lost ' + us.turnovers + '.';
  } else if (turnoverMargin < 0) {
    turnoverNarrative = 'Lost the turnover battle ' + turnoverMargin + '. Lost ' + us.turnovers + ', forced ' + them.turnovers + '.';
  } else {
    turnoverNarrative = 'Turnover battle even at ' + us.turnovers + ' each.';
  }

  // Big plays
  const bigPlays = events
    .filter(e => e.eventName === EVENT_NAMES.PLAY_RESULT && e.payload.big)
    .map(e => ({
      quarter: e.quarter,
      clock: e.clock,
      player: e.payload.player,
      yards: e.payload.yards,
      desc: e.payload.desc,
      side: e.possession,
    }));

  // Missed opportunities: drives that stalled in opponent territory
  const missedOpps = drives
    .filter(d => d.team === userSide && d.result !== 'touchdown' && d.result !== 'field_goal' && (d.startFieldPos + (d.yards || 0)) >= 50)
    .map(d => ({
      driveNum: d.driveNum,
      startFieldPos: d.startFieldPos,
      yards: d.yards,
      result: d.result,
      narrative: 'Drive #' + d.driveNum + ' stalled after ' + d.plays + ' plays, ' + d.yards + ' yards. Result: ' + (d.result || 'unknown') + '.',
    }));

  // Halftime adjustment impact
  const halfEvt = events.find(e => e.eventName === EVENT_NAMES.HALFTIME_ADJUSTMENT);
  let adjustmentImpact;
  if (halfEvt) {
    const preEvents = events.filter(e => e.quarter <= 2 && e.eventName === EVENT_NAMES.PLAY_RESULT);
    const postEvents = events.filter(e => e.quarter >= 3 && e.eventName === EVENT_NAMES.PLAY_RESULT);
    const preYds = preEvents.reduce((s, e) => s + (e.payload.yards || 0), 0);
    const postYds = postEvents.reduce((s, e) => s + (e.payload.yards || 0), 0);
    const preAvg = preEvents.length > 0 ? (preYds / preEvents.length).toFixed(1) : '0.0';
    const postAvg = postEvents.length > 0 ? (postYds / postEvents.length).toFixed(1) : '0.0';

    adjustmentImpact = {
      adjustment: halfEvt.payload.adjustmentLabel,
      preStats: { plays: preEvents.length, yards: preYds, ypp: parseFloat(preAvg) },
      postStats: { plays: postEvents.length, yards: postYds, ypp: parseFloat(postAvg) },
      narrative: 'Halftime adjustment: ' + halfEvt.payload.adjustmentLabel + '. ' +
        'Pre-adjustment: ' + preAvg + ' yds/play (' + preEvents.length + ' plays). ' +
        'Post-adjustment: ' + postAvg + ' yds/play (' + postEvents.length + ' plays).',
    };
  } else {
    adjustmentImpact = {
      adjustment: 'None',
      preStats: { plays: 0, yards: 0, ypp: 0 },
      postStats: { plays: 0, yards: 0, ypp: 0 },
      narrative: 'No halftime adjustment recorded.',
    };
  }

  // Player grades
  const playerEntries = Object.values(playerStats);
  const playerGrades = playerEntries
    .map(ps => {
      const score = (ps.passTD * 6) + (ps.rushTD * 6) + (ps.recTD * 6) +
        (ps.passYds * 0.04) + (ps.rushYds * 0.1) + (ps.recYds * 0.1) +
        (ps.sacks * 3) + (ps.forcedFumbles * 3) - (ps.int * 4);
      const grade = score >= 20 ? 'A' : score >= 12 ? 'B' : score >= 5 ? 'C' : 'D';
      return { name: ps.name, grade, score: Math.round(score * 10) / 10, stats: ps };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Coaching grade
  let coachScore = 0;
  if (won) coachScore += 3;
  if (drivePctCalc(drives, userSide) >= 40) coachScore += 2;
  if (us.turnovers <= 1) coachScore += 2;
  if (turnoverMargin > 0) coachScore += 1;
  if (us.penalties <= 4) coachScore += 1;
  const coachGrade = coachScore >= 8 ? 'A' : coachScore >= 6 ? 'B' : coachScore >= 4 ? 'C' : 'D';
  const coachNarrative = coachGrade === 'A' ? 'Outstanding gameplan execution. Minimal mistakes.' :
    coachGrade === 'B' ? 'Solid coaching performance. A few areas to tighten up.' :
    coachGrade === 'C' ? 'Mixed results. Some questionable decisions to review.' :
    'Coaching struggled today. Too many avoidable errors.';

  return {
    summary,
    phases,
    trenchReport: { grade: trenchGrade, olWins, dlWins, narrative: trenchNarrative },
    pressureReport: { sacks: sacked, pressures: pressured, rate: pressureRate, narrative: pressureNarrative },
    turnoverBattle: { forced: them.turnovers, lost: us.turnovers, margin: turnoverMargin, narrative: turnoverNarrative },
    bigPlays,
    missedOpportunities: missedOpps,
    adjustmentImpact,
    playerGrades,
    coachingGrade: { grade: coachGrade, narrative: coachNarrative },
  };
}

function drivePctCalc(drives, side) {
  const userDrives = drives.filter(d => d.team === side);
  const scoring = userDrives.filter(d => d.result === 'touchdown' || d.result === 'field_goal');
  return userDrives.length > 0 ? Math.round((scoring.length / userDrives.length) * 100) : 0;
}
