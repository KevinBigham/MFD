import { describe, expect, it } from 'vitest';
import { useBreakpoint } from '../src/components/useBreakpoint.jsx';

describe('useBreakpoint hook', () => {
  it('exports useBreakpoint function', () => {
    expect(typeof useBreakpoint).toBe('function');
  });

  it('has expected name', () => {
    expect(useBreakpoint.name).toBe('useBreakpoint');
  });
});
