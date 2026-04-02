import type {
  AwardEntity,
  AwardNominee,
  AwardResult,
  AwardsHistoryEntry,
  GameState,
  Player,
  Position,
  Team,
} from '../types';

const ALL_PRO_SLOTS: Array<[Position, number]> = [
  ['QB', 1],
  ['RB', 1],
  ['WR', 2],
  ['TE', 1],
  ['OL', 2],
  ['DL', 2],
  ['LB', 2],
  ['CB', 2],
  ['S', 2],
  ['K', 1],
  ['P', 1],
];

const PRO_BOWL_SLOTS: Array<[Position, number]> = [
  ['QB', 3],
  ['RB', 3],
  ['WR', 5],
  ['TE', 3],
  ['OL', 5],
  ['DL', 5],
  ['LB', 5],
  ['CB', 5],
  ['S', 5],
  ['K', 3],
  ['P', 3],
];

function teamLabel(team: Team): string {
  return `${team.city} ${team.name}`;
}

function winPct(team: Team): number {
  const games = team.wins + team.losses + team.ties;
  return games > 0 ? (team.wins + team.ties * 0.5) / games : 0;
}

function offensiveOutput(player: Player): number {
  return (
    player.stats.passYds * 0.025 +
    player.stats.passTD * 2.5 -
    player.stats.passINT * 1.4 +
    player.stats.rushYds * 0.05 +
    player.stats.rushTD * 2.2 +
    player.stats.recYds * 0.05 +
    player.stats.recTD * 2.1
  );
}

function defensiveOutput(player: Player): number {
  return (
    player.stats.tackles * 0.12 +
    player.stats.sacks * 4.4 +
    player.stats.defINT * 6.2
  );
}

function kickerOutput(player: Player): number {
  return player.stats.fgMade * 1.6 - (player.stats.fgAtt - player.stats.fgMade) * 0.9;
}

function punterOutput(player: Player): number {
  return player.ovr * 0.9;
}

function scorePlayer(team: Team, player: Player): number {
  const success = winPct(team) * 22;

  switch (player.pos) {
    case 'QB':
      return offensiveOutput(player) + player.ovr * 0.9 + success + 12;
    case 'RB':
      return player.stats.rushYds * 0.065 + player.stats.rushTD * 2.6 + player.stats.recYds * 0.03 + player.ovr * 0.85 + success;
    case 'WR':
    case 'TE':
      return player.stats.recYds * 0.07 + player.stats.recTD * 2.4 + player.stats.rec * 0.15 + player.ovr * 0.82 + success;
    case 'DL':
    case 'LB':
    case 'CB':
    case 'S':
      return defensiveOutput(player) + player.ovr * 0.8 + success;
    case 'OL':
      return player.ovr * 1.3 + success + (player.isStarter ? 8 : 0);
    case 'K':
      return kickerOutput(player) + player.ovr;
    case 'P':
      return punterOutput(player) + player.ovr * 0.5;
    default:
      return player.ovr + success;
  }
}

function createPlayerEntity(team: Team, player: Player): AwardEntity {
  return {
    entityId: player.id,
    entityType: 'player',
    name: player.name,
    teamId: team.id,
    teamName: teamLabel(team),
    position: player.pos,
    ovr: player.ovr,
    stats: {
      passYds: player.stats.passYds,
      passTD: player.stats.passTD,
      passINT: player.stats.passINT,
      rushYds: player.stats.rushYds,
      rushTD: player.stats.rushTD,
      recYds: player.stats.recYds,
      recTD: player.stats.recTD,
      sacks: player.stats.sacks,
      defINT: player.stats.defINT,
      tackles: player.stats.tackles,
      fgMade: player.stats.fgMade,
      fgAtt: player.stats.fgAtt,
    },
    score: scorePlayer(team, player),
  };
}

function createCoachEntity(game: GameState, team: Team): AwardEntity {
  const coach = team.staff.hc ?? null;
  const previousWins = game.franchiseHistory.find((entry) => entry.teamId === team.id && entry.year === game.year - 2)?.wins ?? 0;
  const improvement = team.wins - previousWins;
  const score = improvement * 7 + winPct(team) * 30 + team.seasonStats.pointDifferential * 0.08;

  return {
    entityId: coach?.id ?? `${team.id}-coach`,
    entityType: 'coach',
    name: coach?.name ?? `${team.city} Staff`,
    teamId: team.id,
    teamName: teamLabel(team),
    position: 'HC',
    ovr: coach?.level ?? Math.max(60, team.wins * 5),
    stats: {
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      improvement,
    },
    score,
  };
}

function tieBreak(a: AwardEntity, b: AwardEntity): number {
  const aSuccess = typeof a.stats.wins === 'number' && typeof a.stats.losses === 'number'
    ? (a.stats.wins - a.stats.losses)
    : 0;
  const bSuccess = typeof b.stats.wins === 'number' && typeof b.stats.losses === 'number'
    ? (b.stats.wins - b.stats.losses)
    : 0;

  return b.score - a.score || bSuccess - aSuccess || b.ovr - a.ovr || a.entityId.localeCompare(b.entityId);
}

function toNominee(entity: AwardEntity): AwardNominee {
  return {
    entityId: entity.entityId,
    entityType: entity.entityType,
    name: entity.name,
    teamId: entity.teamId,
    teamName: entity.teamName,
    position: entity.position,
    ovr: entity.ovr,
    score: Math.round(entity.score * 100) / 100,
    stats: entity.stats,
  };
}

function buildAwardResult(awardId: string, label: string, entities: AwardEntity[], narrative: string): AwardResult {
  const shortlist = [...entities].sort(tieBreak).slice(0, 5);
  const winner = shortlist[0]!;

  return {
    awardId,
    label,
    winnerId: winner.entityId,
    winnerName: winner.name,
    winnerTeamId: winner.teamId,
    winnerTeam: winner.teamName,
    winnerPosition: winner.position,
    winnerStats: winner.stats,
    score: Math.round(winner.score * 100) / 100,
    runnersUp: shortlist.slice(1).map(toNominee),
    narrative,
  };
}

function withFallback(primary: AwardEntity[], fallback: AwardEntity[]): AwardEntity[] {
  return primary.length > 0 ? primary : fallback;
}

function playerEntities(game: GameState): AwardEntity[] {
  return Object.values(game.teams)
    .flatMap((team) => team.roster.map((player) => createPlayerEntity(team, player)));
}

function rookie(player: Player, seasonYear: number): boolean {
  return player.age <= 23 && (player.yearsExp === 0 || player.draftYear === seasonYear);
}

function allProTeam(entities: AwardEntity[], slots: Array<[Position, number]>, excludeIds: Set<string> = new Set()): AwardEntity[] {
  const selected: AwardEntity[] = [];
  const used = new Set<string>(excludeIds);

  for (const [position, count] of slots) {
    const candidates = entities
      .filter((entity) => entity.entityType === 'player' && entity.position === position && !used.has(entity.entityId))
      .sort(tieBreak)
      .slice(0, count);

    for (const candidate of candidates) {
      selected.push(candidate);
      used.add(candidate.entityId);
    }
  }

  return selected;
}

function mutateCareerAwards(game: GameState, awardResults: AwardResult[]): void {
  const mvp = awardResults.find((award) => award.awardId === 'mvp');
  if (mvp) {
    const player = game.players[mvp.winnerId];
    if (player) player.careerStats.mvps = (player.careerStats.mvps ?? 0) + 1;
  }

  for (const awardId of ['all_pro_first_team', 'all_pro_second_team', 'pro_bowl'] as const) {
    const result = awardResults.find((award) => award.awardId === awardId);
    if (!result) continue;

    const selections = [toNominee({
      entityId: result.winnerId,
      entityType: 'player',
      name: result.winnerName,
      teamId: result.winnerTeamId,
      teamName: result.winnerTeam,
      position: result.winnerPosition,
      ovr: 0,
      score: result.score,
      stats: result.winnerStats,
    }), ...result.runnersUp];

    for (const nominee of selections) {
      const player = game.players[nominee.entityId];
      if (!player) continue;
      if (awardId === 'pro_bowl') {
        player.careerStats.proBowls = (player.careerStats.proBowls ?? 0) + 1;
      } else {
        player.careerStats.allPros = (player.careerStats.allPros ?? 0) + 1;
      }
    }
  }
}

export function generateAwards(game: GameState, seasonYear: number): AwardsHistoryEntry {
  const entities = playerEntities(game);
  const offensive = entities.filter((entity) => ['QB', 'RB', 'WR', 'TE', 'OL'].includes(entity.position ?? ''));
  const defensive = entities.filter((entity) => ['DL', 'LB', 'CB', 'S'].includes(entity.position ?? ''));

  const mvpCandidates = offensive.map((entity) => ({
    ...entity,
    score: entity.score + (entity.position === 'QB' ? 10 : 0),
  }));
  const opoyCandidates = offensive.map((entity) => ({
    ...entity,
    score: offensiveOutput(game.players[entity.entityId] ?? ({
      stats: entity.stats,
    } as Player)) + entity.ovr * 0.55,
  }));
  const dpoyCandidates = defensive.map((entity) => ({
    ...entity,
    score: defensiveOutput(game.players[entity.entityId] ?? ({
      stats: entity.stats,
    } as Player)) + entity.ovr * 0.6,
  }));
  const oroyCandidates = offensive.filter((entity) => {
    const player = game.players[entity.entityId];
    return player ? rookie(player, seasonYear) : false;
  });
  const droyCandidates = defensive.filter((entity) => {
    const player = game.players[entity.entityId];
    return player ? rookie(player, seasonYear) : false;
  });
  const comebackCandidates = entities
    .map((entity) => {
      const player = game.players[entity.entityId];
      if (!player) return null;
      const baseline = player.careerStats.previousSeasonOvr ?? player.ovr;
      const current = player.careerStats.seasonStartOvr ?? player.ovr;
      const delta = current - baseline;
      const eligible = delta > 0 && (player.injury !== null || delta >= 2);
      return eligible ? { ...entity, score: delta * 12 + player.ovr } : null;
    })
    .filter((entity): entity is AwardEntity => entity !== null);
  const coachCandidates = Object.values(game.teams).map((team) => createCoachEntity(game, team));

  const firstTeam = allProTeam(entities, ALL_PRO_SLOTS);
  const secondTeam = allProTeam(entities, ALL_PRO_SLOTS, new Set(firstTeam.map((entry) => entry.entityId)));
  const proBowl = allProTeam(entities, PRO_BOWL_SLOTS);

  const awards: AwardResult[] = [
    buildAwardResult('mvp', 'MVP', withFallback(mvpCandidates, offensive), 'The league MVP race ended with one player separating from the pack.'),
    buildAwardResult('opoy', 'Offensive Player of the Year', withFallback(opoyCandidates, offensive), 'The most explosive offensive season on the board gets the nod.'),
    buildAwardResult('dpoy', 'Defensive Player of the Year', withFallback(dpoyCandidates, defensive), 'No defender changed games more consistently this season.'),
    buildAwardResult('oroy', 'Offensive Rookie of the Year', withFallback(oroyCandidates, offensive), 'A first-year offensive star announced himself immediately.'),
    buildAwardResult('droy', 'Defensive Rookie of the Year', withFallback(droyCandidates, defensive), 'A rookie defender made veteran-level impact right away.'),
    buildAwardResult('comeback_player', 'Comeback Player of the Year', withFallback(comebackCandidates, offensive), 'One season turnaround stood above the rest.'),
    buildAwardResult('coach_of_year', 'Coach of the Year', coachCandidates, 'The sharpest sideline turnaround gets recognized here.'),
    {
      awardId: 'all_pro_first_team',
      label: 'All-Pro First Team',
      winnerId: firstTeam[0]!.entityId,
      winnerName: firstTeam[0]!.name,
      winnerTeamId: firstTeam[0]!.teamId,
      winnerTeam: firstTeam[0]!.teamName,
      winnerPosition: firstTeam[0]!.position,
      winnerStats: firstTeam[0]!.stats,
      score: Math.round(firstTeam[0]!.score * 100) / 100,
      runnersUp: firstTeam.map(toNominee),
      narrative: 'The league’s premier lineup crystallized around its most dominant seasons.',
    },
    {
      awardId: 'all_pro_second_team',
      label: 'All-Pro Second Team',
      winnerId: secondTeam[0]!.entityId,
      winnerName: secondTeam[0]!.name,
      winnerTeamId: secondTeam[0]!.teamId,
      winnerTeam: secondTeam[0]!.teamName,
      winnerPosition: secondTeam[0]!.position,
      winnerStats: secondTeam[0]!.stats,
      score: Math.round(secondTeam[0]!.score * 100) / 100,
      runnersUp: secondTeam.map(toNominee),
      narrative: 'The second team honors the depth of star power across the league.',
    },
    {
      awardId: 'pro_bowl',
      label: 'Pro Bowl',
      winnerId: proBowl[0]!.entityId,
      winnerName: proBowl[0]!.name,
      winnerTeamId: proBowl[0]!.teamId,
      winnerTeam: proBowl[0]!.teamName,
      winnerPosition: proBowl[0]!.position,
      winnerStats: proBowl[0]!.stats,
      score: Math.round(proBowl[0]!.score * 100) / 100,
      runnersUp: proBowl.map(toNominee),
      narrative: 'The league showcase roster reflects the stars fans felt all year.',
    },
  ];

  mutateCareerAwards(game, awards);

  const entry: AwardsHistoryEntry = {
    year: seasonYear,
    awards,
    ceremony: {
      headline: `${seasonYear} Awards Night`,
      intro: 'The season closes with its defining stars stepping into the spotlight.',
      blurbs: awards.map((award) => `${award.label}: ${award.winnerName} (${award.winnerTeam})`),
    },
  };

  game.awardsHistory = [
    ...game.awardsHistory.filter((existing) => existing.year !== seasonYear),
    entry,
  ].sort((a, b) => a.year - b.year);

  return entry;
}
