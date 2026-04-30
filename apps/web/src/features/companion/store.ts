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
      ...resetPoseWindow(options.pose ?? state.currentPose),
      context: options.context ?? 'event',
      dismissed: false,
    })),
  showWeeklyDialogue: (entry) =>
    set({
      currentDialogueId: entry.id,
      currentDialogueText: entry.text,
      lastWeeklyDialogue: entry,
      ...resetPoseWindow(entry.pose),
      context: 'event',
      dismissed: false,
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
      dismissed: true,
      context: 'dismissed',
    }),
  reset: () => set(createInitialChipState()),
}));

function readUiNowMs(): number {
  return typeof Date.now === 'function' ? Date.now() : 0;
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
      if (nextNowMs - lastPublishedMs.current >= POSE_TICK_MS) {
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
