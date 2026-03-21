import { describe, expect, it } from 'vitest';
import { KpiCard } from '../src/components/KpiCard.jsx';

describe('KpiCard', () => {
  it('exports a function component', () => {
    expect(typeof KpiCard).toBe('function');
  });
});
