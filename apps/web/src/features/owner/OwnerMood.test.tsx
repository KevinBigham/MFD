import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  game: {
    week: 10,
    year: 2026,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Green Bay',
        name: 'Packers',
        abbr: 'GB',
        wins: 7,
        losses: 3,
        ownerId: 'owner-1',
        capSpace: 22,
        roster: [],
        staff: { hc: null },
        owner: {
          approval: 75,
          label: 'Win-Now',
          history: [
            { approval: 70 },
            { approval: 72 },
            { approval: 75 },
          ],
        },
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
      },
    },
    userTeamId: 'team-1',
    owners: {
      'owner-1': {
        id: 'owner-1',
        name: 'Mark Murphy',
        patience: 65,
      },
    },
    weekSummaries: [
      {
        headline: 'Packers cruise to comfortable victory',
        ownerDelta: 3,
      },
    ],
    players: {},
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectOwnerState: (state: typeof mockState) => state.game.teams['team-1'].owner,
  selectLatestSummary: (state: typeof mockState) => state.game.weekSummaries[state.game.weekSummaries.length - 1] ?? null,
  selectOwners: (state: typeof mockState) => state.game.owners,
}));

describe('OwnerMood', () => {
  it('renders screen header with Owner Relations title', async () => {
    const { OwnerMood } = await import('./OwnerMood');
    const markup = renderToStaticMarkup(<OwnerMood />);

    expect(markup).toContain('OWNER RELATIONS');
    expect(markup).toContain('Mark Murphy');
  });

  it('renders owner approval metric', async () => {
    const { OwnerMood } = await import('./OwnerMood');
    const markup = renderToStaticMarkup(<OwnerMood />);

    expect(markup).toContain('APPROVAL');
    expect(markup).toContain('75');
    expect(markup).toContain('PATIENCE');
    expect(markup).toContain('CONFIDENCE');
    expect(markup).toContain('PATIENT');
  });
});
