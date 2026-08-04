/**
 * Screen-name audit table (D5/D6). Chip guidance copy names screens by the
 * words a coach would say, which do not always match the registered nav labels
 * in `apps/web/src/app/App.tsx` ("Waivers" vs "Waiver Wire", "Action Center"
 * has no route of its own, etc.). This table is the single audited mapping:
 *
 * - every KEY is a screen name that appears verbatim in weekly guidance copy
 *   (the guard test reads weeklyGuidance.ts source and enforces it, so the
 *   table cannot drift from the copy), and
 * - every VALUE is a live nav label in App.tsx (the guard test extracts labels
 *   from App.tsx source and enforces it, so renamed routes fail CI here
 *   instead of stranding players on a dead "Where:" target).
 *
 * When copy names a new screen, add it here. When a route is renamed, update
 * the value.
 */
export const CHIP_GUIDANCE_SCREEN_TARGETS: Readonly<Record<string, string>> = {
  'Monday Briefing': 'Monday Briefing',
  'Action Center': 'Monday Briefing',
  'Post-Week Command Deck': 'Advance Week',
  'Postgame Recap': 'Game Day',
  'Season Recap': 'Season Recap',
  Roster: 'Roster',
  'Depth Chart': 'Depth Chart',
  'Game Plan': 'Game Plan',
  Contracts: 'Contracts',
  'Cap Lab': 'Cap Lab',
  'Free Agency': 'Free Agency',
  Trades: 'Trades',
  'Waiver Wire': 'Waiver Wire',
  'Practice Squad': 'Practice Squad',
  Scouting: 'Scouting',
  Coaching: 'Coaching',
  Staff: 'Coaching',
  'Training Camp': 'Training Camp',
  Inbox: 'Inbox',
  Standings: 'Standings',
  'Front Office': 'Front Office',
};
