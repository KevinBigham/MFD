import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChronicleEventType } from '../../lib/dynasty-chronicle';
import { ChronicleFilters } from './ChronicleFilters';

function buildCounts(
  overrides: Partial<Record<ChronicleEventType, number>> = {},
): Record<ChronicleEventType, number> {
  return {
    championship_win: 2,
    hof_induction: 1,
    playoff_round: 3,
    season_end: 5,
    coach_championship: 1,
    coach_hire: 2,
    coach_retire: 1,
    scrapbook_note: 4,
    ...overrides,
  };
}

describe('ChronicleFilters', () => {
  it('renders one chip per event type', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts()}
        active={new Set<ChronicleEventType>(['championship_win'])}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    const chipMatches = markup.match(/data-testid="chronicle-filter-chip"/g) ?? [];
    expect(chipMatches).toHaveLength(8);
  });

  it('marks active chips with data-filter-active="true" and inactive with "false"', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts()}
        active={new Set<ChronicleEventType>(['championship_win', 'hof_induction'])}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(markup).toMatch(/data-filter-type="championship_win"[^>]*data-filter-active="true"/);
    expect(markup).toMatch(/data-filter-type="hof_induction"[^>]*data-filter-active="true"/);
    expect(markup).toMatch(/data-filter-type="playoff_round"[^>]*data-filter-active="false"/);
  });

  it('renders the count for each chip from the counts prop', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts({ playoff_round: 7 })}
        active={new Set<ChronicleEventType>()}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(markup).toMatch(/data-filter-type="playoff_round"[^>]*data-filter-count="7"/);
    expect(markup).toMatch(/data-filter-type="championship_win"[^>]*data-filter-count="2"/);
  });

  it('assigns accent colors by event type', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts()}
        active={new Set<ChronicleEventType>()}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(markup).toMatch(/data-filter-type="championship_win"[^>]*data-filter-accent="gold"/);
    expect(markup).toMatch(/data-filter-type="hof_induction"[^>]*data-filter-accent="gold"/);
    expect(markup).toMatch(/data-filter-type="playoff_round"[^>]*data-filter-accent="cyan"/);
    expect(markup).toMatch(/data-filter-type="coach_hire"[^>]*data-filter-accent="green"/);
    expect(markup).toMatch(/data-filter-type="season_end"[^>]*data-filter-accent="default"/);
    expect(markup).toMatch(/data-filter-type="scrapbook_note"[^>]*data-filter-accent="default"/);
  });

  it('renders a reset button with the expected test id and label', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts()}
        active={new Set<ChronicleEventType>()}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(markup).toMatch(/data-testid="chronicle-filter-reset"/);
    expect(markup).toContain('RESET');
  });

  it('renders zero-count chips without hiding them', () => {
    const markup = renderToStaticMarkup(
      <ChronicleFilters
        counts={buildCounts({ scrapbook_note: 0 })}
        active={new Set<ChronicleEventType>()}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(markup).toMatch(/data-filter-type="scrapbook_note"[^>]*data-filter-count="0"/);
  });
});
