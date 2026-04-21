import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayByPlayView } from './PlayByPlay';
import type { BroadcastOutput } from '@mfd/engine/types';

const mockBroadcast: BroadcastOutput = {
  gameId: 'test-1',
  quarters: [
    [
      {
        plays: [
          { type: 'run', yardsGained: 5, playerIds: [], commentary: 'Smith rushes up the middle', excitement: 3, isBigPlay: false, isClutch: false },
          { type: 'pass', yardsGained: 25, playerIds: [], commentary: 'Jones bombs it deep', excitement: 8, isBigPlay: true, isClutch: false },
        ],
        startYardLine: 25,
        yardsTotal: 75,
        timeElapsed: 180,
        endResult: 'touchdown',
        narrative: 'A 75-yard touchdown drive',
      },
    ],
    [],
    [],
    [],
  ],
  highlights: [
    { type: 'pass', yardsGained: 25, playerIds: [], commentary: 'Jones bombs it deep', excitement: 8, isBigPlay: true, isClutch: false },
  ],
  momentumSwings: [
    { quarter: 1, play: 2, description: 'Big touchdown shifts momentum' },
  ],
  ghostLines: [
    { commentatorName: 'Booth Alert', commentary: 'They hit the panic button and never looked back.', trigger: 'quarter_break' },
  ],
  mvpPlayerIds: ['p1'],
  finalNarrative: 'A thrilling game from start to finish.',
  broadcastNetwork: 'MFN',
};

describe('PlayByPlayView', () => {
  it('renders quarter tabs', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('Q1');
    expect(markup).toContain('Q2');
    expect(markup).toContain('Q3');
    expect(markup).toContain('Q4');
  });

  it('shows drive cards for the active quarter', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('DRIVE #1');
    expect(markup).toContain('TOUCHDOWN');
    expect(markup).toContain('75 YDS');
    expect(markup).toContain('A 75-yard touchdown drive');
  });

  it('shows the highlight reel', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('HIGHLIGHTS');
    expect(markup).toContain('Jones bombs it deep');
    expect(markup).toContain('EXC 8');
  });

  it('shows momentum swings', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('MOMENTUM SWINGS');
    expect(markup).toContain('Big touchdown shifts momentum');
  });

  it('renders booth alerts from ghost commentary lines', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('BOOTH ALERTS');
    expect(markup).toContain('They hit the panic button and never looked back.');
    expect(markup).toContain('quarter break');
  });

  it('renders Hall of Fame voices in their own panel with HOF badge', () => {
    const broadcast: BroadcastOutput = {
      ...mockBroadcast,
      ghostLines: [
        { commentatorName: 'Jet Stream', commentary: 'I scored a touchdown just like that back in \'2031.', trigger: 'touchdown', source: 'hof' },
        { commentatorName: 'Booth Alert', commentary: 'They hit the panic button and never looked back.', trigger: 'quarter_break', source: 'callout' },
      ],
    };
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={broadcast} />);

    expect(markup).toContain('HALL OF FAME VOICES');
    expect(markup).toContain('JET STREAM');
    expect(markup).toContain('HOF');
    expect(markup).toContain('I scored a touchdown just like that back in &#x27;2031.');
    expect(markup).toContain('BOOTH ALERTS');
    expect(markup).toContain('They hit the panic button and never looked back.');
  });

  it('omits Hall of Fame Voices panel when no HOF lines are present', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).not.toContain('HALL OF FAME VOICES');
  });

  it('renders authored broadcast texture when commentary lines are provided', () => {
    const markup = renderToStaticMarkup(
      <PlayByPlayView
        broadcast={mockBroadcast}
        commentaryLines={[
          "Tonight's backdrop is The Oven: The Cheese Pull sets the tone before kickoff.",
          'PA flavor: First down Chicago! That slice is hot!',
        ]}
      />,
    );

    expect(markup).toContain('BROADCAST TEXTURE');
    expect(markup).toContain('The Oven: The Cheese Pull sets the tone before kickoff.');
    expect(markup).toContain('PA flavor');
  });

  it('displays the final narrative', () => {
    const markup = renderToStaticMarkup(<PlayByPlayView broadcast={mockBroadcast} />);

    expect(markup).toContain('A thrilling game from start to finish.');
  });
});
