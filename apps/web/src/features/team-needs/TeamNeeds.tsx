import { useMemo, useState } from 'react';
import { PixelBadge, PixelPanel, PixelProgressBar, PixelSelect } from '@mfd/design-system/components';
import {
  selectTeamNeedsComparison,
  selectTeams,
  selectUserTeam,
  selectUserTeamNeeds,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function gradeAccent(grade: string): 'green' | 'cyan' | 'gold' | 'red' {
  if (grade.startsWith('A')) return 'green';
  if (grade.startsWith('B')) return 'cyan';
  if (grade.startsWith('C')) return 'gold';
  return 'red';
}

function riskAccent(risk: 'low' | 'medium' | 'high'): 'green' | 'gold' | 'red' {
  return risk === 'high' ? 'red' : risk === 'medium' ? 'gold' : 'green';
}

function actionLabel(position: string, capFlexibility: 'tight' | 'moderate' | 'abundant'): string {
  if (capFlexibility === 'tight') return `${position}: draft now`;
  if (position === 'QB' || position === 'CB' || position === 'OL') return `${position}: trade / FA`;
  return `${position}: FA depth`;
}

export function TeamNeeds() {
  const team = useGameStore(selectUserTeam);
  const report = useGameStore(selectUserTeamNeeds);
  const teams = useGameStore(selectTeams);
  const compareOptions = useMemo(() => (
    Object.values(teams ?? {})
      .filter((entry) => !entry.isUser)
      .sort((a, b) => a.city.localeCompare(b.city))
      .map((entry) => ({
        value: entry.id,
        label: `${entry.city} ${entry.name}`,
      }))
  ), [teams]);
  const [compareTeamId, setCompareTeamId] = useState(compareOptions[0]?.value ?? '');
  const comparison = useGameStore(selectTeamNeedsComparison(compareTeamId || null));
  const topStrengthCards = report.positionGrades
    .filter((entry) => report.strengths.includes(entry.group))
    .sort((a, b) => report.strengths.indexOf(a.group) - report.strengths.indexOf(b.group));

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Team Needs"
        subtitle={`${team ? `${team.city} ${team.name}` : 'User Team'} // ${report.overall}`}
        badges={(
          <>
            <PixelBadge variant="gold">{report.capFlexibility}</PixelBadge>
            <PixelBadge variant="cyan">{report.criticalNeeds.length} priority rooms</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Overall" value={report.overall.split(' ')[0] ?? 'Report'} accent="gold" detail={report.overall} />
        <PixelMetricCard label="Critical Needs" value={report.criticalNeeds.length} accent="red" detail={report.criticalNeeds.join(' / ') || 'No urgent holes'} />
        <PixelMetricCard label="Strengths" value={report.strengths.length} accent="green" detail={report.strengths.join(' / ') || 'Balanced roster'} />
        <PixelMetricCard label="Cap Flex" value={report.capFlexibility} accent={report.capFlexibility === 'abundant' ? 'green' : report.capFlexibility === 'moderate' ? 'cyan' : 'red'} detail="How aggressive you can be" />
      </div>

      <div style={autoGrid(300)}>
        <PixelPanel title="Critical Needs" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.criticalNeeds.map((position, index) => (
              <div key={position} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>PRIORITY {index + 1}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{actionLabel(position, report.capFlexibility)}</div>
                </div>
                <PixelBadge variant="red">{position}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Strengths" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topStrengthCards.map((entry) => (
              <div key={entry.group} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.group} room</div>
                  {entry.topPlayer ? (
                    <PlayerNameLink
                      playerId={entry.topPlayer.id}
                      name={entry.topPlayer.name}
                      ovr={entry.topPlayer.ovr}
                      style={{ ...monoSm }}
                    />
                  ) : null}
                </div>
                <PixelBadge variant="green">{entry.grade}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(220)}>
        {report.positionGrades.map((entry) => (
          <PixelPanel key={entry.group} title={entry.group} accent={gradeAccent(entry.grade)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Grade</span>
                <PixelBadge variant={gradeAccent(entry.grade)}>{entry.grade}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Starter OVR</span>
                <PixelBadge variant="cyan">{entry.starterOvr}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Room Avg</span>
                <PixelBadge variant="default">{entry.avgOvr}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Depth</span>
                <PixelBadge variant="gold">{entry.depth}</PixelBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Age Risk</span>
                <PixelBadge variant={riskAccent(entry.ageRisk)}>{entry.ageRisk}</PixelBadge>
              </div>
              {entry.topPlayer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>Top player</span>
                  <PlayerNameLink playerId={entry.topPlayer.id} name={entry.topPlayer.name} ovr={entry.topPlayer.ovr} style={{ ...monoSm }} />
                </div>
              ) : null}
              {entry.weakestStarter ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>Weakest starter</span>
                  <PlayerNameLink playerId={entry.weakestStarter.id} name={entry.weakestStarter.name} ovr={entry.weakestStarter.ovr} style={{ ...monoSm }} />
                </div>
              ) : null}
            </div>
          </PixelPanel>
        ))}
      </div>

      <div style={autoGrid(300)}>
        <PixelPanel title="Draft Targets" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.draftTargets.map((target) => (
              <div key={`draft-${target}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{target}</span>
                <PixelBadge variant="gold">board first</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="FA Targets" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {report.faTargets.map((target) => (
              <div key={`fa-${target}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{target}</span>
                <PixelBadge variant="cyan">market help</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Compare Rooms" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelSelect
            aria-label="Compare team"
            value={compareTeamId}
            onChange={(event) => setCompareTeamId(event.target.value)}
            options={compareOptions.length > 0 ? compareOptions : [{ value: '', label: 'No comparison teams', disabled: true }]}
            accent="cyan"
          />
          {comparison.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comparison.map((entry) => (
                <div key={entry.group} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 90px 1fr', gap: '8px', alignItems: 'center' }}>
                  <PixelBadge variant="default">{entry.group}</PixelBadge>
                  <PixelProgressBar value={Math.max(0, Math.min(100, ((entry.differential + 20) / 40) * 100))} accent={entry.edge === 'teamA' ? 'green' : entry.edge === 'teamB' ? 'red' : 'gold'} label={entry.teamAGrade} valueLabel={`${entry.differential > 0 ? '+' : ''}${entry.differential}`} />
                  <PixelBadge variant={entry.edge === 'teamA' ? 'green' : entry.edge === 'teamB' ? 'red' : 'gold'}>{entry.edge}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.teamBGrade}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Pick another club to compare strengths and weaknesses room by room.
            </div>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}
