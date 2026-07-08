import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  game: {
    week: 10,
    year: 2026,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Chicago',
        name: 'City of Broad Shoulders Deep-Dish',
        abbr: 'CHI',
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
        headline: 'Deep-Dish cruise to comfortable victory',
        ownerDelta: 3,
      },
    ],
    players: {},
    frontOffice: {
      agmProfileId: 'marcus_webb',
      agmImpactLog: [{
        id: 'impact-1',
        year: 2026,
        week: 1,
        agmProfileId: 'marcus_webb',
        category: 'cap',
        summary: 'Marcus Webb tied the Day 1 cap plan to injury, extension, and trade money.',
      }],
    },
    ownerMandates: [{
      id: 'mandate-1',
      teamId: 'team-1',
      year: 2026,
      goalId: 'cap_health',
      label: 'Cap Health',
      description: 'Maintain healthy salary cap position.',
      slot: 'target',
      selectedIndex: 1,
      createdWeek: 1,
      createdByAGMProfileId: 'marcus_webb',
      status: 'active',
      progress: {
        value: 22,
        target: 20,
        percent: 88,
        label: '$22.0M cap space',
        detail: '$4.0M dead cap; target is $20M+ space and <= $10M dead.',
        status: 'on_track',
        agmNote: 'Marcus Webb compares cap space against injury, extension, and trade fixes before ownership judges the goal.',
      },
      evaluation: null,
    }],
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectOwnerState: (state: typeof mockState) => state.game.teams['team-1'].owner,
  selectLatestSummary: (state: typeof mockState) => state.game.weekSummaries[state.game.weekSummaries.length - 1] ?? null,
  selectOwners: (state: typeof mockState) => state.game.owners,
  selectOwnerMandates: (state: typeof mockState) => state.game.ownerMandates,
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

  it('renders durable AGM identity and mandate progress', async () => {
    const { OwnerMood } = await import('./OwnerMood');
    const markup = renderToStaticMarkup(<OwnerMood />);

    expect(markup).toContain('ASSISTANT GM IMPACT');
    expect(markup).toContain('MARCUS WEBB');
    expect(markup).toContain('CAP HEALTH');
    expect(markup).toContain('MAIN PROMISE');
    expect(markup).toContain('Approval plus patience');
    expect(markup).toContain('cap space against injury, extension, and trade fixes');
    expect(markup).not.toContain('FRONT OFFICE IDENTITY');
    expect(markup).not.toContain('Weighted trust score');
    expect(markup).not.toContain('owner-trust');
    expect(markup).not.toContain('cap space can cover');
  });

  it('explains owner-pressure source ownership without claiming extra writes', async () => {
    const { OwnerMood } = await import('./OwnerMood');
    const markup = renderToStaticMarkup(<OwnerMood />);

    expect(markup).toContain('OWNER PRESSURE SOURCES');
    expect(markup).toContain('Owner Goals read saved ownerMandates');
    expect(markup).toContain('owner_mandate mirrors follow mandate met/exceeded/missed status');
    expect(markup).toContain('consequences are not double-applied');
    expect(markup).toContain('Latest Reaction reads saved weekSummaries');
  });
});
