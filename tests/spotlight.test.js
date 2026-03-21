import { describe, expect, it } from 'vitest';
import { Spotlight } from '../src/components/Spotlight.jsx';

describe('Spotlight', () => {
  it('exports a function component', () => {
    expect(typeof Spotlight).toBe('function');
  });

  it('returns null when not open', () => {
    var result = Spotlight({ isOpen: false });
    expect(result).toBeNull();
  });
});
