/**
 * MFD Broadcast Presentation — Cinematic Beat Curator
 *
 * Takes a completed `BroadcastOutput` and produces a linear, curated
 * sequence of "broadcast beats" suitable for a full-screen cinematic
 * replay: each beat pairs a high-leverage play with situational context
 * (quarter, score, momentum) and a pre-picked commentary line.
 *
 * Complements:
 *   - `broadcast.ts` (raw generation)
 *   - `game-flow.ts` (analytics/momentum)
 *   - `broadcast-commentary.ts` (pregame/recap copy)
 *
 * Pure — no mutation, no I/O, no randomness. Same input → same beats.
 */
import type {
  BroadcastOutput,
  DriveNarrative,
  GameResult,
  PlayDescription,
} from '../types/sim';

// ── Types ──────────────────────────────────────────────

export type BroadcastBeatKind =
  | 'opening'
  | 'big-play'
  | 'momentum-swing'
  | 'turning-point'
  | 'clutch'
  | 'final';

export interface BroadcastBeat {
  /** Insertion order (0-based). */
  index: number;
  kind: BroadcastBeatKind;
  quarter: number;
  /** Running home/away score AT the beat (after the play landed). */
  homeScore: number;
  awayScore: number;
  /** Team that ran the play this beat is about. */
  teamId?: string;
  /** 1-liner chyron suitable for an overlay. */
  chyron: string;
  /** Longer commentary paragraph (can be derived from play.commentary). */
  commentary: string;
  /** Reference to the underlying play (or null for opening/final). */
  play: PlayDescription | null;
  /** Excitement/leverage used to pick this beat — caller can style by it. */
  intensity: number;
}

export interface BroadcastPresentation {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  broadcastNetwork: string;
  finalNarrative: string;
  totalBeats: number;
  totalDurationSec: number;
  beats: BroadcastBeat[];
}

// ── Internal helpers ──────────────────────────────────

const PLAY_POINTS: Record<PlayDescription['type'], number> = {
  touchdown: 7,
  fieldGoal: 3,
  safety: 2,
  turnover: 0,
  sack: 0,
  run: 0,
  pass: 0,
  penalty: 0,
  punt: 0,
  kickoff: 0,
};

function scoreContributionFor(play: PlayDescription): number {
  return PLAY_POINTS[play.type] ?? 0;
}

interface ScoredPlay {
  play: PlayDescription;
  quarter: number;
  playIndex: number;
  driveIndex: number;
  cumulativeHome: number;
  cumulativeAway: number;
  teamId?: string;
}

/**
 * Walks the quarters in order, rolling a running score so each beat
 * can be tagged with the score at the moment it happened.
 */
function flattenWithScores(
  quarters: DriveNarrative[][],
  homeTeamId: string,
): ScoredPlay[] {
  const out: ScoredPlay[] = [];
  let home = 0;
  let away = 0;
  quarters.forEach((drives, qIdx) => {
    drives.forEach((drive, dIdx) => {
      const isHome = drive.teamId === homeTeamId;
      drive.plays.forEach((play, pIdx) => {
        const points = scoreContributionFor(play);
        if (isHome) home += points;
        else away += points;
        out.push({
          play,
          quarter: qIdx + 1,
          driveIndex: dIdx,
          playIndex: pIdx,
          teamId: drive.teamId,
          cumulativeHome: home,
          cumulativeAway: away,
        });
      });
    });
  });
  return out;
}

function intensityOf(play: PlayDescription): number {
  const base = play.excitement ?? 0;
  const leverage = play.leverageIndex ?? 0;
  const clutchBoost = play.isClutch ? 1.25 : 1;
  const bigPlayBoost = play.isBigPlay ? 1.15 : 1;
  return base * clutchBoost * bigPlayBoost + leverage * 5;
}

function chyronFor(kind: BroadcastBeatKind, context: {
  play?: PlayDescription;
  home: number;
  away: number;
  quarter: number;
}): string {
  const { play, home, away, quarter } = context;
  const score = `${home}-${away}`;
  switch (kind) {
    case 'opening':
      return `KICKOFF — ${score}`;
    case 'final':
      return `FINAL — ${score}`;
    case 'turning-point':
      return `Q${quarter} TURNING POINT — ${score}`;
    case 'momentum-swing':
      return `Q${quarter} MOMENTUM SHIFT — ${score}`;
    case 'clutch':
      return `Q${quarter} CLUTCH — ${score}`;
    case 'big-play':
    default: {
      const yards = play?.yardsGained ?? 0;
      return `Q${quarter} BIG PLAY · ${yards} YDS — ${score}`;
    }
  }
}

// ── Public API ─────────────────────────────────────────

export interface BuildBroadcastPresentationOptions {
  /** Target number of in-game beats (excluding opening + final). Default 6, clamped [3, 12]. */
  maxHighlights?: number;
  /** Seconds per beat for the cinematic timeline. Default 8. */
  secondsPerBeat?: number;
}

/**
 * Curate a broadcast into a linear cinematic beat list. Pure.
 *
 * Selection rule:
 *   1. Always include opening + final bookends.
 *   2. Take top-N plays by intensity (excitement · clutch/bigPlay boost + leverage).
 *   3. Sort the picked plays chronologically so the story reads as a timeline.
 *   4. Classify each as turning-point / momentum-swing / clutch / big-play.
 */
export function buildBroadcastPresentation(
  result: GameResult,
  broadcast: BroadcastOutput | null | undefined,
  options: BuildBroadcastPresentationOptions = {},
): BroadcastPresentation {
  const maxHighlights = Math.min(12, Math.max(3, Math.floor(options.maxHighlights ?? 6)));
  const secondsPerBeat = Math.max(3, Math.floor(options.secondsPerBeat ?? 8));

  const empty: BroadcastPresentation = {
    gameId: result.id,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    broadcastNetwork: broadcast?.broadcastNetwork ?? 'MFN',
    finalNarrative: broadcast?.finalNarrative ?? '',
    totalBeats: 0,
    totalDurationSec: 0,
    beats: [],
  };

  if (!broadcast || !broadcast.quarters || broadcast.quarters.length === 0) {
    // Opening + final only, no content in between.
    const beats: BroadcastBeat[] = [
      {
        index: 0,
        kind: 'opening',
        quarter: 1,
        homeScore: 0,
        awayScore: 0,
        chyron: chyronFor('opening', { home: 0, away: 0, quarter: 1 }),
        commentary: 'Kickoff is in the air.',
        play: null,
        intensity: 0,
      },
      {
        index: 1,
        kind: 'final',
        quarter: 4,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        chyron: chyronFor('final', { home: result.homeScore, away: result.awayScore, quarter: 4 }),
        commentary: broadcast?.finalNarrative ?? 'That is the final.',
        play: null,
        intensity: 0,
      },
    ];
    return {
      ...empty,
      beats,
      totalBeats: beats.length,
      totalDurationSec: beats.length * secondsPerBeat,
    };
  }

  const flat = flattenWithScores(broadcast.quarters, result.homeTeamId);

  // Build a quick lookup for momentum swings so we can flag plays as swings.
  const momentumKeys = new Set(
    (broadcast.momentumSwings ?? []).map((m) => `${m.quarter}:${m.play}`),
  );

  // Score every play, take top-N by intensity.
  const scored = flat
    .map((sp) => ({
      ...sp,
      intensity: intensityOf(sp.play),
      isMomentum: momentumKeys.has(`${sp.quarter}:${sp.playIndex}`),
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, maxHighlights)
    .sort((a, b) => {
      // Re-sort chronologically so the cinematic flows forward in time.
      if (a.quarter !== b.quarter) return a.quarter - b.quarter;
      if (a.driveIndex !== b.driveIndex) return a.driveIndex - b.driveIndex;
      return a.playIndex - b.playIndex;
    });

  // Find the single highest-intensity beat (the "turning point").
  const turningPointIntensity = scored.reduce((max, sp) => Math.max(max, sp.intensity), 0);

  const beats: BroadcastBeat[] = [];
  // Opening beat
  beats.push({
    index: 0,
    kind: 'opening',
    quarter: 1,
    homeScore: 0,
    awayScore: 0,
    chyron: chyronFor('opening', { home: 0, away: 0, quarter: 1 }),
    commentary: `Kickoff on ${broadcast.broadcastNetwork}. ${flat.length} plays to come.`,
    play: null,
    intensity: 0,
  });

  // Content beats
  let turningPointUsed = false;
  scored.forEach((sp) => {
    let kind: BroadcastBeatKind = 'big-play';
    if (!turningPointUsed && sp.intensity >= turningPointIntensity && turningPointIntensity > 0) {
      kind = 'turning-point';
      turningPointUsed = true;
    } else if (sp.isMomentum) {
      kind = 'momentum-swing';
    } else if (sp.play.isClutch) {
      kind = 'clutch';
    }
    beats.push({
      index: beats.length,
      kind,
      quarter: sp.quarter,
      homeScore: sp.cumulativeHome,
      awayScore: sp.cumulativeAway,
      teamId: sp.teamId,
      chyron: chyronFor(kind, {
        play: sp.play,
        home: sp.cumulativeHome,
        away: sp.cumulativeAway,
        quarter: sp.quarter,
      }),
      commentary: sp.play.commentary,
      play: sp.play,
      intensity: sp.intensity,
    });
  });

  // Final beat
  beats.push({
    index: beats.length,
    kind: 'final',
    quarter: Math.max(4, broadcast.quarters.length),
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    chyron: chyronFor('final', {
      home: result.homeScore,
      away: result.awayScore,
      quarter: Math.max(4, broadcast.quarters.length),
    }),
    commentary: broadcast.finalNarrative ?? 'That is the final.',
    play: null,
    intensity: 0,
  });

  return {
    gameId: result.id,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    broadcastNetwork: broadcast.broadcastNetwork,
    finalNarrative: broadcast.finalNarrative ?? '',
    totalBeats: beats.length,
    totalDurationSec: beats.length * secondsPerBeat,
    beats,
  };
}

/**
 * Convenience: pull a single beat by index (for paging through the
 * presentation in the UI).
 */
export function getBroadcastBeat(
  presentation: BroadcastPresentation,
  index: number,
): BroadcastBeat | null {
  if (index < 0 || index >= presentation.beats.length) return null;
  return presentation.beats[index] ?? null;
}
