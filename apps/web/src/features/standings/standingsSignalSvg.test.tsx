import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StandingsSignalSvg, StreakSignalSvg } from './standingsSignalSvg';

describe('StandingsSignalSvg', () => {
  it('renders fire variant for streak W4+', () => {
    const markup = renderToStaticMarkup(<StreakSignalSvg streak={4} />);

    expect(markup).toContain('data-standings-signal="fire"');
    expect(markup).toContain('Hot streak (W4+)');
  });

  it('renders ice variant for streak L3+', () => {
    const markup = renderToStaticMarkup(<StreakSignalSvg streak={-3} />);

    expect(markup).toContain('data-standings-signal="ice"');
    expect(markup).toContain('Cold streak (L3+)');
  });

  it('renders nothing for short streaks', () => {
    expect(renderToStaticMarkup(<StreakSignalSvg streak={2} />)).toBe('');
    expect(renderToStaticMarkup(<StreakSignalSvg streak={-2} />)).toBe('');
  });

  it('renders locked playoff seed signal', () => {
    const markup = renderToStaticMarkup(<StandingsSignalSvg kind="seed_locked" title="Playoff seed locked" />);

    expect(markup).toContain('data-standings-signal="seed_locked"');
    expect(markup).toContain('Playoff seed locked');
  });

  it('renders bubble playoff seed signal', () => {
    const markup = renderToStaticMarkup(<StandingsSignalSvg kind="seed_bubble" title="Playoff bubble" />);

    expect(markup).toContain('data-standings-signal="seed_bubble"');
    expect(markup).toContain('Playoff bubble');
  });

  it('renders out-of-picture seed signal', () => {
    const markup = renderToStaticMarkup(<StandingsSignalSvg kind="seed_out" title="Outside playoff picture" />);

    expect(markup).toContain('data-standings-signal="seed_out"');
    expect(markup).toContain('Outside playoff picture');
  });

  it('renders division-leader laurel signal', () => {
    const markup = renderToStaticMarkup(<StandingsSignalSvg kind="division_leader" title="Division leader" />);

    expect(markup).toContain('data-standings-signal="division_leader"');
    expect(markup).toContain('Division leader');
  });
});
