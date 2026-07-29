import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CHIP_INTRO_STORAGE_KEY,
  CHIP_ONBOARDING_STORAGE_KEY,
  ChipHost,
  advanceOnboardingBeat,
  clearOnboardingSkipState,
  isChipFeatureEnabled,
  readChipIntroState,
  readOnboardingSkipState,
  replayOnboardingBeat,
  resolveBeatIndexForStageAdvance,
  resolveChipHostSpotlightTarget,
  splitChipContextDetail,
  writeChipIntroState,
  writeOnboardingSkipState,
} from './ChipHost';
import { onboardingDialogue } from './dialogue/onboarding';
import { useChipStore } from './store';

const stages = [
  { id: 'chip.onboarding.beat-1', label: 'Hire Assistant GM', content: <div>Cold stage</div>, spotlightStageId: 'cold-open' },
  { id: 'chip.onboarding.beat-2', label: 'Franchise Intel', content: <div>Intel stage</div>, spotlightStageId: 'intel-briefing' },
  { id: 'chip.onboarding.beat-3', label: 'Meet Roster', content: <div>Roster stage</div>, spotlightStageId: 'roster-overview' },
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

function createIntroSeenStorage(skipped = false) {
  const storage = new MemoryStorage();
  writeChipIntroState(storage, skipped, new Date('2026-04-29T11:00:00.000Z'));
  return storage;
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
    expect(markup).not.toContain('FRANCHISE OPS // CHIP');
  });

  it('renders a full-screen Chip intro before the setup rail on first run', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} storage={new MemoryStorage()}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-intro="true"');
    expect(markup).toContain('data-chip-intro-skip="true"');
    expect(markup).toContain('Skip Chip Intro');
    expect(markup).toContain('Start Setup');
    expect(markup).toContain('I&#x27;m Chip');
    expect(markup).toContain('separate Must Do, Recommended, and Optional work');
    expect(markup).toContain('point to the exact screen to open');
    expect(markup).toContain('explain the consequence');
    expect(markup).toContain('roster, cap space, owner patience, or the next game');
    expect(markup).not.toContain('point to the exact screen to use');
    expect(markup).not.toContain('owner trust');
    expect(markup).not.toContain('right-hand man');
    expect(markup).not.toContain('occasional advice');
    expect(markup).not.toContain('data-wizard="setup"');
    expect(markup).not.toContain('FRANCHISE OPS // CHIP');
  });

  it('renders Chip, a broadcast bubble, controls, and children after the reveal completes', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} reducedMotion storage={createIntroSeenStorage()}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-host="true"');
    expect(markup).toContain('Chip, franchise operations chief');
    expect(markup).toContain('FRANCHISE OPS // CHIP');
    expect(markup).toContain('data-chip-host-portrait="true"');
    expect(markup).toContain('Must Do: hire the Assistant GM.');
    expect(markup).toContain('first setup priority: cap space, starter and backup roles, the Week 1 game plan, or owner patience.');
    expect(markup).toContain('Where: choose the advisor promise that matches the biggest Week 1 danger');
    expect(markup).toContain('Consequence: choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.');
    expect(markup).not.toContain('the opener can start');
    expect(markup).not.toContain('whether to prioritize cap space');
    expect(markup).not.toMatch(/coach play calls|play-call owner/i);
    expect(markup).not.toMatch(/bigger consequence|first Week 1 consequence to control|carry the bigger consequence/i);
    expect(markup).not.toContain('I may miss unassigned starters');
    expect(markup).not.toContain('my first warnings skip');
    expect(markup).not.toMatch(/staff authority|unclear coach authority|coach-role issues/i);
    expect(markup.indexOf('Decision up next')).toBeLessThan(markup.indexOf('Consequence'));
    expect(markup.indexOf('Consequence')).toBeLessThan(markup.indexOf('Why'));
    expect(markup.indexOf('Why')).toBeLessThan(markup.indexOf('Where'));
    expect(markup.indexOf('not now Chip!')).toBeLessThan(markup.indexOf('Choice Consequences'));
    expect(markup).not.toContain('setup choices I push');
    expect(markup).not.toContain('bad fit can hide');
    expect(markup).not.toContain('risk to keep warning about');
    expect(markup).toContain('data-chip-host-context-details="true"');
    expect(markup).toContain('data-chip-host-context-heading="true"');
    expect(markup).toContain('data-chip-host-context-list="true"');
    expect(markup).toContain('data-chip-host-context-kind="why"');
    expect(markup).toContain('data-chip-host-context-kind="where"');
    expect(markup).toContain('data-chip-host-context-kind="consequence"');
    expect(markup).toContain('Choice Consequences');
    expect(markup).not.toContain('<details');
    expect(markup).not.toContain('No note. Work the board.');
    expect(markup).not.toContain('Work the board');
    expect(markup).not.toContain('how you want help');
    expect(markup).not.toContain('Continue</button>');
    expect(markup).toContain('not now Chip!');
    expect(markup).toContain('data-wizard="setup"');
  });

  it('keeps stacked setup Chip controls reachable before long consequence details', () => {
    const css = readFileSync(fileURLToPath(new URL('./ChipHost.css', import.meta.url)), 'utf8');

    expect(css).toContain("grid-template-areas:\n      'portrait'\n      'bubble'\n      'controls'\n      'details';");
    expect(css).not.toContain("grid-template-areas:\n      'portrait'\n      'bubble'\n      'details'\n      'controls';");
    expect(css).toContain('.mfd-chip-host--setup .mfd-chip-host__context-list::after');
    expect(css).toContain('min-height: var(--mfd-setup-scroll-target-clearance, 56px);');
    expect(css).toContain('pointer-events: none;');
  });

  it('keeps narrow-tablet setup consequences clear of the footer', () => {
    const css = readFileSync(fileURLToPath(new URL('./ChipHost.css', import.meta.url)), 'utf8');
    const tabletBlockStart = css.indexOf('@media (min-width: 620px) and (max-width: 780px)');
    const tabletBlockEnd = css.indexOf('@media (prefers-reduced-motion: reduce)', tabletBlockStart);
    const tabletBlock = css.slice(tabletBlockStart, tabletBlockEnd);

    expect(tabletBlockStart).toBeGreaterThan(-1);
    expect(tabletBlockEnd).toBeGreaterThan(tabletBlockStart);
    expect(css).toContain('@media (min-width: 620px) and (max-width: 780px)');
    expect(tabletBlock).toContain("grid-template-areas:\n      'portrait controls'\n      'portrait bubble'\n      'details details';");
    expect(tabletBlock).toContain('min-height: clamp(220px, 30vh, 280px);');
    expect(tabletBlock).toContain('height: auto;');
    expect(tabletBlock).not.toContain("'portrait details';");
  });

  it('starts the onboarding hero reveal before the locked onboarding lines', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} storage={createIntroSeenStorage()}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-host-reveal="hidden"');
    expect(markup).toContain('data-chip-host-reveal-portrait="true"');
    expect(markup).toContain('data-chip-pose="wave"');
    expect(markup).not.toContain('First call is Assistant GM.');
    expect(markup).not.toContain('No note. Work the board.');
    expect(markup).not.toContain('Work the board');
    expect(markup).not.toContain('data-mfd-spotlight');
  });

  it('replays the current onboarding beat from the portrait handler', () => {
    const showDialogue = vi.fn();

    replayOnboardingBeat(onboardingDialogue[0]!, { showDialogue });

    expect(showDialogue).toHaveBeenCalledWith('chip.onboarding.beat-1', {
      pose: 'reviewing-tablet',
      context: 'onboarding',
    });
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
    expect(resolveBeatIndexForStageAdvance(0, 'agm-hire', 10)).toBe(0);
    expect(resolveBeatIndexForStageAdvance(0, 'intel-briefing', 10)).toBe(1);
    expect(resolveBeatIndexForStageAdvance(1, 'roster-overview', 10)).toBe(2);
    expect(resolveBeatIndexForStageAdvance(2, 'depth-chart', 10)).toBe(6);
  });

  it('advances onboarding beats by user action boundaries only', () => {
    expect(advanceOnboardingBeat(0, 10)).toBe(1);
    expect(advanceOnboardingBeat(8, 10)).toBe(9);
    expect(advanceOnboardingBeat(9, 10)).toBe(9);
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

  it('persists intro state separately from global onboarding skip state', () => {
    const storage = new MemoryStorage();
    const timestamp = new Date('2026-04-29T12:30:00.000Z');

    writeChipIntroState(storage, true, timestamp);

    expect(storage.getItem(CHIP_INTRO_STORAGE_KEY)).toBe(
      '{"seen":true,"skipped":true,"timestamp":"2026-04-29T12:30:00.000Z"}',
    );
    expect(readChipIntroState(storage)).toEqual({
      seen: true,
      skipped: true,
      timestamp: '2026-04-29T12:30:00.000Z',
    });
    expect(storage.getItem(CHIP_ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('keeps onboarding helpers usable when browser storage is blocked', () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('storage read blocked');
    });
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('storage write blocked');
    });
    vi.spyOn(storage, 'removeItem').mockImplementation(() => {
      throw new Error('storage removal blocked');
    });

    expect(readOnboardingSkipState(storage)).toBeNull();
    expect(readChipIntroState(storage)).toBeNull();
    expect(() => writeOnboardingSkipState(storage, 4)).not.toThrow();
    expect(() => writeChipIntroState(storage, false)).not.toThrow();
    expect(() => clearOnboardingSkipState(storage)).not.toThrow();
  });

  it('propagates reduced-motion rendering to Chip and the bubble', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} reducedMotion storage={createIntroSeenStorage()}>
        <div>Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-chip-motion="reduced"');
    expect(markup).not.toContain('data-chip-host-reveal=');
    expect(markup).toContain('Must Do: hire the Assistant GM.');
    expect(markup).not.toContain('mfd-chip-bubble__caret');
  });

  it('renders an Ask Chip handle after Chip is dismissed', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    useChipStore.getState().dismiss();

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-wizard="setup"');
    expect(markup).toContain('data-chip-ask-button="true"');
    expect(markup).toContain('Ask Chip');
    expect(markup).not.toContain('data-chip-host');
    expect(markup).not.toContain('data-mfd-spotlight');
  });

  it('keeps the Ask Chip handle small and anchored away from the setup flow', async () => {
    const css = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./ChipHost.css', import.meta.url), 'utf8'),
    );

    expect(css).toContain('.mfd-chip-ask-button');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('left: max(8px, env(safe-area-inset-left, 0px));');
    expect(css).toContain('bottom: calc(76px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('bottom: calc(112px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('font-size: 7px !important;');
    expect(css).toContain('max-width: min(132px, calc(100vw - 16px));');
    expect(css).toContain('grid-template-columns: minmax(240px, 0.42fr) minmax(0, 1fr);');
    expect(css).toContain("grid-template-areas:\n    'portrait controls'\n    'portrait bubble'\n    'portrait details';");
    expect(css).toContain('min-height: clamp(300px, 37vh, 430px);');
    expect(css).toContain('overflow: hidden;');
    expect(css).toContain('transform: scale(1.24) translateY(8px);');
    expect(css).toContain('max-height: min(42vh, 390px);');
    expect(css).toContain('max-height: min(100%, calc(100vh - 220px));');
    expect(css).toContain(".mfd-chip-host__context-detail[data-chip-host-context-kind='consequence']");
    expect(css).toContain('@media (min-width: 481px) and (max-width: 780px)');
    expect(css).toContain('@media (min-width: 481px) and (max-width: 619px)');
    expect(css).toContain('min-height: clamp(220px, 27vh, 250px);');
    expect(css).toContain('transform: scale(1.12) translateY(4px);');
    expect(css).toContain('@media (min-width: 620px) and (max-width: 780px)');
    expect(css).toContain('grid-template-columns: minmax(180px, 0.32fr) minmax(0, 1fr);');
    expect(css).toContain("grid-template-areas:\n      'portrait controls'\n      'portrait bubble'\n      'details details';");
    expect(css).toContain('min-height: clamp(220px, 30vh, 280px);');
    expect(css).toContain('height: auto;');
    expect(css).toContain('transform: scale(1.1) translateY(4px);');
    expect(css).toContain('grid-template-columns: minmax(86px, 0.28fr) minmax(0, 1fr);');
    expect(css).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).toContain('@media (max-width: 1180px)');
    expect(css).toContain('position: relative;');
    expect(css).toContain('top: auto;');
    expect(css).toContain('max-height: none;');
    expect(css).toContain('overflow: visible !important;');
    expect(css).toContain("[data-chip-host-controls='true']");
    expect(css).toContain('position: static;');
    expect(css).toContain('position: sticky;');
  });

  it('splits Chip context rows into labels, body text, and visual priority kinds', () => {
    expect(splitChipContextDetail('Consequence: missed promises cut owner patience.')).toEqual({
      label: 'Consequence',
      body: 'missed promises cut owner patience.',
      kind: 'consequence',
    });
    expect(splitChipContextDetail('Why: cap space decides whether injuries can be covered.')).toEqual({
      label: 'Why',
      body: 'cap space decides whether injuries can be covered.',
      kind: 'why',
    });
    expect(splitChipContextDetail('Read this before choosing.')).toEqual({
      label: 'Note',
      body: 'Read this before choosing.',
      kind: 'note',
    });
  });

  it('keeps a timeout fallback so the setup reveal cannot hide Chip copy forever', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./ChipHost.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('const fallbackTimerId = window.setTimeout');
    expect(source).toContain('ONBOARDING_REVEAL_TOTAL_MS + 250');
    expect(source).toContain('window.clearTimeout(fallbackTimerId)');
  });

  it('lets old persisted onboarding skips recover through Ask Chip', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = createIntroSeenStorage();
    writeOnboardingSkipState(storage, 2, new Date('2026-04-29T13:00:00.000Z'));

    const markup = renderToStaticMarkup(
      <ChipHost newGame stages={stages} storage={storage}>
        <div data-wizard="setup">Wizard</div>
      </ChipHost>,
    );

    expect(markup).toContain('data-wizard="setup"');
    expect(markup).toContain('data-chip-ask-button="true"');
    expect(markup).toContain('Ask Chip');
    expect(markup).not.toContain('data-chip-host="true"');
  });
});
