import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AwardsHistoryEntry } from '@mfd/engine';
import {
  AwardsHub,
  AWARDS_HUB_CATEGORY_IDS,
  getAdjacentAwardYear,
} from './AwardsHub';

let mockAwardsHistory: AwardsHistoryEntry[] = [];

const award = (
  awardId: string,
  label: string,
  winnerName: string,
  winnerTeam: string,
  score: number,
  runnerName = 'Runner Up',
): AwardsHistoryEntry['awards'][number] => ({
  awardId,
  label,
  winnerId: `${awardId}-winner`,
  winnerName,
  winnerTeamId: `${awardId}-team`,
  winnerTeam,
  winnerPosition: awardId.includes('dpoy') || awardId.includes('droy') ? 'LB' : 'QB',
  winnerStats: { ovr: 94 },
  score,
  runnersUp: [
    {
      entityId: `${awardId}-runner`,
      entityType: 'player',
      name: runnerName,
      teamId: `${awardId}-runner-team`,
      teamName: 'Milwaukee Meteors',
      position: 'QB',
      ovr: 88,
      score: score - 4,
      stats: { ovr: 88 },
    },
  ],
  narrative: `${winnerName} separated from the field.`,
});

function awardsEntry(year: number): AwardsHistoryEntry {
  return {
    year,
    ceremony: {
      headline: `${year} Awards Night`,
      intro: `${year} stars take the stage.`,
      blurbs: [],
    },
    awards: [
      award('mvp', 'MVP', `MVP ${year}`, 'Chicago Blaze', 98, 'Dak West'),
      award('opoy', 'Offensive Player of the Year', `OPOY ${year}`, 'Dallas Bulls', 91),
      award('dpoy', 'Defensive Player of the Year', `DPOY ${year}`, 'New York Knights', 90),
      award('comeback_player', 'Comeback Player of the Year', `CPOY ${year}`, 'Seattle Rain', 84),
      award('oroy', 'Offensive Rookie of the Year', `OROY ${year}`, 'Miami Sharks', 82),
      award('droy', 'Defensive Rookie of the Year', `DROY ${year}`, 'Denver Peaks', 81),
    ],
  };
}

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { awardsHistory: AwardsHistoryEntry[] }) => AwardsHistoryEntry[]) =>
    selector({ awardsHistory: mockAwardsHistory }),
  selectAwardsHistory: (state: { awardsHistory: AwardsHistoryEntry[] }) => state.awardsHistory,
}));

describe('AwardsHub', () => {
  beforeEach(() => {
    mockAwardsHistory = [awardsEntry(2031), awardsEntry(2030)];
  });

  it('renders the awards hub header and spotlight anchor', () => {
    const markup = renderToStaticMarkup(<AwardsHub />);

    expect(markup).toContain('AWARDS HUB');
    expect(markup).toContain('data-spotlight-target="chip.route.awards-hub.beat-1"');
  });

  it('renders the six marquee award category cards', () => {
    const markup = renderToStaticMarkup(<AwardsHub />);

    for (const categoryId of AWARDS_HUB_CATEGORY_IDS) {
      expect(markup).toContain(`data-award-card="${categoryId}"`);
    }
    expect(markup).toContain('MVP');
    expect(markup).toContain('Offensive Player of the Year');
    expect(markup).toContain('Defensive Rookie of the Year');
  });

  it('defaults to the newest season when multiple seasons are present', () => {
    const markup = renderToStaticMarkup(<AwardsHub />);

    expect(markup).toContain('2031 Awards Night');
    expect(markup).toContain('MVP 2031');
    expect(markup).not.toContain('MVP 2030 separated from the field.');
  });

  it('renders runner-up and voting-margin details', () => {
    const markup = renderToStaticMarkup(<AwardsHub />);

    expect(markup).toContain('Margin +4');
    expect(markup).toContain('Dak West');
    expect(markup).toContain('Milwaukee Meteors');
  });

  it('renders a stable empty state before awards are archived', () => {
    mockAwardsHistory = [];

    const markup = renderToStaticMarkup(<AwardsHub />);

    expect(markup).toContain('No award classes archived yet.');
    expect(markup).not.toContain('data-award-card=');
  });

  it('handles missing category data without fabricating winners', () => {
    mockAwardsHistory = [{
      ...awardsEntry(2032),
      awards: [award('mvp', 'MVP', 'Solo Star', 'Chicago Blaze', 96)],
    }];

    const markup = renderToStaticMarkup(<AwardsHub />);

    expect(markup).toContain('Solo Star');
    expect(markup).toContain('No winner recorded.');
  });

  it('moves the season scrubber across sorted seasons without mutating history', () => {
    const history = [awardsEntry(2029), awardsEntry(2031), awardsEntry(2030)];

    expect(getAdjacentAwardYear(history, 2031, 'older')).toBe(2030);
    expect(getAdjacentAwardYear(history, 2030, 'newer')).toBe(2031);
    expect(getAdjacentAwardYear(history, 2029, 'older')).toBe(2029);
    expect(history.map((entry) => entry.year)).toEqual([2029, 2031, 2030]);
  });
});
