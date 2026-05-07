type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

export type ChipDecisionSurface =
  | 'trade'
  | 'contract'
  | 'cap'
  | 'depth-chart'
  | 'game-plan'
  | 'week-advance';

export type ChipImpactSeverity = 'low' | 'medium' | 'high';

export interface BuildDecisionImpactInput {
  surface: ChipDecisionSurface;
  label: string;
  valueDelta?: number;
  capDelta?: number;
  futureCapDelta?: number;
  chemistryDelta?: number;
  ownerDelta?: number;
  issueCount?: number;
  difficulty?: string | null;
}

export interface ChipImpactExplanation {
  surface: ChipDecisionSurface;
  label: string;
  headline: string;
  immediateImpact: string;
  thisSeasonImpact: string;
  futureImpact: string;
  risk: string;
  severity: ChipImpactSeverity;
}

export interface ChipImpactConsequenceItem {
  id: string;
  label: 'Immediate' | 'This season' | 'Future' | 'Risk';
  delta: string;
  accent: PixelAccent;
}

function money(value: number): string {
  return `$${Math.abs(Math.round(value))}M`;
}

function signedValue(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isHardDifficulty(difficulty: string | null | undefined): boolean {
  return difficulty === 'hard' || difficulty === 'expert';
}

function severityFrom(input: BuildDecisionImpactInput): ChipImpactSeverity {
  const pressure =
    Math.abs(signedValue(input.capDelta)) * 0.5
    + Math.abs(signedValue(input.futureCapDelta)) * 0.5
    + Math.abs(signedValue(input.valueDelta)) * 0.5
    + Math.abs(signedValue(input.chemistryDelta) * 2)
    + Math.abs(signedValue(input.ownerDelta) * 2)
    + Math.max(0, Math.trunc(signedValue(input.issueCount)) * 6);
  const adjusted = isHardDifficulty(input.difficulty) ? pressure * 1.2 : pressure;
  if (adjusted >= 18) return 'high';
  if (adjusted >= 8) return 'medium';
  return 'low';
}

function tradeImpact(input: BuildDecisionImpactInput, severity: ChipImpactSeverity): ChipImpactExplanation {
  const valueDelta = signedValue(input.valueDelta);
  const capDelta = signedValue(input.capDelta);

  return {
    surface: 'trade',
    label: input.label,
    headline: 'Trade impact',
    immediateImpact: valueDelta > 0 ? `Adds roster value now (+${valueDelta}).` : 'Changes the roster immediately.',
    thisSeasonImpact: 'Improves the Sunday solution, but the room has to absorb the change.',
    futureImpact: capDelta < 0 ? `Costs ${money(capDelta)} of future flexibility.` : 'Keeps the future bill manageable.',
    risk: isHardDifficulty(input.difficulty)
      ? 'Hard difficulty makes chemistry and cap mistakes harder to hide.'
      : 'The risk is paying for a short-term answer that does not fit the window.',
    severity,
  };
}

function contractImpact(input: BuildDecisionImpactInput, severity: ChipImpactSeverity): ChipImpactExplanation {
  const capDelta = signedValue(input.capDelta);
  const futureCapDelta = signedValue(input.futureCapDelta);

  return {
    surface: input.surface,
    label: input.label,
    headline: 'Contract impact',
    immediateImpact: capDelta > 0 ? `Creates ${money(capDelta)} of room today.` : 'Changes the live cap sheet today.',
    thisSeasonImpact: 'Creates flexibility for injuries, extensions, or a deadline move.',
    futureImpact: futureCapDelta < 0 ? `Pushes ${money(futureCapDelta)} onto future ledgers.` : 'Avoids a major future acceleration.',
    risk: 'Smart if the window is open; dangerous if this is just panic room.',
    severity,
  };
}

function weekAdvanceImpact(input: BuildDecisionImpactInput, severity: ChipImpactSeverity): ChipImpactExplanation {
  const issueCount = Math.max(0, Math.trunc(signedValue(input.issueCount)));

  return {
    surface: 'week-advance',
    label: input.label,
    headline: 'Advance impact',
    immediateImpact: issueCount > 0 ? `${issueCount} open checks travel into the sim.` : 'The week advances with no checklist blockers.',
    thisSeasonImpact: 'The result updates record, owner patience, chemistry, injuries, and the next set of decisions.',
    futureImpact: 'Repeated neglected checks become roster, cap, and morale trends.',
    risk: issueCount > 0
      ? 'You can advance anyway, but the sim will judge the unchecked work.'
      : 'The risk is mistaking one clean checklist for a solved season.',
    severity,
  };
}

function fallbackImpact(input: BuildDecisionImpactInput, severity: ChipImpactSeverity): ChipImpactExplanation {
  return {
    surface: input.surface,
    label: input.label,
    headline: 'Decision impact',
    immediateImpact: 'Changes the next football state.',
    thisSeasonImpact: 'Can move weekly performance, trust, or roster stability.',
    futureImpact: 'May change the next set of available options.',
    risk: 'The risk is making the move without reading the tradeoff.',
    severity,
  };
}

export function buildDecisionImpactExplanation(input: BuildDecisionImpactInput): ChipImpactExplanation {
  const severity = severityFrom(input);
  if (input.surface === 'trade') return tradeImpact(input, severity);
  if (input.surface === 'contract' || input.surface === 'cap') return contractImpact(input, severity);
  if (input.surface === 'week-advance') return weekAdvanceImpact(input, severity);
  return fallbackImpact(input, severity);
}

export function decisionImpactToConsequenceItems(explanation: ChipImpactExplanation): ChipImpactConsequenceItem[] {
  const riskAccent: PixelAccent = explanation.severity === 'high' ? 'red' : explanation.severity === 'medium' ? 'gold' : 'cyan';

  return [
    { id: `${explanation.surface}-immediate`, label: 'Immediate', delta: explanation.immediateImpact, accent: 'green' },
    { id: `${explanation.surface}-season`, label: 'This season', delta: explanation.thisSeasonImpact, accent: 'cyan' },
    { id: `${explanation.surface}-future`, label: 'Future', delta: explanation.futureImpact, accent: 'gold' },
    { id: `${explanation.surface}-risk`, label: 'Risk', delta: explanation.risk, accent: riskAccent },
  ];
}
