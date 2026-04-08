/**
 * MFD Training Camp System
 *
 * Pre-season phase between post_draft and preseason.
 * Handles rookie evaluations, position battles, camp injuries,
 * and surprise breakout performances.
 */

import { mulberry32 } from '../rng';
import type { PrngFn } from '../rng';
import type { GameState, Player, Position } from '../types';

// ── Constants ─────────────────────────────────────────────

const CAMP_INJURY_RATE = 0.025;         // 2.5% chance per player
const BREAKOUT_RATE = 0.06;             // 6% chance for eligible players
const ROOKIE_STANDOUT_RATE = 0.15;      // 15% chance per rookie
const DEV_BOOST_STANDOUT = 2;           // OVR boost for camp standouts
const BREAKOUT_OVR_BOOST = 3;           // OVR boost for breakout players
const BREAKOUT_MAX_OVR = 72;            // Only sub-72 players can break out
const CAMP_INJURY_WEEKS = 2;            // Minor camp injuries last 2 weeks
const MIN_BATTLE_OVR_GAP = 5;           // Position battles if gap <= 5 OVR

// ── Types ─────────────────────────────────────────────────

export interface CampStandout {
  playerId: string;
  playerName: string;
  pos: Position;
  ovrBefore: number;
  ovrAfter: number;
  reason: 'rookie_standout' | 'breakout' | 'battle_winner';
}

export interface CampInjury {
  playerId: string;
  playerName: string;
  pos: Position;
  weeksOut: number;
}

export interface PositionBattle {
  pos: Position;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  winnerOvr: number;
  loserOvr: number;
}

export interface TrainingCampResults {
  teamId: string;
  standouts: CampStandout[];
  injuries: CampInjury[];
  battles: PositionBattle[];
  headlines: string[];
}

// ── Core Logic ────────────────────────────────────────────

function findPositionBattles(roster: Player[]): Array<{ pos: Position; players: [Player, Player] }> {
  const byPos = new Map<Position, Player[]>();
  for (const p of roster) {
    if (p.injury) continue;
    const list = byPos.get(p.pos) ?? [];
    list.push(p);
    byPos.set(p.pos, list);
  }

  const battles: Array<{ pos: Position; players: [Player, Player] }> = [];
  for (const [pos, players] of byPos) {
    if (players.length < 2) continue;
    const sorted = [...players].sort((a, b) => b.ovr - a.ovr);
    const top = sorted[0]!;
    const challenger = sorted[1]!;
    if (top.ovr - challenger.ovr <= MIN_BATTLE_OVR_GAP) {
      battles.push({ pos, players: [top, challenger] });
    }
  }
  return battles;
}

function resolvePositionBattle(
  top: Player,
  challenger: Player,
  rng: PrngFn,
): { winner: Player; loser: Player } {
  // Challenger has a chance to win if close in OVR
  // Younger players and higher-pot players get an edge
  const gap = top.ovr - challenger.ovr;
  const youthEdge = (top.age - challenger.age) * 0.03;
  const potEdge = (challenger.pot - top.pot) * 0.02;
  const upsetChance = Math.max(0.15, 0.5 - gap * 0.08 + youthEdge + potEdge);

  if (rng() < upsetChance) {
    return { winner: challenger, loser: top };
  }
  return { winner: top, loser: challenger };
}

export function runTrainingCamp(game: GameState, teamId: string): TrainingCampResults {
  const team = game.teams[teamId];
  if (!team) {
    return { teamId, standouts: [], injuries: [], battles: [], headlines: [] };
  }

  const rng = mulberry32(game.seed + teamId.charCodeAt(0) * 1000 + game.year);
  const standouts: CampStandout[] = [];
  const injuries: CampInjury[] = [];
  const battles: PositionBattle[] = [];
  const headlines: string[] = [];

  // 1. Rookie evaluations — standouts get dev boost
  const rookies = team.roster.filter((p) => p.yearsExp <= 1);
  for (const rookie of rookies) {
    if (rng() < ROOKIE_STANDOUT_RATE) {
      const ovrBefore = rookie.ovr;
      rookie.ovr = Math.min(99, rookie.ovr + DEV_BOOST_STANDOUT);
      game.players[rookie.id] = rookie;
      standouts.push({
        playerId: rookie.id,
        playerName: rookie.name,
        pos: rookie.pos,
        ovrBefore,
        ovrAfter: rookie.ovr,
        reason: 'rookie_standout',
      });
      headlines.push(`${rookie.name} (${rookie.pos}) turned heads in camp with elite practice reps.`);
    }
  }

  // 2. Surprise breakouts — low-OVR veterans or late picks flash potential
  const breakoutEligible = team.roster.filter(
    (p) => p.ovr < BREAKOUT_MAX_OVR && !p.injury && p.yearsExp >= 1,
  );
  for (const player of breakoutEligible) {
    if (rng() < BREAKOUT_RATE) {
      const ovrBefore = player.ovr;
      player.ovr = Math.min(99, player.ovr + BREAKOUT_OVR_BOOST);
      game.players[player.id] = player;
      standouts.push({
        playerId: player.id,
        playerName: player.name,
        pos: player.pos,
        ovrBefore,
        ovrAfter: player.ovr,
        reason: 'breakout',
      });
      headlines.push(`${player.name} is the surprise of camp — coaches are raving.`);
    }
  }

  // 3. Position battles — close competitions resolved
  const potentialBattles = findPositionBattles(team.roster);
  for (const battle of potentialBattles) {
    const result = resolvePositionBattle(battle.players[0], battle.players[1], rng);
    battles.push({
      pos: battle.pos,
      winnerId: result.winner.id,
      winnerName: result.winner.name,
      loserId: result.loser.id,
      loserName: result.loser.name,
      winnerOvr: result.winner.ovr,
      loserOvr: result.loser.ovr,
    });
    // Winner gets a small confidence boost
    result.winner.morale = Math.min(100, (result.winner.morale ?? 70) + 5);
    game.players[result.winner.id] = result.winner;
    headlines.push(
      `${result.winner.name} wins the ${battle.pos} battle over ${result.loser.name}.`,
    );
  }

  // 4. Camp injuries — minor injuries (2-3% chance per player)
  for (const player of team.roster) {
    if (player.injury) continue;
    if (rng() < CAMP_INJURY_RATE) {
      player.injury = {
        type: 'Soft Tissue',
        severity: 'questionable',
        severityTier: 'minor',
        gamesOut: CAMP_INJURY_WEEKS,
        id: `camp-inj-${player.id}-${game.year}`,
        gamesRecovered: 0,
        reinjuryRisk: 0.05,
        ratingPenalty: 0,
        affectedRatings: [],
        onIR: false,
      };
      game.players[player.id] = player;
      injuries.push({
        playerId: player.id,
        playerName: player.name,
        pos: player.pos,
        weeksOut: CAMP_INJURY_WEEKS,
      });
      headlines.push(
        `${player.name} (${player.pos}) suffered a minor injury in camp — expected back Week ${CAMP_INJURY_WEEKS + 1}.`,
      );
    }
  }

  if (headlines.length === 0) {
    headlines.push('A quiet camp — no major surprises or injuries.');
  }

  return { teamId, standouts, injuries, battles, headlines };
}

export function runAllTrainingCamps(game: GameState): TrainingCampResults[] {
  const results: TrainingCampResults[] = [];
  for (const teamId of Object.keys(game.teams)) {
    results.push(runTrainingCamp(game, teamId));
  }
  return results;
}
