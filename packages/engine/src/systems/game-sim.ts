/**
 * Drive-by-drive game simulation engine.
 *
 * Inspired by the legacy monolith's simGame()/drive() (~830 lines).
 * Produces realistic per-player box scores, quarter-by-quarter scoring,
 * and play-level stat accumulation.
 */
import { RNG } from '../rng';
import { HOME_FIELD_ADV } from '../config';
import { avg, cl } from '../utils';
import { isPlayerUnavailable } from './injury-system';
import { applyGamePlan } from './game-plan';
import { simulateSpecialTeams } from './special-teams';
import type {
  GamePlan,
  MatchupHighlight,
  OpponentReport,
  Player,
  PlayerGameLine,
  PlayerMatchupEvent,
  Position,
  SpecialTeamsGameSummary,
  Team,
  TeamGameStats,
  WeatherCondition,
} from '../types';

export interface SimTeamContext {
  teamOvrBonus?: number;
  playerOvrBonuses?: Record<string, number>;
  clutchPlayerBonuses?: Record<string, number>;
  gamePlan?: GamePlan | null;
  opponentReport?: OpponentReport | null;
}

export interface SimGameContext {
  home?: SimTeamContext;
  away?: SimTeamContext;
  weather?: WeatherCondition;
  rivalryIntensity?: number;
  homeFieldBonus?: number;
}

// ── Helpers ─────────────────────────────────────────────

function starters(roster: Player[], pos: Position): Player[] {
  return roster
    .filter((p) => p.pos === pos && p.isStarter && !isPlayerUnavailable(p))
    .sort((a, b) => b.ovr - a.ovr);
}

function situationalBonus(player: Player | null | undefined, bonuses: Record<string, number> | undefined, quarter: number, scoreDiff: number): number {
  if (!player || quarter < 4 || Math.abs(scoreDiff) > 7) return 0;
  return bonuses?.[player.id] ?? 0;
}

function bestAvailable(
  roster: Player[],
  pos: Position,
  bonuses?: Record<string, number>,
  quarter = 1,
  scoreDiff = 0,
): Player | null {
  return roster
    .filter((p) => p.pos === pos && !isPlayerUnavailable(p))
    .sort((a, b) =>
      Number(b.isStarter) - Number(a.isStarter)
      || (b.ovr + situationalBonus(b, bonuses, quarter, scoreDiff)) - (a.ovr + situationalBonus(a, bonuses, quarter, scoreDiff))
      || a.id.localeCompare(b.id))[0] ?? null;
}

function posAvg(
  roster: Player[],
  pos: Position,
  bonuses?: Record<string, number>,
  quarter = 1,
  scoreDiff = 0,
): number {
  const group = roster.filter((p) => p.pos === pos && !isPlayerUnavailable(p));
  return group.length > 0 ? avg(group.map((p) => p.ovr + situationalBonus(p, bonuses, quarter, scoreDiff))) : 60;
}

// ── Drive result ────────────────────────────────────────

interface DriveResult {
  points: number;
  type: 'td_pass' | 'td_rush' | 'fg' | 'punt' | 'turnover' | 'stall';
  yards: number;
  playType: 'run' | 'pass';
}

interface PlayCallState {
  lastPlayType: 'run' | 'pass' | null;
  streak: number;
}

const PASS_TENDENCY_PENALTY = 3;
const BASE_PASS_STALL_CHANCE = 0.16;
const BASE_RUN_STALL_CHANCE = 0.13;
const BASE_PRESSURE_CHANCE = 0.24;
const PRESSURE_GAP_MULTIPLIER = 0.006;
const STRIP_SACK_CHANCE = 0.34;
const BASE_INT_CHANCE = 0.097;
const BASE_FUMBLE_CHANCE = 0.065;

interface WeatherEffects {
  passQuality: number;
  runQuality: number;
  fumbleChance: number;
  longFieldGoalPenalty: number;
}

function weatherEffects(weather: WeatherCondition): WeatherEffects {
  if (weather === 'rain') {
    return { passQuality: -8, runQuality: 0, fumbleChance: 0.03, longFieldGoalPenalty: 0 };
  }
  if (weather === 'snow') {
    return { passQuality: -12, runQuality: -5, fumbleChance: 0.05, longFieldGoalPenalty: 0 };
  }
  if (weather === 'wind') {
    return { passQuality: -2, runQuality: 0, fumbleChance: 0, longFieldGoalPenalty: 0.15 };
  }
  return { passQuality: 0, runQuality: 0, fumbleChance: 0, longFieldGoalPenalty: 0 };
}

// ── Coaching edge calculation ───────────────────────────

function coachingEdge(team: Team, opponent: Team): number {
  const hcRating = team.staff?.hc?.ratings?.gameplan ?? 70;
  const oppHcRating = opponent.staff?.hc?.ratings?.gameplan ?? 70;
  return (hcRating - oppHcRating) * 0.03;
}

function topReceivingThreat(team: Team): Player | null {
  return team.roster
    .filter((player) => (player.pos === 'WR' || player.pos === 'TE') && !isPlayerUnavailable(player))
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr || a.id.localeCompare(b.id))[0] ?? null;
}

function buildMatchupHighlight(offense: Team, defense: Team): MatchupHighlight | null {
  const target = topReceivingThreat(offense);
  const corner = bestAvailable(defense.roster, 'CB');
  if (!target || !corner) return null;

  const advantage = target.ovr - corner.ovr;
  if (Math.abs(advantage) < 8) return null;

  return {
    label: advantage > 0 ? 'WR-CB mismatch' : 'Corner eraser',
    detail: `${target.name} (${target.ovr}) vs ${corner.name} (${corner.ovr}) shapes the outside passing game.`,
    teamId: offense.id,
    playerId: target.id,
    opponentPlayerId: corner.id,
    advantage,
  };
}

// ── Single drive simulation ─────────────────────────────

function simulateDrive(
  offense: Team,
  defense: Team,
  cEdge: number,
  scoreDiff: number,
  quarter: number,
  lines: Map<string, PlayerGameLine>,
  playCallState: PlayCallState,
  weather: WeatherCondition,
  offenseClutchBonuses: Record<string, number>,
  defenseClutchBonuses: Record<string, number>,
  matchupEvents: PlayerMatchupEvent[],
): DriveResult {
  const qb = bestAvailable(offense.roster, 'QB', offenseClutchBonuses, quarter, scoreDiff);
  const rb = bestAvailable(offense.roster, 'RB', offenseClutchBonuses, quarter, scoreDiff);
  const receivers = offense.roster
    .filter((p) => (p.pos === 'WR' || p.pos === 'TE') && !p.injury)
    .sort((a, b) =>
      Number(b.isStarter) - Number(a.isStarter)
      || (b.ovr + situationalBonus(b, offenseClutchBonuses, quarter, scoreDiff)) - (a.ovr + situationalBonus(a, offenseClutchBonuses, quarter, scoreDiff))
      || a.id.localeCompare(b.id))
    .slice(0, 4);
  const kicker = bestAvailable(offense.roster, 'K', offenseClutchBonuses, quarter, scoreDiff);

  const olOvr = posAvg(offense.roster, 'OL', offenseClutchBonuses, quarter, scoreDiff);
  const dlOvr = posAvg(defense.roster, 'DL', defenseClutchBonuses, quarter, scoreDiff);
  const lbOvr = posAvg(defense.roster, 'LB', defenseClutchBonuses, quarter, scoreDiff);
  const sOvr = posAvg(defense.roster, 'S', defenseClutchBonuses, quarter, scoreDiff);
  const bestCb = bestAvailable(defense.roster, 'CB', defenseClutchBonuses, quarter, scoreDiff);
  const weatherFx = weatherEffects(weather);

  const pocket = (olOvr - dlOvr) * 0.15;
  const runLanes = (olOvr - (dlOvr + lbOvr) / 2) * 0.12;

  // Run/pass split — ~46% run base, adjusted by game script
  let runRate = 0.46 + runLanes * 0.02;
  if (scoreDiff <= -14) runRate -= 0.10;
  if (scoreDiff >= 14) runRate += 0.08;
  if (quarter === 4 && scoreDiff <= -7) runRate -= 0.06;
  runRate = cl(runRate, 0.28, 0.65);

  const playType = RNG.play() < runRate ? 'run' : 'pass';
  const isRun = playType === 'run';
  const tendencyPenalty = playCallState.lastPlayType === playType && playCallState.streak >= 2
    ? PASS_TENDENCY_PENALTY
    : 0;

  const stallChance = isRun
    ? cl(BASE_RUN_STALL_CHANCE - cEdge * 0.002 - runLanes * 0.008 + tendencyPenalty * 0.008, 0.08, 0.32)
    : cl(BASE_PASS_STALL_CHANCE - cEdge * 0.002 - pocket * 0.008 + tendencyPenalty * 0.008, 0.08, 0.35);
  if (RNG.play() < stallChance) {
    if (!isRun && qb) {
      const ql = ensureLine(lines, qb);
      const completions = (RNG.play() < 0.6 ? 1 : 0) + (RNG.play() < 0.15 ? 1 : 0);
      const attempts = completions + 1 + (RNG.play() < 0.45 ? 1 : 0);
      const stallYards = Math.round(4 + RNG.play() * 12);
      ql.passAtt = (ql.passAtt ?? 0) + attempts;
      ql.passComp = (ql.passComp ?? 0) + completions;
      ql.passYds = (ql.passYds ?? 0) + stallYards;
      if (receivers.length > 0 && completions > 0) {
        const target = receivers[Math.floor(RNG.play() * receivers.length)] ?? receivers[0]!;
        const rl = ensureLine(lines, target);
        rl.targets = (rl.targets ?? 0) + completions;
        rl.rec = (rl.rec ?? 0) + completions;
        rl.recYds = (rl.recYds ?? 0) + stallYards;
      }
      return { points: 0, type: 'punt', yards: stallYards, playType };
    }

    if (rb) {
      const rbl = ensureLine(lines, rb);
      const stallYards = Math.round(3 + RNG.play() * 9);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(2 + RNG.play() * 2);
      rbl.rushYds = (rbl.rushYds ?? 0) + stallYards;
      return { points: 0, type: 'punt', yards: stallYards, playType };
    }

    return { points: 0, type: 'stall', yards: Math.round(RNG.play() * 6), playType };
  }

  // ── PASSING PLAY ──────────────────────────────────────
  if (!isRun && qb && receivers.length > 0) {
    const targetWeights = [0.40, 0.28, 0.20, 0.12];
    let targetIdx = 0;
    const tRoll = RNG.play();
    let cumulative = 0;
    for (let i = 0; i < receivers.length; i++) {
      cumulative += targetWeights[i] ?? 0.1;
      if (tRoll < cumulative) { targetIdx = i; break; }
    }
    const target = receivers[targetIdx] ?? receivers[0]!;

    const qbLateBonus = situationalBonus(qb, offenseClutchBonuses, quarter, scoreDiff);
    const targetLateBonus = situationalBonus(target, offenseClutchBonuses, quarter, scoreDiff);
    const cbLateBonus = situationalBonus(bestCb, defenseClutchBonuses, quarter, scoreDiff);
    const qbOvr = qb.ovr + qbLateBonus;
    const qbAcc = (qb.ratings.accuracy ?? qb.ovr) + qbLateBonus;
    const qbAware = (qb.ratings.awareness ?? qb.ovr) + qbLateBonus;
    const coverage = (((bestCb?.ovr ?? 68) + cbLateBonus) * 0.7) + sOvr * 0.3;
    const matchupGap = (target.ovr + targetLateBonus) - ((bestCb?.ovr ?? 68) + cbLateBonus);
    const matchupBonus = matchupGap >= 8 ? 4 : matchupGap <= -8 ? -4 : 0;

    let quality = (qbAcc - coverage) * 0.45
      + (qbAware - 70) * 0.22
      + cEdge * 0.4
      + pocket * 0.55
      + matchupBonus
      + weatherFx.passQuality
      - tendencyPenalty;

    if (quarter === 4 && Math.abs(scoreDiff) <= 7) {
      if (qb.traits.includes('clutch')) {
        quality += 6;
      } else if (qb.traits.includes('streaky')) {
        quality += RNG.play() < 0.5 ? 4 : -4;
      } else if (qb.personality.pressure < 4) {
        quality -= 3;
      }
    }

    // Pressure/sack check
    const pressureChance = cl(BASE_PRESSURE_CHANCE + (dlOvr - olOvr) * PRESSURE_GAP_MULTIPLIER + tendencyPenalty * 0.01, 0.08, 0.38);
    if (RNG.play() < pressureChance) {
      const isSack = RNG.play() < 0.62;
      if (isSack) {
        const sackYards = -(5 + Math.round(RNG.play() * 7));
        // Credit sack to a defensive player
        const sackers = defense.roster
          .filter((p) => (p.pos === 'DL' || p.pos === 'LB') && !p.injury)
          .sort((a, b) => b.ovr - a.ovr);
        const sacker = sackers[0];
        if (sacker) {
          const sl = ensureLine(lines, sacker);
          sl.sacks = (sl.sacks ?? 0) + 1;
          sl.tackles = (sl.tackles ?? 0) + 1;
          matchupEvents.push({
            type: 'sack',
            offensePlayerId: qb.id,
            defensePlayerId: sacker.id,
            quarter,
          });
        }
        const ql = ensureLine(lines, qb);
        ql.sacked = (ql.sacked ?? 0) + 1;
        if (RNG.play() < cl(STRIP_SACK_CHANCE + weatherFx.fumbleChance, 0.18, 0.55)) {
          ql.fumbles = (ql.fumbles ?? 0) + 1;
          if (sacker) {
            matchupEvents.push({
              type: 'fumble',
              offensePlayerId: qb.id,
              defensePlayerId: sacker.id,
              quarter,
            });
          }
          return { points: 0, type: 'turnover', yards: sackYards, playType };
        }
        return { points: 0, type: 'stall', yards: sackYards, playType };
      }
      quality -= 4; // hurried, less accurate
    }

    // INT check
    const intChance = cl(BASE_INT_CHANCE - (qbAcc - 70) * 0.0007 + (coverage - 70) * 0.0011 + tendencyPenalty * 0.002, 0.025, 0.14);
    if (RNG.play() < intChance) {
      const ql = ensureLine(lines, qb);
      ql.passAtt = (ql.passAtt ?? 0) + 1;
      ql.passINT = (ql.passINT ?? 0) + 1;
      // Credit INT to a DB
      const dbs = defense.roster
        .filter((p) => (p.pos === 'CB' || p.pos === 'S') && !p.injury)
        .sort((a, b) => b.ovr - a.ovr);
      const interceptor = dbs[Math.floor(RNG.play() * Math.min(3, dbs.length))];
      if (interceptor) {
        const dl = ensureLine(lines, interceptor);
        dl.defINT = (dl.defINT ?? 0) + 1;
        matchupEvents.push({
          type: 'interception',
          offensePlayerId: qb.id,
          defensePlayerId: interceptor.id,
          quarter,
        });
      }
      return { points: 0, type: 'turnover', yards: 0, playType };
    }

    // Outcome roll
    const roll = RNG.play() * 100 + quality;
    const isRedZone = RNG.play() < 0.28;
    const redZonePassAdvantage = isRedZone && (((target.ovr + (topReceivingThreat(offense)?.ovr ?? target.ovr)) / 2) - (((bestCb?.ovr ?? 68) + sOvr) / 2)) >= 4
      ? 6
      : 0;
    const tdThreshold = isRedZone ? 68 - redZonePassAdvantage : 76;
    const fgThreshold = isRedZone ? 52 : 60;
    const ql = ensureLine(lines, qb);
    const rl = ensureLine(lines, target);

    if (roll > tdThreshold) {
      // TOUCHDOWN PASS
      const passYds = Math.round(18 + RNG.play() * 32);
      ql.passAtt = (ql.passAtt ?? 0) + 1;
      ql.passComp = (ql.passComp ?? 0) + 1;
      ql.passYds = (ql.passYds ?? 0) + passYds;
      ql.passTD = (ql.passTD ?? 0) + 1;
      rl.targets = (rl.targets ?? 0) + 1;
      rl.rec = (rl.rec ?? 0) + 1;
      rl.recYds = (rl.recYds ?? 0) + passYds;
      rl.recTD = (rl.recTD ?? 0) + 1;
      return { points: 7, type: 'td_pass', yards: passYds, playType };
    }

    if (roll > fgThreshold) {
      // FIELD GOAL ATTEMPT
      const driveYds = Math.round(25 + RNG.play() * 20);
      // Completions on the drive
      const compCount = 2 + Math.round(RNG.play());
      ql.passAtt = (ql.passAtt ?? 0) + compCount + (RNG.play() < 0.35 ? 1 : 0);
      ql.passComp = (ql.passComp ?? 0) + compCount;
      ql.passYds = (ql.passYds ?? 0) + driveYds;
      rl.targets = (rl.targets ?? 0) + Math.round(1 + RNG.play() * 2);
      rl.rec = (rl.rec ?? 0) + Math.max(1, compCount - 1);
      rl.recYds = (rl.recYds ?? 0) + Math.round(driveYds * 0.4);
      // Also give some to RB check-downs
      if (rb) {
        const rbl = ensureLine(lines, rb);
        rbl.targets = (rbl.targets ?? 0) + 1;
        const rbCatch = RNG.play() < 0.6 ? 1 : 0;
        rbl.rec = (rbl.rec ?? 0) + rbCatch;
        rbl.recYds = (rbl.recYds ?? 0) + (rbCatch ? Math.round(driveYds * 0.12) : 0);
      }

      const kOvr = kicker?.ovr ?? 70;
      const fgDist = cl(100 - 40 - driveYds + 17, 20, 58);
      const makeChance = cl(
        0.65 + (kOvr - 60) * 0.008
        - (fgDist > 45 ? 0.15 : fgDist > 35 ? 0.05 : 0)
        - (weather === 'wind' && fgDist > 40 ? weatherFx.longFieldGoalPenalty : 0),
        0.30,
        0.95,
      );
      if (kicker) {
        const kl = ensureLine(lines, kicker);
        kl.fgAtt = (kl.fgAtt ?? 0) + 1;
        if (RNG.play() < makeChance) {
          kl.fgMade = (kl.fgMade ?? 0) + 1;
          return { points: 3, type: 'fg', yards: driveYds, playType };
        }
      } else if (RNG.play() < makeChance) {
        return { points: 3, type: 'fg', yards: driveYds, playType };
      }
      return { points: 0, type: 'punt', yards: driveYds, playType };
    }

    // Incomplete / stalled drive — still accumulate some yards
    const stallYds = Math.round(5 + RNG.play() * 15);
    const compOnDrive = 1 + (RNG.play() < 0.35 ? 1 : 0);
    ql.passAtt = (ql.passAtt ?? 0) + compOnDrive + 1;
    ql.passComp = (ql.passComp ?? 0) + compOnDrive;
    ql.passYds = (ql.passYds ?? 0) + stallYds;
    rl.targets = (rl.targets ?? 0) + 1;
    const catchMade = compOnDrive > 0 && RNG.play() < 0.8 ? 1 : 0;
    rl.rec = (rl.rec ?? 0) + catchMade;
    rl.recYds = (rl.recYds ?? 0) + (catchMade ? Math.round(stallYds * 0.35) : 0);
    return { points: 0, type: 'punt', yards: stallYds, playType };
  }

  // ── RUSHING PLAY ──────────────────────────────────────
  if (rb) {
    const rbLateBonus = situationalBonus(rb, offenseClutchBonuses, quarter, scoreDiff);
    const rbOvr = rb.ovr + rbLateBonus;
    const rbSpeed = (rb.ratings.speed ?? rb.ovr) + rbLateBonus;
    const rbElusive = (rb.ratings.elusiveness ?? rb.ovr) + rbLateBonus;

    let quality2 = (rbSpeed - ((dlOvr + lbOvr) / 2)) * 0.4
      + (rbElusive - lbOvr) * 0.22
      + runLanes * 0.7
      + cEdge * 0.35
      + weatherFx.runQuality
      - tendencyPenalty;
    if (quarter === 4 && Math.abs(scoreDiff) <= 7) {
      if (qb?.traits.includes('clutch')) {
        quality2 += 2;
      } else if (qb?.traits.includes('streaky')) {
        quality2 += RNG.play() < 0.5 ? 1 : -1;
      } else if ((qb?.personality.pressure ?? 5) < 4) {
        quality2 -= 1;
      }
    }

    // Big play chance
    const bigPlayChance = cl(0.02 + (rbSpeed > 85 && rbElusive > 80 ? 0.05 : 0), 0.005, 0.10);
    if (RNG.play() < bigPlayChance) quality2 += 20;

    // Fumble check
    const fumbleChance = cl(
      BASE_FUMBLE_CHANCE + weatherFx.fumbleChance + (lbOvr - rbOvr) * 0.0014 + tendencyPenalty * 0.002,
      0.015,
      0.12,
    );
    if (RNG.play() < fumbleChance) {
      const rbl = ensureLine(lines, rb);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + 1;
      rbl.fumbles = (rbl.fumbles ?? 0) + 1;
      // Credit tackle to LB
      const lbs = defense.roster.filter((p) => p.pos === 'LB' && !p.injury).sort((a, b) => b.ovr - a.ovr);
      if (lbs[0]) {
        const ll = ensureLine(lines, lbs[0]);
        ll.tackles = (ll.tackles ?? 0) + 1;
        matchupEvents.push({
          type: 'fumble',
          offensePlayerId: rb.id,
          defensePlayerId: lbs[0].id,
          quarter,
        });
      }
      return { points: 0, type: 'turnover', yards: 0, playType };
    }

    const roll2 = RNG.play() * 100 + quality2;
    const isRedZone = RNG.play() < 0.22;
    const redZoneRunAdvantage = isRedZone && (((rb.ovr + olOvr) / 2) - ((dlOvr + lbOvr) / 2)) >= 4 ? 4 : 0;
    const tdThreshold = isRedZone ? 74 - redZoneRunAdvantage : 82;
    const fgThreshold = isRedZone ? 58 : 66;

    const rbl = ensureLine(lines, rb);

    if (roll2 > tdThreshold) {
      // RUSHING TD
      const rushYds = Math.round(11 + RNG.play() * 25);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(3 + RNG.play() * 5);
      rbl.rushYds = (rbl.rushYds ?? 0) + rushYds;
      rbl.rushTD = (rbl.rushTD ?? 0) + 1;
      // Add some passing yards for the drive too
      if (qb) {
        const ql = ensureLine(lines, qb);
        const drivePassYds = Math.round(5 + RNG.play() * 15);
        const passAttempts = 1 + Math.round(RNG.play());
        const completions = passAttempts === 2 && RNG.play() < 0.35 ? 2 : 1;
        ql.passAtt = (ql.passAtt ?? 0) + passAttempts;
        ql.passComp = (ql.passComp ?? 0) + completions;
        ql.passYds = (ql.passYds ?? 0) + drivePassYds;
      }
      return { points: 7, type: 'td_rush', yards: rushYds, playType };
    }

    if (roll2 > fgThreshold && kicker) {
      const driveYds = Math.round(20 + RNG.play() * 25);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(3 + RNG.play() * 4);
      rbl.rushYds = (rbl.rushYds ?? 0) + Math.round(driveYds * 0.55);
      // Pass on the drive too
      if (qb && receivers.length > 0) {
        const ql = ensureLine(lines, qb);
        const drivePassYds = Math.round(driveYds * 0.35);
        const passAttempts = 1 + Math.round(RNG.play());
        const completions = passAttempts === 2 && RNG.play() < 0.45 ? 2 : 1;
        ql.passAtt = (ql.passAtt ?? 0) + passAttempts;
        ql.passComp = (ql.passComp ?? 0) + completions;
        ql.passYds = (ql.passYds ?? 0) + drivePassYds;
        const rec = receivers[Math.floor(RNG.play() * receivers.length)]!;
        const rl = ensureLine(lines, rec);
        rl.targets = (rl.targets ?? 0) + 1;
        rl.rec = (rl.rec ?? 0) + 1;
        rl.recYds = (rl.recYds ?? 0) + drivePassYds;
      }

      const kl = ensureLine(lines, kicker);
      const kOvr = kicker.ovr;
      const fgDist = cl(100 - 40 - driveYds + 17, 20, 58);
      const makeChance = cl(
        0.65 + (kOvr - 60) * 0.008
        - (fgDist > 45 ? 0.15 : fgDist > 35 ? 0.05 : 0)
        - (weather === 'wind' && fgDist > 40 ? weatherFx.longFieldGoalPenalty : 0),
        0.30,
        0.95,
      );
      kl.fgAtt = (kl.fgAtt ?? 0) + 1;
      if (RNG.play() < makeChance) {
        kl.fgMade = (kl.fgMade ?? 0) + 1;
        return { points: 3, type: 'fg', yards: driveYds, playType };
      }
      return { points: 0, type: 'punt', yards: driveYds, playType };
    }

    // Stalled run drive
    const stallYds = Math.round(5 + RNG.play() * 18);
    rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(2 + RNG.play() * 3);
    rbl.rushYds = (rbl.rushYds ?? 0) + stallYds;
    return { points: 0, type: 'punt', yards: stallYds, playType };
  }

  // Fallback: no QB and no RB
  return { points: 0, type: 'stall', yards: Math.round(RNG.play() * 6), playType };
}

// ── Player line helper ──────────────────────────────────

function ensureLine(lines: Map<string, PlayerGameLine>, player: Player): PlayerGameLine {
  let line = lines.get(player.id);
  if (!line) {
    line = { playerId: player.id, name: player.name, pos: player.pos };
    lines.set(player.id, line);
  }
  return line;
}

// ── Defensive stat distribution ─────────────────────────

function distributeDefensiveStats(
  defense: Team,
  opponentDrives: number,
  lines: Map<string, PlayerGameLine>,
): void {
  const defStarters = defense.roster.filter((p) =>
    (p.pos === 'DL' || p.pos === 'LB' || p.pos === 'CB' || p.pos === 'S') && !isPlayerUnavailable(p),
  );

  for (const player of defStarters) {
    const dl = ensureLine(lines, player);
    // Base tackles based on position
    const baseTackles = player.pos === 'LB' ? 4 : player.pos === 'DL' ? 2 : 2;
    dl.tackles = (dl.tackles ?? 0) + baseTackles + Math.round(RNG.play() * (player.pos === 'LB' ? 5 : 3));

    // Additional sack chances for DL/LB (if they didn't already get one in-drive)
    if (player.pos === 'DL' && RNG.play() < 0.12) {
      dl.sacks = (dl.sacks ?? 0) + 1;
    } else if (player.pos === 'LB' && RNG.play() < 0.06) {
      dl.sacks = (dl.sacks ?? 0) + 1;
    }

    // Additional INT chances for DBs
    if (player.pos === 'CB' && RNG.play() < 0.03) {
      dl.defINT = (dl.defINT ?? 0) + 1;
    } else if (player.pos === 'S' && RNG.play() < 0.025) {
      dl.defINT = (dl.defINT ?? 0) + 1;
    }
  }
}

// ── Build team game stats from lines ────────────────────

function buildTeamStats(
  lines: Map<string, PlayerGameLine>,
  team: Team,
  score: number,
  quarterScores: [number, number, number, number, ...number[]],
  driveCount: number,
): TeamGameStats {
  let passYds = 0, rushYds = 0, turnovers = 0, sacks = 0, pressuresAllowed = 0, yacYards = 0;
  let passAtt = 0, passComp = 0, passTDs = 0, ints = 0;
  let rushAtt = 0, rushTDs = 0, fumbles = 0;
  let fgMade = 0, fgAtt = 0;

  for (const line of lines.values()) {
    passYds += line.passYds ?? 0;
    passAtt += line.passAtt ?? 0;
    passComp += line.passComp ?? 0;
    passTDs += line.passTD ?? 0;
    ints += line.passINT ?? 0;
    pressuresAllowed += line.sacked ?? 0;
    rushYds += line.rushYds ?? 0;
    rushAtt += line.rushAtt ?? 0;
    rushTDs += line.rushTD ?? 0;
    fumbles += line.fumbles ?? 0;
    fgMade += line.fgMade ?? 0;
    fgAtt += line.fgAtt ?? 0;
    yacYards += Math.max(0, (line.recYds ?? 0) - (line.rec ?? 0) * 8);
    // sacks here are defensive sacks credited TO this team's defenders
    sacks += line.sacks ?? 0;
  }

  turnovers = ints + fumbles;
  const totalYards = passYds + rushYds;
  const thirdDownAttempts = cl(Math.round(9 + score / 4 + RNG.play() * 4), 8, 18);
  const thirdDownConversions = cl(Math.round(thirdDownAttempts * (0.34 + score / 100)), 1, thirdDownAttempts);
  const timeOfPossession = cl(Math.round(28 + (score - 21) / 2 + (RNG.play() - 0.5) * 8), 22, 38);
  const penalties = Math.round(3 + RNG.play() * 7);
  const penaltyYards = Math.round(penalties * (5 + RNG.play() * 8));
  const punts = cl(driveCount - Math.round(score / 3.5) - turnovers, 1, 8);
  const redZoneTrips = cl(Math.round(score / 6 + totalYards / 180), 1, Math.max(1, driveCount));
  const redZoneScores = cl(passTDs + rushTDs + fgMade, 0, redZoneTrips);
  pressuresAllowed += Math.round(passAtt * 0.18);

  const playerLines = Array.from(lines.values()).filter(
    (l) => team.roster.some((p) => p.id === l.playerId),
  );

  return {
    totalYards,
    passingYards: passYds,
    rushingYards: rushYds,
    turnovers,
    sacks,
    pressuresAllowed,
    thirdDownConversions,
    thirdDownAttempts,
    timeOfPossession,
    passAttempts: passAtt,
    passCompletions: passComp,
    passTDs,
    interceptions: ints,
    rushAttempts: rushAtt,
    rushTDs,
    fumbles,
    penalties,
    penaltyYards,
    fgMade,
    fgAttempted: fgAtt,
    punts,
    drives: driveCount,
    yacYards,
    redZoneTrips,
    redZoneScores,
    quarterScores,
    playerLines,
  };
}

function mergeTeamLines(team: Team, ...sources: Map<string, PlayerGameLine>[]): Map<string, PlayerGameLine> {
  const merged = new Map<string, PlayerGameLine>();
  const rosterIds = new Set(team.roster.map((player) => player.id));

  for (const source of sources) {
    for (const [playerId, line] of source.entries()) {
      if (!rosterIds.has(playerId)) continue;
      const existing = merged.get(playerId) ?? { playerId: line.playerId, name: line.name, pos: line.pos };
      const mutableExisting = existing as unknown as Record<string, number | string | undefined>;
      for (const [key, value] of Object.entries(line)) {
        if (key === 'playerId' || key === 'name' || key === 'pos' || typeof value !== 'number') continue;
        mutableExisting[key] = ((mutableExisting[key] as number | undefined) ?? 0) + value;
      }
      merged.set(playerId, existing);
    }
  }

  return merged;
}

// ── Main game simulation ────────────────────────────────

export interface SimGameResult {
  homeScore: number;
  awayScore: number;
  overtime: boolean;
  homeStats: TeamGameStats;
  awayStats: TeamGameStats;
  homeMvpId: string | null;
  awayMvpId: string | null;
  weather: WeatherCondition;
  matchupHighlight: MatchupHighlight | null;
  specialTeams: Record<string, SpecialTeamsGameSummary>;
  playerMatchupEvents: PlayerMatchupEvent[];
}

function applySimContext(team: Team, context?: SimTeamContext): Team {
  if (!context) return team;
  const teamOvrBonus = context.teamOvrBonus ?? 0;
  const basePlayerBonuses = context.playerOvrBonuses ?? {};
  const gamePlanBonuses = context.gamePlan && context.opponentReport
    ? applyGamePlan(context.gamePlan, context.opponentReport, team).playerOvrBonuses ?? {}
    : {};
  const playerBonuses = { ...basePlayerBonuses };
  for (const [playerId, bonus] of Object.entries(gamePlanBonuses)) {
    playerBonuses[playerId] = (playerBonuses[playerId] ?? 0) + bonus;
  }
  if (teamOvrBonus === 0 && Object.keys(playerBonuses).length === 0) return team;

  return {
    ...team,
    roster: team.roster.map((player) => {
      const bonus = teamOvrBonus + (playerBonuses[player.id] ?? 0);
      if (bonus === 0) return player;
      const ratings = Object.fromEntries(
        Object.entries(player.ratings).map(([key, value]) => [key, value + bonus]),
      );
      return {
        ...player,
        ovr: player.ovr + bonus,
        ratings,
      };
    }),
  };
}

export function simGame(home: Team, away: Team, context?: SimGameContext): SimGameResult {
  const adjustedHome = applySimContext(home, context?.home);
  const adjustedAway = applySimContext(away, context?.away);
  const weather = context?.weather ?? 'dome';
  const rivalryBoost = context?.rivalryIntensity ? Math.min(2, Math.round(context.rivalryIntensity / 35)) : 0;
  const matchupHighlight = buildMatchupHighlight(adjustedHome, adjustedAway)
    ?? buildMatchupHighlight(adjustedAway, adjustedHome);
  const homeLines = new Map<string, PlayerGameLine>();
  const awayLines = new Map<string, PlayerGameLine>();
  const playerMatchupEvents: PlayerMatchupEvent[] = [];

  const baseHomeCEdge = coachingEdge(adjustedHome, adjustedAway) + (HOME_FIELD_ADV + (context?.homeFieldBonus ?? 0)) / 3 + rivalryBoost;
  const baseAwayCEdge = coachingEdge(adjustedAway, adjustedHome);

  let homeScore = 0;
  let awayScore = 0;
  const homeQtrScores: number[] = [0, 0, 0, 0];
  const awayQtrScores: number[] = [0, 0, 0, 0];
  let homePlayState: PlayCallState = { lastPlayType: null, streak: 0 };
  let awayPlayState: PlayCallState = { lastPlayType: null, streak: 0 };

  // 11-13 drives per team
  const totalDrives = 11 + Math.floor(RNG.play() * 3);

  for (let d = 0; d < totalDrives; d++) {
    const quarter = Math.min(3, Math.floor((d / totalDrives) * 4));
    const homeCEdge = baseHomeCEdge + (homeScore > awayScore ? 1 : 0);
    const awayCEdge = baseAwayCEdge - (homeScore - awayScore >= 10 ? 1 : 0);

    // Home drive
    const hDrive = simulateDrive(
      adjustedHome,
      adjustedAway,
      homeCEdge,
      homeScore - awayScore,
      quarter + 1,
      homeLines,
      homePlayState,
      weather,
      context?.home?.clutchPlayerBonuses ?? {},
      context?.away?.clutchPlayerBonuses ?? {},
      playerMatchupEvents,
    );
    homeScore += hDrive.points;
    homeQtrScores[quarter]! += hDrive.points;
    homePlayState = hDrive.playType === homePlayState.lastPlayType
      ? { lastPlayType: hDrive.playType, streak: homePlayState.streak + 1 }
      : { lastPlayType: hDrive.playType, streak: 1 };

    // Away drive
    const aDrive = simulateDrive(
      adjustedAway,
      adjustedHome,
      awayCEdge,
      awayScore - homeScore,
      quarter + 1,
      awayLines,
      awayPlayState,
      weather,
      context?.away?.clutchPlayerBonuses ?? {},
      context?.home?.clutchPlayerBonuses ?? {},
      playerMatchupEvents,
    );
    awayScore += aDrive.points;
    awayQtrScores[quarter]! += aDrive.points;
    awayPlayState = aDrive.playType === awayPlayState.lastPlayType
      ? { lastPlayType: aDrive.playType, streak: awayPlayState.streak + 1 }
      : { lastPlayType: aDrive.playType, streak: 1 };
  }

  // Overtime if tied
  let overtime = false;
  if (homeScore === awayScore) {
    overtime = true;
    const otDrives = 2 + Math.floor(RNG.play() * 2);
    for (let d = 0; d < otDrives; d++) {
      const hOT = simulateDrive(
        adjustedHome,
        adjustedAway,
        baseHomeCEdge,
        0,
        5,
        homeLines,
        homePlayState,
        weather,
        context?.home?.clutchPlayerBonuses ?? {},
        context?.away?.clutchPlayerBonuses ?? {},
        playerMatchupEvents,
      );
      homeScore += hOT.points;
      homePlayState = hOT.playType === homePlayState.lastPlayType
        ? { lastPlayType: hOT.playType, streak: homePlayState.streak + 1 }
        : { lastPlayType: hOT.playType, streak: 1 };
      if (homeScore !== awayScore) break;

      const aOT = simulateDrive(
        adjustedAway,
        adjustedHome,
        baseAwayCEdge,
        0,
        5,
        awayLines,
        awayPlayState,
        weather,
        context?.away?.clutchPlayerBonuses ?? {},
        context?.home?.clutchPlayerBonuses ?? {},
        playerMatchupEvents,
      );
      awayScore += aOT.points;
      awayPlayState = aOT.playType === awayPlayState.lastPlayType
        ? { lastPlayType: aOT.playType, streak: awayPlayState.streak + 1 }
        : { lastPlayType: aOT.playType, streak: 1 };
      if (homeScore !== awayScore) break;
    }
    // Still tied? Coin flip FG
    if (homeScore === awayScore) {
      if (RNG.play() >= 0.5) homeScore += 3;
      else awayScore += 3;
    }
    // OT quarter scores
    homeQtrScores.push(homeScore - homeQtrScores.reduce((a, b) => a + b, 0));
    awayQtrScores.push(awayScore - awayQtrScores.reduce((a, b) => a + b, 0));
  }

  const specialTeams = simulateSpecialTeams(adjustedHome, adjustedAway, RNG.play);
  if (specialTeams.home.returnTouchdowns > 0) {
    const points = specialTeams.home.returnTouchdowns * 7;
    homeScore += points;
    homeQtrScores[homeQtrScores.length - 1] = (homeQtrScores[homeQtrScores.length - 1] ?? 0) + points;
  }
  if (specialTeams.away.returnTouchdowns > 0) {
    const points = specialTeams.away.returnTouchdowns * 7;
    awayScore += points;
    awayQtrScores[awayQtrScores.length - 1] = (awayQtrScores[awayQtrScores.length - 1] ?? 0) + points;
  }

  // Distribute defensive stats
  distributeDefensiveStats(adjustedHome, totalDrives, homeLines);
  distributeDefensiveStats(adjustedAway, totalDrives, awayLines);

  // Build stats
  const homeTeamLines = mergeTeamLines(home, homeLines, awayLines);
  const awayTeamLines = mergeTeamLines(away, awayLines, homeLines);

  const homeStats = buildTeamStats(
    homeTeamLines, home, homeScore,
    homeQtrScores as [number, number, number, number, ...number[]],
    totalDrives,
  );
  const awayStats = buildTeamStats(
    awayTeamLines, away, awayScore,
    awayQtrScores as [number, number, number, number, ...number[]],
    totalDrives,
  );

  // Find MVPs
  const homeMvpId = findMvp(homeTeamLines, home);
  const awayMvpId = findMvp(awayTeamLines, away);

  return {
    homeScore,
    awayScore,
    overtime,
    homeStats,
    awayStats,
    homeMvpId,
    awayMvpId,
    weather,
    matchupHighlight,
    specialTeams: {
      [home.id]: specialTeams.home,
      [away.id]: specialTeams.away,
    },
    playerMatchupEvents,
  };
}

function findMvp(lines: Map<string, PlayerGameLine>, team: Team): string | null {
  let bestId: string | null = null;
  let bestScore = -1;

  for (const p of team.roster) {
    const line = lines.get(p.id);
    if (!line) continue;
    // Score: passing yards + rushing yards*1.2 + receiving yards + TDs*30
    const score = (line.passYds ?? 0) + (line.rushYds ?? 0) * 1.2 + (line.recYds ?? 0)
      + ((line.passTD ?? 0) + (line.rushTD ?? 0) + (line.recTD ?? 0)) * 30
      + (line.sacks ?? 0) * 20 + (line.defINT ?? 0) * 40;
    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }
  return bestId;
}

// ── Apply player lines to season stats ──────────────────

export function applyPlayerLines(team: Team, lines: PlayerGameLine[]): void {
  const participants = new Set<string>();

  for (const line of lines) {
    const player = team.roster.find((p) => p.id === line.playerId);
    if (!player) continue;
    participants.add(player.id);
    player.stats.passYds += line.passYds ?? 0;
    player.stats.passTD += line.passTD ?? 0;
    player.stats.passINT += line.passINT ?? 0;
    player.stats.passAtt += line.passAtt ?? 0;
    player.stats.passComp += line.passComp ?? 0;
    player.stats.rushYds += line.rushYds ?? 0;
    player.stats.rushAtt += line.rushAtt ?? 0;
    player.stats.rushTD += line.rushTD ?? 0;
    player.stats.fumbles += line.fumbles ?? 0;
    player.stats.rec += line.rec ?? 0;
    player.stats.recYds += line.recYds ?? 0;
    player.stats.recTD += line.recTD ?? 0;
    player.stats.targets += line.targets ?? 0;
    player.stats.yacYds += Math.max(0, (line.recYds ?? 0) - (line.rec ?? 0) * 8);
    player.stats.sacks += line.sacks ?? 0;
    player.stats.defINT += line.defINT ?? 0;
    player.stats.tackles += line.tackles ?? 0;
    player.stats.fgMade += line.fgMade ?? 0;
    player.stats.fgAtt += line.fgAtt ?? 0;

    player.careerStats.passYds = (player.careerStats.passYds ?? 0) + (line.passYds ?? 0);
    player.careerStats.passTD = (player.careerStats.passTD ?? 0) + (line.passTD ?? 0);
    player.careerStats.passINT = (player.careerStats.passINT ?? 0) + (line.passINT ?? 0);
    player.careerStats.passAtt = (player.careerStats.passAtt ?? 0) + (line.passAtt ?? 0);
    player.careerStats.passComp = (player.careerStats.passComp ?? 0) + (line.passComp ?? 0);
    player.careerStats.rushYds = (player.careerStats.rushYds ?? 0) + (line.rushYds ?? 0);
    player.careerStats.rushAtt = (player.careerStats.rushAtt ?? 0) + (line.rushAtt ?? 0);
    player.careerStats.rushTD = (player.careerStats.rushTD ?? 0) + (line.rushTD ?? 0);
    player.careerStats.fumbles = (player.careerStats.fumbles ?? 0) + (line.fumbles ?? 0);
    player.careerStats.rec = (player.careerStats.rec ?? 0) + (line.rec ?? 0);
    player.careerStats.recYds = (player.careerStats.recYds ?? 0) + (line.recYds ?? 0);
    player.careerStats.recTD = (player.careerStats.recTD ?? 0) + (line.recTD ?? 0);
    player.careerStats.targets = (player.careerStats.targets ?? 0) + (line.targets ?? 0);
    player.careerStats.sacks = (player.careerStats.sacks ?? 0) + (line.sacks ?? 0);
    player.careerStats.defINT = (player.careerStats.defINT ?? 0) + (line.defINT ?? 0);
    player.careerStats.tackles = (player.careerStats.tackles ?? 0) + (line.tackles ?? 0);
    player.careerStats.fgMade = (player.careerStats.fgMade ?? 0) + (line.fgMade ?? 0);
    player.careerStats.fgAtt = (player.careerStats.fgAtt ?? 0) + (line.fgAtt ?? 0);
  }

  for (const player of team.roster) {
    if (isPlayerUnavailable(player)) continue;
    if (player.isStarter || participants.has(player.id)) {
      player.careerStats.gp = (player.careerStats.gp ?? 0) + 1;
      player.stats.gamesPlayed += 1;
    }
  }
}
