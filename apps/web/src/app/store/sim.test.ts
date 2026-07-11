import { beforeEach, describe, expect, it, vi } from 'vitest';

const engineMocks = vi.hoisted(() => ({
  advanceFranchiseWeek: vi.fn(),
  previewHalftimeDecision: vi.fn(),
  simulateWeeks: vi.fn(),
}));

vi.mock('@mfd/engine', () => ({
  advanceFranchiseWeek: engineMocks.advanceFranchiseWeek,
  previewHalftimeDecision: engineMocks.previewHalftimeDecision,
  simulateWeeks: engineMocks.simulateWeeks,
}));

describe('web sim boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    engineMocks.advanceFranchiseWeek.mockReset();
    engineMocks.previewHalftimeDecision.mockReset();
    engineMocks.simulateWeeks.mockReset();
  });

  it('falls back to engine advance when Worker is unavailable', async () => {
    const result = { game: { week: 2 }, summary: { headline: 'Advanced' } };
    engineMocks.advanceFranchiseWeek.mockReturnValue(result);
    vi.stubGlobal('Worker', undefined);

    const { runAdvanceWeek } = await import('./sim');
    await expect(runAdvanceWeek({ week: 1 } as any)).resolves.toBe(result);
    expect(engineMocks.advanceFranchiseWeek).toHaveBeenCalledWith({ week: 1 }, undefined);
  });

  it('falls back to engine preview when Worker construction fails', async () => {
    const decision = { id: 'half-1' };
    engineMocks.previewHalftimeDecision.mockReturnValue(decision);
    vi.stubGlobal('Worker', class ThrowingWorker {
      constructor() {
        throw new Error('Worker blocked');
      }
    });

    const { runPreviewHalftimeDecision } = await import('./sim');
    await expect(runPreviewHalftimeDecision({ week: 1 } as any)).resolves.toBe(decision);
    expect(engineMocks.previewHalftimeDecision).toHaveBeenCalledWith({ week: 1 });
  });

  it('uses request ids when posting advance requests to the Worker', async () => {
    const instances: MockWorker[] = [];
    class MockWorker {
      listeners = new Map<string, Set<(event: MessageEvent) => void>>();
      messages: unknown[] = [];

      constructor() {
        instances.push(this);
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        this.listeners.get(type)?.delete(listener);
      }

      postMessage(message: any) {
        this.messages.push(message);
        queueMicrotask(() => {
          for (const listener of this.listeners.get('message') ?? []) {
            listener({ data: { id: message.id, kind: 'done', result: { advanced: message.id } } } as MessageEvent);
          }
        });
      }
    }
    vi.stubGlobal('Worker', MockWorker);

    const { runAdvanceWeek } = await import('./sim');
    await expect(runAdvanceWeek({ week: 1 } as any)).resolves.toEqual({ advanced: 1 });

    expect(engineMocks.advanceFranchiseWeek).not.toHaveBeenCalled();
    expect(instances[0]?.messages[0]).toMatchObject({
      id: 1,
      kind: 'advanceWeek',
      game: { week: 1 },
    });
  });

  it('keeps simulateWeeks progress listeners open until done', async () => {
    class MockWorker {
      listeners = new Map<string, Set<(event: MessageEvent) => void>>();

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        this.listeners.get(type)?.delete(listener);
      }

      postMessage(message: any) {
        queueMicrotask(() => {
          const listeners = this.listeners.get('message') ?? [];
          for (const listener of listeners) {
            listener({ data: { id: message.id, kind: 'progress', frame: { weeksSimmed: 1, week: 2 } } } as MessageEvent);
            listener({ data: { id: message.id, kind: 'done', result: { weeksSimmed: 1, stopReason: 'target_reached' } } } as MessageEvent);
          }
        });
      }
    }
    vi.stubGlobal('Worker', MockWorker);
    const progress = vi.fn();

    const { runSimAhead } = await import('./sim');
    await expect(runSimAhead({ week: 1 } as any, { weeks: 1 }, progress)).resolves.toMatchObject({
      weeksSimmed: 1,
      stopReason: 'target_reached',
    });

    expect(progress).toHaveBeenCalledWith({ weeksSimmed: 1, week: 2 });
    expect(engineMocks.simulateWeeks).not.toHaveBeenCalled();
  });
});
