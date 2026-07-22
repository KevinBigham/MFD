import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { APP_ROUTE_REGISTRY, getNavUnlockStatus, NAV_UNLOCK_RULES } from '@mfd/engine/config';

describe('navigation completeness', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');
  const mobileContent = readFileSync(new URL('./MobileBottomTabBar.tsx', import.meta.url), 'utf-8');

  const CONTEXTUAL_ONLY_ROUTE_REASONS: Record<string, string> = {
    '/player/$playerId': 'Requires a concrete saved player id selected from roster, profile links, search, or another player surface.',
    '/player/$playerId/timeline': 'Requires a concrete saved player id selected from roster, profile links, search, or another player surface.',
  };

  const ROUTES_WITHOUT_ENGINE_UNLOCK_RULES: string[] = [];

  interface RouteDefinition {
    name: string;
    path: string;
  }

  function duplicates(values: readonly string[]): string[] {
    return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  }

  function extractNavItemPaths(): string[] {
    return extractNavItems().map((item) => item.path);
  }

  function extractNavItems(): Array<{ path: string; label: string }> {
    return APP_ROUTE_REGISTRY.map((entry) => ({ path: entry.path, label: entry.label }));
  }

  function extractMobilePrimaryPaths(): string[] {
    const match = mobileContent.match(/const PRIMARY_ITEMS[^=]*= \[([\s\S]*?)\];/);
    expect(match?.[1], 'PRIMARY_ITEMS block should be present in MobileBottomTabBar.tsx').toBeDefined();

    return Array.from(
      (match?.[1] ?? '').matchAll(/\{\s*path:\s*'([^']+)'/g),
      (pathMatch) => pathMatch[1]!,
    );
  }

  function extractNavGroupPaths(): string[] {
    return APP_ROUTE_REGISTRY.map((entry) => entry.path);
  }

  function extractRouteDefinitions(): RouteDefinition[] {
    return Array.from(
      content.matchAll(/const\s+([A-Za-z0-9]+Route)\s*=\s*createRoute\(\{[\s\S]*?path:\s*'([^']+)'/g),
      (match) => ({ name: match[1]!, path: match[2]! }),
    );
  }

  function extractRegisteredRouteNames(): string[] {
    const block = content.match(/const ROUTE_IMPLEMENTATIONS = \[([\s\S]*?)\]\s+as const;/)?.[1] ?? '';
    return Array.from(block.matchAll(/\b([a-z][A-Za-z0-9]+Route)\b/g), (match) => match[1]!);
  }

  function extractRegisteredRoutePaths(): string[] {
    const definitionsByName = new Map(extractRouteDefinitions().map((route) => [route.name, route.path]));

    return extractRegisteredRouteNames().map((name) => definitionsByName.get(name) ?? name);
  }

  function extractCommandItemsBlock(): string {
    const match = content.match(/const commandItems: CommandItem\[\] = \[([\s\S]*?)\n {2}\];/);

    expect(match?.[1], 'commandItems block should be present in App.tsx').toBeDefined();
    return match?.[1] ?? '';
  }

  it('keeps every NAV_ITEMS path unique and backed by a registered route', () => {
    const navPaths = extractNavItemPaths();
    const registeredPaths = new Set(extractRegisteredRoutePaths());

    expect(duplicates(navPaths)).toEqual([]);
    expect(navPaths.filter((path) => !registeredPaths.has(path))).toEqual([]);
  });

  it('keeps NAV_GROUPS as a complete grouped view of NAV_ITEMS', () => {
    const navPaths = extractNavItemPaths();
    const navPathSet = new Set(navPaths);
    const groupPaths = extractNavGroupPaths();
    const groupPathSet = new Set(groupPaths);

    expect(duplicates(groupPaths)).toEqual([]);
    expect(groupPaths.filter((path) => !navPathSet.has(path))).toEqual([]);
    expect(navPaths.filter((path) => !groupPathSet.has(path))).toEqual([]);
  });

  it('materializes route objects in canonical registry order and rejects drift', () => {
    expect(content).toContain('const canonicalRouteObjects = APP_ROUTE_REGISTRY.map((definition) => {');
    expect(content).toContain('const CONTEXTUAL_ROUTE_PATHS = new Set');
    expect(content).toContain('...canonicalRouteObjects');
    expect(content).toContain('Missing route implementation for ${definition.path}');
    expect(content).toContain('Route implementations missing registry metadata');
    expect(content).toContain('rootRoute.addChildren(registeredRouteObjects');
  });

  it('keeps hard-coded mobile primary tabs intentional and backed by NAV_ITEMS', () => {
    const mobilePrimaryPaths = extractMobilePrimaryPaths();
    const navPathSet = new Set(extractNavItemPaths());

    expect(mobilePrimaryPaths).toEqual(['/', '/roster', '/game-plan', '/week-advance']);
    expect(mobilePrimaryPaths.filter((path) => !navPathSet.has(path))).toEqual([]);
  });

  it('registers every createRoute definition exactly once by source name', () => {
    const definitions = extractRouteDefinitions();
    const definitionNames = definitions.map((route) => route.name);
    const definitionNameSet = new Set(definitionNames);
    const registeredNames = extractRegisteredRouteNames();
    const registeredNameSet = new Set(registeredNames);

    expect(duplicates(definitionNames)).toEqual([]);
    expect(duplicates(registeredNames)).toEqual([]);
    expect(definitionNames.filter((name) => !registeredNameSet.has(name))).toEqual([]);
    expect(registeredNames.filter((name) => !definitionNameSet.has(name))).toEqual([]);
  });

  it('keeps registered route paths unique', () => {
    expect(duplicates(extractRegisteredRoutePaths())).toEqual([]);
  });

  it('documents direct-only routes outside the primary navigation', () => {
    const navPathSet = new Set(extractNavItemPaths());
    const directOnlyPaths = extractRegisteredRoutePaths()
      .filter((path) => !navPathSet.has(path))
      .sort();

    expect(directOnlyPaths).toEqual(Object.keys(CONTEXTUAL_ONLY_ROUTE_REASONS).sort());
    expect(Object.values(CONTEXTUAL_ONLY_ROUTE_REASONS).every((reason) => reason.length > 40)).toBe(true);
  });

  it('command palette Advance Week navigates to /week-advance', () => {
    expect(content).not.toContain("onSelect: () => {},");
    expect(content).toContain("void router.navigate({ to: '/week-advance' })");
  });

  it('keeps command palette items sourced from NAV_ITEMS, roster players, plus the explicit advance-week action', () => {
    const commandBlock = extractCommandItemsBlock();
    const explicitCommandIds = Array.from(
      commandBlock.matchAll(/id:\s*'([^']+)'/g),
      (match) => match[1],
    );

    expect(content).toContain('const visibleNavItems = useMemo(');
    expect(commandBlock).toContain('...visibleNavItems.map((nav): CommandItem => ({');
    expect(commandBlock).toContain('id: `screen-${nav.path}`');
    expect(commandBlock).toContain('label: nav.label');
    expect(commandBlock).toContain("category: 'screen'");
    expect(commandBlock).toContain('keywords: [nav.shortLabel]');
    expect(commandBlock).toContain('onSelect: () => router.navigate({ to: nav.path })');
    expect(content).toContain('const roster = useGameStore(selectRoster);');
    expect(content).toContain('const playerCommandName = (player:');
    expect(content).toContain('const rosterCommandItems: CommandItem[] = roster');
    expect(content).not.toContain('.slice(0, 32)');
    expect(content).toContain('id: `player-${player.id}`');
    expect(content).toContain('label: `${playerCommandName(player)} (${player.pos})`');
    expect(content).toContain("category: 'player'");
    expect(content).toContain("onSelect: () => router.navigate({ to: '/player/$playerId', params: { playerId: player.id } })");
    expect(commandBlock).toContain('...rosterCommandItems');
    expect(explicitCommandIds).toEqual(['action-advance-week']);
    expect(commandBlock).toContain("category: 'action'");
    expect(commandBlock).not.toContain("category: 'team'");
  });

  it('wires engine progressive unlock helpers into the app shell', () => {
    expect(content).toContain('getNavUnlockStatus,');
    expect(content).toContain("from '@mfd/engine/config';");
    expect(content).toContain('function resolveNavItem(');
    expect(content).toContain('function resolveVisibleNavItems(');
    expect(content).toContain('getNavUnlockStatus(item.path, context)');
    expect(content).toContain('visibleNavItems');
  });

  it('keeps progressive unlock metadata reconciled with primary NAV_ITEMS and documents local-only discoveries', () => {
    const navItems = extractNavItems();
    const rulesByRoute = new Map(NAV_UNLOCK_RULES.map((rule) => [rule.route, rule]));
    const navRoutes = new Set(navItems.map((item) => item.path));
    const localOnly = new Set(ROUTES_WITHOUT_ENGINE_UNLOCK_RULES);

    expect(navItems.filter((item) => !rulesByRoute.has(item.path) && !localOnly.has(item.path)).map((item) => item.path)).toEqual([]);
    expect(NAV_UNLOCK_RULES.filter((rule) => !navRoutes.has(rule.route)).map((rule) => rule.route)).toEqual([]);
    expect(ROUTES_WITHOUT_ENGINE_UNLOCK_RULES.filter((route) => !navRoutes.has(route))).toEqual([]);
    expect(ROUTES_WITHOUT_ENGINE_UNLOCK_RULES.filter((route) => rulesByRoute.has(route))).toEqual([]);
    expect(ROUTES_WITHOUT_ENGINE_UNLOCK_RULES.map((route) => getNavUnlockStatus(route, { week: 1, phase: 'preseason' }).unlocked)).toEqual(
      ROUTES_WITHOUT_ENGINE_UNLOCK_RULES.map(() => true),
    );

    expect(navItems.filter((item) => rulesByRoute.has(item.path)).map((item) => [item.path, item.label])).toEqual(
      NAV_UNLOCK_RULES.map((rule) => [rule.route, rule.label]),
    );
  });

  it('nav buttons have data-nav attributes for tutorial targeting', () => {
    expect(content).toContain('data-nav={item.path}');
  });

  it('LazyRouteFrame uses styled pixel loading with animation', () => {
    expect(content).toContain('mfdLoadSlide');
    expect(content).toContain('Loader');
  });

  it('PlayerDevelopment route uses wrapper with real data', () => {
    expect(content).toContain('PlayerDevRouteWrapper');
    expect(content).not.toContain('const firstPlayer = roster[0] ?? null;');
    expect(content).toContain('const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);');
    expect(content).toContain('roster.find((player) => player.id === selectedPlayerId) ?? roster[0] ?? null');
    expect(content).toContain('const playerOptions = useMemo(() => roster.map((player) => ({');
    expect(content).toContain('generateDevelopmentReport');
    expect(content).toContain('projectDevelopmentCurve');
    expect(content).toContain('projections={projections}');
    expect(content).toContain('coachImpact={report?.coachImpact || null}');
    expect(content).toContain('playerOptions={playerOptions}');
    expect(content).toContain('selectedPlayerId={selectedPlayer?.id ?? null}');
    expect(content).toContain('onSelectPlayer={setSelectedPlayerId}');
  });

  it('AudioToggle is rendered in the navigation header', () => {
    expect(content).toContain('<AudioToggle');
    expect(content).toContain('playSound');
  });
});
