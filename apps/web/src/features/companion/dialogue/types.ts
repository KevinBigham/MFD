import type { ChipPose } from '@mfd/design-system/components';

export const MAX_CHIP_DIALOGUE_CHARS = 240;

export const CHIP_CONTEXTS = ['onboarding', 'idle', 'event', 'dismissed'] as const;
export type ChipContext = (typeof CHIP_CONTEXTS)[number];

export type DialogueArchetype = 'host' | 'weekly';

export interface DialogueCatalogEntry {
  id: string;
  beat: number;
  pose: ChipPose;
  text: string;
  contextDetails?: string[];
  archetype: DialogueArchetype;
  reducedMotionPose?: ChipPose;
  cooldownMs?: number;
  priority?: 1 | 2 | 3 | 4 | 5;
  anchor?: boolean;
}

const CHIP_DIALOGUE_POSES = [
  'idle',
  'greeting',
  'talk',
  'point-left',
  'point-right',
  'wave',
  'think',
  'celebrate',
  'concern',
  'warning',
  'surprised',
  'mic-check',
  'thumbs-up',
] as const satisfies readonly ChipPose[];

export function isChipContext(value: unknown): value is ChipContext {
  return typeof value === 'string' && CHIP_CONTEXTS.includes(value as ChipContext);
}

function isChipPose(value: unknown): value is ChipPose {
  return typeof value === 'string' && CHIP_DIALOGUE_POSES.includes(value as ChipPose);
}

export function assertDialogueEntry(entry: DialogueCatalogEntry): DialogueCatalogEntry {
  if (!entry.id) throw new Error('Chip dialogue entries require a stable id.');
  if (entry.archetype !== 'host' && entry.archetype !== 'weekly') {
    throw new Error(`Unsupported Chip archetype: ${entry.archetype}`);
  }
  if (entry.archetype === 'host' && (!Number.isInteger(entry.beat) || entry.beat < 1)) {
    throw new Error('Chip dialogue entries require a one-based beat number.');
  }
  if (entry.archetype !== 'host' && (!Number.isInteger(entry.beat) || entry.beat < 0)) {
    throw new Error('Chip non-onboarding dialogue entries require a zero-based beat number.');
  }
  if (!isChipPose(entry.pose)) throw new Error(`Unsupported Chip pose: ${String(entry.pose)}`);
  if (entry.reducedMotionPose !== undefined && !isChipPose(entry.reducedMotionPose)) {
    throw new Error(`Unsupported Chip reduced-motion pose: ${String(entry.reducedMotionPose)}`);
  }
  if (entry.text.length > MAX_CHIP_DIALOGUE_CHARS) {
    throw new Error(`Chip dialogue text must be ${MAX_CHIP_DIALOGUE_CHARS} characters or fewer.`);
  }
  if (
    entry.contextDetails !== undefined
    && (
      !Array.isArray(entry.contextDetails)
      || entry.contextDetails.some((detail) => typeof detail !== 'string' || detail.trim().length === 0)
    )
  ) {
    throw new Error('Chip dialogue context details must be non-empty strings.');
  }
  if (entry.priority !== undefined && (!Number.isInteger(entry.priority) || entry.priority < 1 || entry.priority > 5)) {
    throw new Error('Chip dialogue priority must be an integer from 1 to 5.');
  }
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
