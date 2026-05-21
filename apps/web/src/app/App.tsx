import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RouterProvider, createRouter, createRootRoute, createRoute, createHashHistory, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, Users, DollarSign, ArrowLeftRight,
  Search, FileText, Handshake, Gamepad2, GraduationCap,
  Trophy, Settings, Terminal, Inbox, Crown, ListOrdered,
  Play, ScrollText, Save, TrendingUp, Newspaper, BarChart3, Activity, CalendarRange,
  Radio, MessageSquare, Crosshair, Building2, Award, Users2, Sparkles, Scale,
  Map as MapIcon, Film, Tent, Target, Loader, Briefcase, Star,
} from 'lucide-react';
import { ChipDialogueBubble, MfdTooltipProvider, MfdCommandPalette, PixelModal, type CommandItem } from '@mfd/design-system/components';
import { getRegisteredShortcuts, registerShortcut, useGlobalKeyboard, useShortcut } from './hooks/useKeyboard';
import { useBootSequence } from './hooks/useBootSequence';
import { useUiStore } from './store/ui-store';
import {
  selectCeremonies,
  selectCurrentWeeklyPrepPlan,
  selectExpansionDraftState,
  selectHandshakes,
  selectNewlyUnlocked,
  selectPhase,
  selectRoster,
  selectSeasonReports,
  selectTradeOffers,
  selectTutorial,
  selectUserTeam,
  useGameStore,
} from './store/game-store';
import { selectCanUndo, selectUndoLabel } from './store/selectors';
import { generateDevelopmentReport, identifyBreakoutCandidates, PHASE_ORDER } from '@mfd/engine';
import { computeNavBadges } from './navBadges';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { ErrorBoundary } from './ErrorBoundary';
import { AutosaveToast } from './AutosaveToast';
import { NewGameScreen } from './NewGameScreen';
import { FranchiseSetupWizard } from '../features/franchise-setup/FranchiseSetupWizard';
import { readFirstTenMinutesCompleted } from '../features/franchise-setup/setupPersistence';
import { ChipHost, isChipFeatureEnabled, type ChipHostStage } from '../features/companion';
import { ChipDock } from '../features/companion/ChipDock';
import { PoseEventEmitter } from '../features/companion/PoseEventEmitter';
import { useChipEvents } from '../features/companion/useChipEvents';
import { useChipStore } from '../features/companion/store';
import { countPendingDecisions } from '../features/companion/decisionsPending';
import { resolveWhereAmIState } from '../features/companion/whereAmI';
import { useActiveRouteBeats } from '../features/route-coaching/useActiveRouteBeats';
import { BootScreen } from './BootScreen';
import { MondayBriefing } from '../features/monday-briefing/MondayBriefing';
import { RosterManagement } from '../features/roster/RosterManagement';
import { ContractsCap } from '../features/contracts/ContractsCap';
import { CoachingStaff } from '../features/coaching/CoachingStaff';
import { CoachingTree } from '../features/coaching/CoachingTree';
import { RelationshipGraph } from '../features/coaching/RelationshipGraph';
import { InboxTriage } from '../features/inbox/InboxTriage';
import { OwnerMood } from '../features/owner/OwnerMood';
import { DepthChart } from '../features/depth-chart/DepthChart';
import { WeekAdvance } from '../features/week-advance/WeekAdvance';
import { HandshakeLedger } from '../features/handshake-ledger/HandshakeLedger';
import { GameDayRecap } from '../features/game-day/GameDayRecap';
import { HalftimeDecision } from '../features/game-day/HalftimeDecision';
import { TradeCenter } from '../features/trades/TradeCenter';
import { FreeAgencyHub } from '../features/free-agency/FreeAgencyHub';
import { Settings as SettingsScreen } from '../features/settings/Settings';
import { CeremonyViewer } from '../features/legacy/CeremonyViewer';
import { AchievementUnlockToast } from '../features/legacy/AchievementGallery';
import { SeasonReportViewer } from '../features/legacy/SeasonReportViewer';
import { TutorialOverlay } from '../features/onboarding/TutorialOverlay';
import { AudioController, AudioToggle, playAudioCueQueue, playSound } from '../features/audio/AudioManager';
import { BreakingNewsTicker, selectTickerItems } from '../features/monday-briefing/BreakingNewsTicker';
import { MilestoneCard, type MilestoneType } from '../features/shared/MilestoneCard';
import { BreakingNews } from '../features/shared/BreakingNews';
import { DynastyEraPrompt } from '../features/dynasty-era/DynastyEraPrompt';
import { SeasonRecapPrompt } from '../features/season/SeasonRecapPrompt';
import { RouteTransition } from '../features/shared/transitions/RouteTransition';
import { getSaveReminderMessage, shouldPromptEraNaming, shouldShowSaveReminder } from '@mfd/engine';
import { ConfirmDialog } from '../features/shared/ConfirmDialog';
import { syncScrapbookAtYearRollover } from './scrapbook-rollover';
import { syncHallOfFameArchiveAtYearRollover } from './hall-of-fame-rollover';
import { syncRosterContinuityAtYearRollover } from './roster-continuity-rollover';
import { syncRookieOfYearAtYearRollover } from './rookie-of-year-rollover';
import { PlayoffLorePrompt } from '../features/playoffs/PlayoffLorePrompt';
import { EraTransitionEmitter } from '../features/dynasty-era/EraTransitionEmitter';
import { ChampionshipParadeEmitter } from '../features/playoffs/ChampionshipParadeEmitter';
import './app-shell.css';

const LazyScoutingBoard = lazy(async () => ({ default: (await import('../features/scouting/ScoutingBoard')).ScoutingBoard }));
const LazyDraftBoard = lazy(async () => ({ default: (await import('../features/draft/DraftBoard')).DraftBoard }));
const LazyTrainingCamp = lazy(async () => ({ default: (await import('../features/training-camp/TrainingCamp')).TrainingCamp }));
const LazyPlayerComparison = lazy(async () => ({ default: (await import('../features/shared/PlayerComparison')).PlayerComparison }));
const LazyDynastyCartridge = lazy(async () => ({ default: (await import('../features/dynasty-cartridge/DynastyCartridge')).DynastyCartridge }));
const LazyLegacyTimeline = lazy(async () => ({ default: (await import('../features/legacy/LegacyTimeline')).LegacyTimeline }));
const LazyNamedGamesBrowser = lazy(async () => ({ default: (await import('../features/legacy/NamedGamesBrowser')).NamedGamesBrowser }));
const LazyBloodlinesViewer = lazy(async () => ({ default: (await import('../features/legacy/BloodlinesViewer')).BloodlinesViewer }));
const LazyAwardsHub = lazy(async () => ({ default: (await import('../features/legacy/AwardsHub')).AwardsHub }));
const LazyPowerRankings = lazy(async () => ({ default: (await import('../features/power-rankings/PowerRankings')).PowerRankings }));
const LazyLeagueNews = lazy(async () => ({ default: (await import('../features/league-news/LeagueNews')).LeagueNews }));
const LazyNewsroomDigest = lazy(async () => ({ default: (await import('../features/newsroom/NewsroomDigest')).NewsroomDigest }));
const LazyLeagueStandings = lazy(async () => ({ default: (await import('../features/standings/LeagueStandings')).LeagueStandings }));
const LazyAnalyticsDashboard = lazy(async () => ({ default: (await import('../features/analytics/AnalyticsDashboard')).AnalyticsDashboard }));
const LazyTeamSchedule = lazy(async () => ({ default: (await import('../features/schedule/TeamSchedule')).TeamSchedule }));
const LazyWaiverWire = lazy(async () => ({ default: (await import('../features/waiver-wire/WaiverWire')).WaiverWire }));
const LazyPracticeSquad = lazy(async () => ({ default: (await import('../features/practice-squad/PracticeSquad')).PracticeSquad }));
const LazyGamePlanSetup = lazy(async () => ({ default: (await import('../features/game-plan/GamePlanSetup')).GamePlanSetup }));
const LazyDraftRecap = lazy(async () => ({ default: (await import('../features/draft/DraftRecap')).DraftRecap }));
const LazyPlayerProfile = lazy(async () => ({ default: (await import('../features/player/PlayerProfile')).PlayerProfile }));
const LazyPlayerTimeline = lazy(async () => ({ default: (await import('../features/stats/PlayerTimeline')).default }));
const LazyPlayerRivalries = lazy(async () => ({ default: (await import('../features/player/PlayerRivalries')).PlayerRivalries }));
const LazyRecordBook = lazy(async () => ({ default: (await import('../features/stats/RecordBook')).default }));
const LazyStatCentral = lazy(async () => ({ default: (await import('../features/stats/StatCentral')).default }));
const LazyTeamNeeds = lazy(async () => ({ default: (await import('../features/team-needs/TeamNeeds')).TeamNeeds }));
const LazyCapLaboratory = lazy(async () => ({ default: (await import('../features/contracts/CapLaboratory')).default }));
const LazyContractTools = lazy(async () => ({ default: (await import('../features/front-office/ContractTools')).default }));
const LazyFATargetBoard = lazy(async () => ({ default: (await import('../features/free-agency/FATargetBoard')).FATargetBoard }));
const LazyWatchListScreen = lazy(async () => ({ default: (await import('../features/watch-list/WatchListScreen')).WatchListScreen }));
const LazyFilmRoom = lazy(async () => ({ default: (await import('../features/film-room/FilmRoom')).FilmRoom }));
const LazyGameBroadcast = lazy(async () => ({ default: (await import('../features/broadcast/GameBroadcast')).GameBroadcast }));
const LazyBroadcastPresentation = lazy(async () => ({ default: (await import('../features/broadcast/BroadcastPresentation')).default }));
const LazyLeaguePulse = lazy(async () => ({ default: (await import('../features/league/LeaguePulse')).default }));
const LazyWeatherForecast = lazy(async () => ({ default: (await import('../features/league/WeatherForecast')).WeatherForecast }));
const LazySocialFeed = lazy(async () => ({ default: (await import('../features/social/SocialFeed')).SocialFeed }));
const LazyTradeBlockTicker = lazy(async () => ({ default: (await import('../features/trades/TradeBlockTicker')).TradeBlockTicker }));
const LazyTradeDeadline = lazy(async () => ({ default: (await import('../features/trades/TradeDeadline')).TradeDeadline }));
const LazyScenarioSelect = lazy(async () => ({ default: (await import('../features/scenario/ScenarioSelect')).ScenarioSelect }));
const LazyFranchiseHub = lazy(async () => ({ default: (await import('../features/franchise/FranchiseHub')).FranchiseHub }));
const LazyRelocationScreen = lazy(async () => ({ default: (await import('../features/franchise/RelocationScreen')).RelocationScreen }));
const LazyExpansionDraft = lazy(async () => ({ default: (await import('../features/franchise/ExpansionDraft')).ExpansionDraft }));
const LazyFranchiseLegends = lazy(async () => ({ default: (await import('../features/franchise/FranchiseLegends')).FranchiseLegends }));
const LazyFranchiseBook = lazy(async () => ({ default: (await import('../features/franchise/FranchiseBook')).FranchiseBookScreen }));
const LazyScrapbook = lazy(async () => ({ default: (await import('../features/franchise/Scrapbook')).Scrapbook }));
const LazyHallOfFameDirectory = lazy(async () => ({ default: (await import('../features/franchise/HallOfFameDirectory')).HallOfFameDirectory }));
const LazyTrophyRoom = lazy(async () => ({ default: (await import('../features/franchise/TrophyRoom')).TrophyRoom }));
const LazyEraHall = lazy(async () => ({ default: (await import('../features/franchise/EraHall')).EraHall }));
const LazyMvpPlaqueWall = lazy(async () => ({ default: (await import('../features/franchise/MvpPlaqueWall')).MvpPlaqueWall }));
const LazyAchievementsGallery = lazy(async () => ({ default: (await import('../features/franchise/AchievementsGallery')).AchievementsGallery }));
const LazyPlayoffLoreDirectory = lazy(async () => ({ default: (await import('../features/playoffs/PlayoffLoreDirectory')).PlayoffLoreDirectory }));
const LazyDynastyChronicle = lazy(async () => ({ default: (await import('../features/franchise/DynastyChronicle')).DynastyChronicle }));
const LazyLockerRoom = lazy(async () => ({ default: (await import('../features/locker-room/LockerRoom')).LockerRoom }));
const LazyEndorsementCenter = lazy(async () => ({ default: (await import('../features/endorsements/EndorsementCenter')).EndorsementCenter }));
const LazyCommissionerOffice = lazy(async () => ({ default: (await import('../features/league/CommissionerOffice')).CommissionerOffice }));
const LazyCBANegotiation = lazy(async () => ({ default: (await import('../features/league/CBANegotiation')).CBANegotiation }));
const LazyLeagueRulesViewer = lazy(async () => ({ default: (await import('../features/league/LeagueRulesViewer')).LeagueRulesViewer }));
const LazySuperBowlPresentation = lazy(async () => ({ default: (await import('../features/playoffs/SuperBowlPresentation')).SuperBowlPresentation }));
const LazyAlumniMentors = lazy(async () => ({ default: (await import('../features/mentors/AlumniMentorsScreen')).AlumniMentorsScreen }));
const LazyPlayerDevelopmentInner = lazy(async () => ({ default: (await import('../features/player/PlayerDevelopment')).PlayerDevelopmentView }));
const LazyPlayByPlay = lazy(async () => ({ default: (await import('../features/broadcast/PlayByPlay')).PlayByPlay }));
const LazyGameFlow = lazy(async () => ({ default: (await import('../features/broadcast/GameFlow')).GameFlow }));
const LazySeasonRecapScreen = lazy(async () => ({ default: (await import('../features/season/SeasonRecapCard')).SeasonRecapScreen }));
const LazyGmCareer = lazy(async () => ({ default: (await import('../features/franchise/GmCareer')).GmCareer }));
const LazyAboutScreen = lazy(async () => ({ default: (await import('../features/launch/AboutScreen')).AboutScreen }));
const LazyCreditsScreen = lazy(async () => ({ default: (await import('../features/launch/CreditsScreen')).CreditsScreen }));
const LazyFaqScreen = lazy(async () => ({ default: (await import('../features/launch/FaqScreen')).FaqScreen }));

// ── Nav items ────────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  shortcut?: string;
}

/** Flat list of all nav items — used by command palette and keyboard shortcuts */
const NAV_ITEMS: NavItem[] = [
  { path: '/',             label: 'Monday Briefing', shortLabel: 'Briefing', icon: <LayoutDashboard size={16} />, shortcut: '1' },
  { path: '/roster',       label: 'Roster',          shortLabel: 'Roster',   icon: <Users size={16} />,          shortcut: '2' },
  { path: '/watch-list',   label: 'Watch List',      shortLabel: 'Watch',    icon: <Star size={16} /> },
  { path: '/locker-room',  label: 'Locker Room',     shortLabel: 'Locker',   icon: <Users2 size={16} /> },
  { path: '/contracts',    label: 'Contracts',        shortLabel: 'Cap',      icon: <DollarSign size={16} />,     shortcut: '3' },
  { path: '/cap-lab',      label: 'Cap Lab',          shortLabel: 'Cap Lab',  icon: <DollarSign size={16} /> },
  { path: '/front-office', label: 'Front Office',     shortLabel: 'Front Office', icon: <Briefcase size={16} /> },
  { path: '/endorsements', label: 'Endorsements',     shortLabel: 'Deals',    icon: <Sparkles size={16} /> },
  { path: '/trades',       label: 'Trades',           shortLabel: 'Trades',   icon: <ArrowLeftRight size={16} />, shortcut: '4' },
  { path: '/trade-block',  label: 'Trade Block',      shortLabel: 'Block',    icon: <ArrowLeftRight size={16} /> },
  { path: '/team-needs',   label: 'Team Needs',       shortLabel: 'Needs',    icon: <BarChart3 size={16} /> },
  { path: '/scouting',     label: 'Scouting',         shortLabel: 'Scout',    icon: <Search size={16} />,         shortcut: '5' },
  { path: '/draft',        label: 'Draft',            shortLabel: 'Draft',    icon: <FileText size={16} />,       shortcut: '6' },
  { path: '/free-agency',  label: 'Free Agency',      shortLabel: 'FA',       icon: <Handshake size={16} />,      shortcut: '7' },
  { path: '/fa-targets',  label: 'FA Targets',       shortLabel: 'Targets',  icon: <Target size={16} /> },
  { path: '/game-day',     label: 'Game Day',         shortLabel: 'Game',     icon: <Gamepad2 size={16} />,       shortcut: '8' },
  { path: '/game-plan',   label: 'Game Plan',        shortLabel: 'Plan',     icon: <MapIcon size={16} /> },
  { path: '/broadcast',    label: 'Broadcast',        shortLabel: 'Live',     icon: <Radio size={16} /> },
  { path: '/presentation', label: 'Presentation',     shortLabel: 'Cinema',   icon: <Radio size={16} /> },
  { path: '/play-by-play', label: 'Play-by-Play',     shortLabel: 'PbP',      icon: <ScrollText size={16} /> },
  { path: '/game-flow',    label: 'Game Flow',        shortLabel: 'Flow',     icon: <Activity size={16} /> },
  { path: '/film-room',   label: 'Film Room',        shortLabel: 'Film',     icon: <Film size={16} /> },
  { path: '/super-bowl',  label: 'Super Bowl',       shortLabel: 'SB',       icon: <Trophy size={16} /> },
  { path: '/inbox',          label: 'Inbox',            shortLabel: 'Inbox',    icon: <Inbox size={16} />,          shortcut: '9' },
  { path: '/social',       label: 'MFSN',             shortLabel: 'Social',   icon: <MessageSquare size={16} /> },
  { path: '/waivers',       label: 'Waiver Wire',      shortLabel: 'Waivers',  icon: <ScrollText size={16} /> },
  { path: '/practice-squad',label: 'Practice Squad',   shortLabel: 'PS',       icon: <Users size={16} /> },
  { path: '/schedule',      label: 'Schedule',         shortLabel: 'Schedule', icon: <CalendarRange size={16} /> },
  { path: '/depth-chart',   label: 'Depth Chart',      shortLabel: 'Depth',    icon: <ListOrdered size={16} /> },
  { path: '/coaching',      label: 'Coaching',         shortLabel: 'Coach',    icon: <GraduationCap size={16} /> },
  { path: '/training-camp', label: 'Training Camp',    shortLabel: 'Camp',     icon: <Tent size={16} /> },
  { path: '/mentors',       label: 'Alumni Mentors',   shortLabel: 'Mentors',  icon: <Award size={16} /> },
  { path: '/owner',         label: 'Owner',            shortLabel: 'Owner',    icon: <Crown size={16} /> },
  { path: '/commissioner',  label: 'Commissioner',     shortLabel: 'Commish',  icon: <Scale size={16} /> },
  { path: '/franchise',     label: 'Franchise',        shortLabel: 'Franchise', icon: <Building2 size={16} /> },
  { path: '/legends',       label: 'Legends',          shortLabel: 'Legends',  icon: <Award size={16} /> },
  { path: '/week-advance',  label: 'Advance Week',     shortLabel: 'Advance',  icon: <Play size={16} /> },
  { path: '/handshakes',    label: 'Handshakes',       shortLabel: 'Promises', icon: <ScrollText size={16} /> },
  { path: '/news',          label: 'News',             shortLabel: 'News',     icon: <Newspaper size={16} /> },
  { path: '/newsroom',     label: 'Newsroom',         shortLabel: 'Digest',   icon: <Newspaper size={16} /> },
  { path: '/records',       label: 'Record Book',      shortLabel: 'Records',  icon: <ScrollText size={16} /> },
  { path: '/stat-central',  label: 'Stat Central',     shortLabel: 'Stats',    icon: <BarChart3 size={16} /> },
  { path: '/standings',     label: 'Standings',        shortLabel: 'Stand',    icon: <BarChart3 size={16} /> },
  { path: '/analytics',     label: 'Analytics',        shortLabel: 'Data',     icon: <Activity size={16} /> },
  { path: '/power-rankings',label: 'Power Rankings',   shortLabel: 'Rankings', icon: <TrendingUp size={16} /> },
  { path: '/league-pulse',  label: 'League Pulse',     shortLabel: 'Pulse',    icon: <Activity size={16} /> },
  { path: '/scenarios',    label: 'Scenarios',        shortLabel: 'Challenge', icon: <Crosshair size={16} /> },
  { path: '/legacy',        label: 'Legacy',           shortLabel: 'Legacy',   icon: <Trophy size={16} /> },
  { path: '/awards',        label: 'Awards Hub',       shortLabel: 'Awards',   icon: <Trophy size={16} /> },
  { path: '/about',         label: 'About',            shortLabel: 'About',    icon: <FileText size={16} /> },
  { path: '/credits',       label: 'Credits',          shortLabel: 'Credits',  icon: <Award size={16} /> },
  { path: '/faq',           label: 'FAQ',              shortLabel: 'FAQ',      icon: <ScrollText size={16} /> },
  { path: '/dynasty',       label: 'Save/Load',        shortLabel: 'Save',     icon: <Save size={16} /> },
  { path: '/settings',      label: 'Settings',         shortLabel: 'Config',   icon: <Settings size={16} /> },
];

/** Grouped navigation categories for the sidebar/top nav */
interface NavGroup {
  id: string;
  label: string;
  paths: string[];
}

const NAV_GROUPS: NavGroup[] = [
  { id: 'core',     label: 'CORE',     paths: ['/', '/week-advance', '/watch-list', '/inbox'] },
  { id: 'team',     label: 'TEAM',     paths: ['/roster', '/depth-chart', '/locker-room', '/coaching', '/handshakes', '/training-camp', '/mentors'] },
  { id: 'money',    label: 'MONEY',    paths: ['/contracts', '/cap-lab', '/front-office', '/endorsements'] },
  { id: 'acquire',  label: 'ACQUIRE',  paths: ['/trades', '/trade-block', '/scouting', '/draft', '/free-agency', '/fa-targets', '/waivers', '/practice-squad', '/team-needs'] },
  { id: 'gameday',  label: 'GAMEDAY',  paths: ['/game-day', '/game-plan', '/broadcast', '/presentation', '/play-by-play', '/game-flow', '/film-room', '/schedule', '/super-bowl'] },
  { id: 'league',   label: 'LEAGUE',   paths: ['/standings', '/power-rankings', '/league-pulse', '/newsroom', '/news', '/social', '/commissioner', '/analytics', '/records', '/stat-central'] },
  { id: 'dynasty',  label: 'DYNASTY',  paths: ['/franchise', '/owner', '/legends', '/legacy', '/awards', '/scenarios'] },
  { id: 'meta',     label: 'SYSTEM',   paths: ['/about', '/credits', '/faq', '/dynasty', '/settings'] },
];

// ── Root Layout ─────────────────────────────────────────────

function RootLayout() {
  useGlobalKeyboard();
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const tutorial = useGameStore(selectTutorial);
  const ceremonies = useGameStore(selectCeremonies);
  const newlyUnlocked = useGameStore(selectNewlyUnlocked);
  const seasonReports = useGameStore(selectSeasonReports);
  const expansionDraftState = useGameStore(selectExpansionDraftState);
  const game = useGameStore((s) => s.game);
  const userTeam = useGameStore(selectUserTeam);
  const currentWeek = useGameStore((s) => s.game?.week ?? 0);
  const currentYear = useGameStore((s) => s.game?.year ?? 0);
  const recapPromptSeenThisSession = useGameStore((s) => s.recapPromptSeenThisSession);
  const pendingPlayoffLoreReveal = useGameStore((s) => s.pendingPlayoffLoreReveal);
  const userTeamWins = useGameStore((s) => {
    if (!s.game) return 0;
    const team = Object.values(s.game.teams).find((t) => t.isUser);
    return team?.wins ?? 0;
  });
  const canUndo = useGameStore(selectCanUndo);
  const undoLabel = useGameStore(selectUndoLabel);
  const undo = useGameStore((s) => s.actions.undo);
  const advanceTutorial = useGameStore((s) => s.actions.advanceTutorial);
  const dismissTutorial = useGameStore((s) => s.actions.dismissTutorial);
  const clearAudioQueue = useGameStore((s) => s.actions.clearAudioQueue);
  const dismissBreakingNews = useGameStore((s) => s.actions.dismissBreakingNews);
  const audioCueQueue = useGameStore((s) => s.game?.postGameUi?.audioCueQueue ?? []);
  const breakingNews = useGameStore((s) => s.game?.breakingNewsQueue?.[0] ?? null);
  const leagueNews = useGameStore((s) => s.game?.leagueNews ?? []);
  const router = useRouter();
  const activePath = useRouterState({ select: (state) => state.location.pathname });
  const [seenCeremonies, setSeenCeremonies] = useState<string[]>([]);
  const [activeCeremonyId, setActiveCeremonyId] = useState<string | null>(null);
  const [seenAchievements, setSeenAchievements] = useState<string[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<(typeof newlyUnlocked)[number] | null>(null);
  const [seenReports, setSeenReports] = useState<number[]>([]);
  const [activeReportYear, setActiveReportYear] = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<{ type: MilestoneType; headline: string; detail: string } | null>(null);
  const [lastMilestoneCheck, setLastMilestoneCheck] = useState('');
  const [showEraPrompt, setShowEraPrompt] = useState(false);
  const [showRecapPrompt, setShowRecapPrompt] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [lastEraCheck, setLastEraCheck] = useState('');
  const prevWins = useRef(0);
  const prevYear = useRef<number | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const prevWeek = useRef(0);

  useShortcut('k', () => setCommandPaletteOpen(true), 'Open command palette', { meta: true });
  useShortcut('?', () => setShowHotkeyHelp(true), 'Open hotkey help', { shift: true });

  const currentTutorialStep = tutorial.steps[tutorial.currentStepIndex] ?? null;
  const chipFeatureEnabled = isChipFeatureEnabled();
  const activeCeremony = useMemo(
    () => ceremonies.find((ceremony) => ceremony.id === activeCeremonyId) ?? null,
    [activeCeremonyId, ceremonies],
  );
  const manualShortcutRows = NAV_ITEMS
    .filter((item) => item.shortcut)
    .map((item) => ({
      combo: item.shortcut ?? '',
      description: `Go to ${item.label}`,
    }));
  const registeredShortcutRows = getRegisteredShortcuts().map((shortcut) => ({
    combo: `${shortcut.meta ? 'Cmd/Ctrl+' : ''}${shortcut.ctrl ? 'Ctrl+' : ''}${shortcut.shift ? 'Shift+' : ''}${shortcut.key.toUpperCase()}`,
    description: shortcut.description,
  }));
  const seenShortcuts = new Set<string>();
  const shortcutRows = [...manualShortcutRows, ...registeredShortcutRows].filter((row) => {
    const key = `${row.combo}:${row.description}`;
    if (seenShortcuts.has(key)) return false;
    seenShortcuts.add(key);
    return true;
  });
  const tickerItems = useMemo(() => selectTickerItems(leagueNews), [leagueNews]);
  const showTicker = tickerItems.length > 0
    && !breakingNews
    && ['/', '/broadcast', '/play-by-play', '/game-day', '/game-flow'].includes(activePath);

  useEffect(() => {
    const unregister = NAV_ITEMS
      .filter((item): item is NavItem & { shortcut: string } => typeof item.shortcut === 'string')
      .map((item) => registerShortcut({
        key: item.shortcut,
        description: `Go to ${item.label}`,
        handler: () => { void router.navigate({ to: item.path }); },
      }));

    return () => {
      for (const dispose of unregister) {
        dispose();
      }
    };
  }, [router]);

  useEffect(() => {
    if (!tutorial.active || tutorial.dismissed || !currentTutorialStep?.action?.startsWith('screen:')) {
      return;
    }
    const target = currentTutorialStep.targetScreen.replace(/\/+$/, '') || '/';
    const current = activePath.replace(/\/+$/, '') || '/';
    if (target !== current) {
      return;
    }
    void advanceTutorial(currentTutorialStep.action);
  }, [activePath, advanceTutorial, currentTutorialStep, tutorial.active, tutorial.dismissed]);

  useEffect(() => {
    if (!expansionDraftState || activePath === '/expansion-draft') {
      return;
    }
    void router.navigate({ to: '/expansion-draft' });
  }, [activePath, expansionDraftState, router]);

  useEffect(() => {
    const latest = ceremonies[0];
    if (!latest || activeCeremonyId || seenCeremonies.includes(latest.id)) {
      return;
    }

    setSeenCeremonies((current) => [...current, latest.id]);
    setActiveCeremonyId(latest.id);
    playSound('notification');
  }, [activeCeremonyId, ceremonies, seenCeremonies]);

  useEffect(() => {
    if (audioCueQueue.length === 0) return;
    playAudioCueQueue(audioCueQueue);
    void clearAudioQueue();
  }, [audioCueQueue, clearAudioQueue]);

  useEffect(() => {
    if (activeAchievement) return;
    const nextAchievement = newlyUnlocked.find((achievement) => {
      const key = `${achievement.id}:${achievement.unlockedYear}:${achievement.unlockedWeek}`;
      return !seenAchievements.includes(key);
    });
    if (!nextAchievement) return;

    const key = `${nextAchievement.id}:${nextAchievement.unlockedYear}:${nextAchievement.unlockedWeek}`;
    setSeenAchievements((current) => [...current, key]);
    setActiveAchievement(nextAchievement);
    playSound('achievement_unlocked');

    const timeout = window.setTimeout(() => {
      setActiveAchievement(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [activeAchievement, newlyUnlocked, seenAchievements]);

  useEffect(() => {
    if (activeCeremonyId || activeReportYear !== null) return;
    const latestReport = seasonReports[0];
    if (!latestReport || seenReports.includes(latestReport.year)) {
      return;
    }

    setSeenReports((current) => [...current, latestReport.year]);
    setActiveReportYear(latestReport.year);
  }, [activeCeremonyId, activeReportYear, seasonReports, seenReports]);

  // Autosave toast — triggers when week changes (indicating advanceWeek completed + autosaved)
  useEffect(() => {
    if (prevWeek.current !== 0 && currentWeek !== prevWeek.current) {
      setShowSaveToast(true);
      playSound('week_advance_complete');
      const t = window.setTimeout(() => setShowSaveToast(false), 3000);
      return () => window.clearTimeout(t);
    }
    prevWeek.current = currentWeek;
  }, [currentWeek]);

  // Milestone detection — check for first win, 100 wins, etc.
  useEffect(() => {
    const key = `${currentYear}-${currentWeek}-${userTeamWins}`;
    if (key === lastMilestoneCheck || currentWeek === 0) return;
    setLastMilestoneCheck(key);

    if (userTeamWins === 1 && prevWins.current === 0) {
      setActiveMilestone({ type: 'first_win', headline: 'First Victory', detail: 'Your franchise just earned its first win. The dynasty starts here.' });
      playSound('record_broken');
    } else if (userTeamWins === 100 && prevWins.current < 100) {
      setActiveMilestone({ type: 'win_100', headline: '100 Wins', detail: 'A century of victories. Your franchise has reached elite status.' });
      playSound('super_bowl_win');
    } else if (currentYear >= 10 && currentWeek === 1 && currentYear % 10 === 0) {
      setActiveMilestone({ type: 'season_10', headline: `Season ${currentYear}`, detail: `${currentYear} seasons deep. This is no rebuild — this is a legacy.` });
      playSound('achievement_unlocked');
    }
    prevWins.current = userTeamWins;
  }, [currentYear, currentWeek, userTeamWins, lastMilestoneCheck]);

  // Dynasty era naming prompt — check after week advances
  useEffect(() => {
    const key = `${currentYear}-${currentWeek}`;
    if (key === lastEraCheck || !game) return;
    setLastEraCheck(key);

    if (shouldPromptEraNaming(game)) {
      setShowEraPrompt(true);
    }

    if (syncScrapbookAtYearRollover(prevYear.current, game, userTeam?.id ?? null, recapPromptSeenThisSession)) {
      setShowRecapPrompt(true);
    }

    syncHallOfFameArchiveAtYearRollover(prevYear.current, game, userTeam?.id ?? null);
    syncRosterContinuityAtYearRollover(prevYear.current, game, userTeam?.id ?? null);
    syncRookieOfYearAtYearRollover(prevYear.current, game, userTeam?.id ?? null);

    if (shouldShowSaveReminder(currentYear, game.lastPortableExportYear ?? null)) {
      setShowSaveReminder(true);
    }

    prevYear.current = currentYear;
  }, [currentYear, currentWeek, game, lastEraCheck, recapPromptSeenThisSession, userTeam]);

  const commandItems: CommandItem[] = [
    ...NAV_ITEMS.map((nav): CommandItem => ({
      id: `screen-${nav.path}`,
      label: nav.label,
      category: 'screen',
      icon: nav.icon,
      keywords: [nav.shortLabel],
      onSelect: () => router.navigate({ to: nav.path }),
    })),
    {
      id: 'action-advance-week',
      label: 'Advance Week',
      category: 'action',
      icon: <Terminal size={16} />,
      keywords: ['next', 'sim', 'advance'],
      onSelect: () => { void router.navigate({ to: '/week-advance' }); },
    },
  ];

  return (
    <MfdTooltipProvider>
      <div
        className="mfd-app-shell"
        data-mfd-app-shell="true"
        data-mfd-chip-enabled={chipFeatureEnabled ? 'true' : 'false'}
        style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mfd-bg)',
        color: 'var(--mfd-text)',
        fontFamily: 'var(--mfd-font-sans)',
      }}
      >
        <AudioController />
        <EraTransitionEmitter />
        <ChampionshipParadeEmitter />
        <style>{`
          @keyframes mfdTutorialPulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.55); }
            70% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
          }
        `}</style>
        <TopNav
          highlightedPath={!chipFeatureEnabled && tutorial.active && !tutorial.dismissed ? currentTutorialStep?.targetScreen ?? null : null}
          activePath={activePath}
          onOpenHotkeyHelp={() => setShowHotkeyHelp(true)}
        />
        {showTicker ? <BreakingNewsTicker items={tickerItems} /> : null}
        <main
          className="mfd-app-main"
          data-mfd-main-content="true"
          style={{
            flex: 1,
            padding: 'var(--mfd-sp-lg) var(--mfd-sp-xl)',
            overflow: 'auto',
          }}
        >
          <RouteTransition pathname={activePath}>
            <Outlet />
          </RouteTransition>
        </main>
        <MobileBottomTabBarMount activePath={activePath} />

        <MfdCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          items={commandItems}
        />
        {!chipFeatureEnabled && tutorial.active && !tutorial.dismissed && currentTutorialStep ? (
          <TutorialOverlay
            step={currentTutorialStep}
            stepIndex={Math.min(tutorial.currentStepIndex + 1, tutorial.steps.length)}
            totalSteps={tutorial.steps.length}
            onNext={() => { void advanceTutorial(); }}
            onSkip={() => { void dismissTutorial(); }}
          />
        ) : null}
        <AchievementUnlockToast achievement={activeAchievement} />
        <CeremonyViewer
          ceremony={activeCeremony}
          open={!!activeCeremony}
          onOpenChange={(open) => {
            if (!open) setActiveCeremonyId(null);
          }}
        />
        <SeasonReportViewer
          report={seasonReports.find((report) => report.year === activeReportYear) ?? null}
          open={activeReportYear !== null}
          onOpenChange={(open) => {
            if (!open) setActiveReportYear(null);
          }}
        />
        <AutosaveToast visible={showSaveToast} />
        {activeMilestone && (
          <MilestoneCard
            type={activeMilestone.type}
            headline={activeMilestone.headline}
            detail={activeMilestone.detail}
            onDismiss={() => setActiveMilestone(null)}
          />
        )}
        {breakingNews && (
          <BreakingNews
            headline={breakingNews.headline}
            detail={breakingNews.detail}
            onDismiss={() => { void dismissBreakingNews(); }}
          />
        )}
        <HalftimeDecision />
        <PixelModal
          open={showHotkeyHelp}
          onOpenChange={setShowHotkeyHelp}
          title="Hotkey Help"
          description="Keyboard navigation for your first ten minutes and beyond."
          accent="cyan"
          width={560}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shortcutRows.map((row) => (
              <div
                key={`${row.combo}-${row.description}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '8px 10px',
                  border: '2px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-2)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '11px',
                  color: 'var(--mfd-text)',
                  lineHeight: 1.5,
                }}
                >
                  {row.description}
                </span>
                <kbd style={{
                  padding: '4px 6px',
                  border: '2px solid var(--mfd-cyan)',
                  background: 'rgba(0, 229, 255, 0.08)',
                  color: 'var(--mfd-cyan)',
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                }}
                >
                  {row.combo}
                </kbd>
              </div>
            ))}
          </div>
        </PixelModal>
        <PlayoffLorePrompt open={pendingPlayoffLoreReveal !== null} onClose={() => undefined} />
        <SeasonRecapPrompt open={showRecapPrompt && pendingPlayoffLoreReveal === null} onClose={() => setShowRecapPrompt(false)} />
        <DynastyEraPrompt open={showEraPrompt} onClose={() => setShowEraPrompt(false)} />
        <ConfirmDialog
          open={showSaveReminder}
          title="Save Reminder"
          message={getSaveReminderMessage(currentYear)}
          confirmLabel="Open Backup Screen"
          cancelLabel="Dismiss"
          accent="gold"
          onConfirm={() => { setShowSaveReminder(false); void router.navigate({ to: '/dynasty' }); }}
          onCancel={() => setShowSaveReminder(false)}
        />
      </div>
    </MfdTooltipProvider>
  );
}

// ── Top Nav ─────────────────────────────────────────────────

function NavItemStrip({
  items,
  activePath,
  highlightedPath,
  badges,
}: {
  items: NavItem[];
  activePath: string;
  highlightedPath: string | null;
  badges: Record<string, number>;
}) {
  const router = useRouter();

  return (
    <div className="mfd-app-nav-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {items.map((item) => {
        const active = item.path === activePath;
        const highlighted = item.path === highlightedPath;
        return (
          <div
            key={item.path}
            className="mfd-app-nav-item-frame"
            style={{
              animation: highlighted ? 'mfdTutorialPulse 1.2s infinite' : undefined,
              borderRadius: 'var(--mfd-rad-md)',
            }}
          >
            <button
              type="button"
              className="mfd-app-nav-button"
              data-nav={item.path}
              data-mfd-nav-item="true"
              data-active={active ? 'true' : 'false'}
              data-highlighted={highlighted ? 'true' : 'false'}
              onClick={() => { void router.navigate({ to: item.path }); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                minHeight: '44px',
                padding: '9px 12px',
                border: `1px solid ${active ? 'var(--mfd-gold)' : highlighted ? 'var(--mfd-gold-strong)' : 'var(--mfd-border)'}`,
                borderRadius: 'var(--mfd-rad-md)',
                background: active ? 'rgba(255, 215, 0, 0.13)' : 'var(--mfd-bg-2)',
                color: active ? 'var(--mfd-gold)' : highlighted ? '#ffe27a' : 'var(--mfd-text-dim)',
                fontFamily: 'var(--mfd-font-pixel)',
                fontSize: '8px',
                lineHeight: 1.2,
                letterSpacing: 0,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {item.icon}
              <span className="mfd-app-nav-button-label">{item.shortLabel.toUpperCase()}</span>
              {(badges[item.path] ?? 0) > 0 && (
                <span className="mfd-app-nav-badge" style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--mfd-red)',
                  flexShrink: 0,
                }} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useNavBadges(): Record<string, number> {
  const tradeOffers = useGameStore(selectTradeOffers);
  const roster = useGameStore(selectRoster);
  const phase = useGameStore(selectPhase);
  const hasGamePlan = !!useGameStore(selectCurrentWeeklyPrepPlan);
  const handshakes = useGameStore(selectHandshakes);

  return useMemo(() => computeNavBadges({
    tradeOfferCount: tradeOffers.length,
    starterCount: roster.filter((p) => p.isStarter).length,
    hasGamePlan,
    phase,
    activeHandshakeCount: handshakes.filter((h) => h.status === 'active').length,
  }), [tradeOffers, roster, hasGamePlan, phase, handshakes]);
}

/**
 * Sprint 44 — Mounts the sticky bottom tab bar on phone widths.
 * Builds `drawerGroups` from NAV_GROUPS + NAV_ITEMS so the "More" sheet
 * mirrors the desktop grouping. Visibility is gated by CSS (tokens/index.css).
 */
function MobileBottomTabBarMount({ activePath }: { activePath: string }) {
  const badges = useNavBadges();
  const navItemMap = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const item of NAV_ITEMS) map.set(item.path, item);
    return map;
  }, []);
  const drawerGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      items: group.paths
        .map((p) => navItemMap.get(p))
        .filter((i): i is NavItem => !!i)
        .map((i) => ({ path: i.path, shortLabel: i.shortLabel, icon: i.icon })),
    }));
  }, [navItemMap]);

  return <MobileBottomTabBar activePath={activePath} drawerGroups={drawerGroups} badges={badges} />;
}

function UndoButton() {
  const canUndo = useGameStore(selectCanUndo);
  const undoLabel = useGameStore(selectUndoLabel);
  const undo = useGameStore((s) => s.actions.undo);

  if (!canUndo) return null;

  return (
    <button
      type="button"
      onClick={() => { void undo(); playSound('ui_navigate'); }}
      title={undoLabel ? `Undo: ${undoLabel}` : 'Undo last action'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        minHeight: '44px',
        padding: '6px 10px',
        background: 'rgba(255, 215, 0, 0.1)',
        border: '2px solid var(--mfd-gold)',
        color: 'var(--mfd-gold)',
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '7px',
        letterSpacing: '0.8px',
        cursor: 'pointer',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      UNDO
    </button>
  );
}

function TopNav({
  highlightedPath,
  activePath,
  onOpenHotkeyHelp,
}: {
  highlightedPath: string | null;
  activePath: string;
  onOpenHotkeyHelp: () => void;
}) {
  const badges = useNavBadges();
  const team = useGameStore(selectUserTeam);
  const week = useGameStore((s) => s.game?.week ?? 0);
  const year = useGameStore((s) => s.game?.year ?? 0);

  const activeGroupId = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.paths.includes(activePath)) return g.id;
    }
    return 'core';
  }, [activePath]);

  const [selectedGroupId, setSelectedGroupId] = useState(activeGroupId);

  useEffect(() => {
    setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);

  const navItemMap = useMemo(() => {
    const map = new Map<string, NavItem>();
    for (const item of NAV_ITEMS) map.set(item.path, item);
    return map;
  }, []);
  const selectedGroup = NAV_GROUPS.find((group) => group.id === selectedGroupId) ?? NAV_GROUPS[0]!;
  const selectedItems = selectedGroup.paths
    .map((path) => navItemMap.get(path))
    .filter((item): item is NavItem => !!item);
  const activeItem = navItemMap.get(activePath);
  const teamName = team ? `${team.city} ${team.name}` : 'No active dynasty';
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '--';

  return (
    <header
      className="mfd-app-top-nav"
      data-mfd-top-nav="true"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '10px 12px',
        borderBottom: '3px solid var(--mfd-gold)',
        background: 'linear-gradient(180deg, #080808 0%, #000 100%)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      <div
        className="mfd-app-brand-lockup"
        data-mfd-brand-lockup="true"
        style={{
        display: 'grid',
        gap: '6px',
        paddingRight: '8px',
        flexShrink: 0,
      }}
      >
        <span style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '8px',
          color: 'var(--mfd-green)',
          letterSpacing: 0,
        }}>
          MFD NETWORK
        </span>
        <span style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '34px',
          lineHeight: 1,
          color: 'var(--mfd-gold)',
          letterSpacing: 0,
        }}>
          MFD
        </span>
        <span className="mfd-app-brand-subtitle">{teamName}</span>
      </div>

      <div className="mfd-app-nav-groups" style={{
        flex: 1,
        minWidth: '280px',
        display: 'grid',
        gap: '10px',
      }}>
        <div className="mfd-app-context-strip">
          <span>{activeItem?.label ?? 'Command Center'}</span>
          <span>{record}</span>
          <span>Week {week}</span>
          <span>Season {year || '--'}</span>
        </div>
        <nav className="mfd-app-nav-group-rail" aria-label="Franchise command groups">
          {NAV_GROUPS.map((group) => {
            const active = group.id === activeGroupId;
            const selected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                className="mfd-app-nav-group-toggle"
                data-mfd-nav-group={group.id}
                data-mfd-nav-item="true"
                data-active={active ? 'true' : 'false'}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => setSelectedGroupId(group.id)}
              >
                {group.label}
              </button>
            );
          })}
        </nav>
        <div className="mfd-app-nav-active-strip">
          <span className="mfd-app-nav-active-label">{selectedGroup.label}</span>
          <NavItemStrip
            items={selectedItems}
            activePath={activePath}
            highlightedPath={highlightedPath}
            badges={badges}
          />
        </div>
      </div>

      <div className="mfd-app-nav-actions" data-mfd-nav-actions="true" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        <UndoButton />
        <AudioToggle />
        <button
          type="button"
          onClick={onOpenHotkeyHelp}
          title="Hotkey help"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            padding: '0 10px',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '3px solid var(--mfd-cyan)',
            color: 'var(--mfd-cyan)',
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ?
        </button>
        <CommandPaletteTrigger />
      </div>
    </header>
  );
}

function CommandPaletteTrigger() {
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minHeight: '44px',
        padding: '8px 11px',
        fontSize: '8px',
        fontFamily: 'var(--mfd-font-pixel)',
        color: 'var(--mfd-cyan)',
        background: 'rgba(0, 229, 255, 0.08)',
        border: '3px solid var(--mfd-cyan)',
        cursor: 'pointer',
        textTransform: 'uppercase',
      }}
    >
      <Search size={12} />
      <span>Cmd Deck</span>
      <kbd style={{
        padding: '2px 4px',
        fontSize: '0.5625rem',
        fontFamily: 'var(--mfd-font-mono)',
        background: '#04141a',
        color: '#9be7ff',
        border: '2px solid rgba(0, 229, 255, 0.35)',
      }}>
        {isMac ? '\u2318' : 'Ctrl+'}K
      </kbd>
    </button>
  );
}

function LazyRouteFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Suspense fallback={(
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        gap: '16px',
      }} data-mfd-route-loading="true">
        <Loader size={24} style={{ color: 'var(--mfd-gold)', animation: 'spin 1.2s linear infinite' }} />
        <div style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '8px',
          letterSpacing: '1px',
          color: 'var(--mfd-gold)',
          textTransform: 'uppercase',
        }}>
          Loading {label}
        </div>
        <div style={{
          width: 120,
          height: 4,
          background: 'var(--mfd-bg-2)',
          border: '1px solid var(--mfd-border)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '40%',
            height: '100%',
            background: 'var(--mfd-gold)',
            animation: 'mfdLoadSlide 1s ease-in-out infinite',
          }} />
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes mfdLoadSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-mfd-route-loading="true"] *,
            [data-mfd-route-loading="true"] {
              animation: none !important;
              transform: none !important;
            }
          }
        `}</style>
      </div>
    )}
    >
      {children}
    </Suspense>
  );
}

// ── Router setup ────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MondayBriefing,
});

const rosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roster',
  component: RosterManagement,
});

const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contracts',
  component: ContractsCap,
});

const capLabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cap-lab',
  component: () => (
    <LazyRouteFrame label="cap laboratory">
      <LazyCapLaboratory />
    </LazyRouteFrame>
  ),
});

const frontOfficeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/front-office',
  component: () => (
    <LazyRouteFrame label="contract tools">
      <LazyContractTools />
    </LazyRouteFrame>
  ),
});

const lockerRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/locker-room',
  component: () => (
    <LazyRouteFrame label="locker room">
      <LazyLockerRoom />
    </LazyRouteFrame>
  ),
});

const endorsementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/endorsements',
  component: () => (
    <LazyRouteFrame label="endorsement center">
      <LazyEndorsementCenter />
    </LazyRouteFrame>
  ),
});

const tradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trades',
  component: TradeCenter,
});

const tradeBlockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trade-block',
  component: () => (
    <LazyRouteFrame label="trade block">
      <LazyTradeBlockTicker />
    </LazyRouteFrame>
  ),
});

const watchListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch-list',
  component: () => (
    <LazyRouteFrame label="watch list">
      <LazyWatchListScreen />
    </LazyRouteFrame>
  ),
});

const scoutingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scouting',
  component: () => (
    <LazyRouteFrame label="scouting board">
      <LazyScoutingBoard />
    </LazyRouteFrame>
  ),
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/draft',
  component: () => (
    <LazyRouteFrame label="draft board">
      <LazyDraftBoard />
    </LazyRouteFrame>
  ),
});

const trainingCampRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/training-camp',
  component: () => (
    <LazyRouteFrame label="training camp">
      <LazyTrainingCamp />
    </LazyRouteFrame>
  ),
});

const freeAgencyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/free-agency',
  component: FreeAgencyHub,
});

const faTargetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fa-targets',
  component: () => (
    <LazyRouteFrame label="fa target board">
      <LazyFATargetBoard />
    </LazyRouteFrame>
  ),
});

const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game-day',
  component: GameDayRecap,
});

const broadcastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/broadcast',
  component: () => (
    <LazyRouteFrame label="game broadcast">
      <LazyGameBroadcast />
    </LazyRouteFrame>
  ),
});

const broadcastPresentationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/presentation',
  component: () => (
    <LazyRouteFrame label="broadcast presentation">
      <LazyBroadcastPresentation />
    </LazyRouteFrame>
  ),
});

const leaguePulseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/league-pulse',
  component: () => (
    <LazyRouteFrame label="league pulse">
      <LazyLeaguePulse />
    </LazyRouteFrame>
  ),
});

const playByPlayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play-by-play',
  component: () => (
    <LazyRouteFrame label="play by play">
      <LazyPlayByPlay />
    </LazyRouteFrame>
  ),
});

const gameFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game-flow',
  component: () => (
    <LazyRouteFrame label="game flow">
      <LazyGameFlow />
    </LazyRouteFrame>
  ),
});

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  component: InboxTriage,
});

const socialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/social',
  component: () => (
    <LazyRouteFrame label="social feed">
      <LazySocialFeed />
    </LazyRouteFrame>
  ),
});

const waiverWireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/waivers',
  component: () => (
    <LazyRouteFrame label="waiver wire">
      <LazyWaiverWire />
    </LazyRouteFrame>
  ),
});

const practiceSquadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice-squad',
  component: () => (
    <LazyRouteFrame label="practice squad">
      <LazyPracticeSquad />
    </LazyRouteFrame>
  ),
});

const gamePlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game-plan',
  component: () => (
    <LazyRouteFrame label="game plan">
      <LazyGamePlanSetup />
    </LazyRouteFrame>
  ),
});

const draftRecapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/draft-recap',
  component: () => (
    <LazyRouteFrame label="draft recap">
      <LazyDraftRecap />
    </LazyRouteFrame>
  ),
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  component: () => (
    <LazyRouteFrame label="team schedule">
      <LazyTeamSchedule />
    </LazyRouteFrame>
  ),
});

const depthChartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/depth-chart',
  component: DepthChart,
});

const playerProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/player/$playerId',
  component: () => (
    <LazyRouteFrame label="player profile">
      <LazyPlayerProfile />
    </LazyRouteFrame>
  ),
});

const playerComparisonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: () => (
    <LazyRouteFrame label="player comparison">
      <LazyPlayerComparison />
    </LazyRouteFrame>
  ),
});

const playerTimelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/player/$playerId/timeline',
  component: () => (
    <LazyRouteFrame label="player timeline">
      <LazyPlayerTimeline />
    </LazyRouteFrame>
  ),
});

const rivalriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rivalries',
  component: () => (
    <LazyRouteFrame label="player rivalries">
      <LazyPlayerRivalries />
    </LazyRouteFrame>
  ),
});

const teamNeedsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team-needs',
  component: () => (
    <LazyRouteFrame label="team needs">
      <LazyTeamNeeds />
    </LazyRouteFrame>
  ),
});

const coachingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coaching',
  component: CoachingStaff,
});

const coachingTreeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coaching/tree',
  component: CoachingTree,
});

const relationshipGraphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coaching/relationships',
  component: RelationshipGraph,
});

const franchiseBookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/book',
  component: () => (
    <LazyRouteFrame label="franchise book">
      <LazyFranchiseBook />
    </LazyRouteFrame>
  ),
});

const filmRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/film-room',
  component: () => (
    <LazyRouteFrame label="film room">
      <LazyFilmRoom />
    </LazyRouteFrame>
  ),
});

const tradeDeadlineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trade-deadline',
  component: () => (
    <LazyRouteFrame label="trade deadline">
      <LazyTradeDeadline />
    </LazyRouteFrame>
  ),
});

const ownerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner',
  component: OwnerMood,
});

const commissionerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/commissioner',
  component: () => (
    <LazyRouteFrame label="commissioner office">
      <LazyCommissionerOffice />
    </LazyRouteFrame>
  ),
});

const cbaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cba',
  component: () => (
    <LazyRouteFrame label="cba negotiations">
      <LazyCBANegotiation />
    </LazyRouteFrame>
  ),
});

const leagueRulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/league-rules',
  component: () => (
    <LazyRouteFrame label="league rules">
      <LazyLeagueRulesViewer />
    </LazyRouteFrame>
  ),
});

const franchiseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise',
  component: () => (
    <LazyRouteFrame label="franchise hub">
      <LazyFranchiseHub />
    </LazyRouteFrame>
  ),
});

const relocationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/relocate',
  component: () => (
    <LazyRouteFrame label="relocation screen">
      <LazyRelocationScreen />
    </LazyRouteFrame>
  ),
});

const expansionDraftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/expansion-draft',
  component: () => (
    <LazyRouteFrame label="expansion draft">
      <LazyExpansionDraft />
    </LazyRouteFrame>
  ),
});

const legendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legends',
  component: () => (
    <LazyRouteFrame label="franchise legends">
      <LazyFranchiseLegends />
    </LazyRouteFrame>
  ),
});

const seasonRecapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/season/recap',
  component: () => (
    <LazyRouteFrame label="season recap">
      <LazySeasonRecapScreen />
    </LazyRouteFrame>
  ),
});

const weekAdvanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/week-advance',
  component: WeekAdvance,
});

const handshakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/handshakes',
  component: HandshakeLedger,
});

const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/news',
  component: () => (
    <LazyRouteFrame label="league news">
      <LazyLeagueNews />
    </LazyRouteFrame>
  ),
});

const newsroomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/newsroom',
  component: () => (
    <LazyRouteFrame label="newsroom digest">
      <LazyNewsroomDigest />
    </LazyRouteFrame>
  ),
});

const recordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/records',
  component: () => (
    <LazyRouteFrame label="record book">
      <LazyRecordBook />
    </LazyRouteFrame>
  ),
});

const statCentralRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stat-central',
  component: () => (
    <LazyRouteFrame label="stat central">
      <LazyStatCentral />
    </LazyRouteFrame>
  ),
});

const standingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  component: () => (
    <LazyRouteFrame label="standings">
      <LazyLeagueStandings />
    </LazyRouteFrame>
  ),
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: () => (
    <LazyRouteFrame label="analytics">
      <LazyAnalyticsDashboard />
    </LazyRouteFrame>
  ),
});

const legacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legacy',
  component: () => (
    <LazyRouteFrame label="legacy timeline">
      <LazyLegacyTimeline />
    </LazyRouteFrame>
  ),
});

const namedGamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legacy/named-games',
  component: () => (
    <LazyRouteFrame label="named games browser">
      <LazyNamedGamesBrowser />
    </LazyRouteFrame>
  ),
});

const bloodlinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legacy/bloodlines',
  component: () => (
    <LazyRouteFrame label="bloodlines viewer">
      <LazyBloodlinesViewer />
    </LazyRouteFrame>
  ),
});

const awardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/awards',
  component: () => (
    <LazyRouteFrame label="awards hub">
      <LazyAwardsHub />
    </LazyRouteFrame>
  ),
});

const powerRankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/power-rankings',
  component: () => (
    <LazyRouteFrame label="power rankings">
      <LazyPowerRankings />
    </LazyRouteFrame>
  ),
});

const scenarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scenarios',
  component: () => (
    <LazyRouteFrame label="scenario challenges">
      <LazyScenarioSelect />
    </LazyRouteFrame>
  ),
});

const dynastyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dynasty',
  component: () => (
    <LazyRouteFrame label="dynasty cartridge">
      <LazyDynastyCartridge />
    </LazyRouteFrame>
  ),
});

const gmCareerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/career',
  component: () => (
    <LazyRouteFrame label="gm career">
      <LazyGmCareer />
    </LazyRouteFrame>
  ),
});

const scrapbookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/scrapbook',
  component: () => (
    <LazyRouteFrame label="dynasty scrapbook">
      <LazyScrapbook />
    </LazyRouteFrame>
  ),
});

const hallOfFameDirectoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/hall',
  component: () => (
    <LazyRouteFrame label="hall of fame directory">
      <LazyHallOfFameDirectory />
    </LazyRouteFrame>
  ),
});

const trophyRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/trophy-room',
  component: () => (
    <LazyRouteFrame label="trophy room">
      <LazyTrophyRoom />
    </LazyRouteFrame>
  ),
});

const eraHallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/eras',
  component: () => (
    <LazyRouteFrame label="era hall">
      <LazyEraHall />
    </LazyRouteFrame>
  ),
});

const mvpPlaqueWallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/mvps',
  component: () => (
    <LazyRouteFrame label="mvp plaque wall">
      <LazyMvpPlaqueWall />
    </LazyRouteFrame>
  ),
});

const playoffLoreDirectoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/playoff-lore',
  component: () => (
    <LazyRouteFrame label="playoff lore directory">
      <LazyPlayoffLoreDirectory />
    </LazyRouteFrame>
  ),
});

const dynastyChronicleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/chronicle',
  component: () => (
    <LazyRouteFrame label="dynasty chronicle">
      <LazyDynastyChronicle />
    </LazyRouteFrame>
  ),
});

function PlayerDevRouteWrapper() {
  const roster = useGameStore(selectRoster);
  const team = useGameStore(selectUserTeam);
  const game = useGameStore((s) => s.game);
  const firstPlayer = roster[0] ?? null;
  const report = useMemo(() => {
    if (!firstPlayer) return null;
    return generateDevelopmentReport(firstPlayer, team ?? null);
  }, [firstPlayer, team]);
  const breakoutCandidates = useMemo(() => {
    if (!game || !team) return [];
    return identifyBreakoutCandidates(game, team.id);
  }, [game, team]);
  return (
    <LazyRouteFrame label="player development">
      <LazyPlayerDevelopmentInner
        report={report}
        projections={[]}
        breakoutCandidates={breakoutCandidates}
        coachImpact={null}
      />
    </LazyRouteFrame>
  );
}

const playerDevRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/player-development',
  component: PlayerDevRouteWrapper,
});

const superBowlRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/super-bowl',
  component: () => (
    <LazyRouteFrame label="super bowl">
      <LazySuperBowlPresentation />
    </LazyRouteFrame>
  ),
});

const mentorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mentors',
  component: () => (
    <LazyRouteFrame label="alumni mentors">
      <LazyAlumniMentors />
    </LazyRouteFrame>
  ),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => (
    <LazyRouteFrame label="about">
      <LazyAboutScreen />
    </LazyRouteFrame>
  ),
});

const creditsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/credits',
  component: () => (
    <LazyRouteFrame label="credits">
      <LazyCreditsScreen />
    </LazyRouteFrame>
  ),
});

const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/faq',
  component: () => (
    <LazyRouteFrame label="faq">
      <LazyFaqScreen />
    </LazyRouteFrame>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsScreen,
});

const achievementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/franchise/achievements',
  component: () => (
    <LazyRouteFrame label="achievements">
      <LazyAchievementsGallery />
    </LazyRouteFrame>
  ),
});

const weatherForecastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/league/weather',
  component: () => (
    <LazyRouteFrame label="weather">
      <LazyWeatherForecast />
    </LazyRouteFrame>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rosterRoute, lockerRoomRoute, contractsRoute, capLabRoute, frontOfficeRoute, endorsementsRoute, tradesRoute, tradeBlockRoute, watchListRoute,
  scoutingRoute, draftRoute, trainingCampRoute, freeAgencyRoute, faTargetsRoute,
  gameDayRoute, broadcastRoute, broadcastPresentationRoute, playByPlayRoute, gameFlowRoute, inboxRoute, socialRoute, waiverWireRoute, practiceSquadRoute, gamePlanRoute, draftRecapRoute,
  scheduleRoute, depthChartRoute, playerProfileRoute, playerComparisonRoute, playerTimelineRoute, rivalriesRoute, teamNeedsRoute, coachingRoute, coachingTreeRoute, relationshipGraphRoute, filmRoomRoute, tradeDeadlineRoute,
  ownerRoute, commissionerRoute, cbaRoute, leagueRulesRoute, franchiseRoute, franchiseBookRoute, legendsRoute, seasonRecapRoute, relocationRoute, expansionDraftRoute, weekAdvanceRoute, handshakeRoute,
  newsRoute, newsroomRoute, recordsRoute, statCentralRoute, standingsRoute, analyticsRoute,
  powerRankingsRoute, leaguePulseRoute, scenarioRoute, legacyRoute, namedGamesRoute, bloodlinesRoute, awardsRoute, dynastyRoute, gmCareerRoute, scrapbookRoute, hallOfFameDirectoryRoute, playoffLoreDirectoryRoute, dynastyChronicleRoute, superBowlRoute, playerDevRoute, mentorsRoute, aboutRoute, creditsRoute, faqRoute, settingsRoute,
]);
routeTree.addChildren([...(routeTree.children ?? []), trophyRoomRoute, eraHallRoute]);

routeTree.addChildren([...(routeTree.children ?? []), mvpPlaqueWallRoute]);

routeTree.addChildren([...(routeTree.children ?? []), achievementsRoute]);

routeTree.addChildren([...(routeTree.children ?? []), weatherForecastRoute]);

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

// ── App entry ───────────────────────────────────────────────

export const CHIP_FRANCHISE_SETUP_STAGES: ChipHostStage[] = [
  { id: 'chip.onboarding.beat-1', label: 'Choose AGM', content: null, spotlightStageId: 'cold-open' },
  { id: 'chip.onboarding.beat-2', label: 'Franchise Intel', content: null, spotlightStageId: 'intel-briefing' },
  { id: 'chip.onboarding.beat-3', label: 'Meet Players', content: null, spotlightStageId: 'roster-overview' },
  { id: 'chip.onboarding.beat-4', label: 'Hire Coach', content: null, spotlightStageId: 'coach-hire' },
  { id: 'chip.onboarding.beat-5', label: 'Build Intel', content: null, spotlightStageId: 'scout-hire' },
  { id: 'chip.onboarding.beat-6', label: 'Set Identity', content: null, spotlightStageId: 'scheme' },
  { id: 'chip.onboarding.beat-7', label: 'Starting Lineup', content: null, spotlightStageId: 'depth-chart' },
  { id: 'chip.onboarding.beat-8', label: 'The Money', content: null, spotlightStageId: 'cap-strategy' },
  { id: 'chip.onboarding.beat-9', label: 'Set Goals', content: null, spotlightStageId: 'goals' },
  { id: 'chip.onboarding.beat-10', label: 'Day 1 Complete', content: null, spotlightStageId: 'blueprint' },
];

type ChipSetupStorage = Parameters<typeof readFirstTenMinutesCompleted>[0];

function resolveChipSetupStorage(): ChipSetupStorage {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function isChipNewGameSetup(storage: ChipSetupStorage = resolveChipSetupStorage()): boolean {
  return !readFirstTenMinutesCompleted(storage);
}

function currentAppRoute(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace(/^#/, '') || window.location.pathname || '/';
}

function useCurrentAppRoute(): string {
  const [route, setRoute] = useState(currentAppRoute);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateRoute = () => setRoute(currentAppRoute());
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('popstate', updateRoute);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('popstate', updateRoute);
    };
  }, []);

  return route;
}

function PostSetupApp() {
  useChipEvents();
  const chipDockEnabled = isChipFeatureEnabled();
  const chipGame = useGameStore((s) => s.game);
  const chipDockWeek = useGameStore((s) => s.game?.week ?? 0);
  const chipDockSeason = useGameStore((s) => s.game?.year ?? 0);
  const chipUserTeam = useGameStore(selectUserTeam);
  const chipCoachName = chipUserTeam?.staff.hc?.name ?? 'Coach';
  const chipDialogueText = useChipStore((s) => s.currentDialogueText);
  const chipDialoguePose = useChipStore((s) => s.pose);
  const chipDockRoute = useCurrentAppRoute();
  const chipRouteBeats = useActiveRouteBeats(chipDockRoute, { currentWeek: chipDockWeek });
  const chipPendingDecisions = useMemo(
    () => countPendingDecisions({ game: chipGame }),
    [chipGame],
  );
  const chipWhereAmI = useMemo(
    () => resolveWhereAmIState({ game: chipGame }, chipPendingDecisions.total),
    [chipGame, chipPendingDecisions.total],
  );

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      {chipDockEnabled ? (
        <ChipDock
          currentWeek={chipDockWeek}
          currentSeason={chipDockSeason}
          currentRoute={chipDockRoute}
          routeBeats={chipRouteBeats}
          pendingDecisions={chipPendingDecisions}
          whereAmI={chipWhereAmI}
          dynastyIndicator={{ seasonYear: chipDockSeason, coachName: chipCoachName }}
        >
          {chipDialogueText ? (
            <ChipDialogueBubble
              text={chipDialogueText}
              pose={chipDialoguePose}
              pointer="left"
            />
          ) : null}
        </ChipDock>
      ) : null}
    </ErrorBoundary>
  );
}

export function App() {
  const boot = useBootSequence();
  const gameLoaded = useGameStore((s) => s.initialized);
  const [setupCompanionAction, setSetupCompanionAction] = useState<ReactNode | null>(null);
  const [setupCompanionVisible, setSetupCompanionVisible] = useState(false);
  const setupIncomplete = useGameStore((s) => {
    if (!s.game?.setupState) return false;
    return s.game.setupState.completedPhases.length < PHASE_ORDER.length;
  });

  if (boot.shouldShow && !boot.isComplete) {
    return <BootScreen lines={boot.visibleLines} onSkip={boot.skip} />;
  }

  if (!gameLoaded) {
    return <NewGameScreen />;
  }

  if (setupIncomplete) {
    // Read first-ten marker fresh on each render (PR #18 P2 fix): a memoized
    // chipNewGame would go stale if a user finishes setup and starts another
    // franchise within the same SPA session.
    const chipNewGameSetup = isChipNewGameSetup();
    return (
      <>
        <PoseEventEmitter firstLaunchActive={chipNewGameSetup} />
        <ChipHost
          newGame={chipNewGameSetup}
          stages={CHIP_FRANCHISE_SETUP_STAGES}
          companionAction={setupCompanionAction}
          onCompanionVisibleChange={setSetupCompanionVisible}
        >
          {({ onStageAdvance, companionPanel }) => (
            <FranchiseSetupWizard
              companionPanel={companionPanel}
              companionPrimaryActionActive={setupCompanionVisible}
              onCompanionActionChange={(action) => setSetupCompanionAction(action)}
              onStageAdvance={onStageAdvance}
            />
          )}
        </ChipHost>
      </>
    );
  }

  return (
    <>
      <PoseEventEmitter />
      <PostSetupApp />
    </>
  );
}
