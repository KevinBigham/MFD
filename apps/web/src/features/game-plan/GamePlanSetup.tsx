import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelSelect } from '@mfd/design-system/components';
import type { DefensiveGamePlan, GamePlan, OffensiveGamePlan } from '@mfd/engine';
import {
  selectCurrentGamePlan,
  selectCurrentOpponentReport,
  selectPhase,
  selectUserTeam,
  selectWeek,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';

const offenseOptions: Array<{ value: OffensiveGamePlan; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'pass_heavy', label: 'Pass Heavy' },
  { value: 'run_heavy', label: 'Run Heavy' },
  { value: 'spread', label: 'Spread' },
  { value: 'power', label: 'Power' },
];

const defenseOptions: Array<{ value: DefensiveGamePlan; label: string }> = [
  { value: 'base', label: 'Base' },
  { value: 'blitz_heavy', label: 'Blitz Heavy' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'contain', label: 'Contain' },
  { value: 'aggressive', label: 'Aggressive' },
];

export function GamePlanSetup() {
  const week = useGameStore(selectWeek);
  const phase = useGameStore(selectPhase);
  const team = useGameStore(selectUserTeam);
  const currentGamePlan = useGameStore(selectCurrentGamePlan);
  const report = useGameStore(selectCurrentOpponentReport);
  const { advanceWeek, clearGamePlan, saveGamePlan } = useGameStore((state) => state.actions);

  const defaultPlan = currentGamePlan ?? {
    offensiveScheme: report?.schemeRecommendation.offense ?? 'balanced',
    defensiveScheme: report?.schemeRecommendation.defense ?? 'base',
    keyMatchup: null,
    gamePlanBonus: 0,
  };
  const [offensiveScheme, setOffensiveScheme] = useState<OffensiveGamePlan>(defaultPlan.offensiveScheme);
  const [defensiveScheme, setDefensiveScheme] = useState<DefensiveGamePlan>(defaultPlan.defensiveScheme);
  const [keyMatchupPlayer, setKeyMatchupPlayer] = useState(defaultPlan.keyMatchup?.playerA ?? '');

  const matchupOptions = useMemo(() => (
    team?.roster.map((player) => ({ value: player.id, label: `${player.name} // ${player.pos}` })) ?? []
  ), [team]);

  const recommendedOffense = report?.schemeRecommendation.offense ?? 'balanced';
  const recommendedDefense = report?.schemeRecommendation.defense ?? 'base';

  const currentPlan: GamePlan = {
    offensiveScheme,
    defensiveScheme,
    keyMatchup: keyMatchupPlayer && report?.keyPlayers[0]
      ? { playerA: keyMatchupPlayer, playerB: report.keyPlayers[0].id }
      : null,
    gamePlanBonus: 0,
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Game Plan"
        subtitle={`${phase.replaceAll('_', ' ')} // week ${week} // tactical edge before kickoff`}
        badges={(
          <>
            <PixelBadge variant="gold">Recommended: {recommendedOffense}</PixelBadge>
            <PixelBadge variant="cyan">Recommended: {recommendedDefense}</PixelBadge>
          </>
        )}
      />

      {report ? (
        <>
          <div style={autoGrid(260)}>
            <PixelPanel title="Opponent Report" accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{report.teamName}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="default">{report.record}</PixelBadge>
                  <PixelBadge variant="cyan">OFF #{report.offenseRank}</PixelBadge>
                  <PixelBadge variant="red">DEF #{report.defenseRank}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Strengths: {report.strengths.join(' | ')}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Weaknesses: {report.weaknesses.join(' | ')}
                </div>
              </div>
            </PixelPanel>

            <PixelPanel title="AI Recommendation" accent="green">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{report.schemeRecommendation.reasoning}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="gold">{report.schemeRecommendation.offense}</PixelBadge>
                  <PixelBadge variant="cyan">{report.schemeRecommendation.defense}</PixelBadge>
                </div>
              </div>
            </PixelPanel>
          </div>

          <div style={autoGrid(260)}>
            <PixelPanel title="Offensive Scheme" accent={offensiveScheme === recommendedOffense ? 'gold' : 'default'}>
              <PixelSelect
                value={offensiveScheme}
                onChange={(event) => setOffensiveScheme(event.target.value as OffensiveGamePlan)}
                options={offenseOptions}
                accent={offensiveScheme === recommendedOffense ? 'gold' : 'cyan'}
              />
            </PixelPanel>

            <PixelPanel title="Defensive Scheme" accent={defensiveScheme === recommendedDefense ? 'gold' : 'default'}>
              <PixelSelect
                value={defensiveScheme}
                onChange={(event) => setDefensiveScheme(event.target.value as DefensiveGamePlan)}
                options={defenseOptions}
                accent={defensiveScheme === recommendedDefense ? 'gold' : 'cyan'}
              />
            </PixelPanel>

            <PixelPanel title="Key Matchup" accent="cyan">
              <PixelSelect
                value={keyMatchupPlayer}
                onChange={(event) => setKeyMatchupPlayer(event.target.value)}
                options={[{ value: '', label: 'No targeted matchup' }, ...matchupOptions]}
                accent="cyan"
              />
            </PixelPanel>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <PixelButton
              accent="gold"
              onClick={() => {
                void clearGamePlan();
                void advanceWeek();
              }}
            >
              Skip With AI Plan
            </PixelButton>
            <PixelButton
              accent="green"
              onClick={() => {
                void saveGamePlan(currentPlan, report);
                void advanceWeek();
              }}
            >
              Confirm &amp; Sim
            </PixelButton>
          </div>
        </>
      ) : (
        <PixelPanel title="Scouting Pending" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No opponent report is available for this week.</div>
        </PixelPanel>
      )}
    </div>
  );
}
