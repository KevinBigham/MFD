import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Settings,
  SettingsActionReceiptPanel,
  buildFacilityUpgradeForecast,
  buildMedicalStaffHireForecast,
  buildSettingsActionReceipt,
} from './Settings';

const facilities = {
  budget: 9,
  facilities: [
    {
      type: 'training_complex',
      level: 2,
      effect: {
        trainingXPBonus: 1.1,
        recoveryBonus: 1,
        injuryPreventionBonus: 1,
        scoutingBonus: 1,
        moraleBonus: 1.02,
        fatigueGainBonus: 1,
      },
    },
    {
      type: 'medical_center',
      level: 1,
      effect: {
        trainingXPBonus: 1,
        recoveryBonus: 1.05,
        injuryPreventionBonus: 0.99,
        scoutingBonus: 1,
        moraleBonus: 1,
        fatigueGainBonus: 1,
      },
    },
  ],
  upgradeCosts: {
    training_complex: [4, 8, 12],
    medical_center: [4, 8, 12],
    film_room: [3, 6, 9],
    weight_room: [3, 6, 9],
    recovery_suite: [5, 10, 15],
  },
};

const currentMedical = {
  id: 'med-1',
  name: 'Dr. Harper',
  tier: 'good',
  salary: 1.8,
  recoveryBonus: 0.9,
  preventionBonus: 0.9,
};

const roster = [
  { id: 'qb-1', name: 'Young QB', pos: 'QB', age: 23, ovr: 72, teamId: 'team-1' },
  { id: 'wr-1', name: 'Young WR', pos: 'WR', age: 22, ovr: 74, teamId: 'team-1' },
];

const userTeam = {
  id: 'team-1',
  name: 'Blaze',
  capUsed: 200,
  capSpace: 52,
  roster,
  facilityState: facilities,
  medicalStaff: currentMedical,
};

const gameState = {
  phase: 'offseason',
  week: 0,
  difficulty: 'allpro',
  settings: {
    halftimeDecisions: 'on',
    coachMode: false,
  },
  teams: {
    'team-1': userTeam,
  },
  players: {
    'qb-1': roster[0],
    'wr-1': roster[1],
  },
  difficultyState: {
    enabled: true,
    adaptiveSlider: 58,
    recentUserResults: [],
    currentStreak: 4,
    adjustmentHistory: [],
  },
  userTeam,
  facilities,
  medicalStaff: {
    current: currentMedical,
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
  activeMentors: [{
    playerId: 'mentor-qb',
    name: 'Retired QB',
    position: 'QB',
    peakOvr: 95,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2031,
    salary: 0.5,
  }],
  mentorBudget: 2,
  trainingCampResults: [{
    teamId: 'team-1',
    standouts: [{
      playerId: 'wr-1',
      playerName: 'Young WR',
      pos: 'WR',
      ovrBefore: 72,
      ovrAfter: 74,
      reason: 'rookie_standout',
    }],
    injuries: [],
    battles: [],
    headlines: ['Young WR turned heads in camp.'],
  }],
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
      setCoachMode: () => Promise<void>;
      setAdaptiveDifficultyEnabled: () => Promise<void>;
      upgradeFacility: () => Promise<void>;
      hireMedicalStaff: () => Promise<void>;
    };
  }) => unknown) => selector({
    game: gameState,
    actions: {
      setDifficulty: async () => undefined,
      setHalftimeDecisions: async () => undefined,
      setCoachMode: async () => undefined,
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

  it('builds a facility upgrade forecast from saved state and next-level effects', () => {
    const forecast = buildFacilityUpgradeForecast(facilities.facilities[0] as never, facilities as never);

    expect(forecast.status).toBe('upgrade_ready');
    expect(forecast.label).toBe('Upgrade ready');
    expect(forecast.nextLevelLabel).toBe('Level 2 -> 3');
    expect(forecast.costLabel).toBe('$8 cost');
    expect(forecast.budgetAfterLabel).toBe('$1 after upgrade');
    expect(forecast.impact).toContain('Training XP +5%');
    expect(forecast.source).toContain('getFacilityLevelEffect');
    expect(forecast.source).toContain('Upgrade button is the only action that saves this change');
  });

  it('builds a medical staff hiring forecast from candidate and phase context', () => {
    const forecast = buildMedicalStaffHireForecast(gameState.medicalStaff.available[0] as never, {
      current: currentMedical as never,
      phase: 'offseason',
    });

    expect(forecast.status).toBe('hire_ready');
    expect(forecast.label).toBe('Hire ready');
    expect(forecast.recoveryImpact).toBe('Recovery time +10%');
    expect(forecast.preventionImpact).toBe('Injury risk +10%');
    expect(forecast.salaryLabel).toBe('$2.8M salary');
    expect(forecast.source).toContain('availableMedicalStaff');
    expect(forecast.source).toContain('Hire button is the only action that saves this change');
  });

  it('builds a facility upgrade action receipt from the pre-click forecast context', () => {
    const forecast = buildFacilityUpgradeForecast(facilities.facilities[0] as never, facilities as never);
    const receipt = buildSettingsActionReceipt({
      action: 'facility_upgrade',
      teamName: 'Blaze',
      facilityType: 'training_complex',
      facilityLabel: 'Training Complex',
      fromLevel: 2,
      nextLevelLabel: forecast.nextLevelLabel,
      costLabel: forecast.costLabel,
      budgetAfterLabel: forecast.budgetAfterLabel,
      impact: forecast.impact,
    });

    expect(receipt.title).toBe('Facility Upgrade Processed');
    expect(receipt.result).toContain('Level 2');
    expect(receipt.result).toContain('$8 cost');
    expect(receipt.result).toContain('Training XP +5%');
    expect(receipt.stateTouched).toContain('team.facilityState');
    expect(receipt.source).toContain('upgradeFacilityEngine');
    expect(receipt.boundary).toContain('does not run progression');
    expect(receipt.boundary).toContain('saved outcomes');
  });

  it('builds a medical staff hire action receipt from the selected candidate context', () => {
    const forecast = buildMedicalStaffHireForecast(gameState.medicalStaff.available[0] as never, {
      current: currentMedical as never,
      phase: 'offseason',
    });
    const receipt = buildSettingsActionReceipt({
      action: 'medical_hire',
      teamName: 'Blaze',
      staffId: 'med-2',
      staffName: 'Parker Lane',
      staffTier: 'elite',
      previousStaffName: currentMedical.name,
      salaryLabel: forecast.salaryLabel,
      recoveryImpact: forecast.recoveryImpact,
      preventionImpact: forecast.preventionImpact,
    });

    expect(receipt.title).toBe('Medical Staff Hire Processed');
    expect(receipt.result).toContain('Parker Lane was hired');
    expect(receipt.result).toContain('Previous staff: Dr. Harper');
    expect(receipt.result).toContain('Recovery time +10%');
    expect(receipt.stateTouched).toContain('team.medicalStaff');
    expect(receipt.stateTouched).toContain('game.availableMedicalStaff');
    expect(receipt.source).toContain('hireMedicalStaffEngine');
    expect(receipt.boundary).toContain('does not refresh the medical pool');
  });

  it('renders operations action receipt source and no-extra-write copy', () => {
    const receipt = buildSettingsActionReceipt({
      action: 'medical_hire',
      teamName: 'Blaze',
      staffId: 'med-2',
      staffName: 'Parker Lane',
      staffTier: 'elite',
      previousStaffName: currentMedical.name,
      salaryLabel: '$2.8M salary',
      recoveryImpact: 'Recovery time +10%',
      preventionImpact: 'Injury risk +10%',
    });

    const markup = renderToStaticMarkup(<SettingsActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('OPERATIONS ACTION RECEIPT');
    expect(markup).toContain('Medical Staff Hire Processed');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.hireMedicalStaff');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('separate confirmation log');
  });

  it('renders the difficulty and simulation preference controls', () => {
    const markup = renderToStaticMarkup(<Settings />);

    expect(markup).toContain('SETTINGS');
    expect(markup).not.toContain('OPERATIONS ACTION RECEIPT');
    expect(markup).toContain('Difficulty');
    expect(markup).toContain('All-Pro');
    expect(markup).toContain('Autosave');
    expect(markup).toContain('Disable for manual save control during testing.');
    expect(markup).not.toContain('Disable if you want manual save control during testing.');
    expect(markup).toContain('DETAILED');
    expect(markup).toContain('Halftime Hell');
    expect(markup).toContain('Adaptive Difficulty');
    expect(markup).toContain('Winning streaks get tougher');
    expect(markup).toContain('data-spotlight-target="chip.route.settings.beat-1"');
    expect(markup).toContain('Broadcast Mix');
    expect(markup).toContain('AMBIENT');
    expect(markup).toContain('TEAM OPS IMPACT');
    expect(markup).toContain('Training XP');
    expect(markup).toContain('+10%');
    expect(markup).toContain('Recovery Window');
    expect(markup).toContain('Mentor Reach');
    expect(markup).toContain('Young WR turned heads in camp.');
    expect(markup).toContain('Retired QB shares technique guidance with Young QB.');
    expect(markup).toContain('OPERATIONS SOURCE');
    expect(markup).toContain('data-spotlight-target="chip.route.settings.beat-2"');
    expect(markup).toContain('Facility source');
    expect(markup).toContain('team.facilityState');
    expect(markup).toContain('saved facility.effect');
    expect(markup).toContain('Upgrade commit');
    expect(markup).toContain('upgradeFacility');
    expect(markup).toContain('does not run progression or training camp math');
    expect(markup).toContain('Medical source');
    expect(markup).toContain('availableMedicalStaff');
    expect(markup).toContain('Hiring gate');
    expect(markup).toContain('does not refresh the pool or process injury recovery');
    expect(markup).toContain('buildTeamOpsImpactReceipt');
    expect(markup).toContain('FACILITIES');
    expect(markup).toContain('Training XP x1.10');
    expect(markup).toContain('Upgrade Forecast');
    expect(markup).toContain('Upgrade ready');
    expect(markup).toContain('Level 2 -&gt; 3');
    expect(markup).toContain('Training XP +5%');
    expect(markup).toContain('$8 cost // $1 after upgrade');
    expect(markup).toContain('getFacilityLevelEffect');
    expect(markup).toContain('Upgrade button is the only action that saves this change');
    expect(markup).toContain('Recovery x1.05');
    expect(markup).toContain('MEDICAL STAFF');
    expect(markup).toContain('Dr. Harper');
    expect(markup).toContain('Hiring Forecast');
    expect(markup).toContain('Hire ready');
    expect(markup).toContain('Recovery time +10% // Injury risk +10%');
    expect(markup).toContain('availableMedicalStaff candidate plus saved team.medicalStaff');
    expect(markup).toContain('Hire button is the only action that saves this change');
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
