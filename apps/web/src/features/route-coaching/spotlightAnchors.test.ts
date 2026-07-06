import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { FIRST_TEN_MINUTE_ONBOARDING_BEATS } from '../companion/onboardingMachine';
import { ROUTE_BEAT_REGISTRY, ROUTE_KEYS } from './routeBeatRegistry';
import { resolveRouteKey } from './useActiveRouteBeats';

// Maps each route key to the post-setup screen file that should contain its
// data-spotlight-target anchors. Keep this in lockstep with the post-setup
// route table in apps/web/src/app/App.tsx — see resolveRouteKey in
// useActiveRouteBeats.ts for the routing source of truth.
const ROUTE_SCREEN_FILES: Record<(typeof ROUTE_KEYS)[number], string> = {
  'monday-briefing': 'apps/web/src/features/monday-briefing/MondayBriefing.tsx',
  roster: 'apps/web/src/features/roster/RosterManagement.tsx',
  'depth-chart': 'apps/web/src/features/depth-chart/DepthChart.tsx',
  'locker-room': 'apps/web/src/features/locker-room/LockerRoom.tsx',
  'game-plan': 'apps/web/src/features/game-plan/GamePlanSetup.tsx',
  'game-day-recap': 'apps/web/src/features/game-day/GameDayRecap.tsx',
  'broadcast-suite': 'apps/web/src/features/broadcast/GameBroadcast.tsx',
  'film-room': 'apps/web/src/features/film-room/FilmRoom.tsx',
  'super-bowl': 'apps/web/src/features/playoffs/SuperBowlPresentation.tsx',
  'week-advance': 'apps/web/src/features/week-advance/WeekAdvance.tsx',
  schedule: 'apps/web/src/features/schedule/TeamSchedule.tsx',
  'watch-list': 'apps/web/src/features/watch-list/WatchListScreen.tsx',
  inbox: 'apps/web/src/features/inbox/InboxTriage.tsx',
  'owner-promises': 'apps/web/src/features/owner/OwnerMood.tsx',
  staff: 'apps/web/src/features/coaching/CoachingStaff.tsx',
  'cap-laboratory': 'apps/web/src/features/contracts/CapLaboratory.tsx',
  'front-office': 'apps/web/src/features/front-office/ContractTools.tsx',
  endorsements: 'apps/web/src/features/endorsements/EndorsementCenter.tsx',
  'draft-board': 'apps/web/src/features/draft/DraftBoard.tsx',
  'draft-recap': 'apps/web/src/features/draft/DraftRecap.tsx',
  'trade-center': 'apps/web/src/features/trades/TradeCenter.tsx',
  'trade-market-radar': 'apps/web/src/features/trades/TradeBlockTicker.tsx',
  'market-planning': 'apps/web/src/features/team-needs/TeamNeeds.tsx',
  'roster-churn': 'apps/web/src/features/waiver-wire/WaiverWire.tsx',
  'scouting-board': 'apps/web/src/features/scouting/ScoutingBoard.tsx',
  standings: 'apps/web/src/features/standings/LeagueStandings.tsx',
  'analytics-evidence': 'apps/web/src/features/analytics/AnalyticsDashboard.tsx',
  'player-profile': 'apps/web/src/features/player/PlayerProfile.tsx',
  'player-timeline': 'apps/web/src/features/stats/PlayerTimeline.tsx',
  'player-development': 'apps/web/src/features/player/PlayerDevelopment.tsx',
  'player-comparison': 'apps/web/src/features/shared/PlayerComparison.tsx',
  'player-rivalries': 'apps/web/src/features/player/PlayerRivalries.tsx',
  'power-rankings': 'apps/web/src/features/power-rankings/PowerRankings.tsx',
  'league-pulse': 'apps/web/src/features/league/LeaguePulse.tsx',
  'league-weather': 'apps/web/src/features/league/WeatherForecast.tsx',
  'league-news': 'apps/web/src/features/league-news/LeagueNews.tsx',
  newsroom: 'apps/web/src/features/newsroom/NewsroomDigest.tsx',
  'social-feed': 'apps/web/src/features/social/SocialFeed.tsx',
  'commissioner-governance': 'apps/web/src/features/league/CommissionerOffice.tsx',
  cba: 'apps/web/src/features/league/CBANegotiation.tsx',
  'league-rules': 'apps/web/src/features/league/LeagueRulesViewer.tsx',
  'scenario-constraints': 'apps/web/src/features/scenario/ScenarioSelect.tsx',
  'record-book': 'apps/web/src/features/stats/RecordBook.tsx',
  'awards-hub': 'apps/web/src/features/legacy/AwardsHub.tsx',
  'franchise-legends': 'apps/web/src/features/franchise/FranchiseLegends.tsx',
  'season-recap': 'apps/web/src/features/season/SeasonRecapCard.tsx',
  'dynasty-save-load': 'apps/web/src/features/dynasty-cartridge/DynastyCartridge.tsx',
  settings: 'apps/web/src/features/settings/Settings.tsx',
  'training-camp': 'apps/web/src/features/training-camp/TrainingCamp.tsx',
  mentors: 'apps/web/src/features/mentors/AlumniMentorsScreen.tsx',
  'trade-deadline': 'apps/web/src/features/trades/TradeDeadline.tsx',
  relocation: 'apps/web/src/features/franchise/RelocationScreen.tsx',
  'expansion-draft': 'apps/web/src/features/franchise/ExpansionDraft.tsx',
};

function readScreen(relativePath: string): string {
  const url = new URL(`../../../../../${relativePath}`, import.meta.url);
  return readFileSync(url, 'utf-8');
}

describe('route coaching spotlight anchors', () => {
  it('every route key has a matching screen file', () => {
    for (const routeKey of ROUTE_KEYS) {
      expect(ROUTE_SCREEN_FILES[routeKey]).toBeDefined();
    }
  });

  it.each(ROUTE_KEYS)(
    '%s screen contains data-spotlight-target for every beat in the registry',
    (routeKey) => {
      const beats = ROUTE_BEAT_REGISTRY[routeKey];
      const source = readScreen(ROUTE_SCREEN_FILES[routeKey]);

      for (const beat of beats) {
        if (beat.spotlightTarget === null) continue;
        const anchor = `data-spotlight-target="${beat.spotlightTarget}"`;
        expect(
          source.includes(anchor),
          `${ROUTE_SCREEN_FILES[routeKey]} is missing anchor ${anchor}; route coaching spotlight will resolve null`,
        ).toBe(true);
      }
    },
  );

  it('every spotlight target across the registry resolves to exactly one anchor in source', () => {
    for (const routeKey of ROUTE_KEYS) {
      const beats = ROUTE_BEAT_REGISTRY[routeKey];
      const source = readScreen(ROUTE_SCREEN_FILES[routeKey]);

      for (const beat of beats) {
        if (beat.spotlightTarget === null) continue;
        const anchor = `data-spotlight-target="${beat.spotlightTarget}"`;
        const matches = source.split(anchor).length - 1;
        expect(matches, `expected exactly one anchor for ${beat.spotlightTarget}`).toBe(1);
      }
    }
  });

  it('first-ten onboarding spotlight targets resolve to exactly one anchor on their route screen', () => {
    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      if (beat.spotlightTarget === null) continue;
      const routeKey = resolveRouteKey(beat.route);
      expect(routeKey, `${beat.id} uses uncoached route ${beat.route}`).not.toBeNull();
      if (routeKey === null) continue;

      const screenPath = ROUTE_SCREEN_FILES[routeKey];
      expect(screenPath, `${beat.id} route ${beat.route} is missing a spotlight screen mapping`).toBeDefined();
      const source = readScreen(screenPath);
      const anchor = `data-spotlight-target="${beat.spotlightTarget}"`;
      const matches = source.split(anchor).length - 1;

      expect(matches, `${beat.id} expected exactly one anchor for ${beat.spotlightTarget} in ${screenPath}`).toBe(1);
    }
  });
});
