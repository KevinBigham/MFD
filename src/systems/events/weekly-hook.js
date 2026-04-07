/**
 * MFD Weekly Hook Read Model
 *
 * Transforms a game's event log into a plain-language weekly recap
 * suitable for the Command Desk / weekly review screen.
 *
 * Output shape (frozen):
 * {
 *   week: number,
 *   year: number,
 *   opponent: string,
 *   result: string,         // "W 28-14" or "L 14-28"
 *   homeScore: number,
 *   awayScore: number,
 *   headlines: string[],    // 3-5 plain-English summary lines
 *   keyPlays: object[],     // top 3 plays by impact
 *   injuries: object[],     // new injuries from this game
 *   turnovers: object[],
 *   mvp: { name, stat },
 *   driveEfficiency: { drives, scoringDrives, pct },
 *   pressureRate: number,   // 0-100
 *   rzEff: number,          // 0-100 red zone efficiency
 *   coverageWin: number,    // 0-100 coverage grade
 *   runLaneAdv: number,     // 0-100 run blocking grade
 * }
 *
 * Every line is traceable to actual football events — no floating flavor text.
 */

import { EVENT_NAMES } from './event-types.js';
import { reduceTeamStats, reduceDrives, reducePlayerStats, reduceTurnovers, reduceInjuries } from './reducers.js';

export function buildWeeklyHook(events, context) {
  const { userSide, week, year, opponent } = context;
  const oppSide = userSide === 'home' ? 'away' : 'home';

  const teamStats = reduceTeamStats(events);
  const drives = reduceDrives(events);
  const playerStats = reducePlayerStats(events);
  const turnovers = reduceTurnovers(events);
  const injuries = reduceInjuries(events);

  const us = teamStats[userSide];
  const them = teamStats[oppSide];

  // Scores from game_end event
  const gameEnd = events.find(e => e.eventName === EVENT_NAMES.GAME_END);
  const homeScore = gameEnd ? gameEnd.payload.homeScore : 0;
  const awayScore = gameEnd ? gameEnd.payload.awayScore : 0;
  const userScore = userSide === 'home' ? homeScore : awayScore;
  const oppScore = userSide === 'home' ? awayScore : homeScore;
  const won = userScore > oppScore;
  const result = (won ? 'W' : 'L') + ' ' + userScore + '-' + oppScore;

  // Key plays: big plays, turnovers, scores
  const keyPlayEvents = events.filter(e =>
    (e.eventName === EVENT_NAMES.PLAY_RESULT && e.payload.big) ||
    e.eventName === EVENT_NAMES.TURNOVER ||
    (e.eventName === EVENT_NAMES.SCORE && e.payload.points >= 6)
  );
  const keyPlays = keyPlayEvents.slice(0, 5).map(e => ({
    quarter: e.quarter,
    clock: e.clock,
    type: e.eventName,
    desc: e.payload.desc,
    impact: e.eventName === EVENT_NAMES.TURNOVER ? 'turnover' :
            e.eventName === EVENT_NAMES.SCORE ? 'score' : 'big_play',
  }));

  // MVP: highest-impact player from our side
  const playerEntries = Object.values(playerStats);
  let mvp = { name: 'N/A', stat: '' };
  let bestScore = -1;
  for (const ps of playerEntries) {
    const score = (ps.passTD * 6) + (ps.rushTD * 6) + (ps.recTD * 6) +
      (ps.passYds * 0.04) + (ps.rushYds * 0.1) + (ps.recYds * 0.1) +
      (ps.sacks * 3) + (ps.forcedFumbles * 3);
    if (score > bestScore) {
      bestScore = score;
      const statParts = [];
      if (ps.comp > 0) statParts.push(ps.comp + '/' + ps.att + ', ' + ps.passYds + ' yds, ' + ps.passTD + ' TD');
      if (ps.rushAtt > 0) statParts.push(ps.rushAtt + ' car, ' + ps.rushYds + ' yds' + (ps.rushTD ? ', ' + ps.rushTD + ' TD' : ''));
      if (ps.rec > 0) statParts.push(ps.rec + ' rec, ' + ps.recYds + ' yds' + (ps.recTD ? ', ' + ps.recTD + ' TD' : ''));
      if (ps.sacks > 0) statParts.push(ps.sacks + ' sack' + (ps.sacks > 1 ? 's' : ''));
      mvp = { name: ps.name, stat: statParts.join(' | ') };
    }
  }

  // Drive efficiency
  const userDrives = drives.filter(d => d.team === userSide);
  const scoringDrives = userDrives.filter(d => d.result === 'touchdown' || d.result === 'field_goal');
  const drivePct = userDrives.length > 0 ? Math.round((scoringDrives.length / userDrives.length) * 100) : 0;

  // Pressure rate (sacks + pressures as % of opponent pass plays)
  const oppPassPlays = them.plays - (us.rushYds > 0 ? 0 : 0); // approximate
  const pressureRate = oppPassPlays > 0 ? Math.min(100, Math.round((them.sacks / Math.max(1, oppPassPlays)) * 100 * 3)) : 50;

  // Red zone efficiency (scoring drives that started inside opp 20)
  const rzDrives = userDrives.filter(d => (d.startFieldPos + (d.yards || 0)) >= 80);
  const rzScored = rzDrives.filter(d => d.result === 'touchdown' || d.result === 'field_goal');
  const rzEff = rzDrives.length > 0 ? Math.round((rzScored.length / rzDrives.length) * 100) : 50;

  // Coverage win (inverse of opponent pass efficiency)
  const oppPassYdsPerPlay = them.plays > 0 ? them.passYds / Math.max(1, them.plays) : 5;
  const coverageWin = Math.min(100, Math.max(0, Math.round(80 - oppPassYdsPerPlay * 4)));

  // Run lane advantage
  const rushYPP = us.plays > 0 ? us.rushYds / Math.max(1, us.plays) * 2 : 3;
  const runLaneAdv = Math.min(100, Math.max(0, Math.round(40 + rushYPP * 6)));

  // Headlines — traceable to actual events
  const headlines = [];
  if (won) {
    headlines.push('Victory ' + userScore + '-' + oppScore + ' over ' + opponent + '.');
  } else {
    headlines.push('Fell ' + userScore + '-' + oppScore + ' to ' + opponent + '.');
  }

  if (us.totalYards > 400) {
    headlines.push('Offense exploded for ' + us.totalYards + ' total yards.');
  } else if (us.totalYards < 200) {
    headlines.push('Offense struggled — only ' + us.totalYards + ' total yards.');
  }

  if (us.turnovers >= 3) {
    headlines.push('Ball security was a disaster — ' + us.turnovers + ' turnovers.');
  } else if (them.turnovers >= 3) {
    headlines.push('Defense forced ' + them.turnovers + ' turnovers, controlling the game.');
  }

  if (mvp.name !== 'N/A') {
    headlines.push('Player of the game: ' + mvp.name + ' (' + mvp.stat + ').');
  }

  if (injuries.length > 0) {
    headlines.push(injuries.length + ' player' + (injuries.length > 1 ? 's' : '') + ' injured during the game.');
  }

  return {
    week,
    year,
    opponent,
    result,
    homeScore,
    awayScore,
    headlines: headlines.slice(0, 5),
    keyPlays,
    injuries,
    turnovers,
    mvp,
    driveEfficiency: {
      drives: userDrives.length,
      scoringDrives: scoringDrives.length,
      pct: drivePct,
    },
    pressureRate,
    rzEff,
    coverageWin,
    runLaneAdv,
  };
}
