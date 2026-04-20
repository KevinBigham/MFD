import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { AudioCue, SoundEvent } from '@mfd/engine';
import { useUiStore } from '../../app/store/ui-store';
import {
  DEFAULT_AUDIO_PREFERENCES,
  type AudioCategory,
  type AudioPreferences,
} from '../../app/store/audio-preferences';
import {
  playAchievementUnlocked,
  playBigPlay,
  playDraftPick,
  playFieldGoal,
  playFreeAgentSigned,
  playGameEnd,
  playGameStart,
  playHalftime,
  playInjury,
  playNavigate,
  playNotification,
  playOpenPanel,
  playOvertime,
  playPlayerCut,
  playPlayoffClinch,
  playPlayoffElimination,
  playRecordBroken,
  playSack,
  playSeasonEnd,
  playSuperBowlLoss,
  playSuperBowlWin,
  playTouchdown,
  playTradeComplete,
  playTradeRejected,
  playTurnover,
  playWeekAdvanceComplete,
  playWeekAdvanceStart,
  playClick,
} from './synth-sounds';

export type AmbientMode = 'off' | 'crowd' | 'office';

interface AudioGraph {
  ctx: AudioContext;
  masterGain: GainNode;
  categoryGains: Record<AudioCategory, GainNode>;
}

interface PlaySoundOptions {
  debounceKey?: string;
  debounceMs?: number;
}

type SoundFn = (ctx: AudioContext, output?: AudioNode) => void;

const SOUND_EVENT_TO_CATEGORY: Record<SoundEvent, AudioCategory> = {
  ui_click: 'ui',
  ui_navigate: 'ui',
  ui_open_panel: 'ui',
  ui_close_panel: 'ui',
  notification: 'ui',
  week_advance_start: 'sfx',
  week_advance_complete: 'sfx',
  touchdown: 'sfx',
  field_goal: 'sfx',
  turnover: 'sfx',
  sack: 'sfx',
  big_play: 'sfx',
  injury: 'sfx',
  game_start: 'sfx',
  game_end: 'sfx',
  halftime: 'sfx',
  overtime: 'sfx',
  draft_pick: 'sfx',
  trade_complete: 'sfx',
  trade_rejected: 'sfx',
  free_agent_signed: 'sfx',
  contract_signed: 'sfx',
  player_cut: 'sfx',
  season_end: 'sfx',
  super_bowl_win: 'sfx',
  super_bowl_loss: 'sfx',
  playoff_clinch: 'sfx',
  playoff_elimination: 'sfx',
  record_broken: 'sfx',
  achievement_unlocked: 'sfx',
  training_camp_start: 'sfx',
  roster_cut: 'sfx',
  coaching_hire: 'sfx',
  coaching_fire: 'sfx',
};

const SOUND_MAP: Record<SoundEvent, SoundFn> = {
  ui_click: playClick,
  ui_navigate: playNavigate,
  ui_open_panel: playOpenPanel,
  ui_close_panel: playNavigate,
  notification: playNotification,
  week_advance_start: playWeekAdvanceStart,
  week_advance_complete: playWeekAdvanceComplete,
  touchdown: playTouchdown,
  field_goal: playFieldGoal,
  turnover: playTurnover,
  sack: playSack,
  big_play: playBigPlay,
  injury: playInjury,
  game_start: playGameStart,
  game_end: playGameEnd,
  halftime: playHalftime,
  overtime: playOvertime,
  draft_pick: playDraftPick,
  trade_complete: playTradeComplete,
  trade_rejected: playTradeRejected,
  free_agent_signed: playFreeAgentSigned,
  contract_signed: playFreeAgentSigned,
  player_cut: playPlayerCut,
  season_end: playSeasonEnd,
  super_bowl_win: playSuperBowlWin,
  super_bowl_loss: playSuperBowlLoss,
  playoff_clinch: playPlayoffClinch,
  playoff_elimination: playPlayoffElimination,
  record_broken: playRecordBroken,
  achievement_unlocked: playAchievementUnlocked,
  training_camp_start: playWeekAdvanceStart,
  roster_cut: playPlayerCut,
  coaching_hire: playTradeComplete,
  coaching_fire: playTradeRejected,
};

const CROWD_PATHS = new Set(['/broadcast', '/play-by-play', '/game-flow', '/game-day', '/super-bowl']);
const OFFICE_PATH_PREFIXES = ['/roster', '/scouting'];
const DEFAULT_DEBOUNCE_MS = 180;
const CROWD_LOOP_MS = 3200;
const OFFICE_LOOP_MS = 4600;
// Sprint 53: cap the debounce-tracking map so it can't grow unbounded over a
// long-lived tab. The web app emits ~30 distinct cue keys today; 256 leaves
// generous headroom while still bounding worst-case memory.
const RECENT_PLAYBACK_MAX_KEYS = 256;

// Module-scoped audio singletons by design — the AudioContext, ambient loop
// handle, and current-mode flags are tab-lifetime resources. The lazy `if
// (!audioGraph)` guard in ensureAudioGraph correctly handles React strict-mode
// double-mount, and ambientLoopHandle is always cleared before re-set.
let audioGraph: AudioGraph | null = null;
let currentPreferences: AudioPreferences = DEFAULT_AUDIO_PREFERENCES;
let currentAmbientMode: AmbientMode = 'off';
let activeAmbientMode: AmbientMode = 'off';
let ambientLoopHandle: ReturnType<typeof setInterval> | null = null;
const recentPlayback = new Map<string, number>();

function createCategoryGain(ctx: AudioContext, masterGain: GainNode): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(masterGain);
  return gain;
}

function ensureAudioGraph(): AudioGraph {
  if (!audioGraph) {
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    audioGraph = {
      ctx,
      masterGain,
      categoryGains: {
        ui: createCategoryGain(ctx, masterGain),
        sfx: createCategoryGain(ctx, masterGain),
        ambient: createCategoryGain(ctx, masterGain),
      },
    };
  }

  if (audioGraph.ctx.state === 'suspended') {
    void audioGraph.ctx.resume();
  }

  applyPreferencesToGraph();
  return audioGraph;
}

function applyPreferencesToGraph(): void {
  if (!audioGraph) return;

  audioGraph.masterGain.gain.value = currentPreferences.masterEnabled ? 1 : 0;

  for (const category of Object.keys(audioGraph.categoryGains) as AudioCategory[]) {
    const config = currentPreferences.categories[category];
    audioGraph.categoryGains[category].gain.value = config.enabled ? config.volume / 100 : 0;
  }
}

function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

function shouldPlayCategory(category: AudioCategory): boolean {
  if (!currentPreferences.masterEnabled) return false;
  const config = currentPreferences.categories[category];
  return config.enabled && config.volume > 0;
}

function buildPlaybackKey(event: SoundEvent, options?: PlaySoundOptions): string {
  return options?.debounceKey ?? event;
}

function shouldDebounce(key: string, debounceMs: number): boolean {
  if (debounceMs <= 0) return false;
  const lastPlayedAt = recentPlayback.get(key);
  const now = Date.now();
  if (typeof lastPlayedAt === 'number' && now - lastPlayedAt < debounceMs) {
    return true;
  }
  // Sprint 53: bound map size with FIFO eviction to prevent unbounded growth
  // across long-lived tabs. Map preserves insertion order, so deleting the
  // first key drops the oldest entry. We delete on hit-replace too (delete +
  // set) so the touched key moves to the back of the queue.
  if (recentPlayback.has(key)) {
    recentPlayback.delete(key);
  } else if (recentPlayback.size >= RECENT_PLAYBACK_MAX_KEYS) {
    const oldestKey = recentPlayback.keys().next().value;
    if (oldestKey !== undefined) recentPlayback.delete(oldestKey);
  }
  recentPlayback.set(key, now);
  return false;
}

function playAmbientLayer(
  ctx: AudioContext,
  output: AudioNode,
  frequencies: number[],
  duration: number,
  volume: number,
  type: OscillatorType,
): void {
  frequencies.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume / (index + 1);
    oscillator.connect(gain);
    gain.connect(output);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  });
}

function playCrowdAmbientPulse(ctx: AudioContext, output: AudioNode): void {
  playAmbientLayer(ctx, output, [180, 262, 392], 1.2, 0.03, 'triangle');
  setTimeout(() => playAmbientLayer(ctx, output, [330, 494], 0.5, 0.02, 'sine'), 550);
}

function playOfficeAmbientPulse(ctx: AudioContext, output: AudioNode): void {
  playAmbientLayer(ctx, output, [110, 220], 1.8, 0.025, 'sine');
  setTimeout(() => playAmbientLayer(ctx, output, [440], 0.35, 0.01, 'triangle'), 1100);
}

function stopAmbientLoop(): void {
  if (ambientLoopHandle) {
    clearInterval(ambientLoopHandle);
    ambientLoopHandle = null;
  }
  activeAmbientMode = 'off';
}

function startAmbientLoop(mode: Exclude<AmbientMode, 'off'>): void {
  stopAmbientLoop();

  if (!shouldPlayCategory('ambient') || !isDocumentVisible()) {
    return;
  }

  const { ctx, categoryGains } = ensureAudioGraph();
  const output = categoryGains.ambient;
  const loopMs = mode === 'crowd' ? CROWD_LOOP_MS : OFFICE_LOOP_MS;
  const playPulse = mode === 'crowd'
    ? () => playCrowdAmbientPulse(ctx, output)
    : () => playOfficeAmbientPulse(ctx, output);

  playPulse();
  ambientLoopHandle = setInterval(playPulse, loopMs);
  activeAmbientMode = mode;
}

function syncAmbientLoop(): void {
  if (currentAmbientMode === 'off') {
    stopAmbientLoop();
    return;
  }

  if (!shouldPlayCategory('ambient') || !isDocumentVisible()) {
    stopAmbientLoop();
    return;
  }

  if (activeAmbientMode !== currentAmbientMode || !ambientLoopHandle) {
    startAmbientLoop(currentAmbientMode);
  }
}

function stableMetadata(metadata: AudioCue['metadata'] | undefined): string {
  if (!metadata) return '';
  const entries = Object.entries(metadata)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value)}`);
  return entries.join('|');
}

export function resolveAmbientModeForPath(pathname: string): AmbientMode {
  if (CROWD_PATHS.has(pathname)) return 'crowd';
  if (OFFICE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'office';
  return 'off';
}

export function syncAudioPreferences(preferences: AudioPreferences): void {
  currentPreferences = preferences;
  applyPreferencesToGraph();
  syncAmbientLoop();
}

export function initializeAudioOnInteraction(): void {
  try {
    ensureAudioGraph();
  } catch {
    // Silent fail on unsupported browsers.
  }
}

export function playSound(event: SoundEvent, options?: PlaySoundOptions): void {
  const category = SOUND_EVENT_TO_CATEGORY[event];
  if (!shouldPlayCategory(category)) return;

  const debounceKey = buildPlaybackKey(event, options);
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  if (shouldDebounce(debounceKey, debounceMs)) return;

  try {
    const { ctx, categoryGains } = ensureAudioGraph();
    SOUND_MAP[event](ctx, categoryGains[category]);
  } catch {
    // Silent fail on unsupported browsers or SSR.
  }
}

export function playAudioCueQueue(cues: AudioCue[]): void {
  if (cues.length === 0) return;

  const queueKey = cues
    .map((cue) => `${cue.event}:${stableMetadata(cue.metadata)}`)
    .join('>');

  cues.forEach((cue, index) => {
    playSound(cue.event, {
      debounceKey: `${queueKey}:${index}`,
      debounceMs: cue.priority === 'critical' ? 0 : DEFAULT_DEBOUNCE_MS,
    });
  });
}

export function setAmbientMode(mode: AmbientMode): void {
  currentAmbientMode = mode;
  syncAmbientLoop();
}

export function notifyVisibilityChange(): void {
  syncAmbientLoop();
}

export function getAudioControllerSnapshot(): {
  ambientMode: AmbientMode;
  activeAmbientMode: AmbientMode;
  preferences: AudioPreferences;
  recentPlaybackSize: number;
  recentPlaybackMaxKeys: number;
} {
  return {
    ambientMode: currentAmbientMode,
    activeAmbientMode,
    preferences: currentPreferences,
    recentPlaybackSize: recentPlayback.size,
    recentPlaybackMaxKeys: RECENT_PLAYBACK_MAX_KEYS,
  };
}

export function resetAudioControllerForTests(): void {
  stopAmbientLoop();
  recentPlayback.clear();
  currentPreferences = DEFAULT_AUDIO_PREFERENCES;
  currentAmbientMode = 'off';
  const closable = audioGraph?.ctx as (AudioContext & { close?: () => Promise<void> | void }) | undefined;
  if (closable?.close) {
    void closable.close();
  }
  audioGraph = null;
}

export interface AudioControls {
  play: (event: SoundEvent, options?: PlaySoundOptions) => void;
  playCueQueue: (cues: AudioCue[]) => void;
  muted: boolean;
  masterEnabled: boolean;
  toggleMute: () => void;
  categories: AudioPreferences['categories'];
  setAudioMasterEnabled: (enabled: boolean) => void;
  setAudioCategoryEnabled: (category: AudioCategory, enabled: boolean) => void;
  setAudioCategoryVolume: (category: AudioCategory, volume: number) => void;
}

export function useAudio(): AudioControls {
  const audioPreferences = useUiStore((state) => state.audioPreferences);
  const setAudioMasterEnabled = useUiStore((state) => state.setAudioMasterEnabled);
  const toggleAudioMasterEnabled = useUiStore((state) => state.toggleAudioMasterEnabled);
  const setAudioCategoryEnabled = useUiStore((state) => state.setAudioCategoryEnabled);
  const setAudioCategoryVolume = useUiStore((state) => state.setAudioCategoryVolume);

  return {
    play: playSound,
    playCueQueue: playAudioCueQueue,
    muted: !audioPreferences.masterEnabled,
    masterEnabled: audioPreferences.masterEnabled,
    toggleMute: toggleAudioMasterEnabled,
    categories: audioPreferences.categories,
    setAudioMasterEnabled,
    setAudioCategoryEnabled,
    setAudioCategoryVolume,
  };
}

export function AudioController() {
  const audioPreferences = useUiStore((state) => state.audioPreferences);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    syncAudioPreferences(audioPreferences);
  }, [audioPreferences]);

  useEffect(() => {
    setAmbientMode(resolveAmbientModeForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    const initialize = () => initializeAudioOnInteraction();
    const handleVisibilityChange = () => notifyVisibilityChange();

    window.addEventListener('pointerdown', initialize);
    window.addEventListener('keydown', initialize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointerdown', initialize);
      window.removeEventListener('keydown', initialize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setAmbientMode('off');
    };
  }, []);

  return null;
}

export function AudioToggle() {
  const masterEnabled = useUiStore((state) => state.audioPreferences.masterEnabled);
  const toggleAudioMasterEnabled = useUiStore((state) => state.toggleAudioMasterEnabled);

  return (
    <button
      type="button"
      onClick={toggleAudioMasterEnabled}
      title={masterEnabled ? 'Mute audio' : 'Enable audio'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        background: 'none',
        border: `2px solid ${masterEnabled ? 'var(--mfd-green)' : 'var(--mfd-text-faint)'}`,
        color: masterEnabled ? 'var(--mfd-green)' : 'var(--mfd-text-faint)',
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '10px',
        cursor: 'pointer',
      }}
    >
      {masterEnabled ? 'S' : 'M'}
    </button>
  );
}
