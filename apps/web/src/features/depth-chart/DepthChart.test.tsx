import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DepthChart, getFormationStarterReadout } from './DepthChart';

const mockState = {
  roster: [
    {
      id: 'qb-1',
      name: 'Jay Stone',
      firstName: 'Jay',
      lastName: 'Stone',
      pos: 'QB',
      ovr: 88,
      pot: 92,
      age: 25,
      systemFit: 81,
      isStarter: true,
      injury: null,
    },
    {
      id: 'qb-2',
      name: 'Rick Mason',
      firstName: 'Rick',
      lastName: 'Mason',
      pos: 'QB',
      ovr: 77,
      pot: 80,
      age: 28,
      systemFit: 67,
      isStarter: false,
      injury: null,
    },
    {
      id: 'dl-1',
      name: 'Ace Bolt',
      firstName: 'Ace',
      lastName: 'Bolt',
      pos: 'DL',
      ovr: 82,
      pot: 84,
      age: 26,
      systemFit: 75,
      isStarter: true,
      injury: null,
    },
    {
      id: 'wr-1',
      name: 'Milo Dash',
      firstName: 'Milo',
      lastName: 'Dash',
      pos: 'WR',
      ovr: 79,
      pot: 84,
      age: 23,
      systemFit: 78,
      isStarter: false,
      injury: null,
      ratings: {
        speed: 91,
        awareness: 72,
      },
    },
  ],
  actions: {
    setStarter: () => Promise.resolve(),
    assignKickReturner: () => Promise.resolve(),
    assignPuntReturner: () => Promise.resolve(),
  },
  specialTeams: {
    kickReturner: 'wr-1',
    puntReturner: null,
    longSnapper: null,
    kickCoverageUnit: [],
    puntCoverageUnit: [],
  },
};

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    detectPositionBattles: () => [],
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState & { teamId: string | null }) => unknown) => selector({
    ...mockState,
    teamId: 'user-team',
  }),
  selectRoster: (state: typeof mockState) => state.roster,
  selectSpecialTeams: (state: typeof mockState) => state.specialTeams,
  selectUserTeamId: (state: typeof mockState & { teamId: string | null }) => state.teamId,
}));

describe('DepthChart accessibility', () => {
  it('renders position cards as native buttons for keyboard accessibility', () => {
    const markup = renderToStaticMarkup(<DepthChart />);

    expect(markup).toContain('DEPTH CHART');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Set legal starter shape');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('SPECIAL TEAMS');
  });

  it('keeps the room card as the only interactive control in each slot preview', () => {
    const markup = renderToStaticMarkup(<DepthChart />);

    expect(markup).toContain('Jay Stone');
    expect(markup).not.toContain('title="Open Jay Stone"');
  });

  it('renders source copy for starter flags and saved special-teams state', () => {
    const markup = renderToStaticMarkup(<DepthChart />);

    expect(markup).toContain('DEPTH CHART SOURCES');
    expect(markup).toContain('Room cards show the active roster');
    expect(markup).toContain('Starter shape');
    expect(markup).toContain('23 open / 0 extra');
    expect(markup).toContain('engine starter shape by position');
    expect(markup).toContain('Open rooms: RB -1');
    expect(markup).toContain('1/2 returners');
    expect(markup).toContain('Dropdowns are the only returner commits here');
    expect(markup).toContain('Opening Depth Chart does not auto-set starters');
  });

  it('requires the starter shape by position instead of accepting any 22 flags', () => {
    const overloadedRoster = [
      ...Array.from({ length: 22 }, (_, index) => ({
        ...mockState.roster[0],
        id: `qb-${index}`,
        name: `Quarterback ${index}`,
        pos: 'QB' as const,
        isStarter: true,
      })),
      {
        ...mockState.roster[2],
        id: 'dl-extra',
        isStarter: false,
      },
    ];

    const readout = getFormationStarterReadout(overloadedRoster as any);

    expect(readout.marked).toBe(22);
    expect(readout.complete).toBe(false);
    expect(readout.extra).toBe(21);
    expect(readout.openRooms.some((room) => room.position === 'OL' && room.missing === 5)).toBe(true);
  });
});
