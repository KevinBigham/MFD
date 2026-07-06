/**
 * Sprint 43 — AGM weekly recommendations + screen tips.
 */

import { describe, it, expect } from 'vitest';
import { getAGMWeeklyRecommendations, getScreenTip } from './agm';
import type { GameState, Team, Player } from '../types';

const SCREEN_TIP_ROUTES = [
  '/',
  '/roster',
  '/depth-chart',
  '/schedule',
  '/standings',
  '/inbox',
  '/game-plan',
  '/contracts',
  '/trades',
  '/scouting',
  '/draft',
  '/free-agency',
  '/training-camp',
  '/briefing',
  '/broadcast',
  '/franchise',
] as const;

function makePlayer(id: string, pos: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    name: `Test ${id}`,
    pos: pos as Player['pos'],
    age: 25,
    ovr: 75,
    potential: 80,
    injury: null,
    contract: {} as Player['contract'],
    traits: [],
    ...overrides,
  } as Player;
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't_user',
    city: 'Testville',
    name: 'Testers',
    abbr: 'TST',
    conference: 'NFC',
    division: 'NFC East',
    isUser: true,
    roster: [],
    depthChart: {},
    capSpace: 20_000_000,
    capUsed: 180_000_000,
    wins: 3,
    losses: 1,
    ties: 0,
    ...overrides,
  } as unknown as Team;
}

function makeGame(team: Team, opts: Partial<GameState> = {}): GameState {
  return {
    version: 31,
    seed: 1,
    year: 2026,
    week: 5,
    phase: 'regular_season',
    teams: { [team.id]: team },
    players: Object.fromEntries(team.roster.map((p) => [p.id, p])),
    schedule: [],
    ...opts,
  } as unknown as GameState;
}

describe('getAGMWeeklyRecommendations', () => {
  it('returns an empty list when there is no user team', () => {
    const game = makeGame(makeTeam({ isUser: false }));
    expect(getAGMWeeklyRecommendations(game)).toEqual([]);
  });

  it('flags injured starters as urgent priority', () => {
    const injured = makePlayer('p_qb', 'QB', {
      injury: {
        id: 'inj1',
        type: 'hamstring',
        severity: 'out',
        severityTier: 'moderate',
        gamesOut: 3,
        gamesRecovered: 0,
        reinjuryRisk: 0.1,
        affectedRatings: [],
        ratingPenalty: 0,
        onIR: false,
      },
    });
    const team = makeTeam({ roster: [injured] });
    const game = makeGame(team);

    const recs = getAGMWeeklyRecommendations(game);
    expect(recs[0]?.id).toBe('injury_watch');
    expect(recs[0]?.priority).toBe('urgent');
    expect(recs[0]?.title).toContain('Injury fix');
    expect(recs[0]?.title).not.toContain('Injury watch');
    expect(recs[0]?.targetRoute).toBe('/roster');
    expect(recs[0]?.body).toContain('Fix the Depth Chart');
    expect(recs[0]?.body).toContain('free agent, waiver claim, or practice-squad player');
    expect(recs[0]?.body).toContain('backup is not playable');
  });

  it('flags cap trouble when capSpace is below $1M', () => {
    const team = makeTeam({ capSpace: 500_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team));
    const capRec = recs.find((r) => r.id === 'cap_trouble');
    expect(capRec).toBeDefined();
    expect(capRec?.priority).toBe('high');
    expect(capRec?.body).toContain('Open Contracts or Cap Lab before signing, trading, or extending');
    expect(capRec?.body).toContain('injury replacements and extensions lose the cap space they need');
    expect(capRec?.body).not.toMatch(/more bills hit/i);
  });

  it('bumps cap trouble to urgent when over the cap', () => {
    const team = makeTeam({ capSpace: -250_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team));
    const capRec = recs.find((r) => r.id === 'cap_trouble');
    expect(capRec?.priority).toBe('urgent');
  });

  it('sorts urgent items above medium items and respects the limit', () => {
    const injured = makePlayer('p_rb', 'RB', {
      injury: {
        id: 'inj2',
        type: 'acl',
        severity: 'out',
        severityTier: 'severe',
        gamesOut: 6,
        gamesRecovered: 0,
        reinjuryRisk: 0.2,
        affectedRatings: [],
        ratingPenalty: 0,
        onIR: false,
      },
    });
    const team = makeTeam({ roster: [injured], capSpace: 200_000 });
    const recs = getAGMWeeklyRecommendations(makeGame(team), 2);
    expect(recs.length).toBeLessThanOrEqual(2);
    expect(recs[0]?.priority).toBe('urgent');
  });

  it('makes recommendations profile-aware for durable AGM identity', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000 });
    const opponent = makeTeam({ id: 't_opp', city: 'Rival', name: 'Rivals', isUser: false, wins: 4, losses: 0 });
    const game = makeGame(team, {
      teams: { [team.id]: team, [opponent.id]: opponent },
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'coach_d_hardaway',
        agmImpactLog: [],
      },
      schedule: [{
        week: 5,
        games: [{ homeTeamId: team.id, awayTeamId: opponent.id, result: null }],
      }],
    } as Partial<GameState>);

    const recs = getAGMWeeklyRecommendations(game, 3);
    const opponentRec = recs.find((rec) => rec.id === 'next_opponent');

    expect(opponentRec?.priority).toBe('high');
    expect(opponentRec?.body).toContain('Set protection, coverage, and run-defense answers before Advance Week');
    expect(opponentRec?.body).toContain('skipping it lets their top matchup attack an exposed starter');
    expect(opponentRec?.body).not.toMatch(/prep board|game-week edge/i);
    expect(opponentRec?.body).not.toMatch(/weakest matchup|best unit/i);
  });

  it('keeps normal opponent scouting guidance action-first with a consequence', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000 });
    const opponent = makeTeam({ id: 't_opp', city: 'Rival', name: 'Rivals', isUser: false, wins: 4, losses: 0 });
    const game = makeGame(team, {
      teams: { [team.id]: team, [opponent.id]: opponent },
      schedule: [{
        week: 5,
        games: [{ homeTeamId: team.id, awayTeamId: opponent.id, result: null }],
      }],
    } as Partial<GameState>);

    const recs = getAGMWeeklyRecommendations(game, 3);
    const opponentRec = recs.find((rec) => rec.id === 'next_opponent');

    expect(opponentRec?.body).toContain('Open Game Plan before Advance Week to set protection, coverage, and run-defense answers');
    expect(opponentRec?.body).toContain('skipping matchup work leaves a starter exposed where they attack first');
    expect(opponentRec?.body).not.toContain('bad loss');
    expect(opponentRec?.body).not.toMatch(/match strengths|worst matchup/i);
  });

  it('keeps roster-gap recommendations concrete for Sandra without promise shorthand', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000, roster: [] });
    const recs = getAGMWeeklyRecommendations(makeGame(team, {
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'sandra_chen',
        agmImpactLog: [],
      },
    } as Partial<GameState>), 6);
    const gapRec = recs.find((rec) => rec.id === 'roster_gaps');

    expect(gapRec?.body).toContain('Add depth or lower the starter workload before one injury puts an unplanned starter on the field');
    expect(gapRec?.body).not.toContain('forces a bad lineup');
    expect(gapRec?.body).not.toMatch(/personnel promises|role clarity matters/i);
  });

  it('keeps roster-gap recommendations action-first for the default AGM', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000, roster: [] });
    const recs = getAGMWeeklyRecommendations(makeGame(team), 6);
    const gapRec = recs.find((rec) => rec.id === 'roster_gaps');

    expect(gapRec?.body).toContain('Open Team Needs, waivers, or practice squad before Advance Week');
    expect(gapRec?.body).toContain('one injury puts an unassigned backup in the next game');
    expect(gapRec?.body).not.toContain('force a bad lineup');
    expect(gapRec?.body).not.toMatch(/Use Team Needs, waivers, or practice squad before Advance Week if/i);
  });

  it('explains owner mandate consequences through concrete routes', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000 });
    const game = makeGame(team, {
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'marcus_webb',
        agmImpactLog: [],
      },
      ownerMandates: [{
        id: 'mandate_cap',
        teamId: team.id,
        year: 2026,
        goalId: 'cap_health',
        label: 'Protect cap health',
        description: 'Keep cap stable.',
        slot: 'target',
        selectedIndex: 1,
        createdWeek: 1,
        createdByAGMProfileId: 'marcus_webb',
        status: 'active',
        progress: {
          value: 4,
          target: 10,
          percent: 40,
          label: 'Cap health at risk',
          detail: 'Cap health is below target.',
          status: 'at_risk',
        },
        evaluation: null,
      }],
    } as Partial<GameState>);

    const mandateRec = getAGMWeeklyRecommendations(game, 8).find((rec) => rec.id === 'marcus_cap_mandate');
    expect(mandateRec?.body).toContain('Open Contracts or Cap Lab before Advance Week');
    expect(mandateRec?.body).toContain('cuts owner patience at season end');
    expect(mandateRec?.body).not.toContain('raise owner pressure');
    expect(mandateRec?.body).not.toContain('owner trust');
    expect(mandateRec?.body).not.toMatch(/owner-facing|consequence tuning/i);
  });

  it('explains development mandate consequences without optimism shorthand', () => {
    const team = makeTeam({ id: 't_user', capSpace: 25_000_000 });
    const game = makeGame(team, {
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'sandra_chen',
        agmImpactLog: [],
      },
      ownerMandates: [{
        id: 'mandate_development',
        teamId: team.id,
        year: 2026,
        goalId: 'rebuild_progress',
        label: 'Develop young core',
        description: 'Show youth progress.',
        slot: 'target',
        selectedIndex: 1,
        createdWeek: 1,
        createdByAGMProfileId: 'sandra_chen',
        status: 'active',
        progress: {
          value: 2,
          target: 5,
          percent: 40,
          label: 'Young core behind pace',
          detail: 'Young contributors are below target.',
          status: 'at_risk',
        },
        evaluation: null,
      }],
    } as Partial<GameState>);

    const mandateRec = getAGMWeeklyRecommendations(game, 8).find((rec) => rec.id === 'sandra_development_mandate');
    expect(mandateRec?.body).toContain('Keep young players in assigned weekly jobs before Advance Week');
    expect(mandateRec?.body).toContain('changing snaps too often fails the development goal');
    expect(mandateRec?.body).not.toMatch(/personnel edge|optimism|stable roles|role clarity/i);
  });

  it('keeps weekly AGM recommendation consequences direct instead of soft possibility language', () => {
    const injured = makePlayer('p_qb', 'QB', {
      injury: {
        id: 'inj1',
        type: 'hamstring',
        severity: 'out',
        severityTier: 'moderate',
        gamesOut: 3,
        gamesRecovered: 0,
        reinjuryRisk: 0.1,
        affectedRatings: [],
        ratingPenalty: 0,
        onIR: false,
      },
    });
    const team = makeTeam({ id: 't_user', roster: [injured], capSpace: 500_000 });
    const opponent = makeTeam({ id: 't_opp', city: 'Rival', name: 'Rivals', isUser: false, wins: 4, losses: 0 });
    const game = makeGame(team, {
      teams: { [team.id]: team, [opponent.id]: opponent },
      schedule: [{
        week: 5,
        games: [{ homeTeamId: team.id, awayTeamId: opponent.id, result: null }],
      }],
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
        agmProfileId: 'sandra_chen',
        agmImpactLog: [],
      },
      ownerMandates: [{
        id: 'mandate_development',
        teamId: team.id,
        year: 2026,
        goalId: 'rebuild_progress',
        label: 'Develop young core',
        description: 'Show youth progress.',
        slot: 'target',
        selectedIndex: 1,
        createdWeek: 1,
        createdByAGMProfileId: 'sandra_chen',
        status: 'active',
        progress: {
          value: 2,
          target: 5,
          percent: 40,
          label: 'Young core behind pace',
          detail: 'Young contributors are below target.',
          status: 'at_risk',
        },
        evaluation: null,
      }],
    } as Partial<GameState>);

    const copy = getAGMWeeklyRecommendations(game, 8).map((rec) => rec.body).join(' ');

    expect(copy).not.toMatch(/can lose cap space|can leave the wrong starter|can put the wrong backup|can cut owner patience|can fail the development goal/i);
    expect(copy).toContain('injury replacements and extensions lose the cap space they need');
    expect(copy).toContain('skipping matchup work leaves a starter exposed where they attack first');
    expect(copy).not.toMatch(/weakest matchup|best unit|match strengths|worst matchup/i);
    expect(copy).toContain('changing snaps too often fails the development goal');
  });
});

describe('getScreenTip', () => {
  it('returns a tip for a known route', () => {
    const tip = getScreenTip('/roster');
    expect(tip).not.toBeNull();
    expect(tip?.id).toMatch(/^tip_/);
    expect(tip?.title.length).toBeGreaterThan(0);
  });

  it('keeps first-visit screen tips practical and consequence-first', () => {
    const copy = SCREEN_TIP_ROUTES
      .map((route) => {
        const tip = getScreenTip(route);
        expect(tip, route).not.toBeNull();
        return `${tip!.title} ${tip!.body}`;
      })
      .join(' ');

    expect(copy).toMatch(/\b(Advance Week|injuries|owner|depth|Game Plan|cap|cost|deadline|trade|cut|role|risk|loss|fix)\b/i);
    expect(copy).not.toMatch(/\b(command center|work outward|ride with|story tell itself|coin-flip|pulse|everything you've built|league is talking|every opponent, every week|weather windows|cap is a scoreboard|spend with intention|year ahead|Trade from surplus|roster holes?)\b/i);
    expect(copy).not.toMatch(/\b(Who plays when it matters|safer Game Plan|Franchise standards|long-term standards)\b/i);
    expect(copy).not.toMatch(/\b(Know your 53|Who plays key snaps|Division race|Beat them before kickoff|Every team has needs|The future gets drafted today|Long-term franchise|Bad reads|long-term direction)\b/i);
    expect(copy).not.toMatch(/\b(thin in three years|future holes?|roster holes?|poor fit|Reaching for fit)\b/i);
    expect(copy).not.toMatch(/scary backup spots/i);
    expect(copy).not.toMatch(/urgent weekly choices|after urgent/i);
    expect(copy).not.toMatch(/\bclick Advance\b/i);
    expect(copy).not.toMatch(/\b(Read injuries|Check opponent strength|Check buy\/sell timing|Review expiring decisions|Check cap space|Read what your AGM flags|Check long-term|Review owner approval)\b/i);
    expect(copy).not.toMatch(/\b(Read|Check|Review)\b/i);
    expect(copy).not.toMatch(/\b(?:swing plays|key drives)\b/i);
    expect(copy).not.toMatch(/Late tie-breakers|wins you lock in|change reactions/i);
    expect(copy).not.toMatch(/bad batches|standings justify|justify the cost|bad claims|bad-weather|may require/i);
    expect(copy).not.toMatch(/healthy strengths|vulnerable calls|winnable matchup|wins one column|Know before you draft|finite scouting budget|future starter needs|lost talent creates/i);
    expect(copy).not.toMatch(/Compare the division first|Compare healthy starters|Compare the return|Compare best player available|Compare owner approval|Name best player available|critical need|passes on better talent/i);
    expect(copy).not.toMatch(/Injuries and fatigue use this saved order/i);
    expect(copy).not.toMatch(/\bUse\b/);
    expect(copy).toContain('Open Action Center first for injuries, owner requests, decisions, and next opponent');
    expect(copy).toContain('unresolved items lock into the next game');
    expect(copy).toContain('Set rest and weather calls');
    expect(copy).toContain('Open Schedule for opponent strength, byes, short weeks, wind, and rain');
    expect(copy).toContain('missed rest creates starter fatigue and weather shrinks calls');
    expect(copy).toContain('Scout starter jobs');
    expect(copy).toContain('Spend scouting budget on positions that must start soon');
    expect(copy).toContain('Unassigned role answers, medical limits, or coachability warnings force a draft reach');
    expect(copy).not.toContain('Scout starter needs');
    expect(copy).not.toContain('Ignoring role answers, medical limits, or coachability warnings forces a draft reach');
    expect(copy).not.toContain('Ignoring role, medical, or trait warnings forces a draft reach');
    expect(copy).toContain('backup spots that would play after one injury before Advance Week');
    expect(copy).toContain('A missed tiebreaker turns one saved pick or rested starter into a lost playoff spot');
    expect(copy).toContain('Unanswered items expire, remove offers, or cut owner patience');
    expect(copy).toContain('Name result cause Open Broadcast after games to name turnovers, sacks, injuries, and failed drives.');
    expect(copy).toContain('Then change Roster, Depth Chart, or Game Plan before Advance Week; unfixed misses repeat next game');
    expect(copy).toContain('opponent pass rush, coverage, and run-defense targets');
    expect(copy).not.toContain('Find what broke the drive');
    expect(copy).not.toContain('decide whether next week needs a roster move');
    expect(copy).toContain('Name the return, cap hit, depth loss, and pick cost before accepting');
    expect(copy).toContain('Name role before pick');
    expect(copy).toContain('Name the top player on your board, the starter or backup job, and the rookie role before each pick');
    expect(copy).not.toContain('Pick need vs talent');
    expect(copy).toContain('leaves a stronger pick unused and extends the roster gap');
    expect(copy).not.toMatch(/skipping it can lock|tiebreaker can turn|items can expire|cap or depth can weaken|warnings can force|without that role can pass|role can block cap space|wrong reps can lower|briefing can leave/i);
  });

  it('makes every first-visit screen tip independently actionable', () => {
    const actionCue =
      /\b(answer|sort|order|verify|compare|open|spend|name|accepting|bidding|choose|protect|trade|cut|replace|restructure|assign|set|walk away)\b/i;
    const consequenceCue =
      /\b(before|then|otherwise|can|will|not|weak|bad|injur\w*|fatigue|deadline|expire|cost|lost|loss|future|later|next|all season|morale|cap space|owner|pressure|lineup|depth|contract|extension|draft day|free-agent|Advance Week|game locks|locked)\b/i;

    for (const route of SCREEN_TIP_ROUTES) {
      const tip = getScreenTip(route);
      expect(tip, route).not.toBeNull();
      expect(tip!.body, `${route}: ${tip!.body}`).toMatch(actionCue);
      expect(tip!.body, `${route}: ${tip!.body}`).toMatch(consequenceCue);
      expect(tip!.body.length, route).toBeLessThanOrEqual(230);
    }
  });

  it('returns null for an unknown route', () => {
    expect(getScreenTip('/nonexistent-route')).toBeNull();
  });
});
