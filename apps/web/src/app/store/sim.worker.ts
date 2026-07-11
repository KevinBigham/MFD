import { advanceFranchiseWeek, previewHalftimeDecision, simulateWeeks } from '@mfd/engine';
import type { SimWorkerRequest, SimWorkerResponse } from './sim-protocol';

type SimWorkerScope = {
  addEventListener: (type: 'message', listener: (event: MessageEvent<SimWorkerRequest>) => void) => void;
  postMessage: (message: SimWorkerResponse) => void;
};

const workerScope = self as unknown as SimWorkerScope;

function serializeError(error: unknown): Pick<Extract<SimWorkerResponse, { kind: 'error' }>, 'message' | 'stack'> {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

workerScope.addEventListener('message', (event: MessageEvent<SimWorkerRequest>) => {
  const request = event.data;

  try {
    if (request.kind === 'advanceWeek') {
      workerScope.postMessage({
        id: request.id,
        kind: 'done',
        result: advanceFranchiseWeek(request.game, request.options),
      } satisfies SimWorkerResponse);
      return;
    }

    if (request.kind === 'simulateWeeks') {
      const result = simulateWeeks(request.game, request.target, (frame) => {
        workerScope.postMessage({
          id: request.id,
          kind: 'progress',
          frame,
        } satisfies SimWorkerResponse);
      });
      workerScope.postMessage({
        id: request.id,
        kind: 'done',
        result,
      } satisfies SimWorkerResponse);
      return;
    }

    workerScope.postMessage({
      id: request.id,
      kind: 'done',
      result: previewHalftimeDecision(request.game),
    } satisfies SimWorkerResponse);
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      kind: 'error',
      ...serializeError(error),
    } satisfies SimWorkerResponse);
  }
});
