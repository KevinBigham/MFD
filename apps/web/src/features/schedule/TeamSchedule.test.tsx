import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeamSchedule } from './TeamSchedule';

const mockState = {
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
  },
  week: 14,
  teamSchedule: [
    {
      week: 14,
      opponentTeamId: 'team-2',
      opponentName: 'Austin Armadillos',
      home: true,
      result: null,
      recordAfterGame: null,
      bye: false,
      primetime: true,
      flexed: true,
      broadcastNetwork: 'MFN',
    },
    {
      week: 19,
      opponentTeamId: null,
      opponentName: 'BYE',
      home: false,
      result: null,
      recordAfterGame: '9-4',
      bye: true,
      primetime: false,
      flexed: false,
      broadcastNetwork: null,
    },
  ],
  weekSchedule: [
    {
      week: 14,
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeTeamName: 'Chicago Blaze',
      awayTeamName: 'Austin Armadillos',
      result: null,
      broadcastNetwork: 'MFN',
      primetime: true,
      flexed: true,
      compellingScore: 88,
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectWeek: (state: typeof mockState) => state.week,
  selectTeamSchedule: (state: typeof mockState) => state.teamSchedule,
  selectWeekSchedule: () => (state: typeof mockState) => state.weekSchedule,
}));

describe('TeamSchedule', () => {
  it('renders the full team schedule plus the weekly league slate', () => {
    const markup = renderToStaticMarkup(<TeamSchedule />);

    expect(markup).toContain('SCHEDULE');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('MFN');
    expect(markup).toContain('FLEXED');
    expect(markup).toContain('Primetime');
    expect(markup).toContain('BYE');
    expect(markup).toContain('full 19-week slate');
    expect(markup).toContain('Week 19');
    expect(markup).toContain('LEAGUE SLATE');
  });

  it('labels schedule sources and the display-only boundary', () => {
    const markup = renderToStaticMarkup(<TeamSchedule />);

    expect(markup).toContain('SCHEDULE SOURCES');
    expect(markup).toContain('selectTeamSchedule reads the saved user-team schedule across 19 weeks');
    expect(markup).toContain('W14 // 1 games');
    expect(markup).toContain('1 prime / 1 flex');
    expect(markup).toContain('0 final / 1 byes');
    expect(markup).toContain('selectWeekSchedule(selectedWeek) projects saved ScheduledGame rows');
    expect(markup).toContain('Opening Schedule does not generate a schedule, assign broadcasts, flex games, weather, results');
  });
});
