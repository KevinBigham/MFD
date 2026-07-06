import { describe, expect, it } from 'vitest';
import {
  DEPTH_CHART_FIELD_STARTER_TARGET,
  countDepthChartStarterFlags,
  getDepthChartStarterReadout,
} from './depth-chart-starters';

describe('depth chart starter readout', () => {
  it('counts saved starter flags without validating formation shape', () => {
    expect(countDepthChartStarterFlags([
      { isStarter: true },
      { isStarter: false },
      {},
      { isStarter: true },
    ])).toBe(2);
  });

  it('uses the shared 22-flag urgency target', () => {
    expect(DEPTH_CHART_FIELD_STARTER_TARGET).toBe(22);
    expect(getDepthChartStarterReadout(20)).toEqual({
      marked: 20,
      target: 22,
      missing: 2,
      complete: false,
    });
    expect(getDepthChartStarterReadout(22).complete).toBe(true);
    expect(getDepthChartStarterReadout(24).missing).toBe(0);
  });
});

