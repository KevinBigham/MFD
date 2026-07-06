import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerDevelopmentView } from './PlayerDevelopment';

describe('PlayerDevelopmentView', () => {
  it('renders fallback when no report', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={null}
        projections={[]}
        breakoutCandidates={[]}
        coachImpact={null}
      />,
    );
    expect(markup).toContain('No development data');
  });

  it('renders archetype alignment info', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={{
          playerId: 'p1',
          playerName: 'John Smith',
          pos: 'QB',
          age: 24,
          ovr: 78,
          archetypeAlignment: 72,
          archetypeLabel: 'Pocket Passer',
          topGrowthRatings: [{ rating: 'accuracy', delta: 2.5 }],
          coachImpact: 'Great coaching impact.',
          evolutionRisk: 'none',
          projectedOvr: 80,
        }}
        projections={[{ year: 1, projectedOvr: 80, confidence: 80 }]}
        breakoutCandidates={[]}
        coachImpact="Great coaching impact."
        playerOptions={[
          { id: 'p1', name: 'John Smith', pos: 'QB', age: 24, ovr: 78 },
          { id: 'p2', name: 'Jane Runner', pos: 'RB', age: 23, ovr: 81 },
        ]}
        selectedPlayerId="p1"
      />,
    );
    expect(markup).toContain('Pocket Passer');
    expect(markup).toContain('72% ALIGNED');
    expect(markup).toContain('accuracy');
    expect(markup).toContain('DEVELOPMENT PLAYER');
    expect(markup).toContain('John Smith - QB 78 OVR');
    expect(markup).toContain('Jane Runner - RB 81 OVR');
  });

  it('renders evolution risk badge when present', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={{
          playerId: 'p2',
          playerName: 'Speed Demon',
          pos: 'QB',
          age: 22,
          ovr: 72,
          archetypeAlignment: 35,
          archetypeLabel: 'Game Manager',
          topGrowthRatings: [],
          coachImpact: '',
          evolutionRisk: 'likely',
          projectedOvr: 74,
        }}
        projections={[]}
        breakoutCandidates={[]}
        coachImpact={null}
      />,
    );
    expect(markup).toContain('EVOLUTION LIKELY');
  });

  it('renders breakout candidates', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={{
          playerId: 'p1',
          playerName: 'John Smith',
          pos: 'QB',
          age: 24,
          ovr: 78,
          archetypeAlignment: 60,
          archetypeLabel: 'Dual Threat',
          topGrowthRatings: [],
          coachImpact: '',
          evolutionRisk: 'none',
          projectedOvr: 80,
        }}
        projections={[]}
        breakoutCandidates={[
          { playerId: 'p3', playerName: 'Rising Star', pos: 'WR', age: 23, ovr: 82, ovrDelta: 5, reason: 'Strong 5-point improvement.' },
        ]}
        coachImpact={null}
      />,
    );
    expect(markup).toContain('Rising Star');
    expect(markup).toContain('+5 OVR');
    expect(markup).toContain('BREAKOUT CANDIDATES');
  });

  it('renders OVR projections with confidence', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={{
          playerId: 'p1',
          playerName: 'John Smith',
          pos: 'RB',
          age: 22,
          ovr: 75,
          archetypeAlignment: 80,
          archetypeLabel: 'Power Back',
          topGrowthRatings: [],
          coachImpact: '',
          evolutionRisk: 'none',
          projectedOvr: 78,
        }}
        projections={[
          { year: 1, projectedOvr: 78, confidence: 80 },
          { year: 2, projectedOvr: 81, confidence: 60 },
        ]}
        breakoutCandidates={[]}
        coachImpact={null}
      />,
    );
    expect(markup).toContain('+1 yr');
    expect(markup).toContain('+2 yr');
    expect(markup).toContain('80% conf');
  });

  it('labels development sources without implying progression writes', () => {
    const markup = renderToStaticMarkup(
      <PlayerDevelopmentView
        report={{
          playerId: 'p1',
          playerName: 'John Smith',
          pos: 'LB',
          age: 23,
          ovr: 76,
          archetypeAlignment: 68,
          archetypeLabel: 'Field General',
          topGrowthRatings: [],
          coachImpact: '',
          evolutionRisk: 'none',
          projectedOvr: 78,
        }}
        projections={[{ year: 1, projectedOvr: 78, confidence: 80 }]}
        breakoutCandidates={[]}
        coachImpact={null}
      />,
    );

    expect(markup).toContain('DEVELOPMENT SOURCES');
    expect(markup).toContain('Selected roster player');
    expect(markup).toContain('Pure engine helpers');
    expect(markup).toContain('No progression write');
    expect(markup).toContain('for the selected roster player');
    expect(markup).toContain('Opening it does not run progression');
    expect(markup).toContain('alter archetypes, spend training-camp work, mutate coach effects, or write player history');
  });
});
