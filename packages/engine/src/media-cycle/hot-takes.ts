import { mulberry32 } from '../rng';
import type { GameState } from '../types';
import type { Headline, HotTake } from './types';

const ANALYSTS = [
  { name: 'Cal Knox', leaning: 'supportive' as const },
  { name: 'June Vega', leaning: 'skeptical' as const },
  { name: 'Dex Marlowe', leaning: 'combative' as const },
  { name: 'Rae Holloway', leaning: 'supportive' as const },
] as const;

const ANGLES = {
  supportive: [
    'This is sustainable.',
    'The tape backs it up.',
    'That trend is real.',
  ],
  skeptical: [
    'I need one more week.',
    'Pump the brakes.',
    'That scoreboard may be lying.',
  ],
  combative: [
    'Everybody is overreacting.',
    'That changes the whole tier board.',
    'Somebody has to say it plainly.',
  ],
} as const;

const CATEGORY_FRAMES: Record<Headline['category'], string[]> = {
  UPSET: ['Upsets expose fragile favorites.', 'That underdog win changes the room.'],
  BLOWOUT: ['Dominance like that travels.', 'That margin says more than the final record.'],
  COMEBACK: ['Good teams survive bad scripts.', 'Late-game nerve is part of roster quality.'],
  RIVALRY_WIN: ['Rivalry games reveal identity.', 'That result will matter twice.'],
  INDIVIDUAL_PERFORMANCE: ['Superstar production bends the whole week.', 'One player can hijack the discourse.'],
  MILESTONE: ['Milestones change how seasons get remembered.', 'Historic nights belong at the top of the feed.'],
  ROOKIE_BREAKOUT: ['Young stars move timelines forward.', 'That rookie just changed expectations.'],
};

function hashString(value: string): number {
  return [...value].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
}

export function generateHotTakes(_state: GameState, weekNumber: number, headlines: Headline[]): HotTake[] {
  return headlines.slice(0, 5).map((headline) => {
    const rng = mulberry32(hashString(`${weekNumber}|${headline.id}`));
    const analyst = ANALYSTS[Math.floor(rng() * ANALYSTS.length)] ?? ANALYSTS[0];
    const anglePool = ANGLES[analyst.leaning];
    const framePool = CATEGORY_FRAMES[headline.category];
    const angle = anglePool[Math.floor(rng() * anglePool.length)] ?? anglePool[0];
    const frame = framePool[Math.floor(rng() * framePool.length)] ?? framePool[0];

    return {
      id: `take|${headline.id}`,
      weekNumber,
      headlineId: headline.id,
      analyst: analyst.name,
      angle,
      sentiment: analyst.leaning,
      quote: `${frame} ${angle}`,
    } satisfies HotTake;
  });
}
