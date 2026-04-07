import { describe, expect, it } from 'vitest';
import { RingProgress } from '../src/components/RingProgress.jsx';

describe('RingProgress', () => {
  it('exports a function component', () => {
    expect(typeof RingProgress).toBe('function');
  });
});
