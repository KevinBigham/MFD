import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { CHIP_GUIDANCE_SCREEN_TARGETS } from './guidanceScreens';

/**
 * D6 route guard. Every "Where:" target Chip names in weekly guidance must
 * resolve to a live nav route. The alias table in guidanceScreens.ts is the
 * audited mapping; this test enforces both directions so neither the copy nor
 * the route tree can drift away from it:
 *
 * - copy -> table: every table key must still appear in weeklyGuidance.ts (or
 *   the locked weekly fallback catalog), so deleted copy cannot leave stale
 *   aliases behind;
 * - table -> routes: every table value must be a nav label registered in
 *   App.tsx, so a renamed route fails here instead of stranding players.
 */
describe('Chip guidance screen targets', () => {
  const appSource = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf-8');
  const guidanceSource = readFileSync(new URL('./weeklyGuidance.ts', import.meta.url), 'utf-8');
  const weeklyFallbackSource = readFileSync(new URL('./dialogue/weekly.ts', import.meta.url), 'utf-8');
  const copySource = `${guidanceSource}\n${weeklyFallbackSource}`;

  const navLabels = new Set(
    [...appSource.matchAll(/label: '([^']+)'/g)].map((match) => match[1]!),
  );

  it('maps every named screen to a registered nav label', () => {
    for (const [screenName, navLabel] of Object.entries(CHIP_GUIDANCE_SCREEN_TARGETS)) {
      expect(
        navLabels.has(navLabel),
        `"${screenName}" targets "${navLabel}", which is not a nav label in App.tsx`,
      ).toBe(true);
    }
  });

  it('keeps every alias key present in the guidance copy', () => {
    for (const screenName of Object.keys(CHIP_GUIDANCE_SCREEN_TARGETS)) {
      expect(
        copySource.includes(screenName),
        `"${screenName}" no longer appears in weekly guidance copy; remove or update its alias`,
      ).toBe(true);
    }
  });

  it('never targets the retired screen names fixed in the D5 audit', () => {
    expect(guidanceSource).not.toContain('Coaching, Facility, or Medical');
    expect(guidanceSource).not.toContain('Depth Chart, Training, Game Plan');
    expect(guidanceSource).not.toContain('Trades, Waivers, Practice Squad');
  });
});
