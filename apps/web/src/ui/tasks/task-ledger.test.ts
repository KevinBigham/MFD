import { describe, expect, it } from 'vitest';
import { APP_ROUTE_REGISTRY, appRoute } from '@mfd/engine/config';
import {
  FIELD_STARTER_TARGET,
  OPTIONAL_TASKS,
  OWNER_APPROVAL_FLOOR,
  buildTaskLedger,
  noRecommendationsTask,
  readyToAdvanceTask,
  taskDestination,
  type TaskLedgerInput,
  type UiTask,
} from './task-ledger';
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

  it('never blocks Advance Week — that is what makes it optional', () => {
    expect(OPTIONAL_TASKS.some((task) => task.blocksAdvance)).toBe(false);
  });
});
