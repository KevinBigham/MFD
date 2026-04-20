import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Settings } from './Settings';

const gameState = {
  phase: 'offseason',
  week: 0,
  difficulty: 'allpro',
  settings: {
    halftimeDecisions: 'on',
  },
  teams: {},
  players: {},
  difficultyState: {
    enabled: true,
    adaptiveSlider: 58,
    recentUserResults: [],
    currentStreak: 4,
    adjustmentHistory: [],
  },
  userTeam: { id: 'team-1' },
  facilities: {
    budget: 9,
    facilities: [
      { type: 'training_complex', level: 2 },
      { type: 'medical_center', level: 1 },
    ],
    upgradeCosts: {
      training_complex: [4, 8, 12],
      medical_center: [4, 8, 12],
      film_room: [3, 6, 9],
      weight_room: [3, 6, 9],
      recovery_suite: [5, 10, 15],
    },
  },
  medicalStaff: {
    current: {
      id: 'med-1',
      name: 'Dr. Harper',
      tier: 'good',
      salary: 1.8,
      recoveryBonus: 0.9,
      preventionBonus: 0.9,
    },
    available: [
      {
        id: 'med-2',
        name: 'Parker Lane',
        tier: 'elite',
        salary: 2.8,
        recoveryBonus: 0.8,
        preventionBonus: 0.8,
      },
    ],
  },
};

const uiState = {
  autosaveEnabled: true,
  simSpeed: 'detailed',
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: {
    game: typeof gameState;
    actions: {
      setDifficulty: () => Promise<void>;
      setHalftimeDecisions: () => Promise<void>;
      setAdaptiveDifficultyEnabled: () => Promise<void>;
      upgradeFacility: () => Promise<void>;
      hireMedicalStaff: () => Promise<void>;
    };
  }) => unknown) => selector({
    game: gameState,
    actions: {
      setDifficulty: async () => undefined,
      setHalftimeDecisions: async () => undefined,
      setAdaptiveDifficultyEnabled: async () => undefined,
      upgradeFacility: async () => undefined,
      hireMedicalStaff: async () => undefined,
    },
  }),
  selectDifficultyState: (state: { game: typeof gameState }) => state.game.difficultyState,
  selectUserTeam: (state: { game: typeof gameState }) => state.game.userTeam,
  selectFacilities: (state: { game: typeof gameState }) => state.game.facilities,
  selectMedicalStaff: (state: { game: typeof gameState }) => state.game.medicalStaff,
  selectPhase: (state: { game: typeof gameState }) => state.game.phase,
}));

vi.mock('../audio/AudioManager', () => ({
  useAudio: () => ({
    play: vi.fn(),
    playCueQueue: vi.fn(),
    muted: false,
    masterEnabled: true,
    toggleMute: vi.fn(),
    categories: {
      ui: { enabled: true, volume: 80 },
      sfx: { enabled: true, volume: 85 },
      ambient: { enabled: true, volume: 55 },
    },
    setAudioMasterEnabled: vi.fn(),
    setAudioCategoryEnabled: vi.fn(),
    setAudioCategoryVolume: vi.fn(),
  }),
}));

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: typeof uiState & {
    setAutosaveEnabled: () => void;
    setSimSpeed: () => void;
  }) => unknown) => selector({
    ...uiState,
    setAutosaveEnabled: () => undefined,
    setSimSpeed: () => undefined,
  }),
}));

describe('Settings', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('http://localhost/'),
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('http://localhost/'),
    });
  });

  it('renders the difficulty and simulation preference controls', () => {
    const markup = renderToStaticMarkup(<Settings />);

    expect(markup).toContain('SETTINGS');
    expect(markup).toContain('Difficulty');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Autosave');
    expect(markup).toContain('DETAILED');
    expect(markup).toContain('Halftime Hell');
    expect(markup).toContain('Adaptive Difficulty');
    expect(markup).toContain('Winning streaks get tougher');
    expect(markup).toContain('Broadcast Mix');
    expect(markup).toContain('AMBIENT');
    expect(markup).toContain('--- FACILITIES ---');
    expect(markup).toContain('--- MEDICAL STAFF ---');
    expect(markup).toContain('Dr. Harper');
  });

  it('shows the invariant debug panel when debug mode is enabled', () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('http://localhost/?debug=1'),
    });

    const markup = renderToStaticMarkup(<Settings />);

    expect(markup).toContain('INVARIANT DEBUG');
    expect(markup).toContain('State Clean');
    expect(markup).toContain('Developer only');
  });
});
