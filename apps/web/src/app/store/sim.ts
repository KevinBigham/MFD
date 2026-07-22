import {
  advanceFranchiseWeek,
  previewHalftimeDecision,
  type AdvanceFranchiseWeekOptions,
  type EngineOutput,
  type GameState,
  type PendingHalftimeDecision,
} from '@mfd/engine';

type SimulationAction = 'advance' | 'preview-halftime';

interface WorkerReply {
  id: number;
  ok: boolean;
  result?: EngineOutput | PendingHalftimeDecision | null;
  error?: string;
}

interface PendingWorkerCall {
  resolve: (value: EngineOutput | PendingHalftimeDecision | null) => void;
  reject: (reason: Error) => void;
}

let nextWorkerCallId = 1;
let simulationWorker: Worker | null = null;
const pendingWorkerCalls = new Map<number, PendingWorkerCall>();

function rejectPendingWorkerCalls(error: Error): void {
  for (const pending of pendingWorkerCalls.values()) pending.reject(error);
  pendingWorkerCalls.clear();
}

function getSimulationWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof window.Worker === 'undefined') return null;
  if (simulationWorker) return simulationWorker;

  simulationWorker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
  simulationWorker.addEventListener('message', (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const pending = pendingWorkerCalls.get(reply.id);
    if (!pending) return;
    pendingWorkerCalls.delete(reply.id);
    if (reply.ok) pending.resolve(reply.result ?? null);
    else pending.reject(new Error(reply.error ?? 'Simulation worker failed.'));
  });
  simulationWorker.addEventListener('error', (event) => {
    rejectPendingWorkerCalls(new Error(event.message || 'Simulation worker crashed.'));
    simulationWorker?.terminate();
    simulationWorker = null;
  });
  return simulationWorker;
}

/** Threshold calibrated from the GOAT state probe: four seasons / ~1,550
 * receipts stayed below 250ms, while ten seasons crossed it. */
export function shouldUseSimulationWorker(game: GameState): boolean {
  return (game.decisionReceipts?.length ?? 0) >= 3_500 || (game.franchiseHistory?.length ?? 0) >= 256;
}

function runInSimulationWorker(
  action: SimulationAction,
  game: GameState,
  options?: AdvanceFranchiseWeekOptions,
): Promise<EngineOutput | PendingHalftimeDecision | null> | null {
  if (!shouldUseSimulationWorker(game)) return null;
  const worker = getSimulationWorker();
  if (!worker) return null;
  const id = nextWorkerCallId++;
  return new Promise((resolve, reject) => {
    pendingWorkerCalls.set(id, { resolve, reject });
    worker.postMessage(action === 'advance'
      ? { id, action, game, options }
      : { id, action, game });
  });
}

/** Async simulation boundary. Browser builds use a persistent Web Worker so
 * long dynasties do not block interaction; tests/unsupported browsers retain
 * the same deterministic engine call as a fallback. */
export async function runAdvanceWeek(game: GameState, options?: AdvanceFranchiseWeekOptions): Promise<EngineOutput> {
  const workerResult = runInSimulationWorker('advance', game, options);
  if (workerResult) return workerResult as Promise<EngineOutput>;
  return advanceFranchiseWeek(game, options);
}

export async function runPreviewHalftimeDecision(game: GameState): Promise<PendingHalftimeDecision | null> {
  const workerResult = runInSimulationWorker('preview-halftime', game);
  if (workerResult) return workerResult as Promise<PendingHalftimeDecision | null>;
  return previewHalftimeDecision(game);
}
