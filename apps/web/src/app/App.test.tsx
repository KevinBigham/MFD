// @ts-nocheck - test-only file, vitest provides node APIs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('App Chip setup wiring', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

  it('loads the app-shell stylesheet and exposes shell landmarks for layout CSS', () => {
    expect(content).toContain("import './app-shell.css';");
    expect(content).toContain('data-mfd-app-shell="true"');
    expect(content).toContain('data-mfd-main-content="true"');
    expect(content).toContain('data-mfd-brand-lockup="true"');
    expect(content).toContain('data-mfd-nav-group={group.id}');
    expect(content).toContain('data-mfd-nav-actions="true"');
  });

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
    expect(content).toContain('const chipNewGameSetup = isChipNewGameSetup();');
    expect(content).toContain('newGame={chipNewGameSetup}');
  });

  it('wraps FranchiseSetupWizard in ChipHost at the setup gate', () => {
    expect(content).toContain('ChipHost');
    expect(content).toContain('<ChipHost');
    expect(content).toContain('stages={CHIP_FRANCHISE_SETUP_STAGES}');
    expect(content).toContain('companionAction={setupCompanionAction}');
    expect(content).toContain('onCompanionVisibleChange={setSetupCompanionVisible}');
    expect(content).toContain('{({ onStageAdvance }) => (');
    expect(content).toContain('companionPrimaryActionActive={setupCompanionVisible}');
    expect(content).toContain('onCompanionActionChange={(action) => setSetupCompanionAction(action)}');
    expect(content).toContain('onStageAdvance={onStageAdvance}');
    expect(content).toContain('</ChipHost>');
  });

  it('renders the post-setup shell through a dedicated Chip dock host', () => {
    expect(content).toContain('function PostSetupApp()');
    expect(content).toContain('<PoseEventEmitter />');
    expect(content).toContain('<PostSetupApp />');
    expect(content).toContain('<ChipDock');
    expect(content).toContain('<RouterProvider router={router} />');
  });

  it('keeps the legacy tutorial overlay out of the Chip-enabled shell', () => {
    expect(content).toContain('const chipFeatureEnabled = isChipFeatureEnabled();');
    expect(content).toContain('highlightedPath={!chipFeatureEnabled && tutorial.active && !tutorial.dismissed ? currentTutorialStep?.targetScreen ?? null : null}');
    expect(content).toContain('{!chipFeatureEnabled && tutorial.active && !tutorial.dismissed && currentTutorialStep ? (');
  });

  it('starts Chip events only inside the post-setup shell', () => {
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const setupBranchStart = content.indexOf('if (setupIncomplete)');
    const setupBranchEnd = content.lastIndexOf('<PostSetupApp />');

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
    expect(content).toContain('const chipRouteBeats = useActiveRouteBeats(chipDockRoute, { currentWeek: chipDockWeek });');
    expect(content).toContain('routeBeats={chipRouteBeats}');
  });

  it('passes pending decision counts into the post-setup ChipDock', () => {
    expect(content).toContain("import { countPendingDecisions } from '../features/companion/decisionsPending'");
    expect(content).toContain('const chipGame = useGameStore((s) => s.game);');
    expect(content).toContain('const chipPendingDecisions = useMemo(');
    expect(content).toContain('() => countPendingDecisions({ game: chipGame }),');
    expect(content).toContain('[chipGame],');
    expect(content).not.toContain('useGameStore(countPendingDecisions)');
    expect(content).toContain('pendingDecisions={chipPendingDecisions}');
  });

  it('passes Where Am I season context into the post-setup ChipDock', () => {
    expect(content).toContain("import { resolveWhereAmIState } from '../features/companion/whereAmI'");
    expect(content).toContain('const chipWhereAmI = useMemo(');
    expect(content).toContain('() => resolveWhereAmIState({ game: chipGame }, chipPendingDecisions.total),');
    expect(content).toContain('[chipGame, chipPendingDecisions.total],');
    expect(content).toContain('whereAmI={chipWhereAmI}');
  });

  it('passes dynasty-year indicator context into the post-setup ChipDock', () => {
    expect(content).toContain('const chipUserTeam = useGameStore(selectUserTeam);');
    expect(content).toContain("const chipCoachName = chipUserTeam?.staff.hc?.name ?? 'Coach';");
    expect(content).toContain('dynastyIndicator={{ seasonYear: chipDockSeason, coachName: chipCoachName }}');
  });

  it('mounts Sprint 46 atmosphere emitters beside the app shell controllers', () => {
    expect(content).toContain("import { EraTransitionEmitter } from '../features/dynasty-era/EraTransitionEmitter'");
    expect(content).toContain("import { ChampionshipParadeEmitter } from '../features/playoffs/ChampionshipParadeEmitter'");
    expect(content).toContain('<AudioController />');
    expect(content).toContain('<EraTransitionEmitter />');
    expect(content).toContain('<ChampionshipParadeEmitter />');
  });

  it('registers the Sprint 46 achievements gallery route additively', () => {
    expect(content).toContain("const LazyAchievementsGallery = lazy(async () => ({ default: (await import('../features/franchise/AchievementsGallery')).AchievementsGallery }));");
    expect(content).toContain("path: '/franchise/achievements'");
    expect(content).toContain('routeTree.addChildren([...(routeTree.children ?? []), achievementsRoute]);');
  });

  it('registers the Sprint 46 weather forecast route additively', () => {
    expect(content).toContain("const LazyWeatherForecast = lazy(async () => ({ default: (await import('../features/league/WeatherForecast')).WeatherForecast }));");
    expect(content).toContain("path: '/league/weather'");
    expect(content).toContain('routeTree.addChildren([...(routeTree.children ?? []), weatherForecastRoute]);');
  });
});
