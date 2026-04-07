import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('rookie funnel wiring', () => {
  function readMonolith() {
    var monolithPath = path.resolve(__dirname, '../mr-football-v100.jsx');
    return fs.readFileSync(monolithPath, 'utf8');
  }

  it('imports rookie funnel helper module', () => {
    var src = readMonolith();
    expect(src.includes("from './src/app/rookie-funnel.js'")).toBe(true);
  });

  it('starts rookie flow from PRESS START path', () => {
    var src = readMonolith();
    expect(src.includes('startRookieFlow();')).toBe(true);
    expect(src.includes('runRookieTransition("Setting up your rookie funnel..."')).toBe(true);
  });

  it('routes team pick through rookie-aware draft opener', () => {
    var src = readMonolith();
    expect(src.includes('openDraftModeForTeam(i);')).toBe(true);
    expect(src.includes('openDraftModeForTeam(tdIdx97[t.id]);')).toBe(true);
  });

  it('bypasses FO detours for instant start during rookie flow', () => {
    var src = readMonolith();
    expect(src.includes('if(m.type==="quick"&&rookieFlow&&rookieFlow.active){')).toBe(true);
    expect(src.includes('startRookieInstantLeague(expTeamIdx);')).toBe(true);
  });

  it('gates coach card with helper predicate on league home week 1', () => {
    var src = readMonolith();
    expect(src.includes('shouldShowRookieCoachCard(rookieFlow,{screen:screen,tab:tab,phase:season.phase,week:season.week})')).toBe(true);
  });

  it('completes rookie flow on first game and triggers confetti/modal', () => {
    var src = readMonolith();
    expect(src.includes('if(rookieFlow&&rookieFlow.active&&rookieFlow.step===ROOKIE_STEPS.FIRST_GAME){')).toBe(true);
    expect(src.includes('setRookieCompletionOpen(true);')).toBe(true);
    expect(src.includes('setShowConfetti(true);')).toBe(true);
  });
});
