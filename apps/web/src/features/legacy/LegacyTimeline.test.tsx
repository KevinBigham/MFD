import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyRecordBook } from '@mfd/engine';
import { LegacyTimeline } from './LegacyTimeline';

const recordBook = createEmptyRecordBook();
recordBook.singleSeason.passYds = [{
  category: 'singleSeason',
  stat: 'passYds',
  value: 5114,
  teamId: 'user',
  teamName: 'Chicago Blaze',
  year: 2030,
  playerId: 'p1',
  playerName: 'Jay Stone',
}];

const mockState = {
  game: {
    year: 2031,
    teams: {
      user: {
        id: 'user',
        city: 'Chicago',
        name: 'Blaze',
        isUser: true,
        mentoringPairs: [{
          mentorId: 'mentor-1',
          mentorName: 'Rick Mason',
          menteeId: 'mentee-1',
          menteeName: 'Jay Stone',
          teamId: 'user',
          positionGroup: 'QB',
          year: 2031,
          bonus: 2,
        }],
      },
    },
    franchiseHistory: [
      {
        year: 2030,
        teamId: 'user',
        wins: 12,
        losses: 5,
        ties: 0,
        record: '12-5',
        pointDifferential: 84,
        playoffFinish: 'champion',
        majorEvents: ['Won the championship.', 'Shifted to contend.', 'Mentoring: Rick Mason -> Jay Stone (+2 OVR)'],
        awardsWon: ['MVP'],
        recordsBroken: ['Passing Yards: Jay Stone (5114)'],
      },
    ],
    playerArchive: [
      {
        playerId: 'p1',
        firstName: 'Jay',
        lastName: 'Stone',
        name: 'Jay Stone',
        positions: ['QB'],
        peakOvr: 91,
        peakYear: 2029,
        firstYear: 2026,
        lastYear: 2030,
        retirementYear: null,
        teamHistory: [{ teamId: 'user', firstYear: 2026, lastYear: 2030 }],
      },
    ],
    awardsHistory: [
      {
        year: 2030,
        ceremony: {
          headline: 'Jay Stone headlines awards night.',
          intro: 'A banner season.',
          blurbs: [],
        },
        awards: [
          {
            awardId: 'mvp',
            label: 'MVP',
            winnerId: 'p1',
            winnerName: 'Jay Stone',
            winnerTeamId: 'user',
            winnerTeam: 'Chicago Blaze',
            winnerPosition: 'QB',
            winnerStats: { passYds: 5114 },
            score: 98,
            runnersUp: [],
            narrative: 'He owned the season.',
          },
        ],
      },
    ],
    hallOfFame: [
      {
        playerId: 'hof-1',
        name: 'Legend One',
        position: 'QB',
        inductionYear: 2031,
        peakOvr: 94,
        careerYears: 12,
        score: 102,
        awards: { mvps: 2, allPros: 5, proBowls: 8, championships: 2 },
        highlights: ['Peak 94 OVR', '2 MVP'],
        teams: ['user'],
      },
    ],
    records: recordBook,
    ceremonies: [
      {
        id: 'cer-1',
        type: 'championship',
        year: 2030,
        headline: 'Chicago Blaze championship ceremony',
        description: 'Confetti fell over a title run.',
        highlights: [
          { label: 'Season Record', value: '12-5', playerIds: [] },
          { label: 'Super Bowl MVP', value: 'Jay Stone', playerIds: ['p1'] },
        ],
        mvp: 'p1',
      },
    ],
    dynastyTimeline: [
      {
        id: 'dyn-1',
        year: 2030,
        week: null,
        type: 'championship',
        headline: 'Won the championship.',
        importance: 'landmark',
        playerIds: ['p1'],
        teamIds: ['user'],
      },
      {
        id: 'dyn-2',
        year: 2030,
        week: 1,
        type: 'award',
        headline: 'Jay Stone wins MVP.',
        importance: 'major',
        playerIds: ['p1'],
        teamIds: ['user'],
      },
    ],
    achievements: [
      {
        id: 'dynasty:first_championship',
        title: 'First Championship',
        description: 'Win your first title.',
        category: 'dynasty',
        tier: 'bronze',
        condition: { type: 'championships', threshold: 1 },
        unlockedYear: 2030,
        unlockedWeek: 18,
        icon: 'trophy',
      },
    ],
    seasonReports: [
      {
        year: 2030,
        teamId: 'user',
        overallGrade: 'A+',
        sections: [
          {
            title: 'Season Overview',
            grade: 'A+',
            summary: 'Dominant championship run.',
            highlights: ['12-5 record', 'Won the title'],
            stats: { record: '12-5' },
          },
        ],
      },
    ],
  },
  awardsHistory: [
    {
      year: 2030,
      ceremony: {
        headline: 'Jay Stone headlines awards night.',
        intro: 'A banner season.',
        blurbs: [],
      },
      awards: [
        {
          awardId: 'mvp',
          label: 'MVP',
          winnerId: 'p1',
          winnerName: 'Jay Stone',
          winnerTeamId: 'user',
          winnerTeam: 'Chicago Blaze',
          winnerPosition: 'QB',
          winnerStats: { passYds: 5114 },
          score: 98,
          runnersUp: [],
          narrative: 'He owned the season.',
        },
      ],
    },
  ],
  hallOfFame: [
    {
      playerId: 'hof-1',
      name: 'Legend One',
      position: 'QB',
      inductionYear: 2031,
      peakOvr: 94,
      careerYears: 12,
      score: 102,
      awards: { mvps: 2, allPros: 5, proBowls: 8, championships: 2 },
      highlights: ['Peak 94 OVR', '2 MVP'],
      teams: ['user'],
    },
  ],
  records: recordBook,
  userMentoringPairs: [{
    mentorId: 'mentor-1',
    mentorName: 'Rick Mason',
    menteeId: 'mentee-1',
    menteeName: 'Jay Stone',
    teamId: 'user',
    positionGroup: 'QB',
    year: 2031,
    bonus: 2,
  }],
  historicalMentoring: [
    {
      id: '2030-0-0',
      year: 2030,
      summary: 'Rick Mason -> Jay Stone (+2 OVR)',
    },
  ],
  ceremonies: [
    {
      id: 'cer-1',
      type: 'championship',
      year: 2030,
      headline: 'Chicago Blaze championship ceremony',
      description: 'Confetti fell over a title run.',
      highlights: [
        { label: 'Season Record', value: '12-5', playerIds: [] },
        { label: 'Super Bowl MVP', value: 'Jay Stone', playerIds: ['p1'] },
      ],
      mvp: 'p1',
    },
  ],
  dynastyTimeline: [
    {
      id: 'dyn-1',
      year: 2030,
      week: null,
      type: 'championship',
      headline: 'Won the championship.',
      importance: 'landmark',
      playerIds: ['p1'],
      teamIds: ['user'],
    },
    {
      id: 'dyn-2',
      year: 2030,
      week: 1,
      type: 'award',
      headline: 'Jay Stone wins MVP.',
      importance: 'major',
      playerIds: ['p1'],
      teamIds: ['user'],
    },
  ],
  dynastyScore: 15,
  achievements: [
    {
      id: 'dynasty:first_championship',
      title: 'First Championship',
      description: 'Win your first title.',
      category: 'dynasty',
      tier: 'bronze',
      condition: { type: 'championships', threshold: 1 },
      unlockedYear: 2030,
      unlockedWeek: 18,
      icon: 'trophy',
    },
  ],
  seasonReports: [
    {
      year: 2030,
      teamId: 'user',
      overallGrade: 'A+',
      sections: [
        {
          title: 'Season Overview',
          grade: 'A+',
          summary: 'Dominant championship run.',
          highlights: ['12-5 record', 'Won the title'],
          stats: { record: '12-5' },
        },
      ],
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => Object.values(state.game.teams)[0],
  selectAwardsHistory: (state: typeof mockState) => state.awardsHistory,
  selectCeremonies: (state: typeof mockState) => state.ceremonies,
  selectDynastyScore: (state: typeof mockState) => state.dynastyScore,
  selectDynastyTimeline: (state: typeof mockState) => state.dynastyTimeline,
  selectHallOfFame: (state: typeof mockState) => state.hallOfFame,
  selectRecords: (state: typeof mockState) => state.records,
  selectSeasonReports: (state: typeof mockState) => state.seasonReports,
  selectUserMentoringPairs: (state: typeof mockState) => state.userMentoringPairs,
  selectHistoricalMentoringChains: (state: typeof mockState) => state.historicalMentoring,
  selectAchievements: (state: typeof mockState) => state.achievements,
}));

describe('LegacyTimeline', () => {
  it('renders season history plus awards, hall of fame, records, and mentoring sections', () => {
    const markup = renderToStaticMarkup(<LegacyTimeline />);

    expect(markup).toContain('DYNASTY LEGACY');
    expect(markup).toContain('12-5');
    expect(markup).toContain('Dynasty 15');
    expect(markup).toContain('--- DYNASTY TIMELINE ---');
    expect(markup).toContain('Won the championship.');
    expect(markup).toContain('--- CEREMONIES ---');
    expect(markup).toContain('Chicago Blaze championship ceremony');
    expect(markup).toContain('--- AWARDS HISTORY ---');
    expect(markup).toContain('Jay Stone');
    expect(markup).toContain('--- HALL OF FAME ---');
    expect(markup).toContain('Legend One');
    expect(markup).toContain('--- RECORDS BOOK ---');
    expect(markup).toContain('Passing Yards: 5114');
    expect(markup).toContain('--- HALL OF CHAMPIONS ---');
    expect(markup).toContain('First Championship');
    expect(markup).toContain('--- SEASON REPORTS ---');
    expect(markup).toContain('View Report');
    expect(markup).toContain('--- MENTORING REPORT ---');
    expect(markup).toContain('Rick Mason -&gt; Jay Stone');
    expect(markup).toContain('Jay Stone');
  });
});
