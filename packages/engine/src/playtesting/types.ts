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
  /** Host-timing receipt; opt-in because canonical reports must stay byte-identical. */
  measureStatePerformance?: boolean;
  /** Host-owned monotonic clock used only by the opt-in performance probe. */
  performanceNow?: () => number;
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
  certification: EcologyCertification;
  statePerformance?: import('../systems/state-performance').StatePerformanceMeasurement;
}

/** Hard release thresholds. These are pass/fail facts, not anomaly budgets. */
export interface EcologyCertification {
  completedRequestedSeasons: boolean;
  healthyStarterShortageGameWeeks: number;
  healthyStarterShortages: Array<{
    gameId: string;
    homeTeamId: string;
    awayTeamId: string;
    year: number;
    week: number;
    positions: Record<string, number>;
    teams: Record<string, Record<string, number>>;
  }>;
  cpuTransactionCount: number;
  receiptBackedCpuTransactionCount: number;
  cpuReceiptCoverage: number;
  zeroHighSeverityAnomalies: boolean;
  certified: boolean;
}
