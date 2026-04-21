import { useMemo, useRef, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
} from '@mfd/design-system/components';
import { buildCoachingLegacy, type CoachCareerHistory, type GameEvent, type GameState, type StaffMember, type StaffRole, type Team } from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';

interface ResolvedCoach {
  coachId: string;
  name: string;
  role: StaffRole | null;
  roleLabel: string;
  archetype: string;
  traits: string[];
  mentorCoachId: string | null;
  disciples: string[];
  yearsUnderMentor?: number;
  teamAbbr: string;
  retired: boolean;
  retirementLabel: string | null;
}

interface ActiveCoachRecord {
  coach: StaffMember;
  teamAbbr: string;
  role: StaffRole;
}

const ROLE_KEYS = {
  HC: 'hc',
  OC: 'oc',
  DC: 'dc',
} as const satisfies Record<StaffRole, keyof Team['staff']>;

const EPILOGUE_LABELS = {
  broadcasting: 'ESPN Analyst',
  front_office: 'Front Office',
  college: 'College HC',
  retired_in_place: 'Retired',
} as const;

const EMPTY_LEGACY = {
  treeDepth: 0,
  headCoachesProduced: 0,
  coordinatorsPlaced: 0,
  retiredWithEpilogue: 0,
  notableProteges: [],
} as const;

function collectAllCoaches(teams: Record<string, Team>): Map<string, ActiveCoachRecord> {
  const byId = new Map<string, ActiveCoachRecord>();
  for (const team of Object.values(teams)) {
    const staff = team.staff;
    if (!staff) continue;
    for (const role of ['HC', 'OC', 'DC'] as const) {
      const coach = staff[ROLE_KEYS[role]];
      if (coach && !byId.has(coach.id)) {
        byId.set(coach.id, { coach, teamAbbr: team.abbr, role });
      }
    }
  }
  return byId;
}

function latestHistoryTeamAbbr(history: CoachCareerHistory, teams: Record<string, Team>): string {
  const latestTeam = [...history.teams].sort((left, right) => {
    if (right.endYear !== left.endYear) return right.endYear - left.endYear;
    return right.startYear - left.startYear;
  })[0];

  if (!latestTeam) return 'RET';
  return teams[latestTeam.teamId]?.abbr ?? 'RET';
}

function retirementLabelForEvent(event: GameEvent): string | null {
  const label = event.data['label'];
  if (typeof label === 'string' && label.trim()) return label;

  const epilogue = event.data['epilogue'];
  if (typeof epilogue !== 'string') return null;
  return EPILOGUE_LABELS[epilogue as keyof typeof EPILOGUE_LABELS] ?? 'Retired';
}

function buildRetirementLabelLookup(game: GameState): Map<string, string> {
  const latestByCoach = new Map<string, { timestamp: number; label: string }>();

  for (const event of game.eventLog) {
    if (event.type !== 'coach_retirement') continue;
    const coachId = event.data['coachId'];
    if (typeof coachId !== 'string') continue;
    const label = retirementLabelForEvent(event);
    if (!label) continue;

    const existing = latestByCoach.get(coachId);
    if (!existing || existing.timestamp < event.timestamp) {
      latestByCoach.set(coachId, { timestamp: event.timestamp, label });
    }
  }

  return new Map([...latestByCoach.entries()].map(([coachId, entry]) => [coachId, entry.label]));
}

function resolveCoach(
  coachId: string,
  game: GameState,
  activeById: Map<string, ActiveCoachRecord>,
  historyById: Map<string, CoachCareerHistory>,
  retirementLabels: Map<string, string>,
): ResolvedCoach | null {
  const active = activeById.get(coachId);
  const history = historyById.get(coachId);

  if (active) {
    return {
      coachId: active.coach.id,
      name: active.coach.name,
      role: active.role,
      roleLabel: active.role,
      archetype: active.coach.archetype,
      traits: active.coach.traits ?? [],
      mentorCoachId: active.coach.mentorCoachId ?? null,
      disciples: active.coach.disciples ?? [],
      yearsUnderMentor: active.coach.yearsUnderMentor,
      teamAbbr: active.teamAbbr,
      retired: history?.retired ?? false,
      retirementLabel: history?.retired ? (retirementLabels.get(coachId) ?? 'Retired') : null,
    };
  }

  if (!history) return null;

  return {
    coachId: history.coachId,
    name: history.name,
    role: null,
    roleLabel: 'Coach',
    archetype: history.archetype,
    traits: [],
    mentorCoachId: null,
    disciples: [],
    teamAbbr: latestHistoryTeamAbbr(history, game.teams),
    retired: history.retired,
    retirementLabel: history.retired ? (retirementLabels.get(coachId) ?? 'Retired') : null,
  };
}

function buildMentorChain(
  root: ResolvedCoach,
  resolveById: (coachId: string) => ResolvedCoach | null,
  maxDepth = 5,
): ResolvedCoach[] {
  const chain: ResolvedCoach[] = [];
  const visited = new Set<string>([root.coachId]);
  let current = root;
  for (let i = 0; i < maxDepth; i++) {
    const mentorId = current.mentorCoachId ?? null;
    if (!mentorId) break;
    if (visited.has(mentorId)) break;
    const mentor = resolveById(mentorId);
    if (!mentor) break;
    chain.push(mentor);
    visited.add(mentor.coachId);
    current = mentor;
  }
  return chain;
}

function buildDiscipleList(
  root: ResolvedCoach,
  resolveById: (coachId: string) => ResolvedCoach | null,
): ResolvedCoach[] {
  const discipleIds = root.disciples;
  const resolved: ResolvedCoach[] = [];
  const seen = new Set<string>();
  for (const id of discipleIds) {
    if (seen.has(id)) continue;
    const entry = resolveById(id);
    if (entry) {
      resolved.push(entry);
      seen.add(id);
    }
  }
  return resolved;
}

function CoachCard({
  entry,
  accent,
  labelPrefix,
}: {
  entry: ResolvedCoach;
  accent: 'gold' | 'cyan' | 'default';
  labelPrefix: string;
}) {
  const traits = entry.traits.slice(0, 3);
  const title = labelPrefix
    ? `${labelPrefix} ${entry.roleLabel}: ${entry.name}`
    : `${entry.roleLabel}: ${entry.name}`;
  return (
    <div style={{ position: 'relative' }}>
      <PixelPanel title={title} accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: entry.retired ? '18px' : 0 }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Team: {entry.teamAbbr} | Archetype: {entry.archetype}
          </div>
          {typeof entry.yearsUnderMentor === 'number' && entry.yearsUnderMentor > 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Apprenticed {entry.yearsUnderMentor} yr
            </div>
          ) : null}
          {traits.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {traits.map((traitId) => (
                <PixelBadge key={traitId} variant="cyan">{traitId}</PixelBadge>
              ))}
            </div>
          ) : null}
        </div>
      </PixelPanel>
      {entry.retired && entry.retirementLabel ? (
        <div style={{ position: 'absolute', right: '10px', bottom: '10px' }}>
          <PixelBadge variant="gold">{entry.retirementLabel}</PixelBadge>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <PixelPanel title="NO LINEAGE YET" accent="default">
      <div style={{ ...mono, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
        No coaching lineage yet. Hire a coach with a prior stint in the league
        to seed your tree.
      </div>
    </PixelPanel>
  );
}

export function CoachingTree() {
  const game = useGameStore((s) => s.game);
  const userTeam = useGameStore(selectUserTeam);
  const teams = useGameStore((s) => s.game?.teams ?? {});
  const [status, setStatus] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const { root, mentorChain, disciples, hasLineage, legacy } = useMemo(() => {
    if (!game || !userTeam || !userTeam.staff?.hc) {
      return { root: null, mentorChain: [], disciples: [], hasLineage: false, legacy: EMPTY_LEGACY };
    }

    const activeById = collectAllCoaches(teams);
    const historyById = new Map(game.coachingHistory.map((entry) => [entry.coachId, entry] as const));
    const retirementLabels = buildRetirementLabelLookup(game);
    const resolveById = (coachId: string) => resolveCoach(coachId, game, activeById, historyById, retirementLabels);
    const hc = userTeam.staff.hc;
    const rootEntry = resolveById(hc.id);
    if (!rootEntry) {
      return { root: null, mentorChain: [], disciples: [], hasLineage: false, legacy: EMPTY_LEGACY };
    }

    const chain = buildMentorChain(rootEntry, resolveById);
    const discipleList = buildDiscipleList(rootEntry, resolveById);
    const any = chain.length > 0 || discipleList.length > 0;
    return {
      root: rootEntry,
      mentorChain: chain,
      disciples: discipleList,
      hasLineage: any,
      legacy: buildCoachingLegacy(game, hc.id),
    };
  }, [game, userTeam, teams]);

  const handleExport = async () => {
    if (!exportRef.current || !userTeam || !game) return;
    const { exportRecapAsPng } = await import('../season/recap-share');
    const dataUrl = await exportRecapAsPng(exportRef.current);
    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${userTeam.abbr.toLowerCase()}-${game.year}-coaching-tree.png`;
      link.click();
    }
    setStatus('PNG export ready.');
  };

  const columnStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    flex: 1,
    minWidth: 0,
  };

  const layoutStyle = {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '16px',
    flexWrap: 'wrap' as const,
  };

  return (
    <div style={{
      ...screenStackStyle,
      ...teamThemeVars(userTeam?.id),
      borderTop: '3px solid var(--mfd-team-primary)',
      paddingTop: '8px',
    }}
    >
      <PixelScreenHeader
        title="COACHING TREE"
        subtitle="Lineage chain through your head coach"
        kicker="FAMILY TREE"
        badges={(
          <>
            <PixelBadge variant="gold">LEGACY</PixelBadge>
            <PixelButton accent="cyan" disabled={!root} onClick={() => { void handleExport(); }}>
              Export Tree as PNG
            </PixelButton>
          </>
        )}
      />
      {status ? (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{status}</div>
      ) : null}
      {!userTeam || !root ? (
        <PixelPanel title="NO TEAM LOADED" accent="red">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Load a franchise save to view its coaching lineage.
          </div>
        </PixelPanel>
      ) : (
        <div ref={exportRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={autoGrid(180)}>
            <PixelMetricCard label="Tree Depth" value={legacy.treeDepth} accent="gold" detail="Active generations below your current HC" />
            <PixelMetricCard label="HCs Produced" value={legacy.headCoachesProduced} accent="cyan" detail="Active descendants holding head jobs" />
            <PixelMetricCard label="Coordinators Placed" value={legacy.coordinatorsPlaced} accent="green" detail="Active OC and DC placements across the league" />
            <PixelMetricCard label="Notable Proteges" value={legacy.notableProteges.length} accent="default" detail="Top five active branches ranked by titles and tenure" />
          </div>

          <div style={layoutStyle}>
            {/* Mentor chain upward */}
            <div style={{ ...columnStyle, flexBasis: '320px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>MENTOR CHAIN</div>
              {mentorChain.length === 0 ? (
                <PixelPanel title="NO MENTOR ON RECORD" accent="default">
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    Your head coach has no recorded mentor.
                  </div>
                </PixelPanel>
              ) : (
                mentorChain.map((entry, idx) => (
                  <CoachCard
                    key={entry.coachId}
                    entry={entry}
                    accent="cyan"
                    labelPrefix={`Mentor ${idx + 1}`}
                  />
                ))
              )}
            </div>

            {/* User head coach centered */}
            <div style={{ ...columnStyle, flexBasis: '320px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>YOUR HEAD COACH</div>
              <CoachCard entry={root} accent="gold" labelPrefix="" />
              {!hasLineage ? <EmptyState /> : null}
            </div>

            {/* Disciples fan downward */}
            <div style={{ ...columnStyle, flexBasis: '320px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>DISCIPLES</div>
              {disciples.length === 0 ? (
                <PixelPanel title="NO DISCIPLES YET" accent="default">
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    No coaches have come up under this tree.
                  </div>
                </PixelPanel>
              ) : (
                disciples.map((entry) => (
                  <CoachCard
                    key={entry.coachId}
                    entry={entry}
                    accent="cyan"
                    labelPrefix="Disciple"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoachingTree;
