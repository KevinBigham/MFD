import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSelect,
  PixelSwitch,
} from '@mfd/design-system/components';
import {
  getScoutingReportTemplate,
  interpolateContentPlaceholders,
  type DraftProspect,
  type ProspectScoutingState,
  type Scout,
  type ScoutingAction,
} from '@mfd/engine';
import {
  selectDraftClass,
  selectOffseasonState,
  selectScoutingDepartment,
  selectUserTeamNeeds,
  useGameStore,
} from '../../app/store/game-store';
import {
  CommandCallout,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  screenStackStyle,
} from '../shared/pixelUi';
import { ComparePlayersModal } from '../player/ComparePlayersModal';
import { WatchListPinButton } from '../watch-list/WatchListPinButton';

const REGION_OPTIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'east', label: 'east' },
  { value: 'south', label: 'south' },
  { value: 'midwest', label: 'midwest' },
  { value: 'west', label: 'west' },
];

type ScoutingReceiptAccent = 'cyan' | 'green' | 'gold' | 'red' | 'default';

export interface ScoutingActionReceipt {
  id: string;
  title: string;
  target: string;
  result: string;
  detail: string;
  source: string;
  accent: ScoutingReceiptAccent;
}

type ScoutingActionReceiptInput =
  | { kind: 'hire_scout'; scout: Scout; budgetBefore: number }
  | { kind: 'fire_scout'; scout: Scout; budgetBefore: number }
  | { kind: 'watch'; prospect: DraftProspect; wasWatched: boolean }
  | { kind: 'prospect_action'; prospect: DraftProspect; action: Exclude<ScoutingAction, 'private_workout'>; scouting?: ProspectScoutingState }
  | { kind: 'pro_day'; prospect: DraftProspect; scouting?: ProspectScoutingState }
  | { kind: 'private_workout'; prospect: DraftProspect; scouting?: ProspectScoutingState; workoutsBefore: number };

function scoutingStrengthTier(grade: number): 'elite' | 'solid' {
  return grade >= 85 ? 'elite' : 'solid';
}

function scoutingProjectionTier(projectedRound: number): 'first_round' | 'mid_round' | 'late_round' {
  if (projectedRound <= 1) return 'first_round';
  if (projectedRound <= 3) return 'mid_round';
  return 'late_round';
}

function buildScoutingFlavor(params: {
  playerName: string;
  position: string;
  college: string;
  projectedRound: number;
  visibleGrade: number;
  fortyTime?: number | null;
}): string[] {
  const placeholders = {
    playerName: params.playerName,
    college: params.college,
    fortyTime: params.fortyTime ? `${params.fortyTime.toFixed(2)}` : '4.55',
    height: 'prototype size',
    weight: '205',
    stat: `${Math.round(params.visibleGrade)}`,
    year: 'this class',
  };

  const strength = getScoutingReportTemplate(params.position, scoutingStrengthTier(params.visibleGrade))?.[0] ?? null;
  const projection = getScoutingReportTemplate(params.position, scoutingProjectionTier(params.projectedRound))?.[0] ?? null;

  return [strength, projection]
    .filter((line): line is string => Boolean(line))
    .map((line) => interpolateContentPlaceholders(line, placeholders));
}

function buildProDayImpactLine(proDayRating: string | null | undefined): string {
  if (proDayRating) {
    return `Saved pro-day result from offseasonState.scoutingState.proDayRating: ${proDayRating}. It adds one scout-backed rating sample, raises confidence, and tightens the visible grade without spending a private-workout slot.`;
  }
  return 'Pro day records one scout-backed rating sample, raises confidence, and tightens the visible grade without spending a private-workout slot.';
}

function buildPrivateWorkoutImpactLine(
  privateWorkoutRatings: readonly string[] | undefined,
  remainingWorkouts: number,
): string {
  if (privateWorkoutRatings?.length) {
    return `Saved private-workout result from offseasonState.scoutingState.privateWorkoutRatings: ${privateWorkoutRatings.join(' // ')}. It consumed one seasonal workout, verified top position ratings, and can unlock risk and ceiling bands.`;
  }
  if (remainingWorkouts <= 0) {
    return 'No private-workout bullets remain. Film, combine, interview, and pro-day actions can still improve confidence, but they do not save private-workout rating lines.';
  }
  return 'Private workout consumes one seasonal workout, verifies top position ratings, gives a large confidence bump, and can unlock risk and ceiling bands.';
}

function prospectName(prospect: DraftProspect): string {
  return `${prospect.firstName} ${prospect.lastName}`;
}

function scoutDescriptor(scout: Scout): string {
  const scope = scout.scope === 'national' ? 'National' : `${scout.region ?? 'regional'} region`;
  return `${scope} // ${scout.specialty ?? 'Generalist'} // ${Math.round(scout.accuracy * 100)}%`;
}

function scoutingActionLabel(action: Exclude<ScoutingAction, 'private_workout'>): string {
  return {
    film: 'Film Review',
    combine: 'Combine Check',
    interview: 'Interview',
  }[action];
}

export function buildScoutingActionReceipt(input: ScoutingActionReceiptInput): ScoutingActionReceipt {
  if (input.kind === 'hire_scout') {
    const budgetAfter = Math.round((input.budgetBefore - input.scout.salary) * 100) / 100;
    return {
      id: `hire-${input.scout.id}`,
      title: 'Scout Hire Receipt',
      target: input.scout.name,
      result: `Added ${scoutDescriptor(input.scout)}`,
      detail: `Budget moves from $${input.budgetBefore.toFixed(1)}M toward $${budgetAfter.toFixed(1)}M, and the scout moves from the available pool to hired staff.`,
      source: 'Action used: actions.hireScout -> hireScout; this confirmation appears here only.',
      accent: input.scout.tier === 'elite' ? 'gold' : 'green',
    };
  }

  if (input.kind === 'fire_scout') {
    const refund = Math.round(input.scout.salary * 50) / 100;
    const budgetAfter = Math.round((input.budgetBefore + input.scout.salary * 0.5) * 100) / 100;
    return {
      id: `fire-${input.scout.id}`,
      title: 'Scout Release Receipt',
      target: input.scout.name,
      result: `Returned ${scoutDescriptor(input.scout)} to the candidate pool`,
      detail: `The scouting budget refunds $${refund.toFixed(1)}M and moves from $${input.budgetBefore.toFixed(1)}M toward $${budgetAfter.toFixed(1)}M.`,
      source: 'Action used: actions.fireScout -> fireScout; this confirmation appears here only.',
      accent: 'red',
    };
  }

  if (input.kind === 'watch') {
    const name = prospectName(input.prospect);
    return {
      id: `watch-${input.prospect.id}-${input.wasWatched ? 'remove' : 'add'}`,
      title: 'Scouting Watchlist Receipt',
      target: `${name} // ${input.prospect.pos}`,
      result: input.wasWatched ? 'Removed from saved draft watchlist' : 'Added to saved draft watchlist',
      detail: 'This changes offseasonState.scoutingWatchlist for draft-room focus. Browser-local star pins stay in the separate mfd.watchlist.v1 sidecar.',
      source: 'Action used: actions.toggleScoutingWatchlist -> toggleScoutingWatchlist; this confirmation appears here only.',
      accent: input.wasWatched ? 'default' : 'gold',
    };
  }

  if (input.kind === 'prospect_action') {
    const name = prospectName(input.prospect);
    const label = scoutingActionLabel(input.action);
    const confidence = input.scouting?.confidence ?? Math.round((input.scouting?.accuracy ?? 0) * 100);
    return {
      id: `${input.action}-${input.prospect.id}`,
      title: 'Scouting Intel Receipt',
      target: `${name} // ${input.prospect.pos}`,
      result: `${label} logged`,
      detail: `The saved scouting row re-renders from offseasonState.scoutingState with actions, confidence, assigned scout, visible grade, and notes. Previous confidence was ${confidence}%.`,
      source: 'Action used: actions.runScoutingAction -> runScoutingAction; this confirmation appears here only.',
      accent: input.action === 'film' ? 'cyan' : input.action === 'combine' ? 'gold' : 'green',
    };
  }

  if (input.kind === 'pro_day') {
    const name = prospectName(input.prospect);
    return {
      id: `pro-day-${input.prospect.id}`,
      title: 'Pro Day Receipt',
      target: `${name} // ${input.prospect.pos}`,
      result: input.scouting?.proDayRating ? 'Pro day refreshed' : 'Pro day recorded',
      detail: 'The saved scouting row can gain one proDayRating line, a note, tighter visible grade, and higher confidence without spending a private-workout slot.',
      source: 'Action used: actions.runProDay -> runProDay; this confirmation appears here only.',
      accent: 'green',
    };
  }

  const name = prospectName(input.prospect);
  const remainingAfter = Math.max(0, input.workoutsBefore - 1);
  return {
    id: `private-workout-${input.prospect.id}`,
    title: 'Private Workout Receipt',
    target: `${name} // ${input.prospect.pos}`,
    result: 'Private workout recorded',
    detail: `One seasonal workout is consumed (${input.workoutsBefore} -> ${remainingAfter}), and the saved row can add privateWorkoutRatings plus risk/ceiling clarity.`,
    source: 'Action used: actions.runPrivateWorkout -> runPrivateWorkout; this confirmation appears here only.',
    accent: 'gold',
  };
}

export function ScoutingActionReceiptPanel({ receipt }: { receipt: ScoutingActionReceipt }) {
  return (
    <PixelPanel title={receipt.title} accent={receipt.accent}>
      <div style={autoGrid(210)}>
        <PixelMetricCard label="Target" value={receipt.target} accent="cyan" detail="Scouting row that fired the existing commit." />
        <PixelMetricCard label="Result" value={receipt.result} accent={receipt.accent} detail={receipt.detail} />
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6, marginTop: '10px' }}>
        {receipt.source}
      </div>
    </PixelPanel>
  );
}

export function ScoutingBoard() {
  const draftClass = useGameStore(selectDraftClass);
  const offseasonState = useGameStore(selectOffseasonState);
  const scoutingDepartment = useGameStore(selectScoutingDepartment);
  const needsReport = useGameStore(selectUserTeamNeeds);
  const {
    fireScout,
    hireScout,
    runProDay,
    runPrivateWorkout,
    runScoutingAction,
    toggleScoutingWatchlist,
  } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [criticalNeedsOnly, setCriticalNeedsOnly] = useState(false);
  const [compareProspectId, setCompareProspectId] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<ScoutingActionReceipt | null>(null);

  const handleAction = async (key: string, run: () => Promise<void>, receipt?: () => ScoutingActionReceipt) => {
    setPending(key);
    try {
      await run();
      if (receipt) setActionReceipt(receipt());
    } finally {
      setPending(null);
    }
  };

  const visibleProspects = draftClass.slice(0, 32);
  const watchlist = useMemo(() => new Set(offseasonState?.scoutingWatchlist ?? []), [offseasonState?.scoutingWatchlist]);
  const positionOptions = useMemo(() => {
    const positions = [...new Set(visibleProspects.map((prospect) => prospect.pos))].sort();
    return [
      { value: 'all', label: 'All Positions' },
      ...positions.map((position) => ({ value: position, label: position })),
    ];
  }, [visibleProspects]);

  const filteredProspects = useMemo(() => {
    return visibleProspects.filter((prospect) => {
      if (positionFilter !== 'all' && prospect.pos !== positionFilter) return false;
      if (regionFilter !== 'all' && prospect.region !== regionFilter) return false;
      if (watchlistOnly && !watchlist.has(prospect.id)) return false;
      if (criticalNeedsOnly && !needsReport.criticalNeeds.includes(prospect.pos)) return false;
      return true;
    });
  }, [criticalNeedsOnly, needsReport.criticalNeeds, positionFilter, regionFilter, visibleProspects, watchlist, watchlistOnly]);

  const completedActions = useMemo(() => {
    return visibleProspects.reduce((sum, prospect) => sum + (offseasonState?.scoutingState[prospect.id]?.actions.length ?? 0), 0);
  }, [offseasonState?.scoutingState, visibleProspects]);

  const focusBoard = useMemo(() => {
    return visibleProspects.filter((prospect) => watchlist.has(prospect.id)).slice(0, 6);
  }, [visibleProspects, watchlist]);

  const regionalCoverage = useMemo(() => {
    return [...new Set(
      scoutingDepartment.scouts
        .filter((scout) => scout.scope === 'regional' && scout.region)
        .map((scout) => scout.region),
    )];
  }, [scoutingDepartment.scouts]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Scouting Board"
        subtitle="Scarce intel, regional coverage, and three private workout bullets before the draft clock starts."
        badges={(
          <>
            <PixelBadge variant="cyan">{visibleProspects.length} prospects</PixelBadge>
            <PixelBadge variant="gold">{completedActions} actions logged</PixelBadge>
            <PixelBadge variant="green">{scoutingDepartment.scouts.length} scouts hired</PixelBadge>
          </>
        )}
      />

      <CommandCallout
        title={watchlist.size > 0 ? 'Work the watchlist' : 'Find one need-fit target'}
        body={watchlist.size > 0
          ? 'Your board has a focus list. Spend actions where confidence is low before opening the full prospect stack.'
          : `${needsReport.criticalNeeds.join(', ') || 'No critical needs'} is the first filter. Mark targets before late draft pressure narrows your choices.`}
        accent={watchlist.size > 0 ? 'gold' : 'cyan'}
        meta={(
          <>
            <PixelBadge variant="gold">{scoutingDepartment.privateWorkoutsRemaining} workouts</PixelBadge>
            <PixelBadge variant="cyan">{watchlist.size} watched</PixelBadge>
          </>
        )}
        actions={[
          { label: 'Critical Needs', accent: 'green', onClick: () => setCriticalNeedsOnly(true) },
          { label: 'Draft Board', accent: 'gold', onClick: () => navigateTo('/draft') },
        ]}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Scouting Actions" value={completedActions} accent="gold" detail="Film, combine, interview" />
        <PixelMetricCard label="Private Workouts" value={scoutingDepartment.privateWorkoutsRemaining} accent="green" detail="Seasonal workout bullets left" />
        <PixelMetricCard label="Scout Budget" value={`$${scoutingDepartment.budget.toFixed(1)}M`} accent="default" detail={`${scoutingDepartment.scouts.length}/${scoutingDepartment.maxScouts} hired`} />
        <PixelMetricCard label="Watchlist" value={watchlist.size} accent="gold" detail="Priority prospects" />
      </div>

      <PixelPanel title="Scouting Sources" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">SAVED DRAFT CLASS</PixelBadge>
            <PixelBadge variant="gold">SCOUTING STATE</PixelBadge>
            <PixelBadge variant="green">SCOUT STAFF</PixelBadge>
            <PixelBadge variant="default">WATCHLIST SPLIT</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            Prospect rows read saved game.draftClass. Visible grade, confidence, notes, risk, ceiling, character, pro-day, and private-workout lines read saved offseasonState.scoutingState when present.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            Film, combine, interview, pro day, private workout, scout hire/fire, and saved draft watch/unwatch actions stay in the store actions backed by engine scouting helpers. Opening Scouting does not generate a new class, reroll scouts, spend workouts, or change saved scouting intel.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            The saved scouting watchlist is offseasonState.scoutingWatchlist. The pin button is the separate browser-local mfd.watchlist.v1 sidecar, and Scout Desk lines come from authored scouting-report templates.
          </div>
        </div>
      </PixelPanel>

      {actionReceipt ? <ScoutingActionReceiptPanel receipt={actionReceipt} /> : null}

      <div style={autoGrid(320)}>
        <PixelPanel title="Scouting Filters" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSelect
              aria-label="Position filter"
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
              options={positionOptions}
              accent="cyan"
            />
            <PixelSelect
              aria-label="Region filter"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
              options={REGION_OPTIONS}
              accent="gold"
            />
            <PixelSwitch
              checked={watchlistOnly}
              onChange={setWatchlistOnly}
              accent="gold"
              label="Watchlist Only"
              description="Show only the prospects you have marked for focus."
            />
            <PixelSwitch
              checked={criticalNeedsOnly}
              onChange={setCriticalNeedsOnly}
              accent="green"
              label="Critical Needs"
              description="Filter the board to the team-needs hot zones."
            />
          </div>
        </PixelPanel>

        <PixelPanel title="Coverage Map" accent="cyan">
          <div data-spotlight-target="chip.route.scouting-board.beat-1" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Regional coverage: {regionalCoverage.length > 0 ? regionalCoverage.join(', ') : 'none yet'}.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="default">
                {scoutingDepartment.scouts.some((scout) => scout.scope === 'national') ? 'National Online' : 'No National Scout'}
              </PixelBadge>
              {['east', 'south', 'midwest', 'west'].map((region) => (
                <PixelBadge
                  key={region}
                  variant={regionalCoverage.includes(region as 'east' | 'south' | 'midwest' | 'west') ? 'cyan' : 'default'}
                >
                  {region}
                </PixelBadge>
              ))}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="WATCHLIST // Focus Board" accent="green">
          <div data-spotlight-target="chip.route.scouting-board.beat-2">
          {focusBoard.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              No prospects on the watchlist yet. Mark targets from the board below to keep them on your front burner.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {focusBoard.map((prospect) => {
                const scouting = offseasonState?.scoutingState[prospect.id];
                const confidence = Number(scouting?.confidence ?? Math.round((scouting?.accuracy ?? 0) * 100));
                return (
                  <div key={`watch-${prospect.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{prospect.firstName} {prospect.lastName}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{prospect.pos} // {prospect.region} // {confidence}% confidence</div>
                    </div>
                    <PixelBadge variant="gold">{scouting?.ceilingBand ?? 'unknown'}</PixelBadge>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title={`Hired Scouts (${scoutingDepartment.scouts.length}/${scoutingDepartment.maxScouts})`} accent="green">
          {scoutingDepartment.scouts.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              No scouts on staff yet. Hire coverage first, then spend your private workouts where the board is still murky.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scoutingDepartment.scouts.map((scout) => (
                <div key={scout.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-green)', background: 'rgba(74, 222, 128, 0.08)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>{scout.name.toUpperCase()}</span>
                    <span style={{ ...monoSm, color: '#999' }}>
                      {scout.scope === 'national' ? 'National' : `${scout.region} region`} // {scout.specialty ?? 'Generalist'} // {Math.round(scout.accuracy * 100)}% // ${scout.salary.toFixed(1)}M
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant={scout.tier === 'elite' ? 'gold' : scout.tier === 'good' ? 'green' : scout.tier === 'average' ? 'cyan' : 'red'}>
                      {scout.tier}
                    </PixelBadge>
                    <PixelButton
                      accent="red"
                      disabled={pending === scout.id}
                      onClick={() => void handleAction(
                        scout.id,
                        async () => fireScout(scout.id),
                        () => buildScoutingActionReceipt({ kind: 'fire_scout', scout, budgetBefore: scoutingDepartment.budget }),
                      )}
                    >
                      Fire
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Scout Pool (${scoutingDepartment.availableScouts.length})`} accent="cyan">
          {scoutingDepartment.availableScouts.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              No offseason candidates are listed right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scoutingDepartment.availableScouts.slice(0, 6).map((scout) => (
                <div key={scout.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{scout.name}</span>
                    <span style={{ ...monoSm, color: '#999' }}>
                      {scout.scope === 'national' ? 'National' : `${scout.region} region`} // {scout.specialty ?? 'Generalist'} // {scout.tier} // ${scout.salary.toFixed(1)}M
                    </span>
                  </div>
                  <PixelButton
                    accent="cyan"
                    disabled={scoutingDepartment.scouts.length >= scoutingDepartment.maxScouts || scoutingDepartment.budget < scout.salary || pending === scout.id}
                    onClick={() => void handleAction(
                      scout.id,
                      async () => hireScout(scout.id),
                      () => buildScoutingActionReceipt({ kind: 'hire_scout', scout, budgetBefore: scoutingDepartment.budget }),
                    )}
                  >
                    Hire
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title={`Prospect Board (${filteredProspects.length})`} accent="cyan">
        {filteredProspects.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No prospects match the current filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredProspects.map((prospect) => {
              const scouting = offseasonState?.scoutingState[prospect.id];
              const assignedScout = scoutingDepartment.scouts.find((scout) => scout.id === scouting?.assignedScoutId) ?? null;
              const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
              const confidence = Number(scouting?.confidence ?? Math.round((scouting?.accuracy ?? 0) * 100));
              const combineVisible = Boolean(prospect.combine && scouting?.actions.includes('combine'));
              const privateWorkoutTaken = Boolean(scouting?.actions.includes('private_workout'));
              const isWatched = watchlist.has(prospect.id);
              const showLineage = Boolean(prospect.bloodline && (confidence >= 50 || isWatched));
              const scoutingFlavor = buildScoutingFlavor({
                playerName: `${prospect.firstName} ${prospect.lastName}`,
                position: prospect.pos,
                college: prospect.college,
                projectedRound: prospect.projectedRound,
                visibleGrade,
                fortyTime: prospect.combine?.fortyYard ?? null,
              });

              return (
                <div key={prospect.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px',
                  border: `3px solid ${isWatched ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}`,
                  background: 'var(--mfd-bg-3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                        {`${prospect.firstName} ${prospect.lastName}`.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                        {prospect.pos} // {prospect.college} // region: {prospect.region} // projected round {prospect.projectedRound}
                      </div>
                      {scouting?.notes.length ? (
                        <div style={{ ...monoSm, color: 'var(--mfd-cyan)', marginTop: '6px', lineHeight: 1.6 }}>
                          {scouting.notes[scouting.notes.length - 1]}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{visibleGrade.toFixed(1)}</PixelBadge>
                      <PixelBadge variant="default">{confidence}% conf</PixelBadge>
                      <PixelBadge variant={needsReport.criticalNeeds.includes(prospect.pos) ? 'gold' : 'default'}>
                        {needsReport.criticalNeeds.includes(prospect.pos) ? 'Need Fit' : prospect.region}
                      </PixelBadge>
                      <PixelBadge variant="gold">{scouting?.riskBand ?? 'unknown'}</PixelBadge>
                      <PixelBadge variant="green">{scouting?.ceilingBand ?? 'unknown'}</PixelBadge>
                      <PixelBadge variant="default">{scouting?.characterRead ?? 'unknown'}</PixelBadge>
                      {prospect.bloodline ? <PixelBadge variant="gold">Bloodline</PixelBadge> : null}
                      {assignedScout ? (
                        <PixelBadge variant={assignedScout.tier === 'elite' ? 'gold' : assignedScout.tier === 'good' ? 'green' : assignedScout.tier === 'average' ? 'cyan' : 'red'}>
                          {assignedScout.scope === 'national' ? 'National' : assignedScout.region}
                        </PixelBadge>
                      ) : null}
                    </div>
                  </div>

                  {combineVisible ? (
                    <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                      40: {prospect.combine!.fortyYard}s // Bench: {prospect.combine!.benchPress} // Vertical: {prospect.combine!.vertical}"
                    </div>
                  ) : null}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '8px',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px 10px',
                      border: '2px solid rgba(34, 211, 238, 0.35)',
                      background: 'rgba(34, 211, 238, 0.06)',
                    }}>
                      <PixelBadge variant="cyan">PRO DAY IMPACT</PixelBadge>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                        {buildProDayImpactLine(scouting?.proDayRating)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px 10px',
                      border: '2px solid rgba(245, 158, 11, 0.35)',
                      background: 'rgba(245, 158, 11, 0.06)',
                    }}>
                      <PixelBadge variant="gold">PRIVATE WORKOUT IMPACT</PixelBadge>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                        {buildPrivateWorkoutImpactLine(scouting?.privateWorkoutRatings, scoutingDepartment.privateWorkoutsRemaining)}
                      </div>
                    </div>
                  </div>

                  {scouting?.proDayRating ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-green)' }}>
                      Pro Day: {scouting.proDayRating}
                    </div>
                  ) : null}

                  {showLineage && prospect.bloodline ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>
                      Lineage: {prospect.bloodline.relationship} of {prospect.bloodline.parentName}
                    </div>
                  ) : null}

                  {scouting?.privateWorkoutRatings.length ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>
                      Private workout: {scouting.privateWorkoutRatings.join(' // ')}
                    </div>
                  ) : null}

                  {scoutingFlavor.length > 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px 10px',
                      borderLeft: '3px solid var(--mfd-cyan)',
                      background: 'rgba(34, 211, 238, 0.08)',
                    }}>
                      <div style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>Scout Desk // Authored Read</div>
                      {scoutingFlavor.map((line) => (
                        <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton
                      accent={isWatched ? 'gold' : 'default'}
                      disabled={pending === `${prospect.id}-watch`}
                      onClick={() => void handleAction(
                        `${prospect.id}-watch`,
                        async () => toggleScoutingWatchlist(prospect.id),
                        () => buildScoutingActionReceipt({ kind: 'watch', prospect, wasWatched: isWatched }),
                      )}
                    >
                      {isWatched ? 'Unwatch' : 'Watch'}
                    </PixelButton>
                    <PixelButton accent="cyan" onClick={() => setCompareProspectId(prospect.id)}>
                      <Users size={14} aria-hidden="true" /> Compare
                    </PixelButton>
                    <WatchListPinButton playerId={prospect.id} />
                    {(['film', 'combine', 'interview'] as const).map((action) => {
                      const taken = scouting?.actions.includes(action);
                      return (
                        <PixelButton
                          key={action}
                          accent={taken ? 'default' : action === 'film' ? 'cyan' : action === 'combine' ? 'gold' : 'green'}
                          disabled={taken || pending === `${prospect.id}-${action}`}
                          onClick={() => void handleAction(
                            `${prospect.id}-${action}`,
                            async () => runScoutingAction(prospect.id, action),
                            () => buildScoutingActionReceipt({ kind: 'prospect_action', prospect, action, scouting }),
                          )}
                        >
                          {taken ? `${action} done` : action}
                        </PixelButton>
                      );
                    })}
                    <PixelButton
                      accent="green"
                      disabled={pending === `${prospect.id}-pro-day`}
                      onClick={() => void handleAction(
                        `${prospect.id}-pro-day`,
                        async () => runProDay(prospect.id),
                        () => buildScoutingActionReceipt({ kind: 'pro_day', prospect, scouting }),
                      )}
                    >
                      Pro Day
                    </PixelButton>
                    <PixelButton
                      accent="gold"
                      disabled={privateWorkoutTaken || scoutingDepartment.privateWorkoutsRemaining <= 0 || pending === `${prospect.id}-workout`}
                      onClick={() => void handleAction(
                        `${prospect.id}-workout`,
                        async () => runPrivateWorkout(prospect.id),
                        () => buildScoutingActionReceipt({
                          kind: 'private_workout',
                          prospect,
                          scouting,
                          workoutsBefore: scoutingDepartment.privateWorkoutsRemaining,
                        }),
                      )}
                    >
                      {privateWorkoutTaken ? 'Workout Done' : 'Private Workout'}
                    </PixelButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>
      <ComparePlayersModal
        open={compareProspectId !== null}
        leftPlayerId={compareProspectId}
        onOpenChange={(open) => {
          if (!open) setCompareProspectId(null);
        }}
      />
    </div>
  );
}
