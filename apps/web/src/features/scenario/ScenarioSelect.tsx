import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  selectAvailableScenarios,
  selectScenarioState,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

function difficultyAccent(difficulty: string): 'green' | 'cyan' | 'gold' | 'red' {
  if (difficulty === 'rookie') return 'green';
  if (difficulty === 'pro') return 'cyan';
  if (difficulty === 'all_pro') return 'gold';
  return 'red';
}

function gradeAccent(grade: string): 'gold' | 'green' | 'cyan' | 'red' | 'default' {
  if (grade === 'S') return 'gold';
  if (grade === 'A') return 'green';
  if (grade === 'B') return 'cyan';
  if (grade === 'C' || grade === 'D') return 'red';
  return 'default';
}

export function ScenarioSelect() {
  const scenarioState = useGameStore(selectScenarioState);
  const scenarios = useGameStore(selectAvailableScenarios);
  const startScenarioChallenge = useGameStore((state) => state.actions.startScenarioChallenge);

  const handleStart = async (scenarioId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Starting a scenario challenge replaces the current in-memory dynasty. Continue?');
      if (!confirmed) return;
    }
    await startScenarioChallenge(scenarioId);
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Scenario Challenges"
        subtitle="Prebuilt franchise gauntlets with explicit constraints, season limits, and grading."
        badges={scenarioState?.activeScenario ? <PixelBadge variant="gold">ACTIVE</PixelBadge> : <PixelBadge variant="cyan">{scenarios.length} scenarios</PixelBadge>}
      />

      {scenarioState?.activeScenario ? (
        <>
          <div style={autoGrid(260)}>
            <PixelPanel title={scenarioState.activeScenario.name} accent={difficultyAccent(scenarioState.activeScenario.difficulty)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{scenarioState.activeScenario.tagline}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={difficultyAccent(scenarioState.activeScenario.difficulty)}>
                    {scenarioState.activeScenario.difficulty.toUpperCase()}
                  </PixelBadge>
                  <PixelBadge variant="default">
                    SEASON {scenarioState.scenarioSeason} / {scenarioState.activeScenario.seasonLimit}
                  </PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{scenarioState.activeScenario.description}</div>
              </div>
            </PixelPanel>

            <PixelPanel title="Constraints" accent="red">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {scenarioState.activeScenario.constraints.blockTrades ? <PixelBadge variant="red">TRADES BLOCKED</PixelBadge> : null}
                {scenarioState.activeScenario.constraints.blockFreeAgency ? <PixelBadge variant="red">FA BLOCKED</PixelBadge> : null}
                {scenarioState.activeScenario.constraints.blockDraft ? <PixelBadge variant="red">DRAFT BLOCKED</PixelBadge> : null}
                {!scenarioState.activeScenario.constraints.blockTrades
                  && !scenarioState.activeScenario.constraints.blockFreeAgency
                  && !scenarioState.activeScenario.constraints.blockDraft ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No extra restrictions applied.</div>
                  ) : null}
              </div>
            </PixelPanel>
          </div>

          <div style={autoGrid(320)}>
            <PixelPanel title="Primary Objectives" accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scenarioState.activeScenario.objectives.map((objective) => (
                  <div key={objective.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{objective.description}</div>
                    <PixelBadge variant={objective.completed ? 'green' : 'default'}>
                      {objective.completed ? 'DONE' : 'OPEN'}
                    </PixelBadge>
                  </div>
                ))}
              </div>
            </PixelPanel>

            <PixelPanel title="Bonus Objectives" accent="cyan">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scenarioState.activeScenario.bonusObjectives.map((objective) => (
                  <div key={objective.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{objective.description}</div>
                    <PixelBadge variant={objective.completed ? 'green' : 'default'}>
                      {objective.completed ? 'DONE' : 'OPEN'}
                    </PixelBadge>
                  </div>
                ))}
              </div>
            </PixelPanel>
          </div>
        </>
      ) : (
        <div style={autoGrid(260)}>
          {scenarios.map((scenario) => (
            <PixelPanel key={scenario.id} title={scenario.name} accent={difficultyAccent(scenario.difficulty)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{scenario.tagline}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{scenario.description}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={difficultyAccent(scenario.difficulty)}>
                    {scenario.difficulty.toUpperCase()}
                  </PixelBadge>
                  <PixelBadge variant="default">{scenario.seasonLimit} SEASONS</PixelBadge>
                  <PixelBadge variant="cyan">{scenario.objectives.length} OBJECTIVES</PixelBadge>
                </div>
                <PixelButton accent="gold" onClick={() => { void handleStart(scenario.id); }}>
                  Start Challenge
                </PixelButton>
              </div>
            </PixelPanel>
          ))}
        </div>
      )}

      <PixelPanel title="Completed Scenarios" accent="green">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(scenarioState?.completedScenarios ?? []).length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No completed scenarios yet.</div>
          ) : (
            scenarioState!.completedScenarios.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{entry.id}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={gradeAccent(entry.grade)}>{entry.grade}</PixelBadge>
                  <PixelBadge variant="default">{entry.score}</PixelBadge>
                </div>
              </div>
            ))
          )}
        </div>
      </PixelPanel>
    </div>
  );
}
