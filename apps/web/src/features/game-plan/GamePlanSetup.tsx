import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar, PixelSelect, MfdTooltip } from '@mfd/design-system/components';
import type { WeeklyPrepPlan, ShotDeclaration } from '@mfd/engine';
import { isCallYourShotEligible, getDeclarations } from '@mfd/engine';
import {
  selectCurrentOpponentIntel,
  selectCurrentOpponentReport,
  selectCurrentWeeklyPrepPlan,
  selectPhase,
  selectUserTeam,
  selectWeek,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

const PLAN_TOOLTIPS: Record<string, string> = {
  'Offensive Focus': 'Choose how your offense attacks. "Attack Secondary" targets the passing game, "Attack Front" emphasizes the run, "Feed Star" gives your best player extra touches.',
  'Defensive Focus': 'Set your defensive priority. "Stop Run" stacks the box, "Heat QB" sends extra blitzes, "Erase WR1" shadows their top receiver.',
  'Practice Intensity': 'Higher intensity boosts preparation but increases injury risk. Light is safest, Full Pads gives maximum readiness.',
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

export function GamePlanSetup() {
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const phase = useGameStore(selectPhase);
  const team = useGameStore(selectUserTeam);
  const report = useGameStore(selectCurrentOpponentReport);
  const intel = useGameStore(selectCurrentOpponentIntel);
  const storedPlan = useGameStore(selectCurrentWeeklyPrepPlan);
  const { advanceWeek, clearWeeklyPrepPlan, saveWeeklyPrepPlan } = useGameStore((state) => state.actions);

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
  const [shotDeclaration, setShotDeclaration] = useState<ShotDeclaration | null>(null);

  const shotEligibility = useMemo(() => {
    const isPlayoff = (phase as string) === 'playoffs' || (phase as string) === 'super_bowl';
    const isLateSeasonRivalry = week >= 14;
    return isCallYourShotEligible(isLateSeasonRivalry, false, isPlayoff, week);
  }, [phase, week]);
  const declarations = useMemo(() => getDeclarations(), []);

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

      <div style={autoGrid(260)}>
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
          <PixelPanel title="Offensive Focus" accent="gold">
            <PixelSelect
              value={offensiveFocus}
              onChange={(event) => setOffensiveFocus(event.target.value as WeeklyPrepPlan['offensiveFocus'])}
              options={offensiveOptions}
              accent="gold"
            />
            {intel && (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Intel says: {intel.attackLane === 'passing' ? 'Attack Secondary' : 'Attack Front'}
                {offensiveFocus === (intel.attackLane === 'passing' ? 'attack_secondary' : 'attack_front') && <PixelBadge variant="green">REC</PixelBadge>}
              </div>
            )}
          </PixelPanel>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Defensive Focus']} side="bottom">
          <PixelPanel title="Defensive Focus" accent="cyan">
            <PixelSelect
              value={defensiveFocus}
              onChange={(event) => setDefensiveFocus(event.target.value as WeeklyPrepPlan['defensiveFocus'])}
              options={defensiveOptions}
              accent="cyan"
            />
            {intel && (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Intel says: {intel.defendLane === 'passing' ? 'Limit Explosive' : 'Stop Run'}
                {defensiveFocus === (intel.defendLane === 'passing' ? 'limit_explosive' : 'stop_run') && <PixelBadge variant="green">REC</PixelBadge>}
              </div>
            )}
          </PixelPanel>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Practice Intensity']} side="bottom">
          <PixelPanel title="Practice Intensity" accent="default">
            <PixelSelect
              value={practiceIntensity}
              onChange={(event) => setPracticeIntensity(event.target.value as WeeklyPrepPlan['practiceIntensity'])}
              options={intensityOptions}
              accent="default"
            />
          </PixelPanel>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Snap Management']} side="bottom">
          <PixelPanel title="Snap Management" accent="default">
            <PixelSelect
              value={snapManagement}
              onChange={(event) => setSnapManagement(event.target.value as WeeklyPrepPlan['snapManagement'])}
              options={snapOptions}
              accent="default"
            />
          </PixelPanel>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Special Situation']} side="bottom">
          <PixelPanel title="Special Situation" accent="default">
            <PixelSelect
              value={specialSituation}
              onChange={(event) => setSpecialSituation(event.target.value as WeeklyPrepPlan['specialSituation'])}
              options={specialSituationOptions}
              accent="default"
            />
          </PixelPanel>
        </MfdTooltip>
        <MfdTooltip content={PLAN_TOOLTIPS['Key Matchup']} side="bottom">
          <PixelPanel title="Key Matchup" accent="green">
            <PixelSelect
              value={keyMatchupPlayerId}
              onChange={(event) => setKeyMatchupPlayerId(event.target.value)}
              options={[{ value: '', label: 'No matchup emphasis' }, ...matchupOptions]}
              accent="green"
            />
          </PixelPanel>
        </MfdTooltip>
      </div>

      <PixelPanel title="Prep Board Readout" accent="green">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelProgressBar
            label="Offensive alignment"
            value={offensiveFocus === 'attack_secondary' && intel.attackLane === 'passing'
              ? 88
              : offensiveFocus === 'attack_front' && intel.attackLane === 'rushing'
                ? 88
                : offensiveFocus === 'balanced'
                  ? 70
                  : 62}
            max={100}
            accent="gold"
            valueLabel={offensiveFocus.replaceAll('_', ' ')}
          />
          <PixelProgressBar
            label="Defensive alignment"
            value={defensiveFocus === 'limit_explosive' && intel.defendLane === 'passing'
              ? 88
              : defensiveFocus === 'stop_run' && intel.defendLane === 'rushing'
                ? 88
                : defensiveFocus === 'balanced'
                  ? 70
                  : 62}
            max={100}
            accent="cyan"
            valueLabel={defensiveFocus.replaceAll('_', ' ')}
          />
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Stored plan status: {storedPlan ? 'weekly prep locked' : 'no prep saved yet'}
          </div>
        </div>
      </PixelPanel>

      {shotEligibility.eligible && (
        <PixelPanel title="Call Your Shot" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>
              {shotEligibility.reason} — Make a bold prediction and earn bonus morale if you deliver.
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

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <PixelButton
          accent="gold"
          onClick={() => {
            void clearWeeklyPrepPlan();
            void advanceWeek();
          }}
        >
          Skip With Auto Prep
        </PixelButton>
        <PixelButton
          accent="green"
          onClick={() => {
            void saveWeeklyPrepPlan(currentPlan, report);
            void advanceWeek();
          }}
        >
          Save Weekly Prep &amp; Sim
        </PixelButton>
      </div>
    </div>
  );
}
