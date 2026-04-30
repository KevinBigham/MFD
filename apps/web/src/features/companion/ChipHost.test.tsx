import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CHIP_ONBOARDING_STORAGE_KEY,
  ChipHost,
  advanceOnboardingBeat,
  isChipFeatureEnabled,
  readOnboardingSkipState,
  resolveBeatIndexForStageAdvance,
  resolveChipHostSpotlightTarget,
  writeOnboardingSkipState,
} from './ChipHost';
import { useChipStore } from './store';

const stages = [
  { id: 'chip.onboarding.beat-1', label: 'Cold Open', content: <div>Cold stage</div> },
  { id: 'chip.onboarding.beat-2', label: 'Team Select', content: <div>Team stage</div> },
  { id: 'chip.onboarding.beat-3', label: 'AGM Hire', content: <div>AGM stage</div> },
];

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

describe('ChipHost', () => {
  beforeEach(() => {
    useChipStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('treats only VITE_CHIP_ENABLED=true as enabled', () => {
    expect(isChipFeatureEnabled({ VITE_CHIP_ENABLED: 'true' })).toBe(true);
    expect(isChipFeatureEnabled({ VITE_CHIP_ENABLED: 'false' })).toBe(false);
    expect(isChipFeatureEnabled({})).toBe(false);
  });

  it('renders children unwrapped when the feature flag is off', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'false');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-wizard="setup"');
    expect(markup).not.toContain('data-chip-host');
    expect(markup).not.toContain('data-mfd-spotlight');
  });

  it('renders children unwrapped for existing dynasty loads', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame={false} stages={stages}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-wizard="setup"');
    expect(markup).not.toContain('DYNASTY DESK // CHIP');
  });

  it('renders Chip, a broadcast bubble, controls, and children for a new game', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-host="true"');
    expect(markup).toContain('Chip, your assistant');
    expect(markup).toContain('DYNASTY DESK // CHIP');
    expect(markup).toContain('Click the gold button when ready.');
    expect(markup).not.toContain('Continue</button>');
    expect(markup).toContain('Skip');
    expect(markup).toContain('data-wizard="setup"');
  });

  it('resolves beat 1 spotlight to the cold-open target', () => {
    expect(resolveChipHostSpotlightTarget({
      beatIndex: 0,
      stageId: 'cold-open',
      enabled: true,
      skipped: false,
      dismissed: false,
    })).toBe('wizard.cold-open.continue');
  });

  it('advances beats only when a matching wizard stage advances', () => {
    expect(resolveBeatIndexForStageAdvance(0, 'intel-briefing', 9)).toBe(0);
    expect(resolveBeatIndexForStageAdvance(0, 'agm-hire', 9)).toBe(2);
    expect(resolveBeatIndexForStageAdvance(2, 'depth-chart', 9)).toBe(3);
  });

  it('advances onboarding beats by user action boundaries only', () => {
    expect(advanceOnboardingBeat(0, 9)).toBe(1);
    expect(advanceOnboardingBeat(7, 9)).toBe(8);
    expect(advanceOnboardingBeat(8, 9)).toBe(8);
  });

  it('persists skip state in localStorage-compatible storage', () => {
    const storage = new MemoryStorage();
    const timestamp = new Date('2026-04-29T12:00:00.000Z');

    writeOnboardingSkipState(storage, 4, timestamp);

    expect(storage.getItem(CHIP_ONBOARDING_STORAGE_KEY)).toBe(
      '{"skipped":true,"lastBeat":4,"timestamp":"2026-04-29T12:00:00.000Z"}',
    );
    expect(readOnboardingSkipState(storage)).toEqual({
      skipped: true,
      lastBeat: 4,
      timestamp: '2026-04-29T12:00:00.000Z',
    });
  });

  it('propagates reduced-motion rendering to Chip and the bubble', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} reducedMotion>
        <div>Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).not.toContain('mfd-chip-bubble__caret');
  });

  it('renders children unwrapped after Chip is dismissed', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    useChipStore.getState().dismiss();

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-wizard="setup"');
    expect(markup).not.toContain('data-chip-host');
    expect(markup).not.toContain('data-mfd-spotlight');
  });
});
