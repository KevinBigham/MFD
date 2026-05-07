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
  if (difficulty?.toLowerCase() === 'hard') {
    return `Hard difficulty gives mistakes less cushion. ${fallback}`;
  }
  return fallback;
}

export function buildDecisionImpactExplanation(input: DecisionImpactInput): DecisionImpactExplanation {
  switch (input.surface) {
    case 'week-advance': {
      const issueCount = Math.max(0, Math.trunc(input.issueCount ?? 0));
      const severity: DecisionImpactSeverity = issueCount >= 2 ? 'high' : issueCount === 1 ? 'medium' : 'low';
      return {
        surface: input.surface,
        label: input.label,
        severity,
        immediateImpact: issueCount > 0
          ? `${issueCount} readiness issues can travel straight into Sunday.`
          : 'Clean checklist means the week can advance without obvious desk fires.',
        thisSeasonImpact: 'The weekly result can shift owner patience, morale, standings, and injury pressure.',
        futureImpact: 'Repeatedly advancing through issues compounds injuries, morale, and standings damage.',
        risk: difficultyRisk(input.difficulty, 'Uncertainty stays real until the sim resolves matchup variance.'),
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
        immediateImpact: `You send ${outgoing} assets and receive ${incoming}; the roster changes the moment the trade posts.`,
        thisSeasonImpact: 'depth, chemistry, and role clarity can move faster than the ratings screen suggests.',
        futureImpact: 'pick and contract costs can follow this franchise into the next team-building window.',
        risk: valueDelta < 0
          ? 'The market is charging you a premium, so be sure the roster hole is urgent.'
          : 'Even a favorable market price can create a new hole if timing is wrong.',
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
          ? `${queuedMoves} queued cap moves change today's room by ${input.netCapChange?.toFixed(1) ?? '0.0'}M.`
          : 'No queued move has hit the live ledger yet.',
        thisSeasonImpact: 'Cap room decides whether injuries and late-season needs can be answered.',
        futureImpact: 'Dead money and pushed charges decide how expensive today feels next spring.',
        risk: deadCapPct > 15
          ? 'Dead-cap pressure is already high; flexibility can disappear quickly.'
          : 'The sandbox lowers risk, but the confirmed move is permanent for this save.',
      };
    }
    case 'game-plan':
      return {
        surface: input.surface,
        label: input.label,
        severity: 'medium',
        immediateImpact: 'The plan changes how your roster attacks this opponent.',
        thisSeasonImpact: 'Repeated plan misses can turn close matchups into pattern losses.',
        futureImpact: 'Plan identity teaches you which roster traits are actually missing.',
        risk: 'Opponent variance still matters, but bad fit makes the variance harsher.',
      };
    case 'roster':
      return {
        surface: input.surface,
        label: input.label,
        severity: 'medium',
        immediateImpact: 'Roster and depth choices decide who takes real snaps this week.',
        thisSeasonImpact: 'Thin rooms become injury problems before they become headlines.',
        futureImpact: 'Age, contract, and role clusters point to the next acquisition window.',
        risk: 'The ratings screen can hide matchup and backup risk until Sunday exposes it.',
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
    { id: `${impact.surface}-immediate`, label: 'Immediate', delta: impact.immediateImpact, accent },
    { id: `${impact.surface}-season`, label: 'This season', delta: impact.thisSeasonImpact, accent: impact.severity === 'high' ? 'red' : 'gold' },
    { id: `${impact.surface}-future`, label: 'Future', delta: impact.futureImpact, accent: 'cyan' },
    { id: `${impact.surface}-risk`, label: 'Risk', delta: impact.risk, accent },
  ];
}
