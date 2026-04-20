export const AUDIO_CATEGORIES = ['ui', 'sfx', 'ambient'] as const;

export type AudioCategory = (typeof AUDIO_CATEGORIES)[number];

export interface AudioCategoryPreferences {
  enabled: boolean;
  volume: number;
}

export interface AudioPreferences {
  masterEnabled: boolean;
  categories: Record<AudioCategory, AudioCategoryPreferences>;
}

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  masterEnabled: true,
  categories: {
    ui: { enabled: true, volume: 80 },
    sfx: { enabled: true, volume: 85 },
    ambient: { enabled: true, volume: 55 },
  },
};

export function clampAudioVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0;
  return Math.max(0, Math.min(100, Math.round(volume)));
}

export function normalizeAudioPreferences(
  input: Partial<AudioPreferences> | null | undefined,
): AudioPreferences {
  const categories = input?.categories;

  return {
    masterEnabled: input?.masterEnabled ?? DEFAULT_AUDIO_PREFERENCES.masterEnabled,
    categories: {
      ui: {
        enabled: categories?.ui?.enabled ?? DEFAULT_AUDIO_PREFERENCES.categories.ui.enabled,
        volume: clampAudioVolume(categories?.ui?.volume ?? DEFAULT_AUDIO_PREFERENCES.categories.ui.volume),
      },
      sfx: {
        enabled: categories?.sfx?.enabled ?? DEFAULT_AUDIO_PREFERENCES.categories.sfx.enabled,
        volume: clampAudioVolume(categories?.sfx?.volume ?? DEFAULT_AUDIO_PREFERENCES.categories.sfx.volume),
      },
      ambient: {
        enabled: categories?.ambient?.enabled ?? DEFAULT_AUDIO_PREFERENCES.categories.ambient.enabled,
        volume: clampAudioVolume(categories?.ambient?.volume ?? DEFAULT_AUDIO_PREFERENCES.categories.ambient.volume),
      },
    },
  };
}
