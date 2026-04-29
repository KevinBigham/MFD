import { create } from 'zustand';
import type { ChipPose } from '@mfd/design-system/components';
import type { ChipContext } from './dialogue/types';

export interface ChipState {
  pose: ChipPose;
  currentDialogueId: string | null;
  dismissed: boolean;
  beat: number;
  context: ChipContext;
}

export interface ShowDialogueOptions {
  pose?: ChipPose;
  context?: ChipContext;
}

export interface ChipActions {
  setPose: (pose: ChipPose) => void;
  showDialogue: (dialogueId: string, options?: ShowDialogueOptions) => void;
  advance: () => void;
  dismiss: () => void;
  reset: () => void;
}

export type ChipStore = ChipState & ChipActions;

const initialState: ChipState = {
  pose: 'idle',
  currentDialogueId: null,
  dismissed: false,
  beat: 0,
  context: 'idle',
};

export const useChipStore = create<ChipStore>((set) => ({
  ...initialState,
  setPose: (pose) => set({ pose }),
  showDialogue: (dialogueId, options = {}) =>
    set((state) => ({
      currentDialogueId: dialogueId,
      pose: options.pose ?? state.pose,
      context: options.context ?? 'event',
      dismissed: false,
    })),
  advance: () =>
    set((state) => ({
      beat: state.beat + 1,
      context: state.context === 'dismissed' ? 'dismissed' : 'onboarding',
    })),
  dismiss: () =>
    set({
      currentDialogueId: null,
      dismissed: true,
      context: 'dismissed',
    }),
  reset: () => set(initialState),
}));
