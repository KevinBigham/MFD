import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChronicleEvent } from '../../lib/dynasty-chronicle';

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  PixelModal: ({ open, title, children }: any) => (open ? (
    <section data-mock="modal">
      <h2>{title}</h2>
      {children}
    </section>
  ) : null),
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelMetricCard: ({ label, value }: any) => (
      <div data-mock="metric-card">
        <span>{label}</span>
        <span>{String(value)}</span>
      </div>
    ),
    autoGrid: () => ({}),
    display: {},
    monoSm: {},
    teamThemeVars: () => ({}),
  };
});

import { ChronicleEventDetailModal } from './ChronicleEventDetailModal';

const championshipEvent: ChronicleEvent = {
  id: 'champ-2032',
  type: 'championship_win',
  year: 2032,
  teamAbbr: 'CHI',
  record: '13-4',
};

const hofEvent: ChronicleEvent = {
  id: 'hof-2032',
  type: 'hof_induction',
  year: 2032,
  playerName: 'Cole Stone',
  position: 'QB',
};

const playoffEvent: ChronicleEvent = {
  id: 'p-2032',
  type: 'playoff_round',
  year: 2032,
  round: 'super_bowl',
  outcome: 'win',
  finalScore: '27-20',
  headline: 'Crown',
};

describe('ChronicleEventDetailModal', () => {
  it('renders nothing when open is false', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={championshipEvent} open={false} onClose={() => undefined} />,
    );

    expect(markup).toBe('');
  });

  it('renders nothing when event is null', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={null} open onClose={() => undefined} />,
    );

    expect(markup).toBe('');
  });

  it('renders the event title and year when open for a championship', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={championshipEvent} open onClose={() => undefined} />,
    );

    expect(markup).toContain('CHAMPIONSHIP WON');
    expect(markup).toContain('2032');
    expect(markup).toContain('CHI finished 13-4 and closed the year with a title.');
  });

  it('renders facts as labeled metric cards for a championship', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={championshipEvent} open onClose={() => undefined} />,
    );

    expect(markup).toContain('Team');
    expect(markup).toContain('CHI');
    expect(markup).toContain('Record');
    expect(markup).toContain('13-4');
  });

  it('exposes the event kind and accent for style overrides', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={hofEvent} open onClose={() => undefined} />,
    );

    expect(markup).toContain('data-chronicle-kind="hof_induction"');
    expect(markup).toContain('data-chronicle-accent="gold"');
    expect(markup).toContain('HALL OF FAME');
    expect(markup).toContain('Cole Stone entered the Hall of Fame as a QB.');
  });

  it('title-cases playoff round and outcome labels for the header badges and facts', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={playoffEvent} open onClose={() => undefined} />,
    );

    expect(markup).toContain('SUPER BOWL ROUND');
    expect(markup).toContain('Super Bowl');
    expect(markup).toContain('Win');
    expect(markup).toContain('27-20');
  });

  it('renders a Close button', () => {
    const markup = renderToStaticMarkup(
      <ChronicleEventDetailModal event={championshipEvent} open onClose={() => undefined} />,
    );

    expect(markup).toContain('Close');
  });
});
