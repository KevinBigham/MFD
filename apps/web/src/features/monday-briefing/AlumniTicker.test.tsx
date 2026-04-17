import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlumniTicker } from './AlumniTicker';

const updates = [
  {
    subjectId: 'legend-a',
    subjectName: 'Avery Stone',
    text: 'joined the MFSN broadcast booth and immediately sounded like a veteran analyst.',
    year: 2030,
    category: 'broadcasting' as const,
  },
  {
    subjectId: 'legend-b',
    subjectName: 'Bishop Vale',
    text: 'hit the Hall of Fame ballot and became the first name everyone mentioned.',
    year: 2030,
    category: 'hof' as const,
  },
];

describe('AlumniTicker', () => {
  it('renders nothing when there are no alumni updates', () => {
    expect(renderToStaticMarkup(<AlumniTicker updates={[]} reducedMotion />)).toBe('');
  });

  it('renders a populated alumni band with the update copy', () => {
    const markup = renderToStaticMarkup(<AlumniTicker updates={updates} reducedMotion />);

    expect(markup).toContain('WHERE ARE THEY NOW');
    expect(markup).toContain('Avery Stone');
    expect(markup).toContain('broadcast booth');
    expect(markup).toContain('Bishop Vale');
  });

  it('switches to a static list when reduced motion is enabled', () => {
    const markup = renderToStaticMarkup(<AlumniTicker updates={updates} reducedMotion />);

    expect(markup).toContain('data-motion="reduced"');
    expect(markup).not.toContain('data-motion="marquee"');
  });

  it('preserves the provided update ordering', () => {
    const markup = renderToStaticMarkup(<AlumniTicker updates={updates} reducedMotion />);

    expect(markup.indexOf('Avery Stone')).toBeLessThan(markup.indexOf('Bishop Vale'));
  });
});
