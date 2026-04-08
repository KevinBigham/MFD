import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { calcCapHit, calcContractScore, type Player } from '@mfd/engine';
import { getSalaryCap } from '@mfd/engine';
import {
  selectRoster,
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  mono,
  monoSm,
  pixelSm,
  screenStackStyle,
} from './pixelUi';

// ── Helpers ───────────────────────────────────────────────

interface StatRow {
  label: string;
  a: string | number;
  b: string | number;
  winner: 'a' | 'b' | 'tie';
}

function formatMoney(val: number): string {
  return `$${val.toFixed(1)}M`;
}

function buildStatRows(a: Player, b: Player, year: number): StatRow[] {
  const rows: StatRow[] = [];

  const coreStats: Array<{ label: string; key: keyof Player }> = [
    { label: 'Overall', key: 'ovr' },
    { label: 'Potential', key: 'pot' },
    { label: 'Age', key: 'age' },
    { label: 'Experience', key: 'yearsExp' },
  ];

  for (const { label, key } of coreStats) {
    const va = a[key] as number;
    const vb = b[key] as number;
    const higherBetter = key !== 'age';
    rows.push({
      label,
      a: va,
      b: vb,
      winner: va === vb ? 'tie' : (higherBetter ? (va > vb ? 'a' : 'b') : (va < vb ? 'a' : 'b')),
    });
  }

  // Personality
  const personalityKeys: Array<{ label: string; key: keyof Player['personality'] }> = [
    { label: 'Work Ethic', key: 'workEthic' },
    { label: 'Loyalty', key: 'loyalty' },
    { label: 'Pressure', key: 'pressure' },
  ];
  for (const { label, key } of personalityKeys) {
    const va = a.personality[key];
    const vb = b.personality[key];
    rows.push({
      label,
      a: `${va}/10`,
      b: `${vb}/10`,
      winner: va === vb ? 'tie' : va > vb ? 'a' : 'b',
    });
  }

  // Contract
  const capHitA = calcCapHit(a.contract);
  const capHitB = calcCapHit(b.contract);
  rows.push({
    label: 'Cap Hit',
    a: formatMoney(capHitA),
    b: formatMoney(capHitB),
    winner: capHitA === capHitB ? 'tie' : capHitA < capHitB ? 'a' : 'b',
  });

  const yearsA = a.contract?.years ?? 0;
  const yearsB = b.contract?.years ?? 0;
  rows.push({
    label: 'Years Left',
    a: yearsA,
    b: yearsB,
    winner: 'tie',
  });

  // Contract value score
  const cap = getSalaryCap(year);
  if (a.contract) {
    const scoreA = calcContractScore(a.ovr, a.pos, a.age, a.contract.years, a.contract.totalValue, cap);
    const scoreB = b.contract ? calcContractScore(b.ovr, b.pos, b.age, b.contract.years, b.contract.totalValue, cap) : { grade: 'N/A', score: 0 };
    rows.push({
      label: 'Contract Grade',
      a: scoreA.grade,
      b: scoreB.grade,
      winner: scoreA.score === scoreB.score ? 'tie' : scoreA.score > scoreB.score ? 'a' : 'b',
    });
  }

  // Season stats (position-specific)
  const posStatKeys = getPositionStatKeys(a.pos);
  for (const { label, key } of posStatKeys) {
    const va = (a.stats as Record<string, number>)[key] ?? 0;
    const vb = (b.stats as Record<string, number>)[key] ?? 0;
    rows.push({
      label,
      a: va,
      b: vb,
      winner: va === vb ? 'tie' : va > vb ? 'a' : 'b',
    });
  }

  return rows;
}

function getPositionStatKeys(pos: string): Array<{ label: string; key: string }> {
  switch (pos) {
    case 'QB': return [{ label: 'Pass Yds', key: 'passYds' }, { label: 'Pass TD', key: 'passTD' }, { label: 'INT', key: 'passINT' }];
    case 'RB': return [{ label: 'Rush Yds', key: 'rushYds' }, { label: 'Rush TD', key: 'rushTD' }, { label: 'Receptions', key: 'rec' }];
    case 'WR': case 'TE': return [{ label: 'Receptions', key: 'rec' }, { label: 'Rec Yds', key: 'recYds' }, { label: 'Rec TD', key: 'recTD' }];
    case 'DL': case 'LB': return [{ label: 'Tackles', key: 'tackles' }, { label: 'Sacks', key: 'sacks' }, { label: 'INT', key: 'defINT' }];
    case 'CB': case 'S': return [{ label: 'INT', key: 'defINT' }, { label: 'Tackles', key: 'tackles' }];
    default: return [{ label: 'Games', key: 'gamesPlayed' }];
  }
}

// ── Comparison Row ────────────────────────────────────────

function ComparisonRow({ row }: { row: StatRow }) {
  const winColor = 'var(--mfd-green)';
  const dimColor = 'var(--mfd-text-dim)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 1fr',
      alignItems: 'center',
      padding: '4px 0',
      borderBottom: '1px solid #222',
      ...monoSm,
    }}>
      <span style={{
        textAlign: 'right',
        paddingRight: '12px',
        color: row.winner === 'a' ? winColor : dimColor,
        fontWeight: row.winner === 'a' ? 700 : 400,
      }}>
        {row.a}
      </span>
      <span style={{ textAlign: 'center', color: 'var(--mfd-text-secondary)', ...pixelSm }}>
        {row.label}
      </span>
      <span style={{
        textAlign: 'left',
        paddingLeft: '12px',
        color: row.winner === 'b' ? winColor : dimColor,
        fontWeight: row.winner === 'b' ? 700 : 400,
      }}>
        {row.b}
      </span>
    </div>
  );
}

// ── Player Picker ─────────────────────────────────────────

function PlayerPicker({
  label,
  selected,
  exclude,
  players,
  onSelect,
}: {
  label: string;
  selected: string | null;
  exclude: string | null;
  players: Player[];
  onSelect: (id: string) => void;
}) {
  const filtered = players.filter((p) => p.id !== exclude);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={pixelSm}>{label}</span>
      <select
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          ...monoSm,
          background: '#111',
          color: 'var(--mfd-text)',
          border: '1px solid #333',
          padding: '6px 8px',
          borderRadius: '2px',
        }}
      >
        <option value="">-- Select Player --</option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.pos} / {p.ovr} OVR)
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Player Header ─────────────────────────────────────────

function PlayerHeader({ player }: { player: Player }) {
  const devColors: Record<string, string> = {
    'x-factor': 'var(--mfd-gold)',
    superstar: 'var(--mfd-gold)',
    star: 'var(--mfd-cyan)',
    normal: 'var(--mfd-text-dim)',
  };
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ ...pixelSm, color: 'var(--mfd-text-secondary)', marginBottom: '2px' }}>
        {player.pos} / #{player.jerseyNumber}
      </div>
      <div style={{ ...mono, fontSize: '14px', fontWeight: 700, color: 'var(--mfd-text)' }}>
        {player.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
        <PixelBadge variant="gold">{player.ovr} OVR</PixelBadge>
        <PixelBadge variant={player.devTrait === 'normal' ? 'default' : 'cyan'}>
          {player.devTrait.toUpperCase()}
        </PixelBadge>
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
        Age {player.age} / {player.yearsExp} yr exp
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

interface PlayerComparisonProps {
  initialPlayerA?: string;
  initialPlayerB?: string;
}

export function PlayerComparison({ initialPlayerA, initialPlayerB }: PlayerComparisonProps) {
  const roster = useGameStore(selectRoster);
  const game = useGameStore((s) => s.game);
  const allPlayers = useGameStore((s) => {
    if (!s.game) return [];
    return Object.values(s.game.players).filter((p) => p.contract != null).sort((a, b) => b.ovr - a.ovr);
  });

  const [playerIdA, setPlayerIdA] = useState<string | null>(initialPlayerA ?? null);
  const [playerIdB, setPlayerIdB] = useState<string | null>(initialPlayerB ?? null);

  const playerA = useMemo(() => game?.players[playerIdA ?? ''] ?? null, [game, playerIdA]);
  const playerB = useMemo(() => game?.players[playerIdB ?? ''] ?? null, [game, playerIdB]);

  const statRows = useMemo(() => {
    if (!playerA || !playerB) return [];
    return buildStatRows(playerA, playerB, game?.year ?? 2026);
  }, [playerA, playerB, game?.year]);

  const winsA = statRows.filter((r) => r.winner === 'a').length;
  const winsB = statRows.filter((r) => r.winner === 'b').length;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="PLAYER COMPARISON"
        subtitle="Head-to-head breakdown of any two players"
        kicker="MFD NETWORK"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <PlayerPicker
          label="PLAYER A"
          selected={playerIdA}
          exclude={playerIdB}
          players={allPlayers}
          onSelect={setPlayerIdA}
        />
        <PlayerPicker
          label="PLAYER B"
          selected={playerIdB}
          exclude={playerIdA}
          players={allPlayers}
          onSelect={setPlayerIdB}
        />
      </div>

      {playerA && playerB ? (
        <>
          <div style={autoGrid(200)}>
            <PixelMetricCard
              label={playerA.name}
              value={`${winsA} categories`}
              accent={winsA > winsB ? 'green' : 'default'}
            />
            <PixelMetricCard
              label={playerB.name}
              value={`${winsB} categories`}
              accent={winsB > winsA ? 'green' : 'default'}
            />
          </div>

          <PixelPanel title="Head-to-Head">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0',
              marginBottom: '8px',
            }}>
              <PlayerHeader player={playerA} />
              <PlayerHeader player={playerB} />
            </div>

            <div style={{ borderTop: '2px solid var(--mfd-gold)', paddingTop: '8px' }}>
              {statRows.map((row, i) => (
                <ComparisonRow key={i} row={row} />
              ))}
            </div>
          </PixelPanel>

          {/* Traits comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PixelPanel title={`${playerA.name} Traits`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {playerA.traits.length > 0
                  ? playerA.traits.map((t) => <PixelBadge key={t} variant="cyan">{t.replace(/_/g, ' ')}</PixelBadge>)
                  : <span style={monoSm}>No traits</span>
                }
              </div>
            </PixelPanel>
            <PixelPanel title={`${playerB.name} Traits`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {playerB.traits.length > 0
                  ? playerB.traits.map((t) => <PixelBadge key={t} variant="cyan">{t.replace(/_/g, ' ')}</PixelBadge>)
                  : <span style={monoSm}>No traits</span>
                }
              </div>
            </PixelPanel>
          </div>
        </>
      ) : (
        <PixelPanel title="Select Two Players">
          <p style={mono}>Choose two players above to see a head-to-head comparison.</p>
        </PixelPanel>
      )}
    </div>
  );
}
