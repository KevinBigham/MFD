import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveRule,
  getSalaryCap,
  migrate,
  SAVE_VERSION,
  SaveStateSchema,
} from '@mfd/engine';
import type { CBAProposal, GameState } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { useGameStore } from './game-store';
import { useUiStore } from './ui-store';
import { autosaveDynasty } from './persistence';
import { MemoryStorage } from './game-store.test-helpers';

vi.mock('./persistence', () => ({
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
}));

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

function setStoreGame(game: GameState): void {
  useGameStore.setState((state) => ({
    ...state,
    game,
    initialized: true,
  }));
}

function parseCurrentSave(raw: Record<string, unknown>): GameState {
  const result = SaveStateSchema.safeParse(raw);
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data as unknown as GameState;
}

function migrateLegacyGovernanceSave(seed: number): GameState {
  const legacy = structuredClone(createSeedGameState(seed, 0, 'pro')) as unknown as Record<string, unknown>;
  legacy['version'] = 19;
  delete legacy['leagueRules'];
  delete legacy['cbaState'];
  delete legacy['commissionerState'];
  delete legacy['laborState'];

  const migrated = migrate(legacy, SAVE_VERSION);
  const game = parseCurrentSave(migrated);
  expect(game.leagueRules).toBeDefined();
  expect(game.cbaState).toBeDefined();
  expect(game.commissionerState).toBeDefined();
  expect(game.laborState).toBeDefined();
  return game;
}

function installNegotiationState(game: GameState, proposal: CBAProposal | null): void {
  game.cbaState.negotiationState = {
    round: proposal?.round ?? 1,
    ownersProposal: proposal,
    playersProposal: proposal,
    currentProposal: proposal,
    gap: proposal ? 8 : 42,
    mediator: Boolean(proposal),
    publicPressure: proposal ? 72 : 24,
    ownerVotes: {},
    userVote: null,
  };
}

function makeOwnerAcceptableProposal(game: GameState): CBAProposal {
  const currentTerms = game.cbaState.currentDeal!.terms;
  return {
    id: `g5-cba-${game.year}`,
    side: 'owners',
    year: game.year,
    round: 3,
    rationale: 'G5 regression proposal with visible current-year rule changes.',
    terms: {
      ...currentTerms,
      revenueSplit: Number(Math.min(0.55, currentTerms.revenueSplit + 0.01).toFixed(2)),
      capGrowthRate: Number(Math.min(0.08, currentTerms.capGrowthRate + 0.02).toFixed(3)),
      practiceSquadSize: currentTerms.practiceSquadSize + 2,
      rosterLimit: currentTerms.rosterLimit + 1,
    },
  };
}

function makeOwnersLikelyToApprove(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    team.franchiseIdentity.marketSize = 'small';
    team.gmStrategy = 'neutral';
  }
}

function poisonCapSpace(game: GameState, capUsed: number): void {
  for (const team of Object.values(game.teams)) {
    team.capUsed = capUsed;
    team.capSpace = -999;
  }
}

function expectCapSpaceRefreshed(game: GameState): void {
  const cap = getSalaryCap(game.year, game);
  for (const team of Object.values(game.teams)) {
    expect(team.capSpace).toBe(roundMoney(cap - team.capUsed));
  }
}

function testWindow(): { location: { hash: string }; history: { pushState: ReturnType<typeof vi.fn> }; dispatchEvent: ReturnType<typeof vi.fn> } {
  return (globalThis as unknown as {
    window: { location: { hash: string }; history: { pushState: ReturnType<typeof vi.fn> }; dispatchEvent: ReturnType<typeof vi.fn> };
  }).window;
}

describe('G5 governance and CBA release gate', () => {
  beforeEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.stubGlobal('PopStateEvent', class PopStateEventMock {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    });
    vi.stubGlobal('window', {
      location: { hash: '' },
      history: { pushState: vi.fn() },
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.clearAllMocks();
  });

  afterEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.unstubAllGlobals();
  });

  it('migrates old governance saves and routes training-camp CBA holds through the store', async () => {
    const game = migrateLegacyGovernanceSave(5100);
    game.phase = 'offseason';
    game.cbaState.status = 'expired';
    game.cbaState.currentDeal!.endYear = game.year - 1;

    setStoreGame(game);
    await useGameStore.getState().actions.advanceCBANegotiation();

    const negotiatingGame = useGameStore.getState().game!;
    expect(negotiatingGame.cbaState.negotiationState?.round).toBe(1);
    expect(['negotiating', 'awaiting_owner_vote', 'lockout']).toContain(negotiatingGame.cbaState.status);

    const trainingCampHold = structuredClone(negotiatingGame);
    trainingCampHold.phase = 'training_camp';
    trainingCampHold.week = 1;
    trainingCampHold.cbaState.status = 'negotiating';
    installNegotiationState(trainingCampHold, null);
    setStoreGame(trainingCampHold);
    vi.mocked(autosaveDynasty).mockClear();

    const summary = await useGameStore.getState().actions.advanceWeek();

    const heldGame = useGameStore.getState().game!;
    expect(summary).toBeNull();
    expect(heldGame.phase).toBe('training_camp');
    expect(heldGame.week).toBe(1);
    expect(heldGame.cbaState.status).toBe('negotiating');
    expect(testWindow().location.hash).toBe('/cba');
    expect(autosaveDynasty).toHaveBeenCalledWith(heldGame);
  });

  it('ratifies an owner-approved CBA with current-year rules, cap refresh, and save round trip', async () => {
    const game = createSeedGameState(5200, 0, 'pro');
    game.year = 2030;
    game.phase = 'offseason';
    makeOwnersLikelyToApprove(game);
    poisonCapSpace(game, 150);

    const beforeCap = getSalaryCap(game.year, game);
    const proposal = makeOwnerAcceptableProposal(game);
    game.cbaState.status = 'awaiting_owner_vote';
    installNegotiationState(game, proposal);
    game.laborState.activeStoppage = {
      type: 'lockout',
      severity: 3,
      startWeek: game.week,
      resolvedWeek: null,
      affectedTeams: Object.keys(game.teams),
      moralePenalty: -10,
    };

    setStoreGame(game);
    await useGameStore.getState().actions.voteOnCBA('approve');

    const ratifiedGame = useGameStore.getState().game!;
    const capAfter = getSalaryCap(ratifiedGame.year, ratifiedGame);
    expect(ratifiedGame.cbaState.status).toBe('active');
    expect(ratifiedGame.cbaState.currentDeal?.startYear).toBe(game.year);
    expect(ratifiedGame.cbaState.currentDeal?.endYear).toBeGreaterThan(game.year);
    expect(ratifiedGame.cbaState.history.at(-1)?.id).toBe(ratifiedGame.cbaState.currentDeal?.id);
    expect(ratifiedGame.laborState.activeStoppage).toBeNull();
    expect(capAfter).toBeGreaterThan(beforeCap);
    expectCapSpaceRefreshed(ratifiedGame);

    const capGrowthRule = ratifiedGame.leagueRules.entries.salary_cap_growth;
    expect(capGrowthRule.value).toBe(proposal.terms.capGrowthRate);
    expect(capGrowthRule.effectiveYear).toBe(game.year);
    expect(capGrowthRule.source).toBe('cba');
    expect(getActiveRule(ratifiedGame.leagueRules, 'salary_cap_growth', game.year)).toBe(proposal.terms.capGrowthRate);
    expect(getActiveRule(ratifiedGame.leagueRules, 'salary_cap_growth', game.year + 1)).toBe(proposal.terms.capGrowthRate);
    expect(ratifiedGame.leagueRules.history).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'salary_cap_growth',
        newValue: proposal.terms.capGrowthRate,
        effectiveYear: game.year,
        source: 'cba',
      }),
      expect.objectContaining({
        key: 'practice_squad_size',
        newValue: proposal.terms.practiceSquadSize,
        effectiveYear: game.year,
        source: 'cba',
      }),
    ]));

    const ratificationNews = ratifiedGame.leagueNews.find((entry) => entry.headline === 'New CBA ratified');
    expect(ratificationNews?.body).toContain('(approve-reject-abstain)');
    expect(ratificationNews?.body).toMatch(/\d+-\d+-\d+ \(approve-reject-abstain\)/);

    const roundTrip = parseCurrentSave(migrate(
      JSON.parse(JSON.stringify(ratifiedGame)) as Record<string, unknown>,
      SAVE_VERSION,
    ));
    expect({
      cbaStatus: roundTrip.cbaState.status,
      dealStart: roundTrip.cbaState.currentDeal?.startYear,
      dealEnd: roundTrip.cbaState.currentDeal?.endYear,
      capGrowth: roundTrip.leagueRules.entries.salary_cap_growth.value,
      capGrowthSource: roundTrip.leagueRules.entries.salary_cap_growth.source,
      capSpace: Object.values(roundTrip.teams).map((team) => team.capSpace),
    }).toEqual({
      cbaStatus: ratifiedGame.cbaState.status,
      dealStart: ratifiedGame.cbaState.currentDeal?.startYear,
      dealEnd: ratifiedGame.cbaState.currentDeal?.endYear,
      capGrowth: ratifiedGame.leagueRules.entries.salary_cap_growth.value,
      capGrowthSource: ratifiedGame.leagueRules.entries.salary_cap_growth.source,
      capSpace: Object.values(ratifiedGame.teams).map((team) => team.capSpace),
    });
  });

  it('resolves a lockout through the store and refreshes caps before league business resumes', async () => {
    const game = createSeedGameState(5300, 0, 'pro');
    game.year = 2030;
    game.phase = 'offseason';
    game.cbaState.status = 'lockout';
    game.cbaState.lockoutRisk = 95;
    installNegotiationState(game, null);
    game.laborState.activeStoppage = {
      type: 'lockout',
      severity: 3,
      startWeek: game.week,
      resolvedWeek: null,
      affectedTeams: Object.keys(game.teams),
      moralePenalty: -10,
    };
    poisonCapSpace(game, 125);

    setStoreGame(game);
    await useGameStore.getState().actions.advanceCBANegotiation();

    const resolvedGame = useGameStore.getState().game!;
    expect(resolvedGame.cbaState.status).toBe('active');
    expect(resolvedGame.cbaState.currentDeal?.startYear).toBe(game.year);
    expect(resolvedGame.cbaState.lastNegotiationYear).toBe(game.year);
    expect(resolvedGame.laborState.activeStoppage).toBeNull();
    expect(resolvedGame.leagueNews.some((entry) => entry.headline === 'Lockout resolved')).toBe(true);
    expectCapSpaceRefreshed(resolvedGame);
    expect(autosaveDynasty).toHaveBeenCalledWith(resolvedGame);
  });
});
