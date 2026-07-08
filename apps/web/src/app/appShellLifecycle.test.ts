import { describe, expect, it } from 'vitest';
import { resolveAutosaveToastStep } from './appShellLifecycle';

describe('app shell lifecycle helpers', () => {
  it('uses the first observed week as a baseline without showing the autosave toast', () => {
    expect(resolveAutosaveToastStep(0, 1)).toEqual({
      showToast: false,
      nextPreviousWeek: 1,
    });
  });

  it('shows the cosmetic autosave toast only when the week changes after the baseline exists', () => {
    expect(resolveAutosaveToastStep(1, 2)).toEqual({
      showToast: true,
      nextPreviousWeek: 2,
    });
  });

  it('updates the baseline even when a toast is shown so the same week does not retrigger', () => {
    const first = resolveAutosaveToastStep(3, 4);
    const second = resolveAutosaveToastStep(first.nextPreviousWeek, 4);

    expect(first.showToast).toBe(true);
    expect(second).toEqual({
      showToast: false,
      nextPreviousWeek: 4,
    });
  });
});
