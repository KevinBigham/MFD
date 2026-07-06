import { describe, expect, it } from 'vitest';
import { buildBidCounterfactual, type BidCounterfactualInput } from './fa-counterfactuals';

function contenderRoster() {
  return [
    { id: 'qb-1', name: 'Mason Pike', pos: 'QB', age: 34, ovr: 88, isStarter: true },
    { id: 'wr-1', name: 'Ari Knox', pos: 'WR', age: 31, ovr: 84, isStarter: true },
    { id: 'wr-2', name: 'Nico Bell', pos: 'WR', age: 30, ovr: 80, isStarter: true },
    { id: 'te-1', name: 'Cal Reed', pos: 'TE', age: 30, ovr: 79, isStarter: true },
    { id: 'ol-1', name: 'Jules Ward', pos: 'OL', age: 32, ovr: 82, isStarter: true },
    { id: 'dl-1', name: 'Owen Frost', pos: 'DL', age: 29, ovr: 78, isStarter: true },
  ];
}

function winnerTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'den',
    city: 'Denver',
    name: 'Peak',
    roster: contenderRoster(),
    draftPicks: [
      { round: 1, year: 2031, currentTeamId: 'den' },
      { round: 3, year: 2031, currentTeamId: 'den' },
      { round: 4, year: 2032, currentTeamId: 'den' },
    ],
    capSpace: 38,
    capUsed: 212,
    deadCap: 5,
    gmStrategy: 'win_now',
    philosophy: 'maintain',
    wins: 0,
    losses: 0,
    ties: 0,
    ...overrides,
  } as any;
}

function lostInput(overrides: Partial<BidCounterfactualInput> = {}): BidCounterfactualInput {
  const bids = [
    {
      playerId: 'fa-wr',
      teamId: 'chi',
      round: 2,
      years: 3,
      salary: 18,
      signingBonus: 5,
      guaranteed: 30,
      score: 82.4,
      status: 'lost' as const,
    },
    {
      playerId: 'fa-wr',
      teamId: 'den',
      round: 2,
      years: 4,
      salary: 21.5,
      signingBonus: 8,
      guaranteed: 44,
      score: 91.8,
      status: 'won' as const,
    },
  ];

  return {
    playerName: 'Drew Vale',
    bids,
    userTeamId: 'chi',
    winningTeam: winnerTeam(),
    currentYear: 2030,
    franchiseHistory: [] as any,
    ...overrides,
  };
}

describe('buildBidCounterfactual', () => {
  it('explains a saved lost bid with winner, window, cap, posture, and user comparison receipts', () => {
    const result = buildBidCounterfactual(lostInput());

    expect(result).toEqual({
      winnerLine: 'Denver Peak won Drew Vale at $21.5M in Round 2.',
      whyDrivers: [
        {
          label: 'Competitive window',
          detail: 'ALL_IN window (clear): QB 34, 5 starters 30+, core 82 OVR.',
          sourceRef: 'team:den:roster',
        },
        {
          label: 'Cap space',
          detail: "$38M cap space was saved on Denver Peak's team sheet.",
          sourceRef: 'team:den:cap',
        },
        {
          label: 'GM posture',
          detail: 'WIN_NOW GM posture and MAINTAIN philosophy were saved on the winning team.',
          sourceRef: 'team:den:gmStrategy',
        },
      ],
      userComparisonLine: 'You offered $18M ($3.5M less per year). Saved bid score: you 82.4, Denver Peak 91.8.',
      sourceRefs: [
        'offseasonState.freeAgencyBids:fa-wr:round:2',
        'team:den:roster',
        'team:den:cap',
        'team:den:gmStrategy',
      ],
    });
  });

  it('returns null for a saved user win because there is no losing counterfactual to explain', () => {
    const result = buildBidCounterfactual(lostInput({
      userTeamId: 'den',
      userBid: {
        playerId: 'fa-wr',
        teamId: 'den',
        round: 2,
        salary: 21.5,
        score: 91.8,
        status: 'won',
      },
    }));

    expect(result).toBeNull();
  });

  it('explains a CPU-only saved signing without inventing a user comparison line', () => {
    const result = buildBidCounterfactual(lostInput({
      userTeamId: 'chi',
      userBid: null,
      bids: [
        {
          playerId: 'fa-wr',
          teamId: 'den',
          round: 2,
          years: 4,
          salary: 21.5,
          signingBonus: 8,
          guaranteed: 44,
          score: 91.8,
          status: 'won',
        },
      ],
    }));

    expect(result?.winnerLine).toBe('Denver Peak won Drew Vale at $21.5M in Round 2.');
    expect(result?.userComparisonLine).toBeNull();
    expect(result?.whyDrivers).toHaveLength(3);
  });

  it('returns null for older saves missing the winning team or durable winning amount', () => {
    expect(buildBidCounterfactual(lostInput({ winningTeam: null }))).toBeNull();
    expect(buildBidCounterfactual(lostInput({
      bids: [{ playerId: 'fa-wr', teamId: 'den', round: 2, status: 'won' }],
    }))).toBeNull();
    expect(buildBidCounterfactual(lostInput({
      bids: [{ playerId: 'fa-wr', teamId: 'den', round: 2, salary: 21.5, status: 'lost' }],
    }))).toBeNull();
  });

  it('is deterministic and caps why drivers at three', () => {
    const first = buildBidCounterfactual(lostInput());
    const second = buildBidCounterfactual(lostInput());

    expect(second).toEqual(first);
    expect(first?.whyDrivers.length).toBeLessThanOrEqual(3);
  });
});
