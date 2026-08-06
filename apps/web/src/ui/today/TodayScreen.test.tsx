import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OPTIONAL_TASKS, agmTask, buildTaskLedger, type UiTask } from '../tasks/task-ledger';
import { TodayScreen } from './TodayScreen';
import { presentToday, type TodayInput } from './today-presenter';

const CLEAR = {
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
    team: { name: 'Lakeview Ridgebacks', wins: 9, losses: 4, ties: 0 },
    opponent: { name: 'Harbor Cutters', wins: 7, losses: 6, ties: 0, isHome: true },
    tasks: buildTaskLedger(CLEAR),
    recommendations: [],
    ...overrides,
  };
}

function render(overrides: Partial<TodayInput> = {}): string {
  return renderToStaticMarkup(
    <TodayScreen view={presentToday(input(overrides))} onNavigate={() => {}} />,
  );
}

const BLOCKED = { tasks: buildTaskLedger({ ...CLEAR, hasGamePlan: false }) };
const BUSY = {
  tasks: buildTaskLedger({
    phase: 'regular_season', hasGamePlan: false, starterCount: 12, tradeOfferCount: 2, ownerApproval: 30, injuredCount: 4,
  }),
  recommendations: [
    agmTask({ id: 'injury_watch', priority: 'urgent', title: 'Injury fix', body: 'Two starters out.', targetRoute: '/roster' }),
    agmTask({ id: 'cap_trouble', priority: 'high', title: 'Over the cap', body: 'No cap space.', targetRoute: '/contracts' }),
  ] as UiTask[],
};

describe('first viewport', () => {
  it('carries every LAY-04 first-viewport element', () => {
    const html = render(BLOCKED);

    expect(html).toContain('Regular Season');
    expect(html).toContain('Week 14');
    expect(html).toContain('2026');
    expect(html).toContain('Lakeview Ridgebacks · 9–4');
    expect(html).toContain('vs Harbor Cutters');
    expect(html).toContain('Set your game plan');
    expect(html).toContain('1 blocker');
    expect(html).toContain('Advance Week');
  });

  it('marks the screen and its readiness state for the geometry harness', () => {
    expect(render(BLOCKED)).toContain('data-mfd-v2-readiness="blocked"');
    expect(render()).toContain('data-mfd-v2-readiness="ready"');
    expect(render({ tasks: buildTaskLedger({ ...CLEAR, injuredCount: 2 }) }))
      .toContain('data-mfd-v2-readiness="attention"');
  });
});

describe('semantics', () => {
  it('has exactly one h1, and it names the franchise', () => {
    const html = render();
    expect([...html.matchAll(/<h1\b/g)]).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Lakeview Ridgebacks · 9–4<\/h1>/);
  });

  it('labels every lane region with its own heading', () => {
    const html = render(BUSY);
    for (const id of ['today-must', 'today-recommended', 'today-optional']) {
      expect(html, id).toContain(`aria-labelledby="${id}-heading"`);
      expect(html, id).toContain(`id="${id}-heading"`);
    }
  });

  it('renders tasks as a list, not a pile of divs', () => {
    const html = render(BUSY);
    expect(html).toMatch(/<ul[^>]*><li/);
  });

  it('announces readiness politely rather than as an alert', () => {
    const html = render(BLOCKED);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it('offers a skip link before the chrome', () => {
    const html = render();
    const skip = html.indexOf('Skip to main content');
    expect(skip).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(html.indexOf('Regular Season'));
  });
});

describe('task rows', () => {
  it('makes each row a real link to its destination', () => {
    const html = render(BLOCKED);
    expect(html).toContain('href="#/game-plan"');
    expect(html).toContain('data-mfd-v2-task="game-plan-missing"');
  });

  it('shows what, why, and where on every visible row', () => {
    const html = render(BLOCKED);
    expect(html).toContain('Set your game plan');
    expect(html).toContain('No prep plan locked for this week');
    expect(html).toContain('Set Plan · Game Plan');
  });

  it('carries the consequence, so the row explains why it matters', () => {
    expect(render(BLOCKED))
      .toContain('Advance Week sends you to Game Plan until a prep plan is saved for this matchup.');
  });

  it('pairs the severity accent with a machine-readable value, never colour alone', () => {
    const html = render(BLOCKED);
    expect(html).toContain('data-mfd-v2-severity="blocking"');
  });

  it('renders merged duplicates rather than discarding them', () => {
    const html = render({
      tasks: buildTaskLedger({ ...CLEAR, injuredCount: 3 }),
      recommendations: [agmTask({ id: 'injury_watch', priority: 'urgent', title: 'Injury fix: 2 starters sidelined', body: 'Hale and Grant are out.', targetRoute: '/roster' })],
    });

    expect(html).toContain('3 injured players');
    expect(html).toContain('Injury fix: 2 starters sidelined');
    expect(html).toContain('Hale and Grant are out.');
  });
});

describe('bounded content', () => {
  it('keeps the standing lane collapsed but present in the DOM', () => {
    const html = render();

    expect(html).toContain('Show 7 optional moves');
    for (const task of OPTIONAL_TASKS) {
      expect(html, task.id).toContain(task.title);
    }
  });

  it('discloses recommended overflow instead of truncating it', () => {
    const html = render(BUSY);
    expect(html).toMatch(/Show \d+ more recommended/);
    expect(html).toContain('Owner patience is dropping');
    expect(html).toContain('Over the cap');
  });

  it('uses native details/summary so nothing depends on JavaScript state', () => {
    const html = render(BUSY);
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });
});

describe('readiness dock', () => {
  it('blocks the primary action and offers the way out in the same place', () => {
    const html = render(BLOCKED);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('1 blocker: Set your game plan');
    expect(html).toContain('href="#/game-plan"');
    expect(html).toContain('data-mfd-v2-blocked="true"');
  });

  it('offers Advance Week when nothing blocks it', () => {
    const html = render();
    expect(html).toContain('data-mfd-v2-blocked="false"');
    expect(html).not.toContain('aria-disabled="true"');
    expect(html).toContain('Advance Week');
  });

  it('names the dock as a landmark', () => {
    expect(render()).toContain('aria-label="Week readiness"');
  });
});

describe('empty and edge states', () => {
  it('explains an empty Must Do lane rather than leaving a gap', () => {
    expect(render()).toContain('Nothing is blocking Advance Week this week.');
  });

  it('renders a bye week as an explanation, not a missing region', () => {
    const html = render({ opponent: null });
    expect(html).toContain('No game scheduled this week');
  });

  it('renders without a team, a matchup, or a single task', () => {
    const html = renderToStaticMarkup(
      <TodayScreen
        view={presentToday({
          season: 2026, week: 1, phase: 'offseason', team: null, opponent: null, tasks: [], recommendations: [],
        })}
        onNavigate={() => {}}
      />,
    );
    expect(html).toContain('No team selected');
    expect(html).toContain('data-mfd-v2-readiness="ready"');
  });
});

describe('style isolation', () => {
  it('adds no inline layout styles — WP-22 starts from zero here', () => {
    expect(render(BUSY)).not.toContain('style="');
  });

  it('reads no legacy token, so it cannot inherit or repaint the old shell', () => {
    const source = [
      new URL('./TodayScreen.tsx', import.meta.url),
      new URL('./today.module.css', import.meta.url),
    ].map((url) => readFileSync(url, 'utf8')).join('\n');

    const legacyTokens = [...source.matchAll(/var\(\s*(--mfd-(?!v2-)[\w-]+)/g)].map((match) => match[1]);
    expect(legacyTokens).toEqual([]);
  });
});
