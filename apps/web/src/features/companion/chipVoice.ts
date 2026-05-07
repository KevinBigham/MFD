export const CHIP_TTS_FLAG = 'VITE_CHIP_TTS_ENABLED';

type ChipTtsEnv = Record<string, string | boolean | undefined>;

export type ChipVoiceSpeakReason =
  | 'queued'
  | 'disabled'
  | 'unavailable'
  | 'empty'
  | 'not_user_initiated';

export interface ChipVoiceSpeakOptions {
  userInitiated?: boolean;
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface ChipVoiceSpeakResult {
  spoken: boolean;
  reason: ChipVoiceSpeakReason;
}

interface ChipSpeechSynthesisLike {
  speak: (utterance: ChipSpeechUtteranceLike) => void;
  cancel: () => void;
}

interface ChipSpeechUtteranceLike {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
}

type ChipUtteranceFactory = (text: string) => ChipSpeechUtteranceLike;

export interface CreateChipVoiceServiceOptions {
  env?: ChipTtsEnv;
  synthesis?: ChipSpeechSynthesisLike | null;
  utteranceFactory?: ChipUtteranceFactory | null;
}

export interface ChipVoiceService {
  isEnabled: () => boolean;
  isAvailable: () => boolean;
  speak: (text: string, options?: ChipVoiceSpeakOptions) => ChipVoiceSpeakResult;
  stop: () => void;
}

function resolveSpeechSynthesis(): ChipSpeechSynthesisLike | null {
  if (typeof window === 'undefined') return null;
  return (window.speechSynthesis as unknown as ChipSpeechSynthesisLike | undefined) ?? null;
}

function resolveUtteranceFactory(): ChipUtteranceFactory | null {
  if (typeof SpeechSynthesisUtterance === 'undefined') return null;
  return (text: string) => new SpeechSynthesisUtterance(text);
}

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function isChipTtsEnabled(env: ChipTtsEnv = import.meta.env): boolean {
  return env[CHIP_TTS_FLAG] === 'true' || env[CHIP_TTS_FLAG] === true;
}

export function createChipVoiceService(options: CreateChipVoiceServiceOptions = {}): ChipVoiceService {
  const env = options.env ?? import.meta.env;
  const enabled = isChipTtsEnabled(env);
  const synthesis = options.synthesis === undefined ? resolveSpeechSynthesis() : options.synthesis;
  const utteranceFactory = options.utteranceFactory === undefined ? resolveUtteranceFactory() : options.utteranceFactory;

  return {
    isEnabled: () => enabled,
    isAvailable: () => enabled && synthesis !== null && utteranceFactory !== null,
    speak: (text, speakOptions = {}) => {
      if (!enabled) return { spoken: false, reason: 'disabled' };
      if (!synthesis || !utteranceFactory) return { spoken: false, reason: 'unavailable' };
      const trimmed = text.trim();
      if (!trimmed) return { spoken: false, reason: 'empty' };
      if (speakOptions.userInitiated !== true) return { spoken: false, reason: 'not_user_initiated' };

      if (speakOptions.interrupt) {
        synthesis.cancel();
      }

      const utterance = utteranceFactory(trimmed);
      utterance.rate = clamp(speakOptions.rate, 0.92, 0.5, 1.5);
      utterance.pitch = clamp(speakOptions.pitch, 0.9, 0, 2);
      utterance.volume = clamp(speakOptions.volume, 1, 0, 1);
      synthesis.speak(utterance);
      return { spoken: true, reason: 'queued' };
    },
    stop: () => {
      if (enabled && synthesis) synthesis.cancel();
    },
  };
}
