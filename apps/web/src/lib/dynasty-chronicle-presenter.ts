import type { ChronicleEvent } from './dynasty-chronicle';

export type ChronicleAccent = 'default' | 'gold' | 'cyan' | 'green';

export function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

export function chronicleAccent(event: ChronicleEvent): ChronicleAccent {
  switch (event.type) {
    case 'championship_win':
    case 'hof_induction':
      return 'gold';
    case 'playoff_round':
      return 'cyan';
    case 'coach_championship':
    case 'coach_hire':
    case 'coach_retire':
      return 'green';
    case 'season_end':
    case 'scrapbook_note':
    default:
      return 'default';
  }
}

export function chronicleTitle(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return 'Championship Won';
    case 'hof_induction':
      return 'Hall of Fame';
    case 'playoff_round':
      return `${titleCase(event.round)} Round`;
    case 'season_end':
      return 'Season End';
    case 'coach_championship':
      return 'Coach Championship';
    case 'coach_hire':
      return 'Coach Hire';
    case 'coach_retire':
      return 'Coach Retirement';
    case 'scrapbook_note':
    default:
      return 'Scrapbook Note';
  }
}

export function chronicleBody(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return `${event.teamAbbr} finished ${event.record} and closed the year with a title.`;
    case 'hof_induction':
      return `${event.playerName} entered the Hall of Fame as a ${event.position}.`;
    case 'playoff_round':
      return `${titleCase(event.outcome)} // ${event.finalScore} // ${event.headline}`;
    case 'season_end':
      return `${event.teamAbbr} wrapped the season at ${event.record} with a ${titleCase(event.playoffFinish)} finish.`;
    case 'coach_championship':
      return `${event.coachName} guided the franchise to a championship season.`;
    case 'coach_hire':
      return `${event.coachName} took over the sideline.`;
    case 'coach_retire':
      return `${event.coachName} closed the coaching run.`;
    case 'scrapbook_note':
    default:
      return event.headline;
  }
}

export interface ChronicleFact {
  label: string;
  value: string;
}

export function chronicleFacts(event: ChronicleEvent): ChronicleFact[] {
  switch (event.type) {
    case 'championship_win':
      return [
        { label: 'Team', value: event.teamAbbr },
        { label: 'Record', value: event.record },
        { label: 'Year', value: String(event.year) },
      ];
    case 'hof_induction':
      return [
        { label: 'Name', value: event.playerName },
        { label: 'Position', value: event.position },
        { label: 'Induction', value: String(event.year) },
      ];
    case 'playoff_round':
      return [
        { label: 'Round', value: titleCase(event.round) },
        { label: 'Outcome', value: titleCase(event.outcome) },
        { label: 'Final', value: event.finalScore },
        { label: 'Year', value: String(event.year) },
      ];
    case 'season_end':
      return [
        { label: 'Team', value: event.teamAbbr },
        { label: 'Record', value: event.record },
        { label: 'Finish', value: titleCase(event.playoffFinish) },
        { label: 'Year', value: String(event.year) },
      ];
    case 'coach_championship':
    case 'coach_hire':
    case 'coach_retire':
      return [
        { label: 'Coach', value: event.coachName },
        { label: 'Year', value: String(event.year) },
      ];
    case 'scrapbook_note':
    default:
      return [{ label: 'Year', value: String(event.year) }];
  }
}
