import type { ChipPose } from '@mfd/design-system/components';

export const MAX_CHIP_DIALOGUE_CHARS = 240;

export const CHIP_CONTEXTS = ['onboarding', 'idle', 'event', 'dismissed'] as const;
export type ChipContext = (typeof CHIP_CONTEXTS)[number];

export type DialogueArchetype = 'host';

export interface DialogueCatalogEntry {
  id: string;
  beat: number;
  pose: ChipPose;
  text: string;
  archetype: DialogueArchetype;
  cooldownMs?: number;
  anchor?: boolean;
}

const CHIP_DIALOGUE_POSES = [
  'idle',
  'talk',
  'point-left',
  'point-right',
  'wave',
  'think',
  'celebrate',
  'concern',
  'mic-check',
] as const satisfies readonly ChipPose[];

export function isChipContext(value: unknown): value is ChipContext {
  return typeof value === 'string' && CHIP_CONTEXTS.includes(value as ChipContext);
}

function isChipPose(value: unknown): value is ChipPose {
  return typeof value === 'string' && CHIP_DIALOGUE_POSES.includes(value as ChipPose);
}

export function assertDialogueEntry(entry: DialogueCatalogEntry): DialogueCatalogEntry {
  if (!entry.id) throw new Error('Chip dialogue entries require a stable id.');
  if (!Number.isInteger(entry.beat) || entry.beat < 1) {
    throw new Error('Chip dialogue entries require a one-based beat number.');
  }
  if (!isChipPose(entry.pose)) throw new Error(`Unsupported Chip pose: ${String(entry.pose)}`);
  if (entry.text.length > MAX_CHIP_DIALOGUE_CHARS) {
    throw new Error(`Chip dialogue text must be ${MAX_CHIP_DIALOGUE_CHARS} characters or fewer.`);
  }
  if (entry.archetype !== 'host') throw new Error(`Unsupported Chip archetype: ${entry.archetype}`);
  return entry;
}

export function isDialogueCatalogEntry(value: unknown): value is DialogueCatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as DialogueCatalogEntry;
  try {
    assertDialogueEntry(entry);
    return true;
  } catch {
    return false;
  }
}
