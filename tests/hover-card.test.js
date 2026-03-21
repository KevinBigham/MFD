import { describe, expect, it } from 'vitest';
import { HoverCard } from '../src/components/HoverCard.jsx';

describe('HoverCard', () => {
  it('exports a function component', () => {
    expect(typeof HoverCard).toBe('function');
  });

  it('returns children when no player is provided', () => {
    var result = HoverCard({ player: null, children: 'name' });
    expect(result).toBe('name');
  });

  it('returns children when player is undefined', () => {
    var result = HoverCard({ children: 'name' });
    expect(result).toBe('name');
  });
});
