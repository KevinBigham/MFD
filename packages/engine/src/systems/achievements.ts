import type {
  Achievement,
  AchievementProgress,
  GameState,
  Team,
} from '../types';

interface MetricResult {
  current: number;
  target: number;
  percentage: number;
  label: string;
  complete: boolean;
}

type MetricFn = (game: GameState, team: Team, achievement: Achievement) => MetricResult;

function buildAchievement(
  id: string,
  title: string,
  description: string,
  category: Achievement['category'],
  tier: Achievement['tier'],
  type: string,
  threshold: number | string | boolean,
  icon: string,
): Achievement {
  return {
    id,
    title,
    description,
    category,
    tier,
    condition: { type, threshold },
    unlockedYear: null,
    unlockedWeek: null,
    icon,
  };
}

const ACHIEVEMENT_CATALOG: Achievement[] = [
  buildAchievement('dynasty:first_championship', 'First Championship', 'Win your first title.', 'dynasty', 'bronze', 'championships', 1, 'trophy'),
  buildAchievement('dynasty:back_to_back', 'Back to Back', 'Win championships in consecutive seasons.', 'dynasty', 'gold', 'consecutive_championships', 2, 'repeat'),
  buildAchievement('dynasty:three_peat', 'Three-Peat', 'Win three straight championships.', 'dynasty', 'platinum', 'consecutive_championships', 3, 'crown'),
  buildAchievement('dynasty:dynasty_builder', 'Dynasty Builder', 'Bring home five championships.', 'dynasty', 'platinum', 'championships', 5, 'rings'),
  buildAchievement('dynasty:perfect_season', 'Perfect Season', 'Finish a championship run without a loss.', 'dynasty', 'platinum', 'perfect_season', 1, 'sparkles'),
  buildAchievement('dynasty:worst_to_first', 'Worst to First', 'Turn a losing season into a division-winning rise.', 'dynasty', 'gold', 'worst_to_first', 1, 'arrow-up'),
  buildAchievement('dynasty:iron_curtain', 'Iron Curtain', 'Field elite defenses for five seasons.', 'dynasty', 'gold', 'elite_defense_years', 5, 'shield'),
  buildAchievement('dynasty:franchise_legend', 'Franchise Legend', 'Reach a dynasty score above 100.', 'dynasty', 'platinum', 'dynasty_score', 101, 'star'),
  buildAchievement('dynasty:conference_king', 'Conference King', 'Reach three conference-title games.', 'dynasty', 'gold', 'conference_finals', 3, 'banner'),
  buildAchievement('dynasty:playoff_staple', 'Playoff Staple', 'Make the playoffs five times.', 'dynasty', 'silver', 'playoff_appearances', 5, 'calendar'),

  buildAchievement('roster:homegrown', 'Homegrown', 'Build a starting core of five young drafted contributors.', 'roster', 'silver', 'young_starters', 5, 'sapling'),
  buildAchievement('roster:dream_team', 'Dream Team', 'Average 82 OVR across the active roster.', 'roster', 'gold', 'average_roster_ovr', 82, 'helmet'),
  buildAchievement('roster:youth_movement', 'Youth Movement', 'Keep roster average age under 26.', 'roster', 'silver', 'average_roster_age_under', 26, 'rocket'),
  buildAchievement('roster:veteran_presence', 'Veteran Presence', 'Carry five veteran leaders age 30 or older.', 'roster', 'bronze', 'veteran_count', 5, 'whistle'),
  buildAchievement('roster:full_house', 'Full House', 'Carry a full roster and full practice squad.', 'roster', 'silver', 'full_house', 1, 'locker'),
  buildAchievement('roster:cap_wizard', 'Cap Wizard', 'Stay under the cap with a top-tier roster.', 'roster', 'gold', 'cap_wizard', 1, 'coins'),
  buildAchievement('roster:iron_man_squad', 'Iron Man Squad', 'Finish the season without anyone on IR.', 'roster', 'gold', 'no_ir_season', 1, 'anvil'),
  buildAchievement('roster:chemistry_kings', 'Chemistry Kings', 'Average 80 chemistry across the roster.', 'roster', 'silver', 'average_chemistry', 80, 'link'),

  buildAchievement('draft:draft_day_genius', 'Draft Day Genius', 'Land three starters from one draft class.', 'draft', 'gold', 'starters_from_single_draft_class', 3, 'clipboard'),
  buildAchievement('draft:steal_of_the_draft', 'Steal of the Draft', 'Turn a mid-round pick into a starter.', 'draft', 'silver', 'late_round_starters', 1, 'diamond'),
  buildAchievement('draft:trade_up_hero', 'Trade Up Hero', 'Move up and land a foundational prospect.', 'draft', 'gold', 'trade_up_foundation', 1, 'ladder'),
  buildAchievement('draft:pick_hoarder', 'Pick Hoarder', 'Own ten draft picks in one class.', 'draft', 'silver', 'draft_pick_count', 10, 'stack'),
  buildAchievement('draft:comp_pick_master', 'Comp Pick Master', 'Earn four compensatory picks in a single class.', 'draft', 'gold', 'comp_picks', 4, 'comp'),
  buildAchievement('draft:conditional_victory', 'Conditional Victory', 'Cash in a conditional pick upgrade.', 'draft', 'silver', 'conditional_pick_upgrades', 1, 'swap'),
  buildAchievement('draft:scout_elite', 'Scout Elite', 'Hire an elite scout.', 'draft', 'bronze', 'elite_scouts', 1, 'scope'),
  buildAchievement('draft:combine_king', 'Combine King', 'Run combine work on 20 prospects.', 'draft', 'silver', 'combine_actions', 20, 'stopwatch'),

  buildAchievement('financial:money_ball', 'Money Ball', 'Win while carrying a bottom-five payroll.', 'financial', 'gold', 'moneyball', 1, 'ledger'),
  buildAchievement('financial:big_spender', 'Big Spender', 'Use nearly all of the cap.', 'financial', 'silver', 'max_cap_usage', 1, 'cash'),
  buildAchievement('financial:promise_keeper', 'Promise Keeper', 'Fulfill ten promises.', 'financial', 'gold', 'fulfilled_promises', 10, 'handshake'),
  buildAchievement('financial:agent_tamer', 'Agent Tamer', 'Win a hardball negotiation on your terms.', 'financial', 'silver', 'hardball_bargains', 1, 'briefcase'),
  buildAchievement('financial:facility_mogul', 'Facility Mogul', 'Max every facility upgrade.', 'financial', 'platinum', 'max_facilities', 1, 'building'),
  buildAchievement('financial:budget_genius', 'Budget Genius', 'Stay cap-positive across five seasons.', 'financial', 'gold', 'positive_cap_years', 5, 'calculator'),

  buildAchievement('coaching:coaching_tree', 'Coaching Tree', 'Develop three coaches to level five or higher.', 'coaching', 'gold', 'high_level_coaches', 3, 'tree'),
  buildAchievement('coaching:mentor_master', 'Mentor Master', 'Run five active mentoring pairs.', 'coaching', 'silver', 'active_mentoring_pairs', 5, 'mentor'),
  buildAchievement('coaching:training_camp_mvp', 'Training Camp MVP', 'Produce a breakout training gain of five OVR.', 'coaching', 'silver', 'training_breakouts', 1, 'camp'),
  buildAchievement('coaching:scheme_innovator', 'Scheme Innovator', 'Win with a non-default scheme identity.', 'coaching', 'silver', 'scheme_innovator', 1, 'playbook'),
  buildAchievement('coaching:medical_marvel', 'Medical Marvel', 'Pair elite medical staff with zero season-ending injuries.', 'coaching', 'gold', 'medical_marvel', 1, 'cross'),

  buildAchievement('narrative:media_darling', 'Media Darling', 'Log ten positive press conferences.', 'narrative', 'silver', 'positive_press_conferences', 10, 'mic'),
  buildAchievement('narrative:rivalry_igniter', 'Rivalry Igniter', 'Push a rivalry into blood-feud territory.', 'narrative', 'gold', 'blood_feud_rivalries', 1, 'flame'),
  buildAchievement('narrative:breaking_news', 'Breaking News', 'Generate 50 league news items in one season.', 'narrative', 'gold', 'news_items_current_season', 50, 'ticker'),
  buildAchievement('narrative:story_time', 'Story Time', 'Carry five active story arcs at once.', 'narrative', 'gold', 'active_story_arcs', 5, 'book'),
  buildAchievement('narrative:cool_under_pressure', 'Cool Under Pressure', 'Keep the narrative intensity low for a sustained stretch.', 'narrative', 'silver', 'cool_under_pressure', 1, 'ice'),

  buildAchievement('records:record_breaker', 'Record Breaker', 'Break any franchise record.', 'records', 'silver', 'records_broken', 1, 'record'),
  buildAchievement('records:record_collector', 'Record Collector', 'Hold five records at once.', 'records', 'gold', 'records_held', 5, 'shelf'),
  buildAchievement('records:hall_of_fame_class', 'Hall of Fame Class', 'See one of your players inducted.', 'records', 'gold', 'hall_of_famers', 1, 'hall'),
  buildAchievement('records:all_time_great', 'All-Time Great', 'Roster a player with a 90+ peak.', 'records', 'platinum', 'peak_ovr_90', 1, 'legend'),

  buildAchievement('milestones:century_club', 'Century Club', 'Reach 100 franchise wins.', 'milestones', 'gold', 'franchise_wins', 100, '100'),
  buildAchievement('milestones:marathon_man', 'Marathon Man', 'Play ten seasons.', 'milestones', 'gold', 'seasons_played', 10, 'clock'),
  buildAchievement('milestones:loyal_servant', 'Loyal Servant', 'Keep the same head coach leading for eight seasons.', 'milestones', 'gold', 'hc_tenure', 8, 'cap'),
  buildAchievement('milestones:globetrotter', 'Globetrotter', 'Complete trades with every other team.', 'milestones', 'platinum', 'trade_partners', 31, 'globe'),

  buildAchievement('hidden:cinderella_story', 'Cinderella Story', 'Win the title from the very bottom of the bracket.', 'hidden', 'platinum', 'cinderella_story', 1, 'mask'),
  buildAchievement('hidden:comeback_kings', 'Comeback Kings', 'Survive a playoff run built on big comebacks.', 'hidden', 'platinum', 'playoff_comebacks', 3, 'comeback'),
];

function userTeam(game: GameState): Team {
  return Object.values(game.teams).find((teamEntry) => teamEntry.isUser) ?? Object.values(game.teams)[0]!;
}

function thresholdValue(achievement: Achievement): number {
  if (typeof achievement.condition.threshold === 'number') return achievement.condition.threshold;
  if (typeof achievement.condition.threshold === 'boolean') return achievement.condition.threshold ? 1 : 0;
  return Number(achievement.condition.threshold) || 1;
}

function progress(achievement: Achievement, current: number, label?: string): MetricResult {
  const target = Math.max(1, thresholdValue(achievement));
  const safeCurrent = Math.max(0, current);
  return {
    current: safeCurrent,
    target,
    percentage: Math.max(0, Math.min(100, Math.round((safeCurrent / target) * 100))),
    label: label ?? `${safeCurrent}/${target}`,
    complete: safeCurrent >= target,
  };
}

function longestChampionshipStreak(game: GameState, teamId: string): number {
  const seasons = [...(game.franchiseHistory ?? [])]
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => a.year - b.year);
  let streak = 0;
  let best = 0;
  for (const season of seasons) {
    if (season.playoffFinish === 'champion') {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }
  return best;
}

function sameCoachTenure(game: GameState, team: Team): number {
  const coachId = team.staff.hc?.id ?? null;
  if (!coachId) return 0;
  const history = (game.coachingHistory ?? []).find((entry) => entry.coachId === coachId);
  if (!history) return 0;
  const stint = history.teams.find((entry) => entry.teamId === team.id);
  if (!stint) return 0;
  return Math.max(0, stint.endYear - stint.startYear + 1);
}

function dynastyScore(game: GameState, teamId: string): number {
  const history = game.franchiseHistory ?? [];
  const timeline = game.dynastyTimeline ?? [];
  const championships = history.filter((entry) => entry.teamId === teamId && entry.playoffFinish === 'champion').length;
  const playoffAppearances = history.filter((entry) => entry.teamId === teamId && entry.playoffFinish !== 'missed').length;
  const awards = timeline.filter((entry) => entry.teamIds.includes(teamId) && entry.type === 'award').length;
  const records = timeline.filter((entry) => entry.teamIds.includes(teamId) && entry.type === 'record').length;
  return championships * 10 + playoffAppearances * 3 + awards * 2 + records;
}

function championSeed(game: GameState, teamId: string): number | null {
  const bracket = game.playoffBracket;
  if (!bracket || bracket.championTeamId !== teamId) return null;
  const seed = [...bracket.afc, ...bracket.nfc].find((entry) => entry.teamId === teamId);
  return seed?.seed ?? null;
}

function countHeldRecords(game: GameState, team: Team): number {
  if (!game.records) return 0;
  let total = 0;
  for (const bucket of [game.records.singleSeason, game.records.career, game.records.franchise]) {
    for (const entries of Object.values(bucket)) {
      const leader = entries[0];
      if (!leader?.playerId) continue;
      const player = game.players[leader.playerId];
      if (player?.teamId === team.id) total += 1;
    }
  }
  return total;
}

function lateRoundStarters(team: Team): number {
  return team.roster.filter((player) => player.isStarter && player.draftRound >= 4).length;
}

function combineActions(game: GameState): number {
  return Object.values(game.offseasonState?.scoutingState ?? {})
    .reduce((total, state) => total + state.actions.filter((action) => action === 'combine').length, 0);
}

function fulfilledPromises(game: GameState, teamId: string): number {
  return (game.handshakes ?? []).filter((handshake) => handshake.teamId === teamId && handshake.status === 'fulfilled').length;
}

function positivePressConferences(game: GameState, teamId: string): number {
  return (game.recentPressConferences ?? []).filter((conference) =>
    conference.teamId === teamId && (conference.tone === 'confident' || conference.tone === 'fired_up')).length;
}

const metricMap: Record<string, MetricFn> = {
  championships: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).filter((entry) => entry.teamId === team.id && entry.playoffFinish === 'champion').length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} championships`);
  },
  consecutive_championships: (game, team, achievement) => {
    const current = longestChampionshipStreak(game, team.id);
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} championships`);
  },
  perfect_season: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).some((entry) =>
      entry.teamId === team.id &&
      entry.playoffFinish === 'champion' &&
      entry.losses === 0 &&
      entry.ties === 0,
    ) ? 1 : 0;
    return progress(achievement, current, current ? 'Perfect season complete' : '0/1 perfect seasons');
  },
  worst_to_first: (game, team, achievement) => {
    const seasons = [...(game.franchiseHistory ?? [])]
      .filter((entry) => entry.teamId === team.id)
      .sort((a, b) => a.year - b.year);
    const current = seasons.some((entry, index) => {
      const previous = seasons[index - 1];
      return Boolean(previous && previous.wins < 8 && entry.wins >= 10 && entry.playoffFinish !== 'missed');
    }) ? 1 : 0;
    return progress(achievement, current, current ? 'Worst-to-first complete' : '0/1 turnarounds');
  },
  elite_defense_years: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).filter((entry) =>
      entry.teamId === team.id && entry.pointDifferential >= 80).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} elite seasons`);
  },
  dynasty_score: (game, team, achievement) => {
    const current = dynastyScore(game, team.id);
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} dynasty score`);
  },
  conference_finals: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).filter((entry) =>
      entry.teamId === team.id && ['conference', 'champion'].includes(entry.playoffFinish)).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} conference runs`);
  },
  playoff_appearances: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).filter((entry) =>
      entry.teamId === team.id && entry.playoffFinish !== 'missed').length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} playoff berths`);
  },
  young_starters: (_game, team, achievement) => {
    const current = team.roster.filter((player) => player.isStarter && player.yearsExp <= 4).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} young starters`);
  },
  average_roster_ovr: (_game, team, achievement) => {
    const current = team.roster.reduce((total, player) => total + player.ovr, 0) / Math.max(1, team.roster.length);
    return progress(achievement, Math.round(current), `${Math.round(current)}/${thresholdValue(achievement)} avg OVR`);
  },
  average_roster_age_under: (_game, team, achievement) => {
    const currentAge = team.roster.reduce((total, player) => total + player.age, 0) / Math.max(1, team.roster.length);
    const target = thresholdValue(achievement);
    return {
      current: Math.max(0, Math.round(target - currentAge)),
      target: 1,
      percentage: currentAge < target ? 100 : 0,
      label: `${currentAge.toFixed(1)} avg age`,
      complete: currentAge < target,
    };
  },
  veteran_count: (_game, team, achievement) => {
    const current = team.roster.filter((player) => player.age >= 30).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} veterans`);
  },
  full_house: (_game, team, achievement) => {
    const current = team.roster.length >= 53 && team.practiceSquad.length >= 16 ? 1 : 0;
    return progress(achievement, current, current ? 'Full house ready' : `${team.roster.length}/53 roster // ${team.practiceSquad.length}/16 PS`);
  },
  cap_wizard: (_game, team, achievement) => {
    const avgOvr = team.roster.reduce((total, player) => total + player.ovr, 0) / Math.max(1, team.roster.length);
    const current = team.capSpace >= 0 && avgOvr >= 78 ? 1 : 0;
    return progress(achievement, current, current ? 'Cap healthy with contender talent' : `${team.capSpace.toFixed(1)} cap space`);
  },
  no_ir_season: (_game, team, achievement) => {
    const current = team.roster.some((player) => player.injury?.onIR) ? 0 : 1;
    return progress(achievement, current, current ? 'No IR placements active' : 'IR placement detected');
  },
  average_chemistry: (_game, team, achievement) => {
    const current = team.roster.reduce((total, player) => total + player.chemistry, 0) / Math.max(1, team.roster.length);
    return progress(achievement, Math.round(current), `${Math.round(current)}/${thresholdValue(achievement)} chemistry`);
  },
  starters_from_single_draft_class: (_game, team, achievement) => {
    const starterCounts = new Map<number, number>();
    for (const player of team.roster.filter((player) => player.isStarter)) {
      starterCounts.set(player.draftYear, (starterCounts.get(player.draftYear) ?? 0) + 1);
    }
    const current = Math.max(0, ...starterCounts.values());
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} starters from one class`);
  },
  late_round_starters: (_game, team, achievement) => progress(achievement, lateRoundStarters(team), `${lateRoundStarters(team)}/${thresholdValue(achievement)} late-round starters`),
  trade_up_foundation: (_game, team, achievement) => {
    const current = team.txLog.some((entry) => entry.type.includes('TRADE') && entry.toTeamId === team.id) ? 1 : 0;
    return progress(achievement, current, current ? 'Trade-up foundation found' : 'No trade-up foundation yet');
  },
  draft_pick_count: (game, team, achievement) => {
    const current = team.draftPicks.filter((pick) => pick.year === game.year).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} picks`);
  },
  comp_picks: (game, team, achievement) => {
    const current = team.draftPicks.filter((pick) => pick.year === game.year && pick.isCompPick).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} comp picks`);
  },
  conditional_pick_upgrades: (game, _team, achievement) => {
    const current = (game.conditionalPicks ?? []).filter((pick) =>
      pick.resolved && pick.resolvedPick && pick.resolvedPick.round < pick.basePick.round).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} upgrades`);
  },
  elite_scouts: (game, _team, achievement) => {
    const current = (game.scoutingDepartment?.scouts ?? []).filter((scout) => scout.tier === 'elite').length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} elite scouts`);
  },
  combine_actions: (game, _team, achievement) => progress(achievement, combineActions(game), `${combineActions(game)}/${thresholdValue(achievement)} combine actions`),
  moneyball: (game, team, achievement) => {
    const payrolls = Object.values(game.teams).map((entry) => entry.capUsed).sort((a, b) => a - b);
    const bottomFiveThreshold = payrolls[Math.min(4, payrolls.length - 1)] ?? Infinity;
    const current = team.capUsed <= bottomFiveThreshold && team.wins > team.losses ? 1 : 0;
    return progress(achievement, current, current ? 'Winning on a budget' : `$${team.capUsed.toFixed(1)}M payroll`);
  },
  max_cap_usage: (_game, team, achievement) => progress(achievement, team.capSpace <= 1 ? 1 : 0, team.capSpace <= 1 ? 'Cap nearly maxed' : `${team.capSpace.toFixed(1)}M remaining`),
  fulfilled_promises: (game, team, achievement) => progress(achievement, fulfilledPromises(game, team.id), `${fulfilledPromises(game, team.id)}/${thresholdValue(achievement)} promises`),
  hardball_bargains: (game, team, achievement) => {
    const current = (game.recentPressConferences ?? []).some((conference) => conference.teamId === team.id && conference.topic.includes('contract')) ? 1 : 0;
    return progress(achievement, current, current ? 'Won one hardball battle' : 'No hardball bargain logged');
  },
  max_facilities: (_game, team, achievement) => {
    const current = team.facilityState.facilities.every((facility) => facility.level === 3) ? 1 : 0;
    return progress(achievement, current, current ? 'All facilities maxed' : `${team.facilityState.facilities.filter((facility) => facility.level === 3).length}/${team.facilityState.facilities.length} maxed`);
  },
  positive_cap_years: (game, team, achievement) => {
    const years = (game.franchiseHistory ?? []).filter((entry) => entry.teamId === team.id).length;
    const current = team.capSpace >= 0 ? years : 0;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} cap-positive years`);
  },
  high_level_coaches: (_game, team, achievement) => {
    const current = [team.staff.hc, team.staff.oc, team.staff.dc].filter((coach) => (coach?.level ?? 0) >= 5).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} coaches`);
  },
  active_mentoring_pairs: (_game, team, achievement) => progress(achievement, team.mentoringPairs.length, `${team.mentoringPairs.length}/${thresholdValue(achievement)} active pairs`),
  training_breakouts: (_game, team, achievement) => {
    const current = team.roster.some((player) => player.pot - player.ovr >= 10) ? 1 : 0;
    return progress(achievement, current, current ? 'Breakout candidate found' : 'No +5 breakout logged');
  },
  scheme_innovator: (_game, team, achievement) => {
    const current = team.wins > team.losses && team.offScheme !== 'spread' && team.defScheme !== 'cover_3' ? 1 : 0;
    return progress(achievement, current, current ? 'Winning outside the defaults' : `${team.offScheme}/${team.defScheme}`);
  },
  medical_marvel: (_game, team, achievement) => {
    const current = team.medicalStaff?.tier === 'elite' && !team.roster.some((player) => player.injury?.severityTier === 'season_ending') ? 1 : 0;
    return progress(achievement, current, current ? 'Elite medical season' : 'Medical staff or injuries short of target');
  },
  positive_press_conferences: (game, team, achievement) => progress(achievement, positivePressConferences(game, team.id), `${positivePressConferences(game, team.id)}/${thresholdValue(achievement)} positive availabilities`),
  blood_feud_rivalries: (game, team, achievement) => {
    const current = (game.leagueRivalries ?? []).filter((rivalry) =>
      (rivalry.teamA === team.id || rivalry.teamB === team.id) && rivalry.intensity >= 85).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} blood feuds`);
  },
  news_items_current_season: (game, _team, achievement) => {
    const current = (game.leagueNews ?? []).filter((item) => item.year === game.year).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} news items`);
  },
  active_story_arcs: (game, _team, achievement) => progress(achievement, game.narrativeState?.activeArcs?.length ?? 0, `${game.narrativeState?.activeArcs?.length ?? 0}/${thresholdValue(achievement)} active arcs`),
  cool_under_pressure: (game, _team, achievement) => {
    const currentIntensity = game.narrativeIntensity?.current ?? 100;
    const recentBeats = game.narrativeIntensity?.recentBeats?.length ?? 0;
    const current = currentIntensity < 30 && recentBeats >= 8 ? 1 : 0;
    return progress(achievement, current, current ? 'Narrative pulse stayed cool' : `Intensity ${Math.round(currentIntensity)}`);
  },
  records_broken: (game, team, achievement) => {
    const historyEntries = game.franchiseHistory ?? [];
    const history = historyEntries.find((entry) => entry.teamId === team.id && entry.year === game.year - 1)
      ?? historyEntries.find((entry) => entry.teamId === team.id && entry.year === game.year);
    const current = history?.recordsBroken.length ?? 0;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} records broken`);
  },
  records_held: (game, team, achievement) => {
    const current = countHeldRecords(game, team);
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} records held`);
  },
  hall_of_famers: (game, team, achievement) => {
    const current = (game.hallOfFame ?? []).filter((entry) => entry.teams.includes(team.id)).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} inductees`);
  },
  peak_ovr_90: (game, team, achievement) => {
    const current = (game.playerArchive ?? []).some((entry) =>
      entry.teamHistory.some((stint) => stint.teamId === team.id) && entry.peakOvr >= 90,
    ) || team.roster.some((player) => player.ovr >= 90) ? 1 : 0;
    return progress(achievement, current, current ? 'All-time great on file' : 'No 90+ peak yet');
  },
  franchise_wins: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? [])
      .filter((entry) => entry.teamId === team.id)
      .reduce((total, entry) => total + entry.wins, team.wins);
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} wins`);
  },
  seasons_played: (game, team, achievement) => {
    const current = (game.franchiseHistory ?? []).filter((entry) => entry.teamId === team.id).length;
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} seasons`);
  },
  hc_tenure: (game, team, achievement) => {
    const current = sameCoachTenure(game, team);
    return progress(achievement, current, `${current}/${thresholdValue(achievement)} seasons together`);
  },
  trade_partners: (_game, team, achievement) => {
    const partners = new Set(
      team.txLog.flatMap((entry) => [entry.fromTeamId, entry.toTeamId]).filter((teamId): teamId is string => Boolean(teamId && teamId !== team.id)),
    );
    return progress(achievement, partners.size, `${partners.size}/${thresholdValue(achievement)} trade partners`);
  },
  cinderella_story: (game, team, achievement) => {
    const seed = championSeed(game, team.id);
    const current = seed !== null && seed >= 7 ? 1 : 0;
    return progress(achievement, current, current ? 'Cinderella run complete' : 'Keep the underdog dream alive');
  },
  playoff_comebacks: (_game, _team, achievement) => progress(achievement, 0, `0/${thresholdValue(achievement)} tracked playoff comebacks`),
};

export function getAchievementCatalog(): Achievement[] {
  return ACHIEVEMENT_CATALOG.map((achievement) => ({ ...achievement }));
}

export function createDefaultAchievements(): Achievement[] {
  return getAchievementCatalog().map((achievement) => ({
    ...achievement,
    unlockedYear: null,
    unlockedWeek: null,
  }));
}

function ensureAchievements(game: GameState): Achievement[] {
  if (!game.achievements || game.achievements.length === 0) {
    game.achievements = createDefaultAchievements();
  }
  return game.achievements;
}

function resolveMetric(game: GameState, achievement: Achievement): MetricResult {
  const team = userTeam(game);
  const metric = metricMap[achievement.condition.type];
  if (!metric) {
    return progress(achievement, 0);
  }
  return metric(game, team, achievement);
}

export function checkAchievements(game: GameState): Achievement[] {
  const achievements = ensureAchievements(game);
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of achievements) {
    if (achievement.unlockedYear !== null) continue;
    const metric = resolveMetric(game, achievement);
    if (!metric.complete) continue;
    achievement.unlockedYear = game.year;
    achievement.unlockedWeek = game.week;
    newlyUnlocked.push({ ...achievement });
  }

  return newlyUnlocked;
}

export function getUnlockedAchievements(game: GameState): Achievement[] {
  return ensureAchievements(game).filter((achievement) => achievement.unlockedYear !== null);
}

export function getAchievementProgress(game: GameState, achievementId: string): AchievementProgress {
  const achievement = ensureAchievements(game).find((entry) => entry.id === achievementId);
  if (!achievement) {
    return {
      achievementId,
      current: 0,
      target: 1,
      percentage: 0,
      label: '0/1',
      hidden: false,
      complete: false,
    };
  }

  if (achievement.category === 'hidden' && achievement.unlockedYear === null) {
    return {
      achievementId,
      current: 0,
      target: thresholdValue(achievement),
      percentage: 0,
      label: '???',
      hidden: true,
      complete: false,
    };
  }

  const metric = resolveMetric(game, achievement);
  return {
    achievementId,
    current: metric.current,
    target: metric.target,
    percentage: metric.percentage,
    label: metric.label,
    hidden: false,
    complete: metric.complete,
  };
}
