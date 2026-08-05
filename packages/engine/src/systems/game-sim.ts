/**
 * Drive-by-drive game simulation engine.
 *
 * Inspired by the legacy monolith's simGame()/drive() (~830 lines).
 * Produces realistic per-player box scores, quarter-by-quarter scoring,
 * and play-level stat accumulation.
 */
import { HOME_FIELD_ADV } from '../config';
import { avg, cl, playerDisplayName } from '../utils';
import { getGameAvailability } from './injury-system';
import { applyGamePlan } from './game-plan';
import { applyContingency, evaluateContingencies, getContingencyCallout } from './contingency-plans';
import { determineSituation, selectOffensivePlay, selectDefensivePlay, playMatchupQuality } from './playbook';
import { simulateSpecialTeams } from './special-teams';
import { getCoachTraitMods } from './coach-trait-mods';
import {
  canCallTrickPlays,
  executeTrickPlay,
  getAvailableTrickPlays,
  shouldCallTrickPlay,
} from './trick-plays';
import { ensurePlayerStatBuckets } from './season-stats';
import { simulateSnapShadow, type ShadowGameResult, type ShadowTeamInput } from './snap-shadow';
import { deriveSnapTeamBoxScore } from './snap-stats';
import type { ContingencyCheckContext } from './contingency-plans';
import type {
  GamePlan,
  HalftimeDecisionModifier,
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
import type { SimGameContext, SimTeamContext } from './game-sim-types';
import type { SimulationContext } from './game-sim-types';
import type { PrngFn } from '../rng';

// Re-export for backward compatibility. Types now live in game-sim-types.ts
// (Sprint 40 — breaks game-plan ↔ game-sim circular dep).
export type { SimGameContext, SimTeamContext, SimulationContext, SimulationRngContext } from './game-sim-types';

// ── Helpers ─────────────────────────────────────────────

function starters(roster: Player[], pos: Position): Player[] {
  return roster
    .filter((p) => p.pos === pos && p.isStarter && getGameAvailability(p) !== 'out')
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
    .filter((p) => p.pos === pos && getGameAvailability(p) !== 'out')
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
  const group = roster.filter((p) => p.pos === pos && getGameAvailability(p) !== 'out');
  return group.length > 0 ? avg(group.map((p) => p.ovr + situationalBonus(p, bonuses, quarter, scoreDiff))) : 60;
}

// ── Drive result ────────────────────────────────────────

interface DriveResult {
  points: number;
  type: 'td_pass' | 'td_rush' | 'fg' | 'punt' | 'turnover' | 'stall';
  yards: number;
  playType: 'run' | 'pass';
  trickPlay?: {
    playId: string;
    playName: string;
    success: boolean;
    turnover: boolean;
    touchdown: boolean;
    commentary: string;
  };
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
const PLAN_RUN_RATE_ADJUSTMENT: Record<NonNullable<GamePlan['offensiveScheme']>, number> = {
  balanced: 0,
  pass_heavy: -0.14,
  run_heavy: 0.14,
  spread: -0.08,
  power: 0.1,
};
const PLAYBOOK_ALIGNMENT_RUN_RATE = 0.12;
const DOME_WIND_SPEED = 0;
const CLEAR_WIND_SPEED = 8;
const RAIN_WIND_SPEED = 12;
const SNOW_WIND_SPEED = 14;
const WINDY_WIND_SPEED = 20;

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

function deriveWindSpeed(weather: WeatherCondition): number {
  if (weather === 'dome') return DOME_WIND_SPEED;
  if (weather === 'rain') return RAIN_WIND_SPEED;
  if (weather === 'snow') return SNOW_WIND_SPEED;
  if (weather === 'wind') return WINDY_WIND_SPEED;
  return CLEAR_WIND_SPEED;
}

// ── Coaching edge calculation ───────────────────────────

function coachingEdge(team: Team, opponent: Team): number {
  const hcRating = team.staff?.hc?.ratings?.gameplan ?? 70;
  const oppHcRating = opponent.staff?.hc?.ratings?.gameplan ?? 70;
  return (hcRating - oppHcRating) * 0.03;
}

function topReceivingThreat(team: Team): Player | null {
  return team.roster
    .filter((player) => (player.pos === 'WR' || player.pos === 'TE') && getGameAvailability(player) !== 'out')
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
  offenseGamePlan: GamePlan | null | undefined,
  defenseGamePlan: GamePlan | null | undefined,
  offenseClutchBonuses: Record<string, number>,
  defenseClutchBonuses: Record<string, number>,
  clutchSwing: number,
  matchupEvents: PlayerMatchupEvent[],
  usedTrickPlayIds: Set<string>,
  isPlayoff: boolean,
  playRng: PrngFn,
): DriveResult {
  const qb = bestAvailable(offense.roster, 'QB', offenseClutchBonuses, quarter, scoreDiff);
  const rb = bestAvailable(offense.roster, 'RB', offenseClutchBonuses, quarter, scoreDiff);
  const receivers = offense.roster
    .filter((p) => (p.pos === 'WR' || p.pos === 'TE') && getGameAvailability(p) !== 'out')
    .sort((a, b) =>
      Number(b.isStarter) - Number(a.isStarter)
      || (b.ovr + situationalBonus(b, offenseClutchBonuses, quarter, scoreDiff)) - (a.ovr + situationalBonus(a, offenseClutchBonuses, quarter, scoreDiff))
      || a.id.localeCompare(b.id))
    .slice(0, 4);
  const kicker = bestAvailable(offense.roster, 'K', offenseClutchBonuses, quarter, scoreDiff);

  // A selected trick play is a scarce tendency: each id may fire at most once
  // per team per game. Outcome and call timing consume only the seeded play RNG.
  const availableTricks = canCallTrickPlays(offense)
    ? getAvailableTrickPlays(offense)
    : [];
  const plannedTrick = (offenseGamePlan?.trickPlays ?? [])
    .map((playId) => availableTricks.find((play) => play.id === playId))
    .find((play) => play !== undefined && !usedTrickPlayIds.has(play.id));
  if (plannedTrick && shouldCallTrickPlay(playRng, quarter, scoreDiff, isPlayoff)) {
    usedTrickPlayIds.add(plannedTrick.id);
    const playType = plannedTrick.involvedPositions.includes('QB') && plannedTrick.involvedPositions.includes('WR')
      ? 'pass'
      : 'run';
    const target = receivers[0] ?? null;
    const outcome = executeTrickPlay(
      playRng,
      plannedTrick,
      offense.staff.hc?.ratings.gameplan ?? 60,
      qb?.name,
      target?.name,
      rb?.name,
    );

    if (playType === 'pass' && qb) {
      const qbLine = ensureLine(lines, qb);
      qbLine.passAtt = (qbLine.passAtt ?? 0) + 1;
      qbLine.passComp = (qbLine.passComp ?? 0) + (outcome.success ? 1 : 0);
      qbLine.passYds = (qbLine.passYds ?? 0) + outcome.yards;
      qbLine.passTD = (qbLine.passTD ?? 0) + (outcome.touchdown ? 1 : 0);
      if (target) {
        const targetLine = ensureLine(lines, target);
        targetLine.targets = (targetLine.targets ?? 0) + 1;
        targetLine.rec = (targetLine.rec ?? 0) + (outcome.success ? 1 : 0);
        targetLine.recYds = (targetLine.recYds ?? 0) + outcome.yards;
        targetLine.recTD = (targetLine.recTD ?? 0) + (outcome.touchdown ? 1 : 0);
      }
    } else if (rb) {
      const rbLine = ensureLine(lines, rb);
      rbLine.rushAtt = (rbLine.rushAtt ?? 0) + 1;
      rbLine.rushYds = (rbLine.rushYds ?? 0) + outcome.yards;
      rbLine.rushTD = (rbLine.rushTD ?? 0) + (outcome.touchdown ? 1 : 0);
    }

    return {
      points: outcome.touchdown ? 7 : 0,
      type: outcome.fumble ? 'turnover' : outcome.touchdown ? (playType === 'pass' ? 'td_pass' : 'td_rush') : 'stall',
      yards: outcome.yards,
      playType,
      trickPlay: {
        playId: plannedTrick.id,
        playName: plannedTrick.name,
        success: outcome.success,
        turnover: outcome.fumble,
        touchdown: outcome.touchdown,
        commentary: outcome.commentary,
      },
    };
  }

  const olOvr = posAvg(offense.roster, 'OL', offenseClutchBonuses, quarter, scoreDiff);
  const dlOvr = posAvg(defense.roster, 'DL', defenseClutchBonuses, quarter, scoreDiff);
  const lbOvr = posAvg(defense.roster, 'LB', defenseClutchBonuses, quarter, scoreDiff);
  const sOvr = posAvg(defense.roster, 'S', defenseClutchBonuses, quarter, scoreDiff);
  const bestCb = bestAvailable(defense.roster, 'CB', defenseClutchBonuses, quarter, scoreDiff);
  const weatherFx = weatherEffects(weather);

  // Sprint 45 "The Family Tree" — coach-trait-mods were dormant before this
  // sprint. Offense gets pocket + stall + qb boosts; defense contributes
  // pocket pressure that suppresses the passing game.
  const offenseTraitMods = getCoachTraitMods(offense);
  const defenseTraitMods = getCoachTraitMods(defense);
  const pocket = (olOvr - dlOvr) * 0.15
    + offenseTraitMods.pocketBoost
    - defenseTraitMods.pressureBoost;
  const runLanes = (olOvr - (dlOvr + lbOvr) / 2) * 0.12;

  // Playbook-driven play selection
  const situation = determineSituation(quarter, scoreDiff, false, 10, quarter === 4 ? 90 : 600);
  const offPlan = offenseGamePlan?.offensiveScheme ?? 'balanced';
  const defPlan = defenseGamePlan?.defensiveScheme ?? 'base';
  const selectedPlay = selectOffensivePlay(playRng, situation, 'balanced', offPlan);
  const selectedDefPlay = selectDefensivePlay(playRng, situation, defPlan);
  const matchupMod = playMatchupQuality(selectedPlay, selectedDefPlay);

  // Run/pass split — playbook play category influences the decision
  let runRate = 0.46 + runLanes * 0.02;
  runRate += PLAN_RUN_RATE_ADJUSTMENT[offPlan] ?? 0;
  runRate += selectedPlay.category === 'run' ? PLAYBOOK_ALIGNMENT_RUN_RATE : -PLAYBOOK_ALIGNMENT_RUN_RATE;
  if (scoreDiff <= -14) runRate -= 0.10;
  if (scoreDiff >= 14) runRate += 0.08;
  if (quarter === 4 && scoreDiff <= -7) runRate -= 0.06;
  runRate = cl(runRate, 0.28, 0.65);

  const playType = playRng() < runRate ? 'run' : 'pass';
  const isRun = playType === 'run';
  const tendencyPenalty = playCallState.lastPlayType === playType && playCallState.streak >= 2
    ? PASS_TENDENCY_PENALTY
    : 0;

  const stallChance = isRun
    ? cl(BASE_RUN_STALL_CHANCE - cEdge * 0.002 - runLanes * 0.008 + tendencyPenalty * 0.008 - offenseTraitMods.stallReduction, 0.08, 0.32)
    : cl(BASE_PASS_STALL_CHANCE - cEdge * 0.002 - pocket * 0.008 + tendencyPenalty * 0.008 - offenseTraitMods.stallReduction, 0.08, 0.35);
  if (playRng() < stallChance) {
    if (!isRun && qb) {
      const ql = ensureLine(lines, qb);
      const completions = (playRng() < 0.6 ? 1 : 0) + (playRng() < 0.15 ? 1 : 0);
      const attempts = completions + 1 + (playRng() < 0.45 ? 1 : 0);
      const stallYards = Math.round(4 + playRng() * 12);
      ql.passAtt = (ql.passAtt ?? 0) + attempts;
      ql.passComp = (ql.passComp ?? 0) + completions;
      ql.passYds = (ql.passYds ?? 0) + stallYards;
      if (receivers.length > 0 && completions > 0) {
        const target = receivers[Math.floor(playRng() * receivers.length)] ?? receivers[0]!;
        const rl = ensureLine(lines, target);
        rl.targets = (rl.targets ?? 0) + completions;
        rl.rec = (rl.rec ?? 0) + completions;
        rl.recYds = (rl.recYds ?? 0) + stallYards;
      }
      return { points: 0, type: 'punt', yards: stallYards, playType };
    }

    if (rb) {
      const rbl = ensureLine(lines, rb);
      const stallYards = Math.round(3 + playRng() * 9);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(2 + playRng() * 2);
      rbl.rushYds = (rbl.rushYds ?? 0) + stallYards;
      return { points: 0, type: 'punt', yards: stallYards, playType };
    }

    return { points: 0, type: 'stall', yards: Math.round(playRng() * 6), playType };
  }

  // ── PASSING PLAY ──────────────────────────────────────
  if (!isRun && qb && receivers.length > 0) {
    const targetWeights = [0.40, 0.28, 0.20, 0.12];
    let targetIdx = 0;
    const tRoll = playRng();
    let cumulative = 0;
    for (let i = 0; i < receivers.length; i++) {
      cumulative += targetWeights[i] ?? 0.1;
      if (tRoll < cumulative) { targetIdx = i; break; }
    }
    const target = receivers[targetIdx] ?? receivers[0]!;

    const qbLateBonus = situationalBonus(qb, offenseClutchBonuses, quarter, scoreDiff);
    const targetLateBonus = situationalBonus(target, offenseClutchBonuses, quarter, scoreDiff);
    const cbLateBonus = situationalBonus(bestCb, defenseClutchBonuses, quarter, scoreDiff);
    // Sprint 45 — QB_WHISPERER + related traits add a small OVR nudge via
    // a local bonus; we never mutate the stored player.ovr (engine rule).
    const qbTraitBoost = offenseTraitMods.qbBoost;
    const qbOvr = qb.ovr + qbLateBonus + qbTraitBoost;
    const qbAcc = (qb.ratings.accuracy ?? qb.ovr) + qbLateBonus + qbTraitBoost;
    const qbAware = (qb.ratings.awareness ?? qb.ovr) + qbLateBonus + qbTraitBoost;
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
        quality += 6 * (clutchSwing / 0.5);
      } else if (qb.traits.includes('streaky')) {
        quality += (playRng() < 0.5 ? 4 : -4) * (clutchSwing / 0.5);
      } else if (qb.personality.pressure < 4) {
        quality -= 3 * (clutchSwing / 0.5);
      }
    }

    // Pressure/sack check
    const pressureChance = cl(BASE_PRESSURE_CHANCE + (dlOvr - olOvr) * PRESSURE_GAP_MULTIPLIER + tendencyPenalty * 0.01, 0.08, 0.38);
    if (playRng() < pressureChance) {
      const isSack = playRng() < 0.62;
      if (isSack) {
        const sackYards = -(5 + Math.round(playRng() * 7));
        // Credit sack to a defensive player
        const sackers = defense.roster
          .filter((p) => (p.pos === 'DL' || p.pos === 'LB') && getGameAvailability(p) !== 'out')
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
        if (playRng() < cl(STRIP_SACK_CHANCE + weatherFx.fumbleChance, 0.18, 0.55)) {
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
    if (playRng() < intChance) {
      const ql = ensureLine(lines, qb);
      ql.passAtt = (ql.passAtt ?? 0) + 1;
      ql.passINT = (ql.passINT ?? 0) + 1;
      // Credit INT to a DB
      const dbs = defense.roster
        .filter((p) => (p.pos === 'CB' || p.pos === 'S') && getGameAvailability(p) !== 'out')
        .sort((a, b) => b.ovr - a.ovr);
      const interceptor = dbs[Math.floor(playRng() * Math.min(3, dbs.length))];
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
    const roll = playRng() * 100 + quality;
    const isRedZone = playRng() < 0.28;
    const redZonePassAdvantage = isRedZone && (((target.ovr + (topReceivingThreat(offense)?.ovr ?? target.ovr)) / 2) - (((bestCb?.ovr ?? 68) + sOvr) / 2)) >= 4
      ? 6
      : 0;
    const tdThreshold = isRedZone ? 68 - redZonePassAdvantage : 76;
    const fgThreshold = isRedZone ? 52 : 60;
    const ql = ensureLine(lines, qb);
    const rl = ensureLine(lines, target);

    if (roll > tdThreshold) {
      // TOUCHDOWN PASS
      const passYds = Math.round(18 + playRng() * 32);
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
      const driveYds = Math.round(25 + playRng() * 20);
      // Completions on the drive
      const compCount = 2 + Math.round(playRng());
      ql.passAtt = (ql.passAtt ?? 0) + compCount + (playRng() < 0.35 ? 1 : 0);
      ql.passComp = (ql.passComp ?? 0) + compCount;
      ql.passYds = (ql.passYds ?? 0) + driveYds;
      rl.targets = (rl.targets ?? 0) + Math.round(1 + playRng() * 2);
      rl.rec = (rl.rec ?? 0) + Math.max(1, compCount - 1);
      rl.recYds = (rl.recYds ?? 0) + Math.round(driveYds * 0.4);
      // Also give some to RB check-downs
      if (rb) {
        const rbl = ensureLine(lines, rb);
        rbl.targets = (rbl.targets ?? 0) + 1;
        const rbCatch = playRng() < 0.6 ? 1 : 0;
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
        if (playRng() < makeChance) {
          kl.fgMade = (kl.fgMade ?? 0) + 1;
          return { points: 3, type: 'fg', yards: driveYds, playType };
        }
      } else if (playRng() < makeChance) {
        return { points: 3, type: 'fg', yards: driveYds, playType };
      }
      return { points: 0, type: 'punt', yards: driveYds, playType };
    }

    // Incomplete / stalled drive — still accumulate some yards
    const stallYds = Math.round(5 + playRng() * 15);
    const compOnDrive = 1 + (playRng() < 0.35 ? 1 : 0);
    ql.passAtt = (ql.passAtt ?? 0) + compOnDrive + 1;
    ql.passComp = (ql.passComp ?? 0) + compOnDrive;
    ql.passYds = (ql.passYds ?? 0) + stallYds;
    rl.targets = (rl.targets ?? 0) + 1;
    const catchMade = compOnDrive > 0 && playRng() < 0.8 ? 1 : 0;
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
        quality2 += 2 * (clutchSwing / 0.5);
      } else if (qb?.traits.includes('streaky')) {
        quality2 += (playRng() < 0.5 ? 1 : -1) * (clutchSwing / 0.5);
      } else if ((qb?.personality.pressure ?? 5) < 4) {
        quality2 -= 1 * (clutchSwing / 0.5);
      }
    }

    // Big play chance
    const bigPlayChance = cl(0.02 + (rbSpeed > 85 && rbElusive > 80 ? 0.05 : 0), 0.005, 0.10);
    if (playRng() < bigPlayChance) quality2 += 20;

    // Fumble check
    const fumbleChance = cl(
      BASE_FUMBLE_CHANCE + weatherFx.fumbleChance + (lbOvr - rbOvr) * 0.0014 + tendencyPenalty * 0.002,
      0.015,
      0.12,
    );
    if (playRng() < fumbleChance) {
      const rbl = ensureLine(lines, rb);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + 1;
      rbl.fumbles = (rbl.fumbles ?? 0) + 1;
      // Credit tackle to LB
      const lbs = defense.roster.filter((p) => p.pos === 'LB' && getGameAvailability(p) !== 'out').sort((a, b) => b.ovr - a.ovr);
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

    const roll2 = playRng() * 100 + quality2;
    const isRedZone = playRng() < 0.22;
    const redZoneRunAdvantage = isRedZone && (((rb.ovr + olOvr) / 2) - ((dlOvr + lbOvr) / 2)) >= 4 ? 4 : 0;
    const tdThreshold = isRedZone ? 74 - redZoneRunAdvantage : 82;
    const fgThreshold = isRedZone ? 58 : 66;

    const rbl = ensureLine(lines, rb);

    if (roll2 > tdThreshold) {
      // RUSHING TD
      const rushYds = Math.round(11 + playRng() * 25);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(3 + playRng() * 5);
      rbl.rushYds = (rbl.rushYds ?? 0) + rushYds;
      rbl.rushTD = (rbl.rushTD ?? 0) + 1;
      // Add some passing yards for the drive too
      if (qb) {
        const ql = ensureLine(lines, qb);
        const drivePassYds = Math.round(5 + playRng() * 15);
        const passAttempts = 1 + Math.round(playRng());
        const completions = passAttempts === 2 && playRng() < 0.35 ? 2 : 1;
        ql.passAtt = (ql.passAtt ?? 0) + passAttempts;
        ql.passComp = (ql.passComp ?? 0) + completions;
        ql.passYds = (ql.passYds ?? 0) + drivePassYds;
      }
      return { points: 7, type: 'td_rush', yards: rushYds, playType };
    }

    if (roll2 > fgThreshold && kicker) {
      const driveYds = Math.round(20 + playRng() * 25);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(3 + playRng() * 4);
      rbl.rushYds = (rbl.rushYds ?? 0) + Math.round(driveYds * 0.55);
      // Pass on the drive too
      if (qb && receivers.length > 0) {
        const ql = ensureLine(lines, qb);
        const drivePassYds = Math.round(driveYds * 0.35);
        const passAttempts = 1 + Math.round(playRng());
        const completions = passAttempts === 2 && playRng() < 0.45 ? 2 : 1;
        ql.passAtt = (ql.passAtt ?? 0) + passAttempts;
        ql.passComp = (ql.passComp ?? 0) + completions;
        ql.passYds = (ql.passYds ?? 0) + drivePassYds;
        const rec = receivers[Math.floor(playRng() * receivers.length)]!;
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
      if (playRng() < makeChance) {
        kl.fgMade = (kl.fgMade ?? 0) + 1;
        return { points: 3, type: 'fg', yards: driveYds, playType };
      }
      return { points: 0, type: 'punt', yards: driveYds, playType };
    }

    // Stalled run drive
    const stallYds = Math.round(5 + playRng() * 18);
    rbl.rushAtt = (rbl.rushAtt ?? 0) + Math.round(2 + playRng() * 3);
    rbl.rushYds = (rbl.rushYds ?? 0) + stallYds;
    return { points: 0, type: 'punt', yards: stallYds, playType };
  }

  // Fallback: no QB and no RB
  return { points: 0, type: 'stall', yards: Math.round(playRng() * 6), playType };
}

// ── Player line helper ──────────────────────────────────

function ensureLine(lines: Map<string, PlayerGameLine>, player: Player): PlayerGameLine {
  let line = lines.get(player.id);
  if (!line) {
    line = { playerId: player.id, name: playerDisplayName(player), pos: player.pos };
    lines.set(player.id, line);
  }
  return line;
}

// ── Defensive stat distribution ─────────────────────────

function distributeDefensiveStats(
  defense: Team,
  opponentDrives: number,
  lines: Map<string, PlayerGameLine>,
  playRng: PrngFn,
): void {
  const defStarters = defense.roster.filter((p) =>
    (p.pos === 'DL' || p.pos === 'LB' || p.pos === 'CB' || p.pos === 'S') && getGameAvailability(p) !== 'out',
  );

  for (const player of defStarters) {
    const dl = ensureLine(lines, player);
    // Base tackles based on position
    const baseTackles = player.pos === 'LB' ? 4 : player.pos === 'DL' ? 2 : 2;
    dl.tackles = (dl.tackles ?? 0) + baseTackles + Math.round(playRng() * (player.pos === 'LB' ? 5 : 3));

    // Additional sack chances for DL/LB (if they didn't already get one in-drive)
    if (player.pos === 'DL' && playRng() < 0.12) {
      dl.sacks = (dl.sacks ?? 0) + 1;
    } else if (player.pos === 'LB' && playRng() < 0.06) {
      dl.sacks = (dl.sacks ?? 0) + 1;
    }

    // Additional INT chances for DBs
    if (player.pos === 'CB' && playRng() < 0.03) {
      dl.defINT = (dl.defINT ?? 0) + 1;
    } else if (player.pos === 'S' && playRng() < 0.025) {
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
  playRng: PrngFn,
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
  const thirdDownAttempts = cl(Math.round(9 + score / 4 + playRng() * 4), 8, 18);
  const thirdDownConversions = cl(Math.round(thirdDownAttempts * (0.34 + score / 100)), 1, thirdDownAttempts);
  const timeOfPossession = cl(Math.round(28 + (score - 21) / 2 + (playRng() - 0.5) * 8), 22, 38);
  const penalties = Math.round(3 + playRng() * 7);
  const penaltyYards = Math.round(penalties * (5 + playRng() * 8));
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
  contingencyActivations: Array<{
    teamId: string;
    ruleId: string;
    label: string;
    triggerLabel?: string;
    responseLabel?: string;
    quarter: number;
    callout?: string | null;
  }>;
  /** Parallel snap output; canonical callers derive their returned score and stats from it. */
  shadow?: ShadowGameResult;
}

function emptySpecialTeamsSummary(): SpecialTeamsGameSummary {
  return {
    kickReturnYards: 0,
    puntReturnYards: 0,
    returnTouchdowns: 0,
    returnFumbles: 0,
    touchbacks: 0,
    netPuntAverage: 0,
    highlights: [],
  };
}

function snapRunRate(teamContext: SimTeamContext | undefined): number {
  return cl(0.58 + (teamContext?.gamePlan ? PLAN_RUN_RATE_ADJUSTMENT[teamContext.gamePlan.offensiveScheme] : 0), 0.25, 0.72);
}

function halftimeRunRateDelta(modifier: HalftimeDecisionModifier | null | undefined): number {
  if (!modifier) return 0;
  if (modifier.direction === 'more_pass' || modifier.direction === 'more_aggressive') return -0.12;
  if (modifier.direction === 'more_run' || modifier.direction === 'slow_down') return 0.12;
  return 0;
}

function buildSnapTeamInput(team: Team, teamContext: SimTeamContext | undefined): ShadowTeamInput {
  return {
    id: team.id,
    overall: avg(team.roster.filter((player) => getGameAvailability(player) !== 'out').map((player) => player.ovr)) || 60,
    runRate: snapRunRate(teamContext),
    secondHalfRunRateDelta: halftimeRunRateDelta(teamContext?.halftimeModifier),
    trickPlayIds: teamContext?.gamePlan?.trickPlays,
    contingencyRules: teamContext?.gamePlan?.contingencyRules,
    coachMode: teamContext?.coachMode,
    twoMinuteMode: teamContext?.twoMinuteMode,
  };
}

function applyHalftimeGamePlan(
  gamePlan: GamePlan | null | undefined,
  modifier: HalftimeDecisionModifier | null | undefined,
  quarter: number,
): GamePlan | null | undefined {
  if (!gamePlan || !modifier || quarter < 3 || quarter > 4) return gamePlan;

  if (modifier.direction === 'more_pass') {
    return {
      ...gamePlan,
      offensiveScheme: gamePlan.offensiveScheme === 'spread' ? 'spread' : 'pass_heavy',
    };
  }

  if (modifier.direction === 'more_run') {
    return {
      ...gamePlan,
      offensiveScheme: gamePlan.offensiveScheme === 'power' ? 'power' : 'run_heavy',
    };
  }

  if (modifier.direction === 'more_aggressive') {
    return {
      ...gamePlan,
      offensiveScheme: 'pass_heavy',
      defensiveScheme: 'aggressive',
    };
  }

  return {
    ...gamePlan,
    offensiveScheme: 'power',
    defensiveScheme: 'coverage',
  };
}

function resolveHalftimeDriveDelta(
  modifier: HalftimeDecisionModifier | null | undefined,
  quarter: number,
  drivesSinceHalftime: number,
): number {
  if (!modifier || quarter < 3 || quarter > 4) return 0;

  if (modifier.choice === 'switch') {
    return drivesSinceHalftime === 0
      ? modifier.firstDriveDelta
      : modifier.sustainedBonus;
  }

  if (modifier.choice === 'gamble') {
    return drivesSinceHalftime === 0
      ? modifier.gambleDriveDelta
      : modifier.gambleOtherDriveDelta;
  }

  return 0;
}

function applySimContext(
  team: Team,
  context?: SimTeamContext,
  runtime?: {
    quarter: number;
    drivesSinceHalftime: number;
  },
): Team {
  if (!context) return team;
  const activeGamePlan = applyHalftimeGamePlan(
    context.gamePlan,
    context.halftimeModifier,
    runtime?.quarter ?? 1,
  );
  const teamOvrBonus = (context.teamOvrBonus ?? 0) + resolveHalftimeDriveDelta(
    context.halftimeModifier,
    runtime?.quarter ?? 1,
    runtime?.drivesSinceHalftime ?? 0,
  );
  const basePlayerBonuses = context.playerOvrBonuses ?? {};
  const gamePlanBonuses = activeGamePlan && context.opponentReport
    ? applyGamePlan(activeGamePlan, context.opponentReport, team).playerOvrBonuses ?? {}
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

function buildContingencyContext(params: {
  quarter: number;
  teamScore: number;
  opponentScore: number;
  turnovers: number;
  opponentTurnovers: number;
  opponentScoredOnOpening: boolean;
  windSpeed: number;
  lateGameWindow?: boolean;
}): ContingencyCheckContext {
  return {
    quarter: params.quarter,
    scoreDiff: params.teamScore - params.opponentScore,
    turnovers: params.turnovers,
    opponentTurnovers: params.opponentTurnovers,
    opponentScoredOnOpening: params.opponentScoredOnOpening,
    windSpeed: params.windSpeed,
    lateGameWindow: params.lateGameWindow,
  };
}

export function createSimulationContext(
  context: SimGameContext = {},
  rng: SimulationContext['rng'],
): SimulationContext {
  return { ...context, rng };
}

/** Explicit deterministic facade retained for callers that prefer the short name. */
export function simGame(home: Team, away: Team, context: SimulationContext): SimGameResult {
  return simGameWithContext(home, away, context);
}

export function simGameWithContext(home: Team, away: Team, context: SimulationContext): SimGameResult {
  const playRng = context.rng.play;
  const eventRng = context.rng.event;
  const weather = context?.weather ?? 'dome';
  const windSpeed = deriveWindSpeed(weather);
  const rivalryBoost = context?.rivalryIntensity ? Math.min(2, Math.round(context.rivalryIntensity / 35)) : 0;
  let activeHomePlan = context?.home?.gamePlan ?? null;
  let activeAwayPlan = context?.away?.gamePlan ?? null;
  let adjustedHome = applySimContext(home, context?.home ? { ...context.home, gamePlan: activeHomePlan } : undefined);
  let adjustedAway = applySimContext(away, context?.away ? { ...context.away, gamePlan: activeAwayPlan } : undefined);
  const contingencyActivations: Array<{
    teamId: string;
    ruleId: string;
    label: string;
    triggerLabel?: string;
    responseLabel?: string;
    quarter: number;
    callout?: string | null;
  }> = [];
  const homeFiredRules = new Set<string>();
  const awayFiredRules = new Set<string>();
  let lateGameWindowEvaluated = false;
  let matchupHighlight = buildMatchupHighlight(adjustedHome, adjustedAway)
    ?? buildMatchupHighlight(adjustedAway, adjustedHome);

  if (context.snapMode === 'canonical') {
    if (context.shadowSeed === undefined) throw new Error('Canonical snap simulation requires an explicit snap seed.');
    const canonicalSnap = simulateSnapShadow(
      context.gameId ?? `snap-${home.id}-${away.id}`,
      { ...buildSnapTeamInput(adjustedHome, context.home), windSpeed },
      { ...buildSnapTeamInput(adjustedAway, context.away), windSpeed },
      context.shadowSeed,
    );
    const canonicalHome = deriveSnapTeamBoxScore(canonicalSnap.snapEvents, home);
    const canonicalAway = deriveSnapTeamBoxScore(canonicalSnap.snapEvents, away);
    const canonicalContingencies: typeof contingencyActivations = [];
    const seenCanonicalContingencies = new Set<string>();
    for (const event of canonicalSnap.snapEvents) {
      for (const decisionRef of event.decisionRefs ?? []) {
        if (decisionRef.startsWith('trick:')) {
          const key = `${event.offenseTeamId}:${decisionRef}`;
          if (seenCanonicalContingencies.has(key)) continue;
          seenCanonicalContingencies.add(key);
          canonicalContingencies.push({
            teamId: event.offenseTeamId,
            ruleId: decisionRef,
            label: decisionRef.slice('trick:'.length),
            triggerLabel: `SNAP|down=${event.before.down}|distance=${event.before.distance}|clock=${event.before.clockSeconds}`,
            responseLabel: event.turnover ? 'TURNOVER' : event.points > 0 ? `${event.points} POINTS` : `${event.yards} YARDS`,
            quarter: event.before.quarter,
            callout: event.description,
          });
          continue;
        }
        if (decisionRef.startsWith('coach-mode:')) {
          const parts = decisionRef.split(':');
          const teamId = parts[1];
          const call = parts[2];
          if (!teamId || !call) continue;
          const key = `${teamId}:${call}`;
          if (seenCanonicalContingencies.has(key)) continue;
          seenCanonicalContingencies.add(key);
          canonicalContingencies.push({
            teamId,
            ruleId: decisionRef,
            label: call === 'two-minute' ? 'Coach Mode two-minute script' : 'Coach Mode fourth-down call',
            triggerLabel: `COACH MODE|SNAP|down=${event.before.down}|distance=${event.before.distance}|clock=${event.before.clockSeconds}`,
            responseLabel: call === 'two-minute' ? 'TEMPO ATTACK' : event.playType.replaceAll('_', ' ').toUpperCase(),
            quarter: event.before.quarter,
            callout: event.description,
          });
          continue;
        }
        if (!decisionRef.startsWith('contingency:')) continue;
        const encoded = decisionRef.slice('contingency:'.length);
        const separator = encoded.indexOf(':');
        if (separator < 1) continue;
        const teamId = encoded.slice(0, separator);
        const ruleId = encoded.slice(separator + 1);
        const key = `${teamId}:${ruleId}`;
        if (seenCanonicalContingencies.has(key)) continue;
        const plan = teamId === home.id ? activeHomePlan : teamId === away.id ? activeAwayPlan : null;
        const team = teamId === home.id ? adjustedHome : teamId === away.id ? adjustedAway : null;
        const rule = plan?.contingencyRules?.find((candidate) => candidate.id === ruleId);
        if (!rule || !team) continue;
        seenCanonicalContingencies.add(key);
        const adjustments = applyContingency(rule);
        canonicalContingencies.push({
          teamId,
          ruleId,
          label: rule.label,
          triggerLabel: `${rule.label}|SNAP|down=${event.before.down}|distance=${event.before.distance}|clock=${event.before.clockSeconds}`,
          responseLabel: adjustments.responseLabel,
          quarter: event.before.quarter,
          callout: getContingencyCallout(rule, team.name, eventRng),
        });
      }
    }
    return {
      homeScore: canonicalSnap.homeScore,
      awayScore: canonicalSnap.awayScore,
      overtime: canonicalSnap.snapEvents.some((event) => event.before.quarter > 4),
      homeStats: canonicalHome.stats,
      awayStats: canonicalAway.stats,
      homeMvpId: canonicalHome.mvpPlayerId,
      awayMvpId: canonicalAway.mvpPlayerId,
      weather,
      matchupHighlight,
      specialTeams: { [home.id]: emptySpecialTeamsSummary(), [away.id]: emptySpecialTeamsSummary() },
      playerMatchupEvents: [],
      contingencyActivations: canonicalContingencies,
      shadow: canonicalSnap,
    };
  }
  const homeLines = new Map<string, PlayerGameLine>();
  const awayLines = new Map<string, PlayerGameLine>();
  const playerMatchupEvents: PlayerMatchupEvent[] = [];

  const baseHomeCEdge = coachingEdge(adjustedHome, adjustedAway) + (HOME_FIELD_ADV + (context?.homeFieldBonus ?? 0)) / 3 + rivalryBoost;
  const baseAwayCEdge = coachingEdge(adjustedAway, adjustedHome);

  let homeScore = 0;
  let awayScore = 0;
  const homeQtrScores: number[] = [0, 0, 0, 0];
  const awayQtrScores: number[] = [0, 0, 0, 0];
  let homeTurnovers = 0;
  let awayTurnovers = 0;
  let homeOpeningTouchdown = false;
  let awayOpeningTouchdown = false;
  let homeOpeningDriveComplete = false;
  let awayOpeningDriveComplete = false;
  let homeSecondHalfDrives = 0;
  let awaySecondHalfDrives = 0;
  let homePlayState: PlayCallState = { lastPlayType: null, streak: 0 };
  let awayPlayState: PlayCallState = { lastPlayType: null, streak: 0 };
  const homeUsedTrickPlayIds = new Set<string>();
  const awayUsedTrickPlayIds = new Set<string>();

  const recordTrickPlay = (teamId: string, quarter: number, drive: DriveResult): void => {
    if (!drive.trickPlay) return;
    const trick = drive.trickPlay;
    contingencyActivations.push({
      teamId,
      ruleId: `trick:${trick.playId}`,
      label: trick.playName,
      triggerLabel: `TRICK_PLAY|success=${trick.success ? 1 : 0}|yards=${drive.yards}|turnover=${trick.turnover ? 1 : 0}|touchdown=${trick.touchdown ? 1 : 0}|playType=${drive.playType}`,
      responseLabel: trick.turnover ? 'TURNOVER' : trick.touchdown ? 'TOUCHDOWN' : trick.success ? `${drive.yards} YARDS` : 'STOPPED',
      quarter,
      callout: `${trick.playName}: ${trick.commentary}`,
    });
  };

  const evaluateQuarterBreak = (quarter: number, lateGameWindow = false) => {
    activeHomePlan = applyHalftimeGamePlan(activeHomePlan, context?.home?.halftimeModifier, quarter) ?? activeHomePlan;
    activeAwayPlan = applyHalftimeGamePlan(activeAwayPlan, context?.away?.halftimeModifier, quarter) ?? activeAwayPlan;
    const nextHomeRules = activeHomePlan?.contingencyRules?.filter((rule) => !homeFiredRules.has(rule.id)) ?? [];
    if (activeHomePlan && nextHomeRules.length > 0) {
      const homeContext = buildContingencyContext({
        quarter,
        teamScore: homeScore,
        opponentScore: awayScore,
        turnovers: homeTurnovers,
        opponentTurnovers: awayTurnovers,
        opponentScoredOnOpening: awayOpeningTouchdown,
        windSpeed,
        lateGameWindow,
      });
      const evaluation = evaluateContingencies(nextHomeRules, homeContext, activeHomePlan, {
        teamName: adjustedHome.name,
        rng: eventRng,
      });
      if (evaluation.firedRule) {
        activeHomePlan = evaluation.plan;
        homeFiredRules.add(evaluation.firedRule.id);
        contingencyActivations.push({
          teamId: home.id,
          ruleId: evaluation.firedRule.id,
          label: evaluation.firedRule.label,
          triggerLabel: evaluation.firedRule.label,
          responseLabel: evaluation.adjustments.responseLabel,
          quarter,
          callout: evaluation.callout,
        });
      }
    }

    const nextAwayRules = activeAwayPlan?.contingencyRules?.filter((rule) => !awayFiredRules.has(rule.id)) ?? [];
    if (activeAwayPlan && nextAwayRules.length > 0) {
      const awayContext = buildContingencyContext({
        quarter,
        teamScore: awayScore,
        opponentScore: homeScore,
        turnovers: awayTurnovers,
        opponentTurnovers: homeTurnovers,
        opponentScoredOnOpening: homeOpeningTouchdown,
        windSpeed,
        lateGameWindow,
      });
      const evaluation = evaluateContingencies(nextAwayRules, awayContext, activeAwayPlan, {
        teamName: adjustedAway.name,
        rng: eventRng,
      });
      if (evaluation.firedRule) {
        activeAwayPlan = evaluation.plan;
        awayFiredRules.add(evaluation.firedRule.id);
        contingencyActivations.push({
          teamId: away.id,
          ruleId: evaluation.firedRule.id,
          label: evaluation.firedRule.label,
          triggerLabel: evaluation.firedRule.label,
          responseLabel: evaluation.adjustments.responseLabel,
          quarter,
          callout: evaluation.callout,
        });
      }
    }

    adjustedHome = applySimContext(
      home,
      context?.home ? { ...context.home, gamePlan: activeHomePlan } : undefined,
      {
        quarter,
        drivesSinceHalftime: homeSecondHalfDrives,
      },
    );
    adjustedAway = applySimContext(
      away,
      context?.away ? { ...context.away, gamePlan: activeAwayPlan } : undefined,
      {
        quarter,
        drivesSinceHalftime: awaySecondHalfDrives,
      },
    );
    matchupHighlight = buildMatchupHighlight(adjustedHome, adjustedAway)
      ?? buildMatchupHighlight(adjustedAway, adjustedHome);
  };

  // 11-13 drives per team
  const totalDrives = 11 + Math.floor(playRng() * 3);

  let currentQuarter = 1;
  for (let d = 0; d < totalDrives; d++) {
    const quarter = Math.min(3, Math.floor((d / totalDrives) * 4));
    const quarterNumber = quarter + 1;
    if (quarterNumber !== currentQuarter) {
      currentQuarter = quarterNumber;
      evaluateQuarterBreak(currentQuarter);
    }
    if (quarterNumber === 4 && !lateGameWindowEvaluated && d >= totalDrives - 2) {
      lateGameWindowEvaluated = true;
      evaluateQuarterBreak(4, true);
    }
    const homeCEdge = baseHomeCEdge + (homeScore > awayScore ? 1 : 0);
    const awayCEdge = baseAwayCEdge - (homeScore - awayScore >= 10 ? 1 : 0);
    const effectiveHomePlan = applyHalftimeGamePlan(activeHomePlan, context?.home?.halftimeModifier, quarterNumber);
    const effectiveAwayPlan = applyHalftimeGamePlan(activeAwayPlan, context?.away?.halftimeModifier, quarterNumber);
    const activeHomeTeam = applySimContext(
      home,
      context?.home ? { ...context.home, gamePlan: activeHomePlan } : undefined,
      {
        quarter: quarterNumber,
        drivesSinceHalftime: homeSecondHalfDrives,
      },
    );
    const activeAwayTeam = applySimContext(
      away,
      context?.away ? { ...context.away, gamePlan: activeAwayPlan } : undefined,
      {
        quarter: quarterNumber,
        drivesSinceHalftime: awaySecondHalfDrives,
      },
    );

    // Home drive
    const hDrive = simulateDrive(
      activeHomeTeam,
      activeAwayTeam,
      homeCEdge,
      homeScore - awayScore,
      quarter + 1,
      homeLines,
      homePlayState,
      weather,
      effectiveHomePlan,
      effectiveAwayPlan,
      context?.home?.clutchPlayerBonuses ?? {},
      context?.away?.clutchPlayerBonuses ?? {},
      context?.clutchSwing ?? 0.5,
      playerMatchupEvents,
      homeUsedTrickPlayIds,
      context?.isPlayoff ?? false,
      playRng,
    );
    recordTrickPlay(home.id, quarterNumber, hDrive);
    homeScore += hDrive.points;
    homeQtrScores[quarter]! += hDrive.points;
    if (hDrive.type === 'turnover') {
      homeTurnovers += 1;
    }
    if (!homeOpeningDriveComplete) {
      homeOpeningTouchdown = hDrive.type === 'td_pass' || hDrive.type === 'td_rush';
      homeOpeningDriveComplete = true;
    }
    homePlayState = hDrive.playType === homePlayState.lastPlayType
      ? { lastPlayType: hDrive.playType, streak: homePlayState.streak + 1 }
      : { lastPlayType: hDrive.playType, streak: 1 };
    if (quarterNumber >= 3 && quarterNumber <= 4) {
      homeSecondHalfDrives += 1;
    }

    const activeAwayOffense = applySimContext(
      away,
      context?.away ? { ...context.away, gamePlan: activeAwayPlan } : undefined,
      {
        quarter: quarterNumber,
        drivesSinceHalftime: awaySecondHalfDrives,
      },
    );
    const activeHomeDefense = applySimContext(
      home,
      context?.home ? { ...context.home, gamePlan: activeHomePlan } : undefined,
      {
        quarter: quarterNumber,
        drivesSinceHalftime: homeSecondHalfDrives,
      },
    );

    // Away drive
    const aDrive = simulateDrive(
      activeAwayOffense,
      activeHomeDefense,
      awayCEdge,
      awayScore - homeScore,
      quarter + 1,
      awayLines,
      awayPlayState,
      weather,
      effectiveAwayPlan,
      effectiveHomePlan,
      context?.away?.clutchPlayerBonuses ?? {},
      context?.home?.clutchPlayerBonuses ?? {},
      context?.clutchSwing ?? 0.5,
      playerMatchupEvents,
      awayUsedTrickPlayIds,
      context?.isPlayoff ?? false,
      playRng,
    );
    recordTrickPlay(away.id, quarterNumber, aDrive);
    awayScore += aDrive.points;
    awayQtrScores[quarter]! += aDrive.points;
    if (aDrive.type === 'turnover') {
      awayTurnovers += 1;
    }
    if (!awayOpeningDriveComplete) {
      awayOpeningTouchdown = aDrive.type === 'td_pass' || aDrive.type === 'td_rush';
      awayOpeningDriveComplete = true;
    }
    awayPlayState = aDrive.playType === awayPlayState.lastPlayType
      ? { lastPlayType: aDrive.playType, streak: awayPlayState.streak + 1 }
      : { lastPlayType: aDrive.playType, streak: 1 };
    if (quarterNumber >= 3 && quarterNumber <= 4) {
      awaySecondHalfDrives += 1;
    }
  }

  // Overtime if tied
  let overtime = false;
  if (homeScore === awayScore) {
    overtime = true;
    evaluateQuarterBreak(5);
    const otDrives = 2 + Math.floor(playRng() * 2);
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
        activeHomePlan,
        activeAwayPlan,
        context?.home?.clutchPlayerBonuses ?? {},
        context?.away?.clutchPlayerBonuses ?? {},
        context?.clutchSwing ?? 0.5,
        playerMatchupEvents,
        homeUsedTrickPlayIds,
        context?.isPlayoff ?? false,
        playRng,
      );
      recordTrickPlay(home.id, 5, hOT);
      homeScore += hOT.points;
      if (hOT.type === 'turnover') {
        homeTurnovers += 1;
      }
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
        activeAwayPlan,
        activeHomePlan,
        context?.away?.clutchPlayerBonuses ?? {},
        context?.home?.clutchPlayerBonuses ?? {},
        context?.clutchSwing ?? 0.5,
        playerMatchupEvents,
        awayUsedTrickPlayIds,
        context?.isPlayoff ?? false,
        playRng,
      );
      recordTrickPlay(away.id, 5, aOT);
      awayScore += aOT.points;
      if (aOT.type === 'turnover') {
        awayTurnovers += 1;
      }
      awayPlayState = aOT.playType === awayPlayState.lastPlayType
        ? { lastPlayType: aOT.playType, streak: awayPlayState.streak + 1 }
        : { lastPlayType: aOT.playType, streak: 1 };
      if (homeScore !== awayScore) break;
    }
    // Still tied? Coin flip FG
    if (homeScore === awayScore) {
      if (playRng() >= 0.5) homeScore += 3;
      else awayScore += 3;
    }
    // OT quarter scores
    homeQtrScores.push(homeScore - homeQtrScores.reduce((a, b) => a + b, 0));
    awayQtrScores.push(awayScore - awayQtrScores.reduce((a, b) => a + b, 0));
  }

  const specialTeams = simulateSpecialTeams(adjustedHome, adjustedAway, playRng);
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
  distributeDefensiveStats(adjustedHome, totalDrives, homeLines, playRng);
  distributeDefensiveStats(adjustedAway, totalDrives, awayLines, playRng);

  // Build stats
  const homeTeamLines = mergeTeamLines(home, homeLines, awayLines);
  const awayTeamLines = mergeTeamLines(away, awayLines, homeLines);

  const homeStats = buildTeamStats(
    homeTeamLines, home, homeScore,
    homeQtrScores as [number, number, number, number, ...number[]],
    totalDrives,
    playRng,
  );
  const awayStats = buildTeamStats(
    awayTeamLines, away, awayScore,
    awayQtrScores as [number, number, number, number, ...number[]],
    totalDrives,
    playRng,
  );

  // Find MVPs
  const homeMvpId = findMvp(homeTeamLines, home);
  const awayMvpId = findMvp(awayTeamLines, away);
  const shadow = context.shadowSeed === undefined
    ? undefined
    : simulateSnapShadow(
      context.gameId ?? `shadow-${home.id}-${away.id}`,
      buildSnapTeamInput(home, context.home),
      buildSnapTeamInput(away, context.away),
      context.shadowSeed,
    );

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
    specialTeams: { [home.id]: specialTeams.home, [away.id]: specialTeams.away },
    playerMatchupEvents,
    contingencyActivations,
    shadow,
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
    ensurePlayerStatBuckets(player);
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
    if (getGameAvailability(player) === 'out') continue;
    if (player.isStarter || participants.has(player.id)) {
      ensurePlayerStatBuckets(player);
      player.careerStats.gp = (player.careerStats.gp ?? 0) + 1;
      player.stats.gamesPlayed += 1;
    }
  }
}
