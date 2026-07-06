import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findTradeTargets, type TradeSuggestion } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { selectLeagueTradeBlock, type GameStoreState } from './selectors';

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    findTradeTargets: vi.fn(),
  };
});

function buildState(game = createSeedGameState(42, 0, 'pro')): GameStoreState {
  return {
    game,
    initialized: true,
    undoSnapshot: null,
    undoLabel: null,
    recapPromptSeenThisSession: false,
    pendingPlayoffLoreReveal: null,
  };
}

describe('selectLeagueTradeBlock', () => {
  beforeEach(() => {
    vi.mocked(findTradeTargets).mockReset();
  });

  it('carries saved CPU strategy and philosophy into advisory trade-block entries', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const cpuTeams = Object.values(game.teams).filter((team) => !team.isUser);
    const seller = cpuTeams[0];
    const seeker = cpuTeams[1];
    if (!seller || !seeker) throw new Error('Expected seed game to include at least two CPU teams.');
    const target = seller.roster[0];
    if (!target) throw new Error('Expected seller to include a roster player.');

    seller.gmStrategy = 'rebuild';
    seller.philosophy = 'fire_sale';
    target.tradeBlock = true;
    game.players[target.id] = target;

    const suggestion: TradeSuggestion = {
      partner: seller.id,
      offer: {
        offering: [],
        requesting: [{
          type: 'player',
          teamId: seller.id,
          playerId: target.id,
          pickId: null,
          description: target.name,
        }],
        type: 'player_for_player',
      },
      reasoning: 'Seller is listening.',
      valueGap: 1.2,
      acceptanceLikelihood: 0.91,
      need: target.pos,
    };
    vi.mocked(findTradeTargets).mockImplementation((_state, teamId) =>
      teamId === seeker.id ? [suggestion] : []);

    const entries = selectLeagueTradeBlock(buildState(game));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      teamId: seller.id,
      teamGmStrategy: 'rebuild',
      teamPhilosophy: 'fire_sale',
      playerId: target.id,
      seekerTeamId: seeker.id,
    });
  });
});
