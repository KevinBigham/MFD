import type { GameResult, GameState } from '../types';
import { generateHeadlines } from './headlines';
import { generateHotTakes } from './hot-takes';
import { computePowerRankings } from './power-rankings';
import type { WeeklyDigest } from './types';

function resultsForWeek(state: GameState, weekNumber: number): GameResult[] {
  return (state.schedule.find((entry) => entry.week === weekNumber)?.games ?? [])
    .map((game) => game.result)
    .filter((result): result is GameResult => Boolean(result))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function generateWeeklyMediaCycle(state: GameState, weekNumber: number): WeeklyDigest {
  const powerRankings = computePowerRankings(state, weekNumber);
  const gameResults = resultsForWeek(state, weekNumber);
  const headlines = generateHeadlines(state, weekNumber, gameResults);
  const hotTakes = generateHotTakes(state, weekNumber, headlines);

  return {
    weekNumber,
    powerRankings,
    headlines,
    hotTakes,
  };
}
