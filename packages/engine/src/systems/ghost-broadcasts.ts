/**
 * Ghost Broadcasts — Retired Hall of Famers guest commentate on MFSN.
 *
 * After season 10+, retired legends can appear as "guest commentators"
 * during broadcasts, adding 1-2 lines of color commentary based on
 * their personality, position, and era.
 */
import type { PrngFn } from '../rng';
import type { Position } from '../types';

// ── Types ──────────────────────────────────────────────

export interface GhostCommentator {
  id: string;
  name: string;
  position: Position;
  peakOvr: number;
  retiredYear: number;
  /** Personality-driven commentary style */
  style: 'analyst' | 'hype' | 'storyteller' | 'technical';
}

export interface GhostBroadcastLine {
  commentatorName: string;
  commentary: string;
  /** When to insert: after a TD, turnover, big play, or quarter break */
  trigger: 'touchdown' | 'turnover' | 'big_play' | 'quarter_break' | 'game_end';
}

// ── Commentary Templates ───────────────────────────────

const ANALYST_TEMPLATES: Record<string, readonly string[]> = {
  touchdown: [
    'Hall of Famer {{name}}, watching from the booth: "That route concept is something we used to run — textbook execution."',
    '{{name}} on the broadcast: "You can see the pre-snap read there. The QB identified the soft spot in the zone perfectly."',
  ],
  turnover: [
    '{{name}} from the booth: "That\'s a mistake you can\'t make at this level. I\'ve seen it a thousand times."',
    '{{name}} chimes in: "The defender jumped the route — he studied the film. You have to mix up your tendencies."',
  ],
  big_play: [
    '{{name}} leans in: "THAT is elite. The timing, the ball placement — that\'s what separates good from great."',
    '{{name}} from upstairs: "Watch the offensive line on the replay. They gave him all day."',
  ],
  quarter_break: [
    '{{name}} between quarters: "This reminds me of my {{year}} playoff run. Same kind of intensity."',
  ],
  game_end: [
    '{{name}} with the final word: "What a game. These are the moments you play for."',
  ],
};

const HYPE_TEMPLATES: Record<string, readonly string[]> = {
  touchdown: [
    '{{name}} is on his feet in the booth: "OH MY! That is SPECIAL! That kid has IT!"',
    '{{name}} can\'t contain himself: "THAT is a FRANCHISE play right there! We\'re witnessing greatness!"',
  ],
  turnover: [
    '{{name}} winces: "OHHH! That one HURTS! I felt that from up here!"',
    '{{name}} shakes his head: "In my day, that ball doesn\'t come out. You gotta protect the rock!"',
  ],
  big_play: [
    '{{name}} jumps up: "ARE YOU KIDDING ME?! THAT is UNBELIEVABLE! Give that man a raise!"',
    '{{name}} from the booth: "I played {{yearsPlayed}} years and I\'m not sure I ever saw a play like THAT!"',
  ],
  quarter_break: [
    '{{name}}: "This atmosphere? Electric. I miss being down there."',
  ],
  game_end: [
    '{{name}}: "What a privilege to watch that. This game... man, I love this game."',
  ],
};

const STORYTELLER_TEMPLATES: Record<string, readonly string[]> = {
  touchdown: [
    '{{name}} reminisces: "That reminds me of the \'{{year}} championship — same kind of play that changed everything."',
    '{{name}} tells the booth: "You know, I scored a touchdown just like that back in \'{{year}}. Different era, same feeling."',
  ],
  turnover: [
    '{{name}} shares a story: "I threw a pick just like that in \'{{year}}. Worst feeling. But it taught me everything."',
  ],
  big_play: [
    '{{name}} remembers: "That play will live forever. Decades from now, fans will say \'I was there.\'"',
  ],
  quarter_break: [
    '{{name}}: "These moments... they fly by when you\'re playing. Enjoy every second of it."',
  ],
  game_end: [
    '{{name}}: "Stories like tonight\'s game are why I fell in love with football."',
  ],
};

const TECHNICAL_TEMPLATES: Record<string, readonly string[]> = {
  touchdown: [
    '{{name}} breaks it down: "Watch the footwork. Three-step drop, hitch, throw. Perfect mechanics."',
    '{{name}} analyzes: "The key was the motion before the snap. It shifted the linebacker and opened the seam."',
  ],
  turnover: [
    '{{name}} diagnoses: "Mechanical breakdown. His elbow dropped and the ball sailed. Fatigue is showing."',
  ],
  big_play: [
    '{{name}} explains: "The pre-snap alignment told the whole story. The defense was in Cover 3 and the offense had the right check."',
  ],
  quarter_break: [
    '{{name}}: "The adjustments from here will be crucial. Watch for personnel grouping changes."',
  ],
  game_end: [
    '{{name}}: "From a technical standpoint, that was one of the best-coached games I\'ve seen this year."',
  ],
};

const STYLE_TEMPLATES: Record<GhostCommentator['style'], Record<string, readonly string[]>> = {
  analyst: ANALYST_TEMPLATES,
  hype: HYPE_TEMPLATES,
  storyteller: STORYTELLER_TEMPLATES,
  technical: TECHNICAL_TEMPLATES,
};

// ── Public API ─────────────────────────────────────────

/** Determine commentary style from player traits and personality */
export function determineCommentaryStyle(
  traits: readonly string[],
): GhostCommentator['style'] {
  if (traits.includes('film_junkie') || traits.includes('captain')) return 'analyst';
  if (traits.includes('showtime') || traits.includes('ego') || traits.includes('media_darling')) return 'hype';
  if (traits.includes('loyal') || traits.includes('mentor') || traits.includes('hometown_hero')) return 'storyteller';
  return 'technical';
}

/** Generate a ghost broadcast line for a game moment */
export function generateGhostLine(
  rng: PrngFn,
  commentator: GhostCommentator,
  trigger: GhostBroadcastLine['trigger'],
): GhostBroadcastLine {
  const templates = STYLE_TEMPLATES[commentator.style][trigger] ?? STYLE_TEMPLATES[commentator.style].touchdown!;
  const template = templates[Math.floor(rng() * templates.length)]!;
  const yearsPlayed = Math.max(1, commentator.retiredYear - 2020);
  const memorableYear = commentator.retiredYear - Math.floor(rng() * Math.min(yearsPlayed, 5));

  const commentary = template
    .replace(/\{\{name\}\}/g, commentator.name)
    .replace(/\{\{year\}\}/g, String(memorableYear))
    .replace(/\{\{yearsPlayed\}\}/g, String(yearsPlayed));

  return {
    commentatorName: commentator.name,
    commentary,
    trigger,
  };
}

/** Decide whether to include a ghost broadcast (rarity gate) */
export function shouldIncludeGhostBroadcast(
  rng: PrngFn,
  currentYear: number,
  hasHallOfFamers: boolean,
): boolean {
  if (!hasHallOfFamers) return false;
  if (currentYear < 10) return false;
  // ~15% chance per game after year 10
  return rng() < 0.15;
}
