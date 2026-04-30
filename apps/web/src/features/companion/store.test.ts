import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChipStore } from './store';

describe('useChipStore', () => {
  beforeEach(() => {
    useChipStore.getState().reset();
  });

  it('starts in idle transient state', () => {
    expect(useChipStore.getState()).toMatchObject({
      pose: 'idle',
      currentDialogueId: null,
      dismissed: false,
      beat: 0,
      context: 'idle',
      spotlightTargetId: null,
    });
  });

  it('sets and reads the spotlight target synchronously', () => {
    useChipStore.getState().setSpotlightTarget('wizard.cold-open.continue');

    expect(useChipStore.getState().spotlightTargetId).toBe('wizard.cold-open.continue');
  });

  it('clears the spotlight target synchronously', () => {
    useChipStore.getState().setSpotlightTarget('wizard.team-select.confirm');
    useChipStore.getState().setSpotlightTarget(null);

    expect(useChipStore.getState().spotlightTargetId).toBeNull();
  });

  it('does not notify subscribers for an idempotent spotlight target set', () => {
    const listener = vi.fn();
    const unsubscribe = useChipStore.subscribe(listener);

    useChipStore.getState().setSpotlightTarget('wizard.agm-hire.confirm');
    useChipStore.getState().setSpotlightTarget('wizard.agm-hire.confirm');

    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('preserves the spotlight target across dialogue changes', () => {
    useChipStore.getState().setSpotlightTarget('wizard.depth-chart.confirm');
    useChipStore.getState().showDialogue('chip.onboarding.beat-4', { context: 'onboarding' });
    useChipStore.getState().advance();
    useChipStore.getState().showWeeklyDialogue({
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'celebrate',
      text: 'That was a grown-up win.',
      archetype: 'weekly',
    });

    expect(useChipStore.getState().spotlightTargetId).toBe('wizard.depth-chart.confirm');
  });

  it('sets pose synchronously', () => {
    useChipStore.getState().setPose('wave');

    expect(useChipStore.getState().pose).toBe('wave');
  });

  it('shows dialogue with pose and onboarding context', () => {
    useChipStore.getState().showDialogue('chip.onboarding.beat-1', {
      pose: 'talk',
      context: 'onboarding',
    });

    expect(useChipStore.getState()).toMatchObject({
      pose: 'talk',
      currentDialogueId: 'chip.onboarding.beat-1',
      dismissed: false,
      context: 'onboarding',
    });
  });

  it('shows weekly dialogue entries with text for dock rendering', () => {
    useChipStore.getState().showWeeklyDialogue({
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'celebrate',
      text: 'That was a grown-up win.',
      archetype: 'weekly',
    });

    expect(useChipStore.getState()).toMatchObject({
      pose: 'celebrate',
      currentDialogueId: 'chip.weekly.cleanWin',
      currentDialogueText: 'That was a grown-up win.',
      lastWeeklyDialogue: expect.objectContaining({ id: 'chip.weekly.cleanWin' }),
      dismissed: false,
      context: 'event',
    });
  });

  it('advances beats without changing the current dialogue id', () => {
    useChipStore.getState().showDialogue('chip.onboarding.beat-2', { context: 'onboarding' });
    useChipStore.getState().advance();
    useChipStore.getState().advance();

    expect(useChipStore.getState()).toMatchObject({
      beat: 2,
      currentDialogueId: 'chip.onboarding.beat-2',
      context: 'onboarding',
    });
  });

  it('dismisses Chip by clearing dialogue and moving to dismissed context', () => {
    useChipStore.getState().showDialogue('chip.onboarding.beat-3', { pose: 'concern' });
    useChipStore.getState().dismiss();

    expect(useChipStore.getState()).toMatchObject({
      currentDialogueId: null,
      dismissed: true,
      context: 'dismissed',
      pose: 'concern',
    });
  });

  it('replays the same action sequence to the same state', () => {
    const runSequence = () => {
      useChipStore.getState().reset();
      useChipStore.getState().setPose('mic-check');
      useChipStore.getState().showDialogue('chip.onboarding.beat-7', { context: 'onboarding' });
      useChipStore.getState().advance();
      return useChipStore.getState();
    };

    const first = runSequence();
    const second = runSequence();

    expect(second).toMatchObject({
      pose: first.pose,
      currentDialogueId: first.currentDialogueId,
      dismissed: first.dismissed,
      beat: first.beat,
      context: first.context,
    });
  });
});
