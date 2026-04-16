import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSelect,
  PixelSwitch,
} from '@mfd/design-system/components';
import {
  selectDraftClass,
  selectOffseasonState,
  selectScoutingDepartment,
  selectUserTeamNeeds,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

const REGION_OPTIONS = [
  { value: 'all', label: 'All Regions' },
  { value: 'east', label: 'east' },
  { value: 'south', label: 'south' },
  { value: 'midwest', label: 'midwest' },
  { value: 'west', label: 'west' },
];

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

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
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

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Scouting Actions" value={completedActions} accent="gold" detail="Film, combine, interview" />
        <PixelMetricCard label="Private Workouts" value={scoutingDepartment.privateWorkoutsRemaining} accent="green" detail="Seasonal workout bullets left" />
        <PixelMetricCard label="Scout Budget" value={`$${scoutingDepartment.budget.toFixed(1)}M`} accent="default" detail={`${scoutingDepartment.scouts.length}/${scoutingDepartment.maxScouts} hired`} />
        <PixelMetricCard label="Watchlist" value={watchlist.size} accent="gold" detail="Priority prospects" />
      </div>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                    <PixelButton accent="red" disabled={pending === scout.id} onClick={() => void handleAction(scout.id, async () => fireScout(scout.id))}>
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
                    onClick={() => void handleAction(scout.id, async () => hireScout(scout.id))}
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

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton
                      accent={isWatched ? 'gold' : 'default'}
                      disabled={pending === `${prospect.id}-watch`}
                      onClick={() => void handleAction(`${prospect.id}-watch`, async () => toggleScoutingWatchlist(prospect.id))}
                    >
                      {isWatched ? 'Unwatch' : 'Watch'}
                    </PixelButton>
                    {(['film', 'combine', 'interview'] as const).map((action) => {
                      const taken = scouting?.actions.includes(action);
                      return (
                        <PixelButton
                          key={action}
                          accent={taken ? 'default' : action === 'film' ? 'cyan' : action === 'combine' ? 'gold' : 'green'}
                          disabled={taken || pending === `${prospect.id}-${action}`}
                          onClick={() => void handleAction(`${prospect.id}-${action}`, async () => runScoutingAction(prospect.id, action))}
                        >
                          {taken ? `${action} done` : action}
                        </PixelButton>
                      );
                    })}
                    <PixelButton
                      accent="green"
                      disabled={pending === `${prospect.id}-pro-day`}
                      onClick={() => void handleAction(`${prospect.id}-pro-day`, async () => runProDay(prospect.id))}
                    >
                      Pro Day
                    </PixelButton>
                    <PixelButton
                      accent="gold"
                      disabled={privateWorkoutTaken || scoutingDepartment.privateWorkoutsRemaining <= 0 || pending === `${prospect.id}-workout`}
                      onClick={() => void handleAction(`${prospect.id}-workout`, async () => runPrivateWorkout(prospect.id))}
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
    </div>
  );
}
