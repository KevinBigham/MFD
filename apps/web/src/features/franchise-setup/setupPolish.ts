import {
  PHASE_ORDER,
  getPhaseTransitionFlavor,
  getTransitionTip,
  type AGMReaction,
  type GoalOption,
  type SchemeOption,
  type SetupPhase,
} from '@mfd/engine';

const TEACHING_TIP_TOPIC_BY_PHASE: Partial<Record<SetupPhase, string>> = {
  meet_roster: 'roster_screen',
  depth_chart: 'depth_chart_screen',
  cap_strategy: 'cap_screen',
  set_scheme: 'game_plan_screen',
};

export function getTeachingTipTopicForPhase(phase: SetupPhase): string | null {
  return TEACHING_TIP_TOPIC_BY_PHASE[phase] ?? null;
}

export function getNextSetupPhase(phase: SetupPhase): SetupPhase | null {
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  if (phaseIndex < 0 || phaseIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[phaseIndex + 1] ?? null;
}

export function deriveSchemeReactionSentiment(
  option: Pick<SchemeOption, 'recommended' | 'fitScore' | 'recommendationScore'>,
): AGMReaction['sentiment'] {
  if (option.recommended) return 'love_it';
  if (option.fitScore >= 70 || option.recommendationScore >= 70) return 'like_it';
  if (option.fitScore < 45 || option.recommendationScore < 45) return 'disagree';
  return 'concerned';
}

export function deriveGoalReactionSentiment(
  goal: Pick<GoalOption, 'recommended' | 'difficulty'>,
): AGMReaction['sentiment'] {
  if (goal.recommended) return 'love_it';
  if (goal.difficulty === 'easy') return 'like_it';
  if (goal.difficulty === 'hard') return 'disagree';
  return 'concerned';
}

export function buildTransitionOverlayData(
  seed: number,
  agmId: string,
  fromPhase: SetupPhase,
  toPhase: SetupPhase,
): { flavorText: string; loadingTip: string } {
  return {
    flavorText: getPhaseTransitionFlavor(agmId, fromPhase, toPhase),
    loadingTip: getTransitionTip(seed, fromPhase, toPhase),
  };
}
