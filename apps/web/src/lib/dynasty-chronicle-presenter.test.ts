import { describe, expect, it } from 'vitest';
import type { ChronicleEvent } from './dynasty-chronicle';
import {
  chronicleAccent,
  chronicleBody,
  chronicleFacts,
  chronicleTitle,
  titleCase,
} from './dynasty-chronicle-presenter';

describe('titleCase', () => {
  it('capitalizes each underscore-separated segment', () => {
    expect(titleCase('super_bowl')).toBe('Super Bowl');
    expect(titleCase('wild_card')).toBe('Wild Card');
    expect(titleCase('championship')).toBe('Championship');
  });

  it('tolerates empty segments', () => {
    expect(titleCase('__foo')).toBe('Foo');
    expect(titleCase('')).toBe('');
  });
});

describe('chronicleAccent', () => {
  it('maps championship events to gold', () => {
    const event: ChronicleEvent = {
      id: 'c', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4',
    };
    expect(chronicleAccent(event)).toBe('gold');
  });

  it('maps hof inductions to gold', () => {
    const event: ChronicleEvent = {
      id: 'h', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB',
    };
    expect(chronicleAccent(event)).toBe('gold');
  });

  it('maps playoff rounds to cyan', () => {
    const event: ChronicleEvent = {
      id: 'p', type: 'playoff_round', year: 2032, round: 'super_bowl', outcome: 'win',
      finalScore: '27-20', headline: 'Crown',
    };
    expect(chronicleAccent(event)).toBe('cyan');
  });

  it('maps all coach events to green', () => {
    const types: ChronicleEvent['type'][] = ['coach_championship', 'coach_hire', 'coach_retire'];
    for (const type of types) {
      const event = { id: 'x', type, year: 2032, coachName: 'Terry Vale' } as ChronicleEvent;
      expect(chronicleAccent(event)).toBe('green');
    }
  });

  it('maps season_end and scrapbook_note to default', () => {
    const season: ChronicleEvent = {
      id: 's', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference',
    };
    const scrap: ChronicleEvent = {
      id: 'sb', type: 'scrapbook_note', year: 2031, headline: 'Crowd roars',
    };
    expect(chronicleAccent(season)).toBe('default');
    expect(chronicleAccent(scrap)).toBe('default');
  });
});

describe('chronicleTitle', () => {
  it('returns readable titles per event type', () => {
    const cases: Array<[ChronicleEvent, string]> = [
      [{ id: 'c', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4' }, 'Championship Won'],
      [{ id: 'h', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB' }, 'Hall of Fame'],
      [
        { id: 'p', type: 'playoff_round', year: 2032, round: 'wild_card', outcome: 'win', finalScore: '24-10', headline: 'h' },
        'Wild Card Round',
      ],
      [{ id: 's', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference' }, 'Season End'],
      [{ id: 'cc', type: 'coach_championship', year: 2032, coachName: 'Vale' }, 'Coach Championship'],
      [{ id: 'ch', type: 'coach_hire', year: 2031, coachName: 'Vale' }, 'Coach Hire'],
      [{ id: 'cr', type: 'coach_retire', year: 2033, coachName: 'Vale' }, 'Coach Retirement'],
      [{ id: 'sb', type: 'scrapbook_note', year: 2031, headline: 'h' }, 'Scrapbook Note'],
    ];
    for (const [event, title] of cases) {
      expect(chronicleTitle(event)).toBe(title);
    }
  });
});

describe('chronicleBody', () => {
  it('formats championship body with abbr and record', () => {
    const event: ChronicleEvent = {
      id: 'c', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4',
    };
    expect(chronicleBody(event)).toBe('CHI finished 13-4 and closed the year with a title.');
  });

  it('formats hof body with name and position', () => {
    const event: ChronicleEvent = {
      id: 'h', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB',
    };
    expect(chronicleBody(event)).toBe('Cole Stone entered the Hall of Fame as a QB.');
  });

  it('formats hof body with saved epilogue context when present', () => {
    const event: ChronicleEvent = {
      id: 'h',
      type: 'hof_induction',
      year: 2032,
      playerName: 'Cole Stone',
      position: 'QB',
      epilogueCategory: 'broadcasting',
      epilogueHeadline: 'Cole Stone joins the booth',
      epilogueStory: 'Stone turns film study into appointment television.',
    };
    expect(chronicleBody(event)).toBe(
      'Cole Stone entered the Hall of Fame as a QB. Cole Stone joins the booth: Stone turns film study into appointment television.',
    );
  });

  it('formats playoff round body with outcome, score, and headline', () => {
    const event: ChronicleEvent = {
      id: 'p', type: 'playoff_round', year: 2032, round: 'super_bowl', outcome: 'win',
      finalScore: '27-20', headline: 'Crown',
    };
    expect(chronicleBody(event)).toBe('Win // 27-20 // Crown');
  });

  it('formats season_end with team, record, and title-cased finish', () => {
    const event: ChronicleEvent = {
      id: 's', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6',
      playoffFinish: 'conference',
    };
    expect(chronicleBody(event)).toBe('CHI wrapped the season at 11-6 with a Conference finish.');
  });

  it('formats coach events', () => {
    const hire: ChronicleEvent = { id: 'ch', type: 'coach_hire', year: 2031, coachName: 'Terry Vale' };
    const champ: ChronicleEvent = { id: 'cc', type: 'coach_championship', year: 2032, coachName: 'Terry Vale' };
    const ret: ChronicleEvent = { id: 'cr', type: 'coach_retire', year: 2033, coachName: 'Terry Vale' };
    expect(chronicleBody(hire)).toBe('Terry Vale took over the sideline.');
    expect(chronicleBody(champ)).toBe('Terry Vale guided the franchise to a championship season.');
    expect(chronicleBody(ret)).toBe('Terry Vale closed the coaching run.');
  });

  it('passes scrapbook headline through unchanged', () => {
    const event: ChronicleEvent = { id: 'sb', type: 'scrapbook_note', year: 2031, headline: 'Crowd goes wild' };
    expect(chronicleBody(event)).toBe('Crowd goes wild');
  });
});

describe('chronicleFacts', () => {
  it('returns team/record/year trio for championship events', () => {
    const event: ChronicleEvent = {
      id: 'c', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4',
    };
    expect(chronicleFacts(event)).toEqual([
      { label: 'Team', value: 'CHI' },
      { label: 'Record', value: '13-4' },
      { label: 'Year', value: '2032' },
    ]);
  });

  it('returns name/position/year for hof inductions', () => {
    const event: ChronicleEvent = {
      id: 'h', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB',
    };
    expect(chronicleFacts(event)).toEqual([
      { label: 'Name', value: 'Cole Stone' },
      { label: 'Position', value: 'QB' },
      { label: 'Induction', value: '2032' },
    ]);
  });

  it('adds a saved epilogue category fact for hof inductions when present', () => {
    const event: ChronicleEvent = {
      id: 'h',
      type: 'hof_induction',
      year: 2032,
      playerName: 'Cole Stone',
      position: 'QB',
      epilogueCategory: 'quiet_life',
      epilogueHeadline: 'Cole Stone chooses silence',
      epilogueStory: 'Stone stepped away from the cameras.',
    };
    expect(chronicleFacts(event)).toEqual([
      { label: 'Name', value: 'Cole Stone' },
      { label: 'Position', value: 'QB' },
      { label: 'Induction', value: '2032' },
      { label: 'Epilogue', value: 'Quiet Life' },
    ]);
  });

  it('returns four facts for playoff round events', () => {
    const event: ChronicleEvent = {
      id: 'p', type: 'playoff_round', year: 2032, round: 'super_bowl', outcome: 'win',
      finalScore: '27-20', headline: 'Crown',
    };
    expect(chronicleFacts(event)).toEqual([
      { label: 'Round', value: 'Super Bowl' },
      { label: 'Outcome', value: 'Win' },
      { label: 'Final', value: '27-20' },
      { label: 'Year', value: '2032' },
    ]);
  });

  it('returns coach/year pair for each coach event', () => {
    const hire: ChronicleEvent = { id: 'h', type: 'coach_hire', year: 2031, coachName: 'Terry Vale' };
    expect(chronicleFacts(hire)).toEqual([
      { label: 'Coach', value: 'Terry Vale' },
      { label: 'Year', value: '2031' },
    ]);
  });

  it('returns just the year for scrapbook notes', () => {
    const event: ChronicleEvent = { id: 'sb', type: 'scrapbook_note', year: 2031, headline: 'Crowd roars' };
    expect(chronicleFacts(event)).toEqual([{ label: 'Year', value: '2031' }]);
  });
});
