import { navigateTo } from '../shared/pixelUi';

export const FRANCHISE_HUB_ROUTE_ACTIONS = {
  chronicle: () => navigateTo('/franchise/chronicle'),
  career: () => navigateTo('/franchise/career'),
  relocate: () => navigateTo('/relocate'),
  legends: () => navigateTo('/legends'),
  coachingTree: () => navigateTo('/coaching/tree'),
  hall: () => navigateTo('/franchise/hall'),
  playoffLore: () => navigateTo('/franchise/playoff-lore'),
  scrapbook: () => navigateTo('/franchise/scrapbook'),
} as const;
