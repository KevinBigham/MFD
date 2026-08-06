/**
 * WP-09a — the ledger's inputs, extracted from `MondayBriefing.tsx`.
 *
 * Before this, the six values that drive the weekly board were computed inline
 * in a 1,987-line component, which is why nav badges, Chip, and the Action
 * Center could each answer "what should I do next?" differently. They are all
 * derived here now, from existing store selectors — no new derivation, no
 * duplicated game rules.
 *
 * Reads `state.game` only. It is typed against the store rather than a bare
 * `GameState` because the selectors it composes are, but nothing here depends
 * on store internals, so it runs on any `{ game }`.
 */

import {
  selectCurrentWeeklyPrepPlan,
  selectOwnerState,
  selectRoster,
  selectTradeOffers,
  type GameStoreState,
} from '../../app/store/selectors';
import { FIELD_STARTER_TARGET, type TaskLedgerInput } from './task-ledger';

/** Owner approval when a team has no owner state yet — full patience, nothing to flag. */
export const DEFAULT_OWNER_APPROVAL = 100;

export type TaskLedgerSource = Pick<GameStoreState, 'game'>;

const EMPTY_INPUT: TaskLedgerInput = {
  phase: 'preseason',
  hasGamePlan: false,
  starterCount: FIELD_STARTER_TARGET,
  tradeOfferCount: 0,
  ownerApproval: DEFAULT_OWNER_APPROVAL,
  injuredCount: 0,
};

export function selectTaskLedgerInput(source: TaskLedgerSource): TaskLedgerInput {
  if (!source.game) return { ...EMPTY_INPUT };

  const state = source as GameStoreState;
  const roster = selectRoster(state);

  return {
    phase: source.game.phase,
    hasGamePlan: selectCurrentWeeklyPrepPlan(state) !== null,
    starterCount: roster.filter((player) => player.isStarter).length,
    tradeOfferCount: selectTradeOffers(state).length,
    ownerApproval: selectOwnerState(state)?.approval ?? DEFAULT_OWNER_APPROVAL,
    injuredCount: roster.filter((player) => player.injury).length,
  };
}
