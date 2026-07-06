import type { CareerEpilogue, GameState } from '@mfd/engine';
import { listAllPlayoffLoreCards, readScrapbookForDynasty } from './scrapbook-store';

export type ChronicleEventType =
  | 'championship_win'
  | 'hof_induction'
  | 'playoff_round'
  | 'season_end'
  | 'coach_championship'
  | 'coach_hire'
  | 'coach_retire'
  | 'scrapbook_note';

export type ChronicleEvent =
  | {
    id: string;
    type: 'championship_win';
    year: number;
    teamAbbr: string;
    record: string;
  }
  | {
    id: string;
    type: 'hof_induction';
    year: number;
    playerName: string;
    position: string;
    epilogueCategory?: CareerEpilogue['category'];
    epilogueHeadline?: string;
    epilogueStory?: string;
  }
  | {
    id: string;
    type: 'playoff_round';
    year: number;
    round: string;
    outcome: string;
    headline: string;
    finalScore: string;
  }
  | {
    id: string;
    type: 'season_end';
    year: number;
    teamAbbr: string;
    record: string;
    playoffFinish: string;
  }
  | {
    id: string;
    type: 'coach_championship';
    year: number;
    coachName: string;
  }
  | {
    id: string;
    type: 'coach_hire';
    year: number;
    coachName: string;
  }
  | {
    id: string;
    type: 'coach_retire';
    year: number;
    coachName: string;
  }
  | {
    id: string;
    type: 'scrapbook_note';
    year: number;
    headline: string;
  };

const EVENT_PRIORITY: Record<ChronicleEventType, number> = {
  championship_win: 0,
  hof_induction: 1,
  playoff_round: 2,
  season_end: 3,
  coach_championship: 4,
  coach_hire: 5,
  coach_retire: 6,
  scrapbook_note: 7,
};

function parseDynastyId(dynastyId: string): { teamId: string; startYear: number } | null {
  const [, teamId, rawStartYear] = dynastyId.split(':');
  const startYear = Number(rawStartYear);
  if (!teamId || !Number.isFinite(startYear)) return null;
  return { teamId, startYear };
}

function compareEvents(left: ChronicleEvent, right: ChronicleEvent): number {
  return right.year - left.year
    || EVENT_PRIORITY[left.type] - EVENT_PRIORITY[right.type]
    || left.id.localeCompare(right.id);
}

function chronicleEpilogue(epilogue: CareerEpilogue | undefined): Pick<CareerEpilogue, 'category' | 'headline' | 'story'> | null {
  const headline = epilogue?.headline.trim();
  const story = epilogue?.story.trim();
  const category = epilogue?.category.trim() as CareerEpilogue['category'] | undefined;
  if (!headline || !story || !category) return null;
  return { category, headline, story };
}

export function computeDynastyChronicle(game: GameState, dynastyId: string): ChronicleEvent[] {
  const parsed = parseDynastyId(dynastyId);
  if (!parsed) return [];

  const { teamId, startYear } = parsed;
  const teamAbbr = game.teams[teamId]?.abbr ?? teamId;
  const events: ChronicleEvent[] = [];
  const franchiseSeasons = (game.franchiseHistory ?? [])
    .filter((entry) => entry.teamId === teamId && entry.year >= startYear);

  for (const season of franchiseSeasons) {
    events.push({
      id: `season:${season.year}`,
      type: 'season_end',
      year: season.year,
      teamAbbr,
      record: season.record,
      playoffFinish: season.playoffFinish,
    });

    if (season.playoffFinish === 'champion') {
      events.push({
        id: `championship:${season.year}`,
        type: 'championship_win',
        year: season.year,
        teamAbbr,
        record: season.record,
      });
    }
  }

  for (const entry of game.hallOfFame ?? []) {
    if (!entry.teams.includes(teamId) || entry.inductionYear < startYear) continue;
    const epilogue = chronicleEpilogue(entry.epilogue);
    events.push({
      id: `hof:${entry.playerId}:${entry.inductionYear}`,
      type: 'hof_induction',
      year: entry.inductionYear,
      playerName: entry.name,
      position: entry.position,
      ...(epilogue ? {
        epilogueCategory: epilogue.category,
        epilogueHeadline: epilogue.headline,
        epilogueStory: epilogue.story,
      } : {}),
    });
  }

  for (const coach of game.coachingHistory ?? []) {
    const lastStint = [...coach.teams].sort((left, right) => right.endYear - left.endYear || right.startYear - left.startYear)[0] ?? null;

    for (const stint of coach.teams.filter((teamHistory) => teamHistory.teamId === teamId && teamHistory.endYear >= startYear)) {
      if (stint.startYear >= startYear) {
        events.push({
          id: `coach-hire:${coach.coachId}:${stint.startYear}`,
          type: 'coach_hire',
          year: stint.startYear,
          coachName: coach.name,
        });
      }

      for (const season of franchiseSeasons) {
        if (season.playoffFinish !== 'champion') continue;
        if (season.year < stint.startYear || season.year > stint.endYear) continue;
        events.push({
          id: `coach-title:${coach.coachId}:${season.year}`,
          type: 'coach_championship',
          year: season.year,
          coachName: coach.name,
        });
      }
    }

    if (coach.retired && lastStint?.teamId === teamId && lastStint.endYear >= startYear) {
      events.push({
        id: `coach-retire:${coach.coachId}:${lastStint.endYear}`,
        type: 'coach_retire',
        year: lastStint.endYear,
        coachName: coach.name,
      });
    }
  }

  for (const entry of readScrapbookForDynasty(dynastyId)) {
    events.push({
      id: `scrapbook:${entry.year}:${entry.recap.teamId}`,
      type: 'scrapbook_note',
      year: entry.year,
      headline: entry.seasonHighlightLine,
    });
  }

  for (const entry of listAllPlayoffLoreCards().filter((candidate) => candidate.dynastyId === dynastyId)) {
    events.push({
      id: `playoff:${entry.card.gameId}:${entry.source}`,
      type: 'playoff_round',
      year: entry.seasonYear,
      round: entry.card.round,
      outcome: entry.card.outcome,
      headline: entry.card.headline,
      finalScore: entry.card.finalScore,
    });
  }

  return events.sort(compareEvents);
}
