type PixelAccent = 'default' | 'green' | 'gold' | 'red' | 'cyan';

export type DecisionImpactSurface =
  | 'week-advance'
  | 'trade'
  | 'cap-lab'
  | 'game-plan'
  | 'roster';

export type DecisionImpactSeverity = 'low' | 'medium' | 'high';

export interface DecisionImpactInput {
  surface: DecisionImpactSurface;
  label: string;
  issueCount?: number;
  difficulty?: string;
  outgoingAssets?: number;
  incomingAssets?: number;
  valueDelta?: number;
  queuedMoves?: number;
  netCapChange?: number;
  deadCapPct?: number;
}

export interface DecisionImpactExplanation {
  surface: DecisionImpactSurface;
  label: string;
  severity: DecisionImpactSeverity;
  immediateImpact: string;
  thisSeasonImpact: string;
  futureImpact: string;
  risk: string;
}

function difficultyRisk(difficulty: string | undefined, fallback: string): string {
  const normalized = difficulty?.toLowerCase();
  if (normalized === 'hard' || normalized === 'allpro' || normalized === 'all-pro' || normalized === 'legend') {
    return `Higher difficulty makes injuries, morale swings, and matchup misses less forgiving. ${fallback}`;
  }
  return fallback;
}

export function buildDecisionImpactExplanation(input: DecisionImpactInput): DecisionImpactExplanation {
  switch (input.surface) {
    case 'week-advance': {
      const issueCount = Math.max(0, Math.trunc(input.issueCount ?? 0));
      const severity: DecisionImpactSeverity = issueCount >= 2 ? 'high' : issueCount === 1 ? 'medium' : 'low';
      const itemLabel = issueCount === 1 ? 'listed Advance Week item' : 'listed Advance Week items';
      return {
        surface: input.surface,
        label: input.label,
        severity,
        immediateImpact: issueCount > 0
          ? `Must Do: fix ${issueCount} ${itemLabel} before Advance Week or choose to accept each one. The next game uses the saved injury status, first backups, cap choices, and matchup calls.`
          : 'Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth chart, training, Game Plan, contracts, Cap Lab, trades, waivers, practice squad, free agency, scouting, coaching, facility, or medical. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.',
        thisSeasonImpact: 'After Advance Week, owner patience, morale, standings, and injury reports update from the result.',
        futureImpact: 'Advancing with listed items unchanged stacks injury-report chances, morale loss, standings damage, and lower owner patience.',
        risk: difficultyRisk(input.difficulty, 'If you skip Roster, Depth Chart, Contracts, or Game Plan before locking the week, an injury flag, unassigned first backup, tight cap choice, or uncovered matchup call becomes the saved game result.'),
      };
    }
    case 'trade': {
      const outgoing = Math.max(0, Math.trunc(input.outgoingAssets ?? 0));
      const incoming = Math.max(0, Math.trunc(input.incomingAssets ?? 0));
      const valueDelta = input.valueDelta ?? 0;
      const severity: DecisionImpactSeverity = Math.abs(valueDelta) >= 5 || outgoing >= 3 ? 'high' : outgoing > 0 || incoming > 0 ? 'medium' : 'low';
      return {
        surface: input.surface,
        label: input.label,
        severity,
        immediateImpact: `This posts now: send ${outgoing} assets, receive ${incoming}, then open Depth Chart before Advance Week.`,
        thisSeasonImpact: 'Depth chart order, morale, and role assignments change immediately when the deal posts; set the lineup before Advance Week.',
        futureImpact: 'Lost picks or added contracts block draft replacements, extensions, or later trades.',
        risk: valueDelta < 0
          ? 'Pay that price for a starter or first-backup deadline fix; otherwise keep the picks, players, and cap space.'
          : 'If the new player has no saved role, even a discounted trade removes depth from another backup group.',
      };
    }
    case 'cap-lab': {
      const queuedMoves = Math.max(0, Math.trunc(input.queuedMoves ?? 0));
      const deadCapPct = Math.max(0, Math.trunc(input.deadCapPct ?? 0));
      const severity: DecisionImpactSeverity = deadCapPct > 20 || queuedMoves >= 3 ? 'high' : queuedMoves > 0 ? 'medium' : 'low';
      return {
        surface: input.surface,
        label: input.label,
        severity,
        immediateImpact: queuedMoves > 0
          ? `${queuedMoves} queued cap moves change today's cap space by ${input.netCapChange?.toFixed(1) ?? '0.0'}M when applied.`
          : 'No queued cap move has changed the saved roster or cap space yet.',
        thisSeasonImpact: 'Cap space decides whether injury replacements and late-season roster fixes are available.',
        futureImpact: "Dead money and pushed charges reduce cap space for next spring's extensions, injuries, and free agents.",
        risk: deadCapPct > 15
          ? 'If dead money keeps rising, applied moves remove cap space for injury replacements and extensions.'
          : 'If the cap space does not protect a starter, first backup, injury replacement, or extension before Advance Week, leave the preview unapplied.',
      };
    }
    case 'game-plan':
      return {
        surface: input.surface,
        label: input.label,
        severity: 'medium',
        immediateImpact: 'Recommended: set this week\'s offensive approach and defensive answers before Advance Week if the matchup changed.',
        thisSeasonImpact: 'Fix repeated plan misses before close matchups become preventable losses.',
        futureImpact: 'If the same miss repeats, fix the matching cause: protection, route timing, run-defense assignments, coverage depth, or pass rush; a fix aimed at the unused cause wastes roster moves or practice reps.',
        risk: 'If the plan does not answer the opponent pass rush, coverage stress, run game, and your available starters, missed protection turns into sacks, uncovered receivers get easy throws, and backup snaps arrive without help.',
      };
    case 'roster':
      return {
        surface: input.surface,
        label: input.label,
        severity: 'medium',
        immediateImpact: 'Recommended: open Roster and Depth Chart before Advance Week if injuries, fatigue, or roles changed.',
        thisSeasonImpact: 'Backup groups with too few playable players turn one injury into multiple lineup losses.',
        futureImpact: 'Aging starters, expiring contracts, and crowded roles show which draft, trade, or free-agent move is needed next.',
        risk: 'If opponent protection, coverage, or first-backup order is missing, the next game exposes an uncovered backup job after Advance Week.',
      };
  }
}

function severityAccent(severity: DecisionImpactSeverity): PixelAccent {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'gold';
  return 'cyan';
}

export function decisionImpactToConsequenceItems(impact: DecisionImpactExplanation): Array<{
  id: string;
  label: string;
  delta: string;
  accent: PixelAccent;
}> {
  const accent = severityAccent(impact.severity);
  return [
    { id: `${impact.surface}-immediate`, label: 'Now', delta: impact.immediateImpact, accent },
    { id: `${impact.surface}-season`, label: 'This season', delta: impact.thisSeasonImpact, accent: impact.severity === 'high' ? 'red' : 'gold' },
    { id: `${impact.surface}-future`, label: 'Future', delta: impact.futureImpact, accent: 'cyan' },
    { id: `${impact.surface}-risk`, label: 'If ignored', delta: impact.risk, accent },
  ];
}
