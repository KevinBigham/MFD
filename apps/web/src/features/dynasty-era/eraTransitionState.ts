export type EraTransitionStage = 'hidden' | 'badge' | 'name' | 'narrative' | 'idle';

export interface EraTransitionState {
  stage: EraTransitionStage;
}

export type EraTransitionEvent =
  | { type: 'start'; reducedMotion?: boolean }
  | { type: 'advance' }
  | { type: 'continue' }
  | { type: 'dismiss' };

export const ERA_TRANSITION_STAGE_DURATIONS = {
  badge: 1200,
  name: 1000,
  narrative: 1500,
} as const;

export const ERA_TRANSITION_TOTAL_MS =
  ERA_TRANSITION_STAGE_DURATIONS.badge
  + ERA_TRANSITION_STAGE_DURATIONS.name
  + ERA_TRANSITION_STAGE_DURATIONS.narrative;

export const ERA_TRANSITION_INITIAL_STATE: EraTransitionState = { stage: 'hidden' };

export function reduceEraTransitionState(
  state: EraTransitionState,
  event: EraTransitionEvent,
): EraTransitionState {
  switch (event.type) {
    case 'start':
      return { stage: event.reducedMotion ? 'idle' : 'badge' };
    case 'advance':
      if (state.stage === 'badge') return { stage: 'name' };
      if (state.stage === 'name') return { stage: 'narrative' };
      if (state.stage === 'narrative') return { stage: 'idle' };
      return state;
    case 'continue':
    case 'dismiss':
      return { stage: 'hidden' };
    default:
      return state;
  }
}

export function stageDurationMs(stage: EraTransitionStage): number | null {
  if (stage === 'badge') return ERA_TRANSITION_STAGE_DURATIONS.badge;
  if (stage === 'name') return ERA_TRANSITION_STAGE_DURATIONS.name;
  if (stage === 'narrative') return ERA_TRANSITION_STAGE_DURATIONS.narrative;
  return null;
}
