import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import {
  EXPANSION_MIN_YEAR,
  PROTECT_LIMIT,
  finalizeExpansionDraft,
  getExpansionTeamNeeds,
  initializeExpansionDraft,
  makeExpansionPick,
  protectPlayers,
  shouldTriggerExpansion,
} from './expansion-draft';
import { makeLeagueState, makePlayer } from './test-helpers';

function buildExpansionReadyGame() {
  const game = makeLeagueState('offseason', 1);
  game.year = 2036;

  for (const team of Object.values(game.teams)) {
    while (team.roster.length < 18) {
      const player = makePlayer(`${team.id}-extra-${team.roster.length}`, team.id, team.roster.length % 2 === 0 ? 'WR' : 'CB', 50 + team.roster.length, false);
      team.roster.push(player);
      game.players[player.id] = player;
    }
    team.roster.sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
  }

  return game;
}

describe('expansion draft', () => {
  it('only triggers after the minimum season threshold and remains deterministic', () => {
    const early = buildExpansionReadyGame();
    early.year = INAUGURAL_YEAR + EXPANSION_MIN_YEAR - 1;
    const ready = buildExpansionReadyGame();

    expect(shouldTriggerExpansion(early, mulberry32(1))).toBe(false);
    expect(shouldTriggerExpansion(ready, mulberry32(2))).toBe(shouldTriggerExpansion(ready, mulberry32(2)));
  });

  it('has ai teams protect their top 15 players by overall', () => {
    const game = buildExpansionReadyGame();
    const state = initializeExpansionDraft(game, mulberry32(11));

    for (const team of Object.values(game.teams).filter((entry) => !entry.isUser)) {
      const expected = [...team.roster]
        .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
        .slice(0, PROTECT_LIMIT)
        .map((player) => player.id);
      expect(state.protectedPlayers[team.id]).toEqual(expected);
    }
  });

  it('does not allow protecting more than 15 players', () => {
    const game = buildExpansionReadyGame();
    const state = initializeExpansionDraft(game, mulberry32(11));
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const tooMany = userTeam.roster.slice(0, PROTECT_LIMIT + 1).map((player) => player.id);

    expect(() => protectPlayers(state, userTeam.id, tooMany)).toThrow(/15/i);
  });

  it('drafts only from the unprotected pool', () => {
    const game = buildExpansionReadyGame();
    const state = initializeExpansionDraft(game, mulberry32(11));
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const protectedState = protectPlayers(state, userTeam.id, userTeam.roster.slice(0, PROTECT_LIMIT).map((player) => player.id));
    const target = protectedState.availablePlayers[0]!;

    const next = makeExpansionPick(protectedState, target.id);

    expect(next.selectedPlayers.map((player) => player.id)).toContain(target.id);
    expect(next.availablePlayers.map((player) => player.id)).not.toContain(target.id);
    expect(Object.values(next.protectedPlayers).flat()).not.toContain(target.id);
  });

  it('tracks positional needs so missing positions are visible', () => {
    const needs = getExpansionTeamNeeds([
      makePlayer('qb-1', null, 'QB', 70),
      makePlayer('wr-1', null, 'WR', 68),
    ]);

    expect(needs.QB).toBe(0);
    expect(needs.RB).toBeGreaterThan(0);
    expect(needs.OL).toBeGreaterThan(0);
  });

  it('finalizes expansion by creating a new team and regenerating the schedule', () => {
    const game = buildExpansionReadyGame();
    const initialTeamCount = Object.keys(game.teams).length;
    let state = initializeExpansionDraft(game, mulberry32(17));
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    state = protectPlayers(state, userTeam.id, userTeam.roster.slice(0, PROTECT_LIMIT).map((player) => player.id));
    while (state.picksRemaining > 0 && state.availablePlayers.length > 0) {
      state = makeExpansionPick(state, state.availablePlayers[0]!.id);
    }

    const finalized = finalizeExpansionDraft(game, state, mulberry32(17));

    expect(Object.keys(finalized.teams)).toHaveLength(initialTeamCount + 1);
    expect(finalized.expansionDraftState).toBeUndefined();
    expect(finalized.schedule).toHaveLength(18);
    expect(Object.values(finalized.teams).some((team) => team.city === state.expansionTeam.city && team.name === state.expansionTeam.name)).toBe(true);
  });

  it('builds deterministic draft state from the same seed', () => {
    const game = buildExpansionReadyGame();

    expect(initializeExpansionDraft(game, mulberry32(29))).toEqual(
      initializeExpansionDraft(game, mulberry32(29)),
    );
  });
});

const INAUGURAL_YEAR = 2026;
