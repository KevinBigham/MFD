import type { AIBiasConfig } from '../systems/ai-bias';
import type { GameState, SeasonPhase } from '../types';

export type PlaytestSeverity = 'low' | 'medium' | 'high';

export type { AIBiasConfig } from '../systems/ai-bias';
export type PlaytestAIBias = AIBiasConfig;

export interface PlaytestPersona {
  id: string;
  label: string;
  description: string;
  aiBias: Readonly<AIBiasConfig>;
}

export interface PlaytestFrame {
  year: number;
  week: number;
  phase: SeasonPhase;
}

export interface PlaytestDetectorContext {
  step: number;
  seed: number;
  persona: PlaytestPersona;
  previousFrame: PlaytestFrame | null;
  currentFrame: PlaytestFrame;
  state: GameState;
  serializedState: string;
  roundTripSerializedState: string;
  mathRandomCalls: number;
  elapsedMs: number;
  elapsedHistoryMs: readonly number[];
  completedSeasons: number;
  weeksAdvanced: number;
}

export interface PlaytestDetectorPass {
  ok: true;
}

export interface PlaytestDetectorFail {
  ok: false;
  severity: PlaytestSeverity;
  detail: string;
  reproSeed: number;
}

export type PlaytestDetectorVerdict = PlaytestDetectorPass | PlaytestDetectorFail;

export type PlaytestDetector = (context: PlaytestDetectorContext) => PlaytestDetectorVerdict;

export interface PlaytestProgressEvent {
  personaId: string;
  seed: number;
  step: number;
  seasonsCompleted: number;
  seasonsRequested: number;
  weeksAdvanced: number;
  currentFrame: PlaytestFrame;
}

export interface PlaytestRunOptions {
  maxSteps?: number;
  saveRoundTripEvery?: number;
  onProgress?: (event: PlaytestProgressEvent) => void;
}

export interface PlaytestAnomaly {
  detectorId: string;
  severity: PlaytestSeverity;
  detail: string;
  reproSeed: number;
  step: number;
  year: number;
  week: number;
  phase: SeasonPhase;
}

export interface PlaytestReport {
  personaId: string;
  personaLabel: string;
  seed: number;
  seasonsRequested: number;
  seasonsCompleted: number;
  weeksAdvanced: number;
  anomalyCount: number;
  highSeverityCount: number;
  anomalies: PlaytestAnomaly[];
}
