import type { GameDayPackage, GameResult, PlayerGameLine, SeasonPhase, TeamGameStats } from '@mfd/engine';
import { PixelPanel, PixelBadge, PixelDialog, PixelScoreboard, PixelStatBar } from '@mfd/design-system/components';
import {
  selectLatestGameDayPackage,
  selectLatestGameResult,
  selectPhase,
  selectTeams,
  selectUserTeam,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';

/* ── Shared styles ──────────────────────────────────────── */
const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px' } as const;
const pixelSm = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '7px' } as const;
const display = { fontFamily: 'var(--mfd-font-display)' } as const;
const mono = { fontFamily: 'var(--mfd-font-mono)', fontSize: '12px' } as const;
const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' } as const;

/* ── Helpers ────────────────────────────────────────────── */

function impactVariant(impact: 'positive' | 'negative' | 'neutral') {
  return impact === 'positive' ? 'green' : impact === 'negative' ? 'red' : 'default';
}

function makeAbbr(name: string): string {
  return name.slice(0, 3).toUpperCase();
}

function safeRatio(a: number, b: number): number {
  const total = a + b;
  return total === 0 ? 0.5 : a / total;
}

/* ── Main View: Game Day Center ─────────────────────────── */

interface GameDayCenterViewProps {
  teamLabel: string;
  phase: SeasonPhase;
  year: number;
  packageData: GameDayPackage | null;
}

export function GameDayCenterView({ teamLabel, phase, year, packageData }: GameDayCenterViewProps) {
  if (!packageData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          ...pixel,
          fontSize: '10px',
          color: 'var(--mfd-green)',
          padding: '8px 0',
        }}>
          MFD NETWORK
        </div>
        <PixelPanel title="Awaiting Kickoff" accent="cyan">
          <div style={{ ...pixel, color: '#999', lineHeight: 2, padding: '8px' }}>
            No postgame package yet. Advance into the regular season to generate the first game day recap.
          </div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        borderBottom: '3px solid var(--mfd-green)',
      }}>
        <span style={{ ...pixel, fontSize: '10px', color: 'var(--mfd-green)' }}>
          MFD NETWORK
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ ...pixelSm, color: '#666' }}>
            WK <span style={{ color: '#fff' }}>{String(packageData.week).padStart(2, '0')}</span>
          </span>
          <span style={{ ...pixelSm, color: '#666' }}>
            YR <span style={{ color: '#fff' }}>{packageData.year}</span>
          </span>
          <PixelBadge variant={packageData.result === 'win' ? 'green' : packageData.result === 'loss' ? 'red' : 'default'}>
            {packageData.result.toUpperCase()}
          </PixelBadge>
        </div>
      </div>

      {/* Headline */}
      <PixelPanel title="Final Score" accent="gold">
        <div style={{ padding: '8px' }}>
          <div style={{ ...display, fontSize: '24px', color: '#fff', letterSpacing: '1px', lineHeight: 1.2 }}>
            {packageData.headline}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            <PixelBadge variant="gold">{packageData.finalScore}</PixelBadge>
            {packageData.rivalry ? (
              <PixelBadge variant="red">{`${packageData.rivalry.tier.replace('_', ' ')} // ${packageData.rivalry.intensity}`}</PixelBadge>
            ) : null}
            {packageData.stakes.map((s) => (
              <PixelBadge key={s.label} variant="default">{s.label.toUpperCase()}</PixelBadge>
            ))}
          </div>
        </div>
      </PixelPanel>

      {/* Two-column grid: Turning Points + Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <PixelPanel title="Turning Points" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            {packageData.turningPoints.map((point) => (
              <div key={point.label}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
                  <PixelBadge variant={impactVariant(point.impact)}>
                    {point.impact.toUpperCase()}
                  </PixelBadge>
                  <span style={{ ...mono, fontWeight: 600, color: '#ddd' }}>{point.label}</span>
                </div>
                <div style={{ ...monoSm, color: '#888', lineHeight: 1.5 }}>{point.detail}</div>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Top Performers" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {packageData.topPerformers.map((perf) => {
              const posMatch = perf.label.match(/\((\w+)\)/);
              const pos = posMatch ? posMatch[1] : '';
              const name = perf.label.replace(/\s*\(\w+\)\s*/, '');
              return (
                <div key={perf.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PixelBadge variant="gold">{pos}</PixelBadge>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...display, fontSize: '18px', color: '#fff', letterSpacing: '1px' }}>
                      {name.toUpperCase()}
                    </div>
                    <div style={{ ...monoSm, color: '#aaa' }}>{perf.statLine}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      </div>

      {/* Two-column: Autopsy + Press Conference */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
        <PixelPanel title="Postgame Autopsy" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <div style={{ ...mono, fontWeight: 600, color: '#ddd' }}>{packageData.autopsy.diagnosis}</div>
            <div style={{ ...monoSm, color: '#888' }}>{packageData.autopsy.leverage}</div>
            {packageData.autopsy.nextFocus.map((item) => (
              <div key={item} style={{
                ...monoSm,
                color: '#777',
                paddingLeft: '8px',
                borderLeft: '2px solid #333',
              }}>
                {item}
              </div>
            ))}
          </div>
        </PixelPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelPanel title="Press Conference" accent="cyan">
            <div style={{ padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">{packageData.pressConference.theme.toUpperCase()}</PixelBadge>
              <PixelBadge variant={packageData.pressConference.tone === 'somber' ? 'red' : packageData.pressConference.tone === 'fired_up' ? 'gold' : 'green'}>
                {packageData.pressConference.tone.toUpperCase()}
              </PixelBadge>
              {packageData.rivalry ? <PixelBadge variant="red">RIVALRY</PixelBadge> : null}
            </div>
          </PixelPanel>
          <PixelDialog speaker={packageData.pressConference.speaker} accent="cyan">
            {packageData.pressConference.opener}
          </PixelDialog>
          {packageData.pressConference.reporterQuestions.map((question) => (
            <PixelDialog key={question.id} speaker="Reporter Q&A" accent="green">
              {`Q: ${question.prompt}\nA: ${question.response}`}
            </PixelDialog>
          ))}
          {packageData.pressConference.quotes.map((quote, i) => (
            <PixelDialog key={i} speaker={i === 0 ? 'Reporter Q&A' : undefined} accent="green" showCursor={i === packageData.pressConference.quotes.length - 1}>
              {quote}
            </PixelDialog>
          ))}
        </div>
      </div>

      {packageData.activeEffectSummaries.length > 0 && (
        <PixelPanel title="Off-Field Carryover" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px' }}>
            {packageData.activeEffectSummaries.map((summary) => (
              <div key={summary} style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                {summary}
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {/* Injury notes */}
      {packageData.injuryNotes.length > 0 && (
        <PixelPanel title="Injury Report" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }}>
            {packageData.injuryNotes.map((note) => (
              <div key={note} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PixelBadge variant="red">INJ</PixelBadge>
                <span style={{ ...monoSm, color: '#f87171' }}>{note}</span>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}
    </div>
  );
}

/* ── Box Score Components ────────────────────────────────── */

const cellStyle = { padding: '6px 8px', textAlign: 'right' as const, ...monoSm, color: '#aaa' };
const headerCell = {
  padding: '6px 8px',
  textAlign: 'center' as const,
  fontFamily: 'var(--mfd-font-pixel)' as const,
  fontSize: '7px',
  color: '#555',
  borderBottom: '2px solid #333',
  background: '#0c0c0c',
};
const nameCell = { ...cellStyle, textAlign: 'left' as const, color: '#ddd', fontWeight: 500 };

function PixelBoxTable({ children, headers }: { children: React.ReactNode; headers: string[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={h} style={{ ...headerCell, textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function PlayerBoxLines({ lines, title }: { lines: PlayerGameLine[]; title: string }) {
  if (lines.length === 0) return null;

  if (title === 'Passing') {
    const qbs = lines.filter((l) => (l.passAtt ?? 0) > 0);
    if (qbs.length === 0) return null;
    return (
      <div>
        <div style={{ ...pixelSm, color: '#555', marginBottom: '4px', letterSpacing: '1px' }}>{title.toUpperCase()}</div>
        <PixelBoxTable headers={['PLAYER', 'CMP/ATT', 'YDS', 'TD', 'INT', 'SK']}>
          {qbs.map((l) => (
            <tr key={l.playerId} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={nameCell}>{l.name}</td>
              <td style={cellStyle}>{l.passComp ?? 0}/{l.passAtt ?? 0}</td>
              <td style={cellStyle}>{l.passYds ?? 0}</td>
              <td style={cellStyle}>{l.passTD ?? 0}</td>
              <td style={cellStyle}>{l.passINT ?? 0}</td>
              <td style={cellStyle}>{l.sacked ?? 0}</td>
            </tr>
          ))}
        </PixelBoxTable>
      </div>
    );
  }

  if (title === 'Rushing') {
    const runners = lines.filter((l) => (l.rushAtt ?? 0) > 0).sort((a, b) => (b.rushYds ?? 0) - (a.rushYds ?? 0));
    if (runners.length === 0) return null;
    return (
      <div>
        <div style={{ ...pixelSm, color: '#555', marginBottom: '4px', letterSpacing: '1px' }}>{title.toUpperCase()}</div>
        <PixelBoxTable headers={['PLAYER', 'CAR', 'YDS', 'TD', 'FUM']}>
          {runners.map((l) => (
            <tr key={l.playerId} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={nameCell}>{l.name}</td>
              <td style={cellStyle}>{l.rushAtt ?? 0}</td>
              <td style={cellStyle}>{l.rushYds ?? 0}</td>
              <td style={cellStyle}>{l.rushTD ?? 0}</td>
              <td style={cellStyle}>{l.fumbles ?? 0}</td>
            </tr>
          ))}
        </PixelBoxTable>
      </div>
    );
  }

  if (title === 'Receiving') {
    const recs = lines.filter((l) => (l.targets ?? 0) > 0).sort((a, b) => (b.recYds ?? 0) - (a.recYds ?? 0));
    if (recs.length === 0) return null;
    return (
      <div>
        <div style={{ ...pixelSm, color: '#555', marginBottom: '4px', letterSpacing: '1px' }}>{title.toUpperCase()}</div>
        <PixelBoxTable headers={['PLAYER', 'TGT', 'REC', 'YDS', 'TD']}>
          {recs.map((l) => (
            <tr key={l.playerId} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={nameCell}>{l.name}</td>
              <td style={cellStyle}>{l.targets ?? 0}</td>
              <td style={cellStyle}>{l.rec ?? 0}</td>
              <td style={cellStyle}>{l.recYds ?? 0}</td>
              <td style={cellStyle}>{l.recTD ?? 0}</td>
            </tr>
          ))}
        </PixelBoxTable>
      </div>
    );
  }

  if (title === 'Defense') {
    const defs = lines.filter((l) => (l.tackles ?? 0) > 0 || (l.sacks ?? 0) > 0 || (l.defINT ?? 0) > 0)
      .sort((a, b) => (b.tackles ?? 0) - (a.tackles ?? 0));
    if (defs.length === 0) return null;
    return (
      <div>
        <div style={{ ...pixelSm, color: '#555', marginBottom: '4px', letterSpacing: '1px' }}>{title.toUpperCase()}</div>
        <PixelBoxTable headers={['PLAYER', 'TKL', 'SACK', 'INT']}>
          {defs.slice(0, 8).map((l) => (
            <tr key={l.playerId} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={nameCell}>
                {l.name} <span style={{ ...pixelSm, color: '#555' }}>{l.pos}</span>
              </td>
              <td style={cellStyle}>{l.tackles ?? 0}</td>
              <td style={cellStyle}>{l.sacks ?? 0}</td>
              <td style={cellStyle}>{l.defINT ?? 0}</td>
            </tr>
          ))}
        </PixelBoxTable>
      </div>
    );
  }

  if (title === 'Kicking') {
    const kickers = lines.filter((l) => (l.fgAtt ?? 0) > 0);
    if (kickers.length === 0) return null;
    return (
      <div>
        <div style={{ ...pixelSm, color: '#555', marginBottom: '4px', letterSpacing: '1px' }}>{title.toUpperCase()}</div>
        <PixelBoxTable headers={['PLAYER', 'FGM/FGA']}>
          {kickers.map((l) => (
            <tr key={l.playerId} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={nameCell}>{l.name}</td>
              <td style={cellStyle}>{l.fgMade ?? 0}/{l.fgAtt ?? 0}</td>
            </tr>
          ))}
        </PixelBoxTable>
      </div>
    );
  }

  return null;
}

function FullBoxScore({ gameResult, userTeamId }: { gameResult: GameResult; userTeamId: string }) {
  const teams = useGameStore(selectTeams);
  if (!teams) return null;

  const homeStats = gameResult.stats[gameResult.homeTeamId];
  const awayStats = gameResult.stats[gameResult.awayTeamId];
  if (!homeStats || !awayStats) return null;

  const homeTeam = teams[gameResult.homeTeamId];
  const awayTeam = teams[gameResult.awayTeamId];
  const homeName = homeTeam ? `${homeTeam.city} ${homeTeam.name}` : 'Home';
  const awayName = awayTeam ? `${awayTeam.city} ${awayTeam.name}` : 'Away';
  const homeAbbr = homeTeam ? makeAbbr(homeTeam.name) : 'HOM';
  const awayAbbr = awayTeam ? makeAbbr(awayTeam.name) : 'AWY';

  const isHome = gameResult.homeTeamId === userTeamId;
  const userStats = isHome ? homeStats : awayStats;
  const oppStats = isHome ? awayStats : homeStats;
  const userLabel = isHome ? homeName : awayName;
  const oppLabel = isHome ? awayName : homeName;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Pixel Scoreboard */}
      <PixelScoreboard
        homeAbbr={homeAbbr}
        awayAbbr={awayAbbr}
        homeScore={gameResult.homeScore}
        awayScore={gameResult.awayScore}
        homeRecord={homeTeam ? `${homeTeam.wins}-${homeTeam.losses}` : undefined}
        awayRecord={awayTeam ? `${awayTeam.wins}-${awayTeam.losses}` : undefined}
        quarterScores={{
          home: Array.from(homeStats.quarterScores ?? []),
          away: Array.from(awayStats.quarterScores ?? []),
        }}
      />

      {/* Stat comparison bars */}
      <PixelPanel title="Team Stats" accent="default">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
          <PixelStatBar
            label="Total Yards"
            homeValue={homeStats.totalYards}
            awayValue={awayStats.totalYards}
            homeRatio={safeRatio(homeStats.totalYards, awayStats.totalYards)}
          />
          <PixelStatBar
            label="Passing"
            homeValue={`${homeStats.passCompletions ?? 0}/${homeStats.passAttempts ?? 0}`}
            awayValue={`${awayStats.passCompletions ?? 0}/${awayStats.passAttempts ?? 0}`}
            homeRatio={safeRatio(homeStats.passingYards, awayStats.passingYards)}
          />
          <PixelStatBar
            label="Rush Yards"
            homeValue={homeStats.rushingYards}
            awayValue={awayStats.rushingYards}
            homeRatio={safeRatio(homeStats.rushingYards, awayStats.rushingYards)}
          />
          <PixelStatBar
            label="Turnovers"
            homeValue={homeStats.turnovers}
            awayValue={awayStats.turnovers}
          />
          <PixelStatBar
            label="Sacks"
            homeValue={homeStats.sacks}
            awayValue={awayStats.sacks}
            homeRatio={safeRatio(homeStats.sacks, awayStats.sacks)}
          />
          <PixelStatBar
            label="3rd Down"
            homeValue={`${homeStats.thirdDownConversions}/${homeStats.thirdDownAttempts}`}
            awayValue={`${awayStats.thirdDownConversions}/${awayStats.thirdDownAttempts}`}
            homeRatio={safeRatio(homeStats.thirdDownConversions, awayStats.thirdDownConversions)}
          />
          <PixelStatBar
            label="Penalties"
            homeValue={`${homeStats.penalties ?? 0}`}
            awayValue={`${awayStats.penalties ?? 0}`}
          />
        </div>
      </PixelPanel>

      {/* Player box scores — user team */}
      <PixelPanel title={`${userLabel} Box Score`} accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
          <PlayerBoxLines lines={userStats.playerLines ?? []} title="Passing" />
          <PlayerBoxLines lines={userStats.playerLines ?? []} title="Rushing" />
          <PlayerBoxLines lines={userStats.playerLines ?? []} title="Receiving" />
          <PlayerBoxLines lines={userStats.playerLines ?? []} title="Defense" />
          <PlayerBoxLines lines={userStats.playerLines ?? []} title="Kicking" />
        </div>
      </PixelPanel>

      {/* Player box scores — opponent */}
      <PixelPanel title={`${oppLabel} Box Score`} accent="red">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
          <PlayerBoxLines lines={oppStats.playerLines ?? []} title="Passing" />
          <PlayerBoxLines lines={oppStats.playerLines ?? []} title="Rushing" />
          <PlayerBoxLines lines={oppStats.playerLines ?? []} title="Receiving" />
          <PlayerBoxLines lines={oppStats.playerLines ?? []} title="Defense" />
          <PlayerBoxLines lines={oppStats.playerLines ?? []} title="Kicking" />
        </div>
      </PixelPanel>
    </div>
  );
}

export function GameDayRecap() {
  const team = useGameStore(selectUserTeam);
  const phase = useGameStore(selectPhase);
  const year = useGameStore(selectYear);
  const packageData = useGameStore(selectLatestGameDayPackage);
  const gameResult = useGameStore(selectLatestGameResult);

  if (!team) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GameDayCenterView teamLabel={`${team.city} ${team.name}`} phase={phase} year={year} packageData={packageData} />
      {gameResult && <FullBoxScore gameResult={gameResult} userTeamId={team.id} />}
    </div>
  );
}
