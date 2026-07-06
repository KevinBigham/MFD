import type { OpponentIntel, WeeklyPrepPlan } from '../types';

export const PREP_ALIGNMENT_RECOMMENDED_SCORE = 88;
export const PREP_ALIGNMENT_BALANCED_SCORE = 70;
export const PREP_ALIGNMENT_OFF_SCRIPT_SCORE = 62;
export const PREP_ALIGNMENT_MAX_SCORE = 100;

const STRONG_ALIGNMENT_MIN_SCORE = 80;
const CAUTION_ALIGNMENT_MIN_SCORE = 70;
const HIGH_LOAD_SIGNAL_COUNT = 2;
const MEDIUM_LOAD_SIGNAL_COUNT = 1;

export type PrepDecisionForecastAccent = 'green' | 'gold' | 'red' | 'cyan';

export interface PrepConsequenceItem {
  id: string;
  label: string;
  delta: string;
  accent: PrepDecisionForecastAccent;
}

export interface PrepDecisionForecastInput {
  plan: WeeklyPrepPlan;
  intel: Pick<OpponentIntel, 'attackLane' | 'defendLane' | 'dangerPlayers' | 'weakLinks'>;
  storedPlan: boolean;
  contingencyCount: number;
  maxContingencies: number;
  trickPlayCount: number;
  maxTrickPlays: number;
}

export interface PrepDecisionForecast {
  offensiveScore: number;
  defensiveScore: number;
  alignmentLabel: string;
  alignmentAccent: PrepDecisionForecastAccent;
  loadLabel: string;
  loadAccent: PrepDecisionForecastAccent;
  extrasLabel: string;
  consequenceItems: PrepConsequenceItem[];
}

function recommendedOffensiveFocus(lane: OpponentIntel['attackLane']): WeeklyPrepPlan['offensiveFocus'] {
  return lane === 'passing' ? 'attack_secondary' : 'attack_front';
}

function recommendedDefensiveFocus(lane: OpponentIntel['defendLane']): WeeklyPrepPlan['defensiveFocus'] {
  return lane === 'passing' ? 'limit_explosive' : 'stop_run';
}

export function prepAlignmentScore(
  selected: WeeklyPrepPlan['offensiveFocus'] | WeeklyPrepPlan['defensiveFocus'],
  recommended: WeeklyPrepPlan['offensiveFocus'] | WeeklyPrepPlan['defensiveFocus'],
): number {
  if (selected === recommended) return PREP_ALIGNMENT_RECOMMENDED_SCORE;
  if (selected === 'balanced') return PREP_ALIGNMENT_BALANCED_SCORE;
  return PREP_ALIGNMENT_OFF_SCRIPT_SCORE;
}

function alignmentAccent(score: number): PrepDecisionForecastAccent {
  if (score >= STRONG_ALIGNMENT_MIN_SCORE) return 'green';
  if (score >= CAUTION_ALIGNMENT_MIN_SCORE) return 'gold';
  return 'red';
}

function alignmentLabel(offenseScore: number, defenseScore: number): string {
  const averageScore = Math.round((offenseScore + defenseScore) / 2);
  if (averageScore >= STRONG_ALIGNMENT_MIN_SCORE) return 'Scout report matched';
  if (averageScore >= CAUTION_ALIGNMENT_MIN_SCORE) return 'Balanced plan';
  return 'Scout lane missed';
}

function loadSignals(plan: WeeklyPrepPlan): number {
  return [
    plan.practiceIntensity === 'full_pads',
    plan.snapManagement === 'ride_stars',
    plan.practiceIntensity === 'full_pads' && plan.snapManagement === 'ride_stars',
  ].filter(Boolean).length;
}

function loadLabel(signalCount: number): string {
  if (signalCount >= HIGH_LOAD_SIGNAL_COUNT) return 'High weekly load';
  if (signalCount >= MEDIUM_LOAD_SIGNAL_COUNT) return 'Managed strain';
  return 'Controlled load';
}

function loadAccent(signalCount: number): PrepDecisionForecastAccent {
  if (signalCount >= HIGH_LOAD_SIGNAL_COUNT) return 'red';
  if (signalCount >= MEDIUM_LOAD_SIGNAL_COUNT) return 'gold';
  return 'green';
}

function immediateImpact(
  plan: WeeklyPrepPlan,
  offensiveScore: number,
  defensiveScore: number,
): string {
  const offenseAligned = offensiveScore === PREP_ALIGNMENT_RECOMMENDED_SCORE;
  const defenseAligned = defensiveScore === PREP_ALIGNMENT_RECOMMENDED_SCORE;

  if (offenseAligned && defenseAligned) {
    return 'Both main calls match the scout report; missed execution is the main danger, not a target mismatch.';
  }

  if (offenseAligned || defenseAligned) {
    return 'One main call matches the scout report; the unmatched side gives the opponent a clearer counter.';
  }

  if (plan.offensiveFocus === 'balanced' || plan.defensiveFocus === 'balanced') {
    return 'Balanced calls keep run and pass options ready; the clearest opponent weakness gets fewer reps.';
  }

  return 'This plan ignores the clearest scout lane; it works only if current starters win harder matchups.';
}

function seasonImpact(plan: WeeklyPrepPlan, signalCount: number): string {
  if (signalCount >= HIGH_LOAD_SIGNAL_COUNT) {
    return 'Full pads plus Ride Stars raises this week\'s readiness; repeated weeks raise fatigue and injury-report chances.';
  }

  if (plan.snapManagement === 'protect_starters' || plan.practiceIntensity === 'light') {
    return 'Light or protected reps lower fatigue and injury-report chances; the tradeoff is less practice sharpness before kickoff.';
  }

  return 'Normal workload keeps readiness steady; it does not add extra rest or extra full-contact sharpness.';
}

function futureImpact(input: PrepDecisionForecastInput): string {
  const hasExtras = input.contingencyCount > 0 || input.trickPlayCount > 0;
  if (hasExtras) {
    return 'Saved contingencies or trick plays give Film Room a specific call to judge after the result.';
  }

  if (input.storedPlan) {
    return 'Saved prep gives Film Room the exact plan to compare against the result.';
  }

  return 'Save & Sim creates a week-specific plan for Film Room; Auto Prep advances without a saved plan to review.';
}

function uncertainty(input: PrepDecisionForecastInput, score: number): string {
  const primaryDanger = input.intel.dangerPlayers[0]?.name;
  const weakLink = input.intel.weakLinks[0]?.name;
  const matchupNote = primaryDanger && weakLink
    ? `${primaryDanger} and ${weakLink} still decide drives at kickoff.`
    : 'Opponent matchups still matter at kickoff.';
  const forecastType = score >= STRONG_ALIGNMENT_MIN_SCORE
    ? 'Plan matches the report, but it is not guaranteed.'
    : 'Plan misses the report more often.';
  return `${forecastType} ${matchupNote}`;
}

export function buildPrepDecisionForecast(input: PrepDecisionForecastInput): PrepDecisionForecast {
  const offensiveScore = prepAlignmentScore(
    input.plan.offensiveFocus,
    recommendedOffensiveFocus(input.intel.attackLane),
  );
  const defensiveScore = prepAlignmentScore(
    input.plan.defensiveFocus,
    recommendedDefensiveFocus(input.intel.defendLane),
  );
  const averageScore = Math.round((offensiveScore + defensiveScore) / 2);
  const signals = loadSignals(input.plan);
  const extrasLabel = `${input.contingencyCount}/${input.maxContingencies} contingencies, ${input.trickPlayCount}/${input.maxTrickPlays} trick plays`;

  return {
    offensiveScore,
    defensiveScore,
    alignmentLabel: alignmentLabel(offensiveScore, defensiveScore),
    alignmentAccent: alignmentAccent(averageScore),
    loadLabel: loadLabel(signals),
    loadAccent: loadAccent(signals),
    extrasLabel,
    consequenceItems: [
      {
        id: 'prep-immediate',
        label: 'Immediate',
        delta: immediateImpact(input.plan, offensiveScore, defensiveScore),
        accent: alignmentAccent(averageScore),
      },
      {
        id: 'prep-season',
        label: 'This season',
        delta: seasonImpact(input.plan, signals),
        accent: loadAccent(signals),
      },
      {
        id: 'prep-future',
        label: 'Future',
        delta: futureImpact(input),
        accent: input.contingencyCount > 0 || input.trickPlayCount > 0 ? 'cyan' : 'gold',
      },
      {
        id: 'prep-uncertainty',
        label: 'Uncertainty',
        delta: uncertainty(input, averageScore),
        accent: averageScore >= CAUTION_ALIGNMENT_MIN_SCORE ? 'cyan' : 'red',
      },
    ],
  };
}
