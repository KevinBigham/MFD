import { describe, expect, it } from 'vitest';

import {
  ROOKIE_STEPS,
  advanceRookieFlow,
  completeRookieFlow,
  createRookieFlow,
  formatRookieDuration,
  shouldShowRookieCoachCard,
} from '../src/app/rookie-funnel.js';

describe('rookie funnel helper', () => {
  it('creates a new flow on team step', () => {
    var flow = createRookieFlow(1000);
    expect(flow.active).toBe(true);
    expect(flow.step).toBe(ROOKIE_STEPS.TEAM);
    expect(flow.startedAtMs).toBe(1000);
    expect(flow.stepStartedAtMs).toBe(1000);
    expect(flow.firstGameMs).toBe(null);
  });

  it('advances through valid step chain only', () => {
    var flow = createRookieFlow(1000);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.MODE, 2000);
    expect(flow.step).toBe(ROOKIE_STEPS.MODE);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.FIRST_GAME, 3000);
    expect(flow.step).toBe(ROOKIE_STEPS.FIRST_GAME);

    var blocked = advanceRookieFlow(flow, ROOKIE_STEPS.TEAM, 4000);
    expect(blocked.step).toBe(ROOKIE_STEPS.FIRST_GAME);
    expect(blocked.stepStartedAtMs).toBe(3000);
  });

  it('can skip from any active step', () => {
    var flow = createRookieFlow(1000);
    var skipped = advanceRookieFlow(flow, ROOKIE_STEPS.SKIPPED, 2500);
    expect(skipped.step).toBe(ROOKIE_STEPS.SKIPPED);
    expect(skipped.active).toBe(false);
    expect(skipped.skipped).toBe(true);
    expect(skipped.completedAtMs).toBe(2500);
  });

  it('completes and computes first-game duration', () => {
    var flow = createRookieFlow(1000);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.MODE, 1500);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.FIRST_GAME, 2000);
    flow = completeRookieFlow(flow, 90500);
    expect(flow.step).toBe(ROOKIE_STEPS.COMPLETE);
    expect(flow.active).toBe(false);
    expect(flow.firstGameMs).toBe(89500);
  });

  it('formats duration as m:ss', () => {
    expect(formatRookieDuration(0)).toBe('0:00');
    expect(formatRookieDuration(59999)).toBe('0:59');
    expect(formatRookieDuration(120000)).toBe('2:00');
    expect(formatRookieDuration(125000)).toBe('2:05');
  });

  it('shows coach card only in week-1 league home first-game state', () => {
    var flow = createRookieFlow(1000);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.MODE, 1500);
    flow = advanceRookieFlow(flow, ROOKIE_STEPS.FIRST_GAME, 2000);

    expect(shouldShowRookieCoachCard(flow, {
      screen: 'league',
      tab: 'home',
      phase: 'regular',
      week: 1,
    })).toBe(true);

    expect(shouldShowRookieCoachCard(flow, {
      screen: 'league',
      tab: 'roster',
      phase: 'regular',
      week: 1,
    })).toBe(false);

    expect(shouldShowRookieCoachCard(flow, {
      screen: 'league',
      tab: 'home',
      phase: 'regular',
      week: 2,
    })).toBe(false);
  });
});
