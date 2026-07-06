import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LockerRoom, LockerRoomActionReceiptPanel } from './LockerRoom';

const baseState = () => ({
  team: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    streak: -3,
    roster: [
      { id: 'p1', name: 'Marcus Cole', pos: 'QB', ovr: 92, yearsExp: 9, age: 33, holdout: false, traits: ['vocal_leader'], cliqueId: 2 },
      { id: 'p2', name: 'Grant Hale', pos: 'LB', ovr: 83, yearsExp: 8, age: 31, holdout: false, traits: ['captain'], cliqueId: 0 },
      { id: 'p3', name: 'Jay Mercer', pos: 'WR', ovr: 78, yearsExp: 2, age: 23, holdout: false, traits: [], cliqueId: 1 },
    ],
    isUser: true,
  },
  lockerRoom: {
    cliques: [
      { id: 0, label: 'Vets', playerIds: ['p2'], cohesion: 68, influence: 54 },
      { id: 1, label: 'Young Core', playerIds: ['p3'], cohesion: 72, influence: 46 },
      { id: 2, label: 'Stars', playerIds: ['p1'], cohesion: 80, influence: 66 },
    ],
    captains: [
      { playerId: 'p1', playerName: 'Marcus Cole', captainMoments: 2, rallyCooldown: 0, perks: ['rally_cry', 'media_shield'] },
    ],
    culture: 'strong',
    cultureScore: 77,
    tensions: [
      { id: 'ten-1', type: 'clique_beef', involvedPlayerIds: ['p1', 'p2'], involvedCliqueIds: [2, 0], severity: 'moderate', weekCreated: 5, resolved: false, narrative: 'Cole and Hale are jawing through the week.' },
    ],
    lastMeetingWeek: 2,
  },
  week: 6,
  actions: {
    callTeamMeeting: () => Promise.resolve(),
    triggerCaptainRally: () => Promise.resolve(),
    electCaptain: () => Promise.resolve(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
  selectLockerRoom: (state: typeof mockState) => state.lockerRoom,
  selectWeek: (state: typeof mockState) => state.week,
}));

describe('LockerRoom', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the locker room header and culture badges', () => {
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('LOCKER ROOM');
    expect(markup).toContain('STRONG');
    expect(markup).toContain('1 ACTIVE TENSIONS');
  });

  it('renders clique cards and member names', () => {
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('VETS');
    expect(markup).toContain('YOUNG CORE');
    expect(markup).toContain('STARS');
    expect(markup).toContain('Marcus Cole');
    expect(markup).toContain('Jay Mercer');
  });

  it('shows captain perks and rally availability', () => {
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('rally cry');
    expect(markup).toContain('Trigger Rally');
  });

  it('renders source copy for saved locker-room state and action boundaries', () => {
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('LOCKER ROOM SOURCES');
    expect(markup).toContain('selectLockerRoom reads saved team.lockerRoom');
    expect(markup).toContain('may return an on-screen confirmation');
    expect(markup).toContain('captain buttons elect captains');
    expect(markup).toContain('eligibleBench is route-local roster guidance');
    expect(markup).toContain('CAPTAIN_PERK_EFFECTS');
    expect(markup).toContain('Opening Locker Room does not tick weekly culture');
  });

  it('renders action receipts returned by committed locker-room actions', () => {
    const markup = renderToStaticMarkup(
      <LockerRoomActionReceiptPanel
        receipt={{
          kind: 'meeting',
          title: 'Team Meeting Receipt',
          detail: 'The captains cooled off one tension.',
          source: 'callTeamMeeting committed saved team.lockerRoom through the store; this confirmation appears here only.',
        }}
      />,
    );

    expect(markup).toContain('TEAM MEETING RECEIPT');
    expect(markup).toContain('Meeting');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('The captains cooled off one tension.');
    expect(markup).toContain('appears here only');
  });

  it('shows the meeting cooldown when a meeting is still locked', () => {
    mockState.week = 4;
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('Cooldown 2w');
  });

  it('renders the quiet-room fallback when no tensions are active', () => {
    mockState.lockerRoom.tensions = [];
    const markup = renderToStaticMarkup(<LockerRoom />);
    expect(markup).toContain('No active tensions');
  });
});
