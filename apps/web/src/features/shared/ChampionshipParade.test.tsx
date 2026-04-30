import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CelebrationOverlay } from './CelebrationOverlay';
import { ChampionshipParade } from './ChampionshipParade';
import { ParadeFloat } from './paradeFloatSvg';

const paradeProps = {
  teamCity: 'Chicago',
  teamName: 'Blaze',
  year: 2034,
  seasonRecord: '14-3',
  pointDifferential: 142,
  mvpName: 'Cole Stone',
  mvpNumber: 12,
  headCoachName: 'Terry Vale',
  coordinatorBadges: ['OC Surge', 'DC Wall'],
  keyMoments: ['Fourth-quarter dagger', 'Goal-line stand'],
  onDismiss: vi.fn(),
};

describe('ChampionshipParade', () => {
  it('renders the four championship parade floats', () => {
    const markup = renderToStaticMarkup(<ChampionshipParade {...paradeProps} />);

    expect(markup.match(/data-testid="championship-parade-float"/g)).toHaveLength(4);
    expect(markup).toContain('data-float-kind="trophy"');
    expect(markup).toContain('data-float-kind="fans"');
  });

  it('renders ParadeFloat with four wheels', () => {
    const markup = renderToStaticMarkup(<ParadeFloat banner="TEST FLOAT" />);

    expect(markup).toContain('TEST FLOAT');
    expect(markup.match(/data-testid="parade-float-wheel"/g)).toHaveLength(4);
  });

  it('shows the season record in the ticker tape', () => {
    const markup = renderToStaticMarkup(<ChampionshipParade {...paradeProps} />);

    expect(markup).toContain('Record 14-3');
    expect(markup).toContain('MVP Cole Stone');
  });

  it('renders the dismiss control for ending the parade', () => {
    const markup = renderToStaticMarkup(<ChampionshipParade {...paradeProps} />);

    expect(markup).toContain('END PARADE');
  });

  it('disables float and ticker animation styles for reduced motion', () => {
    const markup = renderToStaticMarkup(<ChampionshipParade {...paradeProps} reducedMotion />);

    expect(markup).toContain('data-parade-motion="reduced"');
    expect(markup).toContain('animation:none');
  });

  it('keeps CelebrationOverlay parade CTA hidden by default', () => {
    const markup = renderToStaticMarkup(
      <CelebrationOverlay
        teamCity="Chicago"
        teamName="Blaze"
        teamAbbrev="chi"
        year={2034}
        seasonRecord="14-3"
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain('CONTINUE TO OFFSEASON');
    expect(markup).not.toContain('WATCH PARADE');
  });

  it('shows CelebrationOverlay WATCH PARADE only when requested', () => {
    const markup = renderToStaticMarkup(
      <CelebrationOverlay
        teamCity="Chicago"
        teamName="Blaze"
        teamAbbrev="chi"
        year={2034}
        seasonRecord="14-3"
        onDismiss={vi.fn()}
        onParadeRequest={vi.fn()}
      />,
    );

    expect(markup).toContain('WATCH PARADE');
  });
});
