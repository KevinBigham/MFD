// @ts-nocheck - test-only file, vitest provides node APIs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('App Chip setup wiring', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

  it('defines the 9 Chip onboarding stages in beat order', () => {
    const ids = Array.from(content.matchAll(/id: '(chip\.onboarding\.beat-\d)'/g), (match) => match[1]);

    expect(ids).toEqual([
      'chip.onboarding.beat-1',
      'chip.onboarding.beat-2',
      'chip.onboarding.beat-3',
      'chip.onboarding.beat-4',
      'chip.onboarding.beat-5',
      'chip.onboarding.beat-6',
      'chip.onboarding.beat-7',
      'chip.onboarding.beat-8',
      'chip.onboarding.beat-9',
    ]);
  });

  it('maps Chip stage labels to the Slice A setup beats', () => {
    const labels = Array.from(content.matchAll(/label: '([^']+)', content: null/g), (match) => match[1]);

    expect(labels).toEqual([
      'Cold Open',
      'Team Select',
      'AGM Hire',
      'Depth Philosophy',
      'Season Goals',
      'Culture Mandate',
      'Blueprint Reveal',
      'Kickoff',
      'Dashboard Handoff',
    ]);
  });

  it('uses the existing first-ten localStorage marker for new-game detection', () => {
    expect(content).toContain("import { readFirstTenMinutesCompleted } from '../features/franchise-setup/setupPersistence'");
    expect(content).toContain('export function isChipNewGameSetup(storage: ChipSetupStorage = resolveChipSetupStorage()): boolean');
    expect(content).toContain('return !readFirstTenMinutesCompleted(storage);');
  });

  it('reads the first-ten marker fresh on every render (PR #18 P2 fix — no stale memo)', () => {
    // Stale-memo regression guard: chipNewGame must NOT be cached across the
    // App lifetime, otherwise a user finishing setup and starting another
    // franchise in the same SPA session would see Chip onboarding twice.
    expect(content).not.toMatch(/useMemo\(\(\) => isChipNewGameSetup/);
    expect(content).not.toMatch(/const chipNewGame = useMemo/);
    expect(content).toContain('<ChipHost newGame={isChipNewGameSetup()} stages={CHIP_FRANCHISE_SETUP_STAGES}>');
  });

  it('wraps FranchiseSetupWizard in ChipHost at the setup gate', () => {
    expect(content).toContain('ChipHost');
    expect(content).toContain('<ChipHost newGame={isChipNewGameSetup()} stages={CHIP_FRANCHISE_SETUP_STAGES}>');
    expect(content).toContain('{({ onStageAdvance }) => (');
    expect(content).toContain('<FranchiseSetupWizard onStageAdvance={onStageAdvance} />');
    expect(content).toContain('</ChipHost>');
  });

  it('renders the post-setup shell through a dedicated Chip dock host', () => {
    expect(content).toContain('function PostSetupApp()');
    expect(content).toContain('return <PostSetupApp />;');
    expect(content).toContain('<ChipDock');
    expect(content).toContain('<RouterProvider router={router} />');
  });

  it('starts Chip events only inside the post-setup shell', () => {
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const setupBranchStart = content.indexOf('if (setupIncomplete)');
    const setupBranchEnd = content.indexOf('return <PostSetupApp />;');

    expect(content.slice(postSetupStart)).toContain('useChipEvents();');
    expect(content.slice(setupBranchStart, setupBranchEnd)).not.toContain('useChipEvents();');
  });

  it('passes game week context and active dialogue text into ChipDock', () => {
    expect(content).toContain('currentWeek={chipDockWeek}');
    expect(content).toContain('currentSeason={chipDockSeason}');
    expect(content).toContain('currentRoute={chipDockRoute}');
    expect(content).toContain('chipDialogueText ?');
  });

  it('passes active route coaching beats into the post-setup ChipDock', () => {
    expect(content).toContain("import { useActiveRouteBeats } from '../features/route-coaching/useActiveRouteBeats'");
    expect(content).toContain('const chipRouteBeats = useActiveRouteBeats(chipDockRoute);');
    expect(content).toContain('routeBeats={chipRouteBeats}');
  });

  it('passes pending decision counts into the post-setup ChipDock', () => {
    expect(content).toContain("import { countPendingDecisions } from '../features/companion/decisionsPending'");
    expect(content).toContain('const chipPendingDecisions = useGameStore(countPendingDecisions);');
    expect(content).toContain('pendingDecisions={chipPendingDecisions}');
  });

  it('passes Where Am I season context into the post-setup ChipDock', () => {
    expect(content).toContain("import { resolveWhereAmIState } from '../features/companion/whereAmI'");
    expect(content).toContain('const chipWhereAmI = useGameStore((state) => resolveWhereAmIState(state, chipPendingDecisions.total));');
    expect(content).toContain('whereAmI={chipWhereAmI}');
  });
});
