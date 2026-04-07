/**
 * MFD Team Definitions & League Structure
 *
 * 30-team league with conference/division alignment,
 * season calendar, and scaling utilities.
 */

// Team template data — 30 teams
export var TD = [
  { id: 'hawks', city: 'Atlanta', name: 'Muscle Hawks', abbr: 'ATL', icon: '\u{1F985}', c1: '#8b0000' },
  { id: 'volts', city: 'Miami', name: 'Neon Flamingos', abbr: 'MIA', icon: '\u{1F9A9}', c1: '#6d28d9' },
  { id: 'reap', city: 'Las Vegas', name: 'Sin City Grim Reapers', abbr: 'LV', icon: '\u{1F480}', c1: '#1a1a1a' },
  { id: 'crown', city: 'New York', name: 'Concrete Gargoyles', abbr: 'NYG', icon: '\u{1F5FD}', c1: '#1e3a5f' },
  { id: 'ghost', city: 'Portland', name: 'Drizzle Phantoms', abbr: 'POR', icon: '\u{1F47B}', c1: '#3b0764' },
  { id: 'titan', city: 'Chicago', name: 'Deep Dish Destroyers', abbr: 'CHI', icon: '\u{1F355}', c1: '#065f46' },
  { id: 'storm', city: 'Dallas', name: 'Lone Star Scorpions', abbr: 'DAL', icon: '\u{1F982}', c1: '#c2410c' },
  { id: 'sent', city: 'Denver', name: 'Mile High Yetis', abbr: 'DEN', icon: '\u{1F3D4}\uFE0F', c1: '#166534' },
  { id: 'blaze', city: 'Phoenix', name: 'Cactus Jacks', abbr: 'PHX', icon: '\u{1F335}', c1: '#b91c1c' },
  { id: 'frost', city: 'Minneapolis', name: 'Tundra Berserkers', abbr: 'MIN', icon: '\u{1FA93}', c1: '#1e40af' },
  { id: 'surge', city: 'Seattle', name: 'Sasquatch', abbr: 'SEA', icon: '\u{1F9B6}', c1: '#0e7490' },
  { id: 'apex', city: 'Houston', name: 'Space Cowboys', abbr: 'HOU', icon: '\u{1F920}', c1: '#7c2d12' },
  { id: 'bbq', city: 'Kansas City', name: 'Smokestack Hogs', abbr: 'KC', icon: '\u{1F417}', c1: '#c41e3a' },
  { id: 'yeti', city: 'Buffalo', name: 'Lake Effect Maniacs', abbr: 'BUF', icon: '\u{1F328}\uFE0F', c1: '#1d3461' },
  { id: 'gator', city: 'Jacksonville', name: 'Swamp Demons', abbr: 'JAX', icon: '\u{1F40A}', c1: '#006d5b' },
  { id: 'moth', city: 'Detroit', name: 'Rust Belt Mothmen', abbr: 'DET', icon: '\u{1F987}', c1: '#4a4a4a' },
  { id: 'cactus', city: 'San Antonio', name: 'Prickly Boiz', abbr: 'SA', icon: '\u{1F919}', c1: '#8b6914' },
  { id: 'kraken', city: 'San Francisco', name: 'Fog Krakens', abbr: 'SF', icon: '\u{1F991}', c1: '#4b0082' },
  { id: 'comet', city: 'Nashville', name: 'Honky Tonk Comets', abbr: 'NSH', icon: '\u2604\uFE0F', c1: '#ff6b35' },
  { id: 'doom', city: 'Baltimore', name: 'Harbor Doom', abbr: 'BAL', icon: '\u2693', c1: '#2a0845' },
  // v97: 30-team expansion (+10 teams)
  { id: 'brawl', city: 'Philadelphia', name: 'Liberty Brawlers', abbr: 'PHI', icon: '\u{1F94A}', c1: '#004C54' },
  { id: 'furnace', city: 'Pittsburgh', name: 'Iron Furnace', abbr: 'PIT', icon: '\u2699\uFE0F', c1: '#FFB612' },
  { id: 'buzz', city: 'Charlotte', name: 'Buzz Saws', abbr: 'CLT', icon: '\u{1F41D}', c1: '#1D428A' },
  { id: 'voodoo', city: 'New Orleans', name: 'Bayou Voodoo', abbr: 'NO', icon: '\u{1F3AD}', c1: '#6B2D8B' },
  { id: 'cuda', city: 'Tampa Bay', name: 'Gulf Barracudas', abbr: 'TB', icon: '\u{1F41F}', c1: '#00A4BD' },
  { id: 'wolves', city: 'Boston', name: 'Harbor Wolves', abbr: 'BOS', icon: '\u{1F43A}', c1: '#1C2841' },
  { id: 'tremor', city: 'Los Angeles', name: 'Sunset Tremors', abbr: 'LA', icon: '\u{1F30B}', c1: '#FF4500' },
  { id: 'rams97', city: 'Salt Lake City', name: 'Summit Rams', abbr: 'SLC', icon: '\u{1F40F}', c1: '#4A6741' },
  { id: 'twist', city: 'Oklahoma City', name: 'Prairie Twister', abbr: 'OKC', icon: '\u{1F32A}\uFE0F', c1: '#CC5500' },
  { id: 'shark', city: 'San Diego', name: 'Pacific Sharks', abbr: 'SD', icon: '\u{1F988}', c1: '#005B5C' },
];

export var LEAGUE_TEAM_COUNT97 = TD.length;
export var REG_SEASON_WEEKS97 = 18;
export var REG_SEASON_GAMES97 = 17;
export var LEAGUE_POOL_SCALE97 = Math.max(1, LEAGUE_TEAM_COUNT97 / 20);

// Conference / Division alignment map (team id → conf/div)
export var MFD97_CONF_DIV_MAP = {
  yeti: { conf: 'EC', div: 'North', divId: 'ECN', confName: 'East Conference', divName: 'EC North' },
  crown: { conf: 'EC', div: 'North', divId: 'ECN', confName: 'East Conference', divName: 'EC North' },
  wolves: { conf: 'EC', div: 'North', divId: 'ECN', confName: 'East Conference', divName: 'EC North' },
  moth: { conf: 'EC', div: 'North', divId: 'ECN', confName: 'East Conference', divName: 'EC North' },
  furnace: { conf: 'EC', div: 'North', divId: 'ECN', confName: 'East Conference', divName: 'EC North' },
  titan: { conf: 'EC', div: 'Central', divId: 'ECC', confName: 'East Conference', divName: 'EC Central' },
  doom: { conf: 'EC', div: 'Central', divId: 'ECC', confName: 'East Conference', divName: 'EC Central' },
  comet: { conf: 'EC', div: 'Central', divId: 'ECC', confName: 'East Conference', divName: 'EC Central' },
  brawl: { conf: 'EC', div: 'Central', divId: 'ECC', confName: 'East Conference', divName: 'EC Central' },
  buzz: { conf: 'EC', div: 'Central', divId: 'ECC', confName: 'East Conference', divName: 'EC Central' },
  volts: { conf: 'EC', div: 'South', divId: 'ECS', confName: 'East Conference', divName: 'EC South' },
  hawks: { conf: 'EC', div: 'South', divId: 'ECS', confName: 'East Conference', divName: 'EC South' },
  gator: { conf: 'EC', div: 'South', divId: 'ECS', confName: 'East Conference', divName: 'EC South' },
  cuda: { conf: 'EC', div: 'South', divId: 'ECS', confName: 'East Conference', divName: 'EC South' },
  voodoo: { conf: 'EC', div: 'South', divId: 'ECS', confName: 'East Conference', divName: 'EC South' },
  frost: { conf: 'WC', div: 'North', divId: 'WCN', confName: 'West Conference', divName: 'WC North' },
  surge: { conf: 'WC', div: 'North', divId: 'WCN', confName: 'West Conference', divName: 'WC North' },
  ghost: { conf: 'WC', div: 'North', divId: 'WCN', confName: 'West Conference', divName: 'WC North' },
  sent: { conf: 'WC', div: 'North', divId: 'WCN', confName: 'West Conference', divName: 'WC North' },
  rams97: { conf: 'WC', div: 'North', divId: 'WCN', confName: 'West Conference', divName: 'WC North' },
  bbq: { conf: 'WC', div: 'Central', divId: 'WCC', confName: 'West Conference', divName: 'WC Central' },
  storm: { conf: 'WC', div: 'Central', divId: 'WCC', confName: 'West Conference', divName: 'WC Central' },
  apex: { conf: 'WC', div: 'Central', divId: 'WCC', confName: 'West Conference', divName: 'WC Central' },
  cactus: { conf: 'WC', div: 'Central', divId: 'WCC', confName: 'West Conference', divName: 'WC Central' },
  twist: { conf: 'WC', div: 'Central', divId: 'WCC', confName: 'West Conference', divName: 'WC Central' },
  reap: { conf: 'WC', div: 'South', divId: 'WCS', confName: 'West Conference', divName: 'WC South' },
  blaze: { conf: 'WC', div: 'South', divId: 'WCS', confName: 'West Conference', divName: 'WC South' },
  kraken: { conf: 'WC', div: 'South', divId: 'WCS', confName: 'West Conference', divName: 'WC South' },
  tremor: { conf: 'WC', div: 'South', divId: 'WCS', confName: 'West Conference', divName: 'WC South' },
  shark: { conf: 'WC', div: 'South', divId: 'WCS', confName: 'West Conference', divName: 'WC South' },
};

export var LEAGUE_STRUCTURE = {
  conferences: [
    { id: 'EC', name: 'East Conference', icon: '\u{1F3DB}\uFE0F' },
    { id: 'WC', name: 'West Conference', icon: '\u{1F304}' },
  ],
  divisions: [
    { id: 'ECN', conf: 'EC', name: 'North', icon: '\u{1F9CA}', teams: ['yeti', 'crown', 'wolves', 'moth', 'furnace'] },
    { id: 'ECC', conf: 'EC', name: 'Central', icon: '\u2B50', teams: ['titan', 'doom', 'comet', 'brawl', 'buzz'] },
    { id: 'ECS', conf: 'EC', name: 'South', icon: '\u2600\uFE0F', teams: ['volts', 'hawks', 'gator', 'cuda', 'voodoo'] },
    { id: 'WCN', conf: 'WC', name: 'North', icon: '\u2744\uFE0F', teams: ['frost', 'surge', 'ghost', 'sent', 'rams97'] },
    { id: 'WCC', conf: 'WC', name: 'Central', icon: '\u26F0\uFE0F', teams: ['bbq', 'storm', 'apex', 'cactus', 'twist'] },
    { id: 'WCS', conf: 'WC', name: 'South', icon: '\u{1F335}', teams: ['reap', 'blaze', 'kraken', 'tremor', 'shark'] },
  ],
};

export function applyLeagueAlignment97(team) {
  if (!team || !team.id) return team;
  var a = MFD97_CONF_DIV_MAP[team.id];
  if (a) {
    team.conf = a.conf;
    team.confName = a.confName;
    team.div = a.div;
    team.divId = a.divId;
    team.divName = a.divName;
  } else {
    if (!team.conf) team.conf = 'LG';
    if (!team.confName) team.confName = 'League';
    if (!team.div) team.div = 'Independent';
    if (!team.divId) team.divId = 'IND';
    if (!team.divName) team.divName = 'Independent';
  }
  return team;
}

// Scaling utilities for league size
export function getScaledCount97(base) {
  return Math.max(1, Math.round((base || 0) * LEAGUE_POOL_SCALE97));
}
export function getScaledDraftClassCount97() { return getScaledCount97(300); }
export function getScaledFreeAgentCount97() { return getScaledCount97(60); }
export function getScaledOffseasonFreeAgentCount97() { return getScaledCount97(30); }
export function getScaledUdfaCount97() { return getScaledCount97(25); }

// Season calendar — key events in a season lifecycle
export var CALENDAR = [
  { week: 0, phase: 'preseason', event: 'Training Camp', icon: '\u26FA', desc: 'Evaluate roster, set depth chart' },
  { week: 1, phase: 'regular', event: 'Opening Day', icon: '\u{1F3C8}', desc: 'The season begins' },
  { week: 4, phase: 'regular', event: 'Cut Day', icon: '\u2702\uFE0F', desc: 'Trim roster to 53' },
  { week: 8, phase: 'regular', event: 'Midseason Review', icon: '\u{1F4CA}', desc: 'Owner evaluates progress' },
  { week: 10, phase: 'regular', event: 'Trade Deadline', icon: '\u{1F514}', desc: 'Last chance to deal this season' },
  { week: 14, phase: 'regular', event: 'Stretch Run', icon: '\u{1F3C1}', desc: 'Playoff picture takes shape' },
  { week: 18, phase: 'regular', event: 'Regular Season Ends', icon: '\u{1F4CB}', desc: 'Final standings set' },
  { week: 18, phase: 'playoffs', event: 'Playoffs Begin', icon: '\u{1F3C6}', desc: 'Win or go home' },
  { week: 21, phase: 'offseason', event: 'Championship', icon: '\u{1F48D}', desc: 'One team claims glory' },
  { week: 22, phase: 'offseason', event: 'Tag Window', icon: '\u{1F3F7}\uFE0F', desc: 'Franchise/Transition tags (2 max)' },
  { week: 23, phase: 'offseason', event: 'Re-Sign Phase', icon: '\u270D\uFE0F', desc: 'Keep your core' },
  { week: 24, phase: 'offseason', event: 'Free Agency', icon: '\u{1F3EA}', desc: 'Open market' },
  { week: 25, phase: 'offseason', event: 'Combine', icon: '\u{1F52C}', desc: 'Scout the draft class' },
  { week: 26, phase: 'offseason', event: 'Draft', icon: '\u{1F4FA}', desc: 'Build the future' },
  { week: 27, phase: 'offseason', event: 'Rookie Signings', icon: '\u{1F4DD}', desc: 'Welcome the class' },
  { week: 28, phase: 'offseason', event: 'Owner Meeting', icon: '\u{1F935}', desc: 'Annual performance review' },
];
