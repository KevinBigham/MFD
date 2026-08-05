import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCurrentChipPose, shouldPublishPoseTick, useChipStore } from './store';

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

describe('pose tick publish gate', () => {
  it('never publishes while the tab is hidden', () => {
    expect(shouldPublishPoseTick({ hidden: true, nextNowMs: 10_000, lastPublishedMs: 0 })).toBe(false);
    expect(shouldPublishPoseTick({ hidden: true, nextNowMs: 100, lastPublishedMs: 0 })).toBe(false);
  });

  it('publishes at most once per tick interval while visible', () => {
    expect(shouldPublishPoseTick({ hidden: false, nextNowMs: 100, lastPublishedMs: 0 })).toBe(false);
    expect(shouldPublishPoseTick({ hidden: false, nextNowMs: 250, lastPublishedMs: 0 })).toBe(true);
    expect(shouldPublishPoseTick({ hidden: false, nextNowMs: 499, lastPublishedMs: 250 })).toBe(false);
    expect(shouldPublishPoseTick({ hidden: false, nextNowMs: 500, lastPublishedMs: 250 })).toBe(true);
  });

  it('publishes immediately when the tab becomes visible again after a long hidden stretch', () => {
    expect(shouldPublishPoseTick({ hidden: false, nextNowMs: 60_000, lastPublishedMs: 1_000 })).toBe(true);
  });
});

describe('dialogue queue (B7)', () => {
  function entry(id: string, text: string, withDetails = false) {
    return {
      id,
      beat: 0,
      pose: 'talk' as const,
      text,
      archetype: 'weekly' as const,
      contextDetails: withDetails ? ['Must Do: open Recap.'] : undefined,
    };
  }

  it('queues the remaining beats and tracks the details beat for the panel', () => {
    useChipStore.getState().reset();
    const beats = [
      entry('chip.weekly.blowoutLoss.reaction', 'That one hurts.'),
      entry('chip.weekly.blowoutLoss.plan', 'Must Do: open Postgame Recap.', true),
    ];

    useChipStore.getState().queueDialogue(beats);
    const state = useChipStore.getState();

    expect(state.currentDialogueId).toBe('chip.weekly.blowoutLoss.reaction');
    expect(state.currentDialogueText).toBe('That one hurts.');
    expect(state.dialogueQueue.map((beat) => beat.id)).toEqual(['chip.weekly.blowoutLoss.plan']);
    expect(state.dialogueQueueTotal).toBe(2);
    expect(state.lastConversation?.map((beat) => beat.id)).toEqual([
      'chip.weekly.blowoutLoss.reaction',
      'chip.weekly.blowoutLoss.plan',
    ]);
    // The details panel follows the beat carrying contextDetails, not the
    // reaction beat currently showing.
    expect(state.lastWeeklyDialogue?.id).toBe('chip.weekly.blowoutLoss.plan');
    expect(state.dismissed).toBe(false);
  });

  it('advances through the queue and no-ops when empty', () => {
    useChipStore.getState().reset();
    useChipStore.getState().queueDialogue([
      entry('beat-1', 'First.'),
      entry('beat-2', 'Second.'),
      entry('beat-3', 'Third.'),
    ]);

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('beat-2');
    expect(useChipStore.getState().dialogueQueue.map((beat) => beat.id)).toEqual(['beat-3']);

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('beat-3');
    expect(useChipStore.getState().dialogueQueue).toEqual([]);

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('beat-3');
  });

  it('clears the queue on dismiss and on a fresh single dialogue', () => {
    useChipStore.getState().reset();
    useChipStore.getState().queueDialogue([entry('beat-1', 'First.'), entry('beat-2', 'Second.')]);

    useChipStore.getState().dismiss();
    expect(useChipStore.getState().dialogueQueue).toEqual([]);
    expect(useChipStore.getState().dialogueQueueTotal).toBe(0);
    // The conversation survives dismissal for Ask Chip replay.
    expect(useChipStore.getState().lastConversation).toHaveLength(2);

    useChipStore.getState().queueDialogue([entry('beat-1', 'First.'), entry('beat-2', 'Second.')]);
    useChipStore.getState().showWeeklyDialogue(entry('chip.weekly.cleanWin', 'Solo.', true));
    expect(useChipStore.getState().dialogueQueue).toEqual([]);
    expect(useChipStore.getState().dialogueQueueTotal).toBe(0);
    expect(useChipStore.getState().lastConversation).toBeNull();
  });

  it('ignores an empty queue call', () => {
    useChipStore.getState().reset();
    useChipStore.getState().showWeeklyDialogue(entry('chip.weekly.cleanWin', 'Solo.'));
    const before = useChipStore.getState().currentDialogueId;

    useChipStore.getState().queueDialogue([]);
    expect(useChipStore.getState().currentDialogueId).toBe(before);
    expect(useChipStore.getState().dialogueQueueTotal).toBe(0);
  });
});

describe('dialogue queue append (C13)', () => {
  function entry(id: string, text: string, withDetails = false) {
    return {
      id,
      beat: 0,
      pose: 'talk' as const,
      text,
      archetype: 'weekly' as const,
      contextDetails: withDetails ? ['Must Do: open Recap.'] : undefined,
    };
  }

  it('appends behind the active conversation without touching the current beat', () => {
    useChipStore.getState().reset();
    useChipStore.getState().queueDialogue([
      entry('active-1', 'Active reaction.'),
      entry('active-2', 'Active plan.', true),
    ]);

    useChipStore.getState().appendDialogueQueue([
      entry('stacked-1', 'Stacked reaction.'),
      entry('stacked-2', 'Stacked plan.', true),
    ]);
    const state = useChipStore.getState();

    expect(state.currentDialogueId).toBe('active-1');
    expect(state.currentDialogueText).toBe('Active reaction.');
    expect(state.dialogueQueue.map((beat) => beat.id)).toEqual(['active-2', 'stacked-1', 'stacked-2']);
    expect(state.dialogueQueueTotal).toBe(4);
    expect(state.lastConversation?.map((beat) => beat.id)).toEqual([
      'active-1',
      'active-2',
      'stacked-1',
      'stacked-2',
    ]);
    // The details panel stays with the active conversation's details beat.
    expect(state.lastWeeklyDialogue?.id).toBe('active-2');
  });

  it('moves the details panel when the user advances into an appended details beat', () => {
    useChipStore.getState().reset();
    useChipStore.getState().queueDialogue([
      entry('active-1', 'Active reaction.'),
      entry('active-2', 'Active plan.', true),
    ]);
    useChipStore.getState().appendDialogueQueue([
      entry('stacked-1', 'Stacked reaction.'),
      entry('stacked-2', 'Stacked plan.', true),
    ]);

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('active-2');
    expect(useChipStore.getState().lastWeeklyDialogue?.id).toBe('active-2');

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('stacked-1');
    // A reaction beat carries no details: the panel keeps the previous beat.
    expect(useChipStore.getState().lastWeeklyDialogue?.id).toBe('active-2');

    useChipStore.getState().advanceDialogueQueue();
    expect(useChipStore.getState().currentDialogueId).toBe('stacked-2');
    expect(useChipStore.getState().lastWeeklyDialogue?.id).toBe('stacked-2');
  });

  it('behaves like queueDialogue when nothing is active or Chip was dismissed', () => {
    useChipStore.getState().reset();
    useChipStore.getState().appendDialogueQueue([
      entry('fresh-1', 'Fresh reaction.'),
      entry('fresh-2', 'Fresh plan.', true),
    ]);
    let state = useChipStore.getState();
    expect(state.currentDialogueId).toBe('fresh-1');
    expect(state.dialogueQueue.map((beat) => beat.id)).toEqual(['fresh-2']);
    expect(state.dialogueQueueTotal).toBe(2);
    expect(state.lastWeeklyDialogue?.id).toBe('fresh-2');

    useChipStore.getState().dismiss();
    useChipStore.getState().appendDialogueQueue([
      entry('post-dismiss-1', 'After dismiss reaction.'),
      entry('post-dismiss-2', 'After dismiss plan.', true),
    ]);
    state = useChipStore.getState();
    expect(state.currentDialogueId).toBe('post-dismiss-1');
    expect(state.dialogueQueue.map((beat) => beat.id)).toEqual(['post-dismiss-2']);
    expect(state.dismissed).toBe(false);
  });

  it('ignores an empty append call', () => {
    useChipStore.getState().reset();
    useChipStore.getState().showWeeklyDialogue(entry('chip.weekly.cleanWin', 'Solo.', true));

    useChipStore.getState().appendDialogueQueue([]);
    expect(useChipStore.getState().currentDialogueId).toBe('chip.weekly.cleanWin');
    expect(useChipStore.getState().dialogueQueueTotal).toBe(0);
  });
});
