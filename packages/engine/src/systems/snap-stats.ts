import type { Player, PlayerGameLine, SnapEvent, Team, TeamGameStats } from '../types';
import { getGameAvailability } from './injury-system';
import { playerDisplayName } from '../utils';

export interface SnapTeamBoxScore {
  stats: TeamGameStats;
  mvpPlayerId: string | null;
}

function available(team: Team, positions: readonly Player['pos'][]): Player[] {
  return team.roster
    .filter((player) => positions.includes(player.pos) && getGameAvailability(player) !== 'out')
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr || a.id.localeCompare(b.id));
}

function ensureLine(lines: Map<string, PlayerGameLine>, player: Player | undefined): PlayerGameLine | null {
  if (!player) return null;
  const line = lines.get(player.id) ?? { playerId: player.id, name: playerDisplayName(player), pos: player.pos };
  lines.set(player.id, line);
  return line;
}

function add(line: PlayerGameLine | null, field: keyof PlayerGameLine, amount = 1): void {
  if (!line) return;
  const record = line as unknown as Record<string, number | string | undefined>;
  record[field] = ((record[field] as number | undefined) ?? 0) + amount;
}

function scoreMvp(line: PlayerGameLine): number {
  return (line.passYds ?? 0) + (line.rushYds ?? 0) * 1.2 + (line.recYds ?? 0)
    + ((line.passTD ?? 0) + (line.rushTD ?? 0) + (line.recTD ?? 0)) * 30
    + (line.sacks ?? 0) * 20 + (line.defINT ?? 0) * 40;
}

/** Derive the complete canonical box score from the exact persisted snaps. */
export function deriveSnapTeamBoxScore(events: readonly SnapEvent[], team: Team): SnapTeamBoxScore {
  const teamEvents = events.filter((event) => event.offenseTeamId === team.id);
  const defensiveEvents = events.filter((event) => event.defenseTeamId === team.id);
  const qb = available(team, ['QB'])[0];
  const backs = available(team, ['RB']);
  const receivers = available(team, ['WR', 'TE']);
  const kicker = available(team, ['K'])[0];
  const defenders = available(team, ['CB', 'S', 'LB', 'DL']);
  const lines = new Map<string, PlayerGameLine>();
  let passingYards = 0;
  let rushingYards = 0;
  let passAttempts = 0;
  let passCompletions = 0;
  let passTDs = 0;
  let interceptions = 0;
  let rushAttempts = 0;
  let rushTDs = 0;
  let fumbles = 0;
  let fgMade = 0;
  let fgAttempted = 0;
  let punts = 0;
  let thirdDownAttempts = 0;
  let thirdDownConversions = 0;
  let redZoneTrips = 0;
  let redZoneScores = 0;
  let possessionSeconds = 0;
  const quarterScores = [0, 0, 0, 0];

  for (const event of teamEvents) {
    possessionSeconds += event.elapsedSeconds;
    while (quarterScores.length < event.before.quarter) quarterScores.push(0);
    quarterScores[event.before.quarter - 1] = (quarterScores[event.before.quarter - 1] ?? 0) + event.points;
    if (event.before.down === 3) {
      thirdDownAttempts += 1;
      if (event.after.possessionTeamId === team.id && event.after.down === 1) thirdDownConversions += 1;
    }
    if (event.before.fieldPosition < 80 && event.after.possessionTeamId === team.id && event.after.fieldPosition >= 80) redZoneTrips += 1;
    if (event.points > 0 && event.before.fieldPosition >= 80) redZoneScores += 1;

    if (event.playType === 'pass') {
      const qbLine = ensureLine(lines, qb);
      passAttempts += 1;
      add(qbLine, 'passAtt');
      if (event.turnover) {
        interceptions += 1;
        add(qbLine, 'passINT');
      } else if (event.yards > 0) {
        const receiver = receivers[(event.sequence + Math.max(0, event.yards)) % Math.max(1, receivers.length)];
        const receiverLine = ensureLine(lines, receiver);
        passCompletions += 1;
        passingYards += event.yards;
        add(qbLine, 'passComp');
        add(qbLine, 'passYds', event.yards);
        add(receiverLine, 'targets');
        add(receiverLine, 'rec');
        add(receiverLine, 'recYds', event.yards);
        if (event.points === 7) {
          passTDs += 1;
          add(qbLine, 'passTD');
          add(receiverLine, 'recTD');
        }
      } else {
        const receiver = receivers[event.sequence % Math.max(1, receivers.length)];
        add(ensureLine(lines, receiver), 'targets');
      }
    } else if (event.playType === 'run' || event.playType === 'trick') {
      const runner = backs[event.sequence % Math.max(1, backs.length)] ?? qb;
      const runnerLine = ensureLine(lines, runner);
      rushAttempts += 1;
      rushingYards += event.yards;
      add(runnerLine, 'rushAtt');
      add(runnerLine, 'rushYds', event.yards);
      if (event.turnover) {
        fumbles += 1;
        add(runnerLine, 'fumbles');
      }
      if (event.points === 7) {
        rushTDs += 1;
        add(runnerLine, 'rushTD');
      }
    } else if (event.playType === 'field_goal') {
      fgAttempted += 1;
      add(ensureLine(lines, kicker), 'fgAtt');
      if (event.points === 3) {
        fgMade += 1;
        add(ensureLine(lines, kicker), 'fgMade');
      }
    } else if (event.playType === 'punt') {
      punts += 1;
    }
  }

  for (const event of defensiveEvents) {
    const defender = defenders[event.sequence % Math.max(1, defenders.length)];
    if (event.playType === 'run' || event.playType === 'pass' || event.playType === 'trick') add(ensureLine(lines, defender), 'tackles');
    if (event.turnover && event.playType === 'pass') add(ensureLine(lines, defenders[0]), 'defINT');
  }

  const playerLines = [...lines.values()];
  const mvpPlayerId = playerLines
    .slice()
    .sort((a, b) => scoreMvp(b) - scoreMvp(a) || a.playerId.localeCompare(b.playerId))[0]?.playerId ?? null;
  const turnovers = interceptions + fumbles;
  const totalYards = passingYards + rushingYards;
  const drives = teamEvents.filter((event) => event.after.possessionTeamId !== team.id).length;

  return {
    stats: {
      totalYards,
      passingYards,
      rushingYards,
      turnovers,
      sacks: 0,
      pressuresAllowed: 0,
      thirdDownConversions,
      thirdDownAttempts,
      timeOfPossession: Math.round(possessionSeconds / 60),
      passAttempts,
      passCompletions,
      passTDs,
      interceptions,
      rushAttempts,
      rushTDs,
      fumbles,
      penalties: 0,
      penaltyYards: 0,
      fgMade,
      fgAttempted,
      punts,
      drives,
      yacYards: Math.max(0, passingYards - passCompletions * 8),
      redZoneTrips,
      redZoneScores,
      quarterScores: quarterScores as [number, number, number, number, ...number[]],
      playerLines,
    },
    mvpPlayerId,
  };
}
