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
  if (topPressureId === 'cap') return 'cap space';
  if (topPressureId === 'culture') return 'player leadership';
  return 'starter and backup groups';
}

function pressureFirstDanger(topPressureId: PressureCard['id']): string {
  if (topPressureId === 'cap') return 'cap space';
  if (topPressureId === 'culture') return 'player leadership';
  return 'starter and backup jobs';
}

function pressureUrgency(topPressureId: PressureCard['id']): string {
  if (topPressureId === 'cap') return 'Cap space is tight; extra spending blocks Week 1 depth fixes and extensions.';
  if (topPressureId === 'culture') return 'Name captains and weekly roles now; losses before role clarity split starters and backups.';
  return 'The roster has starter talent, but missed lineup choices put an unassigned starter or backup in the first matchup.';
}

function coldOpenKicker(beat: DayOneNarrativeBeat['id'], topPressureId: PressureCard['id'], owner: DayOneOwnerBand, media: DayOneMediaBand, opener: DayOneOpenerContext): string {
  if (beat === 'owner') {
    if (owner === 'boiling') return 'Ownership is measuring patience in weeks, not months.';
    if (owner === 'restless') return 'A slow September will make ownership question the plan fast.';
    if (owner === 'empowered') return 'Ownership will back aggression if the first answers look sharp.';
    return 'Ownership wants proof: name the first Week 1 danger and choose its fix before kickoff.';
  }
  if (beat === 'media') {
    if (media === 'skeptical') return "Fans and media will criticize choices that do not match the team's starter, cap, or staff warnings.";
    if (media === 'hyped') return 'Public hype will make early losses, injuries, or cap mistakes cut owner patience faster.';
    return 'The public sees enough talent to care, but missed Week 1 protection, coverage, or backup decisions will cut owner patience quickly.';
  }
  if (beat === 'scar') {
    return `That scar makes ${pressureFirstDanger(topPressureId)} the first Week 1 danger to fix before kickoff.`;
  }
  if (beat === 'crisis') {
    return pressureUrgency(topPressureId);
  }
  if (opener.includes('rivalry')) return 'The opener is a rivalry test; a sloppy plan becomes public fast.';
  if (opener.includes('dangerous')) return "Identify the opponent's top unit before saving the plan; ignoring the matchup exposes an unassigned starter or backup in Week 1.";
  return 'Choose the first fix now so Week 1 tests the plan instead of exposing the same starter or backup warning.';
}

function agmScene(profile: AGMProfile, topPressureId: PressureCard['id'], recommendedAgmId: string, owner: DayOneOwnerBand): DayOneAgmScene {
  const recommended = profile.id === recommendedAgmId;
  const pressureTarget = pressureName(topPressureId);
  const ownerStress = owner === 'boiling'
    ? 'with an owner who is out of patience'
    : owner === 'restless'
      ? 'before ownership starts forcing the timeline'
      : 'without wasting future cap space or draft options';

  if (profile.expertise === 'cap_management') {
    return {
      whyThisFits: recommended
        ? `Choose Marcus when ${pressureFirstDanger(topPressureId)} is the first Week 1 danger; he turns cap mistakes into cut, restructure, and hold options before dead money blocks Week 1 fixes.`
        : `Choose Marcus to control ${pressureTarget}; he keeps cap mistakes from forcing rushed cuts or trades.`,
      dayOnePromise: `Hire me and I will list the cap moves to make now, the moves to hold, and the later cap space each choice costs ${ownerStress}.`,
      seasonBet: 'Protect cap space before mistakes limit injury, trade, and extension fixes.',
      recommended,
    };
  }

  if (profile.expertise === 'personnel') {
    return {
      whyThisFits: recommended
        ? `Choose Sandra when ${pressureTarget} is causing role confusion; she identifies leaders and protects morale before early losses turn unassigned roles into louder complaints.`
        : `Choose Sandra to turn ${pressureTarget} into role decisions before morale loss and stalled development cost wins.`,
      dayOnePromise: 'Hire me and I will name the leaders to keep on field, the players to move into new jobs, and the role calls to settle before Week 1.',
      seasonBet: 'Keep key veterans in named roles early; ignored role conflicts create morale and depth risk.',
      recommended,
    };
  }

  return {
    whyThisFits: recommended
      ? `Choose Coach D when ${pressureFirstDanger(topPressureId)} is the first Week 1 danger; he turns starter quality into lineup and practice decisions before unsupported Week 1 roles create missed assignments.`
      : 'Choose Coach D to stop missed assignments; he turns the roster into a weekly matchup plan before poor roles cost games.',
    dayOnePromise: "Hire me and I will set Week 1 practice priorities: protect exposed positions, assign backup rules, and make the opponent attack the roster's strongest group.",
    seasonBet: 'Protect starter and backup assignments early; unassigned roles create missed assignments, uncovered backup jobs, and lower owner patience.',
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
      diagnosisLabel: 'First job: choose the AGM who names the Week 1 danger to fix before kickoff.',
      entryCta: 'Hire Assistant GM',
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
        ? `Lock the setup choices that match the roster; Week 1 then shows whether they protect the opener: ${cliffhanger.hope}`
        : `Lock the Week 1 plan around the safest role, cap, and scheme fixes; the opener improves only when those fixes match the roster: ${cliffhanger.hope}`,
      ifThisBreaks: openerKind.includes('rivalry')
        ? `Fix the setup choice now; an unresolved rivalry matchup turns into a public Week 1 mistake. ${cliffhanger.threat}`
        : `Fix the setup choice now; an unresolved starter, cap, or plan mistake shows up in Week 1. ${cliffhanger.threat}`,
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
