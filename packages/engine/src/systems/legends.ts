import alumniTemplates from '../../../content/narrative/alumni-updates.json';
import type { AlumniUpdate, GameState, PlayerArchiveEntry } from '../types';

const CATEGORY_PRIORITY: Record<AlumniUpdate['category'], number> = {
  hof: 0,
  broadcasting: 1,
  coaching: 2,
  milestone: 3,
  legacy: 4,
};

function hashKey(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function primaryUserTeamId(game: GameState): string | null {
  return Object.values(game.teams).find((team) => team.isUser)?.id ?? null;
}

function touchedUserFranchise(entry: PlayerArchiveEntry, teamId: string): boolean {
  return entry.teamHistory.some((stint) => stint.teamId === teamId);
}

function teamLabel(game: GameState, teamId: string): string {
  const team = game.teams[teamId];
  return team ? `${team.city} ${team.name}` : 'the franchise';
}

function eraLabel(entry: PlayerArchiveEntry, teamId: string): string {
  const relevantStints = entry.teamHistory.filter((stint) => stint.teamId === teamId);
  const firstYear = relevantStints.length > 0 ? Math.min(...relevantStints.map((stint) => stint.firstYear)) : entry.firstYear;
  const lastYear = relevantStints.length > 0 ? Math.max(...relevantStints.map((stint) => stint.lastYear)) : entry.lastYear;
  return `${firstYear}-${lastYear}`;
}

function categoryForAlumnus(game: GameState, entry: PlayerArchiveEntry, year: number): AlumniUpdate['category'] | null {
  if (entry.retirementYear === null) return null;
  const yearsRetired = year - entry.retirementYear;
  if (yearsRetired <= 0) return null;

  const inducted = game.hallOfFame.some((hallEntry) => hallEntry.playerId === entry.playerId && hallEntry.inductionYear <= year);
  if (inducted) return 'hof';
  if (yearsRetired === 2) return 'broadcasting';
  if (yearsRetired === 3) return 'coaching';
  if (yearsRetired >= 10) return 'legacy';
  if (yearsRetired >= 5) return 'hof';
  return 'milestone';
}

function interpolateTemplate(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

function selectTemplate(category: AlumniUpdate['category'], seed: string): string {
  const templates = alumniTemplates[category];
  const index = hashKey(seed) % templates.length;
  return templates[index]!;
}

export function getAlumniUpdates(game: GameState, year: number): AlumniUpdate[] {
  const userTeamId = primaryUserTeamId(game);
  if (!userTeamId) return [];

  return [...game.playerArchive]
    .filter((entry) => touchedUserFranchise(entry, userTeamId))
    .map((entry) => {
      const category = categoryForAlumnus(game, entry, year);
      if (!category) return null;

      const text = interpolateTemplate(
        selectTemplate(category, `${entry.playerId}:${category}:${year}`),
        {
          name: entry.name,
          team: teamLabel(game, userTeamId),
          era: eraLabel(entry, userTeamId),
        },
      );

      return {
        subjectId: entry.playerId,
        subjectName: entry.name,
        text,
        year,
        category,
      } satisfies AlumniUpdate;
    })
    .filter((entry): entry is AlumniUpdate => entry !== null)
    .sort((a, b) =>
      CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
      a.subjectName.localeCompare(b.subjectName) ||
      a.subjectId.localeCompare(b.subjectId));
}
