/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  GameState, Player, Team, WeeklySummary, SeasonPhase,
} from '@mfd/engine';
import {
  advanceFranchiseWeek,
  restructureContract, backloadContract,
  calcCapHit, calcDeadMoney,
  updateOwnerApproval,
  updateSystemFit,
  earnXP,
  getSalaryCap,
} from '@mfd/engine';
import { autosaveDynasty, loadLatestAutosaveGame } from './persistence';
import { runAdvanceWeek } from './sim';

// ── Store shape ────────────────────────────────────────────

interface GameActions {
  // Initialization
  newGame: (state: GameState) => Promise<void>;
  loadGame: (state: GameState) => void;
  loadLatestAutosave: () => Promise<boolean>;

  // Roster actions
  cutPlayer: (teamId: string, playerId: string) => void;
  toggleTradeBlock: (teamId: string, playerId: string) => void;
  setStarter: (teamId: string, playerId: string, isStarter: boolean) => void;

  // Contract actions
  restructure: (teamId: string, playerId: string) => void;
  backload: (teamId: string, playerId: string, voidYears?: number) => void;

  // Week advance
  advanceWeek: () => Promise<WeeklySummary | null>;

  // Owner
  refreshOwner: (teamId: string) => void;

  // Coaching
  addClinicXP: (teamId: string, track: string, amount: number) => void;

  // Season phase
  setPhase: (phase: SeasonPhase) => void;
}

interface GameStore {
  /** null = no game loaded, show new game screen */
  game: GameState | null;
  initialized: boolean;
  actions: GameActions;
}

// ── Selectors (pure functions, not in store) ───────────────

export const selectUserTeam = (state: GameStore): Team | null => {
  if (!state.game) return null;
  return Object.values(state.game.teams).find((t) => t.isUser) ?? null;
};

export const selectUserTeamId = (state: GameStore): string | null => {
  return selectUserTeam(state)?.id ?? null;
};

export const selectRoster = (state: GameStore): Player[] => {
  const team = selectUserTeam(state);
  return team?.roster ?? [];
};

export const selectPlayerById = (id: string) => (state: GameStore): Player | null => {
  if (!state.game) return null;
  return state.game.players[id] ?? null;
};

export const selectTeamById = (id: string) => (state: GameStore): Team | null => {
  if (!state.game) return null;
  return state.game.teams[id] ?? null;
};

export const selectWeek = (state: GameStore): number => state.game?.week ?? 0;
export const selectYear = (state: GameStore): number => state.game?.year ?? 2026;
export const selectPhase = (state: GameStore): SeasonPhase => state.game?.phase ?? 'preseason';

export const selectOwnerState = (state: GameStore) => {
  const team = selectUserTeam(state);
  return team?.owner ?? null;
};

export const selectCoachingStaff = (state: GameStore) => {
  const team = selectUserTeam(state);
  return team?.staff ?? null;
};

export const selectClinic = (state: GameStore) => {
  const team = selectUserTeam(state);
  return team?.clinic ?? null;
};

export const selectCapInfo = (state: GameStore) => {
  const team = selectUserTeam(state);
  if (!team) return { capSpace: 0, capUsed: 0, deadCap: 0 };
  return { capSpace: team.capSpace, capUsed: team.capUsed, deadCap: team.deadCap };
};

export const selectSchedule = (state: GameStore) => state.game?.schedule ?? [];

export const selectNarrative = (state: GameStore) => state.game?.narrativeState ?? null;
export const selectLatestSummary = (state: GameStore): WeeklySummary | null => state.game?.weekSummaries.at(-1) ?? null;
export const selectPlayoffBracket = (state: GameStore) => state.game?.playoffBracket ?? null;

// ── Store ──────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    game: null,
    initialized: false,

    actions: {
      newGame: async (initial) => {
        set((s) => {
          s.game = initial;
          s.initialized = true;
        });
        await autosaveDynasty(initial);
      },

      loadGame: (loaded) =>
        set((s) => {
          s.game = loaded;
          s.initialized = true;
        }),

      loadLatestAutosave: async () => {
        const latest = await loadLatestAutosaveGame();
        if (!latest) return false;

        set((s) => {
          s.game = latest;
          s.initialized = true;
        });
        return true;
      },

      cutPlayer: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;

          const idx = team.roster.findIndex((p) => p.id === playerId);
          if (idx === -1) return;

          const player = team.roster[idx]!;

          // Calculate dead money if player has a contract
          if (player.contract) {
            const dead = calcDeadMoney(player.contract);
            team.deadCap += dead;
            team.capUsed -= calcCapHit(player.contract) - dead;
            team.capSpace = getSalaryCap(s.game.year) - team.capUsed;
          }

          // Remove from roster, add to free agents
          team.roster.splice(idx, 1);
          player.teamId = null;
          player.contract = null;
          s.game.freeAgents.push(playerId);
        }),

      toggleTradeBlock: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (player) player.tradeBlock = !player.tradeBlock;
        }),

      setStarter: (teamId, playerId, isStarter) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (player) player.isStarter = isStarter;
        }),

      restructure: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (!player?.contract) return;

          // restructureContract takes { contract } wrapper
          const result = restructureContract({ contract: player.contract });
          if (result.ok) {
            // The engine mutates the contract in-place; update cap numbers
            team.capUsed -= result.savings;
            team.capSpace += result.savings;
          }
        }),

      backload: (teamId, playerId, voidYears = 2) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (!player?.contract) return;

          const result = backloadContract({ contract: player.contract }, voidYears);
          if (result.ok) {
            team.capUsed -= result.savings;
            team.capSpace += result.savings;
          }
        }),

      advanceWeek: async () => {
        const current = get().game;
        if (!current) return null;

        const result = await runAdvanceWeek(current);
        const nextGame = result.nextState;
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;

        if (userTeam) {
          updateSystemFit(userTeam);
        }

        set((s) => {
          s.game = nextGame;
          s.initialized = true;
        });
        await autosaveDynasty(nextGame);

        return nextGame.weekSummaries.at(-1) ?? null;
      },

      refreshOwner: (teamId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;

          const result = updateOwnerApproval(
            team.owner as unknown as import('@mfd/engine').OwnerState,
            team as unknown as Team,
            { year: s.game.year, week: s.game.week, phase: s.game.phase },
          );
          team.owner.approval = result.approval;
          team.owner.history.push({
            year: s.game.year,
            week: s.game.week,
            approval: result.approval,
            delta: result.delta,
          });
        }),

      addClinicXP: (teamId, track, amount) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const result = earnXP(team.clinic, track, amount);
          team.clinic = result;
        }),

      setPhase: (phase) =>
        set((s) => {
          if (!s.game) return;
          s.game.phase = phase;
        }),
    },
  })),
);
