import type { Coach, Position, Scout, StaffMember, Team } from '../types';

export interface CoachCandidate {
  id: string;
  name: string;
  age: number;
  background: string;
  archetype: 'strategist' | 'motivator' | 'disciplinarian';
  schemePreference: {
    offense: string;
    defense: string;
  };
  strengths: string[];
  weaknesses: string[];
  interviewQuote: string;
}

export interface ScoutCandidate {
  id: string;
  name: string;
  age: number;
  background: string;
  specialty: 'analytics_director' | 'tape_grinder' | 'blend';
  philosophy: string;
  strengths: string[];
  weaknesses: string[];
  interviewQuote: string;
}

const COACH_CANDIDATES: readonly CoachCandidate[] = [
  {
    id: 'elias_rowe',
    name: 'Elias Rowe',
    age: 52,
    background: 'Former playoff head coach who scripts three series ahead and treats matchup prep like an operations manual.',
    archetype: 'strategist',
    schemePreference: { offense: 'west_coast', defense: 'cover_3' },
    strengths: ['Opponent-plan answers before Week 1', 'Fourth-down and clock rules assigned before Week 1', 'Coordinator responsibilities named before kickoff'],
    weaknesses: ['Scouting tasks must stay secondary or Game Plan calls stay unset by Week 1', 'Assign veteran leaders before early losses cut morale'],
    interviewQuote: 'Give me scheme calls and an assigned playcaller now; I will drill player jobs before Week 1 mistakes cost drives.',
  },
  {
    id: 'nico_morales',
    name: 'Nico Morales',
    age: 44,
    background: 'Former player-development coordinator who turns anxious young position groups into named Week 1 jobs with snap limits and backup protection.',
    archetype: 'motivator',
    schemePreference: { offense: 'spread', defense: 'man_press' },
    strengths: ['Named player jobs before kickoff', 'Fast reps for unsettled starters', 'Development reps for young starters'],
    weaknesses: ['Missed assignment details cost opener points', 'Slow corrections let the same mistake repeat'],
    interviewQuote: 'Name the starter job, backup job, and correction deadline before the same mistake costs opening points.',
  },
  {
    id: 'dorian_cross',
    name: 'Dorian Cross',
    age: 58,
    background: 'Longtime line coach whose teams assign physical practice jobs and cut Week 1 mistakes before kickoff.',
    archetype: 'disciplinarian',
    schemePreference: { offense: 'power_run', defense: '4-3' },
    strengths: ['Run-blocking and tackling jobs assigned before Week 1', 'Blocking and tackling cleanup before kickoff', 'Fewer Week 1 assignment mistakes'],
    weaknesses: ['Conservative fourth-down calls leave drives short', 'Assign veteran captains before early losses cut morale', 'Unassigned young-player snaps bury development reps before Week 1'],
    interviewQuote: 'Give me the roles first, and I will make the players practice those roles every day.',
  },
] as const;

const SCOUT_CANDIDATES: readonly ScoutCandidate[] = [
  {
    id: 'zoe_wilcox',
    name: 'Zoe Wilcox',
    age: 39,
    background: 'Former research lead who reads combine data, production, injury history, and film notes before picks are spent.',
    specialty: 'analytics_director',
    philosophy: 'Start with measurements, then match the player on film.',
    strengths: ['Measured size and speed before picks', 'National reports for early-round targets', 'Wasted-pick warnings before draft day'],
    weaknesses: ['No coach or interview notes before picks misses character warnings', 'Scarce reports leave late-riser role, medical limit, and pick cost unanswered before draft day'],
    interviewQuote: 'If the numbers and film agree, send scouts back to prospects whose role or medical limit still changes pick cost.',
  },
  {
    id: 'marvin_tate',
    name: 'Marvin Tate',
    age: 55,
    background: 'Thirty years on the road as an area scout, using coach input and practice visits to flag toughness, coachability, and wasted-pick cost before picks are spent.',
    specialty: 'tape_grinder',
    philosophy: 'Name character warnings because they change pick cost, assigned role, and development time.',
    strengths: ['Coach contacts for character and practice reports', 'Toughness and coachability reports', 'Same-region report comparisons before picks'],
    weaknesses: ['Slow injury and testing reports leave medical limits unresolved before picks', 'Old reports leave late medical or role changes unanswered before picks'],
    interviewQuote: 'Give me tape, coach notes, and medical limits before we spend a pick.',
  },
  {
    id: 'celia_duarte',
    name: 'Celia Duarte',
    age: 46,
    background: 'Cross-functional scouting director who bounced between analytics, pro scouting, and college tape before running blended draft processes.',
    specialty: 'blend',
    philosophy: 'If data and tape disagree, send scouts back before spending a pick.',
    strengths: ['Data-plus-tape reports before picks', 'Report disagreements sent back before draft day', 'Late-round tie-breakers tied to role, medical limits, and development fit'],
    weaknesses: ['Assign regional scouts before blind spots reach draft day', 'Unresolved report conflicts push you past players with assigned development snaps'],
    interviewQuote: 'I want pick reports that survive data, tape, and coach debate before we spend a pick.',
  },
] as const;

function cloneCoachCandidate(candidate: CoachCandidate): CoachCandidate {
  return {
    ...candidate,
    schemePreference: { ...candidate.schemePreference },
    strengths: [...candidate.strengths],
    weaknesses: [...candidate.weaknesses],
  };
}

function cloneScoutCandidate(candidate: ScoutCandidate): ScoutCandidate {
  return {
    ...candidate,
    strengths: [...candidate.strengths],
    weaknesses: [...candidate.weaknesses],
  };
}

export function getCoachCandidateCatalog(): CoachCandidate[] {
  return COACH_CANDIDATES.map(cloneCoachCandidate);
}

export function getScoutCandidateCatalog(): ScoutCandidate[] {
  return SCOUT_CANDIDATES.map(cloneScoutCandidate);
}

export function findCoachCandidate(candidateId: string): CoachCandidate | null {
  return getCoachCandidateCatalog().find((candidate) => candidate.id === candidateId) ?? null;
}

export function findScoutCandidate(candidateId: string): ScoutCandidate | null {
  return getScoutCandidateCatalog().find((candidate) => candidate.id === candidateId) ?? null;
}

function coachRatings(archetype: CoachCandidate['archetype']): Record<string, number> {
  if (archetype === 'motivator') {
    return { gameplan: 82, development: 87, motivation: 92, strategy: 78 };
  }
  if (archetype === 'disciplinarian') {
    return { gameplan: 84, development: 80, motivation: 85, strategy: 83 };
  }
  return { gameplan: 90, development: 82, motivation: 76, strategy: 92 };
}

function coachLevel(archetype: CoachCandidate['archetype']): number {
  if (archetype === 'motivator') return 5;
  if (archetype === 'disciplinarian') return 6;
  return 6;
}

function coachMirror(member: StaffMember): Coach {
  const [firstName, ...rest] = member.name.split(' ');
  return {
    id: member.id,
    firstName: firstName || 'Head',
    lastName: rest.join(' ') || 'Coach',
    role: 'HC',
    archetype: member.archetype,
    traits: [...member.traits],
    skillTree: {},
    xp: 0,
    reputation: Math.min(95, 40 + member.level * 8),
    tenure: 1,
  };
}

export function materializeHeadCoach(candidate: CoachCandidate, year: number): { staffMember: StaffMember; coachRecord: Coach } {
  const staffMember: StaffMember = {
    id: candidate.id,
    name: candidate.name,
    role: 'HC',
    archetype: candidate.archetype,
    traits: [],
    ratings: coachRatings(candidate.archetype),
    level: coachLevel(candidate.archetype),
    age: candidate.age,
    specialty75: null,
    term: 4,
    buyoutPenalty: 3,
    loyalty: 7,
    ambition: 6,
    schemeLean: {
      offense: candidate.schemePreference.offense,
      defense: candidate.schemePreference.defense,
    },
    lastHiredYear: year,
  };

  return {
    staffMember,
    coachRecord: coachMirror(staffMember),
  };
}

type ScoutSeed = Omit<Scout, 'id' | 'name'> & {
  key: string;
  firstName: string;
  lastName: string;
};

const ANALYTICS_SCOUTS: readonly ScoutSeed[] = [
  { key: 'national', firstName: 'Avery', lastName: 'Mason', tier: 'elite', specialty: null, scope: 'national', region: null, salary: 2.4, accuracy: 0.95 },
  { key: 'wr-east', firstName: 'Jordan', lastName: 'Hayes', tier: 'good', specialty: 'WR', scope: 'regional', region: 'east', salary: 1.7, accuracy: 0.9 },
  { key: 'qb-south', firstName: 'Taylor', lastName: 'Quinn', tier: 'good', specialty: 'QB', scope: 'regional', region: 'south', salary: 1.8, accuracy: 0.89 },
] as const;

const TAPE_GRINDER_SCOUTS: readonly ScoutSeed[] = [
  { key: 'wr-south', firstName: 'Morgan', lastName: 'Sawyer', tier: 'good', specialty: 'WR', scope: 'regional', region: 'south', salary: 1.6, accuracy: 0.88 },
  { key: 'dl-midwest', firstName: 'Riley', lastName: 'Brooks', tier: 'good', specialty: 'DL', scope: 'regional', region: 'midwest', salary: 1.5, accuracy: 0.86 },
  { key: 'cb-west', firstName: 'Parker', lastName: 'Foster', tier: 'good', specialty: 'CB', scope: 'regional', region: 'west', salary: 1.55, accuracy: 0.87 },
] as const;

const BLEND_SCOUTS: readonly ScoutSeed[] = [
  { key: 'national', firstName: 'Casey', lastName: 'Perry', tier: 'good', specialty: null, scope: 'national', region: null, salary: 1.9, accuracy: 0.9 },
  { key: 'lb-south', firstName: 'Devin', lastName: 'Caldwell', tier: 'average', specialty: 'LB', scope: 'regional', region: 'south', salary: 1.2, accuracy: 0.83 },
  { key: 'ol-west', firstName: 'Reese', lastName: 'Brooks', tier: 'average', specialty: 'OL', scope: 'regional', region: 'west', salary: 1.15, accuracy: 0.82 },
] as const;

function scoutPoolForSpecialty(specialty: ScoutCandidate['specialty']): readonly ScoutSeed[] {
  if (specialty === 'analytics_director') return ANALYTICS_SCOUTS;
  if (specialty === 'tape_grinder') return TAPE_GRINDER_SCOUTS;
  return BLEND_SCOUTS;
}

export function seedScoutingStaff(candidate: ScoutCandidate, team: Team): Scout[] {
  return scoutPoolForSpecialty(candidate.specialty).map((seed) => ({
    id: `${candidate.id}-${team.id}-${seed.key}`,
    name: `${seed.firstName} ${seed.lastName}`,
    tier: seed.tier,
    specialty: seed.specialty as Position | null,
    scope: seed.scope,
    region: seed.region,
    salary: seed.salary,
    accuracy: seed.accuracy,
  }));
}
