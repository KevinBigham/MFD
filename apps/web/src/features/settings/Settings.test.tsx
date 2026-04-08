import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Settings } from './Settings';

const gameState = {
  phase: 'offseason',
  difficulty: 'allpro',
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
      setAdaptiveDifficultyEnabled: () => Promise<void>;
      upgradeFacility: () => Promise<void>;
      hireMedicalStaff: () => Promise<void>;
    };
  }) => unknown) => selector({
    game: gameState,
    actions: {
      setDifficulty: async () => undefined,
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
    muted: false,
    toggleMute: vi.fn(),
    volume: 0.5,
    setVolume: vi.fn(),
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
  it('renders the difficulty and simulation preference controls', () => {
    const markup = renderToStaticMarkup(<Settings />);

    expect(markup).toContain('SETTINGS');
    expect(markup).toContain('Difficulty');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Autosave');
    expect(markup).toContain('DETAILED');
    expect(markup).toContain('Adaptive Difficulty');
    expect(markup).toContain('Winning streaks get tougher');
    expect(markup).toContain('--- FACILITIES ---');
    expect(markup).toContain('--- MEDICAL STAFF ---');
    expect(markup).toContain('Dr. Harper');
  });
});
