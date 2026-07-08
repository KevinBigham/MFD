import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelNav,
  PixelPanel,
  PixelProgressBar,
  PixelSelect,
} from '@mfd/design-system/components';
import {
  buildCoachRetentionDecision,
  CLINIC_TRACKS,
  DEF_SCHEMES,
  earnXP,
  generateCoachingStaffReport,
  getCoachArchetype,
  getTreeKey,
  OFF_SCHEMES,
  projectSchemeTransition,
  SKILL_TREES,
  type ClinicState,
  type ClinicTrack,
  type CoachSkillSelection,
  type CoachingMarketState,
  type PositionCoach,
  type PositionCoachRole,
  type PositionCoachStaff,
  type SchemeInstallState,
  type SkillBranch,
  type SkillTier,
  type StaffCandidate,
  type StaffMember,
  type StaffRole,
  type Team,
} from '@mfd/engine';
import {
  selectClinic,
  selectCoachingMarket,
  selectCoachingStaff,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

type CoachingTab = 'staff' | 'scheme' | 'development';
type CoachingSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface CoachingSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: CoachingSourceAccent;
}

interface CoachingDecisionReceiptRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: CoachingSourceAccent;
}

export interface ClinicRunReceipt {
  trackLabel: string;
  beforeXp: number;
  afterXp: number;
  amount: number;
  unlockedPerks: string[];
  source: string;
}

export interface SkillActivationReceipt {
  coachName: string;
  branchName: string;
  tier: number;
  tierLabel: string;
  previousSelection: string;
  source: string;
}

export interface PositionCoachLifecycleReceipt {
  id: string;
  actionLabel: string;
  roleLabel: string;
  beforeLabel: string;
  afterLabel: string;
  detail: string;
  source: string;
}

function accentForFit(score: number): 'default' | 'green' | 'cyan' | 'gold' | 'red' {
  if (score >= 84) return 'green';
  if (score >= 76) return 'cyan';
  if (score >= 68) return 'gold';
  return 'red';
}

function accentForRisk(poachRisk: number): 'default' | 'green' | 'cyan' | 'gold' | 'red' {
  if (poachRisk < 30) return 'green';
  if (poachRisk < 45) return 'cyan';
  if (poachRisk < 60) return 'gold';
  return 'red';
}

function CoachPanel({
  coach,
  role,
  onFire,
  onPromote,
  retention,
}: {
  coach: StaffMember | null | undefined;
  role: StaffRole;
  onFire: () => void;
  onPromote?: () => void;
  retention: ReturnType<typeof buildCoachRetentionDecision> | null;
}) {
  if (!coach) {
    return (
      <PixelPanel title={`${role} Seat`} accent="red">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Vacant role. Hire from the market board to restore continuity.</span>
        </div>
      </PixelPanel>
    );
  }

  const ratings = Object.entries(coach.ratings).sort(([left], [right]) => left.localeCompare(right));
  const archetypeContent = getCoachArchetype(coach.archetype);
  const archetypeLine = archetypeContent?.press_conference[0] ?? null;

  return (
    <PixelPanel title={`${role}: ${coach.name}`} accent={role === 'HC' ? 'gold' : 'cyan'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{coach.archetype}</PixelBadge>
          <PixelBadge variant="cyan">LVL {coach.level}</PixelBadge>
          <PixelBadge variant="default">TERM {coach.term ?? 0}</PixelBadge>
          <PixelBadge variant={accentForRisk(retention?.poachRisk ?? 40)}>
            {retention ? `POACH ${retention.poachRisk}` : 'STABLE'}
          </PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Loyalty {coach.loyalty ?? 0} // Ambition {coach.ambition ?? 0}
          {' // '}
          Lean {coach.schemeLean?.offense ?? 'balanced'} / {coach.schemeLean?.defense ?? 'cover_3'}
        </div>
        {archetypeLine ? (
          <div style={{
            ...monoSm,
            color: 'var(--mfd-text)',
            lineHeight: 1.6,
            paddingLeft: '10px',
            borderLeft: '3px solid var(--mfd-cyan)',
          }}
          >
            Profile Tape: {archetypeLine}
          </div>
        ) : null}
        {retention ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{retention.reasoning}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ratings.map(([label, value]) => (
            <PixelProgressBar
              key={label}
              label={label.replace(/([A-Z])/g, ' $1').trim()}
              value={value}
              max={100}
              accent={accentForFit(value)}
              valueLabel={`${value}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onPromote ? (
            <PixelButton accent="gold" onClick={onPromote}>Promote To HC</PixelButton>
          ) : null}
          <PixelButton accent="red" onClick={onFire}>Fire</PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}

function CandidateCard({
  role,
  candidate,
  onHire,
}: {
  role: StaffRole;
  candidate: StaffCandidate;
  onHire: () => void;
}) {
  const archetypeContent = getCoachArchetype(candidate.archetype);
  const archetypeLine = archetypeContent?.press_conference[0] ?? null;

  return (
    <PixelPanel title={`${candidate.name} // ${role}`} accent={accentForFit(candidate.fitScore)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={accentForFit(candidate.fitScore)}>{candidate.fitScore} FIT</PixelBadge>
          <PixelBadge variant="gold">{candidate.archetype}</PixelBadge>
          <PixelBadge variant="default">{candidate.continuityTag}</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          {candidate.schemeLean?.offense ?? 'balanced'} / {candidate.schemeLean?.defense ?? 'cover_3'}
          {' // '}
          Loyalty {candidate.loyalty ?? 0} // Ambition {candidate.ambition ?? 0}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {candidate.reasoning.slice(0, 2).map((line) => (
            <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
          ))}
        </div>
        {archetypeLine ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
            Profile Tape: {archetypeLine}
          </div>
        ) : null}
        <PixelButton accent="green" onClick={onHire}>Hire</PixelButton>
      </div>
    </PixelPanel>
  );
}

function roleLabel(role: StaffRole): string {
  if (role === 'HC') return 'Head coach';
  if (role === 'OC') return 'Offense';
  return 'Defense';
}

function bestMarketCandidate(market: CoachingMarketState): { role: StaffRole; candidate: StaffCandidate } | null {
  const candidates = (['HC', 'OC', 'DC'] as const)
    .flatMap((role) => market.candidates[role].map((candidate) => ({ role, candidate })));
  return candidates.sort((left, right) => right.candidate.fitScore - left.candidate.fitScore || left.candidate.name.localeCompare(right.candidate.name))[0] ?? null;
}

function highestRetentionRisk(retention: Record<'hc' | 'oc' | 'dc', ReturnType<typeof buildCoachRetentionDecision> | null>) {
  return Object.values(retention)
    .filter((decision): decision is NonNullable<typeof decision> => Boolean(decision))
    .sort((left, right) => right.poachRisk - left.poachRisk)[0] ?? null;
}

function activeClinicTrackCount(clinic: ClinicState | null | undefined): number {
  return Object.values(clinic?.xp ?? {}).filter((xp) => xp > 0).length;
}

export function buildClinicRunReceipt(
  track: ClinicTrack,
  before: ClinicState | null | undefined,
  after: ClinicState | null | undefined,
  amount: number,
): ClinicRunReceipt {
  const beforeXp = before?.xp[track.id] ?? 0;
  const afterXp = after?.xp[track.id] ?? beforeXp;
  const beforePerks = new Set(before?.perks ?? []);
  const afterPerks = new Set(after?.perks ?? []);
  const unlockedPerks = track.perks
    .filter((perk) => !beforePerks.has(perk.id) && afterPerks.has(perk.id))
    .map((perk) => perk.name);

  return {
    trackLabel: track.label,
    beforeXp,
    afterXp,
    amount,
    unlockedPerks,
    source: 'Run Clinic calls actions.addClinicXP, which clones and commits saved team.clinic; this confirmation appears here only.',
  };
}

export function buildSkillActivationReceipt({
  coachName,
  branch,
  tier,
  previousSelection,
}: {
  coachName: string;
  branch: SkillBranch;
  tier: number;
  previousSelection: CoachSkillSelection | null | undefined;
}): SkillActivationReceipt {
  const tierDef = branch.tiers[tier - 1] as SkillTier | undefined;
  const previousLabel = previousSelection
    ? `${previousSelection.branch} T${previousSelection.tier}`
    : 'No active branch';

  return {
    coachName,
    branchName: branch.name,
    tier,
    tierLabel: tierDef?.label ?? `Tier ${tier}`,
    previousSelection: previousLabel,
    source: 'Activate tier calls actions.setHeadCoachSkillSelection, which clones and commits saved team.skillSelections for the current head coach; this confirmation appears here only.',
  };
}

export function buildCoachingDecisionReceiptRows({
  team,
  market,
  schemePreview,
  retention,
  clinic,
}: {
  team: Team;
  market: CoachingMarketState;
  schemePreview: SchemeInstallState | null;
  retention: Record<'hc' | 'oc' | 'dc', ReturnType<typeof buildCoachRetentionDecision> | null>;
  clinic: ClinicState | null | undefined;
}): CoachingDecisionReceiptRow[] {
  const openRoles = ([
    ['HC', team.staff.hc],
    ['OC', team.staff.oc],
    ['DC', team.staff.dc],
  ] as const).filter(([, coach]) => !coach).map(([role]) => role);
  const bestCandidate = bestMarketCandidate(market);
  const riskiestRetention = highestRetentionRisk(retention);
  const continuity = schemePreview?.overallContinuity ?? 0;
  const clinicTracks = activeClinicTrackCount(clinic);

  return [
    {
      id: 'staff-slots',
      label: 'Staff slots',
      value: openRoles.length === 0 ? 'Full room' : `${openRoles.length} open`,
      detail: openRoles.length === 0
        ? 'All three staff seats are filled; use retention risk and scheme fit before firing or promoting.'
        : `Open ${openRoles.join('/')} seats should be filled from the candidate boards before the weekly loop turns.`,
      accent: openRoles.length === 0 ? 'green' : 'gold',
    },
    {
      id: 'top-market-fit',
      label: 'Best market fit',
      value: bestCandidate ? `${bestCandidate.candidate.fitScore} fit` : 'No board',
      detail: bestCandidate
        ? `${bestCandidate.candidate.name} is the top visible ${roleLabel(bestCandidate.role)} option from the current market board; hiring still commits only through the existing Hire button.`
        : 'No visible candidates are loaded for this role board; refresh or wait for a saved market board before hiring.',
      accent: bestCandidate ? accentForFit(bestCandidate.candidate.fitScore) : 'default',
    },
    {
      id: 'retention-risk',
      label: 'Retention risk',
      value: riskiestRetention ? `Poach ${riskiestRetention.poachRisk}` : 'No staff',
      detail: riskiestRetention
        ? `${roleLabel(riskiestRetention.role)} carries the highest current poach signal. This is a read-only retention forecast; poaching resolves through the offseason/week systems, not render.`
        : 'No staffed seat has a retention forecast yet.',
      accent: riskiestRetention ? accentForRisk(riskiestRetention.poachRisk) : 'default',
    },
    {
      id: 'scheme-continuity',
      label: 'Scheme continuity',
      value: `${continuity}`,
      detail: `Current install preview reads ${team.schemeOff} / ${team.schemeDef}; Apply Identity remains the only route commit for scheme changes.`,
      accent: continuity >= 80 ? 'green' : continuity >= 68 ? 'gold' : 'red',
    },
    {
      id: 'clinic-leverage',
      label: 'Clinic leverage',
      value: `${clinic?.perks.length ?? 0} perks`,
      detail: `${clinicTracks} active XP tracks feed existing clinic modifiers. Run Clinic and Activate tier buttons remain the only coaching-development commits here; completed development actions show on-screen confirmations after the action resolves.`,
      accent: (clinic?.perks.length ?? 0) > 0 ? 'green' : 'cyan',
    },
  ];
}

function CoachingDecisionReceipt({ rows }: { rows: CoachingDecisionReceiptRow[] }) {
  return (
    <PixelPanel title="Coaching Decision Receipt" accent="gold">
      <div style={autoGrid(220)}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255, 194, 71, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.value}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function ClinicRunReceiptPanel({ receipt }: { receipt: ClinicRunReceipt }) {
  return (
    <PixelPanel title="Clinic Run Receipt" accent={receipt.unlockedPerks.length > 0 ? 'gold' : 'green'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">{receipt.trackLabel}</PixelBadge>
          <PixelBadge variant="green">+{receipt.amount} XP</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
          Track XP moved from {receipt.beforeXp} to {receipt.afterXp}.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
          {receipt.unlockedPerks.length > 0
            ? `Unlocked ${receipt.unlockedPerks.join(', ')}.`
            : 'No new perk unlocked yet.'}
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{receipt.source}</div>
      </div>
    </PixelPanel>
  );
}

export function SkillActivationReceiptPanel({ receipt }: { receipt: SkillActivationReceipt }) {
  return (
    <PixelPanel title="Skill Activation Receipt" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{receipt.branchName}</PixelBadge>
          <PixelBadge variant="green">T{receipt.tier}</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
          {receipt.coachName} activated {receipt.tierLabel}.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          Previous selection: {receipt.previousSelection}.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{receipt.source}</div>
      </div>
    </PixelPanel>
  );
}

function formatPositionCoach(coach: PositionCoach | null | undefined): string {
  if (!coach) return 'No coach on file';
  return `${coach.name} // ${coach.role} // Q${coach.quality} // ${coach.specialty} // ${coach.yearsWithTeam} yr`;
}

export function buildPositionCoachLifecycleReceipt({
  action,
  role,
  beforeStaff,
  afterStaff,
}: {
  action: 'initialize' | 'upgrade';
  role?: PositionCoachRole;
  beforeStaff: PositionCoachStaff | null | undefined;
  afterStaff: PositionCoachStaff;
}): PositionCoachLifecycleReceipt {
  if (action === 'initialize') {
    return {
      id: 'position-coach:init',
      actionLabel: 'Initialized',
      roleLabel: 'All rooms',
      beforeLabel: beforeStaff?.coaches.length ? `${beforeStaff.coaches.length}/7 roles` : 'No staff',
      afterLabel: `${afterStaff.coaches.length}/7 roles`,
      detail: `Seeded ${afterStaff.coaches.map((coach) => coach.role).join(', ')} rooms from the staff office bench.`,
      source: 'Position-coach setup was confirmed by the staff office. This receipt appears here only.',
    };
  }

  const beforeCoach = beforeStaff?.coaches.find((coach) => coach.role === role) ?? null;
  const afterCoach = afterStaff.coaches.find((coach) => coach.role === role) ?? null;

  return {
    id: `position-coach:upgrade:${role ?? 'unknown'}`,
    actionLabel: 'Upgraded',
    roleLabel: role ?? 'Unknown',
    beforeLabel: formatPositionCoach(beforeCoach),
    afterLabel: formatPositionCoach(afterCoach),
    detail: afterCoach
      ? `${role ?? 'Role'} room now has ${afterCoach.name}, quality ${afterCoach.quality}, specialty ${afterCoach.specialty}.`
      : `${role ?? 'Role'} room was not found after the action.`,
    source: 'Position-coach upgrade was confirmed by the staff office. This receipt appears here only.',
  };
}

export function PositionCoachLifecycleReceiptPanel({ receipt }: { receipt: PositionCoachLifecycleReceipt }) {
  return (
    <PixelPanel title="Position Coach Receipt" accent="gold">
      <div style={autoGrid(220)}>
        <PixelMetricCard label="Action" value={receipt.actionLabel} accent="gold" detail={receipt.roleLabel} />
        <PixelMetricCard label="Before" value={receipt.beforeLabel} accent="cyan" />
        <PixelMetricCard label="After" value={receipt.afterLabel} accent="green" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">On-screen confirmation</PixelBadge>
          <PixelBadge variant="default">Room staff updated</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{receipt.detail}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          {receipt.source} It does not run progression, recalculate player development, change clinic XP,
          refresh the staff market, resolve poaching, change save schema, or change staff outcomes outside the confirmed action.
        </div>
      </div>
    </PixelPanel>
  );
}

export function buildCoachingSourceRows({
  staffedSlots,
  marketCandidates,
  clinicPerks,
  selectedSkills,
  positionCoachCount,
}: {
  staffedSlots: number;
  marketCandidates: number;
  clinicPerks: number;
  selectedSkills: number;
  positionCoachCount: number;
}): CoachingSourceRow[] {
  return [
    {
      id: 'staff-mirror',
      label: 'Staff mirror',
      value: `${staffedSlots}/3 seats`,
      detail: 'The sideline card mirrors your current HC, OC, and DC seats. Hire, fire, and promote buttons are the only staff-seat changes here.',
      accent: staffedSlots === 3 ? 'green' : 'gold',
    },
    {
      id: 'market-board',
      label: 'Market board',
      value: `${marketCandidates} candidates`,
      detail: 'The interview board is live. Refresh Market reshuffles the list; hiring still requires an explicit candidate button.',
      accent: 'cyan',
    },
    {
      id: 'scheme-preview',
      label: 'Scheme preview',
      value: 'Local draft',
      detail: 'Scheme Lab is a chalkboard draft until Apply Identity locks the new offense and defense.',
      accent: 'gold',
    },
    {
      id: 'clinic-skills',
      label: 'Clinic and skills',
      value: `${clinicPerks} perks / ${selectedSkills} picks`,
      detail: 'Clinic XP, perks, and HC branch picks stay visible. Run Clinic and Activate tier are the development commits.',
      accent: 'green',
    },
    {
      id: 'position-coaches',
      label: 'Position coaches',
      value: positionCoachCount > 0 ? `${positionCoachCount}/7 roles` : 'No staff',
      detail: 'Position rooms can be initialized or upgraded one role at a time. Tenure advances at season rollover.',
      accent: positionCoachCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'display-boundary',
      label: 'Display boundary',
      value: 'No render writes',
      detail: 'Opening Coaching is a review state. Staff, market, scheme, clinic, and position-room changes wait for buttons.',
      accent: 'default',
    },
  ];
}

function CoachingSourceContext({ rows }: { rows: CoachingSourceRow[] }) {
  return (
    <PixelPanel title="Coaching Command Center" accent="cyan">
      <div style={autoGrid(220)}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.value}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

function PositionCoachReportPanel({
  team,
  pendingRole,
  onInitialize,
  onUpgrade,
}: {
  team: Team;
  pendingRole: PositionCoachRole | 'init' | null;
  onInitialize: () => void;
  onUpgrade: (role: PositionCoachRole) => void;
}) {
  const positionCoachCount = team.positionCoaches?.coaches.length ?? 0;
  const reportLines = generateCoachingStaffReport(team.positionCoaches);

  return (
    <PixelPanel title="Position Coach Report" accent={positionCoachCount > 0 ? 'cyan' : 'default'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={positionCoachCount > 0 ? 'cyan' : 'default'}>{positionCoachCount}/7 roles</PixelBadge>
          <PixelBadge variant="default">Manual changes</PixelBadge>
          <PixelBadge variant="gold">Room staff</PixelBadge>
        </div>
        {reportLines.map((line) => (
          <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>
            {line}
          </div>
        ))}
        {positionCoachCount > 0 ? (
          <div style={autoGrid(190)}>
            {team.positionCoaches!.coaches.map((coach) => (
              <div
                key={coach.role}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{coach.role}</span>
                  <PixelBadge variant={coach.quality >= 8 ? 'gold' : coach.quality >= 5 ? 'green' : 'red'}>Q{coach.quality}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{coach.name}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {coach.specialty} // {coach.yearsWithTeam} yr
                </div>
                <PixelButton
                  accent="cyan"
                  disabled={pendingRole !== null}
                  onClick={() => onUpgrade(coach.role)}
                >
                  {pendingRole === coach.role ? `Upgrading ${coach.role}...` : `Upgrade ${coach.role}`}
                </PixelButton>
              </div>
            ))}
          </div>
        ) : (
          <PixelButton accent="gold" disabled={pendingRole !== null} onClick={onInitialize}>
            {pendingRole === 'init' ? 'Initializing Staff...' : 'Initialize Position Coaches'}
          </PixelButton>
        )}
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          The report summarizes the current position-room staff. Initialize and Upgrade are the only buttons that change this room,
          and tenure advances at season rollover. Opening this panel does not seed coaches, upgrade roles, alter progression,
          add clinic XP, write save data, or run offseason coach development.
        </div>
      </div>
    </PixelPanel>
  );
}

export function CoachingStaff() {
  const [tab, setTab] = useState<CoachingTab>('staff');
  const [clinicRunReceipt, setClinicRunReceipt] = useState<ClinicRunReceipt | null>(null);
  const [skillActivationReceipt, setSkillActivationReceipt] = useState<SkillActivationReceipt | null>(null);
  const [positionCoachReceipt, setPositionCoachReceipt] = useState<PositionCoachLifecycleReceipt | null>(null);
  const [pendingPositionCoachRole, setPendingPositionCoachRole] = useState<PositionCoachRole | 'init' | null>(null);
  const staff = useGameStore(selectCoachingStaff);
  const clinic = useGameStore(selectClinic);
  const team = useGameStore(selectUserTeam);
  const coachingMarket = useGameStore(selectCoachingMarket);
  const {
    addClinicXP,
    applyTeamSchemeChange,
    fireStaff,
    hireStaff,
    initializePositionCoachesForTeam,
    promoteStaff,
    refreshCoachingMarket,
    setHeadCoachSkillSelection,
    upgradePositionCoachRole,
  } = useGameStore((state) => state.actions);

  const [offenseScheme, setOffenseScheme] = useState(team?.schemeOff ?? team?.offScheme ?? 'balanced');
  const [defenseScheme, setDefenseScheme] = useState(team?.schemeDef ?? team?.defScheme ?? 'cover_3');

  const schemePreview = team ? projectSchemeTransition(team, offenseScheme, defenseScheme) : null;
  const retention = useMemo(() => {
    if (!team) return { hc: null, oc: null, dc: null };
    return {
      hc: team.staff.hc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'HC') : null,
      oc: team.staff.oc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'OC') : null,
      dc: team.staff.dc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'DC') : null,
    };
  }, [team]);

  const headCoach = team?.staff.hc ?? null;
  const treeKey = getTreeKey(headCoach?.archetype ?? 'Strategist');
  const tree = SKILL_TREES[treeKey];
  const selectedSkill = headCoach ? team?.skillSelections[headCoach.id] ?? null : null;
  const totalClinicXp = Object.values(clinic?.xp ?? {}).reduce((sum, value) => sum + value, 0);
  const sourceRows = useMemo(
    () => buildCoachingSourceRows({
      staffedSlots: [team?.staff.hc, team?.staff.oc, team?.staff.dc].filter(Boolean).length,
      marketCandidates: coachingMarket.candidates.HC.length + coachingMarket.candidates.OC.length + coachingMarket.candidates.DC.length,
      clinicPerks: clinic?.perks.length ?? 0,
      selectedSkills: Object.keys(team?.skillSelections ?? {}).length,
      positionCoachCount: team?.positionCoaches?.coaches.length ?? 0,
    }),
    [
      coachingMarket.candidates.DC.length,
      coachingMarket.candidates.HC.length,
      coachingMarket.candidates.OC.length,
      clinic?.perks.length,
      team?.skillSelections,
      team?.staff.dc,
      team?.staff.hc,
      team?.staff.oc,
      team?.positionCoaches?.coaches.length,
    ],
  );
  const decisionRows = useMemo(
    () => (team
      ? buildCoachingDecisionReceiptRows({
        team,
        market: coachingMarket,
        schemePreview,
        retention,
        clinic,
      })
      : []),
    [coachingMarket, clinic, retention, schemePreview, team],
  );

  if (!team) {
    return null;
  }

  const runClinic = async (track: ClinicTrack) => {
    const beforeClinic = clinic ?? { xp: {}, perks: [] };
    const afterClinic = earnXP(beforeClinic, track.id, 10);
    await addClinicXP(team.id, track.id, 10);
    setClinicRunReceipt(buildClinicRunReceipt(track, beforeClinic, afterClinic, 10));
  };

  const activateSkillTier = async (branch: SkillBranch, tier: number) => {
    if (!headCoach) return;
    const previousSelection = selectedSkill;
    await setHeadCoachSkillSelection(branch.id, tier);
    setSkillActivationReceipt(buildSkillActivationReceipt({
      coachName: headCoach.name,
      branch,
      tier,
      previousSelection,
    }));
  };

  const initializePositionCoachesForCurrentTeam = async () => {
    const beforeStaff = team.positionCoaches;
    setPendingPositionCoachRole('init');
    try {
      const afterStaff = await initializePositionCoachesForTeam(team.id);
      if (afterStaff) {
        setPositionCoachReceipt(buildPositionCoachLifecycleReceipt({
          action: 'initialize',
          beforeStaff,
          afterStaff,
        }));
      }
    } finally {
      setPendingPositionCoachRole(null);
    }
  };

  const upgradePositionCoachForCurrentTeam = async (role: PositionCoachRole) => {
    const beforeStaff = team.positionCoaches;
    setPendingPositionCoachRole(role);
    try {
      const afterStaff = await upgradePositionCoachRole(team.id, role);
      if (afterStaff) {
        setPositionCoachReceipt(buildPositionCoachLifecycleReceipt({
          action: 'upgrade',
          role,
          beforeStaff,
          afterStaff,
        }));
      }
    } finally {
      setPendingPositionCoachRole(null);
    }
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Coaching"
        subtitle="Run the sideline market, install your scheme identity, and sharpen the weekly edge."
        badges={(
          <>
            <PixelBadge variant={coachingMarket.hotSeat ? 'red' : 'green'}>
              {coachingMarket.hotSeat ? 'HOT SEAT' : 'OWNER STABLE'}
            </PixelBadge>
            <PixelBadge variant="cyan">{totalClinicXp} clinic XP</PixelBadge>
            <PixelBadge variant="gold">{team.schemeOff} / {team.schemeDef}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Continuity" value={schemePreview?.overallContinuity ?? 0} accent={(schemePreview?.overallContinuity ?? 0) >= 80 ? 'green' : 'gold'} detail="Current install stability across the building" />
        <PixelMetricCard label="Market Board" value={`${coachingMarket.candidates.HC.length}/${coachingMarket.candidates.OC.length}/${coachingMarket.candidates.DC.length}`} accent="cyan" detail="HC / OC / DC candidates loaded" />
        <PixelMetricCard label="Clinic Perks" value={clinic?.perks.length ?? 0} accent="green" detail="Unlocked staff modifiers from clinic work" />
      </div>

      <CoachingSourceContext rows={sourceRows} />
      <CoachingDecisionReceipt rows={decisionRows} />
      {positionCoachReceipt ? <PositionCoachLifecycleReceiptPanel receipt={positionCoachReceipt} /> : null}
      <PositionCoachReportPanel
        team={team}
        pendingRole={pendingPositionCoachRole}
        onInitialize={() => { void initializePositionCoachesForCurrentTeam(); }}
        onUpgrade={(role) => { void upgradePositionCoachForCurrentTeam(role); }}
      />

      <PixelNav
        activeKey={tab}
        wrap
        items={[
          { key: 'staff', label: 'Staff Market' },
          { key: 'scheme', label: 'Scheme Lab' },
          { key: 'development', label: 'Development' },
        ]}
        onSelect={(key) => setTab(key as CoachingTab)}
      />

      {tab === 'staff' ? (
        <>
          <div data-spotlight-target="chip.route.staff.beat-1" style={autoGrid(300)}>
            <CoachPanel coach={staff?.hc} role="HC" retention={retention.hc} onFire={() => { void fireStaff('HC'); }} />
            <CoachPanel coach={staff?.oc} role="OC" retention={retention.oc} onFire={() => { void fireStaff('OC'); }} onPromote={() => { void promoteStaff('OC'); }} />
            <CoachPanel coach={staff?.dc} role="DC" retention={retention.dc} onFire={() => { void fireStaff('DC'); }} onPromote={() => { void promoteStaff('DC'); }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton accent="gold" onClick={() => { navigateTo('/coaching/tree'); }}>View Coaching Tree</PixelButton>
            <PixelButton accent="cyan" onClick={() => { void refreshCoachingMarket(); }}>Refresh Market</PixelButton>
          </div>

          <div data-spotlight-target="chip.route.staff.beat-2">
            {(['HC', 'OC', 'DC'] as const).map((role) => (
              <PixelPanel key={role} title={`${role} Candidate Board`} accent={role === 'HC' ? 'gold' : 'cyan'}>
                <div style={autoGrid(240)}>
                  {coachingMarket.candidates[role].slice(0, 3).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      role={role}
                      candidate={candidate}
                      onHire={() => { void hireStaff(role, candidate); }}
                    />
                  ))}
                </div>
              </PixelPanel>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'scheme' ? (
        <>
          <div style={autoGrid(260)}>
            <PixelPanel title="Offense Identity" accent="gold">
              <PixelSelect
                value={offenseScheme}
                onChange={(event) => setOffenseScheme(event.target.value)}
                options={OFF_SCHEMES.map((scheme) => ({ value: scheme.id, label: scheme.name }))}
                accent="gold"
              />
            </PixelPanel>
            <PixelPanel title="Defense Identity" accent="cyan">
              <PixelSelect
                value={defenseScheme}
                onChange={(event) => setDefenseScheme(event.target.value)}
                options={DEF_SCHEMES.map((scheme) => ({ value: scheme.id, label: scheme.name }))}
                accent="cyan"
              />
            </PixelPanel>
            <PixelPanel title="Install Forecast" accent={(schemePreview?.overallContinuity ?? 0) >= 80 ? 'green' : 'gold'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Overall continuity {schemePreview?.overallContinuity ?? 0}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  OFF progress {schemePreview?.offense.installProgress ?? 0} // DEF progress {schemePreview?.defense.installProgress ?? 0}
                </div>
                <PixelButton accent="green" onClick={() => { void applyTeamSchemeChange(offenseScheme, defenseScheme); }}>
                  Apply Identity
                </PixelButton>
              </div>
            </PixelPanel>
          </div>

          <PixelPanel title="Room Fit" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {schemePreview?.snapshot.rooms.map((room) => (
                <PixelProgressBar
                  key={room.group}
                  label={`${room.group} // ${room.topPlayerName}`}
                  value={room.fitScore}
                  max={100}
                  accent={accentForFit(room.fitScore)}
                  valueLabel={`${room.fitScore}`}
                />
              ))}
            </div>
          </PixelPanel>
        </>
      ) : null}

      {tab === 'development' ? (
        <>
          {clinicRunReceipt ? <ClinicRunReceiptPanel receipt={clinicRunReceipt} /> : null}
          {skillActivationReceipt ? <SkillActivationReceiptPanel receipt={skillActivationReceipt} /> : null}

          <div style={autoGrid(320)}>
            <PixelPanel title="Head Coach Skill Tree" accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {headCoach ? `${headCoach.name} // ${treeKey}` : 'No head coach assigned.'}
                </div>
                {tree?.branches.map((branch) => {
                  const maxTier = branch.tiers.filter((tier) => (headCoach?.level ?? 0) >= tier.level).length;
                  const selectedTier = selectedSkill?.branch === branch.id ? selectedSkill.tier : 0;
                  return (
                    <div key={branch.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{branch.name}</span>
                        <PixelBadge variant={selectedTier > 0 ? 'green' : 'default'}>
                          {selectedTier > 0 ? `ACTIVE T${selectedTier}` : `OPEN T${maxTier}`}
                        </PixelBadge>
                      </div>
                      <PixelProgressBar
                        label={branch.tiers.map((tier) => tier.label).join(' / ')}
                        value={selectedTier}
                        max={Math.max(1, maxTier)}
                        accent={selectedTier > 0 ? 'green' : 'gold'}
                        valueLabel={`${selectedTier}/${maxTier}`}
                      />
                      {maxTier > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Array.from({ length: maxTier }, (_, index) => index + 1).map((tier) => (
                            <PixelButton
                              key={`${branch.id}-${tier}`}
                              accent={selectedTier === tier ? 'green' : 'default'}
                              onClick={() => { void activateSkillTier(branch, tier); }}
                            >
                              Activate T{tier}
                            </PixelButton>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </PixelPanel>

            <PixelPanel title="Coaching Clinic" accent="green">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {CLINIC_TRACKS.map((track) => {
                  const xp = clinic?.xp[track.id] ?? 0;
                  const maxXp = track.perks[track.perks.length - 1]?.xpReq ?? 80;
                  return (
                    <div key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <PixelProgressBar
                        label={`${track.label} // ${track.perks.map((perk) => perk.name).join(' / ')}`}
                        value={xp}
                        max={maxXp}
                        accent={xp >= maxXp ? 'green' : 'cyan'}
                        valueLabel={`${xp}/${maxXp}`}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{track.desc}</span>
                        <PixelButton accent="cyan" onClick={() => { void runClinic(track); }}>
                          Run Clinic +10
                        </PixelButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
