import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar, PixelSelect, MfdTooltip } from '@mfd/design-system/components';
import type {
  ContingencyRule,
  ShotDeclaration,
  WeeklyPrepPlan,
} from '@mfd/engine';
import {
  DEFENSIVE_PLAYS,
  getAvailableTrickPlays,
  getDeclarations,
  isCallYourShotEligible,
  MAX_CONTINGENCIES,
  OFFENSIVE_PLAYS,
} from '@mfd/engine';
import {
  selectCurrentOpponentIntel,
  selectCurrentOpponentReport,
  selectCurrentWeeklyPrepPlan,
  selectPhase,
  selectUpcomingRivalry,
  selectUserTeam,
  selectWeek,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import { PixelConsequenceList, PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';
import { playSound } from '../audio/AudioManager';
import { ContingencyBuilder } from './ContingencyBuilder';
import {
  PREP_ALIGNMENT_MAX_SCORE,
  buildPrepDecisionForecast,
} from './prepDecisionForecast';

export const PLAN_TOOLTIPS: Record<string, string> = {
  'Offensive Focus': 'Choose how your offense attacks. "Attack Secondary" targets the passing game, "Attack Front" emphasizes the run, "Feed Star" gives your best player extra touches.',
  'Defensive Focus': 'Set your defensive priority. "Stop Run" stacks the box, "Heat QB" sends extra blitzes, "Erase WR1" shadows their top receiver.',
  'Practice Intensity': 'Set practice contact before Save Weekly Prep. Light lowers injury-report chances but leaves fewer reps; Full Pads raises install gains and injury-report chances before Advance Week.',
  'Snap Management': 'Control how you distribute playing time. "Protect Starters" reduces wear, "Ride Stars" maximizes your best players\' snaps.',
  'Special Situation': 'Focus practice reps on a specific game scenario. Red Zone, Third Down, Two Minute, or Field Position drills.',
  'Key Matchup': 'Designate a player to receive extra game-plan attention for this matchup.',
};

const offensiveOptions: Array<{ value: WeeklyPrepPlan['offensiveFocus']; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'attack_secondary', label: 'Attack Secondary' },
  { value: 'attack_front', label: 'Attack Front' },
  { value: 'feed_star', label: 'Feed Star' },
  { value: 'protect_qb', label: 'Protect QB' },
];

const defensiveOptions: Array<{ value: WeeklyPrepPlan['defensiveFocus']; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'stop_run', label: 'Stop Run' },
  { value: 'limit_explosive', label: 'Limit Explosive' },
  { value: 'heat_qb', label: 'Heat QB' },
  { value: 'erase_wr1', label: 'Erase WR1' },
];

const intensityOptions: Array<{ value: WeeklyPrepPlan['practiceIntensity']; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'full_pads', label: 'Full Pads' },
];

const snapOptions: Array<{ value: WeeklyPrepPlan['snapManagement']; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'protect_starters', label: 'Protect Starters' },
  { value: 'ride_stars', label: 'Ride Stars' },
];

const specialSituationOptions: Array<{ value: WeeklyPrepPlan['specialSituation']; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'red_zone', label: 'Red Zone' },
  { value: 'third_down', label: 'Third Down' },
  { value: 'two_minute', label: 'Two Minute' },
  { value: 'field_position', label: 'Field Position' },
];

type PrepExtrasTab = 'contingencies' | 'trick_plays' | 'playbook';

const PREP_EXTRA_TABS: Array<{ id: PrepExtrasTab; label: string; accent: 'gold' | 'cyan' | 'green' }> = [
  { id: 'contingencies', label: 'Contingencies', accent: 'gold' },
  { id: 'trick_plays', label: 'Trick Plays', accent: 'cyan' },
  { id: 'playbook', label: 'Playbook', accent: 'green' },
];

const MAX_SELECTED_TRICK_PLAYS = 2;

type WeeklyPrepSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface WeeklyPrepSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: WeeklyPrepSourceAccent;
}

export function buildWeeklyPrepSourceRows({
  reportTeamName,
  week,
  storedPlan,
  alignmentLabel,
  loadLabel,
  extrasLabel,
  contingencyCount,
  trickPlayCount,
}: {
  reportTeamName: string;
  week: number;
  storedPlan: boolean;
  alignmentLabel: string;
  loadLabel: string;
  extrasLabel: string;
  contingencyCount: number;
  trickPlayCount: number;
}): WeeklyPrepSourceRow[] {
  return [
    {
      id: 'opponent-intel',
      label: 'Opponent intel',
      value: `Week ${week}`,
      detail: `selectCurrentOpponentReport and selectCurrentOpponentIntel supply the ${reportTeamName} report, lanes, recommendations, tendencies, danger players, and weak links for the current matchup.`,
      accent: 'cyan',
    },
    {
      id: 'prep-draft',
      label: 'Prep draft',
      value: storedPlan ? 'Saved board' : 'Route draft',
      detail: 'The visible controls are route-local WeeklyPrepPlan fields until a commit button runs. Changing them does not write weeklyPrepPlans, gamePlan, reports, or Call Your Shot by itself.',
      accent: storedPlan ? 'green' : 'gold',
    },
    {
      id: 'decision-forecast',
      label: 'Decision forecast',
      value: `${alignmentLabel} / ${loadLabel}`,
      detail: `buildPrepDecisionForecast reads the current draft plus ${contingencyCount} contingency rules and ${trickPlayCount} trick plays to label consequences. It does not play scheduled games or change saved data.`,
      accent: 'green',
    },
    {
      id: 'trick-play-boundary',
      label: 'Trick play boundary',
      value: trickPlayCount > 0 ? `${trickPlayCount} planned` : 'Planning only',
      detail: 'Selected trick plays are saved in the weekly prep plan, enter the seeded live-drive caller at most once per play, and persist their outcome into the game ledger and recap.',
      accent: trickPlayCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'commit-paths',
      label: 'Ways to advance',
      value: 'Save or auto',
      detail: 'Save Weekly Prep & Sim writes the plan, opponent report, game-plan calls, and selected Call Your Shot before advancing. Auto Prep clears saved prep, saves Call Your Shot when selected, then advances.',
      accent: 'gold',
    },
    {
      id: 'sim-boundary',
      label: 'Advance boundary',
      value: extrasLabel,
      detail: 'Opening Game Plan does not click Advance Week, evaluate prep, resolve snaps, play games, resolve contingency outcomes, create Film Room entries, or change the schedule.',
      accent: 'red',
    },
  ];
}

function WeeklyPrepSources({ rows }: { rows: WeeklyPrepSourceRow[] }) {
  return (
    <PixelPanel title="Weekly Prep Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>{row.label.toUpperCase()}</div>
              <PixelBadge variant={row.accent}>{row.value.toUpperCase()}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function GamePlanSetup() {
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const phase = useGameStore(selectPhase);
  const team = useGameStore(selectUserTeam);
  const report = useGameStore(selectCurrentOpponentReport);
  const intel = useGameStore(selectCurrentOpponentIntel);
  const storedPlan = useGameStore(selectCurrentWeeklyPrepPlan);
  const upcomingRivalry = useGameStore(selectUpcomingRivalry);
  const activeCallYourShot = useGameStore((state) => state.game?.activeCallYourShot ?? null);
  const coachMode = useGameStore((state) => state.game?.settings?.coachMode ?? false);
  const { advanceWeek, clearWeeklyPrepPlan, saveWeeklyPrepPlan, setCallYourShot } = useGameStore((state) => state.actions);

  const defaultPlan = storedPlan ?? (team && intel ? {
    teamId: team.id,
    opponentTeamId: intel.opponentTeamId,
    year,
    week,
    offensiveFocus: intel.attackLane === 'passing' ? 'attack_secondary' : 'attack_front',
    defensiveFocus: intel.defendLane === 'passing' ? 'limit_explosive' : 'stop_run',
    practiceIntensity: 'normal',
    keyMatchupPlayerId: null,
    snapManagement: 'normal',
    specialSituation: 'third_down',
  } satisfies WeeklyPrepPlan : null);

  const [offensiveFocus, setOffensiveFocus] = useState<WeeklyPrepPlan['offensiveFocus']>(defaultPlan?.offensiveFocus ?? 'balanced');
  const [defensiveFocus, setDefensiveFocus] = useState<WeeklyPrepPlan['defensiveFocus']>(defaultPlan?.defensiveFocus ?? 'balanced');
  const [practiceIntensity, setPracticeIntensity] = useState<WeeklyPrepPlan['practiceIntensity']>(defaultPlan?.practiceIntensity ?? 'normal');
  const [snapManagement, setSnapManagement] = useState<WeeklyPrepPlan['snapManagement']>(defaultPlan?.snapManagement ?? 'normal');
  const [specialSituation, setSpecialSituation] = useState<WeeklyPrepPlan['specialSituation']>(defaultPlan?.specialSituation ?? 'balanced');
  const [keyMatchupPlayerId, setKeyMatchupPlayerId] = useState(defaultPlan?.keyMatchupPlayerId ?? '');
  const [shotDeclaration, setShotDeclaration] = useState<ShotDeclaration | null>(activeCallYourShot);
  const [prepExtrasTab, setPrepExtrasTab] = useState<PrepExtrasTab>('contingencies');
  const [contingencyRules, setContingencyRules] = useState<ContingencyRule[]>(defaultPlan?.contingencyRules ?? []);
  const [selectedTrickPlays, setSelectedTrickPlays] = useState<string[]>(defaultPlan?.trickPlays ?? []);

  const shotEligibility = useMemo(() => {
    const isPlayoff = (phase as string) === 'playoffs' || (phase as string) === 'super_bowl';
    return isCallYourShotEligible(Boolean(upcomingRivalry), false, isPlayoff, week);
  }, [phase, upcomingRivalry, week]);
  const declarations = useMemo(() => getDeclarations(), []);
  const availableTrickPlays = useMemo(() => (team ? getAvailableTrickPlays(team) : []), [team]);

  const matchupOptions = useMemo(() => (
    team?.roster.map((player) => ({ value: player.id, label: `${player.name} // ${player.pos}` })) ?? []
  ), [team]);

  if (!team || !report || !intel) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Weekly Prep" subtitle="No opponent intel is available for this week." />
        <PixelPanel title="Scouting Pending" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Advance to an active matchup before locking a prep board.</div>
        </PixelPanel>
      </div>
    );
  }

  const currentPlan: WeeklyPrepPlan = {
    teamId: team.id,
    opponentTeamId: intel.opponentTeamId,
    year,
    week,
    offensiveFocus,
    defensiveFocus,
    practiceIntensity,
    keyMatchupPlayerId: keyMatchupPlayerId || null,
    snapManagement,
    specialSituation,
    contingencyRules,
    trickPlays: selectedTrickPlays,
  };
  const prepForecast = buildPrepDecisionForecast({
    plan: currentPlan,
    intel,
    storedPlan: Boolean(storedPlan),
    contingencyCount: contingencyRules.length,
    maxContingencies: MAX_CONTINGENCIES,
    trickPlayCount: selectedTrickPlays.length,
    maxTrickPlays: MAX_SELECTED_TRICK_PLAYS,
  });
  const sourceRows = buildWeeklyPrepSourceRows({
    reportTeamName: report.teamName,
    week,
    storedPlan: Boolean(storedPlan),
    alignmentLabel: prepForecast.alignmentLabel,
    loadLabel: prepForecast.loadLabel,
    extrasLabel: prepForecast.extrasLabel,
    contingencyCount: contingencyRules.length,
    trickPlayCount: selectedTrickPlays.length,
  });

  const filteredOffensivePlaybook = OFFENSIVE_PLAYS.filter((play) => play.planAffinity.includes(
    currentPlan.offensiveFocus === 'attack_secondary'
      ? 'pass_heavy'
      : currentPlan.offensiveFocus === 'attack_front'
        ? 'run_heavy'
        : currentPlan.offensiveFocus === 'feed_star'
          ? 'spread'
          : currentPlan.offensiveFocus === 'protect_qb'
            ? 'balanced'
            : 'balanced',
  ));
  const filteredDefensivePlaybook = DEFENSIVE_PLAYS.filter((play) => play.planAffinity.includes(
    currentPlan.defensiveFocus === 'heat_qb'
      ? 'blitz_heavy'
      : currentPlan.defensiveFocus === 'limit_explosive'
        ? 'coverage'
        : currentPlan.defensiveFocus === 'stop_run'
          ? 'contain'
          : currentPlan.defensiveFocus === 'erase_wr1'
            ? 'aggressive'
            : 'base',
  ));

  const toggleTrickPlay = (playId: string) => {
    setSelectedTrickPlays((current) => {
      if (current.includes(playId)) {
        return current.filter((id) => id !== playId);
      }
      if (current.length >= MAX_SELECTED_TRICK_PLAYS) {
        return current;
      }
      return [...current, playId];
    });
  };

  const persistShotDeclaration = async () => {
    await setCallYourShot(shotDeclaration);
  };

  const handleSkipWithAutoPrep = () => {
    void (async () => {
      await clearWeeklyPrepPlan();
      await persistShotDeclaration();
      playSound('week_advance_start', { debounceMs: 0, debounceKey: `game-plan:${year}:${week}:skip` });
      await advanceWeek();
    })();
  };

  const handleSaveWeeklyPrepAndSim = () => {
    void (async () => {
      await saveWeeklyPrepPlan(currentPlan, report);
      await persistShotDeclaration();
      playSound('week_advance_start', { debounceMs: 0, debounceKey: `game-plan:${year}:${week}:save` });
      await advanceWeek();
    })();
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Weekly Prep"
        subtitle={`${phase.replaceAll('_', ' ')} // week ${week} // turn scouting into a concrete game-week plan`}
        badges={(
          <>
            <PixelBadge variant="gold">Attack lane: {intel.attackLane}</PixelBadge>
            <PixelBadge variant="cyan">Defend lane: {intel.defendLane}</PixelBadge>
          </>
        )}
      />

      <WeeklyPrepSources rows={sourceRows} />

      {coachMode ? (
        <PixelPanel title="Coach Mode Live Calls" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="green">4th-down control</PixelBadge>
              <PixelBadge variant="cyan">Two-minute script</PixelBadge>
              <PixelBadge variant="gold">Halftime adjustment</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Use the Special Situation selector for Two Minute reps and Prep Extras → Contingencies for
              “Go for it on 4th” or late-game scripts. Halftime Hell pauses the user game for the saved
              stick, switch, or gamble call. Every selection is optional; Fast Sim remains available.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <div data-mfd-next-call="weekly-prep">
      <PixelPanel title="Next Call" accent={storedPlan ? 'green' : 'gold'}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: '16px',
          alignItems: 'center',
        }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelBadge variant={storedPlan ? 'green' : 'gold'}>
                {storedPlan ? 'Prep locked' : 'Prep open'}
              </PixelBadge>
              <PixelBadge variant="cyan">Contingencies {contingencyRules.length}/{MAX_CONTINGENCIES}</PixelBadge>
              <PixelBadge variant="gold">Trick plays {selectedTrickPlays.length}/{MAX_SELECTED_TRICK_PLAYS}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Primary decision: save the weekly prep plan before advancing, or choose Auto Prep and accept the staff's default calls.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <PixelButton accent="gold" onClick={handleSkipWithAutoPrep} style={{ minWidth: 126 }}>
              Auto Prep
            </PixelButton>
            <PixelButton
              accent="green"
              onClick={handleSaveWeeklyPrepAndSim}
              data-mfd-primary-action="weekly-prep"
              style={{ minWidth: 138, boxShadow: 'var(--mfd-shadow-gold-strong), 0 0 0 1px rgba(74, 222, 128, 0.16) inset' }}
            >
              Save &amp; Sim
            </PixelButton>
          </div>
        </div>
      </PixelPanel>
      </div>

      <div style={autoGrid(260)}>
        <div data-spotlight-target="chip.route.game-plan.beat-1">
          <PixelPanel title="Opponent Intel" accent="gold">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{report.teamName}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="default">{report.record}</PixelBadge>
                <PixelBadge variant="cyan">OFF #{report.offenseRank}</PixelBadge>
                <PixelBadge variant="red">DEF #{report.defenseRank}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Danger: {intel.dangerPlayers.map((player) => player.name).join(' | ')}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Weak links: {intel.weakLinks.map((player) => `${player.name} (${player.pos})`).join(' | ')}
              </div>
            </div>
          </PixelPanel>
        </div>

        <PixelPanel title="Recommended Prep" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {intel.recommendations.offense.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
            ))}
            {intel.recommendations.defense.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Tendencies" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {intel.tendencies.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(260)}>
        <MfdTooltip content={PLAN_TOOLTIPS['Offensive Focus']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Offensive Focus" accent="gold" style={{ height: '100%' }}>
              <PixelSelect
                value={offensiveFocus}
                onChange={(event) => setOffensiveFocus(event.target.value as WeeklyPrepPlan['offensiveFocus'])}
                options={offensiveOptions}
                accent="gold"
              />
              {intel && (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Intel says: {intel.attackLane === 'passing' ? 'Attack Secondary' : 'Attack Front'}
                  {offensiveFocus === (intel.attackLane === 'passing' ? 'attack_secondary' : 'attack_front') && <PixelBadge variant="green">SCOUT MATCH</PixelBadge>}
                </div>
              )}
            </PixelPanel>
          </div>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Defensive Focus']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Defensive Focus" accent="cyan" style={{ height: '100%' }}>
              <PixelSelect
                value={defensiveFocus}
                onChange={(event) => setDefensiveFocus(event.target.value as WeeklyPrepPlan['defensiveFocus'])}
                options={defensiveOptions}
                accent="cyan"
              />
              {intel && (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Intel says: {intel.defendLane === 'passing' ? 'Limit Explosive' : 'Stop Run'}
                  {defensiveFocus === (intel.defendLane === 'passing' ? 'limit_explosive' : 'stop_run') && <PixelBadge variant="green">SCOUT MATCH</PixelBadge>}
                </div>
              )}
            </PixelPanel>
          </div>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Practice Intensity']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Practice Intensity" accent="default" style={{ height: '100%' }}>
              <PixelSelect
                value={practiceIntensity}
                onChange={(event) => setPracticeIntensity(event.target.value as WeeklyPrepPlan['practiceIntensity'])}
                options={intensityOptions}
                accent="default"
              />
            </PixelPanel>
          </div>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Snap Management']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Snap Management" accent="default" style={{ height: '100%' }}>
              <PixelSelect
                value={snapManagement}
                onChange={(event) => setSnapManagement(event.target.value as WeeklyPrepPlan['snapManagement'])}
                options={snapOptions}
                accent="default"
              />
            </PixelPanel>
          </div>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Special Situation']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Special Situation" accent="default" style={{ height: '100%' }}>
              <PixelSelect
                value={specialSituation}
                onChange={(event) => setSpecialSituation(event.target.value as WeeklyPrepPlan['specialSituation'])}
                options={specialSituationOptions}
                accent="default"
              />
            </PixelPanel>
          </div>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Key Matchup']} side="bottom">
          <div style={{ height: '100%' }}>
            <PixelPanel title="Key Matchup" accent="green" style={{ height: '100%' }}>
              <PixelSelect
                value={keyMatchupPlayerId}
                onChange={(event) => setKeyMatchupPlayerId(event.target.value)}
                options={[{ value: '', label: 'No matchup emphasis' }, ...matchupOptions]}
                accent="green"
              />
            </PixelPanel>
          </div>
        </MfdTooltip>
      </div>

      <div data-spotlight-target="chip.route.game-plan.beat-2">
        <PixelPanel title="Prep Board Readout" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelProgressBar
              label="Offense vs scout report"
              value={prepForecast.offensiveScore}
              max={PREP_ALIGNMENT_MAX_SCORE}
              accent="gold"
              valueLabel={offensiveFocus.replaceAll('_', ' ')}
            />
            <PixelProgressBar
              label="Defense vs scout report"
              value={prepForecast.defensiveScore}
              max={PREP_ALIGNMENT_MAX_SCORE}
              accent="cyan"
              valueLabel={defensiveFocus.replaceAll('_', ' ')}
            />
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Stored plan status: {storedPlan ? 'weekly prep locked' : 'no prep saved yet'} // contingencies {contingencyRules.length}/{MAX_CONTINGENCIES} // trick plays {selectedTrickPlays.length}/{MAX_SELECTED_TRICK_PLAYS}
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Decision Forecast" accent={prepForecast.alignmentAccent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant={prepForecast.alignmentAccent}>{prepForecast.alignmentLabel}</PixelBadge>
            <PixelBadge variant={prepForecast.loadAccent}>{prepForecast.loadLabel}</PixelBadge>
            <PixelBadge variant="cyan">{prepForecast.extrasLabel}</PixelBadge>
          </div>
          <PixelConsequenceList items={prepForecast.consequenceItems} />
        </div>
      </PixelPanel>

      {shotEligibility.eligible && (
        <PixelPanel title="Call Your Shot" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>
              {shotEligibility.reason} — Choose one promise before Save &amp; Sim or Auto Prep. It saves with the weekly advance; hit it for fan-confidence gain, miss it and fan confidence drops in the recap receipt.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {declarations.map((decl) => (
                <button
                  key={decl.id}
                  type="button"
                  onClick={() => setShotDeclaration(shotDeclaration === decl.id ? null : decl.id)}
                  style={{
                    padding: '10px 12px',
                    border: `2px solid ${shotDeclaration === decl.id ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                    background: shotDeclaration === decl.id ? 'rgba(255, 215, 0, 0.1)' : 'var(--mfd-bg-2)',
                    color: shotDeclaration === decl.id ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'var(--mfd-font-mono)',
                    fontSize: '11px',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{decl.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>{decl.description}</div>
                </button>
              ))}
            </div>
            {shotDeclaration && (
              <PixelBadge variant="gold">SHOT CALLED: {declarations.find((d) => d.id === shotDeclaration)?.label}</PixelBadge>
            )}
          </div>
        </PixelPanel>
      )}

      <PixelPanel title="Prep Extras" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PREP_EXTRA_TABS.map((tab) => (
              <PixelButton
                key={tab.id}
                accent={prepExtrasTab === tab.id ? tab.accent : 'default'}
                onClick={() => setPrepExtrasTab(tab.id)}
              >
                {tab.label}
              </PixelButton>
            ))}
          </div>

          {prepExtrasTab === 'contingencies' ? (
            <ContingencyBuilder
              teamId={team.id}
              year={year}
              week={week}
              rules={contingencyRules}
              onChange={setContingencyRules}
            />
          ) : null}

          {prepExtrasTab === 'trick_plays' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="cyan">Selected {selectedTrickPlays.length}/{MAX_SELECTED_TRICK_PLAYS}</PixelBadge>
                <PixelBadge variant={availableTrickPlays.length > 0 ? 'green' : 'red'}>
                  {availableTrickPlays.length > 0 ? 'Coach unlocked' : 'Coach locked'}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                Selected calls enter the seeded live-drive simulation when situation, coach, and tendency checks align. Each selected
                play can fire only once per game; its outcome is saved in the broadcast and postgame receipt.
              </div>
              {availableTrickPlays.length === 0 ? (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  Your head coach does not currently have the gameplan rating or creativity traits needed to unlock the trick-play menu.
                </div>
              ) : (
                availableTrickPlays.map((play) => {
                  const selected = selectedTrickPlays.includes(play.id);
                  const atLimit = !selected && selectedTrickPlays.length >= MAX_SELECTED_TRICK_PLAYS;
                  return (
                    <button
                      key={play.id}
                      type="button"
                      disabled={atLimit}
                      onClick={() => toggleTrickPlay(play.id)}
                      style={{
                        padding: '10px 12px',
                        border: `2px solid ${selected ? 'var(--mfd-cyan)' : 'var(--mfd-border)'}`,
                        background: selected ? 'rgba(34, 211, 238, 0.08)' : 'var(--mfd-bg-2)',
                        color: selected ? 'var(--mfd-cyan)' : atLimit ? 'var(--mfd-text-dim)' : 'var(--mfd-text)',
                        textAlign: 'left',
                        cursor: atLimit ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ ...monoSm, color: 'inherit' }}>{play.name}</span>
                        <PixelBadge variant={selected ? 'cyan' : 'default'}>
                          Success {Math.round(play.successRate * 100)}%
                        </PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{play.commentary}</div>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          {prepExtrasTab === 'playbook' ? (
            <div style={autoGrid(280)}>
              <PixelPanel title="Offense Menu" accent="gold">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">{currentPlan.offensiveFocus.replaceAll('_', ' ')}</PixelBadge>
                    <PixelBadge variant="default">{filteredOffensivePlaybook.length} calls in package</PixelBadge>
                  </div>
                  {filteredOffensivePlaybook.map((play) => (
                    <div key={play.id} style={{ paddingBottom: '8px', borderBottom: '1px solid var(--mfd-border)' }}>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{play.name}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {play.category.toUpperCase()} // {play.commentary.replace('{{player}}', 'Ball carrier').replace('{{target}}', 'target')}
                      </div>
                    </div>
                  ))}
                </div>
              </PixelPanel>
              <PixelPanel title="Defense Menu" accent="cyan">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="cyan">{currentPlan.defensiveFocus.replaceAll('_', ' ')}</PixelBadge>
                    <PixelBadge variant="default">{filteredDefensivePlaybook.length} calls in package</PixelBadge>
                  </div>
                  {filteredDefensivePlaybook.map((play) => (
                    <div key={play.id} style={{ paddingBottom: '8px', borderBottom: '1px solid var(--mfd-border)' }}>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{play.name}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        Cover {play.coverageBonus} // Run {play.runStopBonus} // Pressure {play.pressureBonus}
                      </div>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            </div>
          ) : null}
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <PixelButton
          accent="gold"
          onClick={handleSkipWithAutoPrep}
        >
          Skip With Auto Prep
        </PixelButton>
        <PixelButton
          accent="green"
          onClick={handleSaveWeeklyPrepAndSim}
        >
          Save Weekly Prep &amp; Sim
        </PixelButton>
      </div>
    </div>
  );
}
