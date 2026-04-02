import { useMemo } from 'react';
import {
  PixelBadge,
  PixelPanel,
  PixelProgressBar,
} from '@mfd/design-system/components';
import { CLINIC_TRACKS as ENGINE_CLINIC_TRACKS, SKILL_TREES, type StaffMember } from '@mfd/engine';
import {
  useGameStore, selectClinic, selectCoachingStaff, selectUserTeam,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

function CoachPanel({ coach, role }: { coach: StaffMember | null | undefined; role: string }) {
  if (!coach) {
    return (
      <PixelPanel title={`${role} Seat`} accent="red">
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No coach assigned.</span>
      </PixelPanel>
    );
  }

  const ratings = Object.entries(coach.ratings)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <PixelPanel title={`${role}: ${coach.name}`} accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{coach.archetype}</PixelBadge>
          <PixelBadge variant="cyan">LVL {coach.level}</PixelBadge>
          {coach.specialty75 ? <PixelBadge variant="green">{coach.specialty75.label}</PixelBadge> : null}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {coach.traits.length > 0 ? coach.traits.map((trait) => (
            <PixelBadge key={trait} variant="default">{trait}</PixelBadge>
          )) : (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active coach traits.</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ratings.map(([label, value]) => (
            <PixelProgressBar
              key={label}
              label={label.replace(/([A-Z])/g, ' $1').trim()}
              value={value}
              max={100}
              accent={value >= 85 ? 'green' : value >= 75 ? 'cyan' : value >= 65 ? 'gold' : 'red'}
              valueLabel={`${value}`}
            />
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

export function CoachingStaff() {
  const staff = useGameStore(selectCoachingStaff);
  const clinic = useGameStore(selectClinic);
  const team = useGameStore(selectUserTeam);

  const skillBranches = useMemo(() => {
    const archetype = staff?.hc?.archetype ?? 'Strategist';
    const tree = SKILL_TREES[archetype];
    if (!tree) return [];

    return tree.branches.map((branch) => {
      const unlockedTier = team?.skillSelections[branch.id]?.tier ?? 0;
      return {
        id: branch.id,
        name: branch.name,
        unlockedTier,
        maxTier: branch.tiers.length,
        labels: branch.tiers.map((tier) => tier.label),
      };
    });
  }, [staff, team]);

  const clinicTracks = useMemo(() => ENGINE_CLINIC_TRACKS.map((track) => {
    const xp = clinic?.xp[track.id] ?? 0;
    const maxXp = track.perks.length > 0 ? track.perks[track.perks.length - 1]!.xpReq : 80;
    const unlockedPerks = clinic?.perks.filter((perk) => perk.startsWith(track.id)).length ?? 0;
    return {
      id: track.id,
      label: track.label,
      xp,
      maxXp,
      unlockedPerks,
    };
  }), [clinic]);

  const activeCoaches = [staff?.hc, staff?.oc, staff?.dc].filter(Boolean).length;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Coaching Staff"
        subtitle="Coordinate the sideline brain trust, unlock skill branches, and stack clinic upgrades."
        badges={(
          <>
            <PixelBadge variant="gold">{activeCoaches}/3 staffed</PixelBadge>
            <PixelBadge variant="cyan">{clinic?.perks.length ?? 0} clinic perks</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Head Coach" value={staff?.hc?.name ?? 'OPEN'} accent={staff?.hc ? 'green' : 'red'} detail={staff?.hc?.archetype ?? 'Vacant leadership slot'} />
        <PixelMetricCard label="Clinic XP" value={Object.values(clinic?.xp ?? {}).reduce((sum, value) => sum + value, 0)} accent="cyan" detail="Total staff development bank" />
        <PixelMetricCard label="Skill Branches" value={skillBranches.length} accent="gold" detail="Head coach progression lanes" />
      </div>

      <div style={autoGrid(280)}>
        <CoachPanel coach={staff?.hc} role="HC" />
        <CoachPanel coach={staff?.oc} role="OC" />
        <CoachPanel coach={staff?.dc} role="DC" />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Head Coach Skill Tree" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {skillBranches.map((branch) => (
              <div key={branch.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{branch.name}</span>
                  <PixelBadge variant={branch.unlockedTier >= branch.maxTier ? 'green' : 'cyan'}>
                    TIER {branch.unlockedTier}/{branch.maxTier}
                  </PixelBadge>
                </div>
                <PixelProgressBar
                  label={branch.labels.join(' / ')}
                  value={branch.unlockedTier}
                  max={branch.maxTier}
                  accent={branch.unlockedTier >= branch.maxTier ? 'green' : 'gold'}
                  valueLabel={`${branch.unlockedTier}`}
                />
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Coaching Clinic" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clinicTracks.map((track) => (
              <PixelProgressBar
                key={track.id}
                label={`${track.label} // ${track.unlockedPerks} perks`}
                value={track.xp}
                max={track.maxXp}
                accent={track.unlockedPerks > 0 ? 'green' : 'cyan'}
                valueLabel={`${track.xp}/${track.maxXp}`}
              />
            ))}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
