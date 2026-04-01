import type { GameDayPackage, NarrativeState, Player, SeasonPhase, StoryArc, Team, WeeklySummary } from '@mfd/engine';

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
