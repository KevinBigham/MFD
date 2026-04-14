import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameFlowAnalysis } from '@mfd/engine';
import { GameFlowView } from './GameFlow';

const mockAnalysis: GameFlowAnalysis = {
  quarterMomentum: [
    { quarter: 1, homePoints: 7, awayPoints: 3, homeDrives: 3, awayDrives: 3, homeYards: 120, awayYards: 80, dominantTeam: 'home', bigPlays: 2 },
    { quarter: 2, homePoints: 10, awayPoints: 0, homeDrives: 3, awayDrives: 2, homeYards: 150, awayYards: 40, dominantTeam: 'home', bigPlays: 1 },
    { quarter: 3, homePoints: 0, awayPoints: 14, homeDrives: 2, awayDrives: 3, homeYards: 60, awayYards: 180, dominantTeam: 'away', bigPlays: 3 },
    { quarter: 4, homePoints: 7, awayPoints: 3, homeDrives: 3, awayDrives: 3, homeYards: 100, awayYards: 90, dominantTeam: 'even', bigPlays: 1 },
  ],
  driveEfficiency: {
    home: { totalDrives: 11, scoringDrives: 4, scoringRate: 0.36, threeAndOuts: 2, avgYardsPerDrive: 39, avgPlaysPerDrive: 5, bestDriveYards: 75 },
    away: { totalDrives: 11, scoringDrives: 3, scoringRate: 0.27, threeAndOuts: 3, avgYardsPerDrive: 35, avgPlaysPerDrive: 4, bestDriveYards: 80 },
  },
  scoringRuns: [
    { teamSide: 'home', points: 17, startQuarter: 1, endQuarter: 2, drives: 3, description: '17-0 run from Q1 to Q2' },
  ],
  winProbability: [
    { driveIndex: 0, quarter: 1, homeWinProb: 55, scoreHome: 7, scoreAway: 0 },
    { driveIndex: 1, quarter: 1, homeWinProb: 52, scoreHome: 7, scoreAway: 3 },
  ],
  turningPoint: { driveIndex: 5, quarter: 3, description: 'Away team scores back-to-back touchdowns', winProbSwing: 25 },
};

describe('GameFlowView', () => {
  it('renders quarter momentum cards with points and yards', () => {
    const markup = renderToStaticMarkup(
      <GameFlowView analysis={mockAnalysis} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('QUARTER 1');
    expect(markup).toContain('QUARTER 2');
    expect(markup).toContain('QUARTER 3');
    expect(markup).toContain('QUARTER 4');
    expect(markup).toContain('7 PTS');
    expect(markup).toContain('120 YDS');
    expect(markup).toContain('2 BIG PLAYS');
  });

  it('renders scoring runs with description and badge', () => {
    const markup = renderToStaticMarkup(
      <GameFlowView analysis={mockAnalysis} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('SCORING RUNS');
    expect(markup).toContain('17-0 run from Q1 to Q2');
    expect(markup).toContain('17-0');
  });

  it('renders drive efficiency comparison for both teams', () => {
    const markup = renderToStaticMarkup(
      <GameFlowView analysis={mockAnalysis} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('BEARS EFFICIENCY');
    expect(markup).toContain('LIONS EFFICIENCY');
    expect(markup).toContain('Total Drives');
    expect(markup).toContain('11');
    expect(markup).toContain('Scoring Rate');
    expect(markup).toContain('36%');
    expect(markup).toContain('27%');
    expect(markup).toContain('Three-and-Outs');
  });

  it('displays the turning point with quarter and win prob swing', () => {
    const markup = renderToStaticMarkup(
      <GameFlowView analysis={mockAnalysis} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('TURNING POINT');
    expect(markup).toContain('Away team scores back-to-back touchdowns');
    expect(markup).toContain('Q3');
    expect(markup).toContain('25.0% SWING');
  });

  it('renders the win probability heartbeat view', () => {
    const markup = renderToStaticMarkup(
      <GameFlowView analysis={mockAnalysis} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('WIN PROBABILITY');
    expect(markup).toContain('Home win probability heartbeat');
    expect(markup).toContain('Home');
    expect(markup).toContain('Away');
  });

  it('shows fallback text when no turning point exists', () => {
    const noTurningPoint: GameFlowAnalysis = {
      ...mockAnalysis,
      turningPoint: null,
    };

    const markup = renderToStaticMarkup(
      <GameFlowView analysis={noTurningPoint} homeName="Bears" awayName="Lions" />,
    );

    expect(markup).toContain('No clear turning point');
    expect(markup).toContain('evenly matched game');
  });
});
