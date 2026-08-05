/**
 * E12/I8: SMOKE_CHIP_* harness.
 *
 * One scenario matrix that smoke-renders (or smoke-evaluates) the dock's
 * user-facing surfaces through a single shared runner, so a regression
 * anywhere in Chip's dock fails fast with a named scenario instead of a stack
 * of bespoke assertions:
 *
 * - SMOKE_CHIP_DOCK_CONTROLS (E12): every dock control renders, quiet menu
 *   open/closed, disabled-state wiring.
 * - SMOKE_CHIP_VOICE (I8): weekly bubble text always fits the 240-char budget
 *   and composes deterministically.
 * - SMOKE_CHIP_DETAILS (I8): the details panel appears exactly when a weekly
 *   entry carries contextDetails.
 * - SMOKE_CHIP_WHERE_AM_I (I8): Where Am I / Ask Chip beat routing, including
 *   the never-dead-button fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { ChipDock, createAskChipLiveBeat } from './ChipDock';
import { DOCK_CONTROL_BUTTONS, QUIET_MENU_CONTROL_IDS } from './dockControlConfig';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs } from './dockPersistence';
import { MAX_CHIP_DIALOGUE_CHARS } from './dialogue/types';
import { composeWeeklyDialogueText } from './weeklyGuidance';
import { createWhereAmIBeat, type WhereAmIState } from './whereAmI';
import { useChipStore } from './store';

interface SmokeScenario {
  /** Human-readable failure label. */
  name: string;
  /** Optional setup (store priming, storage seeding) before evaluation. */
  before?: () => void;
  /** Render-based scenarios produce SSR markup. */
  render?: () => ReactElement;
  /** Value-based scenarios produce any string (e.g. `beat.id|beat.text`). */
  value?: () => string;
  contains: readonly string[];
  notContains?: readonly string[];
  /** Extra assertions against the produced haystack. */
  assert?: (haystack: string) => void;
}

/** Shared runner: every SMOKE_CHIP_* scenario flows through here. */
export function runSmokeScenario(scenario: SmokeScenario): string {
  scenario.before?.();
  const haystack = scenario.render
    ? renderToStaticMarkup(scenario.render())
    : scenario.value?.() ?? '';
  for (const needle of scenario.contains) {
    expect(haystack, `${scenario.name} should contain ${JSON.stringify(needle)}`).toContain(needle);
  }
  for (const needle of scenario.notContains ?? []) {
    expect(haystack, `${scenario.name} should not contain ${JSON.stringify(needle)}`).not.toContain(needle);
  }
  scenario.assert?.(haystack);
  return haystack;
}

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

const TOP_LEVEL_CONTROL_HOOKS = DOCK_CONTROL_BUTTONS
  .filter((button) => button.group !== 'quietMenu')
  .map((button) => `data-chip-control-id="${button.id}"`);

const QUIET_MENU_HOOKS = QUIET_MENU_CONTROL_IDS.map((id) => `data-chip-control-id="${id}"`);

const BASE_WHERE_AM_I: WhereAmIState = {
  week: 7,
  seasonWeeks: 18,
  wins: 4,
  losses: 3,
  divisionRank: 2,
  pendingTotal: 0,
};

export const SMOKE_CHIP_DOCK_CONTROLS: readonly SmokeScenario[] = [
  {
    name: 'expanded dock renders every top-level control plus the quiet menu trigger',
    render: () => <ChipDock collapsed={false} storage={new MemoryStorage()} />,
    contains: [
      'data-chip-dock-controls="true"',
      ...TOP_LEVEL_CONTROL_HOOKS,
      'data-chip-control-id="quietMenu"',
    ],
    notContains: QUIET_MENU_HOOKS,
  },
  {
    name: 'quiet menu opens with exactly the three quiet options',
    render: () => (
      <ChipDock collapsed={false} storage={new MemoryStorage()} quietMenuDefaultOpen />
    ),
    contains: [
      'data-chip-quiet-menu="true"',
      'role="menu"',
      ...QUIET_MENU_HOOKS,
    ],
  },
  {
    name: 'collapsed dock shows the Ask Chip handle without the controls row',
    render: () => <ChipDock collapsed storage={new MemoryStorage()} />,
    contains: ['Ask Chip'],
    notContains: ['data-chip-dock-controls', ...QUIET_MENU_HOOKS],
  },
  {
    name: 'enable guidance grays out when nothing is quieted or skipped',
    render: () => <ChipDock collapsed={false} storage={new MemoryStorage()} />,
    contains: ['data-chip-control-id="enableGuidance"', 'disabled=""'],
  },
  {
    name: 'enable guidance goes live while a quiet pref is active',
    before: () => {
      // seeded in render via storage; nothing else to prime
    },
    render: () => {
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({ ...createDefaultDockPrefs(), quietUntilWeek: 8 }),
      );
      return <ChipDock collapsed={false} storage={storage} currentWeek={3} />;
    },
    contains: ['data-chip-control-id="enableGuidance"'],
    notContains: ['disabled=""'],
  },
];

export const SMOKE_CHIP_VOICE: readonly SmokeScenario[] = [
  {
    name: 'weekly bubble text always fits the dialogue budget',
    value: () => composeWeeklyDialogueText(
      `Must Do: ${'open Monday Briefing and read every injury note, '.repeat(8)}`,
      `Why: ${'because Advance Week locks everything you forgot to check, '.repeat(8)}`,
    ),
    contains: ['Must Do:'],
    assert: (haystack) => {
      expect(haystack.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
    },
  },
  {
    name: 'weekly bubble text composes deterministically for identical inputs',
    value: () => {
      const first = composeWeeklyDialogueText('Must Do: open Roster.', 'Why: roles expire at Advance Week.');
      const second = composeWeeklyDialogueText('Must Do: open Roster.', 'Why: roles expire at Advance Week.');
      return first === second ? first : `${first}!=${second}`;
    },
    contains: ['Must Do: open Roster. Why: roles expire at Advance Week.'],
    notContains: ['!='],
  },
  {
    name: 'store weekly dialogue drives the dock portrait pose',
    before: () => {
      useChipStore.getState().showWeeklyDialogue({
        id: 'chip.weekly.smoke',
        beat: 0,
        pose: 'reviewing-tablet',
        text: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups and morale.',
        archetype: 'weekly',
      });
    },
    render: () => (
      <ChipDock collapsed={false} storage={new MemoryStorage()}>
        <p>Must Do: open Monday Briefing. Where: Action Center.</p>
      </ChipDock>
    ),
    contains: [
      'data-chip-pose="reviewing-tablet"',
      'Must Do: open Monday Briefing. Where: Action Center.',
    ],
  },
];

export const SMOKE_CHIP_DETAILS: readonly SmokeScenario[] = [
  {
    name: 'contextDetails render in the dock details panel',
    before: () => {
      useChipStore.getState().showWeeklyDialogue({
        id: 'chip.weekly.smokeDetails',
        beat: 0,
        pose: 'reviewing-tablet',
        text: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups and morale.',
        contextDetails: [
          'What changed: Week 7.',
          'Why: smoke scenario pins the details panel.',
        ],
        archetype: 'weekly',
      });
    },
    render: () => (
      <ChipDock collapsed={false} storage={new MemoryStorage()}>
        <p>Weekly dialogue bubble</p>
      </ChipDock>
    ),
    contains: [
      'data-chip-dock-details="true"',
      // Details render as split label/body spans, so pin the parts.
      'What changed',
      'Week 7.',
      'smoke scenario pins the details panel',
    ],
  },
  {
    name: 'the details panel stays hidden without contextDetails',
    before: () => {
      useChipStore.getState().showWeeklyDialogue({
        id: 'chip.weekly.smokeNoDetails',
        beat: 0,
        pose: 'reviewing-tablet',
        text: 'Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center.',
        archetype: 'weekly',
      });
    },
    render: () => (
      <ChipDock collapsed={false} storage={new MemoryStorage()}>
        <p>Weekly dialogue bubble</p>
      </ChipDock>
    ),
    contains: ['Weekly dialogue bubble'],
    notContains: ['data-chip-dock-details="true"'],
  },
];

export const SMOKE_CHIP_WHERE_AM_I: readonly SmokeScenario[] = [
  {
    name: 'base Where Am I beat reports week, record, and rank',
    value: () => createWhereAmIBeat(BASE_WHERE_AM_I).text,
    contains: ['Week 7/18, 4-3, Division 2.', 'Must Do: none right now.'],
  },
  {
    name: 'pending decisions beat the summary to Ask Chip',
    value: () => {
      const beat = createAskChipLiveBeat({ pendingDecisionTotal: 3, whereAmI: BASE_WHERE_AM_I });
      return beat ? `${beat.id}|${beat.text}` : 'null';
    },
    contains: ['chip.dock.pending|'],
    notContains: ['null'],
  },
  {
    name: 'Ask Chip answers with the Where Am I summary when only context exists',
    value: () => {
      const beat = createAskChipLiveBeat({ whereAmI: BASE_WHERE_AM_I });
      return beat ? `${beat.id}|${beat.text}` : 'null';
    },
    contains: ['chip.dock.summary|', 'Week 7/18, 4-3, Division 2.'],
  },
  {
    name: 'Ask Chip never dead-buttons with no context at all',
    value: () => {
      const beat = createAskChipLiveBeat({});
      return beat ? `${beat.id}|${beat.text}` : 'null';
    },
    contains: ['chip.dock.summary|', 'Must Do: open Monday Briefing.'],
    notContains: ['null'],
  },
  {
    name: 'the dock renders the Where am I control',
    render: () => (
      <ChipDock collapsed={false} storage={new MemoryStorage()} whereAmI={BASE_WHERE_AM_I} />
    ),
    contains: ['data-chip-control-id="whereAmI"', 'Where am I?'],
  },
];

describe('SMOKE_CHIP_* harness (E12/I8)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    useChipStore.getState().reset();
  });

  const suites: ReadonlyArray<readonly [string, readonly SmokeScenario[]]> = [
    ['SMOKE_CHIP_DOCK_CONTROLS', SMOKE_CHIP_DOCK_CONTROLS],
    ['SMOKE_CHIP_VOICE', SMOKE_CHIP_VOICE],
    ['SMOKE_CHIP_DETAILS', SMOKE_CHIP_DETAILS],
    ['SMOKE_CHIP_WHERE_AM_I', SMOKE_CHIP_WHERE_AM_I],
  ];

  for (const [suiteName, scenarios] of suites) {
    describe(suiteName, () => {
      for (const scenario of scenarios) {
        it(scenario.name, () => {
          vi.stubEnv('VITE_CHIP_ENABLED', 'true');
          runSmokeScenario(scenario);
        });
      }
    });
  }
});
