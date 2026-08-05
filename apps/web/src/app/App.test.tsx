import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';

describe('App Chip setup wiring', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');
  const gameStoreContent = readFileSync(new URL('./store/game-store.ts', import.meta.url), 'utf-8');
  const selectorsContent = readFileSync(new URL('./store/selectors.ts', import.meta.url), 'utf-8');
  const agmSourceContent = readFileSync(new URL('../../../../packages/engine/src/systems/agm.ts', import.meta.url), 'utf-8');
  const actionCenterContent = readFileSync(new URL('../features/monday-briefing/ActionCenter.tsx', import.meta.url), 'utf-8');
  const weekAdvanceContent = readFileSync(new URL('../features/week-advance/WeekAdvance.tsx', import.meta.url), 'utf-8');
  const inboxMessagesContent = readFileSync(new URL('../features/inbox/buildInboxMessages.ts', import.meta.url), 'utf-8');
  const inboxTriageContent = readFileSync(new URL('../features/inbox/InboxTriage.tsx', import.meta.url), 'utf-8');
  const onboardingMachineContent = readFileSync(new URL('../features/companion/onboardingMachine.ts', import.meta.url), 'utf-8');
  const srcRoot = new URL('../', import.meta.url);

  function lineNumberForStoreIndex(index: number): number {
    return gameStoreContent.slice(0, index).split('\n').length;
  }

  function lineNumberForIndex(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }

  function lineNumberForAgmSourceIndex(index: number): number {
    return lineNumberForIndex(agmSourceContent, index);
  }

  function routeObjectTargets(source: string, file: string, routeKey: string): Array<{ path: string; file: string; line: number; routeKey: string }> {
    return Array.from(
      source.matchAll(new RegExp(`\\b${routeKey}:\\s*['"]([^'"]+)['"]`, 'g')),
      (match) => ({
        path: match[1] ?? '',
        file,
        line: lineNumberForIndex(source, match.index ?? 0),
        routeKey,
      }),
    );
  }

  function selectedRouteFallbackTargets(source: string, file: string): Array<{ path: string; file: string; line: number; routeKey: string }> {
    const block = source.match(/const selectedRoute = [\s\S]*?;\n {2}const selectedRouteLabel/)?.[0] ?? '';
    return Array.from(block.matchAll(/['"](\/[^'"]+)['"]/g), (match) => ({
      path: match[1] ?? '',
      file,
      line: lineNumberForIndex(source, (source.indexOf(block) < 0 ? 0 : source.indexOf(block)) + (match.index ?? 0)),
      routeKey: 'selectedRoute',
    }));
  }

  function listProductionSourceFiles(directory: URL): URL[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) return listProductionSourceFiles(child);
      if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
      if (/\.(?:test|stories)\.(?:ts|tsx)$/.test(entry.name)) return [];
      if (entry.name.endsWith('.d.ts')) return [];
      return [child];
    });
  }

  function relativeSourcePath(file: URL): string {
    return decodeURIComponent(file.pathname).replace(decodeURIComponent(srcRoot.pathname), 'src/');
  }

  function registeredRoutePaths(): Set<string> {
    const definitionsByName = new Map(
      Array.from(
        content.matchAll(/const\s+([A-Za-z0-9]+Route)\s*=\s*createRoute\(\{[\s\S]*?path:\s*'([^']+)'/g),
        (match) => [match[1] ?? '', match[2] ?? ''] as const,
      ),
    );
    const routeTreeBody = content.match(/const ROUTE_IMPLEMENTATIONS = \[([\s\S]*?)\]\s+as const;/)?.[1] ?? '';

    return new Set(
      Array.from(routeTreeBody.matchAll(/\b([a-z][A-Za-z0-9]+Route)\b/g), (match) => definitionsByName.get(match[1] ?? '') ?? null)
        .filter((path): path is string => typeof path === 'string' && path.length > 0),
    );
  }

  function normalizeRouteTarget(rawPath: string): string | null {
    const hashlessPath = rawPath.startsWith('#') ? rawPath.slice(1) || '/' : rawPath;
    if (!hashlessPath.startsWith('/')) return null;
    return hashlessPath.split(/[?#]/)[0] || '/';
  }

  function routeTargetIsRegistered(registeredPaths: Set<string>, rawPath: string): boolean {
    const path = normalizeRouteTarget(rawPath);
    if (path === null) return true;
    if (registeredPaths.has(path)) return true;

    const targetSegments = path.split('/');
    return Array.from(registeredPaths).some((registeredPath) => {
      const registeredSegments = registeredPath.split('/');
      if (registeredSegments.length !== targetSegments.length) return false;
      return registeredSegments.every((segment, index) => {
        const targetSegment = targetSegments[index] ?? '';
        if (segment === targetSegment) return true;
        return segment.startsWith('$') && /^\$\{[\s\S]+\}$/.test(targetSegment);
      });
    });
  }

  it('loads the app-shell stylesheet and exposes shell landmarks for layout CSS', () => {
    expect(content).toContain("import './app-shell.css';");
    expect(content).toContain('data-mfd-app-shell="true"');
    expect(content).toContain('data-mfd-main-content="true"');
    expect(content).toContain('data-mfd-brand-lockup="true"');
    expect(content).toContain('data-mfd-nav-group={group.id}');
    expect(content).toContain('data-mfd-nav-actions="true"');
  });

  it('announces lazy route loading without motion when requested', () => {
    expect(content).toContain('data-mfd-route-loading="true"');
    expect(content).toContain('role="status"');
    expect(content).toContain('aria-live="polite"');
    expect(content).toContain('aria-busy="true"');
    expect(content).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('defines the 10 Chip onboarding stages in beat order', () => {
    const ids = Array.from(content.matchAll(/id: '(chip\.onboarding\.beat-\d+)'/g), (match) => match[1]);

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
      'chip.onboarding.beat-10',
    ]);
  });

  it('maps Chip stage labels to the first-day setup phases', () => {
    const labels = Array.from(content.matchAll(/label: '([^']+)', content: null/g), (match) => match[1]);

    expect(labels).toEqual([
      'Hire Assistant GM',
      'Franchise Intel',
      'Meet Roster',
      'Hire Head Coach',
      'Hire Scouting Director',
      'Pick Schemes',
      'Starting Lineup',
      'Cap Plan',
      'Set Owner Goals',
      'Open Blueprint',
    ]);
  });

  it('uses the existing first-ten localStorage marker for new-game detection', () => {
    expect(content).toContain("import { readFirstTenMinutesCompleted } from '../features/franchise-setup/setupPersistence'");
    expect(content).toContain('export function isChipNewGameSetup(storage: ChipSetupStorage = resolveChipSetupStorage()): boolean');
    expect(content).toContain("import { resolveBrowserStorage } from '../features/companion/storageBoundary';");
    expect(content).toContain('return resolveBrowserStorage();');
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
    expect(content).toContain('{({ onStageAdvance, companionPanel, setCompanionDialogue }) => (');
    expect(content).toContain('companionPanel={companionPanel}');
    expect(content).toContain('companionPrimaryActionActive={setupCompanionVisible}');
    expect(content).toContain('onCompanionActionChange={(action) => setSetupCompanionAction(action)}');
    expect(content).toContain('onCompanionDialogueChange={setCompanionDialogue}');
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

  it('keeps RootLayout as the owner of global shortcuts and cleanup-backed route shortcuts', () => {
    const rootStart = content.indexOf('function RootLayout()');
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const rootBody = content.slice(rootStart, postSetupStart);
    const routeShortcutStart = rootBody.indexOf('const unregister = visibleNavItems');
    const routeShortcutBody = rootBody.slice(routeShortcutStart, routeShortcutStart + 800);

    expect(rootStart).toBeGreaterThan(0);
    expect(postSetupStart).toBeGreaterThan(rootStart);
    expect(rootBody).toContain('useGlobalKeyboard();');
    expect(rootBody).toContain('const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);');
    expect(rootBody).toContain("useShortcut('k', () => toggleCommandPalette(), 'Toggle command palette', { meta: true });");
    expect(rootBody).toContain("useShortcut('?', () => setShowHotkeyHelp(true), 'Open hotkey help', { shift: true });");
    expect(rootBody).toContain('const registeredShortcutRows = getRegisteredShortcuts().map((shortcut) => ({');
    expect(routeShortcutStart).toBeGreaterThan(0);
    expect(routeShortcutBody).toContain(".filter((item): item is ResolvedNavItem & { shortcut: string } => typeof item.shortcut === 'string')");
    expect(routeShortcutBody).toContain('key: item.shortcut,');
    expect(routeShortcutBody).toContain('handler: () => { void router.navigate({ to: item.path }); },');
    expect(routeShortcutBody).toContain('return () => {');
    expect(routeShortcutBody).toContain('for (const dispose of unregister) {');
    expect(routeShortcutBody).toContain('dispose();');
  });

  it('moves route-change focus to the main content region before keyboard traversal', () => {
    const rootStart = content.indexOf('function RootLayout()');
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const rootBody = content.slice(rootStart, postSetupStart);

    expect(rootBody).toContain('const mainContentRef = useRef<HTMLElement | null>(null);');
    expect(rootBody).toContain('mainContentRef.current?.focus({ preventScroll: true });');
    expect(rootBody).toContain('[activePath]');
    expect(content).toContain('ref={mainContentRef}');
    expect(content).toContain('tabIndex={-1}');
    expect(content).toContain('aria-label="Franchise command center content"');
  });

  it('keeps RootLayout as the owner of read-only shell overlays and browser sidecar cues', () => {
    const rootStart = content.indexOf('function RootLayout()');
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const rootBody = content.slice(rootStart, postSetupStart);

    expect(rootBody).toContain('const audioCueQueue = useGameStore((s) => s.game?.postGameUi?.audioCueQueue ?? []);');
    expect(rootBody).toContain('const breakingNews = useGameStore((s) => s.game?.breakingNewsQueue?.[0] ?? null);');
    expect(rootBody).toContain('playAudioCueQueue(audioCueQueue);');
    expect(rootBody).toContain('void clearAudioQueue();');
    expect(rootBody).toContain('<AudioController />');
    expect(rootBody).toContain('<MfdCommandPalette');
    expect(rootBody).toContain('placeholder="Search screens, actions, roster players..."');
    expect(rootBody).toContain('globalShortcutEnabled={false}');
    expect(rootBody).toContain('<AutosaveToast visible={showSaveToast} />');
    expect(rootBody).toContain('{breakingNews && (');
    expect(rootBody).toContain('<BreakingNews');
    expect(rootBody).toContain('<HalftimeDecision />');
    expect(rootBody).toContain('open={showHotkeyHelp}');
    expect(rootBody).toContain('<PlayoffLorePrompt open={pendingPlayoffLoreReveal !== null} onClose={() => undefined} />');
    expect(rootBody).toContain('<SeasonRecapPrompt open={showRecapPrompt && pendingPlayoffLoreReveal === null} onClose={() => setShowRecapPrompt(false)} />');
    expect(rootBody).toContain('<DynastyEraPrompt open={showEraPrompt} onClose={() => setShowEraPrompt(false)} />');
    expect(rootBody).toContain('open={showSaveReminder}');
    expect(rootBody).toContain("void router.navigate({ to: '/dynasty' });");
    expect(rootBody).toContain('syncHallOfFameArchiveAtYearRollover(prevYear.current, game, userTeam?.id ?? null);');
    expect(rootBody).toContain('syncRosterContinuityAtYearRollover(prevYear.current, game, userTeam?.id ?? null);');
    expect(rootBody).toContain('syncRookieOfYearAtYearRollover(prevYear.current, game, userTeam?.id ?? null);');
    expect(rootBody).toContain('syncRivalriesAtYearRollover(prevYear.current, game);');
  });

  it('keeps the autosave toast as a week-change UI cue with an updated baseline', () => {
    const rootStart = content.indexOf('function RootLayout()');
    const postSetupStart = content.indexOf('function PostSetupApp()');
    const rootBody = content.slice(rootStart, postSetupStart);
    const toastEffectStart = rootBody.indexOf('const toastStep = resolveAutosaveToastStep(prevWeek.current, currentWeek);');
    const toastEffectBody = rootBody.slice(toastEffectStart, toastEffectStart + 500);

    expect(content).toContain("import { resolveAutosaveToastStep } from './appShellLifecycle';");
    expect(toastEffectStart).toBeGreaterThan(0);
    expect(toastEffectBody).toContain('prevWeek.current = toastStep.nextPreviousWeek;');
    expect(toastEffectBody).toContain('if (toastStep.showToast) {');
    expect(toastEffectBody).toContain("playSound('week_advance_complete');");
    expect(toastEffectBody.indexOf('prevWeek.current = toastStep.nextPreviousWeek;')).toBeLessThan(
      toastEffectBody.indexOf('if (toastStep.showToast) {'),
    );
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
    expect(content).toContain('const chipRouteBeats = useActiveRouteBeats(chipDockRoute, { currentWeek: chipDockWeek, dynastySeed: chipGame?.seed, phase: chipGame?.phase });');
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

  it('plays and clears the postgame audio queue from the app shell effect', () => {
    expect(content).toContain('const clearAudioQueue = useGameStore((s) => s.actions.clearAudioQueue);');
    expect(content).toContain('const audioCueQueue = useGameStore((s) => s.game?.postGameUi?.audioCueQueue ?? []);');

    const effectStart = content.indexOf('if (audioCueQueue.length === 0) return;');
    const effectBody = content.slice(effectStart, effectStart + 220);

    expect(effectStart).toBeGreaterThan(0);
    expect(effectBody).toContain('playAudioCueQueue(audioCueQueue);');
    expect(effectBody).toContain('void clearAudioQueue();');
    expect(effectBody).toContain('}, [audioCueQueue, clearAudioQueue]);');
  });

  it('gives playoff lore reveals priority over the season recap prompt', () => {
    expect(content).toContain('<PlayoffLorePrompt open={pendingPlayoffLoreReveal !== null} onClose={() => undefined} />');
    expect(content).toContain('<SeasonRecapPrompt open={showRecapPrompt && pendingPlayoffLoreReveal === null} onClose={() => setShowRecapPrompt(false)} />');
  });

  it('serializes saved ceremony and season-report overlays in the app shell', () => {
    const ceremonyEffectStart = content.indexOf('const latest = ceremonies[0];');
    const reportEffectStart = content.indexOf('if (activeCeremonyId || activeReportYear !== null) return;');
    const reportEffectBody = content.slice(reportEffectStart, reportEffectStart + 520);

    expect(ceremonyEffectStart).toBeGreaterThan(0);
    expect(reportEffectStart).toBeGreaterThan(ceremonyEffectStart);
    expect(reportEffectBody).toContain('const latestReport = seasonReports[0];');
    expect(reportEffectBody).toContain('setActiveReportYear(latestReport.year);');
    expect(reportEffectBody).toContain('}, [activeCeremonyId, activeReportYear, seasonReports, seenReports]);');
    expect(content).toContain('<CeremonyViewer');
    expect(content).toContain('open={!!activeCeremony}');
    expect(content).toContain('<SeasonReportViewer');
    expect(content).toContain('open={activeReportYear !== null}');
  });

  it('keeps app-shell milestone cards separate from saved record milestones', () => {
    const effectStart = content.indexOf('const key = `${currentYear}-${currentWeek}-${userTeamWins}`;');
    const effectBody = content.slice(effectStart, effectStart + 1000);

    expect(content).toContain("import { MilestoneCard, type MilestoneType } from '../features/shared/MilestoneCard';");
    expect(content).toContain('const [activeMilestone, setActiveMilestone] = useState<{ type: MilestoneType; headline: string; detail: string } | null>(null);');
    expect(content).toContain("const [lastMilestoneCheck, setLastMilestoneCheck] = useState('');");
    expect(effectStart).toBeGreaterThan(0);
    expect(effectBody).toContain('if (key === lastMilestoneCheck || currentWeek === 0) return;');
    expect(effectBody).toContain("setActiveMilestone({ type: 'first_win'");
    expect(effectBody).toContain("setActiveMilestone({ type: 'win_100'");
    expect(effectBody).toContain("setActiveMilestone({ type: 'season_10'");
    expect(effectBody).toContain('prevWins.current = userTeamWins;');
    expect(content).toContain('{activeMilestone && (');
    expect(content).toContain('<MilestoneCard');
    expect(content).toContain('onDismiss={() => setActiveMilestone(null)}');
    expect(content).not.toContain('selectRecentMilestones');
    expect(content).not.toContain('useRecentMilestones');
  });

  it('routes the save reminder to the backup screen without recording export receipt itself', () => {
    const reminderStart = content.indexOf('title="Save Reminder"');
    const reminderBody = content.slice(reminderStart, reminderStart + 420);

    expect(reminderStart).toBeGreaterThan(0);
    expect(reminderBody).toContain('message={getSaveReminderMessage(currentYear)}');
    expect(reminderBody).toContain('confirmLabel="Open Backup Screen"');
    expect(reminderBody).toContain("void router.navigate({ to: '/dynasty' });");
    expect(reminderBody).not.toContain('recordPortableExport');
    expect(reminderBody).not.toContain('lastPortableExportYear');
  });

  it('keeps breaking-news interrupts ahead of the league-news ticker', () => {
    expect(content).toContain('const breakingNews = useGameStore((s) => s.game?.breakingNewsQueue?.[0] ?? null);');
    expect(content).toContain('const leagueNews = useGameStore((s) => s.game?.leagueNews ?? []);');
    expect(content).toContain('const tickerItems = useMemo(() => selectTickerItems(leagueNews), [leagueNews]);');
    expect(content).toContain('const showTicker = tickerItems.length > 0\n    && !breakingNews');
    expect(content).toContain("{showTicker ? <BreakingNewsTicker items={tickerItems} /> : null}");
    expect(content).toContain('{breakingNews && (');
    expect(content).toContain('source={breakingNews.source}');
    expect(content).toContain('onDismiss={() => { void dismissBreakingNews(); }}');
  });

  it('keeps the achievements gallery route mapped to its standalone franchise surface', () => {
    expect(content).toContain("const LazyAchievementsGallery = lazy(async () => ({ default: (await import('../features/franchise/AchievementsGallery')).AchievementsGallery }));");
    expect(content).toMatch(/const achievementsRoute = createRoute\(\{[\s\S]*path: '\/franchise\/achievements'[\s\S]*<LazyRouteFrame label="achievements">[\s\S]*<LazyAchievementsGallery \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const ROUTE_IMPLEMENTATIONS = \[[\s\S]*achievementsRoute[\s\S]*\]\s+as const/);
  });

  it('keeps achievement toast and standalone gallery ownership separate', () => {
    expect(content).toContain("import { AchievementUnlockToast } from '../features/legacy/AchievementGallery';");
    expect(content).toContain("const LazyAchievementsGallery = lazy(async () => ({ default: (await import('../features/franchise/AchievementsGallery')).AchievementsGallery }));");
    expect(content).not.toContain("lazy(async () => ({ default: (await import('../features/legacy/AchievementGallery')).AchievementGallery }))");
  });

  it('keeps achievement unlocks dismissible manually and by timeout', () => {
    const effectStart = content.indexOf('if (activeAchievement) {');
    const effectBody = content.slice(effectStart, effectStart + 420);

    expect(effectStart).toBeGreaterThan(0);
    expect(effectBody).toContain('window.setTimeout(() => {');
    expect(effectBody).toContain('setActiveAchievement(null);');
    expect(effectBody).toContain('return () => window.clearTimeout(timeout);');
    expect(content).toContain('onDismiss={() => setActiveAchievement(null)}');
  });

  it('keeps broadcast route components mapped to their distinct presentation surfaces', () => {
    expect(content).toContain("const LazyGameBroadcast = lazy(async () => ({ default: (await import('../features/broadcast/GameBroadcast')).GameBroadcast }));");
    expect(content).toContain("const LazyBroadcastPresentation = lazy(async () => ({ default: (await import('../features/broadcast/BroadcastPresentation')).default }));");
    expect(content).toContain("const LazyPlayByPlay = lazy(async () => ({ default: (await import('../features/broadcast/PlayByPlay')).PlayByPlay }));");
    expect(content).toContain("const LazyGameFlow = lazy(async () => ({ default: (await import('../features/broadcast/GameFlow')).GameFlow }));");
    expect(content).toMatch(/const broadcastRoute = createRoute\(\{[\s\S]*path: '\/broadcast'[\s\S]*<LazyGameBroadcast \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const broadcastPresentationRoute = createRoute\(\{[\s\S]*path: '\/presentation'[\s\S]*<LazyBroadcastPresentation \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const playByPlayRoute = createRoute\(\{[\s\S]*path: '\/play-by-play'[\s\S]*<LazyPlayByPlay \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const gameFlowRoute = createRoute\(\{[\s\S]*path: '\/game-flow'[\s\S]*<LazyGameFlow \/>[\s\S]*\}\);/);
  });

  it('keeps coaching mutation and presentation routes mapped to distinct components', () => {
    expect(content).toContain("import { CoachingStaff } from '../features/coaching/CoachingStaff';");
    expect(content).toContain("import { CoachingTree } from '../features/coaching/CoachingTree';");
    expect(content).toContain("import { RelationshipGraph } from '../features/coaching/RelationshipGraph';");
    expect(content).toMatch(/const coachingRoute = createRoute\(\{[\s\S]*path: '\/coaching'[\s\S]*component: CoachingStaff[\s\S]*\}\);/);
    expect(content).toMatch(/const coachingTreeRoute = createRoute\(\{[\s\S]*path: '\/coaching\/tree'[\s\S]*component: CoachingTree[\s\S]*\}\);/);
    expect(content).toMatch(/const relationshipGraphRoute = createRoute\(\{[\s\S]*path: '\/coaching\/relationships'[\s\S]*component: RelationshipGraph[\s\S]*\}\);/);
  });

  it('keeps money route surfaces mapped to contract table, cap sandbox, and forecast tools', () => {
    expect(content).toContain("import { ContractsCap } from '../features/contracts/ContractsCap';");
    expect(content).toContain("const LazyCapLaboratory = lazy(async () => ({ default: (await import('../features/contracts/CapLaboratory')).default }));");
    expect(content).toContain("const LazyContractTools = lazy(async () => ({ default: (await import('../features/front-office/ContractTools')).default }));");
    expect(content).toMatch(/const contractsRoute = createRoute\(\{[\s\S]*path: '\/contracts'[\s\S]*component: ContractsCap[\s\S]*\}\);/);
    expect(content).toMatch(/const capLabRoute = createRoute\(\{[\s\S]*path: '\/cap-lab'[\s\S]*<LazyCapLaboratory \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const frontOfficeRoute = createRoute\(\{[\s\S]*path: '\/front-office'[\s\S]*<LazyContractTools \/>[\s\S]*\}\);/);
  });

  it('keeps acquisition routes mapped to distinct planning, market, and movement surfaces', () => {
    expect(content).toContain("import { TradeCenter } from '../features/trades/TradeCenter';");
    expect(content).toContain("import { FreeAgencyHub } from '../features/free-agency/FreeAgencyHub';");
    expect(content).toContain("const LazyTradeBlockTicker = lazy(async () => ({ default: (await import('../features/trades/TradeBlockTicker')).TradeBlockTicker }));");
    expect(content).toContain("const LazyTeamNeeds = lazy(async () => ({ default: (await import('../features/team-needs/TeamNeeds')).TeamNeeds }));");
    expect(content).toContain("const LazyFATargetBoard = lazy(async () => ({ default: (await import('../features/free-agency/FATargetBoard')).FATargetBoard }));");
    expect(content).toContain("const LazyWaiverWire = lazy(async () => ({ default: (await import('../features/waiver-wire/WaiverWire')).WaiverWire }));");
    expect(content).toContain("const LazyPracticeSquad = lazy(async () => ({ default: (await import('../features/practice-squad/PracticeSquad')).PracticeSquad }));");
    expect(content).toContain("const LazyScoutingBoard = lazy(async () => ({ default: (await import('../features/scouting/ScoutingBoard')).ScoutingBoard }));");
    expect(content).toContain("const LazyDraftBoard = lazy(async () => ({ default: (await import('../features/draft/DraftBoard')).DraftBoard }));");
    expect(content).toMatch(/const tradesRoute = createRoute\(\{[\s\S]*path: '\/trades'[\s\S]*component: TradeCenter[\s\S]*\}\);/);
    expect(content).toMatch(/const tradeBlockRoute = createRoute\(\{[\s\S]*path: '\/trade-block'[\s\S]*<LazyTradeBlockTicker \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const freeAgencyRoute = createRoute\(\{[\s\S]*path: '\/free-agency'[\s\S]*component: FreeAgencyHub[\s\S]*\}\);/);
    expect(content).toMatch(/const faTargetsRoute = createRoute\(\{[\s\S]*path: '\/fa-targets'[\s\S]*<LazyFATargetBoard \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const teamNeedsRoute = createRoute\(\{[\s\S]*path: '\/team-needs'[\s\S]*<LazyTeamNeeds \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const waiverWireRoute = createRoute\(\{[\s\S]*path: '\/waivers'[\s\S]*<LazyWaiverWire \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const practiceSquadRoute = createRoute\(\{[\s\S]*path: '\/practice-squad'[\s\S]*<LazyPracticeSquad \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const scoutingRoute = createRoute\(\{[\s\S]*path: '\/scouting'[\s\S]*<LazyScoutingBoard \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const draftRoute = createRoute\(\{[\s\S]*path: '\/draft'[\s\S]*<LazyDraftBoard \/>[\s\S]*\}\);/);
  });

  it('keeps core team and gameplay routes mapped to their command surfaces', () => {
    expect(content).toContain("import { RosterManagement } from '../features/roster/RosterManagement';");
    expect(content).toContain("import { WeekAdvance } from '../features/week-advance/WeekAdvance';");
    expect(content).toContain("import { HandshakeLedger } from '../features/handshake-ledger/HandshakeLedger';");
    expect(content).toContain("import { GameDayRecap } from '../features/game-day/GameDayRecap';");
    expect(content).toContain("import { DepthChart } from '../features/depth-chart/DepthChart';");
    expect(content).toContain("const LazyWatchListScreen = lazy(async () => ({ default: (await import('../features/watch-list/WatchListScreen')).WatchListScreen }));");
    expect(content).toContain("const LazyLockerRoom = lazy(async () => ({ default: (await import('../features/locker-room/LockerRoom')).LockerRoom }));");
    expect(content).toContain("const LazyTrainingCamp = lazy(async () => ({ default: (await import('../features/training-camp/TrainingCamp')).TrainingCamp }));");
    expect(content).toContain("const LazyAlumniMentors = lazy(async () => ({ default: (await import('../features/mentors/AlumniMentorsScreen')).AlumniMentorsScreen }));");
    expect(content).toContain("const LazyEndorsementCenter = lazy(async () => ({ default: (await import('../features/endorsements/EndorsementCenter')).EndorsementCenter }));");
    expect(content).toContain("const LazyGamePlanSetup = lazy(async () => ({ default: (await import('../features/game-plan/GamePlanSetup')).GamePlanSetup }));");
    expect(content).toContain("const LazyTeamSchedule = lazy(async () => ({ default: (await import('../features/schedule/TeamSchedule')).TeamSchedule }));");
    expect(content).toContain("const LazySuperBowlPresentation = lazy(async () => ({ default: (await import('../features/playoffs/SuperBowlPresentation')).SuperBowlPresentation }));");
    expect(content).toMatch(/const rosterRoute = createRoute\(\{[\s\S]*path: '\/roster'[\s\S]*component: RosterManagement[\s\S]*\}\);/);
    expect(content).toMatch(/const watchListRoute = createRoute\(\{[\s\S]*path: '\/watch-list'[\s\S]*<LazyWatchListScreen \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const lockerRoomRoute = createRoute\(\{[\s\S]*path: '\/locker-room'[\s\S]*<LazyLockerRoom \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const depthChartRoute = createRoute\(\{[\s\S]*path: '\/depth-chart'[\s\S]*component: DepthChart[\s\S]*\}\);/);
    expect(content).toMatch(/const trainingCampRoute = createRoute\(\{[\s\S]*path: '\/training-camp'[\s\S]*<LazyTrainingCamp \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const mentorsRoute = createRoute\(\{[\s\S]*path: '\/mentors'[\s\S]*<LazyAlumniMentors \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const endorsementsRoute = createRoute\(\{[\s\S]*path: '\/endorsements'[\s\S]*<LazyEndorsementCenter \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const weekAdvanceRoute = createRoute\(\{[\s\S]*path: '\/week-advance'[\s\S]*component: WeekAdvance[\s\S]*\}\);/);
    expect(content).toMatch(/const handshakeRoute = createRoute\(\{[\s\S]*path: '\/handshakes'[\s\S]*component: HandshakeLedger[\s\S]*\}\);/);
    expect(content).toMatch(/const gameDayRoute = createRoute\(\{[\s\S]*path: '\/game-day'[\s\S]*component: GameDayRecap[\s\S]*\}\);/);
    expect(content).toMatch(/const gamePlanRoute = createRoute\(\{[\s\S]*path: '\/game-plan'[\s\S]*<LazyGamePlanSetup \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const scheduleRoute = createRoute\(\{[\s\S]*path: '\/schedule'[\s\S]*<LazyTeamSchedule \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const superBowlRoute = createRoute\(\{[\s\S]*path: '\/super-bowl'[\s\S]*<LazySuperBowlPresentation \/>[\s\S]*\}\);/);
  });

  it('keeps recap direct routes mapped to their dedicated recap surfaces', () => {
    expect(content).toContain("const LazyDraftRecap = lazy(async () => ({ default: (await import('../features/draft/DraftRecap')).DraftRecap }));");
    expect(content).toContain("const LazySeasonRecapScreen = lazy(async () => ({ default: (await import('../features/season/SeasonRecapCard')).SeasonRecapScreen }));");
    expect(content).toMatch(/const draftRecapRoute = createRoute\(\{[\s\S]*path: '\/draft-recap'[\s\S]*<LazyRouteFrame label="draft recap">[\s\S]*<LazyDraftRecap \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const seasonRecapRoute = createRoute\(\{[\s\S]*path: '\/season\/recap'[\s\S]*<LazyRouteFrame label="season recap">[\s\S]*<LazySeasonRecapScreen \/>[\s\S]*\}\);/);
  });

  it('keeps player identity routes mapped to profile, timeline, comparison, rivalry, and development surfaces', () => {
    expect(content).toContain("const LazyPlayerProfile = lazy(async () => ({ default: (await import('../features/player/PlayerProfile')).PlayerProfile }));");
    expect(content).toContain("const LazyPlayerTimeline = lazy(async () => ({ default: (await import('../features/stats/PlayerTimeline')).default }));");
    expect(content).toContain("const LazyPlayerComparison = lazy(async () => ({ default: (await import('../features/shared/PlayerComparison')).PlayerComparison }));");
    expect(content).toContain("const LazyPlayerRivalries = lazy(async () => ({ default: (await import('../features/player/PlayerRivalries')).PlayerRivalries }));");
    expect(content).toContain("const LazyPlayerDevelopmentInner = lazy(async () => ({ default: (await import('../features/player/PlayerDevelopment')).PlayerDevelopmentView }));");
    expect(content).toMatch(/const playerProfileRoute = createRoute\(\{[\s\S]*path: '\/player\/\$playerId'[\s\S]*<LazyPlayerProfile \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const playerComparisonRoute = createRoute\(\{[\s\S]*path: '\/compare'[\s\S]*<LazyPlayerComparison \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const playerTimelineRoute = createRoute\(\{[\s\S]*path: '\/player\/\$playerId\/timeline'[\s\S]*<LazyPlayerTimeline \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const rivalriesRoute = createRoute\(\{[\s\S]*path: '\/rivalries'[\s\S]*<LazyPlayerRivalries \/>[\s\S]*\}\);/);
    expect(content).toMatch(/function PlayerDevRouteWrapper\(\)[\s\S]*<LazyPlayerDevelopmentInner[\s\S]*const playerDevRoute = createRoute\(\{[\s\S]*path: '\/player-development'[\s\S]*component: PlayerDevRouteWrapper[\s\S]*\}\);/);
  });

  it('keeps legacy and franchise archive routes mapped to their durable-memory surfaces', () => {
    expect(content).toContain("const LazyFranchiseHub = lazy(async () => ({ default: (await import('../features/franchise/FranchiseHub')).FranchiseHub }));");
    expect(content).toContain("const LazyFranchiseLegends = lazy(async () => ({ default: (await import('../features/franchise/FranchiseLegends')).FranchiseLegends }));");
    expect(content).toContain("const LazyGmCareer = lazy(async () => ({ default: (await import('../features/franchise/GmCareer')).GmCareer }));");
    expect(content).toContain("const LazyLegacyTimeline = lazy(async () => ({ default: (await import('../features/legacy/LegacyTimeline')).LegacyTimeline }));");
    expect(content).toContain("const LazyNamedGamesBrowser = lazy(async () => ({ default: (await import('../features/legacy/NamedGamesBrowser')).NamedGamesBrowser }));");
    expect(content).toContain("const LazyBloodlinesViewer = lazy(async () => ({ default: (await import('../features/legacy/BloodlinesViewer')).BloodlinesViewer }));");
    expect(content).toContain("const LazyAwardsHub = lazy(async () => ({ default: (await import('../features/legacy/AwardsHub')).AwardsHub }));");
    expect(content).toContain("const LazyRecordBook = lazy(async () => ({ default: (await import('../features/stats/RecordBook')).default }));");
    expect(content).toContain("const LazyHallOfFameDirectory = lazy(async () => ({ default: (await import('../features/franchise/HallOfFameDirectory')).HallOfFameDirectory }));");
    expect(content).toContain("const LazyTrophyRoom = lazy(async () => ({ default: (await import('../features/franchise/TrophyRoom')).TrophyRoom }));");
    expect(content).toContain("const LazyEraHall = lazy(async () => ({ default: (await import('../features/franchise/EraHall')).EraHall }));");
    expect(content).toContain("const LazyMvpPlaqueWall = lazy(async () => ({ default: (await import('../features/franchise/MvpPlaqueWall')).MvpPlaqueWall }));");
    expect(content).toContain("const LazyPlayoffLoreDirectory = lazy(async () => ({ default: (await import('../features/playoffs/PlayoffLoreDirectory')).PlayoffLoreDirectory }));");
    expect(content).toContain("const LazyDynastyChronicle = lazy(async () => ({ default: (await import('../features/franchise/DynastyChronicle')).DynastyChronicle }));");
    expect(content).toMatch(/const franchiseRoute = createRoute\(\{[\s\S]*path: '\/franchise'[\s\S]*<LazyFranchiseHub \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const gmCareerRoute = createRoute\(\{[\s\S]*path: '\/franchise\/career'[\s\S]*<LazyGmCareer \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const legendsRoute = createRoute\(\{[\s\S]*path: '\/legends'[\s\S]*<LazyFranchiseLegends \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const recordsRoute = createRoute\(\{[\s\S]*path: '\/records'[\s\S]*<LazyRecordBook \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const legacyRoute = createRoute\(\{[\s\S]*path: '\/legacy'[\s\S]*<LazyLegacyTimeline \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const namedGamesRoute = createRoute\(\{[\s\S]*path: '\/legacy\/named-games'[\s\S]*<LazyNamedGamesBrowser \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const bloodlinesRoute = createRoute\(\{[\s\S]*path: '\/legacy\/bloodlines'[\s\S]*<LazyBloodlinesViewer \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const awardsRoute = createRoute\(\{[\s\S]*path: '\/awards'[\s\S]*<LazyAwardsHub \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const hallOfFameDirectoryRoute = createRoute\(\{[\s\S]*path: '\/franchise\/hall'[\s\S]*<LazyHallOfFameDirectory \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const trophyRoomRoute = createRoute\(\{[\s\S]*path: '\/franchise\/trophy-room'[\s\S]*<LazyTrophyRoom \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const eraHallRoute = createRoute\(\{[\s\S]*path: '\/franchise\/eras'[\s\S]*<LazyEraHall \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const mvpPlaqueWallRoute = createRoute\(\{[\s\S]*path: '\/franchise\/mvps'[\s\S]*<LazyMvpPlaqueWall \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const playoffLoreDirectoryRoute = createRoute\(\{[\s\S]*path: '\/franchise\/playoff-lore'[\s\S]*<LazyPlayoffLoreDirectory \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const dynastyChronicleRoute = createRoute\(\{[\s\S]*path: '\/franchise\/chronicle'[\s\S]*<LazyDynastyChronicle \/>[\s\S]*\}\);/);
  });

  it('keeps franchise business and scenario routes mapped to their setup surfaces', () => {
    expect(content).toContain("const LazyRelocationScreen = lazy(async () => ({ default: (await import('../features/franchise/RelocationScreen')).RelocationScreen }));");
    expect(content).toContain("const LazyExpansionDraft = lazy(async () => ({ default: (await import('../features/franchise/ExpansionDraft')).ExpansionDraft }));");
    expect(content).toContain("const LazyScenarioSelect = lazy(async () => ({ default: (await import('../features/scenario/ScenarioSelect')).ScenarioSelect }));");
    expect(content).toMatch(/const relocationRoute = createRoute\(\{[\s\S]*path: '\/relocate'[\s\S]*<LazyRouteFrame label="relocation screen">[\s\S]*<LazyRelocationScreen \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const expansionDraftRoute = createRoute\(\{[\s\S]*path: '\/expansion-draft'[\s\S]*<LazyRouteFrame label="expansion draft">[\s\S]*<LazyExpansionDraft \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const scenarioRoute = createRoute\(\{[\s\S]*path: '\/scenarios'[\s\S]*<LazyRouteFrame label="scenario challenges">[\s\S]*<LazyScenarioSelect \/>[\s\S]*\}\);/);
  });

  it('keeps store navigation targets registered in the route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const storeTargets = Array.from(gameStoreContent.matchAll(/navigateTo\('([^']+)'\)/g), (match) => ({
      path: match[1] ?? '',
      index: match.index ?? 0,
    }));
    const violations = storeTargets
      .filter((target) => !registeredPaths.has(target.path))
      .map((target) => `game-store.ts:${lineNumberForStoreIndex(target.index)} navigates to unregistered route ${target.path}`);

    expect(violations).toEqual([]);
    expect(storeTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/',
      '/broadcast',
      '/cba',
      '/expansion-draft',
      '/franchise',
      '/game-day',
      '/trade-deadline',
    ]));
  });

  it('keeps production component navigateTo targets registered in the route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const productionTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        return Array.from(source.matchAll(/navigateTo\(['"]([^'"]+)['"]\)/g), (match) => ({
          path: match[1] ?? '',
          file: relativeSourcePath(file),
          line: lineNumberForIndex(source, match.index ?? 0),
        }));
      });
    const violations = productionTargets
      .filter((target) => !registeredPaths.has(target.path))
      .map((target) => `${target.file}:${target.line} navigates to unregistered route ${target.path}`);

    expect(violations).toEqual([]);
    expect(productionTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/franchise/hall',
      '/game-plan',
      '/news',
      '/power-rankings',
      '/trade-block',
    ]));
  });

  it('keeps production router navigate targets registered in the route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const productionTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        return Array.from(source.matchAll(/\b(?:router\.)?navigate\(\{\s*to:\s*['"]([^'"]+)['"]/g), (match) => ({
          path: match[1] ?? '',
          file: relativeSourcePath(file),
          line: lineNumberForIndex(source, match.index ?? 0),
        }));
      });
    const violations = productionTargets
      .filter((target) => !registeredPaths.has(target.path))
      .map((target) => `${target.file}:${target.line} routes to unregistered path ${target.path}`);

    expect(violations).toEqual([]);
    expect(productionTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/dynasty',
      '/fa-targets',
      '/player/$playerId',
      '/stat-central',
      '/week-advance',
    ]));
  });

  it('keeps production hash-helper route targets registered in the route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const productionTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        return Array.from(source.matchAll(/\b(?:navigateTo|goTo)\(\s*['"]([^'"]+)['"]/g), (match) => ({
          path: match[1] ?? '',
          file: relativeSourcePath(file),
          line: lineNumberForIndex(source, match.index ?? 0),
        }));
      });
    const violations = productionTargets
      .filter((target) => !registeredPaths.has(target.path))
      .map((target) => `${target.file}:${target.line} hashes to unregistered route ${target.path}`);

    expect(violations).toEqual([]);
    expect(productionTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/cba',
      '/franchise',
      '/league-rules',
      '/trade-deadline',
    ]));
  });

  it('keeps production literal location.hash assignments registered in the route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const productionTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        return Array.from(source.matchAll(/\b(?:window\.)?location\.hash\s*=\s*['"]([^'"]+)['"]/g), (match) => {
          const path = normalizeRouteTarget(match[1] ?? '') ?? '';
          return {
            path,
            file: relativeSourcePath(file),
            line: lineNumberForIndex(source, match.index ?? 0),
          };
        });
      });
    const violations = productionTargets
      .filter((target) => !registeredPaths.has(target.path))
      .map((target) => `${target.file}:${target.line} assigns location.hash to unregistered route ${target.path}`);

    expect(violations).toEqual([]);
    expect(productionTargets.map((target) => target.path)).toEqual(expect.arrayContaining(['/']));
  });

  it('keeps production template route targets aligned with registered dynamic routes', () => {
    const registeredPaths = registeredRoutePaths();
    const productionTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        const filePath = relativeSourcePath(file);
        return [
          ...Array.from(source.matchAll(/\b(?:router\.)?navigate\(\{\s*to:\s*`([^`]+)`/g), (match) => ({
            path: normalizeRouteTarget(match[1] ?? '') ?? '',
            file: filePath,
            line: lineNumberForIndex(source, match.index ?? 0),
            kind: 'router.navigate',
          })),
          ...Array.from(source.matchAll(/\b(?:navigateTo|goTo)\(\s*`([^`]+)`/g), (match) => ({
            path: normalizeRouteTarget(match[1] ?? '') ?? '',
            file: filePath,
            line: lineNumberForIndex(source, match.index ?? 0),
            kind: 'hash helper',
          })),
          ...Array.from(source.matchAll(/\b(?:window\.)?location\.hash\s*=\s*`([^`]+)`/g), (match) => ({
            path: normalizeRouteTarget(match[1] ?? '') ?? '',
            file: filePath,
            line: lineNumberForIndex(source, match.index ?? 0),
            kind: 'location.hash',
          })),
        ].filter((target) => target.path.length > 0);
      });
    const violations = productionTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} ${target.kind} targets unregistered dynamic route ${target.path}`);

    expect(violations).toEqual([]);
    expect(productionTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/player/${player.id}/timeline',
      '/player/${playerId}',
    ]));
  });

  it('keeps engine AGM recommendation target routes registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const recommendationTargets = Array.from(
      agmSourceContent.matchAll(/\btargetRoute:\s*['"]([^'"]+)['"]/g),
      (match) => ({
        path: match[1] ?? '',
        line: lineNumberForAgmSourceIndex(match.index ?? 0),
      }),
    );
    const violations = recommendationTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `packages/engine/src/systems/agm.ts:${target.line} targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(recommendationTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/contracts',
      '/game-plan',
      '/owner',
      '/roster',
      '/team-needs',
    ]));
  });

  it('keeps command-deck route object targets registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const commandDeckTargets = [
      ...routeObjectTargets(actionCenterContent, 'src/features/monday-briefing/ActionCenter.tsx', 'route'),
      ...routeObjectTargets(weekAdvanceContent, 'src/features/week-advance/WeekAdvance.tsx', 'fixRoute'),
    ];
    const violations = commandDeckTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} ${target.routeKey} targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(commandDeckTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/contracts',
      '/depth-chart',
      '/game-plan',
      '/owner',
      '/roster',
      '/trades',
      '/week-advance',
    ]));
  });

  it('keeps offseason calendar route object targets registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const calendarTargets = routeObjectTargets(selectorsContent, 'src/app/store/selectors.ts', 'route');
    const violations = calendarTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} ${target.routeKey} targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(calendarTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/cba',
      '/contracts',
      '/draft',
      '/draft-recap',
      '/expansion-draft',
      '/free-agency',
      '/training-camp',
      '/week-advance',
    ]));
  });

  it('keeps inbox message link targets registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const inboxTargets = [
      ...routeObjectTargets(inboxMessagesContent, 'src/features/inbox/buildInboxMessages.ts', 'link'),
      ...selectedRouteFallbackTargets(inboxTriageContent, 'src/features/inbox/InboxTriage.tsx'),
    ];
    const violations = inboxTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} ${target.routeKey} targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(inboxTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/coaching',
      '/film-room',
      '/game-plan',
      '/league/weather',
      '/presentation',
    ]));
  });

  it('keeps Chip onboarding route targets registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const onboardingTargets = routeObjectTargets(
      onboardingMachineContent,
      'src/features/companion/onboardingMachine.ts',
      'route',
    );
    const violations = onboardingTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} ${target.routeKey} targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(onboardingTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/',
      '/depth-chart',
      '/game-plan',
      '/roster',
      '/week-advance',
    ]));
  });

  it('keeps shared EmptyState action route props registered in the app route tree', () => {
    const registeredPaths = registeredRoutePaths();
    const actionRouteTargets = listProductionSourceFiles(srcRoot)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf-8');
        return Array.from(source.matchAll(/\bactionRoute=['"]([^'"]+)['"]/g), (match) => ({
          path: match[1] ?? '',
          file: relativeSourcePath(file),
          line: lineNumberForIndex(source, match.index ?? 0),
        }));
      });
    const violations = actionRouteTargets
      .filter((target) => !routeTargetIsRegistered(registeredPaths, target.path))
      .map((target) => `${target.file}:${target.line} actionRoute targets unregistered app route ${target.path}`);

    expect(violations).toEqual([]);
    expect(actionRouteTargets.map((target) => target.path)).toEqual(expect.arrayContaining([
      '/game-plan',
      '/week-advance',
    ]));
  });

  it('keeps remaining direct routes mapped to their content and deadline surfaces', () => {
    expect(content).toContain("import { InboxTriage } from '../features/inbox/InboxTriage';");
    expect(content).toContain("const LazySocialFeed = lazy(async () => ({ default: (await import('../features/social/SocialFeed')).SocialFeed }));");
    expect(content).toContain("const LazyFranchiseBook = lazy(async () => ({ default: (await import('../features/franchise/FranchiseBook')).FranchiseBookScreen }));");
    expect(content).toContain("const LazyFilmRoom = lazy(async () => ({ default: (await import('../features/film-room/FilmRoom')).FilmRoom }));");
    expect(content).toContain("const LazyTradeDeadline = lazy(async () => ({ default: (await import('../features/trades/TradeDeadline')).TradeDeadline }));");
    expect(content).toContain("const LazyScrapbook = lazy(async () => ({ default: (await import('../features/franchise/Scrapbook')).Scrapbook }));");
    expect(content).toMatch(/const inboxRoute = createRoute\(\{[\s\S]*path: '\/inbox'[\s\S]*component: InboxTriage[\s\S]*\}\);/);
    expect(content).toMatch(/const socialRoute = createRoute\(\{[\s\S]*path: '\/social'[\s\S]*<LazyRouteFrame label="social feed">[\s\S]*<LazySocialFeed \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const franchiseBookRoute = createRoute\(\{[\s\S]*path: '\/franchise\/book'[\s\S]*<LazyRouteFrame label="franchise book">[\s\S]*<LazyFranchiseBook \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const filmRoomRoute = createRoute\(\{[\s\S]*path: '\/film-room'[\s\S]*<LazyRouteFrame label="film room">[\s\S]*<LazyFilmRoom \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const tradeDeadlineRoute = createRoute\(\{[\s\S]*path: '\/trade-deadline'[\s\S]*<LazyRouteFrame label="trade deadline">[\s\S]*<LazyTradeDeadline \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const scrapbookRoute = createRoute\(\{[\s\S]*path: '\/franchise\/scrapbook'[\s\S]*<LazyRouteFrame label="dynasty scrapbook">[\s\S]*<LazyScrapbook \/>[\s\S]*\}\);/);
  });

  it('keeps league news and newsroom routes mapped to their distinct feature folders', () => {
    expect(content).toContain("const LazyLeagueNews = lazy(async () => ({ default: (await import('../features/league-news/LeagueNews')).LeagueNews }));");
    expect(content).toContain("const LazyNewsroomDigest = lazy(async () => ({ default: (await import('../features/newsroom/NewsroomDigest')).NewsroomDigest }));");
    expect(content).not.toContain("../features/news/");
    expect(content).toMatch(/const newsRoute = createRoute\(\{[\s\S]*path: '\/news'[\s\S]*<LazyLeagueNews \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const newsroomRoute = createRoute\(\{[\s\S]*path: '\/newsroom'[\s\S]*<LazyNewsroomDigest \/>[\s\S]*\}\);/);
  });

  it('keeps league-pulse and stat-central route spellings aligned with navigation', () => {
    expect(content).toContain("const LazyLeaguePulse = lazy(async () => ({ default: (await import('../features/league/LeaguePulse')).default }));");
    expect(content).toContain("const LazyStatCentral = lazy(async () => ({ default: (await import('../features/stats/StatCentral')).default }));");
    expect(content).toContain("{ path: '/league-pulse'");
    expect(content).toContain("{ path: '/stat-central'");
    expect(content).not.toContain("path: '/league/pulse'");
    expect(content).not.toContain("path: '/stats'");
    expect(content).toMatch(/const leaguePulseRoute = createRoute\(\{[\s\S]*path: '\/league-pulse'[\s\S]*<LazyLeaguePulse \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const statCentralRoute = createRoute\(\{[\s\S]*path: '\/stat-central'[\s\S]*<LazyStatCentral \/>[\s\S]*\}\);/);
  });

  it('keeps league governance and analytics routes mapped to their distinct surfaces', () => {
    expect(content).toContain("import { OwnerMood } from '../features/owner/OwnerMood';");
    expect(content).toContain("const LazyCommissionerOffice = lazy(async () => ({ default: (await import('../features/league/CommissionerOffice')).CommissionerOffice }));");
    expect(content).toContain("const LazyCBANegotiation = lazy(async () => ({ default: (await import('../features/league/CBANegotiation')).CBANegotiation }));");
    expect(content).toContain("const LazyLeagueRulesViewer = lazy(async () => ({ default: (await import('../features/league/LeagueRulesViewer')).LeagueRulesViewer }));");
    expect(content).toContain("const LazyLeagueStandings = lazy(async () => ({ default: (await import('../features/standings/LeagueStandings')).LeagueStandings }));");
    expect(content).toContain("const LazyAnalyticsDashboard = lazy(async () => ({ default: (await import('../features/analytics/AnalyticsDashboard')).AnalyticsDashboard }));");
    expect(content).toContain("const LazyPowerRankings = lazy(async () => ({ default: (await import('../features/power-rankings/PowerRankings')).PowerRankings }));");
    expect(content).toContain("{ path: '/cba',           label: 'CBA Negotiation'");
    expect(content).toContain("{ path: '/league-rules',  label: 'League Rules'");
    expect(content).toContain('const ROOM_NAV_GROUPS: NavGroup[] = APP_ROOMS.map((room) => ({');
    expect(content).toContain('APP_ROUTE_REGISTRY.filter((routeDefinition) => routeDefinition.room === room.id)');
    expect(content).toMatch(/const ownerRoute = createRoute\(\{[\s\S]*path: '\/owner'[\s\S]*component: OwnerMood[\s\S]*\}\);/);
    expect(content).toMatch(/const commissionerRoute = createRoute\(\{[\s\S]*path: '\/commissioner'[\s\S]*<LazyCommissionerOffice \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const cbaRoute = createRoute\(\{[\s\S]*path: '\/cba'[\s\S]*<LazyCBANegotiation \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const leagueRulesRoute = createRoute\(\{[\s\S]*path: '\/league-rules'[\s\S]*<LazyLeagueRulesViewer \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const standingsRoute = createRoute\(\{[\s\S]*path: '\/standings'[\s\S]*<LazyLeagueStandings \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const analyticsRoute = createRoute\(\{[\s\S]*path: '\/analytics'[\s\S]*<LazyAnalyticsDashboard \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const powerRankingsRoute = createRoute\(\{[\s\S]*path: '\/power-rankings'[\s\S]*<LazyPowerRankings \/>[\s\S]*\}\);/);
  });

  it('keeps Monday Briefing registered at the home route, not /briefing', () => {
    expect(content).toContain("import { MondayBriefing } from '../features/monday-briefing/MondayBriefing';");
    expect(content).toContain("{ path: '/',             label: 'Monday Briefing'");
    expect(content).toMatch(/const indexRoute = createRoute\(\{[\s\S]*path: '\/'[\s\S]*component: MondayBriefing[\s\S]*\}\);/);
    expect(content).not.toContain("path: '/briefing'");
  });

  it('keeps meta system routes mapped to launch, backup, and settings surfaces', () => {
    expect(content).toContain("const LazyAboutScreen = lazy(async () => ({ default: (await import('../features/launch/AboutScreen')).AboutScreen }));");
    expect(content).toContain("const LazyCreditsScreen = lazy(async () => ({ default: (await import('../features/launch/CreditsScreen')).CreditsScreen }));");
    expect(content).toContain("const LazyFaqScreen = lazy(async () => ({ default: (await import('../features/launch/FaqScreen')).FaqScreen }));");
    expect(content).toContain("const LazyDynastyCartridge = lazy(async () => ({ default: (await import('../features/dynasty-cartridge/DynastyCartridge')).DynastyCartridge }));");
    expect(content).toContain("import { Settings as SettingsScreen } from '../features/settings/Settings';");
    expect(content).toContain('NERD_NAV_GROUPS as NERD_GROUP_DEFINITIONS');
    expect(content).toContain('const FULL_NAV_GROUPS: NavGroup[] = NERD_GROUP_DEFINITIONS.map((group) => ({');
    expect(content).toMatch(/const aboutRoute = createRoute\(\{[\s\S]*path: '\/about'[\s\S]*<LazyAboutScreen \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const creditsRoute = createRoute\(\{[\s\S]*path: '\/credits'[\s\S]*<LazyCreditsScreen \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const faqRoute = createRoute\(\{[\s\S]*path: '\/faq'[\s\S]*<LazyFaqScreen \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const dynastyRoute = createRoute\(\{[\s\S]*path: '\/dynasty'[\s\S]*<LazyDynastyCartridge \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const settingsRoute = createRoute\(\{[\s\S]*path: '\/settings'[\s\S]*component: SettingsScreen[\s\S]*\}\);/);
  });

  it('keeps the weather forecast route mapped to its forecast surface', () => {
    expect(content).toContain("const LazyWeatherForecast = lazy(async () => ({ default: (await import('../features/league/WeatherForecast')).WeatherForecast }));");
    expect(content).toMatch(/const weatherForecastRoute = createRoute\(\{[\s\S]*path: '\/league\/weather'[\s\S]*<LazyRouteFrame label="weather">[\s\S]*<LazyWeatherForecast \/>[\s\S]*\}\);/);
    expect(content).toMatch(/const ROUTE_IMPLEMENTATIONS = \[[\s\S]*weatherForecastRoute[\s\S]*\]\s+as const/);
  });
});
