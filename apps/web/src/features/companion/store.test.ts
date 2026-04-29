import { beforeEach, describe, expect, it } from 'vitest';
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
    });
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
