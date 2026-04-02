import type {
  ConditionalPick,
  GameDayPackage,
  GameEvent,
  Handshake,
  NarrativeState,
  OffFieldEvent,
  Player,
  PressConference,
  RivalryGameContext,
  SeasonPhase,
  StoryArc,
  Team,
  WaiverWireEntry,
  WeatherCondition,
  WeeklySummary,
} from '@mfd/engine';

export type MessageType = 'URGENT' | 'DECISION' | 'INTEL';

export interface InboxMessage {
  id: string;
  type: MessageType;
  title: string;
  body: string;
  from: string;
  week: number;
  read: boolean;
  actionRequired: boolean;
  consequences?: { id: string; label: string; delta: string; direction: 'positive' | 'negative' | 'neutral' | 'warning' }[];
}

interface BuildInboxMessagesParams {
  team: Team | null;
  roster: Player[];
  week: number;
  narrative: NarrativeState | null;
  latestSummary: WeeklySummary | null;
  phase: SeasonPhase;
  latestPackage: GameDayPackage | null;
  activeArcs: StoryArc[];
  offFieldEvents: OffFieldEvent[];
  recentPressConferences: PressConference[];
  coachingNews: GameEvent[];
  upcomingRivalry: RivalryGameContext | null;
  handshakes: Handshake[];
  conditionalPicks: ConditionalPick[];
  waiverWire: WaiverWireEntry[];
  weather: WeatherCondition | null;
}

export function buildInboxMessages(params: BuildInboxMessagesParams): InboxMessage[] {
  const {
    team,
    roster,
    week,
    narrative,
    latestSummary,
    phase,
    latestPackage,
    activeArcs,
    offFieldEvents,
    recentPressConferences,
    coachingNews,
    upcomingRivalry,
    handshakes,
    conditionalPicks,
    waiverWire,
    weather,
  } = params;
  const msgs: InboxMessage[] = [];
  if (!team) return msgs;

  if (latestPackage) {
    msgs.push({
      id: `gameday-${latestPackage.id}`,
      type: latestPackage.result === 'loss' ? 'URGENT' : 'INTEL',
      title: latestPackage.headline,
      body: `${latestPackage.autopsy.diagnosis}\n${latestPackage.autopsy.leverage}\nFocus: ${latestPackage.autopsy.nextFocus.join(' | ')}`,
      from: 'Game Day Center',
      week: latestPackage.week,
      read: false,
      actionRequired: latestPackage.result === 'loss',
    });
  } else if (latestSummary) {
    msgs.push({
      id: `weekly-summary-${latestSummary.id}`,
      type: latestSummary.result === 'loss' ? 'URGENT' : 'INTEL',
      title: latestSummary.headline,
      body: `Record: ${latestSummary.record}\nOwner delta: ${latestSummary.ownerDelta}\nNotes: ${latestSummary.notes.join(' | ')}`,
      from: 'League Ops',
      week: latestSummary.week,
      read: false,
      actionRequired: latestSummary.result === 'loss',
    });
  }

  for (const arc of activeArcs.slice(0, 2)) {
    msgs.push({
      id: `arc-${arc.id}`,
      type: arc.template === 'hot_seat' || arc.template === 'injury_crisis' ? 'URGENT' : 'DECISION',
      title: arc.title,
      body: arc.summary,
      from: 'Narrative Desk',
      week,
      read: false,
      actionRequired: arc.template !== 'breakout_player',
    });
  }

  for (const event of offFieldEvents.slice(-2).reverse()) {
    msgs.push({
      id: `off-field-${event.id}`,
      type: event.effects.some((effect) => effect.delta < 0) ? 'URGENT' : 'INTEL',
      title: event.headline,
      body: `${event.description}${event.effects.length > 0 ? `\nEffects: ${event.effects.map((effect) => effect.summary).join(' | ')}` : ''}`,
      from: event.category === 'media' ? 'Media Desk' : event.category === 'locker_room' ? 'Locker Room' : 'Player Services',
      week: event.week,
      read: false,
      actionRequired: false,
    });
  }

  for (const handshake of handshakes.filter((entry) => entry.teamId === team.id && (entry.status === 'broken' || entry.status === 'fulfilled')).slice(0, 3)) {
    msgs.push({
      id: `handshake-${handshake.id}`,
      type: handshake.status === 'broken' ? 'URGENT' : 'INTEL',
      title: handshake.status === 'broken' ? 'Promise Broken' : 'Promise Fulfilled',
      body: `${handshake.promiseText}\nStatus: ${handshake.status}\n${handshake.consequence ?? 'Trust ledger updated.'}`,
      from: handshake.type === 'owner' ? 'Owner Suite' : handshake.type === 'player' ? 'Locker Room' : 'Media Desk',
      week,
      read: false,
      actionRequired: handshake.status === 'broken',
    });
  }

  for (const conference of recentPressConferences.slice(0, 2)) {
    msgs.push({
      id: `press-${conference.id}`,
      type: conference.type === 'coaching_change' ? 'DECISION' : 'INTEL',
      title: conference.headline,
      body: `${conference.opener}\n${conference.reporterQuestions.slice(0, 2).map((question) => `Q: ${question.prompt}`).join('\n')}`,
      from: `${conference.speaker} // Press Conference`,
      week: conference.week,
      read: true,
      actionRequired: false,
    });
  }

  for (const item of coachingNews.slice(0, 2)) {
    msgs.push({
      id: `coach-news-${item.id}`,
      type: item.type === 'coach_fired' ? 'URGENT' : 'INTEL',
      title: item.description,
      body: 'League-wide coaching movement is reshaping the sideline landscape.',
      from: 'League Office',
      week,
      read: false,
      actionRequired: false,
    });
  }

  if (upcomingRivalry) {
    msgs.push({
      id: `rivalry-${upcomingRivalry.rivalryId}`,
      type: upcomingRivalry.intensity >= 60 ? 'URGENT' : 'DECISION',
      title: 'Rivalry Week Building',
      body: `${upcomingRivalry.headline}\nIntensity ${upcomingRivalry.intensity} // Tier ${upcomingRivalry.tier.replace('_', ' ')}.`,
      from: 'Broadcast Prep',
      week,
      read: false,
      actionRequired: false,
    });
  }

  const teamCompPicks = team.draftPicks.filter((pick) => pick.isCompPick).slice(0, 3);
  if (teamCompPicks.length > 0) {
    msgs.push({
      id: 'comp-picks',
      type: 'INTEL',
      title: 'Comp Picks Awarded',
      body: teamCompPicks.map((pick) => `Round ${pick.round} compensation pick added to your board.`).join('\n'),
      from: 'League Office',
      week,
      read: false,
      actionRequired: false,
    });
  }

  const teamConditionalPicks = conditionalPicks.filter((pick) => pick.toTeamId === team.id && pick.resolved);
  if (teamConditionalPicks.length > 0) {
    msgs.push({
      id: 'conditional-picks',
      type: 'INTEL',
      title: 'Conditional Picks Resolved',
      body: teamConditionalPicks.map((pick) =>
        `${pick.description}: now round ${pick.resolvedPick?.round ?? pick.basePick.round}.`).join('\n'),
      from: 'Trade Desk',
      week,
      read: false,
      actionRequired: false,
    });
  }

  if (waiverWire.length > 0) {
    msgs.push({
      id: 'waiver-wire',
      type: 'DECISION',
      title: 'Waiver Wire Update',
      body: `${waiverWire.length} player(s) are on waivers.\n${waiverWire.slice(0, 3).map((entry) => entry.playerId).join(' | ')}`,
      from: 'Personnel',
      week,
      read: false,
      actionRequired: false,
    });
  }

  if (weather === 'snow' || weather === 'wind') {
    msgs.push({
      id: 'weather-alert',
      type: 'INTEL',
      title: 'Weather Advisory',
      body: weather === 'snow'
        ? 'Snow is in the forecast. Expect lower passing efficiency and a higher fumble risk.'
        : 'Heavy wind is in the forecast. Long field goals and deep passing will be volatile.',
      from: 'Game Operations',
      week,
      read: false,
      actionRequired: false,
    });
  }

  if (team.owner.approval < 40) {
    msgs.push({
      id: 'owner-unhappy',
      type: 'URGENT',
      title: 'Owner Demands Improvement',
      body: `Owner approval has dropped to ${team.owner.approval}. Results must improve soon or there will be consequences.`,
      from: 'Front Office',
      week,
      read: false,
      actionRequired: true,
      consequences: [{ id: 'c1', label: 'Job Security', delta: 'At Risk', direction: 'negative' }],
    });
  }

  for (const player of roster.filter((candidate) => candidate.holdout)) {
    msgs.push({
      id: `holdout-${player.id}`,
      type: 'URGENT',
      title: `${player.name} Holdout`,
      body: `${player.name} is holding out for a new contract. Morale is dropping.`,
      from: 'Agent Relations',
      week,
      read: false,
      actionRequired: true,
      consequences: [{ id: `h1-${player.id}`, label: 'Team Morale', delta: '-5 per week', direction: 'warning' }],
    });
  }

  const tradeBlockPlayers = roster.filter((player) => player.tradeBlock);
  if (tradeBlockPlayers.length > 0) {
    msgs.push({
      id: 'trade-block',
      type: 'DECISION',
      title: `${tradeBlockPlayers.length} Player(s) on Trade Block`,
      body: `Players on the block: ${tradeBlockPlayers.map((player) => player.name).join(', ')}. Watch for incoming offers.`,
      from: 'Trade Desk',
      week,
      read: false,
      actionRequired: false,
    });
  }

  const injured = roster.filter((player) => player.injury);
  if (injured.length > 0) {
    msgs.push({
      id: 'injury-report',
      type: 'INTEL',
      title: `${injured.length} Player(s) Injured`,
      body: injured.map((player) => `${player.name} (${player.pos}): ${player.injury!.type} — ${player.injury!.severity}, ${player.injury!.gamesOut} games`).join('\n'),
      from: 'Medical Staff',
      week,
      read: true,
      actionRequired: false,
    });
  }

  if (!latestPackage && activeArcs.length === 0 && narrative?.recentHeadlines) {
    for (let i = 0; i < narrative.recentHeadlines.length; i++) {
      msgs.push({
        id: `headline-${i}`,
        type: 'INTEL',
        title: narrative.recentHeadlines[i]!,
        body: 'League-wide news from around the football world.',
        from: 'Media',
        week,
        read: true,
        actionRequired: false,
      });
    }
  }

  if (team.capSpace < 10 && team.capSpace >= 0) {
    msgs.push({
      id: 'cap-tight',
      type: 'DECISION',
      title: 'Cap Space Running Low',
      body: `Only $${Math.round(team.capSpace * 10) / 10}M in cap space remaining. Consider restructuring contracts.`,
      from: 'Finance',
      week,
      read: false,
      actionRequired: true,
    });
  }

  if (phase === 'playoffs') {
    msgs.push({
      id: 'playoff-phase',
      type: 'DECISION',
      title: 'Playoff Football Activated',
      body: 'Bracket play is live. Every week is elimination football until a champion is crowned.',
      from: 'League Office',
      week,
      read: false,
      actionRequired: false,
    });
  }

  return msgs;
}
