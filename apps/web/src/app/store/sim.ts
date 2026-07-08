import {
  advanceFranchiseWeek,
  previewHalftimeDecision,
  simulateWeeks,
  type AdvanceFranchiseWeekOptions,
  type EngineOutput,
  type GameState,
  type PendingHalftimeDecision,
  type SimAheadFrame,
  type SimAheadResult,
  type SimAheadTarget,
} from '@mfd/engine';
import type {
  SimWorkerRequest,
  SimWorkerResponse,
  SimWorkerResultByKind,
} from './sim-protocol';

let nextRequestId = 1;
let workerUnavailable = false;
let simWorker: Worker | null = null;

function getSimWorker(): Worker | null {
  if (workerUnavailable || typeof Worker === 'undefined') return null;
  if (simWorker) return simWorker;

  try {
    simWorker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
    return simWorker;
  } catch {
    workerUnavailable = true;
    simWorker = null;
    return null;
  }
}

function postWorkerRequest<K extends SimWorkerRequest['kind']>(
  request: Omit<Extract<SimWorkerRequest, { kind: K }>, 'id'>,
  onProgress?: (frame: SimAheadFrame) => void,
): Promise<SimWorkerResultByKind[K]> | null {
  const worker = getSimWorker();
  if (!worker) return null;

  const id = nextRequestId;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleWorkerError);
    };
    const handleMessage = (event: MessageEvent<SimWorkerResponse>) => {
      const response = event.data;
      if (!response || response.id !== id) return;

      if (response.kind === 'progress') {
        onProgress?.(response.frame);
        return;
      }

      cleanup();
      if (response.kind === 'error') {
        const error = new Error(response.message);
        if (response.stack) error.stack = response.stack;
        reject(error);
        return;
      }
      resolve(response.result as SimWorkerResultByKind[K]);
    };
    const handleWorkerError = (event: ErrorEvent) => {
      cleanup();
      reject(event.error instanceof Error ? event.error : new Error(event.message));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleWorkerError);
    worker.postMessage({ ...request, id } as SimWorkerRequest);
  });
}

/**
 * Async simulation boundary for the web app.
 *
 * This stays Promise-based so a future Worker swap does not
 * force every caller to change its contract.
 */
export async function runAdvanceWeek(game: GameState, options?: AdvanceFranchiseWeekOptions): Promise<EngineOutput> {
  const workerResult = postWorkerRequest({ kind: 'advanceWeek', game, options });
  if (workerResult) return workerResult;
  return advanceFranchiseWeek(game, options);
}

export async function runPreviewHalftimeDecision(game: GameState): Promise<PendingHalftimeDecision | null> {
  const workerResult = postWorkerRequest({ kind: 'previewHalftimeDecision', game });
  if (workerResult) return workerResult;
  return previewHalftimeDecision(game);
}

export async function runSimAhead(
  game: GameState,
  target: SimAheadTarget,
  onProgress?: (frame: SimAheadFrame) => void,
): Promise<SimAheadResult> {
  const workerResult = postWorkerRequest({ kind: 'simulateWeeks', game, target }, onProgress);
  if (workerResult) return workerResult;
  return simulateWeeks(game, target, onProgress);
}
