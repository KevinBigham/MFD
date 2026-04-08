/**
 * AudioManager — singleton audio context manager for MFD.
 *
 * Provides a React hook (useAudio) and a global playSound() function.
 * Uses Web Audio API with procedural synthesis — no external files needed.
 * Respects user mute preference stored in localStorage.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  playClick,
  playNavigate,
  playOpenPanel,
  playNotification,
  playWeekAdvanceStart,
  playWeekAdvanceComplete,
  playTouchdown,
  playFieldGoal,
  playTurnover,
  playSack,
  playBigPlay,
  playInjury,
  playGameStart,
  playGameEnd,
  playHalftime,
  playOvertime,
  playDraftPick,
  playTradeComplete,
  playTradeRejected,
  playFreeAgentSigned,
  playPlayerCut,
  playSeasonEnd,
  playSuperBowlWin,
  playSuperBowlLoss,
  playPlayoffClinch,
  playPlayoffElimination,
  playRecordBroken,
  playAchievementUnlocked,
} from './synth-sounds';

// ── Sound event type ───────────────────────────────────

export type SoundEvent =
  | 'ui_click'
  | 'ui_navigate'
  | 'ui_open_panel'
  | 'notification'
  | 'week_advance_start'
  | 'week_advance_complete'
  | 'touchdown'
  | 'field_goal'
  | 'turnover'
  | 'sack'
  | 'big_play'
  | 'injury'
  | 'game_start'
  | 'game_end'
  | 'halftime'
  | 'overtime'
  | 'draft_pick'
  | 'trade_complete'
  | 'trade_rejected'
  | 'free_agent_signed'
  | 'player_cut'
  | 'season_end'
  | 'super_bowl_win'
  | 'super_bowl_loss'
  | 'playoff_clinch'
  | 'playoff_elimination'
  | 'record_broken'
  | 'achievement_unlocked';

// ── Sound dispatch map ─────────────────────────────────

type SoundFn = (ctx: AudioContext) => void;

const SOUND_MAP: Record<SoundEvent, SoundFn> = {
  ui_click: playClick,
  ui_navigate: playNavigate,
  ui_open_panel: playOpenPanel,
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
  player_cut: playPlayerCut,
  season_end: playSeasonEnd,
  super_bowl_win: playSuperBowlWin,
  super_bowl_loss: playSuperBowlLoss,
  playoff_clinch: playPlayoffClinch,
  playoff_elimination: playPlayoffElimination,
  record_broken: playRecordBroken,
  achievement_unlocked: playAchievementUnlocked,
};

// ── Singleton context ──────────────────────────────────

const MUTE_KEY = 'mfd-audio-muted';
const VOLUME_KEY = 'mfd-audio-volume';

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new AudioContext();
  }
  if (_audioCtx.state === 'suspended') {
    void _audioCtx.resume();
  }
  return _audioCtx;
}

// ── Global play function ───────────────────────────────

/** Play a sound event. Safe to call before user interaction (will queue). */
export function playSound(event: SoundEvent): void {
  const muted = localStorage.getItem(MUTE_KEY) === '1';
  if (muted) return;

  try {
    const ctx = getAudioContext();
    const fn = SOUND_MAP[event];
    if (fn) fn(ctx);
  } catch {
    // AudioContext not available (SSR, old browser) — silent fail
  }
}

// ── React hook ─────────────────────────────────────────

export interface AudioControls {
  play: (event: SoundEvent) => void;
  muted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
}

export function useAudio(): AudioControls {
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(VOLUME_KEY);
    return stored ? Number(stored) : 0.5;
  });
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((event: SoundEvent) => {
    if (muted) return;
    try {
      if (!ctxRef.current) ctxRef.current = getAudioContext();
      const fn = SOUND_MAP[event];
      if (fn) fn(ctxRef.current);
    } catch {
      // Silent fail
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  return { play, muted, toggleMute, volume, setVolume };
}

// ── AudioToggle component ──────────────────────────────

export function AudioToggle() {
  const { muted, toggleMute } = useAudio();

  // Ensure AudioContext is created on first user interaction
  useEffect(() => {
    function initOnInteraction() {
      getAudioContext();
      window.removeEventListener('click', initOnInteraction);
      window.removeEventListener('keydown', initOnInteraction);
    }
    window.addEventListener('click', initOnInteraction);
    window.addEventListener('keydown', initOnInteraction);
    return () => {
      window.removeEventListener('click', initOnInteraction);
      window.removeEventListener('keydown', initOnInteraction);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleMute}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        background: 'none',
        border: `2px solid ${muted ? 'var(--mfd-text-faint)' : 'var(--mfd-green)'}`,
        color: muted ? 'var(--mfd-text-faint)' : 'var(--mfd-green)',
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '10px',
        cursor: 'pointer',
      }}
    >
      {muted ? 'M' : 'S'}
    </button>
  );
}
