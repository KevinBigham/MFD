import type {
  DraftProspect,
  Position,
  ProspectCeilingBand,
  ProspectCharacterRead,
  ProspectRiskBand,
  ProspectScoutingState,
  Scout,
  ScoutingRegion,
} from '../types';

export const SCOUTING_REGIONS: ScoutingRegion[] = ['east', 'south', 'midwest', 'west'];

const COLLEGE_REGION_MAP: Record<string, ScoutingRegion> = {
  texas: 'south',
  'texas a&m': 'south',
  'texas tech': 'south',
  georgia: 'south',
  lsu: 'south',
  miami: 'south',
  alabama: 'south',
  florida: 'south',
  michigan: 'midwest',
  'ohio state': 'midwest',
  wisconsin: 'midwest',
  iowa: 'midwest',
  oregon: 'west',
  washington: 'west',
  usc: 'west',
  ucla: 'west',
  stanford: 'west',
  cal: 'west',
  'test state': 'south',
  'test u': 'south',
};

const PRIMARY_RATINGS: Record<Position, string[]> = {
  QB: ['throwAccuracy', 'throwPower', 'decisionSpeed'],
  RB: ['ballCarrierVision', 'elusiveness', 'breakTackle'],
  WR: ['routeRunning', 'release', 'catching'],
  TE: ['catching', 'routeRunning', 'blocking'],
  OL: ['passBlock', 'runBlock', 'strength'],
  DL: ['passRush', 'powerMoves', 'blockShed'],
  LB: ['playRecognition', 'tackle', 'blockShed'],
  CB: ['manCoverage', 'zoneCoverage', 'press'],
  S: ['zoneCoverage', 'playRecognition', 'tackle'],
  K: ['kickPower', 'kickAccuracy'],
  P: ['kickPower', 'kickAccuracy'],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function hashString(input: string): number {
  return [...input].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function normalizeCollege(college: string): string {
  return college.trim().toLowerCase().replace(/\s+/g, ' ');
}

function rankRatings(prospect: DraftProspect): Array<{ key: string; value: number }> {
  return Object.entries(prospect.ratings)
    .map(([key, value]) => ({ key, value: Number(value ?? 0) }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

function buildFilmNote(prospect: DraftProspect): string {
  const ranked = rankRatings(prospect);
  const strengths = ranked.slice(0, 2).map((entry) => entry.key).join(' / ');
  const weakness = ranked.at(-1)?.key ?? 'technique';
  return `Film: ${strengths} flash, ${weakness} needs polish.`;
}

function buildCombineNote(prospect: DraftProspect): string {
  if (!prospect.combine) return 'Combine: measurables not available yet.';
  return `Combine: ${prospect.combine.fortyYard}s 40 // ${prospect.combine.vertical}" vertical.`;
}

function buildInterviewNote(characterRead: ProspectCharacterRead): string {
  switch (characterRead) {
    case 'leader':
      return 'Interview: command presence and accountability lit up the room.';
    case 'steady':
      return 'Interview: calm, coachable, low-drama profile.';
    case 'mercurial':
      return 'Interview: magnetic personality, but volatility showed up.';
    case 'red_flag':
      return 'Interview: talent is real, but the room flagged temperament risk.';
    default:
      return 'Interview: the room did not get a clean read.';
  }
}

export function assignProspectRegion(college: string): ScoutingRegion {
  const normalized = normalizeCollege(college);
  const mapped = COLLEGE_REGION_MAP[normalized];
  if (mapped) return mapped;
  return SCOUTING_REGIONS[hashString(normalized) % SCOUTING_REGIONS.length]!;
}

export function scoutFitScore(scout: Scout, prospect: DraftProspect): number {
  const specialtyBonus = scout.specialty === prospect.pos ? 100 : 0;
  const coverageBonus = scout.scope === 'regional' && scout.region === prospect.region ? 20 : scout.scope === 'national' ? 5 : 0;
  return specialtyBonus + coverageBonus + Math.round(scout.accuracy * 100);
}

export function deriveConfidence(accuracy: number): number {
  return clamp(Math.round(accuracy * 100), 0, 95);
}

export function deriveRiskBand(
  prospect: DraftProspect,
  confidence: number,
  interviewed: boolean,
  hasPrivateWorkout: boolean,
): ProspectRiskBand {
  if (!interviewed && confidence < 55 && !hasPrivateWorkout) return 'unknown';
  if (prospect.bustProbability < 0.12) return 'safe';
  if (prospect.bustProbability < 0.22) return 'balanced';
  return 'volatile';
}

export function deriveCeilingBand(
  prospect: DraftProspect,
  confidence: number,
  hasPrivateWorkout: boolean,
): ProspectCeilingBand {
  if (!hasPrivateWorkout && confidence < 55) return 'unknown';
  if (prospect.trueGrade >= 88 || prospect.stealProbability >= 0.15) return 'star';
  if (prospect.trueGrade >= 82 || prospect.stealProbability >= 0.08) return 'impact';
  return 'starter';
}

export function deriveCharacterRead(prospect: DraftProspect): ProspectCharacterRead {
  if (
    prospect.traits.some((trait) => ['captain', 'vocal_leader', 'mentor'].includes(trait))
    || (prospect.personality.workEthic >= 8 && prospect.personality.loyalty >= 7)
  ) {
    return 'leader';
  }
  if (
    prospect.traits.some((trait) => ['cancer', 'ego', 'hothead', 'holdout'].includes(trait))
    || prospect.personality.workEthic <= 4
    || prospect.personality.greed >= 8
  ) {
    return 'red_flag';
  }
  if (
    prospect.traits.some((trait) => ['showtime', 'media_darling', 'stat_padder'].includes(trait))
    || prospect.personality.pressure >= 8
    || prospect.personality.ambition >= 9
  ) {
    return 'mercurial';
  }
  return 'steady';
}

export function resolveInterviewCharacterRead(prospect: DraftProspect, scout: Scout | null): ProspectCharacterRead {
  if (!scout) return 'unknown';
  const sameRegionBonus = scout.scope === 'regional' && scout.region === prospect.region ? 0.18 : 0;
  const reliability = scout.accuracy + sameRegionBonus;
  if (reliability < 0.82) return 'unknown';
  return deriveCharacterRead(prospect);
}

export function buildInitialScoutingState(prospect: DraftProspect, scout: Scout | null): ProspectScoutingState {
  const baselineAccuracy = roundTenth((scout?.accuracy ?? 0.65) * 0.1);
  return normalizeScoutingState(prospect, {
    prospectId: prospect.id,
    actions: [],
    accuracy: baselineAccuracy,
    confidence: deriveConfidence(baselineAccuracy),
    visibleScoutGrade: prospect.scoutGrade,
    notes: [],
    proDayRating: null,
    assignedScoutId: scout?.id ?? null,
    riskBand: 'unknown',
    ceilingBand: 'unknown',
    characterRead: 'unknown',
    privateWorkoutRatings: [],
  });
}

export function normalizeScoutingState(
  prospect: DraftProspect,
  state: Partial<ProspectScoutingState> & Pick<ProspectScoutingState, 'prospectId' | 'actions' | 'accuracy' | 'visibleScoutGrade' | 'notes'>,
): ProspectScoutingState {
  const actions = [...new Set(state.actions)];
  const hasInterview = actions.includes('interview');
  const hasPrivateWorkout = actions.includes('private_workout');
  const accuracy = clamp(Number(state.accuracy ?? 0), 0, 0.95);
  const confidence = clamp(Number(state.confidence ?? deriveConfidence(accuracy)), 0, 95);

  return {
    prospectId: state.prospectId,
    actions,
    accuracy: roundTenth(accuracy),
    confidence,
    visibleScoutGrade: roundTenth(Number(state.visibleScoutGrade ?? prospect.scoutGrade)),
    notes: [...(state.notes ?? [])],
    proDayRating: state.proDayRating ?? null,
    assignedScoutId: state.assignedScoutId ?? null,
    riskBand: deriveRiskBand(prospect, confidence, hasInterview, hasPrivateWorkout),
    ceilingBand: deriveCeilingBand(prospect, confidence, hasPrivateWorkout),
    characterRead: state.characterRead ?? (hasInterview ? deriveCharacterRead(prospect) : 'unknown'),
    privateWorkoutRatings: [...(state.privateWorkoutRatings ?? [])],
  };
}

export function buildActionNote(prospect: DraftProspect, action: 'film' | 'combine' | 'interview'): string {
  if (action === 'film') return buildFilmNote(prospect);
  if (action === 'combine') return buildCombineNote(prospect);
  return buildInterviewNote(deriveCharacterRead(prospect));
}

export function primaryWorkoutRatings(prospect: DraftProspect): string[] {
  const keys = PRIMARY_RATINGS[prospect.pos]
    .filter((key) => typeof prospect.ratings[key] === 'number')
    .sort((a, b) => Number(prospect.ratings[b] ?? 0) - Number(prospect.ratings[a] ?? 0) || a.localeCompare(b));
  const fallback = rankRatings(prospect).map((entry) => entry.key);
  return [...new Set([...(keys.length > 0 ? keys : []), ...fallback])].slice(0, 2);
}

export function resolvePrivateWorkout(
  prospect: DraftProspect,
  current: ProspectScoutingState,
  remainingWorkouts: number,
): { nextState: ProspectScoutingState; remainingWorkouts: number } {
  if (remainingWorkouts <= 0 || current.actions.includes('private_workout')) {
    return { nextState: current, remainingWorkouts };
  }

  const ratings = primaryWorkoutRatings(prospect).map((key) => `${key}: ${Math.round(Number(prospect.ratings[key] ?? prospect.trueGrade))}`);
  const nextAccuracy = clamp(current.accuracy + 0.24, 0, 0.95);
  const nextState = normalizeScoutingState(prospect, {
    ...current,
    actions: [...current.actions, 'private_workout'],
    accuracy: nextAccuracy,
    confidence: deriveConfidence(nextAccuracy),
    notes: [...current.notes, `Private workout: verified ${ratings.join(' // ')}.`],
    privateWorkoutRatings: ratings,
  });

  return {
    nextState,
    remainingWorkouts: remainingWorkouts - 1,
  };
}

export function tightenVisibleGrade(currentGrade: number, trueGrade: number, accuracy: number): number {
  const weight = clamp(accuracy + 0.05, 0, 0.95);
  return roundTenth((currentGrade * (1 - weight)) + (trueGrade * weight));
}

export function toggleScoutingWatchlist(watchlist: string[], prospectId: string): string[] {
  return watchlist.includes(prospectId)
    ? watchlist.filter((id) => id !== prospectId)
    : [...watchlist, prospectId];
}
