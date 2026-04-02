import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameDayCenterView } from './GameDayRecap';

describe('GameDayCenterView', () => {
  it('renders the package headline and autopsy details', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="New York Titans"
        phase="regular_season"
        year={2026}
        packageData={{
          id: 'pkg-1',
          year: 2026,
          week: 3,
          phase: 'regular_season',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Week 3: New York Titans beat Boston Minutemen 31-17',
          result: 'win',
          finalScore: '31-17',
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
        }}
      />,
    );

    expect(markup).toContain('Week 3: New York Titans beat Boston Minutemen 31-17');
    expect(markup).toContain('Controlled passing rhythm kept the offense ahead of schedule.');
    expect(markup).toContain('Turnover margin plus third-down efficiency flipped the game.');
    expect(markup).toContain('Breakout practice carried into kickoff.');
    expect(markup).toContain('How did the offense stay on schedule?');
  });
});
