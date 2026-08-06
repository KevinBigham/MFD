import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY, appRoute } from '@mfd/engine/config';
import type { AGMRecommendation, AGMRecommendationPriority } from '@mfd/engine';
import {
  FIELD_STARTER_TARGET,
  OPTIONAL_TASKS,
  OWNER_APPROVAL_FLOOR,
  agmTask,
  buildTaskLedger,
  mergeTaskLedger,
  noRecommendationsTask,
  readyToAdvanceTask,
  taskDestination,
  type TaskLedgerInput,
  type UiTask,
} from './task-ledger';
import { SEVERITY_ACCENT } from '../../features/monday-briefing/ActionCenter';
import { HUB_IDS } from '../routes/route-surface-types';
import { resolveCompatibleRoute } from '../routes/route-compatibility';

const CLEAR: TaskLedgerInput = {
  phase: 'regular_season',
  hasGamePlan: true,
  starterCount: FIELD_STARTER_TARGET,
  tradeOfferCount: 0,
  ownerApproval: 80,
  injuredCount: 0,
};

const ids = (tasks: UiTask[]): string[] => tasks.map((task) => task.id);

describe('buildTaskLedger', () => {
  it('produces the all-clear task when nothing needs attention', () => {
    expect(buildTaskLedger(CLEAR)).toEqual([readyToAdvanceTask()]);
  });

  it('emits tasks in the order the weekly board slices them', () => {
    const tasks = buildTaskLedger({
      phase: 'regular_season',
      hasGamePlan: false,
      starterCount: 15,
      tradeOfferCount: 2,
      ownerApproval: 30,
      injuredCount: 4,
    });

    expect(ids(tasks)).toEqual([
      'game-plan-missing',
      'depth-chart-incomplete',
      'trade-offers-pending',
      'owner-patience-low',
      'injuries-unresolved',
    ]);
  });

  it('blocks Advance Week for the missing game plan and nothing else', () => {
    const tasks = buildTaskLedger({
      phase: 'regular_season',
      hasGamePlan: false,
      starterCount: 15,
      tradeOfferCount: 2,
      ownerApproval: 30,
      injuredCount: 4,
    });

    expect(tasks.filter((task) => task.blocksAdvance).map((task) => task.id))
      .toEqual(['game-plan-missing']);
  });

  it('only asks for a game plan in weeks that have a game', () => {
    for (const phase of ['regular_season', 'playoffs']) {
      expect(ids(buildTaskLedger({ ...CLEAR, phase, hasGamePlan: false })))
        .toContain('game-plan-missing');
    }

    for (const phase of ['preseason', 'offseason', 'free_agency', 'draft', 'training_camp']) {
      expect(ids(buildTaskLedger({ ...CLEAR, phase, hasGamePlan: false })))
        .not.toContain('game-plan-missing');
    }
  });

  it('treats a full lineup and the approval floor as boundaries, not thresholds', () => {
    expect(ids(buildTaskLedger({ ...CLEAR, starterCount: FIELD_STARTER_TARGET })))
      .not.toContain('depth-chart-incomplete');
    expect(ids(buildTaskLedger({ ...CLEAR, starterCount: FIELD_STARTER_TARGET - 1 })))
      .toContain('depth-chart-incomplete');

    expect(ids(buildTaskLedger({ ...CLEAR, ownerApproval: OWNER_APPROVAL_FLOOR })))
      .not.toContain('owner-patience-low');
    expect(ids(buildTaskLedger({ ...CLEAR, ownerApproval: OWNER_APPROVAL_FLOOR - 1 })))
      .toContain('owner-patience-low');
  });

  it('counts and pluralises the way the board has always read', () => {
    const one = buildTaskLedger({ ...CLEAR, tradeOfferCount: 1, injuredCount: 1 });
    const many = buildTaskLedger({ ...CLEAR, tradeOfferCount: 3, injuredCount: 2 });

    expect(one.map((task) => task.title)).toEqual([
      '1 pending trade offer',
      '1 injured player',
    ]);
    expect(many.map((task) => task.title)).toEqual([
      '3 pending trade offers',
      '2 injured players',
    ]);
    expect(buildTaskLedger({ ...CLEAR, starterCount: 15 })[0]?.title)
      .toBe('Fill depth chart (15/22 starters)');
  });

  it('pins the severity of every state-derived task', () => {
    // Severity drives the card accent and the whole panel accent through
    // SEVERITY_ACCENT in ActionCenter. Nothing else fails when one flips, so
    // this is the guard.
    const tasks = buildTaskLedger({
      phase: 'regular_season',
      hasGamePlan: false,
      starterCount: 15,
      tradeOfferCount: 2,
      ownerApproval: 30,
      injuredCount: 4,
    });

    expect(tasks.map((task) => [task.id, task.severity])).toEqual([
      ['game-plan-missing', 'blocking'],
      ['depth-chart-incomplete', 'warning'],
      ['trade-offers-pending', 'warning'],
      // Red, but it never stops the week — that asymmetry is what makes the
      // panel go red while Advance Week stays available.
      ['owner-patience-low', 'blocking'],
      ['injuries-unresolved', 'warning'],
    ]);
    expect(readyToAdvanceTask().severity).toBe('clear');
    expect(noRecommendationsTask().severity).toBe('clear');
  });

  it('is pure: the same input twice gives identical output, and results are independent', () => {
    const input: TaskLedgerInput = { ...CLEAR, injuredCount: 2 };
    const first = buildTaskLedger(input);
    const second = buildTaskLedger(input);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));

    first[0]!.title = 'mutated';
    expect(buildTaskLedger(input)[0]?.title).not.toBe('mutated');
  });

  it('never emits a task without an actionable destination', () => {
    const everything = [
      ...buildTaskLedger({
        phase: 'regular_season',
        hasGamePlan: false,
        starterCount: 15,
        tradeOfferCount: 2,
        ownerApproval: 30,
        injuredCount: 4,
      }),
      ...OPTIONAL_TASKS,
      readyToAdvanceTask(),
      noRecommendationsTask(),
    ];

    for (const task of everything) {
      expect(task.title, task.id).toBeTruthy();
      expect(task.reason, task.id).toBeTruthy();
      expect(task.consequence, task.id).toBeTruthy();
      expect(task.destination.label, task.id).toBeTruthy();
      expect(task.destination.actionLabel, task.id).toBeTruthy();
    }
  });
});

describe('task destinations', () => {
  const allTasks: UiTask[] = [
    ...buildTaskLedger({
      phase: 'regular_season',
      hasGamePlan: false,
      starterCount: 15,
      tradeOfferCount: 2,
      ownerApproval: 30,
      injuredCount: 4,
    }),
    ...OPTIONAL_TASKS,
    readyToAdvanceTask(),
    noRecommendationsTask(),
  ];

  it('sends every task to a real registry route', () => {
    for (const task of allTasks) {
      expect(appRoute(task.destination.route), `${task.id} -> ${task.destination.route}`)
        .toBeDefined();
    }
  });

  it('sends every task to a route the new IA already covers', () => {
    for (const task of allTasks) {
      expect(HUB_IDS, `${task.id} has no hub`).toContain(task.destination.hub);
      expect(resolveCompatibleRoute(task.destination.route).status).toBe('alias');
    }
  });

  it('pins the destination label table, so a deletion cannot silently show a raw path', () => {
    // The divergence test below only catches labels that change. A deleted
    // label falls through to the route itself, which reads as a bug on screen
    // but passes every other assertion here.
    expect(Object.fromEntries(
      [
        '/game-plan', '/depth-chart', '/trades', '/trade-block', '/owner', '/roster',
        '/week-advance', '/contracts', '/cap-lab', '/waivers', '/practice-squad',
        '/free-agency', '/scouting', '/coaching', '/settings', '/dynasty', '/team-needs',
      ].map((route) => [route, taskDestination(route).label]),
    )).toEqual({
      '/game-plan': 'Game Plan',
      '/depth-chart': 'Depth Chart',
      '/trades': 'Trades',
      '/trade-block': 'Trade Block',
      '/owner': 'Owner',
      '/roster': 'Roster',
      '/week-advance': 'Advance Week',
      '/contracts': 'Contracts',
      '/cap-lab': 'Cap Lab',
      '/waivers': 'Waiver Wire',
      '/practice-squad': 'Practice Squad',
      '/free-agency': 'Free Agency',
      '/scouting': 'Scouting',
      '/coaching': 'Coaching',
      '/settings': 'Settings',
      '/dynasty': 'Save/Load',
      '/team-needs': 'Team Needs',
    });
  });

  it('pins the action verb for every task destination', () => {
    expect(taskDestination('/game-plan').actionLabel).toBe('Set Plan');
    expect(taskDestination('/depth-chart').actionLabel).toBe('Fix Depth');
    expect(taskDestination('/trades').actionLabel).toBe('Decide');
    expect(taskDestination('/roster').actionLabel).toBe('View');
    expect(taskDestination('/week-advance').actionLabel).toBe('Advance Week');
    expect(taskDestination('/owner').actionLabel).toBe('Open');
  });

  it('keeps exactly one deliberate label divergence from the registry', () => {
    const divergent = APP_ROUTE_REGISTRY
      .map((definition) => definition.path)
      .filter((path) => {
        const label = taskDestination(path).label;
        return label !== path && label !== appRoute(path)?.label;
      });

    // The board calls /owner "Owner"; the registry calls it "Owner Suite".
    // Unifying them would change rendered copy, which amendment A1 forbids
    // until the new shell owns the surface.
    expect(divergent).toEqual(['/owner']);
  });

  it('falls back to the raw path and a generic verb for an unmapped route', () => {
    expect(taskDestination('/league-pulse')).toEqual({
      route: '/league-pulse',
      label: '/league-pulse',
      actionLabel: 'Go',
      hub: 'league',
    });
  });

  it('lets a task override its label without losing the route', () => {
    expect(taskDestination('/contracts', 'Contracts / Cap Lab')).toMatchObject({
      route: '/contracts',
      label: 'Contracts / Cap Lab',
      actionLabel: 'Open',
    });
  });
});

describe('OPTIONAL_TASKS', () => {
  it('lists the standing optional lane with unique ids', () => {
    expect(OPTIONAL_TASKS).toHaveLength(7);
    expect(new Set(ids([...OPTIONAL_TASKS])).size).toBe(OPTIONAL_TASKS.length);
    expect(OPTIONAL_TASKS.every((task) => task.category === 'optional')).toBe(true);
  });

  it('pins the ids the board would persist verbatim as closed-card ids', () => {
    // The board passes these straight through as card ids, unlike the Must Do
    // and Recommended lanes, whose ids it builds from a lane index. The Optional
    // lane has no Close control yet, so only `recommended-clear` currently
    // reaches leagueEvents — but the day Optional gains one, renaming any of
    // these resurrects a card the player already dismissed. Frozen from now.
    expect(ids([...OPTIONAL_TASKS])).toEqual([
      'optional-roster-training-medical',
      'optional-depth',
      'optional-prep',
      'optional-cap',
      'optional-market',
      'optional-scouting-staff-facility',
      'optional-save',
    ]);
    expect(noRecommendationsTask().id).toBe('recommended-clear');
  });

  it('pins optional-lane severities, which set each card accent', () => {
    expect(OPTIONAL_TASKS.map((task) => [task.id, task.severity])).toEqual([
      ['optional-roster-training-medical', 'info'],
      ['optional-depth', 'info'],
      ['optional-prep', 'warning'],
      ['optional-cap', 'info'],
      ['optional-market', 'warning'],
      ['optional-scouting-staff-facility', 'info'],
      ['optional-save', 'clear'],
    ]);
  });

  it('never blocks Advance Week — that is what makes it optional', () => {
    expect(OPTIONAL_TASKS.some((task) => task.blocksAdvance)).toBe(false);
  });
});

/**
 * The historic table from `ActionCenter.tsx`, kept here verbatim as the thing
 * the AGM fold-in must not have changed. Amendment A1 pins legacy rendered
 * output for the whole migration, and card colour is rendered output.
 */
const LEGACY_PRIORITY_ACCENT: Record<AGMRecommendationPriority, string> = {
  urgent: 'red',
  high: 'gold',
  medium: 'cyan',
  low: 'green',
};

const AGM_PRIORITIES: AGMRecommendationPriority[] = ['urgent', 'high', 'medium', 'low'];

function recommendation(overrides: Partial<AGMRecommendation> = {}): AGMRecommendation {
  return {
    id: 'injury_watch',
    priority: 'urgent',
    title: 'Injury fix: 2 starters sidelined',
    body: 'Two starters will miss 2+ weeks.',
    targetRoute: '/roster',
    ...overrides,
  };
}

describe('agmTask', () => {
  it('lands on the same card accent the priority table used to produce', () => {
    for (const priority of AGM_PRIORITIES) {
      const task = agmTask(recommendation({ priority }));
      expect(SEVERITY_ACCENT[task.severity], priority).toBe(LEGACY_PRIORITY_ACCENT[priority]);
    }
  });

  it('pins the deadline copy for every priority, verbatim from the legacy board', () => {
    expect(agmTask(recommendation({ priority: 'urgent' })).consequence).toBe(
      'Recommended before Advance Week for lineup, cap space, or matchup changes. Advance Week remains available when no Must Do item stops it.',
    );
    expect(agmTask(recommendation({ priority: 'high' })).consequence).toBe(
      'Recommended this week: handle before Advance Week locks the next game for lineup, cap, depth, or Game Plan changes.',
    );
    expect(agmTask(recommendation({ priority: 'medium' })).consequence).toBe(
      'Recommended before kickoff for lineup, cap, depth, or Game Plan changes.',
    );
    expect(agmTask(recommendation({ priority: 'low' })).consequence).toBe(
      'Optional: handle lineup, cap space, market offer, staff plan, or matchup changes before Advance Week, offer expiration, market windows, or phase rules lock them. Advance Week remains available when no Must Do item stops it.',
    );
  });

  it('pins the lane word each priority carries, which the AGM modal prints as its badge', () => {
    expect(AGM_PRIORITIES.map((priority) => agmTask(recommendation({ priority })).category))
      .toEqual(['recommended', 'recommended', 'recommended', 'optional']);
  });

  it('builds the save-visible card id from the engine recommendation id', () => {
    expect(agmTask(recommendation({ id: 'cap_trouble' })).id).toBe('agm-cap_trouble');
  });

  it('sends a recommendation with no target route to Advance Week', () => {
    const task = agmTask(recommendation({ id: 'next_opponent', targetRoute: undefined }));
    expect(task.destination.route).toBe('/week-advance');
    expect(task.destination.actionLabel).toBe('Advance Week');
  });

  it('carries the recommendation body as the reason, never as the title', () => {
    const task = agmTask(recommendation({ title: 'Over the cap', body: 'You have $0K of cap space.' }));
    expect(task.title).toBe('Over the cap');
    expect(task.reason).toBe('You have $0K of cap space.');
  });

  it('never blocks Advance Week — advice is not a gate', () => {
    for (const priority of AGM_PRIORITIES) {
      expect(agmTask(recommendation({ priority })).blocksAdvance).toBe(false);
    }
  });

  it('gives an unrecognised recommendation a key of its own so it cannot be absorbed', () => {
    const task = agmTask(recommendation({ id: 'future_recommendation', targetRoute: '/roster' }));
    expect(task.dedupeKey).toBe('agm:future_recommendation');

    const merged = mergeTaskLedger([
      ...buildTaskLedger({ ...CLEAR, injuredCount: 3 }),
      task,
    ]);
    expect(merged.map((entry) => entry.id)).toContain('agm-future_recommendation');
  });

  it('pins which task each recommendation merges into, not merely that it has a key', () => {
    const engineSource = readFileSync(
      new URL('../../../../../packages/engine/src/systems/agm.ts', import.meta.url),
      'utf8',
    );
    const emitted = [...engineSource.matchAll(/^\s{6}id: '([a-z_]+)',$/gm)].map((match) => match[1]!);

    // Asserting only "a key was authored" let a wrong key through: pointing
    // `cap_trouble` at `save` merged "Over the cap" into "Save slot and backup
    // export" and 300 tests passed. The mapping is pinned entry by entry.
    const EXPECTED: Record<string, string> = {
      injury_watch: 'roster-moves',
      cap_trouble: 'cap',
      next_opponent: 'game-plan',
      roster_gaps: 'team-needs',
      marcus_cap_mandate: 'owner-mandate',
      sandra_development_mandate: 'development-mandate',
    };

    expect(emitted.slice().sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const id of emitted) {
      expect(agmTask(recommendation({ id })).dedupeKey, id).toBe(EXPECTED[id]);
    }
  });

  it('keeps an owner mandate out of the lane that would swallow it', () => {
    // Both mandates are active owner goals whose failure costs patience at
    // season end. Sandra's used to carry `roster-moves`, so any injured player
    // absorbed it into "N injured players" — taking its row, its link and its
    // at-risk accent with it. Sharing a route is not sharing a job.
    const sandra = agmTask(recommendation({ id: 'sandra_development_mandate', targetRoute: '/roster' }));
    const injuries = buildTaskLedger({ ...CLEAR, injuredCount: 3 })
      .find((task) => task.id === 'injuries-unresolved')!;

    expect(sandra.destination.route).toBe(injuries.destination.route);
    expect(mergeTaskLedger([injuries, sandra])).toHaveLength(2);
  });
});

describe('mergeTaskLedger', () => {
  it('collapses the three systems that all say "go to the roster screen"', () => {
    const state = buildTaskLedger({ ...CLEAR, injuredCount: 3 });
    const merged = mergeTaskLedger([
      ...state,
      agmTask(recommendation({ id: 'injury_watch', priority: 'urgent' })),
      ...OPTIONAL_TASKS,
    ]);

    const roster = merged.filter((task) => task.dedupeKey === 'roster-moves');
    expect(roster).toHaveLength(1);
    expect(roster[0]!.id).toBe('injuries-unresolved');
    expect(roster[0]!.merged.map((task) => task.id))
      .toEqual(['agm-injury_watch', 'optional-roster-training-medical']);
  });

  it('loses nothing: every input task is either a winner or attached to one', () => {
    const input = [
      ...buildTaskLedger({ phase: 'regular_season', hasGamePlan: false, starterCount: 12, tradeOfferCount: 2, ownerApproval: 30, injuredCount: 4 }),
      ...['injury_watch', 'cap_trouble', 'next_opponent'].map((id) => agmTask(recommendation({ id }))),
      ...OPTIONAL_TASKS,
    ];
    const merged = mergeTaskLedger(input);

    const survived = merged.flatMap((task) => [task.id, ...task.merged.map((entry) => entry.id)]);
    expect(survived.slice().sort()).toEqual(input.map((task) => task.id).sort());
  });

  it('lets the blocking task win its key even when advice arrives first', () => {
    const gamePlan = buildTaskLedger({ ...CLEAR, hasGamePlan: false })
      .find((task) => task.id === 'game-plan-missing')!;
    const scout = agmTask(recommendation({ id: 'next_opponent', priority: 'medium' }));

    const merged = mergeTaskLedger([scout, gamePlan]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.id).toBe('game-plan-missing');
    expect(merged[0]!.blocksAdvance).toBe(true);
    expect(merged[0]!.merged.map((task) => task.id)).toEqual(['agm-next_opponent']);
  });

  it('keeps a winner in the position its key was first seen', () => {
    const standing = OPTIONAL_TASKS.find((task) => task.dedupeKey === 'game-plan')!;
    const gamePlan = buildTaskLedger({ ...CLEAR, hasGamePlan: false })
      .find((task) => task.id === 'game-plan-missing')!;
    const save = OPTIONAL_TASKS.find((task) => task.dedupeKey === 'save')!;

    expect(mergeTaskLedger([standing, save, gamePlan]).map((task) => task.id))
      .toEqual(['game-plan-missing', 'optional-save']);
  });

  it('ranks state above the AGM above the standing lane at equal category', () => {
    const key = 'roster-moves';
    const asOptional = (id: string, source: UiTask['source']): UiTask => ({
      ...OPTIONAL_TASKS[0]!, id, source, dedupeKey: key,
    });

    expect(mergeTaskLedger([
      asOptional('standing', 'standing'),
      asOptional('agm', 'agm'),
      asOptional('state', 'state'),
    ])[0]!.id).toBe('state');

    expect(mergeTaskLedger([
      asOptional('standing', 'standing'),
      asOptional('agm', 'agm'),
    ])[0]!.id).toBe('agm');
  });

  it('keeps the owner mandate separate from the owner-approval warning', () => {
    const approval = buildTaskLedger({ ...CLEAR, ownerApproval: 20 })
      .find((task) => task.id === 'owner-patience-low')!;
    const mandate = agmTask(recommendation({ id: 'marcus_cap_mandate', targetRoute: '/owner' }));

    expect(approval.destination.route).toBe(mandate.destination.route);
    expect(mergeTaskLedger([approval, mandate])).toHaveLength(2);
  });

  it('is stable and pure: same input twice, identical output, inputs untouched', () => {
    const input = [...buildTaskLedger({ ...CLEAR, injuredCount: 1 }), ...OPTIONAL_TASKS];
    const frozen = JSON.stringify(input);
    expect(mergeTaskLedger(input)).toEqual(mergeTaskLedger(input));
    expect(JSON.stringify(input)).toBe(frozen);
  });

  it('returns an empty ledger for an empty input rather than inventing a row', () => {
    expect(mergeTaskLedger([])).toEqual([]);
  });
});

describe('dedupe keys', () => {
  it('gives every task a non-empty key', () => {
    const all = [
      ...buildTaskLedger({ phase: 'regular_season', hasGamePlan: false, starterCount: 0, tradeOfferCount: 1, ownerApproval: 1, injuredCount: 1 }),
      ...OPTIONAL_TASKS,
      readyToAdvanceTask(),
      noRecommendationsTask(),
    ];
    for (const task of all) {
      expect(task.dedupeKey, task.id).toMatch(/^[a-z][a-z0-9:-]*$/);
    }
  });

  it('keeps the two all-clear fallbacks distinct, so neither swallows the other', () => {
    const merged = mergeTaskLedger([readyToAdvanceTask(), noRecommendationsTask()]);
    expect(merged.map((task) => task.id)).toEqual(['ready-to-advance', 'recommended-clear']);
  });

  it('pins the source of every task the ledger can emit', () => {
    for (const task of buildTaskLedger({ phase: 'regular_season', hasGamePlan: false, starterCount: 0, tradeOfferCount: 1, ownerApproval: 1, injuredCount: 1 })) {
      expect(task.source, task.id).toBe('state');
    }
    for (const task of OPTIONAL_TASKS) {
      expect(task.source, task.id).toBe('standing');
    }
    expect(agmTask(recommendation()).source).toBe('agm');
  });
});
