/**
 * Drive-by-drive game simulation engine.
 *
 * Inspired by the legacy monolith's simGame()/drive() (~830 lines).
 * Produces realistic per-player box scores, quarter-by-quarter scoring,
 * and play-level stat accumulation.
 */
import { RNG } from '../rng';
import { avg, cl } from '../utils';
import type {
  Player,
  PlayerGameLine,
  Position,
  Team,
  TeamGameStats,
} from '../types';

// ── Helpers ─────────────────────────────────────────────

function starters(roster: Player[], pos: Position): Player[] {
  return roster
    .filter((p) => p.pos === pos && p.isStarter && !p.injury)
    .sort((a, b) => b.ovr - a.ovr);
}

function bestAvailable(roster: Player[], pos: Position): Player | null {
  return roster
    .filter((p) => p.pos === pos && !p.injury)
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)[0] ?? null;
}

function posAvg(roster: Player[], pos: Position): number {
  const group = roster.filter((p) => p.pos === pos && !p.injury);
  return group.length > 0 ? avg(group.map((p) => p.ovr)) : 60;
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
const BASE_FUMBLE_CHANCE = 0.062;

// ── Coaching edge calculation ───────────────────────────

function coachingEdge(team: Team, opponent: Team): number {
  const hcRating = team.staff?.hc?.ratings?.gameplan ?? 70;
  const oppHcRating = opponent.staff?.hc?.ratings?.gameplan ?? 70;
  return (hcRating - oppHcRating) * 0.03;
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
): DriveResult {
  const qb = bestAvailable(offense.roster, 'QB');
  const rb = bestAvailable(offense.roster, 'RB');
  const receivers = offense.roster
    .filter((p) => (p.pos === 'WR' || p.pos === 'TE') && !p.injury)
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)
    .slice(0, 4);
  const kicker = bestAvailable(offense.roster, 'K');

  const olOvr = posAvg(offense.roster, 'OL');
  const dlOvr = posAvg(defense.roster, 'DL');
  const lbOvr = posAvg(defense.roster, 'LB');
  const cbOvr = posAvg(defense.roster, 'CB');
  const sOvr = posAvg(defense.roster, 'S');

  const pocket = (olOvr - dlOvr) * 0.15;
  const coverage = (cbOvr + sOvr) / 2;
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
    const qbOvr = qb.ovr;
    const qbAcc = qb.ratings.accuracy ?? qbOvr;
    const qbAware = qb.ratings.awareness ?? qbOvr;

    let quality = (qbAcc - coverage) * 0.45 + (qbAware - 70) * 0.22 + cEdge * 0.4 + pocket * 0.55 - tendencyPenalty;

    // 4th quarter clutch boost
    if (quarter === 4 && Math.abs(scoreDiff) <= 7) quality += 2;

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
        }
        const ql = ensureLine(lines, qb);
        ql.sacked = (ql.sacked ?? 0) + 1;
        if (RNG.play() < STRIP_SACK_CHANCE) {
          ql.fumbles = (ql.fumbles ?? 0) + 1;
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
      }
      return { points: 0, type: 'turnover', yards: 0, playType };
    }

    // Outcome roll
    const roll = RNG.play() * 100 + quality;
    const isRedZone = RNG.play() < 0.28;
    const tdThreshold = isRedZone ? 68 : 76;
    const fgThreshold = isRedZone ? 52 : 60;

    // Pick target receiver
    const targetWeights = [0.40, 0.28, 0.20, 0.12];
    let targetIdx = 0;
    const tRoll = RNG.play();
    let cumulative = 0;
    for (let i = 0; i < receivers.length; i++) {
      cumulative += targetWeights[i] ?? 0.1;
      if (tRoll < cumulative) { targetIdx = i; break; }
    }
    const target = receivers[targetIdx] ?? receivers[0]!;
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
      const makeChance = cl(0.65 + (kOvr - 60) * 0.008 - (fgDist > 45 ? 0.15 : fgDist > 35 ? 0.05 : 0), 0.40, 0.95);
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
    const rbOvr = rb.ovr;
    const rbSpeed = rb.ratings.speed ?? rbOvr;
    const rbElusive = rb.ratings.elusiveness ?? rbOvr;

    let quality2 = (rbSpeed - ((dlOvr + lbOvr) / 2)) * 0.4 + (rbElusive - lbOvr) * 0.22 + runLanes * 0.7 + cEdge * 0.35 - tendencyPenalty;
    if (quarter === 4 && Math.abs(scoreDiff) <= 7) quality2 += 1.5;

    // Big play chance
    const bigPlayChance = cl(0.02 + (rbSpeed > 85 && rbElusive > 80 ? 0.05 : 0), 0.005, 0.10);
    if (RNG.play() < bigPlayChance) quality2 += 20;

    // Fumble check
    const fumbleChance = cl(BASE_FUMBLE_CHANCE + (lbOvr - rbOvr) * 0.0014 + tendencyPenalty * 0.002, 0.015, 0.09);
    if (RNG.play() < fumbleChance) {
      const rbl = ensureLine(lines, rb);
      rbl.rushAtt = (rbl.rushAtt ?? 0) + 1;
      rbl.fumbles = (rbl.fumbles ?? 0) + 1;
      // Credit tackle to LB
      const lbs = defense.roster.filter((p) => p.pos === 'LB' && !p.injury).sort((a, b) => b.ovr - a.ovr);
      if (lbs[0]) {
        const ll = ensureLine(lines, lbs[0]);
        ll.tackles = (ll.tackles ?? 0) + 1;
      }
      return { points: 0, type: 'turnover', yards: 0, playType };
    }

    const roll2 = RNG.play() * 100 + quality2;
    const isRedZone = RNG.play() < 0.22;
    const tdThreshold = isRedZone ? 74 : 82;
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
      const makeChance = cl(0.65 + (kOvr - 60) * 0.008 - (fgDist > 45 ? 0.15 : fgDist > 35 ? 0.05 : 0), 0.40, 0.95);
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
    (p.pos === 'DL' || p.pos === 'LB' || p.pos === 'CB' || p.pos === 'S') && !p.injury,
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
  let passYds = 0, rushYds = 0, turnovers = 0, sacks = 0;
  let passAtt = 0, passComp = 0, passTDs = 0, ints = 0;
  let rushAtt = 0, rushTDs = 0, fumbles = 0;
  let fgMade = 0, fgAtt = 0;

  for (const line of lines.values()) {
    passYds += line.passYds ?? 0;
    passAtt += line.passAtt ?? 0;
    passComp += line.passComp ?? 0;
    passTDs += line.passTD ?? 0;
    ints += line.passINT ?? 0;
    rushYds += line.rushYds ?? 0;
    rushAtt += line.rushAtt ?? 0;
    rushTDs += line.rushTD ?? 0;
    fumbles += line.fumbles ?? 0;
    fgMade += line.fgMade ?? 0;
    fgAtt += line.fgAtt ?? 0;
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

  const playerLines = Array.from(lines.values()).filter(
    (l) => team.roster.some((p) => p.id === l.playerId),
  );

  return {
    totalYards,
    passingYards: passYds,
    rushingYards: rushYds,
    turnovers,
    sacks,
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
}

export function simGame(home: Team, away: Team): SimGameResult {
  const homeLines = new Map<string, PlayerGameLine>();
  const awayLines = new Map<string, PlayerGameLine>();

  const homeCEdge = coachingEdge(home, away) + 1.0; // home field advantage
  const awayCEdge = coachingEdge(away, home);

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

    // Home drive
    const hDrive = simulateDrive(home, away, homeCEdge, homeScore - awayScore, quarter + 1, homeLines, homePlayState);
    homeScore += hDrive.points;
    homeQtrScores[quarter]! += hDrive.points;
    homePlayState = hDrive.playType === homePlayState.lastPlayType
      ? { lastPlayType: hDrive.playType, streak: homePlayState.streak + 1 }
      : { lastPlayType: hDrive.playType, streak: 1 };

    // Away drive
    const aDrive = simulateDrive(away, home, awayCEdge, awayScore - homeScore, quarter + 1, awayLines, awayPlayState);
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
      const hOT = simulateDrive(home, away, homeCEdge, 0, 5, homeLines, homePlayState);
      homeScore += hOT.points;
      homePlayState = hOT.playType === homePlayState.lastPlayType
        ? { lastPlayType: hOT.playType, streak: homePlayState.streak + 1 }
        : { lastPlayType: hOT.playType, streak: 1 };
      if (homeScore !== awayScore) break;

      const aOT = simulateDrive(away, home, awayCEdge, 0, 5, awayLines, awayPlayState);
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

  // Distribute defensive stats
  distributeDefensiveStats(home, totalDrives, homeLines);
  distributeDefensiveStats(away, totalDrives, awayLines);

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

  return { homeScore, awayScore, overtime, homeStats, awayStats, homeMvpId, awayMvpId };
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
    if (player.injury) continue;
    if (player.isStarter || participants.has(player.id)) {
      player.careerStats.gp = (player.careerStats.gp ?? 0) + 1;
    }
  }
}
