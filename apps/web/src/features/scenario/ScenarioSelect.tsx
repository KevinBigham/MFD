import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getScenarioConstraintCoverage, type ScenarioConstraintCoverageItem } from '@mfd/engine';
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

function constraintAccent(item: ScenarioConstraintCoverageItem): 'green' | 'gold' | 'red' {
  if (item.status === 'enforced') return 'green';
  return 'gold';
}

function ConstraintCoverageList({ items }: { items: ScenarioConstraintCoverageItem[] }) {
  if (items.length === 0) {
    return <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No extra restrictions applied.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid var(--mfd-border)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant={constraintAccent(item)}>{item.label.toUpperCase()}</PixelBadge>
            <PixelBadge variant={item.status === 'enforced' ? 'green' : 'gold'}>
              {item.status === 'enforced' ? 'CURRENTLY ENFORCED' : 'NOT ENFORCED'}
            </PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{item.summary}</div>
          {item.enforcedPaths.length > 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-green)' }}>
              Enforced: {item.enforcedPaths.join(' // ')}
            </div>
          ) : null}
          {item.allowedPlanningPaths.length > 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>
              Still open: {item.allowedPlanningPaths.join(' // ')}
            </div>
          ) : null}
          {item.uncoveredPaths.length > 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Not covered yet: {item.uncoveredPaths.join(' // ')}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function blockedActionAdvice(item: ScenarioConstraintCoverageItem): { attempt: string; fallback: string } {
  if (item.id === 'trade_market') {
    return {
      attempt: 'Blocked trade attempts leave rosters, picks, cap, deadline boards, and draft war-room offers unchanged.',
      fallback: 'Use your current roster, depth chart, draft board, internal development, and cap tools until the scenario ends.',
    };
  }
  if (item.id === 'offseason_free_agency') {
    return {
      attempt: 'Blocked acquisition attempts leave bids, waiver claims, practice-squad adds, free agents, roster spots, and cap totals unchanged.',
      fallback: 'Use current players, internal promotions, draft picks, waivers that have already cleared to allowed states, and development paths the scenario still permits.',
    };
  }
  return {
    attempt: 'Blocked draft-pick attempts leave the draft board, roster, picks, and prospect pool unchanged.',
    fallback: 'Use scouting, rankings, and future planning without submitting a user draft selection while the scenario lock is active.',
  };
}

function BlockedActionGuide({ items }: { items: ScenarioConstraintCoverageItem[] }) {
  const enforcedItems = items.filter((item) => item.status === 'enforced');
  if (enforcedItems.length === 0) return null;

  return (
    <PixelPanel title="Blocked Action Guide" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {enforcedItems.map((item) => {
          const advice = blockedActionAdvice(item);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <PixelBadge variant={constraintAccent(item)}>{item.label.toUpperCase()}</PixelBadge>
                <PixelBadge variant="gold">ATTEMPT STAYS UNCOMMITTED</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {advice.attempt}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                Next move: {advice.fallback}
              </div>
            </div>
          );
        })}
      </div>
    </PixelPanel>
  );
}

function ScenarioSourcesPanel({
  activeScenarioName,
  scenarioCount,
}: {
  activeScenarioName: string | null;
  scenarioCount: number;
}) {
  const rows = [
    {
      label: 'Catalog',
      badge: `${scenarioCount} scenarios`,
      detail: 'Source: selectAvailableScenarios reads getAvailableScenarios(), the engine-owned scenario catalog. This route does not create or edit scenario definitions.',
    },
    {
      label: 'Constraint coverage',
      badge: 'coverage helper',
      detail: 'Source: getScenarioConstraintCoverage maps saved blockTrades, blockFreeAgency, and blockDraft flags to enforced and still-open paths.',
    },
    {
      label: 'Start action',
      badge: 'explicit action',
      detail: 'Only Start Challenge calls actions.startScenarioChallenge, which uses createSeedGameState, runs startScenario, deletes setupState, commits the new game through commitGame, and navigates home.',
    },
    {
      label: 'Just viewing',
      badge: activeScenarioName ? activeScenarioName : 'display only',
      detail: 'Opening /scenarios does not start or grade challenges, change scenario state, delete setupState, replace the dynasty, autosave, navigate, move players, or play games or reroll saved outcomes.',
    },
  ];

  return (
    <PixelPanel title="Scenario Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
              <PixelBadge variant={row.label === 'Just viewing' ? 'green' : 'cyan'}>{row.badge}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
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
  const activeCoverage = scenarioState?.activeScenario
    ? getScenarioConstraintCoverage(scenarioState.activeScenario.constraints)
    : null;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Scenario Challenges"
        subtitle="Prebuilt franchise gauntlets with explicit constraints, season limits, and grading."
        badges={scenarioState?.activeScenario ? <PixelBadge variant="gold">ACTIVE</PixelBadge> : <PixelBadge variant="cyan">{scenarios.length} scenarios</PixelBadge>}
      />

      <ScenarioSourcesPanel
        activeScenarioName={scenarioState?.activeScenario?.name ?? null}
        scenarioCount={scenarios.length}
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
              <ConstraintCoverageList items={activeCoverage?.items ?? []} />
            </PixelPanel>
          </div>

          <BlockedActionGuide items={activeCoverage?.items ?? []} />

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
          {scenarios.map((scenario) => {
            const coverage = getScenarioConstraintCoverage(scenario.constraints);
            return (
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
                    {coverage.items.map((item) => (
                      <PixelBadge key={item.id} variant={constraintAccent(item)}>
                        {item.label.toUpperCase()}
                      </PixelBadge>
                    ))}
                  </div>
                  <PixelButton accent="gold" onClick={() => { void handleStart(scenario.id); }}>
                    Start Challenge
                  </PixelButton>
                </div>
              </PixelPanel>
            );
          })}
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
