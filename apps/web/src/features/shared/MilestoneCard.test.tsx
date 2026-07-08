import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { MilestoneCard } from './MilestoneCard';

const defaultProps = {
  type: 'first_win' as const,
  headline: 'FIRST WIN!',
  detail: 'Your franchise has its first victory!',
  onDismiss: vi.fn(),
  duration: 10000,
};

describe('MilestoneCard', () => {
  const source = readFileSync(new URL('./MilestoneCard.tsx', import.meta.url), 'utf-8');

  it('renders the headline', () => {
    const html = renderToStaticMarkup(<MilestoneCard {...defaultProps} />);
    expect(html).toContain('FIRST WIN!');
  });

  it('renders the detail text', () => {
    const html = renderToStaticMarkup(<MilestoneCard {...defaultProps} />);
    expect(html).toContain('Your franchise has its first victory!');
  });

  it('renders different milestone types', () => {
    const html = renderToStaticMarkup(<MilestoneCard {...defaultProps} type="first_championship" headline="CHAMPIONS!" />);
    expect(html).toContain('CHAMPIONS!');
  });

  it('renders dismiss instruction', () => {
    const html = renderToStaticMarkup(<MilestoneCard {...defaultProps} />);
    expect(html).toContain('MILESTONE ACHIEVED');
  });

  it('renders with hof_inductee type', () => {
    const html = renderToStaticMarkup(<MilestoneCard {...defaultProps} type="hof_inductee" headline="HALL OF FAME" detail="A legend has been inducted!" />);
    expect(html).toContain('HALL OF FAME');
    expect(html).toContain('A legend has been inducted!');
  });

  it('does not mix border shorthand with borderColor during animation', () => {
    expect(source).not.toContain('borderColor: color');
    expect(source).toContain('border: `2px solid ${color}`');
  });
});
