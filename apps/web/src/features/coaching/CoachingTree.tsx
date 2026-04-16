/**
 * Sprint 45 "The Family Tree" — CoachingTree screen at /coaching/tree.
 *
 * Surfaces the user team's head coach alongside a mentor chain walking
 * upward through `mentorCoachId` references and a disciples fan walking
 * downward through `disciples[]` references. Edges are resolved by
 * scanning every team's staff in the current game state.
 *
 * When no lineage data exists (fresh save), the screen renders a
 * friendly empty state so the route is still reachable.
 */
import { useMemo } from 'react';
import {
  PixelBadge,
  PixelPanel,
} from '@mfd/design-system/components';
import type { StaffMember, Team } from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

interface ResolvedCoach {
  coach: StaffMember;
  teamAbbr: string;
}

function collectAllCoaches(teams: Record<string, Team>): Map<string, ResolvedCoach> {
  const byId = new Map<string, ResolvedCoach>();
  for (const team of Object.values(teams)) {
    const staff = team.staff;
    if (!staff) continue;
    for (const coach of [staff.hc, staff.oc, staff.dc]) {
      if (coach && !byId.has(coach.id)) {
        byId.set(coach.id, { coach, teamAbbr: team.abbr });
      }
    }
  }
  return byId;
}

function buildMentorChain(
  root: ResolvedCoach,
  byId: Map<string, ResolvedCoach>,
  maxDepth = 5,
): ResolvedCoach[] {
  const chain: ResolvedCoach[] = [];
  const visited = new Set<string>([root.coach.id]);
  let current = root;
  for (let i = 0; i < maxDepth; i++) {
    const mentorId = current.coach.mentorCoachId ?? null;
    if (!mentorId) break;
    if (visited.has(mentorId)) break;
    const mentor = byId.get(mentorId);
    if (!mentor) break;
    chain.push(mentor);
    visited.add(mentor.coach.id);
    current = mentor;
  }
  return chain;
}

function buildDiscipleList(
  root: ResolvedCoach,
  byId: Map<string, ResolvedCoach>,
): ResolvedCoach[] {
  const discipleIds = root.coach.disciples ?? [];
  const resolved: ResolvedCoach[] = [];
  for (const id of discipleIds) {
    const entry = byId.get(id);
    if (entry) resolved.push(entry);
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
  const { coach, teamAbbr } = entry;
  const traits = coach.traits.slice(0, 3);
  return (
    <PixelPanel title={`${labelPrefix} ${coach.role}: ${coach.name}`} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Team: {teamAbbr} | Archetype: {coach.archetype}
        </div>
        {typeof coach.yearsUnderMentor === 'number' && coach.yearsUnderMentor > 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Apprenticed {coach.yearsUnderMentor} yr
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
  const userTeam = useGameStore(selectUserTeam);
  const teams = useGameStore((s) => s.game?.teams ?? {});

  const { root, mentorChain, disciples, hasLineage } = useMemo(() => {
    if (!userTeam || !userTeam.staff?.hc) {
      return { root: null, mentorChain: [], disciples: [], hasLineage: false };
    }
    const byId = collectAllCoaches(teams);
    const hc = userTeam.staff.hc;
    const rootEntry: ResolvedCoach = { coach: hc, teamAbbr: userTeam.abbr };
    const chain = buildMentorChain(rootEntry, byId);
    const discipleList = buildDiscipleList(rootEntry, byId);
    const any = chain.length > 0 || discipleList.length > 0;
    return {
      root: rootEntry,
      mentorChain: chain,
      disciples: discipleList,
      hasLineage: any,
    };
  }, [userTeam, teams]);

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
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="COACHING TREE"
        subtitle="Lineage chain through your head coach"
        kicker="FAMILY TREE"
      />
      {!userTeam || !root ? (
        <PixelPanel title="NO TEAM LOADED" accent="red">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Load a franchise save to view its coaching lineage.
          </div>
        </PixelPanel>
      ) : (
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
                  key={entry.coach.id}
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
                  key={entry.coach.id}
                  entry={entry}
                  accent="cyan"
                  labelPrefix="Disciple"
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CoachingTree;
