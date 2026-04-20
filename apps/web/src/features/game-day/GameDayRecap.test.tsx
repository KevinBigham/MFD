import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameDayCenterView } from './GameDayRecap';

describe('GameDayCenterView', () => {
  it('renders the package headline and autopsy details', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="New York Concrete Jungle Cabbies"
        phase="regular_season"
        year={2026}
        packageData={{
          id: 'pkg-1',
          year: 2026,
          week: 3,
          phase: 'regular_season',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Week 3: New York Concrete Jungle Cabbies beat Boston Hub of the Universe Chowderheads 31-17',
          result: 'win',
          finalScore: '31-17',
          broadcastNetwork: 'MFN',
          primetime: true,
          flexed: true,
          stakes: [{ label: 'Division pace', detail: 'A fast AFC East start matters.' }],
          turningPoints: [{ label: 'Third-down edge', detail: 'The offense extended three late drives.', impact: 'positive' }],
          topPerformers: [{ playerId: 'p1', label: 'QB1', statLine: '286 pass yds, 3 TD' }],
          injuryNotes: ['RB1: ankle (doubtful, 1 game)'],
          ceremony: { title: 'Locker Room Pulse', subtitle: 'Players blasted the victory song.' },
          pressConference: {
            theme: 'Statement win',
            opener: 'We played clean situational football.',
            speaker: 'Head Coach',
            tone: 'confident',
            topic: 'postgame win',
            reporterQuestions: [
              { id: 'q-1', prompt: 'How did the offense stay on schedule?', response: 'We stayed ahead of the sticks.', topic: 'offense' },
            ],
            quotes: ['We controlled the moment.', 'The line set the tone.'],
          },
          rivalry: {
            rivalryId: 'team-1::team-2',
            intensity: 72,
            tier: 'heated',
            ovrBoost: 3,
            headline: 'These teams brought real heat into kickoff.',
          },
          activeEffectSummaries: ['Breakout practice carried into kickoff.'],
          autopsy: {
            diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
            leverage: 'Turnover margin plus third-down efficiency flipped the game.',
            nextFocus: ['Protect the injured backfield', 'Carry the pass protection forward'],
          },
          specialTeamsHighlights: ['Keenan Ward ripped off a 74-yard kick return that flipped the field.'],
          recordsMoments: [],
          milestoneMoments: [],
          prepGrade: 'A',
          coachingNotes: ['Protection emphasis kept the quarterback clean.'],
          carryForwardRecommendations: ['Keep the successful plan family available next week.'],
        }}
        boothRecap={[
          'There is family on both sidelines tonight: Marcus Webb and Theo Price.',
        ]}
      />,
    );

    expect(markup).toContain('Week 3: New York Concrete Jungle Cabbies beat Boston Hub of the Universe Chowderheads 31-17');
    expect(markup).toContain('Controlled passing rhythm kept the offense ahead of schedule.');
    expect(markup).toContain('Turnover margin plus third-down efficiency flipped the game.');
    expect(markup).toContain('Breakout practice carried into kickoff.');
    expect(markup).toContain('How did the offense stay on schedule?');
    expect(markup).toContain('MFN');
    expect(markup).toContain('PRIMETIME');
    expect(markup).toContain('FLEXED');
    expect(markup).toContain('Keenan Ward ripped off a 74-yard kick return that flipped the field.');
    expect(markup).toContain('PREP A');
    expect(markup).toContain('Open Film Room');
    expect(markup).toContain('BROADCAST BOOTH');
    expect(markup).toContain('There is family on both sidelines tonight: Marcus Webb and Theo Price.');
  });

  it('renders the named game banner and EKG when one is attached', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="Chicago Blaze"
        phase="regular_season"
        year={2026}
        packageData={{
          id: 'pkg-2',
          year: 2026,
          week: 4,
          phase: 'regular_season',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Chicago survives a chaos game',
          result: 'win',
          finalScore: '34-31',
          stakes: [],
          turningPoints: [],
          topPerformers: [],
          injuryNotes: [],
          ceremony: null,
          pressConference: {
            theme: 'Chaos win',
            opener: 'We kept punching.',
            speaker: 'Head Coach',
            tone: 'confident',
            topic: 'postgame win',
            reporterQuestions: [],
            quotes: [],
          },
          rivalry: null,
          activeEffectSummaries: [],
          autopsy: {
            diagnosis: 'Late execution saved the day.',
            leverage: 'The final drive tilted everything.',
            nextFocus: [],
          },
          specialTeamsHighlights: [],
          recordsMoments: [],
          milestoneMoments: [],
        }}
        namedGame={{
          name: 'The Shootout',
          archetype: 'shootout',
          gameId: 'game-1',
          year: 2026,
          week: 4,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          winnerTeamId: 'team-1',
          homeScore: 34,
          awayScore: 31,
          reason: 'Both offenses broke the scoreboard.',
        }}
        namedGameEkgPoints={[
          { time: 1, wp: 50 },
          { time: 2, wp: 67, event: 'touchdown' },
          { time: 3, wp: 42, event: 'turnover' },
        ]}
      />,
    );

    expect(markup).toContain('THIS GAME HAS A NAME');
    expect(markup).toContain('THE SHOOTOUT');
    expect(markup).toContain('Win probability EKG');
  });
});
