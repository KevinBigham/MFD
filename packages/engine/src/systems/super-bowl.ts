/**
 * MFD Super Bowl Spectacle System
 *
 * Enhanced championship presentation with halftime shows,
 * MVP awards, champion parades, and narrative generation.
 */

import type { GameState, GameResult, Team, PlayoffBracket } from '../types';
import { cl } from '../utils';

// ── Types ──────────────────────────────────────────────

export interface SuperBowlContext {
  number: string;
  matchup: string;
  venue: string;
  storylines: string[];
}

export interface HalftimeShow {
  performer: string;
  genre: string;
  description: string;
  rating: number;
}

export interface ChampionParade {
  city: string;
  attendance: number;
  headline: string;
  highlights: string[];
  mvpSpeech: string;
}

export interface SuperBowlMVPAward {
  playerId: string;
  playerName: string;
  pos: string;
  stats: string;
  narrative: string;
}

// ── Roman Numerals ─────────────────────────────────────

const ROMAN_MAP: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function getSuperBowlNumber(year: number): string {
  let num = Math.max(1, year);
  let result = '';
  for (const [value, numeral] of ROMAN_MAP) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

// ── Halftime Show Pool ─────────────────────────────────

const PERFORMERS = [
  { name: 'Nova Eclipse', genre: 'pop', desc: 'Pyrotechnics lit up the stage as Nova Eclipse delivered a 12-minute spectacle of chart-toppers.' },
  { name: 'Steel Canyon', genre: 'rock', desc: 'Guitar riffs echoed through the stadium as Steel Canyon brought classic rock energy.' },
  { name: 'Lux Diamond', genre: 'pop', desc: 'Holographic dancers joined Lux Diamond for a dazzling, choreographed pop extravaganza.' },
  { name: 'Bone Thugs Revival', genre: 'hip-hop', desc: 'A surprise reunion brought the crowd to its feet with rapid-fire verses.' },
  { name: 'Crimson Tide', genre: 'country', desc: 'Fireworks and fiddles as Crimson Tide played a heartfelt medley.' },
  { name: 'Circuit Breaker', genre: 'electronic', desc: 'Bass drops shook the stands during Circuit Breaker\'s laser-filled set.' },
  { name: 'Velvet Storm', genre: 'r&b', desc: 'Smooth vocals and a brass section turned the field into a soul concert.' },
  { name: 'Apex Horizon', genre: 'rock', desc: 'A wall of sound from Apex Horizon had fans headbanging from the upper deck.' },
  { name: 'Midnight Signal', genre: 'electronic', desc: 'Drones spelled out the Super Bowl number overhead as Midnight Signal performed.' },
  { name: 'Jade Phoenix', genre: 'pop', desc: 'Jade Phoenix rose on a platform shaped like a phoenix — the crowd lost it.' },
  { name: 'Copper King', genre: 'country', desc: 'Acoustic guitar and storytelling from Copper King brought a moment of calm.' },
  { name: 'Phantom Protocol', genre: 'hip-hop', desc: 'Phantom Protocol performed on a rotating stage with guest verses from four surprise acts.' },
  { name: 'Solar Drift', genre: 'electronic', desc: 'The entire field became an LED canvas as Solar Drift mixed live.' },
  { name: 'Rustic Highway', genre: 'country', desc: 'Rustic Highway played a tribute set to football anthems past.' },
  { name: 'Neon Veil', genre: 'pop', desc: 'Costume changes every two minutes as Neon Veil set a new standard.' },
  { name: 'Black Frequency', genre: 'hip-hop', desc: 'Black Frequency delivered bars about championship grit — the crowd chanted along.' },
  { name: 'Crystal Method X', genre: 'electronic', desc: 'A 3D projection mapped the entire stadium as Crystal Method X played their opus.' },
  { name: 'Sierra Gold', genre: 'country', desc: 'Sierra Gold duet with a surprise legend brought tears to the broadcast booth.' },
  { name: 'Violet Regime', genre: 'pop', desc: 'Violet Regime closed with a stadium-wide singalong that trended worldwide.' },
  { name: 'Granite Sound', genre: 'rock', desc: 'Granite Sound smashed a guitar at the finale — the crowd roared.' },
  { name: 'Echo Chamber', genre: 'electronic', desc: 'Echo Chamber filled the stadium with ambient soundscapes before dropping the beat.' },
  { name: 'King Cobra Posse', genre: 'hip-hop', desc: 'King Cobra Posse brought a marching band mashup that electrified the crowd.' },
  { name: 'Willow Creek', genre: 'country', desc: 'Willow Creek played barefoot on the 50-yard line — authentic and unforgettable.' },
  { name: 'Binary Sunset', genre: 'electronic', desc: 'Binary Sunset performed with a full orchestra — electronic meets classical.' },
  { name: 'Magma Flow', genre: 'rock', desc: 'Magma Flow brought pyro columns and a wall of Marshall amps.' },
  { name: 'Diamond Cut', genre: 'r&b', desc: 'Diamond Cut glided across the stage with silky vocals and a live string section.' },
  { name: 'Pulse Network', genre: 'electronic', desc: 'Every seat had a LED wristband synced to Pulse Network\'s drops.' },
  { name: 'Iron Lily', genre: 'rock', desc: 'Iron Lily\'s power ballad had the whole stadium swaying with lighters up.' },
  { name: 'Atlas Prime', genre: 'hip-hop', desc: 'Atlas Prime performed on a floating platform above the 50-yard line.' },
  { name: 'Sunrise Republic', genre: 'pop', desc: 'Sunrise Republic closed with confetti cannons and a drone light show.' },
  { name: 'Thunder Ranch', genre: 'country', desc: 'Thunder Ranch arrived on horseback and played until the stadium shook.' },
];

export function generateHalftimeShow(year: number, rng: () => number): HalftimeShow {
  const idx = Math.floor(rng() * PERFORMERS.length);
  const performer = PERFORMERS[idx % PERFORMERS.length]!;
  const rating = cl(Math.floor(rng() * 3) + 3, 1, 5);
  return {
    performer: performer.name,
    genre: performer.genre,
    description: performer.desc,
    rating,
  };
}

// ── Venue Pool ─────────────────────────────────────────

const VENUES = [
  'Apex Dome, Los Angeles', 'Liberty Arena, New York', 'Lone Star Stadium, Houston',
  'Bayfront Coliseum, Miami', 'Pinnacle Center, Las Vegas', 'Golden Gate Arena, San Francisco',
  'Crescent Dome, New Orleans', 'Phoenix Landing, Arizona', 'Star Harbor, Dallas',
  'Emerald Field, Seattle', 'Metro Dome, Minneapolis', 'Capitol Arena, Washington',
  'Thunder Ridge, Denver', 'Lakefront Stadium, Chicago', 'Sunset Pavilion, Tampa',
];

// ── Super Bowl Context ─────────────────────────────────

function isChampionshipFinish(playoffFinish: string): boolean {
  return playoffFinish.toLowerCase() === 'champion';
}

export function generateSuperBowlContext(
  game: GameState,
  bracket: PlayoffBracket,
): SuperBowlContext | null {
  const sbMatchup = bracket.matchups.find((m) => m.round === 'super_bowl');
  if (!sbMatchup) return null;

  const home = game.teams[sbMatchup.homeTeamId];
  const away = game.teams[sbMatchup.awayTeamId];
  if (!home || !away) return null;

  const number = getSuperBowlNumber(game.year);
  const matchup = `${home.city} ${home.name} vs ${away.city} ${away.name}`;
  const venue = VENUES[game.year % VENUES.length] ?? VENUES[0]!;

  const storylines: string[] = [];

  // Record-based storylines
  if (home.wins >= 13) storylines.push(`${home.city} enters with a dominant ${home.wins}-${home.losses} record.`);
  if (away.wins >= 13) storylines.push(`${away.city} enters with a dominant ${away.wins}-${away.losses} record.`);

  // Dynasty check
  const homeChamps = game.franchiseHistory.filter((h) => h.teamId === home.id && isChampionshipFinish(h.playoffFinish)).length;
  const awayChamps = game.franchiseHistory.filter((h) => h.teamId === away.id && isChampionshipFinish(h.playoffFinish)).length;
  if (homeChamps >= 2) storylines.push(`${home.city} seeks championship #${homeChamps + 1} — dynasty territory.`);
  if (awayChamps >= 2) storylines.push(`${away.city} seeks championship #${awayChamps + 1} — dynasty territory.`);

  // First-timer
  if (homeChamps === 0) storylines.push(`${home.city} has never won a championship. This is their moment.`);
  if (awayChamps === 0) storylines.push(`${away.city} has never won a championship. This is their moment.`);

  // Rivalry
  const rivalry = home.rivals?.[away.id];
  if (rivalry && rivalry.heat >= 8) {
    storylines.push(`These two teams hate each other. Rivalry heat at ${rivalry.heat}. This is personal.`);
  }

  // Fallback
  if (storylines.length === 0) {
    storylines.push(`Super Bowl ${number} — ${matchup}. A neutral-site championship for the ages.`);
  }

  return { number, matchup, venue, storylines };
}

// ── Super Bowl MVP ─────────────────────────────────────

export function generateSuperBowlMVP(gameResult: GameResult): SuperBowlMVPAward | null {
  const winnerTeamId = gameResult.homeScore > gameResult.awayScore
    ? gameResult.homeTeamId
    : gameResult.awayTeamId;
  const winnerStats = gameResult.stats?.[winnerTeamId];
  if (!winnerStats?.playerLines?.length) return null;

  let bestScore = -1;
  let bestPlayer = winnerStats.playerLines[0]!;

  for (const line of winnerStats.playerLines) {
    const score =
      (line.passYds ?? 0) * 0.04 +
      (line.passTD ?? 0) * 6 +
      (line.rushYds ?? 0) * 0.1 +
      (line.rushTD ?? 0) * 6 +
      (line.defINT ?? 0) * 10 +
      (line.sacks ?? 0) * 4 +
      (line.recYds ?? 0) * 0.1 +
      (line.recTD ?? 0) * 6;
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = line;
    }
  }

  const statParts: string[] = [];
  if (bestPlayer.passYds) statParts.push(`${bestPlayer.passYds} pass yds, ${bestPlayer.passTD ?? 0} TD`);
  if (bestPlayer.rushYds) statParts.push(`${bestPlayer.rushYds} rush yds, ${bestPlayer.rushTD ?? 0} TD`);
  if (bestPlayer.recYds) statParts.push(`${bestPlayer.rec ?? 0} rec, ${bestPlayer.recYds} yds`);
  if (bestPlayer.sacks) statParts.push(`${bestPlayer.sacks} sacks`);
  if (bestPlayer.defINT) statParts.push(`${bestPlayer.defINT} INT`);

  return {
    playerId: bestPlayer.playerId,
    playerName: bestPlayer.name,
    pos: bestPlayer.pos,
    stats: statParts.join(', ') || 'Dominant performance',
    narrative: `${bestPlayer.name} was named Super Bowl MVP after a ${statParts[0] ?? 'stellar'} performance on the biggest stage.`,
  };
}

// ── Champion Parade ────────────────────────────────────

const MARKET_ATTENDANCE: Record<string, number> = {
  mega: 2500000,
  large: 1500000,
  medium: 800000,
  small: 400000,
};

export function generateChampionParade(game: GameState, champion: Team): ChampionParade {
  const market = champion.franchiseIdentity?.marketSize ?? 'medium';
  const baseAttendance = MARKET_ATTENDANCE[market] ?? 800000;
  const attendance = baseAttendance + Math.round(champion.franchiseIdentity?.fanbase ?? 50) * 5000;

  const mvp = game.playoffBracket?.matchups
    .filter((m) => m.round === 'super_bowl')
    .map((m) => m.result?.mvpPlayerId)
    .filter(Boolean)[0];

  const mvpPlayer = mvp ? Object.values(game.players).find((p) => p.id === mvp) : null;
  const mvpName = mvpPlayer?.name ?? 'the team captain';

  const highlights = [
    `${champion.city} mayor presented the key to the city.`,
    `${mvpName} hoisted the trophy from the lead float.`,
    `Confetti filled downtown ${champion.city} as fans packed every block.`,
    `Players tossed jerseys and signed autographs along the route.`,
  ];

  return {
    city: champion.city,
    attendance,
    headline: `${champion.city} ${champion.name} parade draws ${(attendance / 1000000).toFixed(1)}M fans`,
    highlights,
    mvpSpeech: `${mvpName}: "This city deserves this. We said all year — this was our year. ${champion.city}, this is for you!"`,
  };
}

// ── Narrative Generation ───────────────────────────────

export function generateSuperBowlNarrative(
  context: SuperBowlContext,
  result: GameResult,
  champion: Team,
): string {
  const score = result.homeScore > result.awayScore
    ? `${result.homeScore}-${result.awayScore}`
    : `${result.awayScore}-${result.homeScore}`;
  const ot = result.overtime ? ' in overtime' : '';
  return `Super Bowl ${context.number}: ${champion.city} ${champion.name} win ${score}${ot}. ${context.storylines[0] ?? ''} The confetti falls on a championship season.`;
}
