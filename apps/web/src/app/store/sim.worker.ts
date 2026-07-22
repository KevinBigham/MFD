import {
  advanceFranchiseWeek,
  previewHalftimeDecision,
  type AdvanceFranchiseWeekOptions,
  type EngineOutput,
  type GameState,
  type PendingHalftimeDecision,
} from '@mfd/engine';

type SimulationWorkerRequest =
  | { id: number; action: 'advance'; game: GameState; options?: AdvanceFranchiseWeekOptions }
  | { id: number; action: 'preview-halftime'; game: GameState };

type SimulationWorkerResponse =
  | { id: number; ok: true; result: EngineOutput | PendingHalftimeDecision | null }
  | { id: number; ok: false; error: string };

const workerScope = globalThis as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<SimulationWorkerRequest>) => void) => void;
  postMessage: (message: SimulationWorkerResponse) => void;
};

workerScope.addEventListener('message', (event) => {
  const request = event.data;
  try {
    const result = request.action === 'advance'
      ? advanceFranchiseWeek(request.game, request.options)
      : previewHalftimeDecision(request.game);
    workerScope.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
