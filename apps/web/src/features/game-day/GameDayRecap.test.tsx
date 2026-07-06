import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GameDayCenterView,
  buildGameDayPlayerArcFollowUps,
  buildNamedGameMemoryReceipt,
  buildPostgameDecisionReceipt,
  buildPostgameSourceReceipt,
  buildRecordMemoryReceipt,
} from './GameDayRecap';

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
          matchupHighlight: {
            label: 'LT vs edge rusher',
            detail: 'Protection held against the pressure package.',
            teamId: 'team-1',
            playerId: 'lt-1',
            opponentPlayerId: 'edge-1',
            advantage: 7,
          },
          activeEffectSummaries: [
            'Halftime hell: flipped the second-half plan to open the throttle.',
            'Breakout practice carried into kickoff.',
          ],
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
    expect(markup).toContain('Why it changed: Turnover margin plus third-down efficiency flipped the game.');
    expect(markup).toContain('advantage +7');
    expect(markup).toContain('POSTGAME SOURCE RECEIPT');
    expect(markup).toContain('selectLatestGameDayPackage');
    expect(markup).toContain('Saved GameDayPackage');
    expect(markup).toContain('Saved Package');
    expect(markup).toContain('2026 W3 // WIN // 31-17');
    expect(markup).toContain('GameDayPackage pkg-1 read from selectLatestGameDayPackage; no package writer runs on open.');
    expect(markup).toContain('Why It Moved');
    expect(markup).toContain('1 turning point(s)');
    expect(markup).toContain('Who Mattered');
    expect(markup).toContain('1 performer(s)');
    expect(markup).toContain('Next Actions');
    expect(markup).toContain('2 focus item(s)');
    expect(markup).toContain('Source: saved GameDayPackage headline, autopsy, turning points, top performers, and next-focus rows.');
    expect(markup).toContain('Opening this recap does not replay the game, generate a new package, rewrite weekly summaries, change scores');
    expect(markup).toContain('move players, alter injuries, autosave, reroll outcomes, or answer press.');
    expect(markup).toContain('POSTGAME DECISION RECEIPT');
    expect(markup).toContain('Next-week inputs');
    expect(markup).toContain('No render writes');
    expect(markup).toContain('Prep Check');
    expect(markup).toContain('PREP A');
    expect(markup).toContain('Protection emphasis kept the quarterback clean.');
    expect(markup).toContain('Health Check');
    expect(markup).toContain('1 injury note(s)');
    expect(markup).toContain('RB1: ankle (doubtful, 1 game)');
    expect(markup).toContain('Carryover');
    expect(markup).toContain('3 saved carryover item(s)');
    expect(markup).toContain('Next Week');
    expect(markup).toContain('Source: saved GameDayPackage prepGrade, coachingNotes, carryForwardRecommendations');
    expect(markup).toContain('Opening this receipt does not');
    expect(markup).toContain('recalculate Film Room, apply training, adjust fatigue, change injuries, alter morale');
    expect(markup).toContain('PLAYER ARC FOLLOW-UP');
    expect(markup).toContain('GameDayPackage.topPerformers');
    expect(markup).toContain('Profile callbacks');
    expect(markup).toContain('QB1');
    expect(markup).toContain('286 pass yds, 3 TD');
    expect(markup).toContain('Saved top performer from 31-17');
    expect(markup).toContain('Open Development');
    expect(markup).toContain('Source: saved GameDayPackage top performers, recordsMoments, and milestoneMoments.');
    expect(markup).toContain('Opening this follow-up does not write player history, add timeline rows, create scrapbook cards');
    expect(markup).toContain('rewrite the save, autosave, or reroll outcomes');
    expect(markup).toContain('HALFTIME DECISION RECEIPT');
    expect(markup).toContain('GameDayPackage.activeEffectSummaries');
    expect(markup).toContain('Saved halftime receipt from GameDayPackage.activeEffectSummaries');
    expect(markup).toContain('BROADCAST HOOK');
    expect(markup).toContain('Broadcast routes consume this same saved receipt read model');
    expect(markup).toContain('Halftime hell: flipped the second-half plan to open the throttle.');
    expect(markup).toContain('Breakout practice carried into kickoff.');
    expect(markup).toContain('How did the offense stay on schedule?');
    expect(markup).toContain('PRESS RECEIPT');
    expect(markup).toContain('Saved GameDayPackage.pressConference powers this recap');
    expect(markup).toContain('buildPostWeekMoment as Press Follow-Up');
    expect(markup).toContain('does not record a');
    expect(markup).toContain('conference, change score, player effects, news, social feeds, or answer the');
    expect(markup).toContain('press queue');
    expect(markup).not.toMatch(/gameplay effects|Choose the tone/i);
    expect(markup).not.toContain('podium tone');
    expect(markup).not.toContain('timed effects');
    expect(markup).toContain('MFN');
    expect(markup).toContain('PRIMETIME');
    expect(markup).toContain('FLEXED');
    expect(markup).toContain('Keenan Ward ripped off a 74-yard kick return that flipped the field.');
    expect(markup).toContain('PREP A');
    expect(markup).toContain('Open Film Room');
    expect(markup).toContain('BROADCAST BOOTH');
    expect(markup).toContain('There is family on both sidelines tonight: Marcus Webb and Theo Price.');
  });

  it('builds a postgame source receipt from saved game-day package fields', () => {
    const rows = buildPostgameSourceReceipt({
      id: 'pkg-1',
      year: 2026,
      week: 3,
      phase: 'regular_season',
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      headline: 'Week 3 win',
      result: 'win',
      finalScore: '31-17',
      stakes: [],
      turningPoints: [{ label: 'Third-down edge', detail: 'The offense extended three late drives.', impact: 'positive' }],
      topPerformers: [{ playerId: 'p1', label: 'QB1', statLine: '286 pass yds, 3 TD' }],
      injuryNotes: [],
      ceremony: null,
      pressConference: {
        theme: 'Statement win',
        opener: 'We played clean situational football.',
        speaker: 'Head Coach',
        tone: 'confident',
        topic: 'postgame win',
        reporterQuestions: [],
        quotes: [],
      },
      rivalry: null,
      activeEffectSummaries: [],
      autopsy: {
        diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
        leverage: 'Turnover margin plus third-down efficiency flipped the game.',
        nextFocus: ['Protect the injured backfield', 'Carry the pass protection forward'],
      },
      specialTeamsHighlights: [],
      recordsMoments: [],
      milestoneMoments: [],
    });

    expect(rows).toEqual([
      {
        id: 'package',
        label: 'Saved Package',
        value: '2026 W3 // WIN // 31-17',
        detail: 'GameDayPackage pkg-1 read from selectLatestGameDayPackage; no package writer runs on open.',
        accent: 'green',
      },
      {
        id: 'why',
        label: 'Why It Moved',
        value: '1 turning point(s)',
        detail: 'Controlled passing rhythm kept the offense ahead of schedule. Leverage: Turnover margin plus third-down efficiency flipped the game.',
        accent: 'cyan',
      },
      {
        id: 'players',
        label: 'Who Mattered',
        value: '1 performer(s)',
        detail: 'QB1',
        accent: 'gold',
      },
      {
        id: 'next',
        label: 'Next Actions',
        value: '2 focus item(s)',
        detail: 'Protect the injured backfield / Carry the pass protection forward',
        accent: 'cyan',
      },
    ]);
  });

  it('builds player arc follow-ups from saved package player rows without duplicating the same player', () => {
    const rows = buildGameDayPlayerArcFollowUps({
      id: 'pkg-arc',
      year: 2031,
      week: 7,
      phase: 'regular_season',
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      headline: 'Chicago turns the player arcs',
      result: 'win',
      finalScore: '38-31',
      stakes: [],
      turningPoints: [],
      topPerformers: [
        { playerId: 'qb-1', label: 'Drew Hart (QB)', statLine: '512 pass yds, 5 TD' },
        { playerId: 'rb-1', label: 'Milo King (RB)', statLine: '118 rush yds, 1 TD' },
        { playerId: null, label: 'Team Defense', statLine: '4 sacks' },
      ],
      injuryNotes: [],
      ceremony: null,
      pressConference: {
        theme: 'Historic night',
        opener: 'The locker room knows what that meant.',
        speaker: 'Head Coach',
        tone: 'confident',
        topic: 'postgame win',
        reporterQuestions: [],
        quotes: [],
      },
      rivalry: null,
      activeEffectSummaries: [],
      autopsy: {
        diagnosis: 'Explosive passing changed the night.',
        leverage: 'The last drive forced the record.',
        nextFocus: [],
      },
      specialTeamsHighlights: [],
      recordsMoments: [{
        playerId: 'qb-1',
        playerName: 'Drew Hart',
        teamId: 'team-1',
        stat: 'passYds',
        newValue: 512,
        previousValue: 498,
        previousHolder: 'Old Star',
        category: 'singleGame',
        year: 2031,
        week: 7,
        narrative: 'Drew Hart reset the single-game passing mark.',
      }],
      milestoneMoments: [{
        playerId: 'wr-1',
        playerName: 'Theo Price',
        stat: 'recYds',
        value: 10000,
        milestoneLabel: '10,000 career receiving yards',
        narrative: 'Theo Price crossed the 10,000-yard career milestone.',
        year: 2031,
        week: 7,
      }],
    });

    expect(rows).toEqual([
      {
        id: 'record-qb-1',
        playerId: 'qb-1',
        playerName: 'Drew Hart',
        label: 'Record Breaker',
        value: 'SINGLE GAME PASS YDS 512',
        detail: 'Drew Hart reset the single-game passing mark.',
        source: 'GameDayPackage.recordsMoments',
        accent: 'green',
      },
      {
        id: 'milestone-wr-1',
        playerId: 'wr-1',
        playerName: 'Theo Price',
        label: 'Milestone',
        value: '10,000 career receiving yards',
        detail: 'Theo Price crossed the 10,000-yard career milestone.',
        source: 'GameDayPackage.milestoneMoments',
        accent: 'cyan',
      },
      {
        id: 'performer-rb-1',
        playerId: 'rb-1',
        playerName: 'Milo King',
        label: 'Top RB',
        value: '118 rush yds, 1 TD',
        detail: "Saved top performer from 38-31; use the profile link to carry this game into the player's arc.",
        source: 'GameDayPackage.topPerformers',
        accent: 'gold',
      },
    ]);
  });

  it('builds a postgame decision receipt from saved game-day package decision fields', () => {
    const rows = buildPostgameDecisionReceipt({
      id: 'pkg-1',
      year: 2026,
      week: 3,
      phase: 'regular_season',
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      headline: 'Week 3 win',
      result: 'win',
      finalScore: '31-17',
      stakes: [],
      turningPoints: [],
      topPerformers: [],
      injuryNotes: ['RB1: ankle (doubtful, 1 game)'],
      ceremony: null,
      pressConference: {
        theme: 'Statement win',
        opener: 'We played clean situational football.',
        speaker: 'Head Coach',
        tone: 'confident',
        topic: 'postgame win',
        reporterQuestions: [],
        quotes: [],
      },
      rivalry: null,
      activeEffectSummaries: [
        'Halftime hell: flipped the second-half plan to open the throttle.',
        'Breakout practice carried into kickoff.',
      ],
      autopsy: {
        diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
        leverage: 'Turnover margin plus third-down efficiency flipped the game.',
        nextFocus: ['Protect the injured backfield', 'Carry the pass protection forward'],
      },
      specialTeamsHighlights: [],
      recordsMoments: [],
      milestoneMoments: [],
      prepGrade: 'A',
      coachingNotes: ['Protection emphasis kept the quarterback clean.'],
      carryForwardRecommendations: ['Keep the successful plan family available next week.'],
    });

    expect(rows).toEqual([
      {
        id: 'prep',
        label: 'Prep Check',
        value: 'PREP A',
        detail: 'Protection emphasis kept the quarterback clean. / Keep the successful plan family available next week.',
        accent: 'green',
      },
      {
        id: 'health',
        label: 'Health Check',
        value: '1 injury note(s)',
        detail: 'RB1: ankle (doubtful, 1 game)',
        accent: 'red',
      },
      {
        id: 'carryover',
        label: 'Carryover',
        value: '3 saved carryover item(s)',
        detail: 'Halftime hell: flipped the second-half plan to open the throttle. / Breakout practice carried into kickoff. / Keep the successful plan family available next week.',
        accent: 'gold',
      },
      {
        id: 'next-week',
        label: 'Next Week',
        value: '2 focus item(s)',
        detail: 'Protect the injured backfield / Carry the pass protection forward',
        accent: 'cyan',
      },
    ]);
  });

  it('renders record and milestone memory as a read-only Record Book CTA', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="Chicago Blaze"
        phase="regular_season"
        year={2031}
        packageData={{
          id: 'pkg-record',
          year: 2031,
          week: 7,
          phase: 'regular_season',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Chicago turns the record book',
          result: 'win',
          finalScore: '38-31',
          stakes: [],
          turningPoints: [],
          topPerformers: [],
          injuryNotes: [],
          ceremony: null,
          pressConference: {
            theme: 'Historic night',
            opener: 'The locker room knows what that meant.',
            speaker: 'Head Coach',
            tone: 'confident',
            topic: 'postgame win',
            reporterQuestions: [],
            quotes: [],
          },
          rivalry: null,
          activeEffectSummaries: [],
          autopsy: {
            diagnosis: 'Explosive passing changed the night.',
            leverage: 'The last drive forced the record.',
            nextFocus: [],
          },
          specialTeamsHighlights: [],
          recordsMoments: [{
            playerId: 'qb-1',
            playerName: 'Drew Hart',
            teamId: 'team-1',
            stat: 'passYds',
            newValue: 512,
            previousValue: 498,
            previousHolder: 'Old Star',
            category: 'singleGame',
            year: 2031,
            week: 7,
            narrative: 'Drew Hart reset the single-game passing mark.',
          }],
          milestoneMoments: [{
            playerId: 'qb-1',
            playerName: 'Drew Hart',
            stat: 'passYds',
            value: 10000,
            milestoneLabel: '10,000 career passing yards',
            narrative: 'Drew Hart crossed the 10,000-yard career milestone.',
            year: 2031,
            week: 7,
          }],
        }}
      />,
    );

    expect(markup).toContain('RECORD MEMORY');
    expect(markup).toContain('Record Book');
    expect(markup).toContain('GameDayPackage.recordsMoments');
    expect(markup).toContain('GameDayPackage.milestoneMoments');
    expect(markup).toContain('recentMilestones archive');
    expect(markup).toContain('Saved record package');
    expect(markup).toContain('1 record(s) // 1 milestone(s)');
    expect(markup).toContain('GameDayPackage pkg-record carries saved recordsMoments and milestoneMoments from the completed game.');
    expect(markup).toContain('Drew Hart // SINGLE GAME PASS YDS 512');
    expect(markup).toContain('Drew Hart reset the single-game passing mark.');
    expect(markup).toContain('Drew Hart // 10,000 career passing yards');
    expect(markup).toContain('Drew Hart crossed the 10,000-yard career milestone.');
    expect(markup).toContain('/records');
    expect(markup).toContain('RecordBook reads saved game.records plus recentMilestones');
    expect(markup).toContain('No recalculation');
    expect(markup).toContain('Opening this panel or archive link does not update records, check milestones, write recentMilestones');
    expect(markup).toContain('Source: saved GameDayPackage.recordsMoments and GameDayPackage.milestoneMoments.');
    expect(markup).toContain('Opening this recap does not update records, check milestones, write recentMilestones');
    expect(markup).toContain('change stats, replay the game, reroll outcomes, or create new results');
  });

  it('builds a record memory receipt from saved package records without implying recalculation', () => {
    const rows = buildRecordMemoryReceipt({
      id: 'pkg-record',
      year: 2031,
      week: 7,
      phase: 'regular_season',
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      headline: 'Chicago turns the record book',
      result: 'win',
      finalScore: '38-31',
      stakes: [],
      turningPoints: [],
      topPerformers: [],
      injuryNotes: [],
      ceremony: null,
      pressConference: {
        theme: 'Historic night',
        opener: 'The locker room knows what that meant.',
        speaker: 'Head Coach',
        tone: 'confident',
        topic: 'postgame win',
        reporterQuestions: [],
        quotes: [],
      },
      rivalry: null,
      activeEffectSummaries: [],
      autopsy: {
        diagnosis: 'Explosive passing changed the night.',
        leverage: 'The last drive forced the record.',
        nextFocus: [],
      },
      specialTeamsHighlights: [],
      recordsMoments: [{
        playerId: 'qb-1',
        playerName: 'Drew Hart',
        teamId: 'team-1',
        stat: 'passYds',
        newValue: 512,
        previousValue: 498,
        previousHolder: 'Old Star',
        category: 'singleGame',
        year: 2031,
        week: 7,
        narrative: 'Drew Hart reset the single-game passing mark.',
      }],
      milestoneMoments: [{
        playerId: 'qb-1',
        playerName: 'Drew Hart',
        stat: 'passYds',
        value: 10000,
        milestoneLabel: '10,000 career passing yards',
        narrative: 'Drew Hart crossed the 10,000-yard career milestone.',
        year: 2031,
        week: 7,
      }],
    });

    expect(rows).toEqual([
      {
        id: 'saved-records',
        label: 'Saved record package',
        value: '1 record(s) // 1 milestone(s)',
        detail: 'GameDayPackage pkg-record carries saved recordsMoments and milestoneMoments from the completed game.',
        accent: 'green',
      },
      {
        id: 'record-highlight',
        label: 'Record Book',
        value: 'Drew Hart // SINGLE GAME PASS YDS 512',
        detail: 'Drew Hart reset the single-game passing mark.',
        accent: 'gold',
      },
      {
        id: 'milestone-highlight',
        label: 'Milestone',
        value: 'Drew Hart // 10,000 career passing yards',
        detail: 'Drew Hart crossed the 10,000-yard career milestone.',
        accent: 'green',
      },
      {
        id: 'archive',
        label: 'Archive path',
        value: '/records',
        detail: 'RecordBook reads saved game.records plus recentMilestones; use it to track the moment after the recap.',
        accent: 'cyan',
      },
      {
        id: 'boundary',
        label: 'No recalculation',
        value: 'read-only CTA',
        detail: 'Opening this panel or archive link does not update records, check milestones, write recentMilestones, change stats, replay the game, reroll outcomes, or create new results.',
        accent: 'default',
      },
    ]);
  });

  it('renders playoff readiness as action guidance instead of narrative metadata', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="Chicago Blaze"
        phase="playoffs"
        year={2028}
        packageData={{
          id: 'pkg-playoff',
          year: 2028,
          week: 20,
          phase: 'playoffs',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Chicago survives the divisional round',
          result: 'win',
          finalScore: '27-24',
          stakes: [],
          turningPoints: [],
          topPerformers: [],
          injuryNotes: [],
          ceremony: null,
          pressConference: {
            theme: 'Playoff survival',
            opener: 'We have to clean up the next opponent fast.',
            speaker: 'Head Coach',
            tone: 'confident',
            topic: 'postgame win',
            reporterQuestions: [],
            quotes: [],
          },
          rivalry: null,
          activeEffectSummaries: [],
          autopsy: {
            diagnosis: 'Late defense protected the lead.',
            leverage: 'Red-zone tackling kept the season alive.',
            nextFocus: [],
          },
          specialTeamsHighlights: [],
          recordsMoments: [],
          milestoneMoments: [],
        }}
        playoffMomentum={{
          teamId: 'team-1',
          momentum: 82,
          narrativeTag: 'hot_streak',
          winStreak: 3,
        }}
      />,
    );

    expect(markup).toContain('PLAYOFF READINESS');
    expect(markup).toContain('SCORE 82');
    expect(markup).toContain('playoff score 82');
    expect(markup).toContain('Playoff score 82 with 3 straight wins.');
    expect(markup).toContain('Before the next playoff game, set health, depth, and matchup calls.');
    expect(markup).not.toContain('Playoff Momentum');
    expect(markup).not.toContain('MOM 82');
    expect(markup).not.toContain('hot streak narrative is active');
    expect(markup).not.toContain('Momentum sits at 82');
  });

  it('renders a weather-impact panel when saved game-day weather affects play', () => {
    const markup = renderToStaticMarkup(
      <GameDayCenterView
        teamLabel="New York Concrete Jungle Cabbies"
        phase="regular_season"
        year={2026}
        packageData={{
          id: 'pkg-rain',
          year: 2026,
          week: 6,
          phase: 'regular_season',
          teamId: 'team-1',
          opponentTeamId: 'team-2',
          headline: 'Rain game goes down to the wire',
          result: 'loss',
          finalScore: '20-17',
          weather: 'rain',
          stakes: [],
          turningPoints: [],
          topPerformers: [],
          injuryNotes: [],
          ceremony: null,
          pressConference: {
            theme: 'Wet finish',
            opener: 'We needed cleaner handling.',
            speaker: 'Head Coach',
            tone: 'somber',
            topic: 'postgame loss',
            reporterQuestions: [],
            quotes: [],
          },
          rivalry: null,
          activeEffectSummaries: [],
          autopsy: {
            diagnosis: 'Ball security and field position decided the game.',
            leverage: 'One wet-weather mistake tilted the fourth quarter.',
            nextFocus: [],
          },
          specialTeamsHighlights: [],
          recordsMoments: [],
          milestoneMoments: [],
        }}
      />,
    );

    expect(markup).toContain('WEATHER IMPACT');
    expect(markup).toContain('RAIN FAVORS BALL CONTROL');
    expect(markup).toContain('Saved rain conditions dampen passing quality');
    expect(markup).toContain('weather // rain');
    expect(markup).toContain('GameDayPackage.weather');
    expect(markup).toContain('Shared weather copy');
    expect(markup).toContain('Source: saved game-day package weather plus getWeatherImpactCopy');
    expect(markup).toContain('does not');
    expect(markup).toContain('generate matchup weather, rewrite schedule weather, replay the game, alter weather formulas');
    expect(markup).toContain('change saved results, or reroll saved outcomes');
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
    expect(markup).toContain('Named Games');
    expect(markup).toContain('GameDayPackage.namedGame');
    expect(markup).toContain('dynastyTimeline archive');
    expect(markup).toContain('Saved named game');
    expect(markup).toContain('2026 W4 // 34-31');
    expect(markup).toContain('GameDayPackage pkg-2 carries The Shootout from the saved game result.');
    expect(markup).toContain('/legacy/named-games');
    expect(markup).toContain('NamedGamesBrowser reads saved dynastyTimeline named_game rows');
    expect(markup).toContain('No rerun');
    expect(markup).toContain('does not re-run detectNamedGame, rewrite results, repair timeline rows');
  });

  it('builds a named-game memory receipt from saved package data without implying new writes', () => {
    const rows = buildNamedGameMemoryReceipt({
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
    }, {
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
    });

    expect(rows).toEqual([
      {
        id: 'saved-result',
        label: 'Saved named game',
        value: '2026 W4 // 34-31',
        detail: 'GameDayPackage pkg-2 carries The Shootout from the saved game result.',
        accent: 'gold',
      },
      {
        id: 'archive',
        label: 'Archive path',
        value: '/legacy/named-games',
        detail: 'NamedGamesBrowser reads saved dynastyTimeline named_game rows; use it to revisit trophy-tier games later.',
        accent: 'cyan',
      },
      {
        id: 'boundary',
        label: 'No rerun',
        value: 'read-only CTA',
        detail: 'Opening this panel or archive link does not re-run detectNamedGame, rewrite results, repair timeline rows, change scores, reroll outcomes, or create new results.',
        accent: 'default',
      },
    ]);
  });
});
