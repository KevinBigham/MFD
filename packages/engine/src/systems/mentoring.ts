import { cl } from '../utils';
import type { GameState, MentoringPair, Player, Team } from '../types';

function positionGroup(player: Player): string {
  if (player.pos === 'WR' || player.pos === 'TE') return 'WR/TE';
  if (player.pos === 'DL' || player.pos === 'LB') return 'DL/LB';
  if (player.pos === 'CB' || player.pos === 'S') return 'CB/S';
  if (player.pos === 'K' || player.pos === 'P') return 'K/P';
  return player.pos;
}

function isLeaderSignal(player: Player): boolean {
  return player.traits.some((trait) => ['captain', 'vocal_leader', 'mentor'].includes(trait));
}

function isCompetitiveSignal(player: Player): boolean {
  return player.traits.some((trait) => ['chip', 'clutch'].includes(trait))
    || player.personality.pressure >= 8
    || player.personality.ambition >= 8;
}

function personalityBonus(mentor: Player, mentee: Player): number {
  if (isLeaderSignal(mentor) && isLeaderSignal(mentee)) return 1;
  if (isCompetitiveSignal(mentor) && isCompetitiveSignal(mentee)) return 1;
  return 0;
}

function mentorBonus(mentor: Player, mentee: Player): number {
  const base = mentor.ovr >= 85 ? 3 : mentor.ovr >= 80 ? 2 : 1;
  return base + personalityBonus(mentor, mentee);
}

function eligibleMentor(player: Player): boolean {
  return player.age >= 28 && player.ovr >= 78;
}

function eligibleMentee(player: Player): boolean {
  return player.age <= 25 && player.devTrait !== 'x-factor';
}

function sortMentors(a: Player, b: Player): number {
  return b.ovr - a.ovr || b.age - a.age || a.id.localeCompare(b.id);
}

function sortMentees(a: Player, b: Player): number {
  return a.ovr - b.ovr || a.age - b.age || a.id.localeCompare(b.id);
}

function applyMentorGrowth(player: Player): void {
  player.ratings.leadership = cl((player.ratings.leadership ?? player.ovr) + 2, 40, 99);
  player.ratings.awareness = cl((player.ratings.awareness ?? player.ovr) + 2, 40, 99);
}

export function formMentoringPairs(game: GameState, year: number): MentoringPair[] {
  const pairs: MentoringPair[] = [];

  for (const team of Object.values(game.teams)) {
    const teamPairs: MentoringPair[] = [];
    const usedMentors = new Set<string>();
    const usedMentees = new Set<string>();
    const mentors = [...team.roster].filter(eligibleMentor).sort(sortMentors);
    const mentees = [...team.roster].filter(eligibleMentee).sort(sortMentees);
    const groups = ['QB', 'RB', 'WR/TE', 'OL', 'DL/LB', 'CB/S', 'K/P'];

    for (const group of groups) {
      if (teamPairs.length >= 3) break;
      const mentor = mentors.find((player) => !usedMentors.has(player.id) && positionGroup(player) === group);
      const mentee = mentees.find((player) => !usedMentees.has(player.id) && positionGroup(player) === group);
      if (!mentor || !mentee) continue;

      const bonus = mentorBonus(mentor, mentee);
      applyMentorGrowth(mentor);
      usedMentors.add(mentor.id);
      usedMentees.add(mentee.id);

      teamPairs.push({
        mentorId: mentor.id,
        mentorName: mentor.name,
        menteeId: mentee.id,
        menteeName: mentee.name,
        teamId: team.id,
        positionGroup: group,
        year,
        bonus,
      });
    }

    team.mentoringPairs = teamPairs;
    pairs.push(...teamPairs);
  }

  return pairs;
}

export function applyMentoringBonuses(game: GameState, pairs: MentoringPair[]): Map<string, number> {
  const bonuses = new Map<string, number>();

  for (const pair of pairs) {
    bonuses.set(pair.menteeId, Math.max(bonuses.get(pair.menteeId) ?? 0, pair.bonus));
    const team = game.teams[pair.teamId];
    if (team) {
      team.mentoringPairs = team.mentoringPairs.map((entry) =>
        entry.menteeId === pair.menteeId && entry.mentorId === pair.mentorId ? { ...entry, bonus: pair.bonus } : entry
      );
    }
  }

  return bonuses;
}
