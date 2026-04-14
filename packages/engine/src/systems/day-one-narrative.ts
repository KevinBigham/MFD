import type { GameState, Team } from '../types';
import { getAGMProfiles, type AGMProfile } from './assistant-gm';
import {
  createSetupState,
  generateSetupColdOpen,
  generateSetupForecast,
  generateTeamCrisisProfile,
  generateWeekOneCliffhanger,
  getTopPressureCard,
  type PressureCard,
  type SetupDecisions,
} from './franchise-setup';

export type DayOneOwnerBand = 'boiling' | 'restless' | 'steady' | 'empowered';
export type DayOneMediaBand = 'skeptical' | 'split' | 'hyped';
export type DayOneOpenerContext =
  | 'home_rivalry'
  | 'away_rivalry'
  | 'home_dangerous'
  | 'away_dangerous'
  | 'home_soft'
  | 'away_soft';

export interface DayOneNarrativeBeat {
  id: 'owner' | 'media' | 'scar' | 'crisis' | 'threat';
  label: string;
  accent: 'gold' | 'cyan' | 'red';
  body: string;
  kicker: string;
}

export interface DayOneAgmScene {
  whyThisFits: string;
  dayOnePromise: string;
  seasonBet: string;
  recommended: boolean;
}

export interface DayOneNarrativePack {
  coldOpen: {
    openerLabel: string;
    diagnosisLabel: string;
    entryCta: string;
    skipLabel: string;
    beats: DayOneNarrativeBeat[];
  };
  recommendedAgmId: string;
  agmScenes: Record<string, DayOneAgmScene>;
  intelBriefing: {
    headline: string;
    topPressureUrgency: string;
    boardWarning: string;
    fastLaneDiagnosis: string;
  };
  blueprint: {
    opponentIdentity: string;
    ifThisWorks: string;
    ifThisBreaks: string;
    unresolvedDanger: string;
  };
  meta: {
    topPressureId: PressureCard['id'];
    ownerBand: DayOneOwnerBand;
    mediaBand: DayOneMediaBand;
    openerContext: DayOneOpenerContext;
  };
}

function ownerBand(approval: number): DayOneOwnerBand {
  if (approval <= 30) return 'boiling';
  if (approval <= 54) return 'restless';
  if (approval <= 74) return 'steady';
  return 'empowered';
}

function mediaBand(confidence: number): DayOneMediaBand {
  if (confidence <= 40) return 'skeptical';
  if (confidence >= 68) return 'hyped';
  return 'split';
}

function averageStarterOvr(team: Team): number {
  const starters = team.roster.filter((player) => player.isStarter);
  const pool = starters.length >= 12
    ? starters
    : [...team.roster]
      .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))
      .slice(0, Math.min(22, team.roster.length));
  if (pool.length === 0) return 0;
  return Math.round(pool.reduce((sum, player) => sum + player.ovr, 0) / pool.length);
}

function teamOpener(game: GameState, teamId: string): { opponent: Team | null; home: boolean; label: string } {
  const weekOne = game.schedule.find((entry) => entry.week === 1) ?? game.schedule[0];
  const opener = weekOne?.games.find((entry) => entry.homeTeamId === teamId || entry.awayTeamId === teamId);
  if (!opener) {
    return { opponent: null, home: true, label: 'Week 1 opener' };
  }

  const home = opener.homeTeamId === teamId;
  const opponentId = home ? opener.awayTeamId : opener.homeTeamId;
  const opponent = game.teams[opponentId] ?? null;
  const label = opponent ? `Week 1 ${home ? 'vs' : '@'} ${opponent.city} ${opponent.name}` : 'Week 1 opener';
  return { opponent, home, label };
}

function rivalryHeat(team: Team, opponent: Team | null): number {
  if (!opponent) return 0;
  return team.rivals?.[opponent.id]?.heat
    ?? team.rivalries.find((entry) => entry.teamId === opponent.id)?.heat
    ?? 0;
}

function openerContext(game: GameState, teamId: string): DayOneOpenerContext {
  const team = game.teams[teamId]!;
  const opener = teamOpener(game, teamId);
  if (!opener.opponent) return opener.home ? 'home_soft' : 'away_soft';

  const heat = rivalryHeat(team, opener.opponent);
  if (heat >= 60) return opener.home ? 'home_rivalry' : 'away_rivalry';

  const ownOvr = averageStarterOvr(team);
  const opponentOvr = averageStarterOvr(opener.opponent);
  const dangerous = opponentOvr >= ownOvr + 2 || opponentOvr >= 84;
  return dangerous
    ? (opener.home ? 'home_dangerous' : 'away_dangerous')
    : (opener.home ? 'home_soft' : 'away_soft');
}

function recommendedAgmForPressure(topPressureId: PressureCard['id']): string {
  if (topPressureId === 'cap') return 'marcus_webb';
  if (topPressureId === 'culture') return 'sandra_chen';
  return 'coach_d_hardaway';
}

function pressureName(topPressureId: PressureCard['id']): string {
  if (topPressureId === 'cap') return 'the cap sheet';
  if (topPressureId === 'culture') return 'the locker room';
  return 'the roster spine';
}

function pressureUrgency(topPressureId: PressureCard['id']): string {
  if (topPressureId === 'cap') return 'The books are shrinking every margin for error.';
  if (topPressureId === 'culture') return 'The room will decide whether Week 1 feels calm or chaotic.';
  return 'The talent is real, but the wrong lineup answers will get exposed immediately.';
}

function coldOpenKicker(beat: DayOneNarrativeBeat['id'], topPressureId: PressureCard['id'], owner: DayOneOwnerBand, media: DayOneMediaBand, opener: DayOneOpenerContext): string {
  if (beat === 'owner') {
    if (owner === 'boiling') return 'Ownership is measuring patience in weeks, not months.';
    if (owner === 'restless') return 'A slow September will turn this room political fast.';
    if (owner === 'empowered') return 'Ownership will back aggression if the first answers look sharp.';
    return 'Ownership wants proof that this regime can diagnose the problem cleanly.';
  }
  if (beat === 'media') {
    if (media === 'skeptical') return 'The market is waiting to pounce on anything that feels generic.';
    if (media === 'hyped') return 'The noise outside will magnify every early signal.';
    return 'The market sees upside, but it does not trust this team yet.';
  }
  if (beat === 'scar') {
    return `That scar is why ${pressureName(topPressureId)} feels heavier than it should on Day 1.`;
  }
  if (beat === 'crisis') {
    return pressureUrgency(topPressureId);
  }
  if (opener.includes('rivalry')) return 'The opener already has teeth. There is no soft launch here.';
  if (opener.includes('dangerous')) return 'Week 1 is good enough to punish any fake confidence.';
  return 'If you hit the right diagnosis now, the opener is survivable and useful.';
}

function agmScene(profile: AGMProfile, topPressureId: PressureCard['id'], recommendedAgmId: string, owner: DayOneOwnerBand): DayOneAgmScene {
  const recommended = profile.id === recommendedAgmId;
  const pressureTarget = pressureName(topPressureId);
  const ownerStress = owner === 'boiling'
    ? 'with an owner who is out of patience'
    : owner === 'restless'
      ? 'before ownership starts forcing the timeline'
      : 'without losing the long game';

  if (profile.expertise === 'cap_management') {
    return {
      whyThisFits: recommended
        ? `This crisis is written in ${pressureTarget}, and Marcus turns messy cap pressure into clean options.`
        : `He can still keep ${pressureTarget} from spilling into panic decisions.`,
      dayOnePromise: `I will clear the numbers so the football decisions stop feeling trapped ${ownerStress}.`,
      seasonBet: 'Season 1 gets better when the room stops paying interest on old mistakes.',
      recommended,
    };
  }

  if (profile.expertise === 'personnel') {
    return {
      whyThisFits: recommended
        ? `This team does not just need answers. It needs the right people carrying them inside ${pressureTarget}.`
        : `She can keep ${pressureTarget} from turning into a trust problem.`,
      dayOnePromise: 'I will make the room clearer, louder, and easier for the right players to grow inside.',
      seasonBet: 'Season 1 swings when the right people believe in the plan before the standings do.',
      recommended,
    };
  }

  return {
    whyThisFits: recommended
      ? `This team has enough raw talent to matter, but ${pressureTarget} needs a sharper competitive edge right now.`
      : `He can still weaponize the roster even if ${pressureTarget} remains messy.`,
    dayOnePromise: 'I will make the opener feel harder on the opponent than it feels on us.',
    seasonBet: 'Season 1 moves when the building starts playing fast, violent, and certain.',
    recommended,
  };
}

function opponentIdentityLabel(openerLabel: string, context: DayOneOpenerContext): string {
  const core = openerLabel.replace(/^Week 1 (?:vs|@)\s*/, '');
  if (context.startsWith('home_')) return `${core} at home`;
  return `${core} on the road`;
}

export function generateDayOneNarrativePack(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions = createSetupState().decisions,
): DayOneNarrativePack {
  const team = game.teams[teamId]!;
  const coldOpen = generateSetupColdOpen(game, teamId);
  const crisis = generateTeamCrisisProfile(game, teamId);
  const topPressure = getTopPressureCard(crisis);
  const owner = ownerBand(team.owner.approval);
  const media = mediaBand(team.fanConfidence);
  const openerKind = openerContext(game, teamId);
  const recommendedAgmId = recommendedAgmForPressure(topPressure.id);
  const cliffhanger = generateWeekOneCliffhanger(game, teamId, decisions);
  const forecast = generateSetupForecast(game, teamId, decisions);

  const beats: DayOneNarrativeBeat[] = [
    { id: 'owner', label: 'OWNER EXPECTATION', accent: 'gold', body: coldOpen.ownerExpectation, kicker: coldOpenKicker('owner', topPressure.id, owner, media, openerKind) },
    { id: 'media', label: 'MEDIA NARRATIVE', accent: 'cyan', body: coldOpen.mediaNarrative, kicker: coldOpenKicker('media', topPressure.id, owner, media, openerKind) },
    { id: 'scar', label: 'LAST SEASON SCAR', accent: 'red', body: coldOpen.lastSeasonScar, kicker: coldOpenKicker('scar', topPressure.id, owner, media, openerKind) },
    { id: 'crisis', label: 'CRISIS HEADLINE', accent: 'gold', body: coldOpen.crisisHeadline, kicker: coldOpenKicker('crisis', topPressure.id, owner, media, openerKind) },
    { id: 'threat', label: 'WEEK 1 THREAT', accent: 'red', body: coldOpen.weekOneThreat, kicker: coldOpenKicker('threat', topPressure.id, owner, media, openerKind) },
  ];

  const agmScenes = Object.fromEntries(
    getAGMProfiles().map((profile) => [
      profile.id,
      agmScene(profile, topPressure.id, recommendedAgmId, owner),
    ]),
  );

  return {
    coldOpen: {
      openerLabel: coldOpen.openerLabel,
      diagnosisLabel: 'Your first morning is not a tutorial. It is a diagnosis.',
      entryCta: 'Enter War Room',
      skipLabel: 'Skip Intro',
      beats,
    },
    recommendedAgmId,
    agmScenes,
    intelBriefing: {
      headline: `This team is carrying ${topPressure.label.toLowerCase()} into Week 1.`,
      topPressureUrgency: pressureUrgency(topPressure.id),
      boardWarning: topPressure.drilldown.seasonOneConsequence,
      fastLaneDiagnosis: `${coldOpen.crisisHeadline} ${topPressure.drilldown.bestLever}`,
    },
    blueprint: {
      opponentIdentity: opponentIdentityLabel(cliffhanger.openerLabel, openerKind),
      ifThisWorks: forecast.weekOneReadiness >= 68
        ? `The opener feels like proof of concept: ${cliffhanger.hope}`
        : `Even without full certainty, there is a playable path: ${cliffhanger.hope}`,
      ifThisBreaks: openerKind.includes('rivalry')
        ? `A rivalry opener will turn the wrong diagnosis into a very public bruise. ${cliffhanger.threat}`
        : `If the first bet is wrong, Week 1 will identify it immediately. ${cliffhanger.threat}`,
      unresolvedDanger: topPressure.drilldown.riskSource,
    },
    meta: {
      topPressureId: topPressure.id,
      ownerBand: owner,
      mediaBand: media,
      openerContext: openerKind,
    },
  };
}
