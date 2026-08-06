import { describe, expect, it } from 'vitest';
import { UI_FIXTURE_IDS, buildUiFixture } from '../test/fixtures/ui-overhaul-fixtures';
import { DEFAULT_OWNER_APPROVAL, selectTaskLedgerInput } from './task-ledger-input';
import { FIELD_STARTER_TARGET, buildTaskLedger } from './task-ledger';

describe('selectTaskLedgerInput', () => {
  it('returns a safe, quiet input when there is no game', () => {
    const input = selectTaskLedgerInput({ game: null });

    expect(input).toEqual({
      phase: 'preseason',
      hasGamePlan: false,
      starterCount: FIELD_STARTER_TARGET,
      tradeOfferCount: 0,
      ownerApproval: DEFAULT_OWNER_APPROVAL,
      injuredCount: 0,
    });
    // A missing game must not manufacture work for the player.
    expect(buildTaskLedger(input).map((task) => task.id)).toEqual(['ready-to-advance']);
  });

  it('derives every field from the game across the lifecycle fixtures', () => {
    for (const id of UI_FIXTURE_IDS) {
      const game = buildUiFixture(id);
      const input = selectTaskLedgerInput({ game });

      expect(input.phase, id).toBe(game.phase);
      expect(Number.isInteger(input.starterCount), id).toBe(true);
      expect(input.starterCount, id).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(input.injuredCount), id).toBe(true);
      expect(input.injuredCount, id).toBeGreaterThanOrEqual(0);
      expect(input.tradeOfferCount, id).toBeGreaterThanOrEqual(0);
      expect(input.ownerApproval, id).toBeGreaterThanOrEqual(0);
      expect(typeof input.hasGamePlan, id).toBe('boolean');
    }
  });

  it('reads the user team, not some other roster', () => {
    const game = buildUiFixture('regularSeasonWeek14');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    expect(selectTaskLedgerInput({ game })).toMatchObject({
      starterCount: userTeam.roster.filter((player) => player.isStarter).length,
      injuredCount: userTeam.roster.filter((player) => player.injury).length,
      ownerApproval: userTeam.owner?.approval ?? DEFAULT_OWNER_APPROVAL,
    });
  });

  it('falls back to full owner patience when a team has no owner state', () => {
    const game = buildUiFixture('newGame');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    delete (userTeam as { owner?: unknown }).owner;

    expect(selectTaskLedgerInput({ game }).ownerApproval).toBe(DEFAULT_OWNER_APPROVAL);
  });

  it('reports no saved plan for a fresh preseason game', () => {
    expect(selectTaskLedgerInput({ game: buildUiFixture('newGame') }).hasGamePlan).toBe(false);
  });

  it('is deterministic: the same fixture yields the same input twice', () => {
    for (const id of UI_FIXTURE_IDS) {
      const first = selectTaskLedgerInput({ game: buildUiFixture(id) });
      const second = selectTaskLedgerInput({ game: buildUiFixture(id) });

      expect(JSON.stringify(first), id).toBe(JSON.stringify(second));
    }
  });

  it('feeds a ledger whose tasks all point at covered routes, in every phase', () => {
    for (const id of UI_FIXTURE_IDS) {
      const tasks = buildTaskLedger(selectTaskLedgerInput({ game: buildUiFixture(id) }));

      expect(tasks.length, id).toBeGreaterThan(0);
      for (const task of tasks) {
        expect(task.destination.hub, `${id} / ${task.id}`).toBeDefined();
      }
    }
  });
});
