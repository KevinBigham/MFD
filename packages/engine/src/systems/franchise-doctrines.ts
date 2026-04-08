/**
 * Franchise Doctrines — Institutional memory policies unlocked by franchise events.
 *
 * Important franchise events permanently unlock policies (doctrines) that
 * provide passive bonuses and shape AI behavior. Displayed on Franchise Hub.
 */

// ── Types ──────────────────────────────────────────────

export interface DoctrineDef {
  id: string;
  name: string;
  description: string;
  /** How this doctrine was earned */
  origin: string;
  /** Passive bonus description */
  bonus: string;
  /** Category for display grouping */
  category: 'culture' | 'strategy' | 'reputation' | 'personnel';
}

export interface EarnedDoctrine extends DoctrineDef {
  earnedYear: number;
  earnedWeek: number;
}

export type DoctrineId =
  | 'hardline_policy'
  | 'trust_the_process'
  | 'pay_your_stars'
  | 'fresh_start'
  | 'draft_and_develop'
  | 'no_nonsense'
  | 'loyalty_first'
  | 'championship_dna'
  | 'cap_wizardry'
  | 'scouting_excellence'
  | 'iron_defense'
  | 'offensive_identity';

// ── Doctrine Catalog ───────────────────────────────────

export const DOCTRINE_DEFS: Record<DoctrineId, DoctrineDef> = {
  hardline_policy: {
    id: 'hardline_policy',
    name: 'Hardline Policy',
    description: 'The franchise takes a firm stance on holdouts and contract demands.',
    origin: 'Survived a player holdout',
    bonus: 'Holdout resistance +20% — players are less likely to hold out.',
    category: 'culture',
  },
  trust_the_process: {
    id: 'trust_the_process',
    name: 'Trust the Process',
    description: 'The franchise has proven that patience and rebuilding leads to championships.',
    origin: 'Won Super Bowl after a rebuilding phase',
    bonus: 'Owner patience +15% — the owner is more willing to wait for results.',
    category: 'strategy',
  },
  pay_your_stars: {
    id: 'pay_your_stars',
    name: 'Pay Your Stars',
    description: 'After losing a star to free agency, the franchise prioritizes retaining top talent.',
    origin: 'Lost a 85+ OVR player to free agency',
    bonus: 'AI prioritizes contract extensions for top players.',
    category: 'personnel',
  },
  fresh_start: {
    id: 'fresh_start',
    name: 'Fresh Start Philosophy',
    description: 'The franchise has seen coaching changes lead to improvement.',
    origin: 'Won more games after firing a head coach',
    bonus: 'Coaching carousel gives +2 candidate quality bonus.',
    category: 'strategy',
  },
  draft_and_develop: {
    id: 'draft_and_develop',
    name: 'Draft & Develop',
    description: 'The franchise builds through the draft rather than free agency.',
    origin: 'Had 3+ drafted players make the Pro Bowl in one season',
    bonus: 'Rookie development speed +10%.',
    category: 'personnel',
  },
  no_nonsense: {
    id: 'no_nonsense',
    name: 'No-Nonsense Culture',
    description: 'Problem players are dealt with swiftly and decisively.',
    origin: 'Cut or traded a high-OVR player with negative personality traits',
    bonus: 'Locker room toxicity decays 15% faster.',
    category: 'culture',
  },
  loyalty_first: {
    id: 'loyalty_first',
    name: 'Loyalty First',
    description: 'The franchise rewards loyalty — long-tenured players get special treatment.',
    origin: 'Had a player spend 10+ years with the franchise',
    bonus: 'Veteran re-sign discount: 5% salary reduction for loyal players.',
    category: 'culture',
  },
  championship_dna: {
    id: 'championship_dna',
    name: 'Championship DNA',
    description: 'Multiple championships have created a winning culture that attracts talent.',
    origin: 'Won 2+ Super Bowls',
    bonus: 'Free agent signing bonus: +5 desirability rating.',
    category: 'reputation',
  },
  cap_wizardry: {
    id: 'cap_wizardry',
    name: 'Cap Wizardry',
    description: 'The franchise has mastered salary cap management.',
    origin: 'Maintained 15%+ cap space for 3 consecutive years',
    bonus: 'Restructure savings +10%.',
    category: 'strategy',
  },
  scouting_excellence: {
    id: 'scouting_excellence',
    name: 'Scouting Excellence',
    description: 'The scouting department consistently finds hidden gems.',
    origin: 'Drafted 3+ players in rounds 4-7 who reached 80+ OVR',
    bonus: 'Late-round prospect visibility grade +1 tier.',
    category: 'personnel',
  },
  iron_defense: {
    id: 'iron_defense',
    name: 'Iron Defense',
    description: 'The franchise is known for fielding elite defenses.',
    origin: 'Finished top 3 in points allowed for 2+ consecutive seasons',
    bonus: 'Defensive FA interest +8 desirability.',
    category: 'reputation',
  },
  offensive_identity: {
    id: 'offensive_identity',
    name: 'Offensive Identity',
    description: 'The franchise is known for its explosive offensive system.',
    origin: 'Finished top 3 in points scored for 2+ consecutive seasons',
    bonus: 'Offensive FA interest +8 desirability.',
    category: 'reputation',
  },
};

// ── Public API ─────────────────────────────────────────

/** Get all available doctrines */
export function getAllDoctrines(): DoctrineDef[] {
  return Object.values(DOCTRINE_DEFS);
}

/** Get a doctrine by ID */
export function getDoctrineById(id: DoctrineId): DoctrineDef {
  return DOCTRINE_DEFS[id];
}

/** Check if a doctrine should be earned based on an event */
export function checkDoctrineEligibility(
  doctrineId: DoctrineId,
  earnedDoctrines: EarnedDoctrine[],
): boolean {
  // Can't earn the same doctrine twice
  return !earnedDoctrines.some((d) => d.id === doctrineId);
}

/** Award a doctrine to the franchise */
export function awardDoctrine(
  doctrineId: DoctrineId,
  year: number,
  week: number,
): EarnedDoctrine {
  return {
    ...DOCTRINE_DEFS[doctrineId],
    earnedYear: year,
    earnedWeek: week,
  };
}

/** Get doctrines by category for display grouping */
export function getDoctrinesByCategory(
  doctrines: EarnedDoctrine[],
): Record<DoctrineDef['category'], EarnedDoctrine[]> {
  const grouped: Record<DoctrineDef['category'], EarnedDoctrine[]> = {
    culture: [],
    strategy: [],
    reputation: [],
    personnel: [],
  };

  for (const doctrine of doctrines) {
    grouped[doctrine.category].push(doctrine);
  }

  return grouped;
}
