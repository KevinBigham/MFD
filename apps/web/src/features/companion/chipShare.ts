export const CHIP_SHARE_FLAG = 'VITE_MFD_SHARE_ENABLED';

type ChipShareEnv = Record<string, string | boolean | undefined>;

export const CHIP_SHARE_EVENT_TYPES = [
  'weekly_recap',
  'big_trade',
  'draft_steal',
  'rivalry_win',
  'playoff_clinch',
  'championship',
  'hall_of_fame',
  'record_milestone',
] as const;

export type ChipShareEventType = (typeof CHIP_SHARE_EVENT_TYPES)[number];

export interface ChipShareEventInput {
  type: ChipShareEventType;
  teamName: string;
  season: number;
  week: number;
  headline: string;
  summary: string;
  occurredAt: string;
  result?: string;
  stakes?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ChipShareEventPayload extends ChipShareEventInput {
  id: string;
  title: string;
  copyText: string;
  cardLines: string[];
  externalTargets: [];
}

export interface ChipShareService {
  isEnabled: () => boolean;
  create: (input: ChipShareEventInput) => ChipShareEventPayload | null;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'franchise-moment';
}

function weekLabel(input: Pick<ChipShareEventInput, 'week'>): string {
  return input.week > 0 ? `Week ${input.week}` : 'Offseason';
}

export function isMfdShareEnabled(env: ChipShareEnv = import.meta.env): boolean {
  return env[CHIP_SHARE_FLAG] === 'true' || env[CHIP_SHARE_FLAG] === true;
}

export function generateChipShareEvent(input: ChipShareEventInput): ChipShareEventPayload {
  const title = `${input.teamName} // ${weekLabel(input)}`;
  const stakes = input.stakes?.filter((line) => line.trim().length > 0) ?? [];
  const cardLines = [
    title,
    input.headline,
    input.summary,
    ...stakes.slice(0, 3),
  ];

  return {
    ...input,
    id: `mfd-share:${input.type}:${input.season}:${input.week}:${slug(input.headline)}`,
    title,
    copyText: `${title}\n${input.headline}\n${input.summary}`,
    cardLines,
    externalTargets: [],
  };
}

export function createChipShareService(options: { env?: ChipShareEnv } = {}): ChipShareService {
  const enabled = isMfdShareEnabled(options.env ?? import.meta.env);
  return {
    isEnabled: () => enabled,
    create: (input) => (enabled ? generateChipShareEvent(input) : null),
  };
}
