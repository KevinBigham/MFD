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
    background: 'Former playoff bench boss who scripts three innings ahead and treats matchup prep like an operations manual.',
    archetype: 'strategist',
    schemePreference: { offense: 'west_coast', defense: 'cover_3' },
    strengths: ['Weekly game planning', 'Situational discipline', 'Coordinator alignment'],
    weaknesses: ['Can overcoach hot players', 'Not naturally loose with veterans'],
    interviewQuote: 'Give me clarity on the identity and I will make the building execute it by Sunday.',
  },
  {
    id: 'nico_morales',
    name: 'Nico Morales',
    age: 44,
    background: 'Former player-development coordinator who built a reputation for turning anxious young rooms into confident, fast-playing units.',
    archetype: 'motivator',
    schemePreference: { offense: 'spread', defense: 'man_press' },
    strengths: ['Player buy-in', 'Energy and pace', 'Development runway for young starters'],
    weaknesses: ['Less rigid on detail', 'Can chase emotional momentum'],
    interviewQuote: 'Players do not need another speech. They need a standard they want to follow.',
  },
  {
    id: 'dorian_cross',
    name: 'Dorian Cross',
    age: 58,
    background: 'Longtime line coach and culture setter whose teams are known for physical practices and low-variance football.',
    archetype: 'disciplinarian',
    schemePreference: { offense: 'power_run', defense: '4-3' },
    strengths: ['Physical identity', 'Fundamentals', 'Mistake prevention'],
    weaknesses: ['Conservative on fourth-down edges', 'Less flexible with role experimentation'],
    interviewQuote: 'If we decide what we are, I can make the room live it every day.',
  },
] as const;

const SCOUT_CANDIDATES: readonly ScoutCandidate[] = [
  {
    id: 'zoe_wilcox',
    name: 'Zoe Wilcox',
    age: 39,
    background: 'Former research lead who built draft probability models and combines tracking dashboards for two front offices.',
    specialty: 'analytics_director',
    philosophy: 'Start with the signal, then pressure-test it on tape.',
    strengths: ['High-confidence measurables', 'National coverage model', 'Clean board discipline'],
    weaknesses: ['Cooler on personality reads', 'Can underrate late risers with thin data'],
    interviewQuote: 'If we can trust the baseline, we can spend human time where the model is still uncertain.',
  },
  {
    id: 'marvin_tate',
    name: 'Marvin Tate',
    age: 55,
    background: 'Thirty years on the road as an area scout, living in high school bleachers and turning whispers into real character reports.',
    specialty: 'tape_grinder',
    philosophy: 'Character tells you whether the tools will ever matter.',
    strengths: ['Regional relationships', 'Character and makeup', 'Same-region cross checks'],
    weaknesses: ['Less elegant data systems', 'Can hold old evaluations too long'],
    interviewQuote: 'You find the player on tape. You find the person in the room and in the town.',
  },
  {
    id: 'celia_duarte',
    name: 'Celia Duarte',
    age: 46,
    background: 'Cross-functional scouting director who bounced between analytics, pro scouting, and college tape before running blended boards.',
    specialty: 'blend',
    philosophy: 'If model and tape disagree, that is where the work starts.',
    strengths: ['Balanced board building', 'Process calibration', 'Cleaner tie-breakers late in the draft'],
    weaknesses: ['Less singular edge in one lane', 'Can leave upside on the table when signals split'],
    interviewQuote: 'I want a board that survives the room arguing with itself.',
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
