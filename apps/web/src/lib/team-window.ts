import type { DraftPick, FranchiseHistoryEntry, Player, Team, TeamNeedsReport } from '@mfd/engine';

/*
 * Team Window v1 deterministic rubric
 *
 * This is a web read-model only. It explains a CPU club's likely competitive
 * window from already-saved/derived inputs and never feeds AI behavior.
 *
 * Signals are scored into four buckets:
 * - ALL_IN: strong roster plus age pressure, tight cap space, or thin near picks.
 * - CONTEND: strong QB/core, winning record/history, and contend posture without
 *   urgent age/pick pressure.
 * - RETOOL: usable young core, neutral posture, or flexible cap space with
 *   mixed roster quality.
 * - REBUILD: rebuild/fire-sale posture, weak QB/core, poor results, or heavy
 *   early-pick inventory.
 *
 * Confidence is "mixed" when top signals conflict or the score margin is close.
 * Drivers are the highest-signal receipts behind the chosen phase, capped at 4.
 */

export type TeamWindowPhase = 'ALL_IN' | 'CONTEND' | 'RETOOL' | 'REBUILD';
export type TeamWindowConfidence = 'clear' | 'mixed';

export interface TeamWindowDriver {
  label: string;
  detail: string;
}

export interface TeamWindow {
  phase: TeamWindowPhase;
  confidence: TeamWindowConfidence;
  drivers: TeamWindowDriver[];
  sourceRefs: string[];
}

export interface TeamWindowPlayerInput {
  id: string;
  name?: string | null;
  pos: Player['pos'];
  age: number;
  ovr: number;
  isStarter?: boolean | null;
}

export interface TeamWindowDraftPickInput {
  round: number;
  year: number;
  currentTeamId?: string | null;
}

export interface TeamWindowHistoryInput {
  year: number;
  teamId: string;
  wins: number;
  losses: number;
  ties?: number;
  playoffFinish?: string | null;
}

export interface TeamWindowInput {
  teamId: string;
  currentYear?: number | null;
  roster?: readonly TeamWindowPlayerInput[];
  draftPicks?: readonly TeamWindowDraftPickInput[];
  capSpace?: number | null;
  capUsed?: number | null;
  deadCap?: number | null;
  gmStrategy?: string | null;
  philosophy?: string | null;
  wins?: number | null;
  losses?: number | null;
  ties?: number | null;
  teamNeeds?: Pick<TeamNeedsReport, 'capFlexibility' | 'criticalNeeds'> | null;
  franchiseHistory?: readonly TeamWindowHistoryInput[];
}

interface WindowSignal {
  phase: TeamWindowPhase;
  weight: number;
  label: string;
  detail: string;
  sourceRef: string;
  order: number;
}

const PHASE_ORDER: TeamWindowPhase[] = ['ALL_IN', 'CONTEND', 'RETOOL', 'REBUILD'];
const MAX_DRIVERS = 4;

function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function capFlexLabel(input: TeamWindowInput): string {
  return input.teamNeeds?.capFlexibility ?? 'unknown flexibility';
}

function source(teamId: string, part: string): string {
  return `team:${teamId}:${part}`;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function round(value: number): number {
  return Math.round(value);
}

function labelFromId(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function startersFromRoster(roster: readonly TeamWindowPlayerInput[]): TeamWindowPlayerInput[] {
  const marked = roster.filter((player) => player.isStarter);
  const pool = marked.length > 0 ? marked : [...roster]
    .filter((player) => player.pos !== 'K' && player.pos !== 'P')
    .sort((a, b) => b.ovr - a.ovr || a.age - b.age || a.id.localeCompare(b.id))
    .slice(0, 22);
  return [...pool].sort((a, b) =>
    (a.pos === 'QB' ? -1 : b.pos === 'QB' ? 1 : 0)
    || b.ovr - a.ovr
    || a.age - b.age
    || a.id.localeCompare(b.id),
  );
}

function topQuarterback(roster: readonly TeamWindowPlayerInput[]): TeamWindowPlayerInput | null {
  return [...roster]
    .filter((player) => player.pos === 'QB')
    .sort((a, b) => Number(Boolean(b.isStarter)) - Number(Boolean(a.isStarter)) || b.ovr - a.ovr || a.age - b.age || a.id.localeCompare(b.id))[0] ?? null;
}

function avgOvr(players: readonly TeamWindowPlayerInput[]): number | null {
  if (players.length === 0) return null;
  return players.reduce((sum, player) => sum + player.ovr, 0) / players.length;
}

function nextDraftYears(input: TeamWindowInput): { start: number; end: number } | null {
  if (finite(input.currentYear)) return { start: input.currentYear + 1, end: input.currentYear + 2 };
  const firstYear = [...(input.draftPicks ?? [])]
    .map((pick) => pick.year)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  return typeof firstYear === 'number' ? { start: firstYear, end: firstYear + 1 } : null;
}

function playoffSignal(entry: TeamWindowHistoryInput): boolean {
  const finish = (entry.playoffFinish ?? '').toLowerCase();
  return finish.length > 0 && !['missed', 'none', 'no playoffs'].includes(finish);
}

function latestHistory(input: TeamWindowInput): TeamWindowHistoryInput[] {
  return [...(input.franchiseHistory ?? [])]
    .filter((entry) => entry.teamId === input.teamId)
    .sort((a, b) => b.year - a.year)
    .slice(0, 2);
}

function addSignal(signals: WindowSignal[], signal: Omit<WindowSignal, 'order'>): void {
  signals.push({ ...signal, order: signals.length });
}

function postureSignals(input: TeamWindowInput, signals: WindowSignal[]): void {
  const strategy = input.gmStrategy ?? 'neutral';
  const philosophy = input.philosophy ?? 'maintain';
  const detail = `${labelFromId(philosophy)} philosophy / ${labelFromId(strategy)} GM strategy.`;

  if (philosophy === 'fire_sale') {
    addSignal(signals, {
      phase: 'REBUILD',
      weight: 5,
      label: 'Front-office sell signal',
      detail: `${detail} Fire-sale posture points toward picks and cap space.`,
      sourceRef: source(input.teamId, 'philosophy'),
    });
    return;
  }

  if (philosophy === 'rebuild' || strategy === 'rebuild') {
    addSignal(signals, {
      phase: 'REBUILD',
      weight: 4,
      label: 'Rebuild posture',
      detail: `${detail} Current posture favors youth and future assets.`,
      sourceRef: source(input.teamId, 'gmStrategy'),
    });
    return;
  }

  if (philosophy === 'contend' || strategy === 'contend') {
    addSignal(signals, {
      phase: 'CONTEND',
      weight: 3,
      label: 'Contend posture',
      detail: `${detail} Front office is signaling a current-window push.`,
      sourceRef: source(input.teamId, 'gmStrategy'),
    });
    return;
  }

  addSignal(signals, {
    phase: 'RETOOL',
    weight: 1,
    label: 'Balanced posture',
    detail: `${detail} No saved posture forces a buy-or-sell lane.`,
    sourceRef: source(input.teamId, 'gmStrategy'),
  });
}

function rosterSignals(input: TeamWindowInput, signals: WindowSignal[]): void {
  const roster = input.roster ?? [];
  if (roster.length === 0) {
    addSignal(signals, {
      phase: 'RETOOL',
      weight: 1,
      label: 'Sparse roster read',
      detail: 'Roster inputs are missing, so the window stays conservative.',
      sourceRef: source(input.teamId, 'roster-missing'),
    });
    return;
  }

  const starters = startersFromRoster(roster);
  const core = starters.filter((player) => player.pos !== 'K' && player.pos !== 'P');
  const coreAverage = avgOvr(core);
  const qb = topQuarterback(roster);
  const starters30Plus = core.filter((player) => player.age >= 30).length;
  const youngStarters = core.filter((player) => player.age <= 26 && player.ovr >= 74).length;
  const sourceRef = source(input.teamId, 'roster');

  if (qb && finite(coreAverage) && qb.ovr >= 84 && coreAverage >= 78 && (qb.age >= 33 || starters30Plus >= 5)) {
    addSignal(signals, {
      phase: 'ALL_IN',
      weight: 5,
      label: 'Aging contender core',
      detail: `QB ${qb.age}, ${starters30Plus} starters 30+, core ${round(coreAverage)} OVR.`,
      sourceRef,
    });
    return;
  }

  if (qb && finite(coreAverage) && qb.ovr >= 84 && coreAverage >= 79) {
    addSignal(signals, {
      phase: 'CONTEND',
      weight: 4,
      label: 'Contender spine',
      detail: `QB ${qb.ovr} OVR, core ${round(coreAverage)} OVR, ${starters30Plus} starters 30+.`,
      sourceRef,
    });
    return;
  }

  if ((qb && qb.ovr < 75) || (finite(coreAverage) && coreAverage < 73)) {
    addSignal(signals, {
      phase: 'REBUILD',
      weight: 4,
      label: 'Roster floor',
      detail: `QB ${qb?.ovr ?? 'missing'} OVR, core ${finite(coreAverage) ? `${round(coreAverage)} OVR` : 'missing'}.`,
      sourceRef,
    });
    return;
  }

  addSignal(signals, {
    phase: 'RETOOL',
    weight: youngStarters >= 5 ? 3 : 2,
    label: 'Retoolable core',
    detail: `${youngStarters} starters 26 or younger, core ${finite(coreAverage) ? `${round(coreAverage)} OVR` : 'unknown'}.`,
    sourceRef,
  });
}

function capSignals(input: TeamWindowInput, signals: WindowSignal[]): void {
  if (!finite(input.capSpace)) return;

  const rosterStrong = signals.some((signal) => signal.phase === 'ALL_IN' || signal.phase === 'CONTEND');
  if (input.capSpace <= 5) {
    addSignal(signals, {
      phase: rosterStrong ? 'ALL_IN' : 'RETOOL',
      weight: 2,
      label: 'Tight cap space',
      detail: `${money(input.capSpace)} cap space with ${capFlexLabel(input)}.`,
      sourceRef: source(input.teamId, 'cap'),
    });
    return;
  }

  if (input.capSpace >= 35) {
    addSignal(signals, {
      phase: input.gmStrategy === 'rebuild' || input.philosophy === 'rebuild' ? 'REBUILD' : 'RETOOL',
      weight: 2,
      label: 'Flexible cap space',
      detail: `${money(input.capSpace)} cap space leaves optionality for bids or extensions.`,
      sourceRef: source(input.teamId, 'cap'),
    });
  }
}

function pickSignals(input: TeamWindowInput, signals: WindowSignal[]): void {
  const draftYears = nextDraftYears(input);
  if (!draftYears) return;

  const picks = [...(input.draftPicks ?? [])]
    .filter((pick) => (pick.currentTeamId === undefined || pick.currentTeamId === null || pick.currentTeamId === input.teamId)
      && pick.year >= draftYears.start
      && pick.year <= draftYears.end);
  if (picks.length === 0) return;

  const firsts = picks.filter((pick) => pick.round === 1).length;
  const topTwo = picks.filter((pick) => pick.round <= 2).length;
  const strongRoster = signals.some((signal) => signal.phase === 'ALL_IN' || signal.phase === 'CONTEND');

  if (firsts >= 3 || topTwo >= 5) {
    addSignal(signals, {
      phase: input.gmStrategy === 'rebuild' || input.philosophy === 'rebuild' ? 'REBUILD' : 'RETOOL',
      weight: 3,
      label: 'Pick inventory',
      detail: `${firsts} firsts and ${topTwo} top-2-round picks in the next two drafts.`,
      sourceRef: source(input.teamId, 'draftPicks'),
    });
    return;
  }

  if (strongRoster && firsts <= 1 && topTwo <= 2) {
    addSignal(signals, {
      phase: 'ALL_IN',
      weight: 2,
      label: 'Thin premium picks',
      detail: `${firsts} first and ${topTwo} top-2-round picks in the next two drafts.`,
      sourceRef: source(input.teamId, 'draftPicks'),
    });
  }
}

function resultSignals(input: TeamWindowInput, signals: WindowSignal[]): void {
  if (finite(input.wins) && finite(input.losses)) {
    const games = input.wins + input.losses + (input.ties ?? 0);
    if (games >= 6) {
      if (input.wins >= 10 || input.wins / games >= 0.65) {
        addSignal(signals, {
          phase: 'CONTEND',
          weight: 3,
          label: 'Current results',
          detail: `${input.wins}-${input.losses}${input.ties ? `-${input.ties}` : ''} record keeps the club in the race.`,
          sourceRef: source(input.teamId, 'record'),
        });
      } else if (input.wins <= 4 && input.losses >= 6) {
        addSignal(signals, {
          phase: 'REBUILD',
          weight: 2,
          label: 'Current results',
          detail: `${input.wins}-${input.losses}${input.ties ? `-${input.ties}` : ''} record points away from buying.`,
          sourceRef: source(input.teamId, 'record'),
        });
      }
    }
  }

  const history = latestHistory(input);
  if (history.length === 0) return;
  const avgWins = history.reduce((sum, entry) => sum + entry.wins, 0) / history.length;
  const playoffSeasons = history.filter(playoffSignal).length;
  if (avgWins >= 10 || playoffSeasons > 0) {
    addSignal(signals, {
      phase: 'CONTEND',
      weight: 2,
      label: 'Recent results',
      detail: `${round(avgWins)} average wins over ${history.length} saved season${history.length === 1 ? '' : 's'}, ${playoffSeasons} playoff finish${playoffSeasons === 1 ? '' : 'es'}.`,
      sourceRef: source(input.teamId, 'franchiseHistory'),
    });
  } else if (avgWins <= 5) {
    addSignal(signals, {
      phase: 'REBUILD',
      weight: 2,
      label: 'Recent results',
      detail: `${round(avgWins)} average wins over ${history.length} saved season${history.length === 1 ? '' : 's'}.`,
      sourceRef: source(input.teamId, 'franchiseHistory'),
    });
  }
}

function scoreSignals(signals: readonly WindowSignal[]): Record<TeamWindowPhase, number> {
  return signals.reduce<Record<TeamWindowPhase, number>>((scores, signal) => {
    scores[signal.phase] += signal.weight;
    return scores;
  }, { ALL_IN: 0, CONTEND: 0, RETOOL: 0, REBUILD: 0 });
}

function selectPhase(scores: Record<TeamWindowPhase, number>): TeamWindowPhase {
  return [...PHASE_ORDER].sort((a, b) => scores[b] - scores[a] || PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b))[0] ?? 'RETOOL';
}

function confidenceFor(phase: TeamWindowPhase, scores: Record<TeamWindowPhase, number>): TeamWindowConfidence {
  const ranked = [...PHASE_ORDER].sort((a, b) => scores[b] - scores[a] || PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
  const top = scores[ranked[0] ?? phase] ?? 0;
  const second = scores[ranked[1] ?? phase] ?? 0;
  const winNowScore = Math.max(scores.ALL_IN, scores.CONTEND);
  const resetScore = Math.max(scores.RETOOL, scores.REBUILD);
  const opposed = phase === 'ALL_IN' || phase === 'CONTEND'
    ? resetScore >= 3 && top - resetScore <= 3
    : winNowScore >= 3 && top - winNowScore <= 3;
  return top - second <= 2 || opposed ? 'mixed' : 'clear';
}

function driverSort(a: WindowSignal, b: WindowSignal): number {
  return b.weight - a.weight || a.order - b.order || a.label.localeCompare(b.label);
}

function fallbackDrivers(input: TeamWindowInput): WindowSignal[] {
  return [
    {
      phase: 'RETOOL',
      weight: 1,
      label: 'Sparse inputs',
      detail: 'Missing optional inputs are treated as quiet signals, not errors.',
      sourceRef: source(input.teamId, 'missing-optional-inputs'),
      order: 998,
    },
    {
      phase: 'RETOOL',
      weight: 1,
      label: 'Conservative default',
      detail: 'Window stays retool until saved roster, cap, picks, or results prove a clearer lane.',
      sourceRef: source(input.teamId, 'fallback'),
      order: 999,
    },
  ];
}

function selectDrivers(input: TeamWindowInput, phase: TeamWindowPhase, confidence: TeamWindowConfidence, signals: readonly WindowSignal[]): WindowSignal[] {
  const primary = signals.filter((signal) => signal.phase === phase).sort(driverSort);
  const conflicts = signals.filter((signal) => signal.phase !== phase).sort(driverSort);
  const selected: WindowSignal[] = [];

  for (const signal of primary) {
    selected.push(signal);
    if (selected.length >= (confidence === 'mixed' ? 1 : MAX_DRIVERS)) break;
  }

  if (confidence === 'mixed') {
    for (const signal of conflicts) {
      selected.push(signal);
      if (selected.length >= 2) break;
    }
    for (const signal of primary.slice(1)) {
      selected.push(signal);
      if (selected.length >= MAX_DRIVERS) break;
    }
  }

  for (const signal of [...signals].sort(driverSort)) {
    if (selected.includes(signal)) continue;
    selected.push(signal);
    if (selected.length >= MAX_DRIVERS) break;
  }

  if (selected.length >= 2) return selected.slice(0, MAX_DRIVERS);
  return [...selected, ...fallbackDrivers(input)].slice(0, MAX_DRIVERS);
}

function collectSignals(input: TeamWindowInput): WindowSignal[] {
  const signals: WindowSignal[] = [];
  postureSignals(input, signals);
  rosterSignals(input, signals);
  capSignals(input, signals);
  pickSignals(input, signals);
  resultSignals(input, signals);
  return signals;
}

export function computeTeamWindow(input: TeamWindowInput): TeamWindow {
  const normalized: TeamWindowInput = {
    ...input,
    teamId: input.teamId || 'unknown-team',
  };
  const signals = collectSignals(normalized);
  const scores = scoreSignals(signals);
  const phase = selectPhase(scores);
  const confidence = confidenceFor(phase, scores);
  const selectedDrivers = selectDrivers(normalized, phase, confidence, signals);
  const sourceRefs = [...new Set(selectedDrivers.map((driver) => driver.sourceRef))];

  return {
    phase,
    confidence,
    drivers: selectedDrivers.map(({ label, detail }) => ({ label, detail })),
    sourceRefs,
  };
}

export function buildTeamWindowInput(
  team: Team,
  options: {
    currentYear?: number | null;
    teamNeeds?: TeamNeedsReport | null;
    franchiseHistory?: readonly FranchiseHistoryEntry[];
  } = {},
): TeamWindowInput {
  return {
    teamId: team.id,
    currentYear: options.currentYear,
    roster: (team.roster ?? []).map((player) => ({
      id: player.id,
      name: player.name,
      pos: player.pos,
      age: player.age,
      ovr: player.ovr,
      isStarter: player.isStarter,
    })),
    draftPicks: (team.draftPicks ?? []).map((pick: DraftPick) => ({
      round: pick.round,
      year: pick.year,
      currentTeamId: pick.currentTeamId,
    })),
    capSpace: team.capSpace,
    capUsed: team.capUsed,
    deadCap: team.deadCap,
    gmStrategy: team.gmStrategy,
    philosophy: team.philosophy ?? 'maintain',
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    teamNeeds: options.teamNeeds
      ? {
        capFlexibility: options.teamNeeds.capFlexibility,
        criticalNeeds: options.teamNeeds.criticalNeeds,
      }
      : null,
    franchiseHistory: options.franchiseHistory,
  };
}
