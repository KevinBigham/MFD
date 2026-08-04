import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { ChipPose } from '@mfd/design-system/components';
import type { ChipContext, DialogueCatalogEntry } from './dialogue/types';
import { readChipReadReceipts } from './readReceipts';

export type ChipPosePriority = 'routine' | 'celebrate' | 'sad' | 'warning';

export interface SetChipPoseOptions {
  durationMs?: number;
  nowMs?: number;
  fallbackPose?: ChipPose;
  priority?: ChipPosePriority;
}

export interface ChipState {
  pose: ChipPose;
  currentPose: ChipPose;
  poseSetAt: number | null;
  poseDurationMs: number;
  poseUntil: number | null;
  fallbackPose: ChipPose;
  posePriority: ChipPosePriority;
  currentDialogueId: string | null;
  currentDialogueText: string | null;
  lastWeeklyDialogue: DialogueCatalogEntry | null;
  /** B7: beats remaining after the current one in a queued conversation. */
  dialogueQueue: DialogueCatalogEntry[];
  /** B7: total beats in the active conversation (for "2 of 3" affordances). */
  dialogueQueueTotal: number;
  /** B7: the last full conversation, so Ask Chip replay can re-queue it. */
  lastConversation: DialogueCatalogEntry[] | null;
  spotlightTargetId: string | null;
  seenBeats: Set<string>;
  dismissed: boolean;
  beat: number;
  context: ChipContext;
}

export interface ShowDialogueOptions {
  pose?: ChipPose;
  context?: ChipContext;
}

export interface ChipActions {
  setPose: (pose: ChipPose, options?: number | SetChipPoseOptions) => void;
  setSpotlightTarget: (id: string | null) => void;
  markBeatSeen: (id: string) => void;
  hasSeenBeat: (id: string) => boolean;
  showDialogue: (dialogueId: string, options?: ShowDialogueOptions) => void;
  showWeeklyDialogue: (entry: DialogueCatalogEntry) => void;
  /** B7: show the first beat of a conversation and queue the rest. */
  queueDialogue: (entries: readonly DialogueCatalogEntry[]) => void;
  /** B7: advance to the next queued beat; no-op on an empty queue. */
  advanceDialogueQueue: () => void;
  /**
   * C13: append beats behind the active conversation instead of overwriting
   * it. With no active (or a dismissed) dialogue this behaves exactly like
   * `queueDialogue`.
   */
  appendDialogueQueue: (entries: readonly DialogueCatalogEntry[]) => void;
  advance: () => void;
  dismiss: () => void;
  reset: () => void;
}

export type ChipStore = ChipState & ChipActions;

const POSE_PRIORITY_RANK: Record<ChipPosePriority, number> = {
  routine: 0,
  celebrate: 1,
  sad: 2,
  warning: 3,
};

const POSE_TICK_MS = 250;

function normalizePoseOptions(options: number | SetChipPoseOptions | undefined): Required<SetChipPoseOptions> {
  if (typeof options === 'number') {
    return {
      durationMs: Math.max(0, Math.trunc(options)),
      nowMs: 0,
      fallbackPose: 'idle',
      priority: 'routine',
    };
  }

  return {
    durationMs: Math.max(0, Math.trunc(options?.durationMs ?? 0)),
    nowMs: Number.isFinite(options?.nowMs) ? Number(options?.nowMs) : 0,
    fallbackPose: options?.fallbackPose ?? 'idle',
    priority: options?.priority ?? 'routine',
  };
}

function resetPoseWindow(pose: ChipPose): Pick<
  ChipState,
  'pose' | 'currentPose' | 'poseSetAt' | 'poseDurationMs' | 'poseUntil' | 'fallbackPose' | 'posePriority'
> {
  return {
    pose,
    currentPose: pose,
    poseSetAt: null,
    poseDurationMs: 0,
    poseUntil: null,
    fallbackPose: 'idle',
    posePriority: 'routine',
  };
}

export function resolveCurrentChipPose(
  state: Pick<ChipState, 'currentPose' | 'poseUntil' | 'fallbackPose'>,
  nowMs: number,
): ChipPose {
  if (state.poseUntil !== null && nowMs >= state.poseUntil) {
    return state.fallbackPose;
  }
  return state.currentPose;
}

function createInitialChipState(): ChipState {
  return {
    pose: 'idle',
    currentPose: 'idle',
    poseSetAt: null,
    poseDurationMs: 0,
    poseUntil: null,
    fallbackPose: 'idle',
    posePriority: 'routine',
    currentDialogueId: null,
    currentDialogueText: null,
    lastWeeklyDialogue: null,
    dialogueQueue: [],
    dialogueQueueTotal: 0,
    lastConversation: null,
    spotlightTargetId: null,
    seenBeats: readChipReadReceipts(),
    dismissed: false,
    beat: 0,
    context: 'idle',
  };
}

export const useChipStore = create<ChipStore>((set, get) => ({
  ...createInitialChipState(),
  setPose: (pose, options) =>
    set((state) => {
      const normalized = normalizePoseOptions(options);
      if (normalized.durationMs <= 0) {
        return resetPoseWindow(pose);
      }

      const activePriority =
        state.poseUntil !== null && normalized.nowMs < state.poseUntil
          ? state.posePriority
          : 'routine';

      if (POSE_PRIORITY_RANK[normalized.priority] < POSE_PRIORITY_RANK[activePriority]) {
        return state;
      }

      return {
        pose,
        currentPose: pose,
        poseSetAt: normalized.nowMs,
        poseDurationMs: normalized.durationMs,
        poseUntil: normalized.nowMs + normalized.durationMs,
        fallbackPose: normalized.fallbackPose,
        posePriority: normalized.priority,
      };
    }),
  setSpotlightTarget: (spotlightTargetId) =>
    set((state) => (state.spotlightTargetId === spotlightTargetId ? state : { spotlightTargetId })),
  markBeatSeen: (id) =>
    set((state) => (state.seenBeats.has(id) ? state : { seenBeats: new Set([...state.seenBeats, id]) })),
  hasSeenBeat: (id) => get().seenBeats.has(id),
  showDialogue: (dialogueId, options = {}) =>
    set((state) => ({
      currentDialogueId: dialogueId,
      currentDialogueText: null,
      dialogueQueue: [],
      dialogueQueueTotal: 0,
      ...resetPoseWindow(options.pose ?? state.currentPose),
      context: options.context ?? 'event',
      dismissed: false,
    })),
  showWeeklyDialogue: (entry) =>
    set({
      currentDialogueId: entry.id,
      currentDialogueText: entry.text,
      lastWeeklyDialogue: entry,
      dialogueQueue: [],
      dialogueQueueTotal: 0,
      lastConversation: null,
      ...resetPoseWindow(entry.pose),
      context: 'event',
      dismissed: false,
    }),
  queueDialogue: (entries) =>
    set((state) => {
      const first = entries[0];
      if (!first) return state;
      // The details panel and Ask Chip replay read lastWeeklyDialogue, so it
      // tracks the beat carrying contextDetails, not whichever beat is showing.
      const detailBeat = entries.find((entry) => entry.contextDetails?.length) ?? first;
      return {
        currentDialogueId: first.id,
        currentDialogueText: first.text,
        lastWeeklyDialogue: detailBeat,
        dialogueQueue: entries.slice(1),
        dialogueQueueTotal: entries.length,
        lastConversation: [...entries],
        ...resetPoseWindow(first.pose),
        context: 'event',
        dismissed: false,
      };
    }),
  appendDialogueQueue: (entries) =>
    set((state) => {
      const first = entries[0];
      if (!first) return state;
      // C13: with nothing active (or after a dismiss) an append is just a
      // fresh conversation — identical semantics to queueDialogue.
      if (!state.currentDialogueId || state.dismissed) {
        const detailBeat = entries.find((entry) => entry.contextDetails?.length) ?? first;
        return {
          currentDialogueId: first.id,
          currentDialogueText: first.text,
          lastWeeklyDialogue: detailBeat,
          dialogueQueue: entries.slice(1),
          dialogueQueueTotal: entries.length,
          lastConversation: [...entries],
          ...resetPoseWindow(first.pose),
          context: 'event' as const,
          dismissed: false,
        };
      }
      // The active beat keeps showing; the incoming conversation waits in
      // line. The details panel stays with the active conversation's details
      // beat until the user advances into the appended beats (see
      // advanceDialogueQueue).
      return {
        dialogueQueue: [...state.dialogueQueue, ...entries],
        dialogueQueueTotal: state.dialogueQueueTotal + entries.length,
        lastConversation: [...(state.lastConversation ?? []), ...entries],
      };
    }),
  advanceDialogueQueue: () =>
    set((state) => {
      const next = state.dialogueQueue[0];
      if (!next) return state;
      return {
        currentDialogueId: next.id,
        currentDialogueText: next.text,
        dialogueQueue: state.dialogueQueue.slice(1),
        // C13: when the beat being advanced into carries the details, the
        // panel follows it — identical to the queue-time pick for B7
        // conversations, and what makes appended conversations coherent.
        ...(next.contextDetails?.length ? { lastWeeklyDialogue: next } : {}),
        ...resetPoseWindow(next.pose),
        context: 'event',
        dismissed: false,
      };
    }),
  advance: () =>
    set((state) => ({
      beat: state.beat + 1,
      context: state.context === 'dismissed' ? 'dismissed' : 'onboarding',
    })),
  dismiss: () =>
    set({
      currentDialogueId: null,
      currentDialogueText: null,
      dialogueQueue: [],
      dialogueQueueTotal: 0,
      dismissed: true,
      context: 'dismissed',
    }),
  reset: () => set(createInitialChipState()),
}));

function readUiNowMs(): number {
  return typeof Date.now === 'function' ? Date.now() : 0;
}

/**
 * Publish gate for the pose ticker. Hidden tabs stop publishing entirely (the
 * rAF loop still runs, but no state churn reaches React), and visible tabs
 * publish at most once per POSE_TICK_MS.
 */
export function shouldPublishPoseTick({
  hidden,
  nextNowMs,
  lastPublishedMs,
}: {
  hidden: boolean;
  nextNowMs: number;
  lastPublishedMs: number;
}): boolean {
  if (hidden) return false;
  return nextNowMs - lastPublishedMs >= POSE_TICK_MS;
}

export function useChipPoseNow(): number {
  const [nowMs, setNowMs] = useState(readUiNowMs);
  const lastPublishedMs = useRef(nowMs);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return undefined;
    }

    let frameHandle = 0;
    const tick = () => {
      const nextNowMs = readUiNowMs();
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (shouldPublishPoseTick({ hidden, nextNowMs, lastPublishedMs: lastPublishedMs.current })) {
        lastPublishedMs.current = nextNowMs;
        setNowMs(nextNowMs);
      }
      frameHandle = window.requestAnimationFrame(tick);
    };

    frameHandle = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  }, []);

  return nowMs;
}

export function useResolvedChipPose(): ChipPose {
  const nowMs = useChipPoseNow();
  useChipStore((state) => state.currentPose);
  return resolveCurrentChipPose(useChipStore.getState(), nowMs);
}
