import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Player } from '@mfd/engine';
import { getPlayerComparables } from '@mfd/engine';
import { ComparePlayersModal, closeComparePlayers } from './ComparePlayersModal';

function contract(playerId: string, years: number, baseSalary: number, prorated: number): NonNullable<Player['contract']> {
  return {
    playerId,
    teamId: 'team-1',
    years,
    totalValue: baseSalary * years,
    yearlyBreakdown: [],
    baseSalary,
    guaranteed: baseSalary,
    signingBonus: prorated * years,
    prorated,
    originalYears: years,
    voidYears: 0,
    restructured: false,
    franchiseTag: null,
    incentives: [],
  };
}

function player(id: string, name: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: name.split(' ')[0] ?? name,
    lastName: name.split(' ')[1] ?? 'Player',
    name,
    pos: 'QB',
    age: 27,
    ovr: 86,
    pot: 89,
    ratings: {},
    devTrait: 'star',
    personality: { ambition: 7, loyalty: 6, temperament: 6, workEthic: 7, pressure: 7 },
    traits: ['captain', 'mentor'],
    archetype: { archetype: 'pocket_passer', label: 'Pocket Passer', description: 'Wins from structure.' },
    contract: contract(id, 3, 18, 2),
    teamId: 'team-1',
    draftYear: 2024,
    draftRound: 1,
    draftPick: 4,
    college: 'MFD State',
    yearsExp: 4,
    careerStats: { seasons: 4 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 72,
    chemistry: 75,
    systemFit: 84,
    cliqueId: null,
    jerseyNumber: 12,
    endorsements: [],
    isStarter: true,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: { gamesPlayed: 0 },
    ...overrides,
  } as unknown as Player;
}

const left = player('left-qb', 'Jay Stone', {
  traits: ['captain', 'mentor', 'media_darling'],
  ovr: 90,
  age: 28,
});
const right = player('right-qb', 'Cole Hart', {
  id: 'right-qb',
  name: 'Cole Hart',
  firstName: 'Cole',
  lastName: 'Hart',
  traits: ['captain', 'hothead'],
  ovr: 84,
  age: 25,
  contract: contract('right-qb', 1, 7, 1),
});
const comparable = player('comp-qb', 'Dak West', { ovr: 82, age: 26, traits: ['mentor'] });

let mockGame = {
  players: {
    [left.id]: left,
    [right.id]: right,
    [comparable.id]: comparable,
  },
};

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    getPlayerComparables: vi.fn(() => [right, comparable]),
    getPlayerProjection: vi.fn((nextPlayer: Player) => ({
      currentOvr: nextPlayer.ovr,
      nextYearOvr: nextPlayer.ovr + 1,
      primeWindow: [26, 32],
      risk: nextPlayer.age > 30 ? 'decline' : 'stable',
    })),
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { game: typeof mockGame }) => unknown) => selector({ game: mockGame }),
}));

describe('ComparePlayersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGame = {
      players: {
        [left.id]: left,
        [right.id]: right,
        [comparable.id]: comparable,
      },
    };
  });

  it('renders both selected players side by side', () => {
    const markup = renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId={left.id} rightPlayerId={right.id} onOpenChange={() => undefined} />,
    );

    expect(markup).toContain('COMPARE PLAYERS');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('Cole Hart');
    expect(markup).toContain('OVR 90');
    expect(markup).toContain('OVR 84');
  });

  it('renders a missing-player state without throwing', () => {
    const markup = renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId="missing-prospect" rightPlayerId={right.id} onOpenChange={() => undefined} />,
    );

    expect(markup).toContain('Comparison unavailable.');
    expect(markup).toContain('missing-prospect');
  });

  it('renders comparable suggestions for the left player', () => {
    const markup = renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId={left.id} onOpenChange={() => undefined} />,
    );

    expect(markup).toContain('SIMILAR PLAYERS');
    expect(markup).toContain('Dak West');
  });

  it('close helper calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn();

    closeComparePlayers(onOpenChange);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('highlights shared and one-sided traits', () => {
    const markup = renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId={left.id} rightPlayerId={right.id} onOpenChange={() => undefined} />,
    );

    expect(markup).toContain('captain // shared');
    expect(markup).toContain('media darling // Jay Stone only');
    expect(markup).toContain('hothead // Cole Hart only');
  });

  it('renders contract columns', () => {
    const markup = renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId={left.id} rightPlayerId={right.id} onOpenChange={() => undefined} />,
    );

    expect(markup).toContain('3 yr');
    expect(markup).toContain('$20M cap');
    expect(markup).toContain('1 yr');
    expect(markup).toContain('$8M cap');
  });

  it('calls getPlayerComparables once when open', () => {
    renderToStaticMarkup(
      <ComparePlayersModal open leftPlayerId={left.id} rightPlayerId={right.id} onOpenChange={() => undefined} />,
    );

    expect(getPlayerComparables).toHaveBeenCalledTimes(1);
  });
});
