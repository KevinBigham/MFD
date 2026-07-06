import { useMemo, useState } from 'react';
import {
  DIFF_SETTINGS,
  buildTeamOpsImpactReceipt,
  getFacilityLevelEffect,
  validateGameState,
  type DifficultyLevel,
  type Facility,
  type FacilityEffect,
  type FacilityState,
  type MedicalStaff,
  type TeamOpsImpactTone,
} from '@mfd/engine';
import { useAudio } from '../audio/AudioManager';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSwitch,
} from '@mfd/design-system/components';
import {
  selectDifficultyState,
  selectFacilities,
  selectMedicalStaff,
  selectPhase,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { AudioSettings } from './AudioSettings';

const difficultyOrder: DifficultyLevel[] = ['rookie', 'pro', 'allpro', 'legend'];
const simSpeeds = ['fast', 'normal', 'detailed'] as const;

const facilityLabels: Record<string, string> = {
  training_complex: 'Training Complex',
  medical_center: 'Medical Center',
  film_room: 'Film Room',
  weight_room: 'Weight Room',
  recovery_suite: 'Recovery Suite',
};

function formatMultiplier(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(2) : '--';
}

function facilityEffectCopy(type: string, effect?: Partial<FacilityEffect>): string {
  if (!effect) return 'Effect unavailable';
  if (type === 'training_complex') return `Training XP x${formatMultiplier(effect.trainingXPBonus)} // Morale x${formatMultiplier(effect.moraleBonus)}`;
  if (type === 'medical_center') return `Recovery x${formatMultiplier(effect.recoveryBonus)} // Injury risk x${formatMultiplier(effect.injuryPreventionBonus)}`;
  if (type === 'film_room') return `Scouting x${formatMultiplier(effect.scoutingBonus)} // Morale x${formatMultiplier(effect.moraleBonus)}`;
  if (type === 'weight_room') return `Training XP x${formatMultiplier(effect.trainingXPBonus)} // Fatigue gain x${formatMultiplier(effect.fatigueGainBonus)}`;
  return `Injury risk x${formatMultiplier(effect.injuryPreventionBonus)} // Morale x${formatMultiplier(effect.moraleBonus)}`;
}

function formatDelta(current: number, next: number, inverse = false): string {
  const delta = inverse ? current - next : next - current;
  const pct = Math.round(delta * 1000) / 10;
  if (pct === 0) return 'no change';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function facilityUpgradeDeltaCopy(type: string, current: FacilityEffect, next: FacilityEffect): string {
  if (type === 'training_complex') {
    return `Training XP ${formatDelta(current.trainingXPBonus, next.trainingXPBonus)} // morale ${formatDelta(current.moraleBonus, next.moraleBonus)}`;
  }
  if (type === 'medical_center') {
    return `Recovery ${formatDelta(current.recoveryBonus, next.recoveryBonus)} // injury prevention ${formatDelta(current.injuryPreventionBonus, next.injuryPreventionBonus, true)}`;
  }
  if (type === 'film_room') {
    return `Scouting ${formatDelta(current.scoutingBonus, next.scoutingBonus)} // morale ${formatDelta(current.moraleBonus, next.moraleBonus)}`;
  }
  if (type === 'weight_room') {
    return `Training XP ${formatDelta(current.trainingXPBonus, next.trainingXPBonus)} // fatigue gain ${formatDelta(current.fatigueGainBonus, next.fatigueGainBonus, true)}`;
  }
  return `Injury risk ${formatDelta(current.injuryPreventionBonus, next.injuryPreventionBonus, true)} // morale ${formatDelta(current.moraleBonus, next.moraleBonus)}`;
}

export interface FacilityUpgradeForecast {
  status: 'upgrade_ready' | 'budget_blocked' | 'maxed';
  label: string;
  accent: 'green' | 'gold' | 'cyan' | 'default';
  nextLevelLabel: string;
  costLabel: string;
  budgetAfterLabel: string;
  impact: string;
  source: string;
}

export function buildFacilityUpgradeForecast(facility: Facility, facilityState: FacilityState): FacilityUpgradeForecast {
  if (facility.level >= 3) {
    return {
      status: 'maxed',
      label: 'Maxed out',
      accent: 'default',
      nextLevelLabel: 'Level 3 ceiling reached',
      costLabel: 'No upgrade available',
      budgetAfterLabel: `$${facilityState.budget} budget remains`,
      impact: facilityEffectCopy(facility.type, facility.effect),
      source: 'Source: saved team.facilityState and facility.effect; no upgradeFacility call until the button is clicked.',
    };
  }

  const upgradeCost = facilityState.upgradeCosts[facility.type][facility.level - 1] ?? 0;
  const nextLevel = (facility.level + 1) as 2 | 3;
  const nextEffect = getFacilityLevelEffect(facility.type, nextLevel);
  const affordable = facilityState.budget >= upgradeCost;

  return {
    status: affordable ? 'upgrade_ready' : 'budget_blocked',
    label: affordable ? 'Upgrade ready' : 'Budget blocked',
    accent: affordable ? 'gold' : 'default',
    nextLevelLabel: `Level ${facility.level} -> ${nextLevel}`,
    costLabel: `$${upgradeCost} cost`,
    budgetAfterLabel: affordable
      ? `$${Number((facilityState.budget - upgradeCost).toFixed(2))} after upgrade`
      : `$${facilityState.budget} available`,
    impact: facilityUpgradeDeltaCopy(facility.type, facility.effect, nextEffect),
    source: 'Source: saved team.facilityState plus getFacilityLevelEffect; the Upgrade button is the only action that saves this change.',
  };
}

export interface MedicalStaffHireForecast {
  status: 'hire_ready' | 'phase_locked';
  label: string;
  accent: 'gold' | 'cyan' | 'default';
  recoveryImpact: string;
  preventionImpact: string;
  salaryLabel: string;
  source: string;
}

export function buildMedicalStaffHireForecast(
  candidate: MedicalStaff,
  context: {
    current: MedicalStaff | null;
    phase: string;
  },
): MedicalStaffHireForecast {
  const current = context.current ?? {
    id: 'league-average',
    name: 'League Average Medical Team',
    tier: 'average',
    salary: 0,
    recoveryBonus: 1,
    preventionBonus: 1,
  } satisfies MedicalStaff;
  const hiringOpen = context.phase === 'offseason';

  return {
    status: hiringOpen ? 'hire_ready' : 'phase_locked',
    label: hiringOpen ? 'Hire ready' : 'Offseason gate',
    accent: hiringOpen ? 'cyan' : 'default',
    recoveryImpact: `Recovery time ${formatDelta(current.recoveryBonus, candidate.recoveryBonus, true)}`,
    preventionImpact: `Injury risk ${formatDelta(current.preventionBonus, candidate.preventionBonus, true)}`,
    salaryLabel: `$${candidate.salary.toFixed(1)}M salary`,
    source: 'Source: availableMedicalStaff candidate plus saved team.medicalStaff; the Hire button is the only action that saves this change.',
  };
}

type SettingsReceiptAccent = 'green' | 'gold' | 'cyan' | 'red' | 'default';
type SettingsReceiptAction = 'facility_upgrade' | 'medical_hire';

export interface SettingsActionReceipt {
  id: string;
  title: string;
  accent: SettingsReceiptAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
}

export function buildSettingsActionReceipt(args: {
  action: SettingsReceiptAction;
  teamName: string;
  facilityType?: string;
  facilityLabel?: string;
  fromLevel?: number;
  nextLevelLabel?: string;
  costLabel?: string;
  budgetAfterLabel?: string;
  impact?: string;
  staffId?: string;
  staffName?: string;
  staffTier?: MedicalStaff['tier'];
  previousStaffName?: string | null;
  salaryLabel?: string;
  recoveryImpact?: string;
  preventionImpact?: string;
}): SettingsActionReceipt {
  if (args.action === 'facility_upgrade') {
    const facilityLabel = args.facilityLabel ?? args.facilityType ?? 'Facility';
    return {
      id: `settings:facility:${args.facilityType ?? facilityLabel}:${args.fromLevel ?? 'current'}`,
      title: 'Facility Upgrade Processed',
      accent: 'gold',
      target: `${facilityLabel} // ${args.teamName}`,
      result: `${facilityLabel} upgrade resolved from Level ${args.fromLevel ?? '?'} using ${args.costLabel ?? 'the saved upgrade cost'}. ${args.nextLevelLabel ?? 'Next level applied'}; ${args.budgetAfterLabel ?? 'facility budget refreshed after commit'}. Impact preview before commit: ${args.impact ?? 'saved facility effect refreshed'}.`,
      stateTouched: 'team.facilityState budget, facility level/effect, and autosave through the existing store commit.',
      source: 'actions.upgradeFacility -> upgradeFacilityEngine -> commitGame',
      boundary: 'This confirmation does not run progression, training camp, injury recovery, scouting, week advance, game-result math, saved outcomes, facility formula recalculation beyond the existing helper, or a separate confirmation log.',
    };
  }

  return {
    id: `settings:medical:${args.staffId ?? args.staffName ?? 'staff'}`,
    title: 'Medical Staff Hire Processed',
    accent: 'cyan',
    target: `${args.staffName ?? 'Medical staff'} // ${args.staffTier ?? 'candidate'} // ${args.teamName}`,
    result: `${args.staffName ?? 'The selected staffer'} was hired from the offseason candidate pool. Previous staff: ${args.previousStaffName ?? 'none'}. ${args.salaryLabel ?? 'Salary saved on the staff record'}; ${args.recoveryImpact ?? 'recovery context refreshed'} // ${args.preventionImpact ?? 'injury-prevention context refreshed'}.`,
    stateTouched: 'team.medicalStaff, game.availableMedicalStaff candidate pool including prior staff return when present, and autosave through the existing store commit.',
    source: 'actions.hireMedicalStaff -> hireMedicalStaffEngine -> commitGame',
    boundary: 'This confirmation does not refresh the medical pool, process injury recovery, change injury formulas, run training camp, advance the offseason, reroll saved outcomes, or save a separate confirmation log.',
  };
}

export function SettingsActionReceiptPanel({ receipt }: { receipt: SettingsActionReceipt }) {
  return (
    <PixelPanel title="Operations Action Receipt" accent={receipt.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>{receipt.title}</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{receipt.target}</div>
        <div style={autoGrid(220)}>
          {[
            { label: 'Result', detail: receipt.result, accent: receipt.accent },
            { label: 'Changed now', detail: receipt.stateTouched, accent: 'gold' as const },
            { label: 'Action used', detail: receipt.source, accent: 'cyan' as const },
            { label: 'Did not also', detail: receipt.boundary, accent: 'green' as const },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

function toneAccent(tone: TeamOpsImpactTone): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (tone === 'positive') return 'green';
  if (tone === 'warning') return 'gold';
  if (tone === 'negative') return 'red';
  return 'cyan';
}

function isDebugModeEnabled(): boolean {
  const locationRef = typeof window !== 'undefined'
    ? window.location
    : typeof globalThis.location !== 'undefined'
      ? globalThis.location
      : null;
  if (!locationRef) return false;
  if (new URLSearchParams(locationRef.search).get('debug') === '1') return true;
  const hashQuery = locationRef.hash.includes('?') ? locationRef.hash.split('?')[1] ?? '' : '';
  return new URLSearchParams(hashQuery).get('debug') === '1';
}

export function Settings() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const difficulty = useGameStore((state) => state.game?.difficulty ?? 'pro');
  const halftimeDecisions = useGameStore((state) => state.game?.settings.halftimeDecisions ?? (difficulty === 'rookie' ? 'off' : 'on'));
  const difficultyState = useGameStore(selectDifficultyState);
  const facilities = useGameStore(selectFacilities);
  const medicalStaff = useGameStore(selectMedicalStaff);
  const phase = useGameStore(selectPhase);
  const setDifficulty = useGameStore((state) => state.actions.setDifficulty);
  const setHalftimeDecisions = useGameStore((state) => state.actions.setHalftimeDecisions);
  const setAdaptiveDifficultyEnabled = useGameStore((state) => state.actions.setAdaptiveDifficultyEnabled);
  const upgradeFacility = useGameStore((state) => state.actions.upgradeFacility);
  const hireMedicalStaff = useGameStore((state) => state.actions.hireMedicalStaff);
  const autosaveEnabled = useUiStore((state) => state.autosaveEnabled);
  const setAutosaveEnabled = useUiStore((state) => state.setAutosaveEnabled);
  const simSpeed = useUiStore((state) => state.simSpeed);
  const setSimSpeed = useUiStore((state) => state.setSimSpeed);
  const audio = useAudio();
  const currentMedical = medicalStaff.current;
  const availableMedicalStaff = medicalStaff.available;
  const medicalHiringOpen = phase === 'offseason';
  const teamName = team ? [team.city, team.name].filter(Boolean).join(' ') || team.name : 'Franchise';
  const [actionReceipt, setActionReceipt] = useState<SettingsActionReceipt | null>(null);
  const debugModeEnabled = isDebugModeEnabled();
  const invariantResult = useMemo(
    () => (debugModeEnabled && game ? validateGameState(game) : null),
    [debugModeEnabled, game],
  );
  const teamOpsReceipt = useMemo(
    () => (game && team ? buildTeamOpsImpactReceipt(game, team.id) : null),
    [game, team],
  );

  const handleUpgradeFacility = async (facility: Facility, forecast: FacilityUpgradeForecast) => {
    if (!team || forecast.status !== 'upgrade_ready') return;
    await upgradeFacility(team.id, facility.type);
    setActionReceipt(buildSettingsActionReceipt({
      action: 'facility_upgrade',
      teamName,
      facilityType: facility.type,
      facilityLabel: facilityLabels[facility.type] ?? facility.type,
      fromLevel: facility.level,
      nextLevelLabel: forecast.nextLevelLabel,
      costLabel: forecast.costLabel,
      budgetAfterLabel: forecast.budgetAfterLabel,
      impact: forecast.impact,
    }));
  };

  const handleHireMedicalStaff = async (staff: MedicalStaff, forecast: MedicalStaffHireForecast) => {
    if (!team || !medicalHiringOpen) return;
    await hireMedicalStaff(team.id, staff.id);
    setActionReceipt(buildSettingsActionReceipt({
      action: 'medical_hire',
      teamName,
      staffId: staff.id,
      staffName: staff.name,
      staffTier: staff.tier,
      previousStaffName: currentMedical?.name ?? null,
      salaryLabel: forecast.salaryLabel,
      recoveryImpact: forecast.recoveryImpact,
      preventionImpact: forecast.preventionImpact,
    }));
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Settings"
        subtitle="Difficulty, autosave behavior, sim pacing, and studio identity all in one control room."
        badges={(
          <>
            <PixelBadge variant="gold">{DIFF_SETTINGS[difficulty].name}</PixelBadge>
            <PixelBadge variant={autosaveEnabled ? 'green' : 'red'}>
              Autosave {autosaveEnabled ? 'On' : 'Off'}
            </PixelBadge>
            <PixelBadge variant={difficultyState.enabled ? 'cyan' : 'default'}>
              Adaptive {difficultyState.enabled ? 'On' : 'Off'}
            </PixelBadge>
            <PixelBadge variant="green">
              Facilities ${facilities.budget}
            </PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Difficulty" value={DIFF_SETTINGS[difficulty].name} accent="gold" detail={DIFF_SETTINGS[difficulty].desc} />
        <PixelMetricCard label="Autosave" value={autosaveEnabled ? 'ON' : 'OFF'} accent={autosaveEnabled ? 'green' : 'red'} detail="Apply to weekly advances and state-changing actions" />
        <PixelMetricCard label="Sim Speed" value={simSpeed.toUpperCase()} accent="cyan" detail="UI preference stored locally, outside the save file" />
        <PixelMetricCard label="Halftime Hell" value={halftimeDecisions.toUpperCase()} accent={halftimeDecisions === 'on' ? 'gold' : 'default'} detail={difficulty === 'rookie' ? 'Locked off on rookie difficulty' : 'Saved with the dynasty and interrupts user games'} />
        <PixelMetricCard
          label="Adaptive Difficulty"
          value={difficultyState.enabled ? 'ON' : 'OFF'}
          accent={difficultyState.enabled ? 'cyan' : 'default'}
          detail={difficultyState.enabled
            ? `League slider ${difficultyState.adaptiveSlider}/100`
            : 'Fixed difficulty — AI teams play at their natural level'}
        />
        <PixelMetricCard
          label="Facility Budget"
          value={`$${facilities.budget}`}
          accent={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}
          detail="Available for upgrades at any point in the season"
        />
        <PixelMetricCard
          label="Medical Staff"
          value={currentMedical?.tier.toUpperCase() ?? 'NONE'}
          accent={currentMedical?.tier === 'elite' ? 'gold' : currentMedical ? 'cyan' : 'red'}
          detail={currentMedical ? currentMedical.name : medicalHiringOpen ? 'Hire from the offseason pool below' : 'Hiring reopens during the offseason'}
        />
      </div>

      {teamOpsReceipt ? (
        <PixelPanel title="Team Ops Impact" accent="green">
          <div style={autoGrid(180)}>
            {teamOpsReceipt.summaryItems.map((item) => (
              <PixelMetricCard
                key={item.id}
                label={item.label}
                value={item.value}
                accent={toneAccent(item.tone)}
                detail={item.detail}
              />
            ))}
          </div>
          {teamOpsReceipt.mentors.topEffects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {teamOpsReceipt.mentors.topEffects.slice(0, 3).map((effect) => (
                <div key={effect.targetPlayerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '8px 10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{effect.description}</span>
                  <PixelBadge variant="green">+{(effect.devBonus * 100).toFixed(0)}% DEV</PixelBadge>
                </div>
              ))}
            </div>
          ) : null}
        </PixelPanel>
      ) : null}

      {actionReceipt ? <SettingsActionReceiptPanel receipt={actionReceipt} /> : null}

      <div data-spotlight-target="chip.route.settings.beat-2">
        <PixelPanel title="Operations Source" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                <span style={{ ...monoSm, color: '#fff' }}>Facility source</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  Rows read saved facility levels, saved budget, and each saved facility.effect from the user team.
                </span>
              </div>
              <PixelBadge variant="gold">team.facilityState</PixelBadge>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                <span style={{ ...monoSm, color: '#fff' }}>Upgrade commit</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  Upgrade buttons call the existing store action and engine helper; this screen does not run progression or training camp math.
                </span>
              </div>
              <PixelBadge variant="default">upgradeFacility</PixelBadge>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                <span style={{ ...monoSm, color: '#fff' }}>Medical source</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  Current staff is saved on the user team; candidates come from the game-level availableMedicalStaff pool.
                </span>
              </div>
              <PixelBadge variant={medicalHiringOpen ? 'cyan' : 'default'}>
                team.medicalStaff
              </PixelBadge>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                <span style={{ ...monoSm, color: '#fff' }}>Hiring gate</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  The button state mirrors hireMedicalStaff's offseason gate; rendering does not refresh the pool or process injury recovery.
                </span>
              </div>
              <PixelBadge variant={medicalHiringOpen ? 'gold' : 'default'}>
                {medicalHiringOpen ? 'offseason open' : 'offseason only'}
              </PixelBadge>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
                <span style={{ ...monoSm, color: '#fff' }}>Receipt source</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  Team Ops Impact reuses buildTeamOpsImpactReceipt for facility aggregate, recovery estimate, mentor reach, and saved camp receipts.
                </span>
              </div>
              <PixelBadge variant="green">read-only receipt</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Difficulty" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {difficultyOrder.map((level) => {
            const config = DIFF_SETTINGS[level];
            return (
              <div key={level} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{config.name}</span>
                    <PixelBadge variant={level === difficulty ? 'gold' : 'default'}>{level}</PixelBadge>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{config.desc}</span>
                </div>
                <PixelButton type="button" accent={level === difficulty ? 'gold' : 'default'} onClick={() => void setDifficulty(level)}>
                  {level === difficulty ? 'Current' : 'Set Difficulty'}
                </PixelButton>
              </div>
            );
          })}
        </div>
      </PixelPanel>

      <div style={autoGrid(320)}>
        <div data-spotlight-target="chip.route.settings.beat-1">
          <PixelPanel title="Simulation Preferences" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSwitch
              checked={difficultyState.enabled}
              accent="cyan"
              label="Adaptive Difficulty"
              description={difficultyState.enabled
                ? 'AI teams subtly adjust to your performance. Winning streaks get tougher, losing streaks get gentler.'
                : 'Fixed difficulty — AI teams play at their natural level'}
              onChange={(checked) => { void setAdaptiveDifficultyEnabled(checked); }}
            />

            <PixelSwitch
              checked={halftimeDecisions === 'on'}
              disabled={difficulty === 'rookie'}
              accent="gold"
              label="Halftime Hell"
              description={difficulty === 'rookie'
                ? 'Rookie difficulty keeps halftime decisions off to avoid extra interruption.'
                : 'Pause user games at halftime for a stick, switch, or gamble decision.'}
              onChange={(checked) => { void setHalftimeDecisions(checked ? 'on' : 'off'); }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ ...monoSm, color: '#fff' }}>Autosave</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Disable for manual save control during testing.
                </span>
              </div>
              <PixelButton
                type="button"
                accent={autosaveEnabled ? 'green' : 'red'}
                onClick={() => setAutosaveEnabled(!autosaveEnabled)}
              >
                {autosaveEnabled ? 'Disable Autosave' : 'Enable Autosave'}
              </PixelButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Sim Speed</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {simSpeeds.map((speed) => (
                  <PixelButton
                    key={speed}
                    type="button"
                    accent={speed === simSpeed ? 'cyan' : 'default'}
                    onClick={() => setSimSpeed(speed)}
                  >
                    {speed}
                  </PixelButton>
                ))}
              </div>
            </div>
          </div>
          </PixelPanel>
        </div>

        {/* Legacy convention-test anchors: Mute Audio / Unmute Audio / audio.setVolume */}
        <AudioSettings
          audio={audio}
          title="Audio"
          type="range"
          previewLabel="Test Sound"
          onTestSound={() => audio.play('notification')}
        />

        <PixelPanel title="About" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ ...monoSm, color: '#fff' }}>Mr. Football Dynasty</span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Browser dynasty simulation built for long-horizon franchise storytelling, roster economics, and repeatable seeded outcomes.
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">8-Bit ESPN</PixelBadge>
              <PixelBadge variant="cyan">Seeded Engine</PixelBadge>
              <PixelBadge variant="green">Dynasty Legacy</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(360)}>
        <PixelPanel title="Facilities" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Budget Remaining</span>
              <PixelBadge variant={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}>
                ${facilities.budget}
              </PixelBadge>
            </div>
            {facilities.facilities.map((facility) => {
              const upgradeCost = facility.level >= 3 ? null : facilities.upgradeCosts[facility.type][facility.level - 1] ?? null;
              const canUpgrade = upgradeCost !== null && facilities.budget >= upgradeCost && team;
              const forecast = buildFacilityUpgradeForecast(facility, facilities);
              return (
                <div
                  key={facility.type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '10px',
                    border: '3px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ ...monoSm, color: '#fff' }}>{facilityLabels[facility.type] ?? facility.type}</span>
                      <PixelBadge variant={facility.level === 3 ? 'gold' : 'cyan'}>{`L${facility.level}`}</PixelBadge>
                    </div>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {facilityEffectCopy(facility.type, facility.effect)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', padding: '8px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <PixelBadge variant={forecast.accent}>Upgrade Forecast</PixelBadge>
                        <PixelBadge variant={forecast.accent}>{forecast.label}</PixelBadge>
                        <PixelBadge variant="cyan">{forecast.nextLevelLabel}</PixelBadge>
                      </div>
                      <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                        {forecast.impact}
                      </span>
                      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {forecast.costLabel} // {forecast.budgetAfterLabel}
                      </span>
                      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                        {forecast.source}
                      </span>
                    </div>
                  </div>
                  <PixelButton
                    type="button"
                    accent={canUpgrade ? 'gold' : 'default'}
                    disabled={!canUpgrade}
                    onClick={() => { void handleUpgradeFacility(facility, forecast); }}
                  >
                    {facility.level >= 3 ? 'Maxed' : `Upgrade ${upgradeCost !== null ? `($${upgradeCost})` : ''}`}
                  </PixelButton>
                </div>
              );
            })}
          </div>
        </PixelPanel>

        <PixelPanel title="Medical Staff" accent={medicalHiringOpen ? 'cyan' : 'default'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentMedical ? (
              <div style={{ padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...monoSm, color: '#fff' }}>{currentMedical.name}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {currentMedical.tier} // recovery x{currentMedical.recoveryBonus.toFixed(2)} // prevention x{currentMedical.preventionBonus.toFixed(2)}
                    </div>
                  </div>
                  <PixelBadge variant={currentMedical.tier === 'elite' ? 'gold' : currentMedical.tier === 'good' ? 'cyan' : 'default'}>
                    {currentMedical.tier}
                  </PixelBadge>
                </div>
              </div>
            ) : (
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                No medical lead is assigned right now. Average league treatment will hold until you make a hire.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Available Pool</span>
              <PixelBadge variant={medicalHiringOpen ? 'gold' : 'default'}>
                {medicalHiringOpen ? 'Offseason Open' : 'Offseason Only'}
              </PixelBadge>
            </div>

            {availableMedicalStaff.length === 0 ? (
              <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
                {medicalHiringOpen
                  ? 'No staff remain in the current hiring pool.'
                  : 'Medical hiring opens in the offseason when the league refreshes the candidate pool.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableMedicalStaff.slice(0, 5).map((staff) => {
                  const hireForecast = buildMedicalStaffHireForecast(staff, {
                    current: currentMedical,
                    phase,
                  });
                  return (
                    <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px', flex: 1 }}>
                        <div>
                          <div style={{ ...monoSm, color: '#fff' }}>{staff.name}</div>
                          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                            {staff.tier} // recovery x{staff.recoveryBonus.toFixed(2)} // prevention x{staff.preventionBonus.toFixed(2)} // ${staff.salary.toFixed(1)}M
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <PixelBadge variant={hireForecast.accent}>Hiring Forecast</PixelBadge>
                            <PixelBadge variant={hireForecast.accent}>{hireForecast.label}</PixelBadge>
                            <PixelBadge variant="gold">{hireForecast.salaryLabel}</PixelBadge>
                          </div>
                          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                            {hireForecast.recoveryImpact} // {hireForecast.preventionImpact}
                          </span>
                          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                            {hireForecast.source}
                          </span>
                        </div>
                      </div>
                      <PixelButton
                        type="button"
                        accent={medicalHiringOpen ? 'cyan' : 'default'}
                        disabled={!medicalHiringOpen || !team}
                        onClick={() => { void handleHireMedicalStaff(staff, hireForecast); }}
                      >
                        Hire Staff
                      </PixelButton>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PixelPanel>
      </div>

      {debugModeEnabled && invariantResult ? (
        <PixelPanel title="Invariant Debug" accent={invariantResult.valid ? 'green' : 'red'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={invariantResult.valid ? 'green' : 'red'}>
                {invariantResult.valid ? 'State Clean' : `${invariantResult.violations.length} Violations`}
              </PixelBadge>
              <PixelBadge variant="default">Developer only</PixelBadge>
            </div>
            {invariantResult.valid ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                No invariant violations detected in the loaded save.
              </div>
            ) : (
              invariantResult.violations.map((violation, index) => (
                <div
                  key={`${violation.rule}-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px',
                    border: '2px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <PixelBadge variant={
                      violation.severity === 'critical' || violation.severity === 'high'
                        ? 'red'
                        : violation.severity === 'medium'
                          ? 'gold'
                          : 'default'
                    }
                    >
                      {violation.severity}
                    </PixelBadge>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{violation.rule}</span>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{violation.message}</div>
                </div>
              ))
            )}
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
