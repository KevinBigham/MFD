import { describe, expect, it } from 'vitest';
import {
  createSpotlightController,
  resolveSpotlightTargetId,
  SPOTLIGHT_TARGETS_BY_BEAT,
} from './spotlightController';

describe('spotlightController', () => {
  it('resolves every onboarding beat to its stage-specific target', () => {
    expect(SPOTLIGHT_TARGETS_BY_BEAT.map((entry) => [
      entry.beat,
      resolveSpotlightTargetId(entry.beat, entry.stageId),
    ])).toEqual([
      [1, 'wizard.cold-open.continue'],
      [2, 'wizard.team-select.confirm'],
      [3, 'wizard.agm-hire.confirm'],
      [4, 'wizard.depth-chart.confirm'],
      [5, 'wizard.goals.confirm'],
      [6, 'wizard.culture.confirm'],
      [7, 'wizard.blueprint.mic-check'],
      [8, 'wizard.week-one.start'],
      [9, 'wizard.dashboard.handoff'],
    ]);
  });

  it('returns null when the stage is missing', () => {
    expect(resolveSpotlightTargetId(1, null)).toBeNull();
    expect(resolveSpotlightTargetId(1, undefined)).toBeNull();
  });

  it('returns null when the beat and stage do not match', () => {
    expect(resolveSpotlightTargetId(1, 'team-select')).toBeNull();
  });

  it('returns null for unsupported beats', () => {
    expect(resolveSpotlightTargetId(0, 'cold-open')).toBeNull();
    expect(resolveSpotlightTargetId(10, 'dashboard')).toBeNull();
  });

  it('resolves through the controller current state readers', () => {
    const controller = createSpotlightController({
      getCurrentBeat: () => 3,
      getCurrentStage: () => 'agm-hire',
    });

    expect(controller.getTargetId()).toBe('wizard.agm-hire.confirm');
  });

  it('returns null when the feature flag is off', () => {
    const controller = createSpotlightController({
      getCurrentBeat: () => 1,
      getCurrentStage: () => 'cold-open',
      isEnabled: () => false,
    });

    expect(controller.getTargetId()).toBeNull();
  });

  it('returns null when Chip is dismissed', () => {
    const controller = createSpotlightController({
      getCurrentBeat: () => 1,
      getCurrentStage: () => 'cold-open',
      isDismissed: () => true,
    });

    expect(controller.getTargetId()).toBeNull();
  });

  it('returns null when onboarding is skipped', () => {
    const controller = createSpotlightController({
      getCurrentBeat: () => 1,
      getCurrentStage: () => 'cold-open',
      isSkipped: () => true,
    });

    expect(controller.getTargetId()).toBeNull();
  });
});
