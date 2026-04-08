import { mulberry32, type PrngFn } from '../rng';
import { emptyPlayerStats } from './season-stats';
import { generateCareerEpilogue, isEpilogueWorthy } from './career-epilogues';
import type { GameState, HallOfFameEntry, Player, PlayerArchiveEntry, Position } from '../types';

export const FIRST_BALLOT_THRESHOLD = 90;

const HOF_SCORE_THRESHOLD = 70;
const HOF_CLASS_LIMIT = 5;
const HOF_BALLOT_MAX_YEARS = 5;
const HOF_INDUCTION_VOTE_THRESHOLD = 75;
const HOF_FIRST_BALLOT_MIN_VOTE_PCT = 95;
const HOF_FIRST_BALLOT_VOTE_RANGE = 5;
const HOF_STANDARD_VOTE_OFFSET = 10;
const HOF_STANDARD_VOTE_JITTER = 6;
const HOF_ELIGIBILITY_RETIREMENT_BUFFER = 1;

export interface HOFBallotEntry {
  playerId: string;
  name: string;
  position: Position;
  score: number;
  yearsOnBallot: number;
  votePct: number;
}

export interface HOFBallotResult {
  inducted: HOFBallotEntry[];
  waitlisted: HOFBallotEntry[];
  eliminated: HOFBallotEntry[];
  firstBallotInductees: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function archivePosition(entry: PlayerArchiveEntry): Position {
  return entry.positions[0] ?? 'QB';
}

function careerYears(entry: PlayerArchiveEntry): number {
  return entry.careerStats?.seasons ?? Math.max(1, entry.lastYear - entry.firstYear + 1);
}

function hallScore(entry: PlayerArchiveEntry): number {
  return (
    entry.peakOvr * 0.4 +
    (entry.careerStats?.gp ?? 0) * 0.002 +
    (entry.careerStats?.mvps ?? 0) * 15 +
    (entry.careerStats?.allPros ?? 0) * 8 +
    (entry.careerStats?.proBowls ?? 0) * 3 +
    (entry.careerStats?.championships ?? 0) * 20
  );
}

function eligible(entry: PlayerArchiveEntry, inductionYear: number): boolean {
  const gp = entry.careerStats?.gp ?? 0;
  return Boolean(
    entry.retirementYear !== null &&
    entry.retirementYear <= inductionYear - HOF_ELIGIBILITY_RETIREMENT_BUFFER &&
    entry.peakOvr >= 85 &&
    gp >= 80
  );
}

function highlights(entry: PlayerArchiveEntry): string[] {
  const notes: string[] = [`Peak ${entry.peakOvr} OVR`, `${careerYears(entry)} seasons`];
  if ((entry.careerStats?.mvps ?? 0) > 0) notes.push(`${entry.careerStats?.mvps} MVP`);
  if ((entry.careerStats?.allPros ?? 0) > 0) notes.push(`${entry.careerStats?.allPros} All-Pro`);
  if ((entry.careerStats?.proBowls ?? 0) > 0) notes.push(`${entry.careerStats?.proBowls} Pro Bowl`);
  if ((entry.careerStats?.championships ?? 0) > 0) notes.push(`${entry.careerStats?.championships} championships`);
  return notes;
}

function hashString(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

function buildArchiveFallbackPlayer(entry: PlayerArchiveEntry): Player {
  return {
    id: entry.playerId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    name: entry.name,
    pos: archivePosition(entry),
    age: Math.max(22, careerYears(entry) + 21),
    ovr: entry.peakOvr,
    pot: entry.peakOvr,
    ratings: {
      awareness: entry.peakOvr,
      speed: entry.peakOvr,
      stamina: entry.peakOvr,
    },
    devTrait: 'normal',
    personality: { workEthic: 6, loyalty: 6, greed: 5, pressure: 6, ambition: 6 },
    traits: [],
    archetype: null,
    contract: null,
    teamId: null,
    draftYear: entry.firstYear,
    draftRound: 1,
    draftPick: 1,
    college: 'Archive',
    yearsExp: careerYears(entry),
    careerStats: entry.careerStats ?? { seasons: careerYears(entry), gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 50,
    chemistry: 50,
    systemFit: 50,
    cliqueId: null,
    jerseyNumber: entry.jerseyNumber ?? 0,
    endorsements: [],
    isStarter: false,
    role: 'Retired',
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: emptyPlayerStats(),
  };
}

function resolveEpiloguePlayer(game: GameState, entry: PlayerArchiveEntry): Player {
  return game.players[entry.playerId] ?? buildArchiveFallbackPlayer(entry);
}

function compareHallOfFameEntries(left: HallOfFameEntry, right: HallOfFameEntry): number {
  return left.inductionYear - right.inductionYear || right.score - left.score || left.playerId.localeCompare(right.playerId);
}

function buildHallOfFameEntry(
  game: GameState,
  entry: PlayerArchiveEntry,
  inductionYear: number,
): HallOfFameEntry {
  const epiloguePlayer = resolveEpiloguePlayer(game, entry);
  const epilogueSeed = (game.seed ^ inductionYear ^ hashString(entry.playerId)) >>> 0;
  const epilogue = isEpilogueWorthy(epiloguePlayer)
    ? generateCareerEpilogue(mulberry32(epilogueSeed), epiloguePlayer)
    : undefined;

  return {
    playerId: entry.playerId,
    name: entry.name,
    position: archivePosition(entry),
    inductionYear,
    peakOvr: entry.peakOvr,
    careerYears: careerYears(entry),
    score: Math.round(hallScore(entry) * 100) / 100,
    awards: {
      mvps: entry.careerStats?.mvps ?? 0,
      allPros: entry.careerStats?.allPros ?? 0,
      proBowls: entry.careerStats?.proBowls ?? 0,
      championships: entry.careerStats?.championships ?? 0,
    },
    highlights: highlights(entry),
    teams: entry.teamHistory.map((stint) => stint.teamId),
    epilogue,
  };
}

function legacyInductHallOfFame(game: GameState, inductionYear: number): HallOfFameEntry[] {
  const inductedIds = new Set(game.hallOfFame.map((entry) => entry.playerId));

  const classEntries = game.playerArchive
    .filter((entry) => !inductedIds.has(entry.playerId))
    .filter((entry) => eligible(entry, inductionYear))
    .map((entry) => buildHallOfFameEntry(game, entry, inductionYear))
    .filter((entry) => entry.score >= HOF_SCORE_THRESHOLD)
    .sort((left, right) => right.score - left.score || right.peakOvr - left.peakOvr || left.playerId.localeCompare(right.playerId))
    .slice(0, HOF_CLASS_LIMIT);

  game.hallOfFame = [...game.hallOfFame, ...classEntries].sort(compareHallOfFameEntries);

  return classEntries;
}

function isFirstBallotCandidate(entry: HOFBallotEntry): boolean {
  return entry.yearsOnBallot === 1 && entry.score >= FIRST_BALLOT_THRESHOLD;
}

function compareBallotEntries(left: HOFBallotEntry, right: HOFBallotEntry): number {
  const leftFirstBallot = Number(isFirstBallotCandidate(left));
  const rightFirstBallot = Number(isFirstBallotCandidate(right));

  if (rightFirstBallot !== leftFirstBallot) return rightFirstBallot - leftFirstBallot;
  if (right.votePct !== left.votePct) return right.votePct - left.votePct;
  if (right.score !== left.score) return right.score - left.score;
  return left.playerId.localeCompare(right.playerId);
}

function calculateVotePct(candidate: HOFBallotEntry, rng: PrngFn): number {
  if (isFirstBallotCandidate(candidate)) {
    return HOF_FIRST_BALLOT_MIN_VOTE_PCT + Math.floor(rng() * HOF_FIRST_BALLOT_VOTE_RANGE);
  }

  return clamp(
    Math.round(candidate.score - HOF_STANDARD_VOTE_OFFSET + rng() * HOF_STANDARD_VOTE_JITTER),
    0,
    99,
  );
}

function advanceBallotEntry(entry: HOFBallotEntry): HOFBallotEntry {
  return {
    ...entry,
    yearsOnBallot: entry.yearsOnBallot + 1,
  };
}

function collectBallotCandidates(game: GameState, inductionYear: number): HOFBallotEntry[] {
  const inductedIds = new Set(game.hallOfFame.map((entry) => entry.playerId));
  const eliminatedIds = new Set(game.ballotEliminatedIds ?? []);
  const waitlist = (game.ballotWaitlist ?? [])
    .filter((entry) => !inductedIds.has(entry.playerId))
    .filter((entry) => !eliminatedIds.has(entry.playerId))
    .map((entry) => ({ ...entry, votePct: 0 }));
  const waitlistIds = new Set(waitlist.map((entry) => entry.playerId));

  const newCandidates = game.playerArchive
    .filter((entry) => !inductedIds.has(entry.playerId))
    .filter((entry) => !waitlistIds.has(entry.playerId))
    .filter((entry) => !eliminatedIds.has(entry.playerId))
    .filter((entry) => eligible(entry, inductionYear))
    .map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      position: archivePosition(entry),
      score: Math.round(hallScore(entry) * 100) / 100,
      yearsOnBallot: 1,
      votePct: 0,
    } satisfies HOFBallotEntry))
    .filter((entry) => entry.score >= HOF_SCORE_THRESHOLD);

  return [...waitlist, ...newCandidates].sort((left, right) =>
    right.score - left.score || left.playerId.localeCompare(right.playerId));
}

export function buildBallotFromEligible(game: GameState): HOFBallotEntry[] {
  return collectBallotCandidates(game, Math.max(0, game.year - 1));
}

export function simulateHOFBallot(candidates: HOFBallotEntry[], rng: PrngFn): HOFBallotResult {
  const evaluated = candidates
    .filter((entry) => entry.score >= HOF_SCORE_THRESHOLD)
    .map((entry) => ({
      ...entry,
      votePct: calculateVotePct(entry, rng),
    }))
    .sort(compareBallotEntries);

  const qualifiers = evaluated.filter((entry) => entry.votePct >= HOF_INDUCTION_VOTE_THRESHOLD);
  const inducted = qualifiers.slice(0, HOF_CLASS_LIMIT);
  const overflow = qualifiers.slice(HOF_CLASS_LIMIT);
  const misses = evaluated.filter((entry) => entry.votePct < HOF_INDUCTION_VOTE_THRESHOLD);
  const waitlisted: HOFBallotEntry[] = [];
  const eliminated: HOFBallotEntry[] = [];

  for (const entry of [...overflow, ...misses]) {
    if (entry.yearsOnBallot >= HOF_BALLOT_MAX_YEARS) {
      eliminated.push(entry);
      continue;
    }

    waitlisted.push(advanceBallotEntry(entry));
  }

  waitlisted.sort(compareBallotEntries);
  eliminated.sort(compareBallotEntries);

  return {
    inducted,
    waitlisted,
    eliminated,
    firstBallotInductees: inducted
      .filter((entry) => isFirstBallotCandidate(entry))
      .map((entry) => entry.playerId),
  };
}

export function inductHallOfFame(game: GameState, inductionYear: number): HallOfFameEntry[] {
  if (typeof game.ballotWaitlist === 'undefined') {
    return legacyInductHallOfFame(game, inductionYear);
  }

  const ballotCandidates = collectBallotCandidates(game, inductionYear);
  const ballotSeed = ballotCandidates.reduce((seed, entry) => seed ^ hashString(entry.playerId), game.seed ^ inductionYear) >>> 0;
  const ballotResult = simulateHOFBallot(ballotCandidates, mulberry32(ballotSeed));
  const archiveById = new Map(game.playerArchive.map((entry) => [entry.playerId, entry]));
  const inductedEntries = ballotResult.inducted
    .map((entry) => {
      const archiveEntry = archiveById.get(entry.playerId);
      return archiveEntry ? buildHallOfFameEntry(game, archiveEntry, inductionYear) : null;
    })
    .filter((entry): entry is HallOfFameEntry => Boolean(entry));

  game.ballotWaitlist = ballotResult.waitlisted;
  game.ballotEliminatedIds = [...new Set([
    ...(game.ballotEliminatedIds ?? []),
    ...ballotResult.eliminated.map((entry) => entry.playerId),
  ])].sort((left, right) => left.localeCompare(right));
  game.hallOfFame = [...game.hallOfFame, ...inductedEntries].sort(compareHallOfFameEntries);

  return inductedEntries;
}
