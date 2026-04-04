import type { ScheduleWeek } from '../types';

const BYE_TEAM_ID = '__BYE__';

function orderedTeams(teamIds: string[], year: number): string[] {
  const sorted = [...teamIds].sort((a, b) => a.localeCompare(b));
  if (year % 2 !== 0 && sorted.length > 1) {
    sorted.push(sorted.shift()!);
  }
  return sorted;
}

export function buildSeasonSchedule(teamIds: string[], year: number): ScheduleWeek[] {
  const baseTeams = orderedTeams(teamIds, year);
  const working = baseTeams.length % 2 === 0 ? [...baseTeams] : [...baseTeams, BYE_TEAM_ID];
  const weeks: ScheduleWeek[] = [];

  for (let week = 1; week <= 18; week += 1) {
    const games = [];
    for (let index = 0; index < working.length / 2; index += 1) {
      const left = working[index]!;
      const right = working[working.length - 1 - index]!;
      if (left === BYE_TEAM_ID || right === BYE_TEAM_ID) continue;

      const home = week % 2 === 0 ? right : left;
      const away = week % 2 === 0 ? left : right;
      games.push({
        homeTeamId: home,
        awayTeamId: away,
        result: null,
        flexed: false,
        primetime: false,
        broadcastNetwork: null,
      });
    }

    weeks.push({ week, games });

    if (working.length > 2) {
      const fixed = working[0]!;
      const rotated = [fixed, working[working.length - 1]!, ...working.slice(1, -1)];
      working.splice(0, working.length, ...rotated);
    }
  }

  return weeks;
}
