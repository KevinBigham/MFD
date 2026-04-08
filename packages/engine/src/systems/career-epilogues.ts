/**
 * Career Epilogues — Trait-based retirement stories for retiring players.
 *
 * When legends retire, their dominant traits determine what they do
 * after football. Displayed in HOF, jersey retirement, and dynasty timeline.
 */
import type { PrngFn } from '../rng';
import type { Player, TraitId } from '../types';

// ── Types ──────────────────────────────────────────────

export interface CareerEpilogue {
  playerId: string;
  playerName: string;
  headline: string;
  story: string;
  category: EpilogueCategory;
}

export type EpilogueCategory =
  | 'broadcasting'
  | 'coaching'
  | 'business'
  | 'entertainment'
  | 'philanthropy'
  | 'quiet_life'
  | 'writing'
  | 'controversy';

// ── Templates ──────────────────────────────────────────

interface EpilogueTemplate {
  traits: readonly TraitId[];
  category: EpilogueCategory;
  headlines: readonly string[];
  stories: readonly string[];
}

const TEMPLATES: readonly EpilogueTemplate[] = [
  {
    traits: ['film_junkie'],
    category: 'broadcasting',
    headlines: [
      '{{name}} Joins MFSN Broadcast Team',
      '{{name}} Named Lead Analyst at MFSN',
    ],
    stories: [
      '{{name}} parlayed a legendary film study habit into a broadcasting career, becoming one of the most respected analysts on MFSN.',
      'Known for obsessive preparation during playing days, {{name}} now breaks down game film for millions of viewers each week on MFSN.',
    ],
  },
  {
    traits: ['captain', 'vocal_leader'],
    category: 'coaching',
    headlines: [
      '{{name}} Enters Coaching',
      '{{name}} Named Position Coach',
    ],
    stories: [
      '{{name}} transitioned seamlessly from locker room leader to coaching staff, bringing the same intensity and leadership to the next generation.',
      'The natural leader who captained championship teams now guides young players as a position coach, with head coaching aspirations on the horizon.',
    ],
  },
  {
    traits: ['showtime', 'ego', 'media_darling'],
    category: 'entertainment',
    headlines: [
      '{{name}} Launches Reality TV Career',
      '{{name}} Signs Entertainment Deal',
    ],
    stories: [
      '{{name}} brought the same showmanship from the field to the screen, starring in a hit reality show that became a cultural phenomenon.',
      'Never one to shy away from the spotlight, {{name}} leveraged celebrity status into a lucrative entertainment empire.',
    ],
  },
  {
    traits: ['holdout', 'mercenary', 'stat_padder'],
    category: 'writing',
    headlines: [
      '{{name}} Publishes Tell-All Memoir',
      '{{name}}\'s Book Tops Bestseller List',
    ],
    stories: [
      '{{name}} wrote a brutally honest memoir about contract negotiations, team politics, and the business of football that became a bestseller.',
      'The autobiography pulled no punches, detailing salary disputes, front office battles, and the price of greatness in professional football.',
    ],
  },
  {
    traits: ['loyal', 'hometown_hero', 'mentor'],
    category: 'philanthropy',
    headlines: [
      '{{name}} Founds Youth Football Foundation',
      '{{name}} Gives Back to Community',
    ],
    stories: [
      '{{name}} established a youth football foundation in the community, funding scholarships and training facilities for underprivileged athletes.',
      'The beloved hometown hero dedicated retirement to mentoring young players, opening training academies and speaking at schools across the region.',
    ],
  },
  {
    traits: ['gym_rat', 'workhorse', 'ironman'],
    category: 'business',
    headlines: [
      '{{name}} Launches Fitness Empire',
      '{{name}} Opens Training Facility Chain',
    ],
    stories: [
      '{{name}} channeled the same relentless work ethic into building a fitness brand, opening a chain of elite training facilities.',
      'The player who never missed a workout turned that discipline into a thriving business, training both professional athletes and weekend warriors.',
    ],
  },
  {
    traits: ['clutch', 'comeback_kid'],
    category: 'broadcasting',
    headlines: [
      '{{name}} Named "Clutch Performer of the Decade"',
      '{{name}} Joins Game Day Coverage as Clutch Expert',
    ],
    stories: [
      '{{name}} became the go-to voice for pressure moments in broadcasting, drawing on countless fourth-quarter heroics to analyze the biggest plays.',
      'The player who lived for pressure moments now narrates them, providing expert analysis on MFSN\'s biggest broadcasts.',
    ],
  },
  {
    traits: ['hothead', 'cancer', 'party_animal'],
    category: 'controversy',
    headlines: [
      '{{name}} Keeps Making Headlines',
      '{{name}}\'s Post-Career Sparks Debate',
    ],
    stories: [
      '{{name}} continued to generate headlines after retirement, with a series of public incidents that kept the media buzzing.',
      'Retirement didn\'t slow down the controversial personality — social media feuds, podcast hot takes, and tabloid appearances kept {{name}} in the spotlight.',
    ],
  },
  {
    traits: ['late_bloomer', 'chip'],
    category: 'coaching',
    headlines: [
      '{{name}} Becomes Scout',
      '{{name}} Joins Front Office',
    ],
    stories: [
      '{{name}} used the experience of being overlooked to become one of the league\'s best talent evaluators, with an eye for late-round gems.',
      'Having been doubted throughout a career, {{name}} now champions underdog prospects, building a reputation as the scout who finds diamonds in the rough.',
    ],
  },
] as const;

// ── Default Epilogues ──────────────────────────────────

const DEFAULT_EPILOGUES: readonly { category: EpilogueCategory; headlines: readonly string[]; stories: readonly string[] }[] = [
  {
    category: 'quiet_life',
    headlines: ['{{name}} Enjoys Quiet Retirement'],
    stories: ['{{name}} stepped away from the spotlight, enjoying a peaceful retirement with family, occasionally spotted at games sitting in the stands like any other fan.'],
  },
  {
    category: 'business',
    headlines: ['{{name}} Pursues Business Ventures'],
    stories: ['{{name}} invested wisely during playing days and now manages a diverse portfolio of business interests, from restaurants to real estate.'],
  },
];

// ── Public API ─────────────────────────────────────────

/**
 * Generate a career epilogue for a retiring player based on their traits.
 */
export function generateCareerEpilogue(
  rng: PrngFn,
  player: Player,
): CareerEpilogue {
  // Find best matching template based on player traits
  let bestTemplate: EpilogueTemplate | null = null;
  let bestMatchCount = 0;

  for (const template of TEMPLATES) {
    const matchCount = template.traits.filter((t) => player.traits.includes(t)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestTemplate = template;
    }
  }

  const name = player.name;

  if (bestTemplate && bestMatchCount > 0) {
    const headline = bestTemplate.headlines[Math.floor(rng() * bestTemplate.headlines.length)]!
      .replace(/\{\{name\}\}/g, name);
    const story = bestTemplate.stories[Math.floor(rng() * bestTemplate.stories.length)]!
      .replace(/\{\{name\}\}/g, name);

    return {
      playerId: player.id,
      playerName: name,
      headline,
      story,
      category: bestTemplate.category,
    };
  }

  // Fallback to default
  const fallback = DEFAULT_EPILOGUES[Math.floor(rng() * DEFAULT_EPILOGUES.length)]!;
  return {
    playerId: player.id,
    playerName: name,
    headline: fallback.headlines[0]!.replace(/\{\{name\}\}/g, name),
    story: fallback.stories[0]!.replace(/\{\{name\}\}/g, name),
    category: fallback.category,
  };
}

/**
 * Check if a player is epilogue-worthy (HOF-level career).
 */
export function isEpilogueWorthy(player: Player): boolean {
  return player.ovr >= 80 && player.yearsExp >= 8;
}
