import { describe, expect, it } from 'vitest';
import { Skeleton } from '../src/components/Skeleton.jsx';

describe('Skeleton', () => {
  it('exports a function component', () => {
    expect(typeof Skeleton).toBe('function');
  });
});
