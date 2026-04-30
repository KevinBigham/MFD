import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AwardsHistoryEntry, FranchiseEra } from '@mfd/engine';
import {
  MvpPlaqueWallView,
  buildMvpPlaqueAwards,
  formatAwardStatSnapshot,
  type MvpPlaqueAward,
} from './MvpPlaqueWall';
import { MvpPlaqueSvg, getMvpPlaqueRibbonFill } from './mvpPlaqueSvg';

const fixtureAwards: MvpPlaqueAward[] = [
  {
    id: '2034-mvp-cole',
    year: 2034,
    awardType: 'mvp',
    awardLabel: 'MVP',
    playerName: 'Cole Stone',
    position: 'QB',
    statSnapshot: '4523 PASS YDS',
    eraLabel: 'Dynasty Era',
    peakRating: 97,
  },
  {
    id: '2032-opoy-jalen',
    year: 2032,
    awardType: 'opoy',
    awardLabel: 'OPOY',
    playerName: 'Jalen Frost',
    position: 'WR',
    statSnapshot: '18 REC TDS',
    eraLabel: 'Contender Era',
    peakRating: 91,
  },
  {
    id: '2031-dpoy-malik',
    year: 2031,
    awardType: 'dpoy',
    awardLabel: 'DPOY',
    playerName: 'Malik Redd',
    position: 'EDGE',
    statSnapshot: '21 SACKS',
    eraLabel: 'Contender Era',
    peakRating: 94,
  },
  {
    id: '2030-coty-vale',
    year: 2030,
    awardType: 'coty',
    awardLabel: 'COTY',
    playerName: 'Terry Vale',
    position: 'HC',
    statSnapshot: '14 WINS',
    eraLabel: 'Building Era',
    peakRating: 88,
  },
];

describe('MvpPlaqueWall', () => {
  it('renders the MVP Plaque Wall header', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={fixtureAwards} />);

    expect(markup).toContain('MVP PLAQUE WALL');
    expect(markup).toContain('Every star season your franchise turned into hardware.');
  });

  it('renders one plaque per award winner in props', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={fixtureAwards} />);

    expect(markup.match(/data-testid="mvp-plaque-card"/g)).toHaveLength(4);
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('TERRY VALE');
  });

  it('filters the MVP view to MVP-type awards only', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={fixtureAwards} initialFilter="mvp" />);

    expect(markup.match(/data-testid="mvp-plaque-card"/g)).toHaveLength(1);
    expect(markup).toContain('COLE STONE');
    expect(markup).not.toContain('JALEN FROST');
  });

  it('maps plaque ribbon color to award type', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueSvg awardType="dpoy" />);

    expect(markup).toContain('data-ribbon-variant="dpoy"');
    expect(markup).toContain('data-ribbon-fill="var(--mfd-red)"');
    expect(getMvpPlaqueRibbonFill('coty')).toBe('var(--mfd-cyan)');
  });

  it('sorts plaques by year descending by default', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={[fixtureAwards[2]!, fixtureAwards[0]!, fixtureAwards[1]!]} />);

    expect(markup.indexOf('COLE STONE')).toBeLessThan(markup.indexOf('JALEN FROST'));
    expect(markup.indexOf('JALEN FROST')).toBeLessThan(markup.indexOf('MALIK REDD'));
  });

  it('renders the empty state when no awards were earned by franchise players', () => {
    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={[]} />);

    expect(markup).toContain('The plaque wall is empty. Develop a star.');
    expect(markup).toContain('View Career');
  });

  it('prints the stat snapshot from the award winner stats field', () => {
    expect(formatAwardStatSnapshot({ passYds: 4523 })).toBe('4523 PASS YDS');

    const markup = renderToStaticMarkup(<MvpPlaqueWallView awards={[fixtureAwards[0]!]} />);
    expect(markup).toContain('4523 PASS YDS');
  });

  it('builds franchise-only plaques from awards history and era data', () => {
    const history: AwardsHistoryEntry[] = [
      {
        year: 2034,
        awards: [
          {
            awardId: 'mvp',
            label: 'MVP',
            winnerId: 'qb-1',
            winnerName: 'Cole Stone',
            winnerTeamId: 'team-1',
            winnerTeam: 'Chicago',
            winnerPosition: 'QB',
            winnerStats: { passYds: 4523 },
            score: 97.4,
            runnersUp: [],
            narrative: 'He separated.',
          },
          {
            awardId: 'opoy',
            label: 'Offensive Player of the Year',
            winnerId: 'wr-2',
            winnerName: 'Road Star',
            winnerTeamId: 'team-2',
            winnerTeam: 'Detroit',
            winnerPosition: 'WR',
            winnerStats: { recTds: 18 },
            score: 92,
            runnersUp: [],
            narrative: 'Road winner.',
          },
        ],
        ceremony: { headline: 'Awards', intro: 'Intro', blurbs: [] },
      },
    ];
    const eras: FranchiseEra[] = [{ name: 'Dynasty Era', startYear: 2033, endYear: null, description: 'Titles stacked.' }];

    expect(buildMvpPlaqueAwards(history, { id: 'team-1' }, eras)).toEqual([
      {
        id: '2034-mvp-qb-1',
        year: 2034,
        awardType: 'mvp',
        awardLabel: 'MVP',
        playerName: 'Cole Stone',
        position: 'QB',
        statSnapshot: '4523 PASS YDS',
        eraLabel: 'Dynasty Era',
        peakRating: 97,
      },
    ]);
  });
});
