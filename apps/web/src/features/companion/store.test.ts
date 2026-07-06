import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCurrentChipPose, useChipStore } from './store';

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

  it('marks and reads route beat receipts without mutating the previous set', () => {
    const before = useChipStore.getState().seenBeats;

    useChipStore.getState().markBeatSeen('chip.route.roster.beat-1');

    expect(useChipStore.getState().hasSeenBeat('chip.route.roster.beat-1')).toBe(true);
    expect(useChipStore.getState().seenBeats).toEqual(new Set(['chip.route.roster.beat-1']));
    expect(useChipStore.getState().seenBeats).not.toBe(before);
    expect(before.size).toBe(0);
  });

  it('resets route read receipts back to an empty set', () => {
    useChipStore.getState().markBeatSeen('chip.route.roster.beat-1');
    useChipStore.getState().reset();

    expect(useChipStore.getState().seenBeats).toEqual(new Set());
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
      text: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
      archetype: 'weekly',
    });

    expect(useChipStore.getState().spotlightTargetId).toBe('wizard.depth-chart.confirm');
  });

  it('sets pose synchronously', () => {
    useChipStore.getState().setPose('wave');

    expect(useChipStore.getState().pose).toBe('wave');
  });

  it('sets a timed current pose window without scheduling timers', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    useChipStore.getState().setPose('warning', {
      durationMs: 3500,
      nowMs: 1_000,
      priority: 'warning',
    });

    expect(useChipStore.getState()).toMatchObject({
      pose: 'warning',
      currentPose: 'warning',
      poseSetAt: 1_000,
      poseDurationMs: 3500,
      poseUntil: 4_500,
      fallbackPose: 'idle',
      posePriority: 'warning',
    });
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it('resolves a timed current pose back to idle after the pose window expires', () => {
    useChipStore.getState().setPose('celebrate', {
      durationMs: 4000,
      nowMs: 10_000,
      priority: 'celebrate',
    });

    expect(resolveCurrentChipPose(useChipStore.getState(), 13_999)).toBe('celebrate');
    expect(resolveCurrentChipPose(useChipStore.getState(), 14_000)).toBe('idle');
  });

  it('resolves expired poses to a custom fallback pose', () => {
    useChipStore.getState().setPose('whispering', {
      durationMs: 3500,
      nowMs: 2_000,
      fallbackPose: 'think',
    });

    expect(resolveCurrentChipPose(useChipStore.getState(), 5_501)).toBe('think');
  });

  it('keeps an active higher-priority warning pose over lower-priority reactions', () => {
    useChipStore.getState().setPose('warning', {
      durationMs: 3500,
      nowMs: 1_000,
      priority: 'warning',
    });
    useChipStore.getState().setPose('celebrate', {
      durationMs: 4000,
      nowMs: 1_500,
      priority: 'celebrate',
    });

    expect(useChipStore.getState().currentPose).toBe('warning');
    expect(resolveCurrentChipPose(useChipStore.getState(), 2_000)).toBe('warning');
  });

  it('lets a sticky pose clear an active timed pose window', () => {
    useChipStore.getState().setPose('sad', {
      durationMs: 6000,
      nowMs: 1_000,
      priority: 'sad',
    });
    useChipStore.getState().setPose('wave');

    expect(useChipStore.getState()).toMatchObject({
      pose: 'wave',
      currentPose: 'wave',
      poseSetAt: null,
      poseDurationMs: 0,
      poseUntil: null,
      posePriority: 'routine',
    });
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
      text: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
      archetype: 'weekly',
    });

    expect(useChipStore.getState()).toMatchObject({
      pose: 'celebrate',
      currentDialogueId: 'chip.weekly.cleanWin',
      currentDialogueText: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
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
