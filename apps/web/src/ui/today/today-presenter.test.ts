import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_TASKS,
  agmTask,
  buildTaskLedger,
  type UiTask,
} from '../tasks/task-ledger';
import {
  OPTIONAL_VISIBLE,
  RECOMMENDED_VISIBLE,
  presentToday,
  type TodayInput,
} from './today-presenter';
import { KNOWN_PHASES, phaseVocabulary } from './phase-vocabulary';

const TEAM = { name: 'Lakeview Ridgebacks', wins: 9, losses: 4, ties: 0 };
const OPPONENT = { name: 'Harbor Cutters', wins: 7, losses: 6, ties: 0, isHome: true };

const CLEAR_LEDGER = {
  phase: 'regular_season',
  hasGamePlan: true,
  starterCount: 22,
  tradeOfferCount: 0,
  ownerApproval: 80,
  injuredCount: 0,
};

function input(overrides: Partial<TodayInput> = {}): TodayInput {
  return {
    season: 2026,
    week: 14,
    phase: 'regular_season',
    team: TEAM,
    opponent: OPPONENT,
    tasks: buildTaskLedger(CLEAR_LEDGER),
    recommendations: [],
    ...overrides,
  };
}

function agm(id: string, priority: 'urgent' | 'high' | 'medium' | 'low', route: string): UiTask {
  return agmTask({ id, priority, title: `${id} title`, body: `${id} body`, targetRoute: route });
}

describe('context', () => {
  it('leads with phase, week, season, and record', () => {
    const { context } = presentToday(input());
    expect(context).toEqual({
      phase: 'Regular Season',
      week: 'Week 14',
      season: '2026',
      team: 'Lakeview Ridgebacks · 9–4',
      purpose: 'Set injuries, depth, and Game Plan before Advance Week; standings punish missed weekly choices.',
    });
  });

  it('shows a tie in the record only when there is one', () => {
    expect(presentToday(input({ team: { ...TEAM, ties: 1 } })).context.team)
      .toBe('Lakeview Ridgebacks · 9–4–1');
    expect(presentToday(input()).context.team).toBe('Lakeview Ridgebacks · 9–4');
  });

  it('omits the record entirely before a team has played', () => {
    expect(presentToday(input({ team: { name: 'Lakeview Ridgebacks', wins: 0, losses: 0, ties: 0 } })).context.team)
      .toBe('Lakeview Ridgebacks');
  });

  it('drops the week number in phases where a week is meaningless', () => {
    expect(presentToday(input({ phase: 'free_agency', week: 1 })).context.week).toBe('Free Agency');
    expect(presentToday(input({ phase: 'draft', week: 1 })).context.week).toBe('Draft');
    expect(presentToday(input({ phase: 'playoffs', week: 19 })).context.week).toBe('Week 19');
    expect(presentToday(input({ phase: 'preseason', week: 1 })).context.week).toBe('Week 1');
  });

  it('carries a purpose line for every phase the engine can be in', () => {
    for (const phase of KNOWN_PHASES) {
      const { context } = presentToday(input({ phase }));
      expect(context.purpose, phase).toBe(phaseVocabulary(phase).tip);
      expect(context.purpose.length, phase).toBeGreaterThan(0);
    }
  });

  it('stays legible for a phase nobody has written copy for yet', () => {
    const { context } = presentToday(input({ phase: 'expansion_window' }));
    expect(context.phase).toBe('Expansion Window');
    expect(context.purpose).toBe('');
  });

  it('says so plainly when there is no team', () => {
    expect(presentToday(input({ team: null })).context.team).toBe('No team selected');
  });
});

describe('opponent', () => {
  it('names the matchup and the venue', () => {
    expect(presentToday(input()).opponent).toEqual({
      headline: 'vs Harbor Cutters',
      detail: '7–6 · home',
      hasGame: true,
    });
  });

  it('flips the preposition on the road', () => {
    const { opponent } = presentToday(input({ opponent: { ...OPPONENT, isHome: false } }));
    expect(opponent.headline).toBe('at Harbor Cutters');
    expect(opponent.detail).toBe('7–6 · away');
  });

  it('explains an empty bye week instead of hiding the region', () => {
    const { opponent } = presentToday(input({ opponent: null }));
    expect(opponent.hasGame).toBe(false);
    expect(opponent.headline).toBe('No game scheduled this week');
    expect(opponent.detail.length).toBeGreaterThan(0);
  });

  it('explains a game-free phase in that phase’s own words', () => {
    const { opponent } = presentToday(input({ phase: 'draft', opponent: null }));
    expect(opponent.headline).toBe('No game during Draft');
    expect(opponent.detail).toBe(phaseVocabulary('draft').tip);
  });

  it('never leaves the reason blank, even for an unknown phase', () => {
    const { opponent } = presentToday(input({ phase: 'expansion_window', opponent: null }));
    expect(opponent.detail).toBe('The weekly matchup returns when the schedule resumes.');
  });
});

describe('task grouping', () => {
  it('puts the blocker in Must Do and shows every one of them', () => {
    const { mustDo } = presentToday(input({ tasks: buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false }) }));
    expect(mustDo.tasks.map((task) => task.id)).toEqual(['game-plan-missing']);
    expect(mustDo.hidden).toEqual([]);
  });

  it('never hides a Must Do task behind a disclosure, however many there are', () => {
    const blockers: UiTask[] = Array.from({ length: 6 }, (_, index) => ({
      ...buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false })[0]!,
      id: `blocker-${index}`,
      dedupeKey: `blocker-${index}`,
    }));
    const { mustDo } = presentToday(input({ tasks: blockers }));
    expect(mustDo.tasks).toHaveLength(6);
    expect(mustDo.hidden).toHaveLength(0);
  });

  it('bounds the recommended lane at three and keeps the overflow reachable', () => {
    const tasks = buildTaskLedger({
      phase: 'regular_season', hasGamePlan: true, starterCount: 12, tradeOfferCount: 2, ownerApproval: 30, injuredCount: 4,
    });
    const { recommended } = presentToday(input({
      tasks,
      recommendations: [agm('roster_gaps', 'medium', '/team-needs'), agm('cap_trouble', 'high', '/contracts')],
    }));

    // Pinned literally, not against the constant: an assertion that reads the
    // budget it is checking passes at any budget, which is no assertion at all.
    expect(RECOMMENDED_VISIBLE).toBe(3);
    expect(recommended.tasks.map((task) => task.id))
      .toEqual(['depth-chart-incomplete', 'trade-offers-pending', 'owner-patience-low']);
    expect(recommended.hidden.map((task) => task.id))
      .toEqual(['injuries-unresolved', 'agm-roster_gaps', 'agm-cap_trouble']);
  });

  it('collapses the whole standing lane by default — it is the 2.5-viewport budget', () => {
    const { optional } = presentToday(input());
    expect(OPTIONAL_VISIBLE).toBe(0);
    expect(optional.tasks).toHaveLength(0);
    expect(optional.hidden.length).toBeGreaterThan(0);
  });

  it('keeps the all-clear placeholder out of the lanes — the readiness dock says it once', () => {
    const view = presentToday(input());
    expect(view.mustDo.tasks).toEqual([]);
    expect([...view.recommended.tasks, ...view.recommended.hidden].map((task) => task.id))
      .not.toContain('ready-to-advance');
    expect(view.readiness.state).toBe('ready');
  });

  it('merges the three roster voices into one row before it groups anything', () => {
    const view = presentToday(input({
      tasks: buildTaskLedger({ ...CLEAR_LEDGER, injuredCount: 3 }),
      recommendations: [agm('injury_watch', 'urgent', '/roster')],
    }));

    const all = [
      ...view.mustDo.tasks, ...view.mustDo.hidden,
      ...view.recommended.tasks, ...view.recommended.hidden,
      ...view.optional.tasks, ...view.optional.hidden,
    ];
    const roster = all.filter((task) => task.dedupeKey === 'roster-moves');
    expect(roster).toHaveLength(1);
    expect(roster[0]!.id).toBe('injuries-unresolved');
    expect(roster[0]!.merged.map((task) => task.id))
      .toEqual(['agm-injury_watch', 'optional-roster-training-medical']);
  });

  it('loses no task: every input row is visible, disclosed, or merged into one that is', () => {
    const tasks = buildTaskLedger({
      phase: 'regular_season', hasGamePlan: false, starterCount: 12, tradeOfferCount: 2, ownerApproval: 30, injuredCount: 4,
    });
    const recommendations = [
      agm('injury_watch', 'urgent', '/roster'),
      agm('cap_trouble', 'high', '/contracts'),
      agm('next_opponent', 'medium', '/game-plan'),
    ];
    const view = presentToday(input({ tasks, recommendations }));

    const reachable = new Set<string>();
    for (const section of [view.mustDo, view.recommended, view.optional]) {
      for (const task of [...section.tasks, ...section.hidden]) {
        reachable.add(task.id);
        for (const merged of task.merged) reachable.add(merged.id);
      }
    }

    for (const task of [...tasks, ...recommendations, ...OPTIONAL_TASKS]) {
      expect(reachable.has(task.id), task.id).toBe(true);
    }
  });
});

describe('readiness', () => {
  it('counts blockers and quotes the first one’s consequence', () => {
    const { readiness } = presentToday(input({ tasks: buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false }) }));
    expect(readiness.state).toBe('blocked');
    expect(readiness.headline).toBe('1 blocker');
    expect(readiness.detail).toBe('Advance Week sends you to Game Plan until a prep plan is saved for this matchup.');
    expect(readiness.action).toEqual({ label: 'Set Plan', route: '/game-plan' });
    expect(readiness.summary).toBe('1 blocker: Set your game plan');
  });

  it('pluralises the blocker count', () => {
    const first = buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false })[0]!;
    const { readiness } = presentToday(input({
      tasks: [first, { ...first, id: 'second-blocker', dedupeKey: 'second-blocker' }],
    }));
    expect(readiness.headline).toBe('2 blockers');
  });

  it('stays advanceable when only advice is open, and says how much', () => {
    const { readiness } = presentToday(input({ tasks: buildTaskLedger({ ...CLEAR_LEDGER, injuredCount: 2 }) }));
    expect(readiness.state).toBe('attention');
    expect(readiness.action.route).toBe('/week-advance');
    expect(readiness.detail).toBe('Advance Week is available. 1 recommended move is still open.');
  });

  it('pluralises the open-move count', () => {
    const { readiness } = presentToday(input({
      tasks: buildTaskLedger({ ...CLEAR_LEDGER, injuredCount: 2, tradeOfferCount: 1 }),
    }));
    expect(readiness.detail).toBe('Advance Week is available. 2 recommended moves are still open.');
  });

  it('says nothing is waiting when nothing is', () => {
    const { readiness } = presentToday(input());
    expect(readiness).toEqual({
      state: 'ready',
      headline: 'Ready to advance',
      detail: 'Nothing is waiting on you. Advance Week when you are ready.',
      summary: 'Nothing is waiting on you.',
      action: { label: 'Advance Week', route: '/week-advance' },
    });
  });

  it('never reports ready while a blocker is open', () => {
    for (const injured of [0, 3]) {
      const view = presentToday(input({
        tasks: buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false, injuredCount: injured }),
      }));
      expect(view.readiness.state).toBe('blocked');
      expect(view.readiness.action.route).not.toBe('/week-advance');
    }
  });
});

describe('primary task', () => {
  it('is the blocker whenever there is one', () => {
    const view = presentToday(input({
      tasks: buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false, injuredCount: 3 }),
    }));
    expect(view.primary?.id).toBe('game-plan-missing');
    expect(view.readiness.action.route).toBe(view.primary?.destination.route);
  });

  it('falls back to the loudest recommendation', () => {
    const view = presentToday(input({ tasks: buildTaskLedger({ ...CLEAR_LEDGER, starterCount: 12 }) }));
    expect(view.primary?.id).toBe('depth-chart-incomplete');
  });

  it('is null on a clear week rather than inventing something to do', () => {
    expect(presentToday(input()).primary).toBeNull();
  });
});

describe('purity', () => {
  it('returns identical output for identical input and mutates nothing', () => {
    const source = input({
      tasks: buildTaskLedger({ ...CLEAR_LEDGER, hasGamePlan: false, injuredCount: 2 }),
      recommendations: [agm('cap_trouble', 'high', '/contracts')],
    });
    const before = JSON.stringify(source);

    expect(presentToday(source)).toEqual(presentToday(source));
    expect(JSON.stringify(source)).toBe(before);
  });

  it('survives an empty ledger without throwing or inventing a task', () => {
    const view = presentToday(input({ tasks: [], recommendations: [] }));
    expect(view.primary).toBeNull();
    expect(view.mustDo.tasks).toEqual([]);
    expect(view.readiness.state).toBe('ready');
    expect(view.optional.hidden).toHaveLength(OPTIONAL_TASKS.length);
  });
});
