import type { SeasonPhase } from '../types/season';

export type AppRoomId = 'briefing' | 'football_ops' | 'game_week' | 'league' | 'legacy';
export type NerdNavGroupId = 'core' | 'team' | 'money' | 'acquire' | 'gameday' | 'league' | 'dynasty' | 'meta';

export interface AppRouteDefinition {
  path: string;
  label: string;
  shortLabel: string;
  room: AppRoomId;
  nerdGroup: NerdNavGroupId;
  shortcut?: string;
  unlockWeek?: number | 'always' | 'midseason';
  unlockPhase?: SeasonPhase;
}

const route = (
  path: string,
  label: string,
  shortLabel: string,
  room: AppRoomId,
  nerdGroup: NerdNavGroupId,
  options: Pick<AppRouteDefinition, 'shortcut' | 'unlockWeek' | 'unlockPhase'> = {},
): AppRouteDefinition => ({ path, label, shortLabel, room, nerdGroup, unlockWeek: 'always', ...options });

/**
 * The canonical route metadata registry. The web shell derives navigation,
 * command entries, five-room grouping, nerd grouping, and unlock labels from
 * this table. Adding a top-level route requires adding exactly one row here.
 */
export const APP_ROUTE_REGISTRY = [
  route('/', 'Monday Briefing', 'Briefing', 'briefing', 'core', { shortcut: '1' }),
  route('/week-advance', 'Advance Week', 'Advance', 'briefing', 'core'),
  route('/inbox', 'Inbox', 'Inbox', 'briefing', 'core', { shortcut: '9' }),
  route('/watch-list', 'Watch List', 'Watch', 'briefing', 'core'),

  route('/roster', 'Roster', 'Roster', 'football_ops', 'team', { shortcut: '2' }),
  route('/depth-chart', 'Depth Chart', 'Depth', 'football_ops', 'team'),
  route('/locker-room', 'Locker Room', 'Locker', 'football_ops', 'team'),
  route('/coaching', 'Coaching', 'Coach', 'football_ops', 'team'),
  route('/coaching/tree', 'Coaching Tree', 'Tree', 'football_ops', 'team'),
  route('/coaching/relationships', 'Staff Relationships', 'Relations', 'football_ops', 'team'),
  route('/handshakes', 'Handshakes', 'Promises', 'football_ops', 'team'),
  route('/training-camp', 'Training Camp', 'Camp', 'football_ops', 'team', { unlockPhase: 'training_camp' }),
  route('/mentors', 'Alumni Mentors', 'Mentors', 'football_ops', 'team'),
  route('/player-development', 'Player Development', 'Develop', 'football_ops', 'team'),
  route('/compare', 'Player Compare', 'Compare', 'football_ops', 'team'),
  route('/rivalries', 'Player Rivalries', 'Rivalries', 'football_ops', 'team'),
  route('/contracts', 'Contracts', 'Cap', 'football_ops', 'money', { shortcut: '3', unlockWeek: 4 }),
  route('/cap-lab', 'Cap Lab', 'Cap Lab', 'football_ops', 'money'),
  route('/front-office', 'Front Office', 'Front Office', 'football_ops', 'money'),
  route('/endorsements', 'Endorsements', 'Deals', 'football_ops', 'money'),
  route('/trades', 'Trades', 'Trades', 'football_ops', 'acquire', { shortcut: '4', unlockWeek: 4 }),
  route('/trade-block', 'Trade Block', 'Block', 'football_ops', 'acquire'),
  route('/trade-deadline', 'Trade Deadline', 'Deadline', 'football_ops', 'acquire'),
  route('/team-needs', 'Team Needs', 'Needs', 'football_ops', 'acquire'),
  route('/scouting', 'Scouting', 'Scout', 'football_ops', 'acquire', { shortcut: '5', unlockWeek: 'midseason' }),
  route('/draft', 'Draft', 'Draft', 'football_ops', 'acquire', { shortcut: '6', unlockPhase: 'draft' }),
  route('/draft-recap', 'Draft Recap', 'Recap', 'football_ops', 'acquire'),
  route('/expansion-draft', 'Expansion Draft', 'Expansion', 'football_ops', 'acquire'),
  route('/free-agency', 'Free Agency', 'FA', 'football_ops', 'acquire', { shortcut: '7', unlockPhase: 'free_agency' }),
  route('/fa-targets', 'FA Targets', 'Targets', 'football_ops', 'acquire'),
  route('/waivers', 'Waiver Wire', 'Waivers', 'football_ops', 'acquire'),
  route('/practice-squad', 'Practice Squad', 'PS', 'football_ops', 'acquire'),
  route('/owner', 'Owner Suite', 'Owner', 'football_ops', 'dynasty'),
  route('/relocate', 'Relocation', 'Relocate', 'football_ops', 'dynasty'),

  route('/game-plan', 'Game Plan', 'Plan', 'game_week', 'gameday'),
  route('/game-day', 'Game Day', 'Game', 'game_week', 'gameday', { shortcut: '8' }),
  route('/broadcast', 'Broadcast', 'Live', 'game_week', 'gameday'),
  route('/presentation', 'Presentation', 'Cinema', 'game_week', 'gameday'),
  route('/play-by-play', 'Play-by-Play', 'PbP', 'game_week', 'gameday'),
  route('/game-flow', 'Game Flow', 'Flow', 'game_week', 'gameday'),
  route('/film-room', 'Film Room', 'Film', 'game_week', 'gameday'),
  route('/schedule', 'Schedule', 'Schedule', 'game_week', 'gameday'),
  route('/super-bowl', 'Super Bowl', 'SB', 'game_week', 'gameday'),

  route('/standings', 'Standings', 'Stand', 'league', 'league'),
  route('/power-rankings', 'Power Rankings', 'Rankings', 'league', 'league', { unlockWeek: 'midseason' }),
  route('/league-pulse', 'League Pulse', 'Pulse', 'league', 'league'),
  route('/league/weather', 'Weather', 'Weather', 'league', 'league'),
  route('/newsroom', 'Newsroom', 'Digest', 'league', 'league'),
  route('/news', 'News', 'News', 'league', 'league'),
  route('/social', 'MFSN', 'Social', 'league', 'league'),
  route('/commissioner', 'Commissioner', 'Commish', 'league', 'league'),
  route('/cba', 'CBA Negotiation', 'CBA', 'league', 'league'),
  route('/league-rules', 'League Rules', 'Rules', 'league', 'league'),
  route('/analytics', 'Analytics', 'Data', 'league', 'league'),
  route('/records', 'Record Book', 'Records', 'league', 'league'),
  route('/stat-central', 'Stat Central', 'Stats', 'league', 'league'),

  route('/franchise', 'Franchise', 'Franchise', 'legacy', 'dynasty'),
  route('/legends', 'Legends', 'Legends', 'legacy', 'dynasty'),
  route('/franchise/career', 'GM Career', 'Career', 'legacy', 'dynasty'),
  route('/franchise/book', 'Franchise Book', 'Book', 'legacy', 'dynasty'),
  route('/franchise/chronicle', 'Chronicle', 'Chronicle', 'legacy', 'dynasty'),
  route('/franchise/scrapbook', 'Scrapbook', 'Scrap', 'legacy', 'dynasty'),
  route('/franchise/hall', 'Hall of Fame', 'Hall', 'legacy', 'dynasty'),
  route('/franchise/trophy-room', 'Trophy Room', 'Trophies', 'legacy', 'dynasty'),
  route('/franchise/eras', 'Era Hall', 'Eras', 'legacy', 'dynasty'),
  route('/franchise/mvps', 'MVP Plaques', 'MVPs', 'legacy', 'dynasty'),
  route('/franchise/playoff-lore', 'Playoff Lore', 'Lore', 'legacy', 'dynasty'),
  route('/franchise/achievements', 'Achievements', 'Achieve', 'legacy', 'dynasty'),
  route('/legacy', 'Legacy', 'Legacy', 'legacy', 'dynasty'),
  route('/legacy/named-games', 'Named Games', 'Named', 'legacy', 'dynasty'),
  route('/legacy/bloodlines', 'Bloodlines', 'Bloodlines', 'legacy', 'dynasty'),
  route('/awards', 'Awards Hub', 'Awards', 'legacy', 'dynasty'),
  route('/season/recap', 'Season Recap', 'Recap', 'legacy', 'dynasty'),
  route('/scenarios', 'Scenarios', 'Challenge', 'legacy', 'dynasty'),
  route('/about', 'About', 'About', 'legacy', 'meta'),
  route('/credits', 'Credits', 'Credits', 'legacy', 'meta'),
  route('/faq', 'FAQ', 'FAQ', 'legacy', 'meta'),
  route('/dynasty', 'Save/Load', 'Save', 'legacy', 'meta'),
  route('/settings', 'Settings', 'Config', 'legacy', 'meta'),
] as const satisfies readonly AppRouteDefinition[];

export const APP_ROOMS: readonly { id: AppRoomId; label: string }[] = [
  { id: 'briefing', label: 'BRIEFING' },
  { id: 'football_ops', label: 'FOOTBALL OPS' },
  { id: 'game_week', label: 'GAME WEEK' },
  { id: 'league', label: 'LEAGUE' },
  { id: 'legacy', label: 'LEGACY' },
];

export const NERD_NAV_GROUPS: readonly { id: NerdNavGroupId; label: string }[] = [
  { id: 'core', label: 'CORE' },
  { id: 'team', label: 'TEAM' },
  { id: 'money', label: 'MONEY' },
  { id: 'acquire', label: 'ACQUIRE' },
  { id: 'gameday', label: 'GAMEDAY' },
  { id: 'league', label: 'LEAGUE' },
  { id: 'dynasty', label: 'DYNASTY' },
  { id: 'meta', label: 'SYSTEM' },
];

export type AppRoutePath = typeof APP_ROUTE_REGISTRY[number]['path'];

export function appRoute(path: string): AppRouteDefinition | undefined {
  return APP_ROUTE_REGISTRY.find((entry) => entry.path === path);
}
