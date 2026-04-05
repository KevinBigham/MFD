import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AtmosphereReport } from './AtmosphereReport';

describe('AtmosphereReport', () => {
  it('returns null when no atmosphere data', () => {
    const markup = renderToStaticMarkup(<AtmosphereReport atmosphere={null} />);
    expect(markup).toBe('');
  });

  it('renders crowd energy and hostility meters', () => {
    const markup = renderToStaticMarkup(
      <AtmosphereReport
        atmosphere={{
          crowdEnergy: 85,
          hostility: 70,
          noise: 60,
          intensity: 'regular',
          factors: ['sold out'],
        }}
      />,
    );
    expect(markup).toContain('CROWD');
    expect(markup).toContain('HOSTILE');
    expect(markup).toContain('NOISE');
    expect(markup).toContain('ENERGY 85');
  });

  it('renders intensity badge for playoff games', () => {
    const markup = renderToStaticMarkup(
      <AtmosphereReport
        atmosphere={{
          crowdEnergy: 95,
          hostility: 90,
          noise: 80,
          intensity: 'playoff',
          factors: ['playoff atmosphere'],
        }}
      />,
    );
    expect(markup).toContain('PLAYOFF');
  });

  it('renders super bowl intensity', () => {
    const markup = renderToStaticMarkup(
      <AtmosphereReport
        atmosphere={{
          crowdEnergy: 100,
          hostility: 95,
          noise: 90,
          intensity: 'super_bowl',
          factors: ['Super Bowl', 'electric atmosphere'],
        }}
      />,
    );
    expect(markup).toContain('SUPER BOWL');
    expect(markup).toContain('ELECTRIC ATMOSPHERE');
  });

  it('renders rivalry intensity', () => {
    const markup = renderToStaticMarkup(
      <AtmosphereReport
        atmosphere={{
          crowdEnergy: 80,
          hostility: 75,
          noise: 65,
          intensity: 'rivalry',
          factors: ['rivalry game', 'dome'],
        }}
      />,
    );
    expect(markup).toContain('RIVALRY');
    expect(markup).toContain('DOME');
  });

  it('renders factor badges', () => {
    const markup = renderToStaticMarkup(
      <AtmosphereReport
        atmosphere={{
          crowdEnergy: 60,
          hostility: 50,
          noise: 40,
          intensity: 'regular',
          factors: ['sold out', 'dome', 'dominant home team'],
        }}
      />,
    );
    expect(markup).toContain('SOLD OUT');
    expect(markup).toContain('DOMINANT HOME TEAM');
  });
});
