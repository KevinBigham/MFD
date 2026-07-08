import { describe, expect, it } from 'vitest';

import type { Team } from '../types';
import {
  findCoachCandidate,
  findScoutCandidate,
  getCoachCandidateCatalog,
  getScoutCandidateCatalog,
  materializeHeadCoach,
  seedScoutingStaff,
} from './setup-hiring-catalog';

function team(id = 'afce1'): Team {
  return { id } as Team;
}

const VAGUE_CATALOG_COPY = /\b(?:building execute|young rooms|runway|room live|board discipline|person in the room|blended boards|board building|board that survives|war room|right hand|dogs|locker room|low-variance|fourth-down edges|clean draft|singular edge|signals split|emotional momentum|start with the signal|thin data|turning whispers|cleaner tie-breakers|clearer tie-breakers|Coordinator alignment|Player buy-in|Player trust|standard they want to follow|overcoach hot players|loose with veterans|Less rigid on detail|tighten mistakes|Less elegant data systems|No single elite scouting lane|leave upside on the table|culture setter|Physical identity|draft probability models|High-confidence measurables|National coverage model|trust the baseline|model is still uncertain|If model and tape disagree|model and tape disagree|survive model|real character reports|Character tells|learn the person|Needs help keeping veterans engaged|Needs staff help on personality reads|Needs strong regional scouts to fill blind spots|Situational discipline|Fundamentals|Fast practice tempo|Process calibration|Clear pick-risk discipline|Verified measurables|National prospect coverage|Balanced pick reports|Regional relationships|worth developing)\b/i;
const STALE_CATALOG_SCOUT_GRADE_COPY =
  /\b(?:draft grades lock|Clear draft-grade discipline|draft grades that survive|draft-grade building|Needs staff-owned personality checks before draft grades lock|staff-owned personality checks|pick value|stale grades)\b/i;
const STALE_CANDIDATE_CONSEQUENCE_COPY =
  /\b(?:players can follow|players ready|clear Week 1 roles|Player role clarity|clear roles|clear role rules|Can bury young players|we can spend more scout time|can miss late risers|can leave medical risk unresolved|can hide late medical|can make you skip|can slow Week 1 calls|can cost opener points|morale can drop|Too many checks delay Week 1 calls|Needs a veteran-engagement plan before morale slips|Conservative on fourth-down calls|Needs veteran captains assigned|Former research lead who compares|Needs coach and interview notes|Needs regional scouts assigned|Unassigned young-player snaps bury needed|players who need assigned development snaps|Add coach and interview character notes)\b/i;
const RECENT_STALE_SCOUT_RISK_COPY =
  /\b(?:Pick-risk warnings|pick risk|role or medical risk|medical risk before|character risk|role, medical, and traits|medical warnings unresolved)\b/i;
const RESTRICTIVE_CATALOG_COPY =
  /\b(?:check|choose|hire|use|verify)\b[^.!?;]*(?:only if|only when|only after|unless)\b/i;

describe('setup-hiring-catalog', () => {
  it('returns clone-safe coach candidate catalogs for the first-run setup UI', () => {
    const catalog = getCoachCandidateCatalog();

    expect(catalog.map((candidate) => candidate.id)).toEqual([
      'elias_rowe',
      'nico_morales',
      'dorian_cross',
    ]);
    expect(catalog.map((candidate) => candidate.archetype)).toEqual([
      'strategist',
      'motivator',
      'disciplinarian',
    ]);
    expect(catalog.map((candidate) => candidate.schemePreference)).toEqual([
      { offense: 'west_coast', defense: 'cover_3' },
      { offense: 'spread', defense: 'man_press' },
      { offense: 'power_run', defense: '4-3' },
    ]);

    catalog[0]!.schemePreference.offense = 'mutated';
    catalog[0]!.strengths.push('mutated strength');
    catalog[0]!.weaknesses.push('mutated weakness');

    const fresh = getCoachCandidateCatalog()[0]!;
    expect(fresh.schemePreference.offense).toBe('west_coast');
    expect(fresh.strengths).not.toContain('mutated strength');
    expect(fresh.weaknesses).not.toContain('mutated weakness');
  });

  it('returns clone-safe scout candidate catalogs for the first-run setup UI', () => {
    const catalog = getScoutCandidateCatalog();

    expect(catalog.map((candidate) => candidate.id)).toEqual([
      'zoe_wilcox',
      'marvin_tate',
      'celia_duarte',
    ]);
    expect(catalog.map((candidate) => candidate.specialty)).toEqual([
      'analytics_director',
      'tape_grinder',
      'blend',
    ]);

    catalog[0]!.strengths.push('mutated strength');
    catalog[0]!.weaknesses.push('mutated weakness');

    const fresh = getScoutCandidateCatalog()[0]!;
    expect(fresh.strengths).not.toContain('mutated strength');
    expect(fresh.weaknesses).not.toContain('mutated weakness');
  });

  it('finds candidates by id and returns null for unknown setup choices', () => {
    expect(findCoachCandidate('nico_morales')).toMatchObject({
      name: 'Nico Morales',
      archetype: 'motivator',
    });
    expect(findCoachCandidate('unknown_coach')).toBeNull();

    expect(findScoutCandidate('marvin_tate')).toMatchObject({
      name: 'Marvin Tate',
      specialty: 'tape_grinder',
    });
    expect(findScoutCandidate('unknown_scout')).toBeNull();
  });

  it('keeps first-run candidate copy focused on role and consequence', () => {
    const visibleCopy = [
      ...getCoachCandidateCatalog().flatMap((candidate) => [
        candidate.background,
        candidate.interviewQuote,
        ...candidate.strengths,
        ...candidate.weaknesses,
      ]),
      ...getScoutCandidateCatalog().flatMap((candidate) => [
        candidate.background,
        candidate.philosophy,
        candidate.interviewQuote,
        ...candidate.strengths,
        ...candidate.weaknesses,
      ]),
    ].join(' ');

    expect(visibleCopy).not.toMatch(VAGUE_CATALOG_COPY);
    expect(visibleCopy).not.toMatch(STALE_CATALOG_SCOUT_GRADE_COPY);
    expect(visibleCopy).not.toMatch(STALE_CANDIDATE_CONSEQUENCE_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SCOUT_RISK_COPY);
    expect(visibleCopy).not.toMatch(RESTRICTIVE_CATALOG_COPY);
    expect(visibleCopy).toMatch(/\b(?:roles|staff|players|Week 1|development|reps|draft|grades|pick|medical limit|data|tape|coach)\b/i);
    expect(visibleCopy).toMatch(/\b(?:practice those roles|starter job, backup job|spend a pick|role or medical limit|Fewer Week 1 assignment mistakes)\b/i);
    expect(visibleCopy).toContain('Fourth-down and clock rules assigned before Week 1');
    expect(visibleCopy).toContain('Scouting tasks must stay secondary or Game Plan calls stay unset by Week 1');
    expect(visibleCopy).toContain('Missed assignment details cost opener points');
    expect(visibleCopy).toContain('Unassigned young-player snaps bury development reps before Week 1');
    expect(visibleCopy).toContain('Wasted-pick warnings before draft day');
    expect(visibleCopy).toContain('Name character warnings because they change pick cost, assigned role, and development time.');
    expect(visibleCopy).toContain('Slow injury and testing reports leave medical limits unresolved before picks');
    expect(visibleCopy).toContain('Late-round tie-breakers tied to role, medical limits, and development fit');
    expect(visibleCopy).toContain('Unresolved report conflicts push you past players with assigned development snaps');
    expect(visibleCopy).toContain('Assign veteran leaders before early losses cut morale');
    expect(visibleCopy).toContain('Conservative fourth-down calls leave drives short');
    expect(visibleCopy).toContain('No coach or interview notes before picks misses character warnings');
    expect(visibleCopy).toContain('Scarce reports leave late-riser role, medical limit, and pick cost unanswered before draft day');
    expect(visibleCopy).toContain('Old reports leave late medical or role changes unanswered before picks');
    expect(visibleCopy).toContain('Assign regional scouts before blind spots reach draft day');
    expect(visibleCopy).toContain('Unresolved report conflicts push you past players with assigned development snaps');
  });

  it.each([
    ['elias_rowe', 2026, { gameplan: 90, development: 82, motivation: 76, strategy: 92 }, 6, 88],
    ['nico_morales', 2027, { gameplan: 82, development: 87, motivation: 92, strategy: 78 }, 5, 80],
    ['dorian_cross', 2028, { gameplan: 84, development: 80, motivation: 85, strategy: 83 }, 6, 88],
  ] as const)('materializes %s into the setup HC staff mirror', (candidateId, year, ratings, level, reputation) => {
    const candidate = findCoachCandidate(candidateId)!;
    const { staffMember, coachRecord } = materializeHeadCoach(candidate, year);

    expect(staffMember).toMatchObject({
      id: candidate.id,
      name: candidate.name,
      role: 'HC',
      archetype: candidate.archetype,
      ratings,
      level,
      age: candidate.age,
      specialty75: null,
      term: 4,
      buyoutPenalty: 3,
      loyalty: 7,
      ambition: 6,
      schemeLean: candidate.schemePreference,
      lastHiredYear: year,
    });
    expect(staffMember.traits).toEqual([]);

    expect(coachRecord).toMatchObject({
      id: candidate.id,
      firstName: candidate.name.split(' ')[0],
      lastName: candidate.name.split(' ').slice(1).join(' '),
      role: 'HC',
      archetype: candidate.archetype,
      skillTree: {},
      xp: 0,
      reputation,
      tenure: 1,
    });
    expect(coachRecord.traits).toEqual([]);
  });

  it('seeds analytics director scouting staff with a national model lead and regional specialists', () => {
    const scouts = seedScoutingStaff(findScoutCandidate('zoe_wilcox')!, team('team-a'));

    expect(scouts).toEqual([
      { id: 'zoe_wilcox-team-a-national', name: 'Avery Mason', tier: 'elite', specialty: null, scope: 'national', region: null, salary: 2.4, accuracy: 0.95 },
      { id: 'zoe_wilcox-team-a-wr-east', name: 'Jordan Hayes', tier: 'good', specialty: 'WR', scope: 'regional', region: 'east', salary: 1.7, accuracy: 0.9 },
      { id: 'zoe_wilcox-team-a-qb-south', name: 'Taylor Quinn', tier: 'good', specialty: 'QB', scope: 'regional', region: 'south', salary: 1.8, accuracy: 0.89 },
    ]);
  });

  it('seeds tape-grinder and blended scouting staffs from their own pools', () => {
    const tape = seedScoutingStaff(findScoutCandidate('marvin_tate')!, team('team-b'));
    const blend = seedScoutingStaff(findScoutCandidate('celia_duarte')!, team('team-c'));

    expect(tape.map((scout) => [scout.id, scout.name, scout.specialty, scout.region, scout.accuracy])).toEqual([
      ['marvin_tate-team-b-wr-south', 'Morgan Sawyer', 'WR', 'south', 0.88],
      ['marvin_tate-team-b-dl-midwest', 'Riley Brooks', 'DL', 'midwest', 0.86],
      ['marvin_tate-team-b-cb-west', 'Parker Foster', 'CB', 'west', 0.87],
    ]);
    expect(blend.map((scout) => [scout.id, scout.name, scout.tier, scout.specialty, scout.region])).toEqual([
      ['celia_duarte-team-c-national', 'Casey Perry', 'good', null, null],
      ['celia_duarte-team-c-lb-south', 'Devin Caldwell', 'average', 'LB', 'south'],
      ['celia_duarte-team-c-ol-west', 'Reese Brooks', 'average', 'OL', 'west'],
    ]);
  });
});
