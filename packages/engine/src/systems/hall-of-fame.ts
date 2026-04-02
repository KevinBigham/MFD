import type { GameState, HallOfFameEntry, PlayerArchiveEntry, Position } from '../types';

function archivePosition(entry: PlayerArchiveEntry): Position {
  return entry.positions[0] ?? 'QB';
}

function careerYears(entry: PlayerArchiveEntry): number {
  return entry.careerStats?.seasons ?? Math.max(1, entry.lastYear - entry.firstYear + 1);
}

function hallScore(entry: PlayerArchiveEntry): number {
  return (
    entry.peakOvr * 0.4 +
    (entry.careerStats?.gp ?? 0) * 0.002 +
    (entry.careerStats?.mvps ?? 0) * 15 +
    (entry.careerStats?.allPros ?? 0) * 8 +
    (entry.careerStats?.proBowls ?? 0) * 3 +
    (entry.careerStats?.championships ?? 0) * 20
  );
}

function eligible(entry: PlayerArchiveEntry, inductionYear: number): boolean {
  const gp = entry.careerStats?.gp ?? 0;
  return Boolean(
    entry.retirementYear !== null &&
    entry.retirementYear <= inductionYear - 1 &&
    entry.peakOvr >= 85 &&
    gp >= 80
  );
}

function highlights(entry: PlayerArchiveEntry): string[] {
  const notes: string[] = [`Peak ${entry.peakOvr} OVR`, `${careerYears(entry)} seasons`];
  if ((entry.careerStats?.mvps ?? 0) > 0) notes.push(`${entry.careerStats?.mvps} MVP`);
  if ((entry.careerStats?.allPros ?? 0) > 0) notes.push(`${entry.careerStats?.allPros} All-Pro`);
  if ((entry.careerStats?.proBowls ?? 0) > 0) notes.push(`${entry.careerStats?.proBowls} Pro Bowl`);
  if ((entry.careerStats?.championships ?? 0) > 0) notes.push(`${entry.careerStats?.championships} championships`);
  return notes;
}

export function inductHallOfFame(game: GameState, inductionYear: number): HallOfFameEntry[] {
  const inductedIds = new Set(game.hallOfFame.map((entry) => entry.playerId));

  const classEntries = game.playerArchive
    .filter((entry) => !inductedIds.has(entry.playerId))
    .filter((entry) => eligible(entry, inductionYear))
    .map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      position: archivePosition(entry),
      inductionYear,
      peakOvr: entry.peakOvr,
      careerYears: careerYears(entry),
      score: Math.round(hallScore(entry) * 100) / 100,
      awards: {
        mvps: entry.careerStats?.mvps ?? 0,
        allPros: entry.careerStats?.allPros ?? 0,
        proBowls: entry.careerStats?.proBowls ?? 0,
        championships: entry.careerStats?.championships ?? 0,
      },
      highlights: highlights(entry),
      teams: entry.teamHistory.map((stint) => stint.teamId),
    } satisfies HallOfFameEntry))
    .filter((entry) => entry.score >= 70)
    .sort((a, b) => b.score - a.score || b.peakOvr - a.peakOvr || a.playerId.localeCompare(b.playerId))
    .slice(0, 5);

  game.hallOfFame = [...game.hallOfFame, ...classEntries].sort((a, b) =>
    a.inductionYear - b.inductionYear || b.score - a.score || a.playerId.localeCompare(b.playerId)
  );

  return classEntries;
}
