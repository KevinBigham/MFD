import { describe, expect, it } from 'vitest';
import {
  ERA_TRANSITION_INITIAL_STATE,
  ERA_TRANSITION_STAGE_DURATIONS,
  ERA_TRANSITION_TOTAL_MS,
  reduceEraTransitionState,
  stageDurationMs,
} from './eraTransitionState';

describe('eraTransitionState', () => {
  it('starts hidden before a reveal is requested', () => {
    expect(ERA_TRANSITION_INITIAL_STATE).toEqual({ stage: 'hidden' });
  });

  it('starts at the badge stage when motion is allowed', () => {
    expect(reduceEraTransitionState(ERA_TRANSITION_INITIAL_STATE, { type: 'start' })).toEqual({ stage: 'badge' });
  });

  it('advances through badge, name, narrative, and idle in order', () => {
    const badge = reduceEraTransitionState(ERA_TRANSITION_INITIAL_STATE, { type: 'start' });
    const name = reduceEraTransitionState(badge, { type: 'advance' });
    const narrative = reduceEraTransitionState(name, { type: 'advance' });
    const idle = reduceEraTransitionState(narrative, { type: 'advance' });

    expect([badge.stage, name.stage, narrative.stage, idle.stage]).toEqual(['badge', 'name', 'narrative', 'idle']);
  });

  it('skips directly to idle for reduced motion', () => {
    expect(reduceEraTransitionState(ERA_TRANSITION_INITIAL_STATE, { type: 'start', reducedMotion: true })).toEqual({ stage: 'idle' });
  });

  it('dismisses back to hidden from any visible stage', () => {
    expect(reduceEraTransitionState({ stage: 'narrative' }, { type: 'dismiss' })).toEqual({ stage: 'hidden' });
    expect(reduceEraTransitionState({ stage: 'idle' }, { type: 'continue' })).toEqual({ stage: 'hidden' });
  });

  it('keeps the total auto-progress duration at 3.7 seconds', () => {
    expect(ERA_TRANSITION_STAGE_DURATIONS).toEqual({ badge: 1200, name: 1000, narrative: 1500 });
    expect(ERA_TRANSITION_TOTAL_MS).toBe(3700);
    expect(stageDurationMs('idle')).toBeNull();
  });
});
