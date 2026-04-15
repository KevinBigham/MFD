import pressConferenceTemplatesJson from '../../content/broadcast/press-conference-templates.json';
import agmDialogueJson from '../../content/broadcast/agm-dialogue.json';
import passingDefenseStTemplatesJson from '../../content/broadcast/passing-defense-st-templates.json';
import rushingTemplatesJson from '../../content/broadcast/rushing-templates.json';
import callYourShotReactionsJson from '../../content/call-your-shot-reactions.json';
import awardSpeechesJson from '../../content/ceremonies/award-speeches.json';
import coachArchetypesJson from '../../content/coaching/coach-archetypes.json';
import contingencyCalloutsJson from '../../content/contingency-callouts.json';
import halftimePerformersJson from '../../content/halftime/halftime-performers.json';
import playerNamesJson from '../../content/names/player-names.json';
import apologyTourJson from '../../content/narrative/apology-tour.json';
import storyArcTemplatesJson from '../../content/narrative/story-arc-templates.json';
import leagueNewsTemplatesJson from '../../content/news/league-news-templates.json';
import personalityFlavorJson from '../../content/personalities/personality-flavor.json';
import scoutingReportTemplatesJson from '../../content/scouting/scouting-report-templates.json';
import socialFeedTemplatesJson from '../../content/social/social-feed-templates.json';
import team_atl_peaches_json from '../../content/teams/atl-peaches.json';
import team_bal_crab_pickers_json from '../../content/teams/bal-crab-pickers.json';
import team_bos_chowderheads_json from '../../content/teams/bos-chowderheads.json';
import team_chi_deep_dish_json from '../../content/teams/chi-deep-dish.json';
import team_cin_flying_pigs_json from '../../content/teams/cin-flying-pigs.json';
import team_cle_rockers_json from '../../content/teams/cle-rockers.json';
import team_clt_bootleggers_json from '../../content/teams/clt-bootleggers.json';
import team_col_astronauts_json from '../../content/teams/col-astronauts.json';
import team_dal_rodeos_json from '../../content/teams/dal-rodeos.json';
import team_dc_filibusters_json from '../../content/teams/dc-filibusters.json';
import team_den_wall_street_json from '../../content/teams/den-wall-street.json';
import team_det_music_machine_json from '../../content/teams/det-music-machine.json';
import team_hou_brisket_spaceships_json from '../../content/teams/hou-brisket-spaceships.json';
import team_ind_speed_racers_json from '../../content/teams/ind-speed-racers.json';
import team_jax_swamps_json from '../../content/teams/jax-swamps.json';
import team_kc_bbq_fountains_json from '../../content/teams/kc-bbq-fountains.json';
import team_la_traffic_jams_json from '../../content/teams/la-traffic-jams.json';
import team_lv_cardsharks_json from '../../content/teams/lv-cardsharks.json';
import team_mia_sunny_place_json from '../../content/teams/mia-sunny-place.json';
import team_min_juicy_lucy_lakers_json from '../../content/teams/min-juicy-lucy-lakers.json';
import team_nsh_bible_belt_json from '../../content/teams/nsh-bible-belt.json';
import team_nyc_cabbies_json from '../../content/teams/nyc-cabbies.json';
import team_orl_rollercoasters_json from '../../content/teams/orl-rollercoasters.json';
import team_phi_bell_ringers_json from '../../content/teams/phi-bell-ringers.json';
import team_phx_grand_canyons_json from '../../content/teams/phx-grand-canyons.json';
import team_pit_iron_smelters_json from '../../content/teams/pit-iron-smelters.json';
import team_sa_rivers_json from '../../content/teams/sa-rivers.json';
import team_sd_surfers_json from '../../content/teams/sd-surfers.json';
import team_sea_grunge_json from '../../content/teams/sea-grunge.json';
import team_sf_sourdoughs_json from '../../content/teams/sf-sourdoughs.json';
import team_stl_toasted_raviolis_json from '../../content/teams/stl-toasted-raviolis.json';
import team_tb_pirates_json from '../../content/teams/tb-pirates.json';
import {
  CallYourShotReactionsContentSchema,
  ContingencyCalloutsContentSchema,
  ApologyTourContentSchema,
  type CallYourShotReactionContent,
  type CallYourShotReactionOutcome,
  type ContingencyCalloutKey,
  type ApologyTourBeatContent,
} from './types/content-schemas';

export type {
  CallYourShotReactionContent,
  CallYourShotReactionOutcome,
  ContingencyCalloutKey,
  ApologyTourBeatContent,
} from './types/content-schemas';

export type PressConferenceScenario =
  | 'win_blowout'
  | 'win_close'
  | 'loss_blowout'
  | 'loss_close'
  | 'rivalry_win'
  | 'rivalry_loss'
  | 'playoff_win'
  | 'playoff_loss'
  | 'super_bowl_win'
  | 'super_bowl_loss';

export interface PressConferenceScenarioContent {
  questions: readonly string[];
  answers_high_ambition: readonly string[];
  answers_mid: readonly string[];
  answers_low_ambition: readonly string[];
}

export type StoryArcContentTemplate =
  | 'breakout_season'
  | 'veteran_farewell'
  | 'coaching_hot_seat'
  | 'trade_demand'
  | 'rookie_struggle'
  | 'dynasty_defense'
  | 'underdog_run'
  | 'locker_room_rift'
  | 'record_chase'
  | 'comeback_from_injury';

export type StoryArcContentPhase = 'start' | 'peak' | 'resolution_good' | 'resolution_bad';

export interface StoryArcPhaseContent {
  headlines: readonly string[];
  bodies: readonly string[];
}

export type NameFrequencyTier = 'common' | 'uncommon' | 'rare';

interface PlayerNameContent {
  firstNames: Record<NameFrequencyTier, readonly string[]>;
  lastNames: Record<NameFrequencyTier, readonly string[]>;
}

export const PLAYER_SOCIAL_SCENARIOS = [
  'after_big_win',
  'after_tough_loss',
  'after_personal_best',
  'trade_rumors',
  'contract_holdout',
  'rivalry_week',
  'playoff_hype',
  'retirement_announcement',
  'injury_update',
  'offseason_grind',
] as const;

export const FAN_SOCIAL_SCENARIOS = [
  'after_big_win',
  'after_tough_loss',
  'fire_coach',
  'draft_night',
  'trade_reaction',
  'rivalry_trash_talk',
] as const;

export const ANALYST_SOCIAL_SCENARIOS = [
  'hot_take',
  'stat_drop',
  'trade_grade',
  'power_rankings',
] as const;

export const REPORTER_SOCIAL_SCENARIOS = [
  'breaking_news',
  'injury_report',
  'source_says',
  'rumor_mill',
] as const;

export type PlayerSocialScenario = typeof PLAYER_SOCIAL_SCENARIOS[number];
export type FanSocialScenario = typeof FAN_SOCIAL_SCENARIOS[number];
export type AnalystSocialScenario = typeof ANALYST_SOCIAL_SCENARIOS[number];
export type ReporterSocialScenario = typeof REPORTER_SOCIAL_SCENARIOS[number];
export type SocialContentSource = 'player' | 'fan' | 'analyst' | 'reporter';

interface SocialFeedTemplateContent {
  player_posts: Record<PlayerSocialScenario, readonly string[]>;
  fan_posts: Record<FanSocialScenario, readonly string[]>;
  analyst_posts: Record<AnalystSocialScenario, readonly string[]>;
  reporter_posts: Record<ReporterSocialScenario, readonly string[]>;
}

export const LEAGUE_NEWS_EVENT_TYPES = [
  'trade_completed',
  'free_agent_signing',
  'player_cut',
  'coaching_hire',
  'coaching_fired',
  'injury_major',
  'injury_return',
  'record_broken',
  'award_won',
  'retirement',
  'holdout',
  'suspension',
  'expansion_announced',
  'relocation',
  'playoff_clinch',
  'playoff_elimination',
  'draft_pick_trade',
  'contract_extension',
  'franchise_tag',
  'cba_update',
] as const;

export type LeagueNewsEventType = typeof LEAGUE_NEWS_EVENT_TYPES[number];

export interface LeagueNewsTemplateCategory {
  headlines: readonly string[];
  blurbs: readonly string[];
}

export interface HalftimePerformerContent {
  name: string;
  genre: string;
  showDescription: string;
  crowdReaction: string;
}

export const PA_EVENT_TYPES = [
  'first_down',
  'touchdown_home',
  'touchdown_away',
  'field_goal_home',
  'turnover_home',
  'sack_home',
  'big_play_home',
  'end_of_quarter',
  'two_minute_warning',
  'player_intro',
  'timeout',
] as const;

export type PAEventType = typeof PA_EVENT_TYPES[number];

interface HalftimeContent {
  performers: readonly HalftimePerformerContent[];
  pa_templates: Record<PAEventType, readonly string[]>;
}

interface TeamContent {
  id: string;
  paAnnouncer?: {
    firstDownCall?: string;
    touchdownCall?: string;
  };
}

interface TeamPAOverrides {
  firstDownCall?: string;
  touchdownCall?: string;
}

export type ScoutingTemplateTier =
  | 'elite'
  | 'solid'
  | 'fixable'
  | 'concerning'
  | 'first_round'
  | 'mid_round'
  | 'late_round'
  | 'comparison';

interface ScoutingTemplateBucket {
  strengths_elite: readonly string[];
  strengths_solid: readonly string[];
  weaknesses_fixable: readonly string[];
  weaknesses_concerning: readonly string[];
  projection_first_round: readonly string[];
  projection_mid_round: readonly string[];
  projection_late_round: readonly string[];
  comparison_template: readonly string[];
}

interface ScoutingTemplatesContent {
  scouting_templates: Record<string, ScoutingTemplateBucket>;
}

export interface CoachArchetypeContent {
  id: string;
  press_conference: readonly string[];
  sideline_reaction_good: readonly string[];
  sideline_reaction_bad: readonly string[];
}

interface CoachArchetypesContent {
  coach_archetypes: Record<string, Omit<CoachArchetypeContent, 'id'>>;
  scheme_descriptions: Record<string, Record<string, Record<string, string>>>;
}

interface AwardSpeechVariantBucket {
  acceptance_humble?: readonly string[];
  acceptance_confident?: readonly string[];
  presenter_intro?: readonly string[];
  induction_speech?: readonly string[];
}

interface AwardSpeechContent {
  award_speeches: Record<string, AwardSpeechVariantBucket>;
}

type PersonalityFlavorScenario =
  | 'socialPost'
  | 'pressQuote'
  | 'scoutReport'
  | 'lockerRoomVibe'
  | 'contractDemand';

type PersonalityDimension = 'workEthic' | 'loyalty' | 'greed' | 'pressure' | 'ambition';
type PersonalityTier = 'low' | 'mid' | 'high';

type PersonalityFlavorContent = Record<PersonalityDimension, Record<PersonalityTier, Record<PersonalityFlavorScenario, readonly string[]>>>;

type AgmDialogueContent = Record<string, Record<string, Record<string, readonly string[]>>>;

interface BroadcastTemplateCategory {
  openers: readonly string[];
  endings: readonly string[];
}

export interface AwardSpeechResult {
  presenterIntro: string;
  acceptance: string;
}

export interface PersonalityInput {
  workEthic: number;
  loyalty: number;
  greed: number;
  pressure: number;
  ambition: number;
}

type CallYourShotReactionsContent = {
  reactions: CallYourShotReactionContent[];
};

type ContingencyCalloutsContent = {
  callouts: Record<ContingencyCalloutKey, readonly string[]>;
};

const pressConferenceTemplates = pressConferenceTemplatesJson as Record<PressConferenceScenario, PressConferenceScenarioContent>;
const storyArcTemplates = storyArcTemplatesJson as Record<StoryArcContentTemplate, Record<StoryArcContentPhase, StoryArcPhaseContent>>;
const playerNames = playerNamesJson as PlayerNameContent;
const socialFeedTemplates = socialFeedTemplatesJson as SocialFeedTemplateContent;
const leagueNewsTemplates = leagueNewsTemplatesJson as Record<LeagueNewsEventType, LeagueNewsTemplateCategory>;
const halftimeContent = halftimePerformersJson as HalftimeContent;
const scoutingReportTemplates = scoutingReportTemplatesJson as ScoutingTemplatesContent;
const coachArchetypeContent = coachArchetypesJson as CoachArchetypesContent;
const awardSpeechContent = awardSpeechesJson as AwardSpeechContent;
const personalityFlavorContent = personalityFlavorJson as PersonalityFlavorContent;
const agmDialogueContent = agmDialogueJson as AgmDialogueContent;
const callYourShotReactionsContent = CallYourShotReactionsContentSchema.parse(
  callYourShotReactionsJson,
) as CallYourShotReactionsContent;
const contingencyCalloutsContent = ContingencyCalloutsContentSchema.parse(
  contingencyCalloutsJson,
) as ContingencyCalloutsContent;
const apologyTourContent = ApologyTourContentSchema.parse(apologyTourJson);
const broadcastTemplateContent = {
  ...(passingDefenseStTemplatesJson as Record<string, BroadcastTemplateCategory>),
  ...(rushingTemplatesJson as Record<string, BroadcastTemplateCategory>),
} satisfies Record<string, BroadcastTemplateCategory>;
const teamContentList = [
  team_atl_peaches_json,
  team_bal_crab_pickers_json,
  team_bos_chowderheads_json,
  team_chi_deep_dish_json,
  team_cin_flying_pigs_json,
  team_cle_rockers_json,
  team_clt_bootleggers_json,
  team_col_astronauts_json,
  team_dal_rodeos_json,
  team_dc_filibusters_json,
  team_den_wall_street_json,
  team_det_music_machine_json,
  team_hou_brisket_spaceships_json,
  team_ind_speed_racers_json,
  team_jax_swamps_json,
  team_kc_bbq_fountains_json,
  team_la_traffic_jams_json,
  team_lv_cardsharks_json,
  team_mia_sunny_place_json,
  team_min_juicy_lucy_lakers_json,
  team_nsh_bible_belt_json,
  team_nyc_cabbies_json,
  team_orl_rollercoasters_json,
  team_phi_bell_ringers_json,
  team_phx_grand_canyons_json,
  team_pit_iron_smelters_json,
  team_sa_rivers_json,
  team_sd_surfers_json,
  team_sea_grunge_json,
  team_sf_sourdoughs_json,
  team_stl_toasted_raviolis_json,
  team_tb_pirates_json,
] as const satisfies readonly TeamContent[];

const teamPAOverrides = teamContentList.reduce<Record<string, TeamPAOverrides>>((map, team) => {
  map[team.id.toUpperCase()] = {
    firstDownCall: team.paAnnouncer?.firstDownCall,
    touchdownCall: team.paAnnouncer?.touchdownCall,
  };
  return map;
}, {});

function pickWithRng<T>(items: readonly T[], rng: () => number, label: string): T {
  if (items.length === 0) {
    throw new Error(`Missing content items for ${label}.`);
  }
  return items[Math.floor(rng() * items.length)]!;
}

const COACH_ARCHETYPE_NORMALIZATION: Record<string, string> = {
  strategist: 'offensive_genius',
  'qb guru': 'offensive_genius',
  'air attack': 'offensive_genius',
  innovator: 'analytics_innovator',
  motivator: 'motivational_leader',
  "player's coach": 'players_coach',
  'players coach': 'players_coach',
  'db whisperer': 'players_coach',
  disciplinarian: 'old_school_disciplinarian',
  'run stuffer': 'defensive_mastermind',
  'blitz master': 'defensive_mastermind',
  'run coordinator': 'defensive_mastermind',
};

const SCOUTING_TIER_MAP: Record<ScoutingTemplateTier, keyof ScoutingTemplateBucket> = {
  elite: 'strengths_elite',
  solid: 'strengths_solid',
  fixable: 'weaknesses_fixable',
  concerning: 'weaknesses_concerning',
  first_round: 'projection_first_round',
  mid_round: 'projection_mid_round',
  late_round: 'projection_late_round',
  comparison: 'comparison_template',
};

const PERSONALITY_DIMENSIONS: readonly PersonalityDimension[] = [
  'workEthic',
  'loyalty',
  'greed',
  'pressure',
  'ambition',
] as const;

function normalizeCoachArchetypeId(id: string): string {
  const normalized = id.trim().toLowerCase();
  return COACH_ARCHETYPE_NORMALIZATION[normalized] ?? normalized.replace(/\s+/g, '_');
}

function tierForPersonalityValue(value: number): PersonalityTier {
  if (value <= 3) return 'low';
  if (value >= 8) return 'high';
  return 'mid';
}

function dominantPersonalityDimension(personality: PersonalityInput): PersonalityDimension {
  return [...PERSONALITY_DIMENSIONS]
    .sort((left, right) => {
      const rightDelta = Math.abs(personality[right] - 5);
      const leftDelta = Math.abs(personality[left] - 5);
      if (rightDelta !== leftDelta) return rightDelta - leftDelta;
      return PERSONALITY_DIMENSIONS.indexOf(left) - PERSONALITY_DIMENSIONS.indexOf(right);
    })[0]!;
}

function normalizeInterpolatedText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

export function interpolateContentPlaceholders(
  template: string,
  placeholders: Record<string, string | number | null | undefined>,
): string {
  const interpolated = template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    const value = placeholders[token];
    return value === null || value === undefined ? '' : String(value);
  });
  return normalizeInterpolatedText(interpolated);
}

export function getPressConferenceScenarioContent(scenario: string): PressConferenceScenarioContent | null {
  return pressConferenceTemplates[scenario as PressConferenceScenario] ?? null;
}

export function getScoutingReportTemplate(position: string, tier: ScoutingTemplateTier): readonly string[] | null {
  const templates = scoutingReportTemplates.scouting_templates[position.toUpperCase()];
  if (!templates) return null;
  return templates[SCOUTING_TIER_MAP[tier]] ?? null;
}

export function getCoachArchetype(id: string): CoachArchetypeContent | null {
  const normalizedId = normalizeCoachArchetypeId(id);
  const content = coachArchetypeContent.coach_archetypes[normalizedId];
  if (!content) return null;
  return {
    id: normalizedId,
    ...content,
  };
}

export function getAwardSpeech(
  awardId: string,
  player: {
    name: string;
    teamName?: string | null;
    coachName?: string | null;
    year?: number | null;
    stat?: string | null;
    personality?: PersonalityInput | null;
  },
  rng: () => number = () => 0,
): AwardSpeechResult | null {
  const content = awardSpeechContent.award_speeches[awardId];
  if (!content) return null;

  const ambition = player.personality?.ambition ?? 5;
  const acceptancePool = ambition >= 8
    ? (content.acceptance_confident ?? content.acceptance_humble)
    : (content.acceptance_humble ?? content.acceptance_confident);
  const presenterPool = content.presenter_intro ?? [];
  if (!acceptancePool || acceptancePool.length === 0 || presenterPool.length === 0) return null;

  const placeholders = {
    playerName: player.name,
    teamName: player.teamName ?? 'the club',
    coachName: player.coachName ?? 'the staff',
    year: player.year ?? '',
    stat: player.stat ?? 'an outstanding season',
  };

  return {
    presenterIntro: interpolateContentPlaceholders(
      pickWithRng(presenterPool, rng, `award:${awardId}:presenter`),
      placeholders,
    ),
    acceptance: interpolateContentPlaceholders(
      pickWithRng(acceptancePool, rng, `award:${awardId}:acceptance`),
      placeholders,
    ),
  };
}

export function getPersonalityLine(
  personality: PersonalityInput,
  scenario: PersonalityFlavorScenario,
  rng: () => number = () => 0,
): string {
  const dominant = dominantPersonalityDimension(personality);
  const tier = tierForPersonalityValue(personality[dominant]);
  const bucket = personalityFlavorContent[dominant]?.[tier]?.[scenario];
  if (!bucket || bucket.length === 0) {
    throw new Error(`Missing personality content for ${dominant}:${tier}:${scenario}.`);
  }
  return pickWithRng(bucket, rng, `personality:${dominant}:${tier}:${scenario}`);
}

export function getAgmDialogueLine(
  personaId: string,
  eventKey: string,
  contextKey: string,
  rng: () => number = () => 0,
): string {
  const lines = agmDialogueContent[personaId]?.[eventKey]?.[contextKey];
  if (!lines || lines.length === 0) {
    throw new Error(`Missing AGM dialogue for ${personaId}:${eventKey}:${contextKey}.`);
  }
  return pickWithRng(lines, rng, `agm:${personaId}:${eventKey}:${contextKey}`);
}

export function getBroadcastTemplate(
  playType: string,
  bucket: keyof BroadcastTemplateCategory,
  rng: () => number = () => 0,
  placeholders: Record<string, string | number | null | undefined> = {},
): string {
  const category = broadcastTemplateContent[playType];
  if (!category) {
    throw new Error(`Missing broadcast template category for ${playType}.`);
  }
  const entries = category[bucket];
  if (!entries || entries.length === 0) {
    throw new Error(`Missing broadcast template bucket for ${playType}:${bucket}.`);
  }
  return interpolateContentPlaceholders(
    pickWithRng(entries, rng, `broadcast:${playType}:${bucket}`),
    placeholders,
  );
}

export function getCallYourShotReactions(outcome: CallYourShotReactionOutcome): CallYourShotReactionContent[] {
  return callYourShotReactionsContent.reactions.filter((reaction) => reaction.outcome === outcome);
}

export function getContingencyCallouts(key: ContingencyCalloutKey): readonly string[] {
  return contingencyCalloutsContent.callouts[key] ?? [];
}

export function getApologyTourBeat(
  key: 'fan_letter' | 'beat_column' | 'owner_email' | 'resolution_resolved' | 'resolution_escalated',
): ApologyTourBeatContent {
  return apologyTourContent.beats[key];
}

export function getStoryArcPhaseContent(arcType: string, phase: string): StoryArcPhaseContent | null {
  const phases = storyArcTemplates[arcType as StoryArcContentTemplate];
  if (!phases) return null;
  return phases[phase as StoryArcContentPhase] ?? null;
}

export function getNamePool(kind: 'first' | 'last', tier: NameFrequencyTier): readonly string[] {
  return kind === 'first' ? playerNames.firstNames[tier] : playerNames.lastNames[tier];
}

export function getSocialPost(source: SocialContentSource, scenario: string, rng: () => number): string {
  const bucket = (
    source === 'player' ? socialFeedTemplates.player_posts
      : source === 'fan' ? socialFeedTemplates.fan_posts
        : source === 'analyst' ? socialFeedTemplates.analyst_posts
          : socialFeedTemplates.reporter_posts
  ) as Record<string, readonly string[]>;
  const templates = bucket[scenario];
  if (!templates) {
    throw new Error(`Missing social content for ${source}:${scenario}.`);
  }
  return pickWithRng(templates, rng, `social:${source}:${scenario}`);
}

export function getNewsArticle(
  eventType: string,
  rng: () => number,
  placeholders: Record<string, string>,
): { headline: string; blurb: string } {
  const templateCategory = leagueNewsTemplates[eventType as LeagueNewsEventType];
  if (!templateCategory) {
    throw new Error(`Missing league news templates for ${eventType}.`);
  }

  return {
    headline: interpolateContentPlaceholders(
      pickWithRng(templateCategory.headlines, rng, `news:${eventType}:headline`),
      placeholders,
    ),
    blurb: interpolateContentPlaceholders(
      pickWithRng(templateCategory.blurbs, rng, `news:${eventType}:blurb`),
      placeholders,
    ),
  };
}

export function getTeamPAOverrides(teamAbbr: string): TeamPAOverrides | null {
  return teamPAOverrides[teamAbbr.toUpperCase()] ?? null;
}

export function getHalftimePerformers(): readonly HalftimePerformerContent[] {
  return halftimeContent.performers;
}

export function getPACall(
  eventType: string,
  rng: () => number,
  placeholders: Record<string, string>,
): string {
  const teamAbbr = String(placeholders['teamAbbr'] ?? '').toUpperCase();
  const overrides = teamAbbr ? getTeamPAOverrides(teamAbbr) : null;

  if (eventType === 'first_down' && overrides?.firstDownCall) {
    return interpolateContentPlaceholders(overrides.firstDownCall, placeholders);
  }

  if (eventType === 'touchdown_home' && overrides?.touchdownCall) {
    return interpolateContentPlaceholders(overrides.touchdownCall, placeholders);
  }

  const templates = halftimeContent.pa_templates[eventType as PAEventType];
  if (!templates) {
    throw new Error(`Missing PA templates for ${eventType}.`);
  }

  return interpolateContentPlaceholders(
    pickWithRng(templates, rng, `pa:${eventType}`),
    placeholders,
  );
}
