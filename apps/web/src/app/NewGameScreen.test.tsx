import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  actions: {
    newGame: vi.fn(),
    loadGame: vi.fn(),
  },
};

vi.mock('./store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('./store/persistence', () => ({
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
  loadImportedCartridge: vi.fn(),
  loadImportedCartridgeFile: vi.fn(),
}));

vi.mock('./store/seed', () => ({
  createSeedGameState: vi.fn(),
  getTeamOptions: () => [
    { index: 0, city: 'Buffalo', name: 'Bills', abbr: 'BUF', fullName: 'Buffalo Bills', conference: 'AFC', division: 'East' },
    { index: 1, city: 'Miami', name: 'Dolphins', abbr: 'MIA', fullName: 'Miami Dolphins', conference: 'AFC', division: 'East' },
    { index: 2, city: 'Dallas', name: 'Cowboys', abbr: 'DAL', fullName: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
    { index: 3, city: 'Philadelphia', name: 'Eagles', abbr: 'PHI', fullName: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  ],
}));

vi.mock('../features/franchise-setup/setupPersistence', () => ({
  persistSetupRunMode: vi.fn(),
  readFirstTenMinutesCompleted: vi.fn(() => false),
}));

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    getAvailableScenarios: () => [{ id: 'rebuild', name: 'Rebuild', tagline: 'Start over', description: 'Rebuild a franchise', difficulty: 'pro', seasonLimit: 5 }],
    // Sprint 53: returns a deterministic prng function so AttractMode's
    // `mulberry32(seed)()` calls work without test-mock guards in production code.
    mulberry32: vi.fn(() => () => 0.42),
    startScenario: vi.fn(),
    createFastLaneSetupState: vi.fn(),
    generateConventionSave: vi.fn(),
    CONVENTION_SAVE_METADATA: { headline: 'Test headline', week: 14, description: 'Test', team: 'Test' },
    getDefaultDifficultyFlags: vi.fn(() => ({ skipHalftimeDecision: true })),
  };
});

import {
  buildConventionDemoLaunchState,
  buildLaunchGameState,
  NewGameScreen,
  ScenarioLaunchCoverageBadges,
} from './NewGameScreen';
import {
  createFastLaneSetupState,
  generateConventionSave,
  mulberry32,
  SAVE_VERSION,
  startScenario,
} from '@mfd/engine';
import { createSeedGameState } from './store/seed';
import { readFirstTenMinutesCompleted } from '../features/franchise-setup/setupPersistence';

const createSeedGameStateMock = vi.mocked(createSeedGameState);
const startScenarioMock = vi.mocked(startScenario);
const mulberry32Mock = vi.mocked(mulberry32);
const generateConventionSaveMock = vi.mocked(generateConventionSave);
const createFastLaneSetupStateMock = vi.mocked(createFastLaneSetupState);
const readFirstTenMinutesCompletedMock = vi.mocked(readFirstTenMinutesCompleted);

describe('NewGameScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFirstTenMinutesCompletedMock.mockReturnValue(false);
    createSeedGameStateMock.mockReturnValue({ id: 'base-game', setupState: { completedPhases: [] } } as unknown as ReturnType<typeof createSeedGameState>);
    startScenarioMock.mockReturnValue({ id: 'scenario-game', setupState: { completedPhases: ['choose_team'] } } as unknown as ReturnType<typeof createSeedGameState>);
    mulberry32Mock.mockReturnValue(() => 0.42);
    generateConventionSaveMock.mockReturnValue({ id: 'convention-game' } as unknown as ReturnType<typeof generateConventionSave>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all 4 difficulty options', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Rookie');
    expect(markup).toContain('Pro');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Legend');
  });

  it('renders team selection with AFC and NFC conferences', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('AFC');
    expect(markup).toContain('NFC');
    expect(markup).toContain('BUF');
    expect(markup).toContain('DAL');
  });

  it('renders compact team finder controls for narrowing the franchise board', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Find franchise');
    expect(markup).toContain('Search city, name, or abbreviation');
    expect(markup).toContain('4 teams shown');
  });

  it('renders every division filter chip including West', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    for (const label of ['ALL', 'East', 'North', 'South', 'West']) {
      expect(markup).toContain(`>${label}<`);
    }
  });

  it('renders the Start Dynasty button', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Start Dynasty');
  });

  it('renders a locked Fast Lane setup path before a full Day 1 completion', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Setup Path');
    expect(markup).toContain('Full Setup');
    expect(markup).toContain('Fast Lane');
    expect(markup).toContain('LOCKED');
    expect(markup).toContain('Complete one full Day 1 setup to unlock repeat-player setup.');
  });

  it('renders Fast Lane as unlocked from the browser-local first-ten marker', () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('window', { localStorage });
    readFirstTenMinutesCompletedMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(readFirstTenMinutesCompletedMock).toHaveBeenCalledWith(localStorage);
    expect(markup).toContain('UNLOCKED');
    expect(markup).toContain('Start after AGM selection with recommended setup defaults preloaded.');
  });

  it('renders an Import Dynasty recovery action', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Import Dynasty');
  });

  it('renders paste-backup fallback copy', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Paste backup code');
  });

  it('renders rookie as the recommended difficulty without stale fast-path copy', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('Rookie');
    expect(markup).toContain('REC');
    expect(markup).not.toContain('CPU games stay on the fast path');
  });

  it('renders the current save schema badge from engine source truth', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain(`Save v${SAVE_VERSION}`);
    expect(markup).not.toContain('Save v35');
  });

  it('labels launch sources, validated load boundaries, and render no-write behavior', () => {
    const markup = renderToStaticMarkup(<NewGameScreen />);

    expect(markup).toContain('LAUNCH SOURCES');
    expect(markup).toContain('createSeedGameState');
    expect(markup).toContain('actions.newGame');
    expect(markup).toContain('validated loadGame');
    expect(markup).toContain('setup-run mode');
    expect(markup).toContain('New Dynasty starts from the web seed factory');
    expect(markup).toContain('Convention Demo uses the validated Week 14');
    expect(markup).toContain('Continue calls loadGame only after autosave validation');
    expect(markup).toContain('Import validates');
    expect(markup).toContain('before writing a fresh autosave and calling loadGame');
    expect(markup).toContain('New Dynasty persists the selected setup-run mode immediately before');
    expect(markup).toContain('Full setup keeps the seeded setup state');
    expect(markup).toContain('unlocked Fast Lane replaces only the initial setup state');
    expect(markup).toContain('does not create a dynasty, clear sidecars, autosave, import backups');
    expect(markup).toContain('start setup, play scheduled games, or write GameState');
  });

  it('builds a standard dynasty start from createSeedGameState without scenario mutation', () => {
    const launched = buildLaunchGameState({
      seed: 2034,
      selectedTeam: 2,
      difficulty: 'legend',
      mode: 'dynasty',
      selectedScenarioId: 'rebuild',
    });

    expect(createSeedGameStateMock).toHaveBeenCalledWith(2034, 2, 'legend');
    expect(startScenarioMock).not.toHaveBeenCalled();
    expect(createFastLaneSetupStateMock).not.toHaveBeenCalled();
    expect(launched).toEqual({ id: 'base-game', setupState: { completedPhases: [] } });
  });

  it('builds a Fast Lane dynasty start with the engine setup preload', () => {
    const baseState = {
      id: 'base-game',
      setupState: { completedPhases: [] },
      teams: {
        afce1: { id: 'afce1', isUser: true },
        afce2: { id: 'afce2', isUser: false },
      },
    };
    const fastLaneSetup = { currentPhase: 'intel_briefing', completedPhases: ['choose_agm'] };
    createSeedGameStateMock.mockReturnValueOnce(baseState as unknown as ReturnType<typeof createSeedGameState>);
    createFastLaneSetupStateMock.mockReturnValueOnce(
      fastLaneSetup as unknown as ReturnType<typeof createFastLaneSetupState>,
    );

    const launched = buildLaunchGameState({
      seed: 2035,
      selectedTeam: 0,
      difficulty: 'pro',
      mode: 'dynasty',
      selectedScenarioId: 'rebuild',
      setupRunMode: 'fast_lane',
    });

    expect(createSeedGameStateMock).toHaveBeenCalledWith(2035, 0, 'pro');
    expect(createFastLaneSetupStateMock).toHaveBeenCalledWith(baseState, 'afce1');
    expect(launched.setupState).toBe(fastLaneSetup);
  });

  it('builds a scenario start from the seed factory, scenario helper, and setup bypass', () => {
    const launched = buildLaunchGameState({
      seed: 2040,
      selectedTeam: 1,
      difficulty: 'pro',
      mode: 'scenario',
      selectedScenarioId: 'rebuild',
      setupRunMode: 'fast_lane',
    });

    expect(createSeedGameStateMock).toHaveBeenCalledWith(2040, 1, 'pro');
    expect(mulberry32Mock).toHaveBeenCalledWith(2040 ^ ('rebuild'.length * 97));
    expect(startScenarioMock).toHaveBeenCalledWith(
      'rebuild',
      { id: 'base-game', setupState: { completedPhases: [] } },
      expect.any(Function),
    );
    expect(createFastLaneSetupStateMock).not.toHaveBeenCalled();
    expect(launched).toEqual({ id: 'scenario-game' });
  });

  it('builds convention demo starts from the validated demo generator and seeded rng', () => {
    const rng = () => 0.42;
    mulberry32Mock.mockReturnValueOnce(rng);

    const launched = buildConventionDemoLaunchState(90510);

    expect(mulberry32Mock).toHaveBeenCalledWith(90510);
    expect(generateConventionSaveMock).toHaveBeenCalledWith('afce1', rng);
    expect(launched).toEqual({ id: 'convention-game' });
  });

  it('renders source-backed scenario launch coverage badges', () => {
    const restrictedMarkup = renderToStaticMarkup(
      <ScenarioLaunchCoverageBadges constraints={{ blockTrades: true, blockFreeAgency: true }} />,
    );
    const openMarkup = renderToStaticMarkup(
      <ScenarioLaunchCoverageBadges constraints={{}} />,
    );

    expect(restrictedMarkup).toContain('Scenario launch constraint coverage');
    expect(restrictedMarkup).toContain('Trade Actions enforced');
    expect(restrictedMarkup).toContain('Offseason Free Agency enforced');
    expect(openMarkup).toContain('Open rules');
  });
});
