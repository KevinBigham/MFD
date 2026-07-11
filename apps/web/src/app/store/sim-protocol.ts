import type {
  AdvanceFranchiseWeekOptions,
  EngineOutput,
  GameState,
  PendingHalftimeDecision,
  SimAheadFrame,
  SimAheadResult,
  SimAheadTarget,
} from '@mfd/engine';

export type SimWorkerRequest =
  | {
    id: number;
    kind: 'advanceWeek';
    game: GameState;
    options?: AdvanceFranchiseWeekOptions;
  }
  | {
    id: number;
    kind: 'previewHalftimeDecision';
    game: GameState;
  }
  | {
    id: number;
    kind: 'simulateWeeks';
    game: GameState;
    target: SimAheadTarget;
  };

export type SimWorkerResultByKind = {
  advanceWeek: EngineOutput;
  previewHalftimeDecision: PendingHalftimeDecision | null;
  simulateWeeks: SimAheadResult;
};

export type SimWorkerResponse =
  | {
    id: number;
    kind: 'done';
    result: EngineOutput | PendingHalftimeDecision | SimAheadResult | null;
  }
  | {
    id: number;
    kind: 'progress';
    frame: SimAheadFrame;
  }
  | {
    id: number;
    kind: 'error';
    message: string;
    stack?: string;
  };
