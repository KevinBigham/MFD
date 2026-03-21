import { describe, expect, it } from 'vitest';
import { ChartSuspense } from '../src/components/charts/index.js';

describe('Chart adapters', () => {
  it('exports ChartSuspense function', () => {
    expect(typeof ChartSuspense).toBe('function');
  });

  it('ChartSuspense renders with fallback', () => {
    var el = ChartSuspense({ height: 200, children: null });
    expect(el).toBeTruthy();
  });

  it('lazy chart exports are objects (React.lazy)', () => {
    var charts = require('../src/components/charts/index.js');
    // React.lazy returns an object with $$typeof
    expect(charts.LazyLineChart).toBeTruthy();
    expect(charts.LazyBarChart).toBeTruthy();
    expect(charts.LazyRadarChart).toBeTruthy();
  });
});
