import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { BloodlineLegacyTag } from '@mfd/engine';
import {
  selectBloodlineFamilies,
  selectUserTeam,
  useGameStore,
  type BloodlineFamily,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  navigateTo,
  screenStackStyle,
  type PixelAccent,
} from '../shared/pixelUi';

type ScopeFilter = 'all' | 'user' | 'rookies';

const LEGACY_TAG_LABELS: Record<BloodlineLegacyTag, string> = {
  franchise_royalty: 'Franchise Royalty',
  famous_name: 'Famous Name',
  chip_on_shoulder: 'Chip On Shoulder',
  late_bloomer_family: 'Late Bloomer Family',
};

const LEGACY_TAG_ACCENTS: Record<BloodlineLegacyTag, PixelAccent> = {
  franchise_royalty: 'gold',
  famous_name: 'cyan',
  chip_on_shoulder: 'red',
  late_bloomer_family: 'green',
};

interface BloodlinesViewerViewProps {
  families: readonly BloodlineFamily[];
  userTeamId: string | null;
}

function familyMatchesScope(family: BloodlineFamily, scope: ScopeFilter, userTeamId: string | null): boolean {
  if (scope === 'all') return true;
  if (scope === 'user') {
    return userTeamId !== null && family.children.some((child) => child.teamId === userTeamId);
  }
  if (scope === 'rookies') {
    return family.children.some((child) => child.source === 'draft');
  }
  return true;
}

export function BloodlinesViewerView({ families, userTeamId }: BloodlinesViewerViewProps) {
  const [scope, setScope] = useState<ScopeFilter>('all');

  const userFamilyCount = useMemo(
    () => families.filter((family) => familyMatchesScope(family, 'user', userTeamId)).length,
    [families, userTeamId],
  );
  const rookieFamilyCount = useMemo(
    () => families.filter((family) => familyMatchesScope(family, 'rookies', userTeamId)).length,
    [families, userTeamId],
  );

  const visibleFamilies = useMemo(
    () => families.filter((family) => familyMatchesScope(family, scope, userTeamId)),
    [families, scope, userTeamId],
  );

  const totalChildren = useMemo(
    () => families.reduce((sum, family) => sum + family.children.length, 0),
    [families],
  );

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Bloodlines"
        subtitle="Sons and second-generation prospects carrying franchise legacies forward."
        badges={(
          <>
            <PixelBadge variant="gold">{families.length} families</PixelBadge>
            <PixelBadge variant="cyan">{totalChildren} sons</PixelBadge>
            {userFamilyCount > 0 ? (
              <PixelBadge variant="green">{userFamilyCount} on your roster</PixelBadge>
            ) : null}
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Active Families"
          value={families.length}
          accent="gold"
          detail="Distinct parents whose lineage is still in the league"
        />
        <PixelMetricCard
          label="Total Sons"
          value={totalChildren}
          accent="cyan"
          detail="Active players + rookies inheriting bloodlines"
        />
        <PixelMetricCard
          label="On Your Roster"
          value={userFamilyCount}
          accent="green"
          detail={userFamilyCount === 0 ? 'No bloodline players signed yet' : 'Families currently fielding for you'}
        />
      </div>

      <PixelPanel title="Bloodline Sources" accent="cyan">
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Source: selectBloodlineFamilies joins active game.players and current draft prospects that already carry saved bloodline fields. Active sons use current roster OVR/age/team, rookie-class sons use scout grade as the OVR signal, and this route does not assign bloodlines or write family relationship edges.
        </div>
      </PixelPanel>

      <PixelPanel title="Filter" accent="cyan">
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <PixelButton
            accent={scope === 'all' ? 'cyan' : 'default'}
            onClick={() => setScope('all')}
            data-testid="bloodlines-scope-all"
          >
            All ({families.length})
          </PixelButton>
          <PixelButton
            accent={scope === 'user' ? 'green' : 'default'}
            onClick={() => setScope('user')}
            data-testid="bloodlines-scope-user"
          >
            My Roster ({userFamilyCount})
          </PixelButton>
          <PixelButton
            accent={scope === 'rookies' ? 'gold' : 'default'}
            onClick={() => setScope('rookies')}
            data-testid="bloodlines-scope-rookies"
          >
            Rookies ({rookieFamilyCount})
          </PixelButton>
        </div>
      </PixelPanel>

      <PixelPanel title="Family Tree" accent="gold">
        {visibleFamilies.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {families.length === 0
              ? 'No bloodlines have entered the league yet. Sons will start surfacing once dynasty legends retire and second generations reach the draft.'
              : 'No families match this filter. Switch back to All to see every active bloodline.'}
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {visibleFamilies.map((family) => (
              <BloodlineFamilyCard
                key={family.parentPlayerId}
                family={family}
              />
            ))}
          </div>
        )}
      </PixelPanel>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton accent="default" onClick={() => navigateTo('/legacy')}>
          Back to Legacy
        </PixelButton>
      </div>
    </div>
  );
}

interface BloodlineFamilyCardProps {
  family: BloodlineFamily;
}

function BloodlineFamilyCard({ family }: BloodlineFamilyCardProps) {
  const accent = LEGACY_TAG_ACCENTS[family.legacyTag];
  const borderColor = accentColor(accent);
  const userInRoster = family.children.some((child) => child.isUserPlayer);

  return (
    <div
      data-testid="bloodline-family-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        border: `3px solid ${userInRoster ? 'var(--mfd-green)' : borderColor}`,
        background: 'var(--mfd-bg-2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ ...monoSm, color: '#fff', fontSize: '13px' }}>{family.parentName}</span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {family.parentPosition} // first played for {family.parentTeamId}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PixelBadge variant={accent}>{LEGACY_TAG_LABELS[family.legacyTag]}</PixelBadge>
          <PixelBadge variant="default">{family.children.length} son{family.children.length === 1 ? '' : 's'}</PixelBadge>
          {userInRoster ? <PixelBadge variant="green">YOUR ROSTER</PixelBadge> : null}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px', borderLeft: `3px solid ${borderColor}` }}>
        {family.children.map((child) => (
          <div
            key={child.playerId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>{child.name}</span>
              <PixelBadge variant="default">{child.position}</PixelBadge>
              <PixelBadge variant="cyan">{child.ovr} OVR</PixelBadge>
              <PixelBadge variant="default">Age {child.age}</PixelBadge>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {child.source === 'draft' ? <PixelBadge variant="gold">ROOKIE CLASS</PixelBadge> : null}
              {child.isUserPlayer ? <PixelBadge variant="green">YOUR ROSTER</PixelBadge> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function accentColor(accent: PixelAccent): string {
  if (accent === 'gold') return 'var(--mfd-gold)';
  if (accent === 'cyan') return 'var(--mfd-cyan)';
  if (accent === 'green') return 'var(--mfd-green)';
  if (accent === 'red') return 'var(--mfd-red)';
  return 'var(--mfd-border)';
}

export function BloodlinesViewer() {
  const families = useGameStore(selectBloodlineFamilies);
  const userTeam = useGameStore(selectUserTeam);
  return <BloodlinesViewerView families={families} userTeamId={userTeam?.id ?? null} />;
}
