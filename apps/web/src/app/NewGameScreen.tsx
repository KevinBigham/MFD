/**
 * New Game screen: team selection + difficulty creates seed state.
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MfdPanel, PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { Clock3, FileUp, Gamepad2, Play, Search, Shield, Trophy, Upload, Zap } from 'lucide-react';
import {
  CONVENTION_SAVE_METADATA,
  SAVE_VERSION,
  createFastLaneSetupState,
  generateConventionSave,
  getAvailableScenarios,
  getDefaultDifficultyFlags,
  getScenarioConstraintCoverage,
  mulberry32,
  startScenario,
  type DifficultyLevel,
  type GameState,
  type ScenarioConstraints,
} from '@mfd/engine';
import { useGameStore } from './store/game-store';
import { createSeedGameState, getTeamOptions } from './store/seed';
import { TeamLogo } from '../features/shared/TeamLogo';
import {
  autosaveDynasty,
  loadImportedCartridge,
  loadImportedCartridgeFile,
  loadLatestAutosaveGame,
} from './store/persistence';
import { AttractMode } from '../features/title/AttractMode';
import {
  persistSetupRunMode,
  readFirstTenMinutesCompleted,
  type SetupRunMode,
} from '../features/franchise-setup/setupPersistence';
import './new-game-screen.css';

const rookieDefaults = getDefaultDifficultyFlags('rookie');

const DIFFICULTIES: { id: DifficultyLevel; label: string; desc: string; guide: string }[] = [
  {
    id: 'rookie',
    label: 'Rookie',
    desc: 'Forgiving cap, patient owners',
    guide: rookieDefaults.skipHalftimeDecision
      ? 'Best for new players. Patient owners, forgiving cap, halftime decisions auto-skip.'
      : 'Best for new players. Patient owners, forgiving cap, room to experiment.',
  },
  { id: 'pro', label: 'Pro', desc: 'Balanced challenge', guide: 'Standard experience. Balanced across all systems.' },
  { id: 'allpro', label: 'All-Pro', desc: 'Tight cap, demanding owners', guide: 'For veterans. Tight cap, demanding owners, injuries hit harder.' },
  { id: 'legend', label: 'Legend', desc: 'Maximum pressure on every decision', guide: 'Maximum pressure. Not recommended for first playthrough.' },
];

const teams = getTeamOptions();
const conferences = ['AFC', 'NFC'] as const;
const divisions = ['East', 'North', 'South', 'West'] as const;
const conferenceFilters = ['ALL', ...conferences] as const;
const divisionFilters = ['ALL', ...divisions] as const;

type ConferenceFilter = (typeof conferenceFilters)[number];
type DivisionFilter = (typeof divisionFilters)[number];
type LaunchMode = 'dynasty' | 'scenario';

interface BuildLaunchGameStateInput {
  seed: number;
  selectedTeam: number;
  difficulty: DifficultyLevel;
  mode: LaunchMode;
  selectedScenarioId: string;
  setupRunMode?: SetupRunMode;
}

function scenarioCoverageAccent(status: string): 'green' | 'gold' {
  return status === 'enforced' ? 'green' : 'gold';
}

export function buildLaunchGameState({
  seed,
  selectedTeam,
  difficulty,
  mode,
  selectedScenarioId,
  setupRunMode = 'full',
}: BuildLaunchGameStateInput): ReturnType<typeof createSeedGameState> {
  const baseState = createSeedGameState(seed, selectedTeam, difficulty);
  if (mode !== 'scenario') {
    if (setupRunMode === 'fast_lane') {
      const userTeam = Object.values(baseState.teams).find((team) => team.isUser);
      if (!userTeam) {
        throw new Error('Cannot build Fast Lane setup without a selected user team.');
      }
      baseState.setupState = createFastLaneSetupState(baseState as GameState, userTeam.id);
    }

    return baseState;
  }

  const state = startScenario(
    selectedScenarioId,
    baseState,
    mulberry32(seed ^ (selectedScenarioId.length * 97)),
  );
  delete state.setupState;
  return state;
}

export function buildConventionDemoLaunchState(seed: number): ReturnType<typeof generateConventionSave> {
  return generateConventionSave('afce1', mulberry32(seed));
}

function resolveLaunchSetupStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function ScenarioLaunchCoverageBadges({
  constraints,
}: {
  constraints: Partial<ScenarioConstraints> | null | undefined;
}) {
  const coverage = getScenarioConstraintCoverage(constraints);

  if (coverage.items.length === 0) {
    return (
      <span className="mfd-scenario-card-coverage" aria-label="Scenario launch constraint coverage">
        <PixelBadge variant="default">Open rules</PixelBadge>
      </span>
    );
  }

  return (
    <span className="mfd-scenario-card-coverage" aria-label="Scenario launch constraint coverage">
      {coverage.items.map((item) => (
        <PixelBadge key={item.id} variant={scenarioCoverageAccent(item.status)}>
          {item.label} enforced
        </PixelBadge>
      ))}
    </span>
  );
}

function LaunchSourcesPanel() {
  return (
    <PixelPanel title="Launch Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <PixelBadge variant="gold">createSeedGameState</PixelBadge>
          <PixelBadge variant="green">actions.newGame</PixelBadge>
          <PixelBadge variant="cyan">validated loadGame</PixelBadge>
          <PixelBadge variant="default">setup-run mode</PixelBadge>
        </div>
        <p className="mfd-new-game-guide">
          Source: New Dynasty starts from the web seed factory, Scenario Challenge applies saved
          scenario constraints before first-run setup, Convention Demo uses the validated Week 14
          showcase builder, Continue calls loadGame only after autosave validation, and Import validates
          backup text/file data before writing a fresh autosave and calling loadGame.
          New Dynasty persists the selected setup-run mode immediately before `actions.newGame`; Full
          setup keeps the seeded setup state, while unlocked Fast Lane replaces only the initial
          setup state through the engine fast-lane factory. Rendering this screen does not create a
          dynasty, clear sidecars, autosave, import backups, start setup, play scheduled games, or write
          GameState.
        </p>
      </div>
    </PixelPanel>
  );
}

export function NewGameScreen() {
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('pro');
  const [mode, setMode] = useState<LaunchMode>('dynasty');
  const [setupLaunchMode, setSetupLaunchMode] = useState<SetupRunMode>('full');
  const [selectedScenarioId, setSelectedScenarioId] = useState(getAvailableScenarios()[0]?.id ?? 'rebuild');
  const [teamQuery, setTeamQuery] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('ALL');
  const [fastLaneUnlocked, setFastLaneUnlocked] = useState<boolean>(() => (
    readFirstTenMinutesCompleted(resolveLaunchSetupStorage())
  ));
  const [hasAutosave, setHasAutosave] = useState(false);
  const [loadingAutosave, setLoadingAutosave] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const newGame = useGameStore((s) => s.actions.newGame);
  const loadGame = useGameStore((s) => s.actions.loadGame);

  useEffect(() => {
    let active = true;
    loadLatestAutosaveGame()
      .then((game) => {
        if (active) setHasAutosave(Boolean(game));
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to probe autosave:', err);
          setHasAutosave(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!fastLaneUnlocked && setupLaunchMode === 'fast_lane') {
      setSetupLaunchMode('full');
    }
  }, [fastLaneUnlocked, setupLaunchMode]);

  const handleStart = async () => {
    const seed = Date.now();
    const activeSetupRunMode = fastLaneUnlocked ? setupLaunchMode : 'full';
    const state = buildLaunchGameState({
      seed,
      selectedTeam,
      difficulty,
      mode,
      selectedScenarioId,
      setupRunMode: activeSetupRunMode,
    });
    if (mode === 'dynasty') {
      persistSetupRunMode(resolveLaunchSetupStorage(), activeSetupRunMode);
    }
    await newGame(state);
  };

  const handleConventionDemo = async () => {
    const seed = Date.now();
    await newGame(buildConventionDemoLaunchState(seed));
  };

  const handleContinue = async () => {
    setLoadingAutosave(true);
    setAutosaveError(null);
    try {
      const latest = await loadLatestAutosaveGame();
      if (latest) {
        loadGame(latest);
      } else {
        setAutosaveError('Autosave data could not be loaded. It may be corrupted. Start a new dynasty instead.');
        setHasAutosave(false);
      }
    } catch (err) {
      console.error('Autosave load error:', err);
      setAutosaveError(err instanceof Error ? err.message : 'Failed to load autosave. The save file may be corrupted.');
      setHasAutosave(false);
    } finally {
      setLoadingAutosave(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);
    setAutosaveError(null);

    try {
      const imported = await loadImportedCartridgeFile(file);
      await autosaveDynasty(imported);
      setImportText('');
      loadGame(imported);
    } catch (err) {
      console.error('Dynasty file import error:', err);
      setAutosaveError(err instanceof Error ? err.message : 'Failed to import dynasty backup file.');
    } finally {
      event.target.value = '';
      setLoadingImport(false);
    }
  };

  const handleImportText = async () => {
    if (!importText.trim()) {
      setAutosaveError('Paste backup code before importing.');
      return;
    }

    setLoadingImport(true);
    setAutosaveError(null);

    try {
      const imported = loadImportedCartridge(importText.trim());
      await autosaveDynasty(imported);
      setImportText('');
      loadGame(imported);
    } catch (err) {
      console.error('Dynasty text import error:', err);
      setAutosaveError(err instanceof Error ? err.message : 'Failed to import backup code.');
    } finally {
      setLoadingImport(false);
    }
  };

  const scenarios = getAvailableScenarios();
  const selected = teams.find((team) => team.index === selectedTeam) ?? teams[0]!;
  const selectedDifficulty = DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[1]!;
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null;
  const normalizedTeamQuery = teamQuery.trim().toLowerCase();
  const filteredTeams = useMemo(
    () => teams.filter((team) => {
      const matchesConference = conferenceFilter === 'ALL' || team.conference === conferenceFilter;
      const matchesDivision = divisionFilter === 'ALL' || team.division === divisionFilter;
      const searchHaystack = `${team.abbr} ${team.city} ${team.name} ${team.fullName}`.toLowerCase();
      const matchesSearch = normalizedTeamQuery.length === 0 || searchHaystack.includes(normalizedTeamQuery);
      return matchesConference && matchesDivision && matchesSearch;
    }),
    [conferenceFilter, divisionFilter, normalizedTeamQuery],
  );
  const teamGroups = useMemo(
    () => conferences
      .map((conference) => ({
        conference,
        divisions: divisions
          .map((division) => ({
            division,
            teams: filteredTeams.filter((team) => team.conference === conference && team.division === division),
          }))
          .filter((group) => group.teams.length > 0),
      }))
      .filter((group) => group.divisions.length > 0),
    [filteredTeams],
  );
  const hasTeamFilters = normalizedTeamQuery.length > 0 || conferenceFilter !== 'ALL' || divisionFilter !== 'ALL';
  const activeSetupRunMode = fastLaneUnlocked ? setupLaunchMode : 'full';

  const clearTeamFilters = () => {
    setTeamQuery('');
    setConferenceFilter('ALL');
    setDivisionFilter('ALL');
  };

  const startLabel = mode === 'scenario' ? 'Start Challenge' : activeSetupRunMode === 'fast_lane' ? 'Start Fast Lane' : 'Start Dynasty';
  const launchSummary = mode === 'scenario'
    ? selectedScenario?.tagline ?? 'Scenario challenge'
    : `${selected.fullName} // ${selectedDifficulty.label} // ${activeSetupRunMode === 'fast_lane' ? 'Fast Lane' : 'Full Setup'}`;

  return (
    <div className="mfd-new-game-shell">
      <div className="mfd-new-game-layout">
        <header className="mfd-new-game-hero">
          <div>
            <div className="mfd-new-game-kicker">MFD NETWORK</div>
            <h1>Mr. Football Dynasty</h1>
            <p>Build a franchise, survive the week, keep the save.</p>
          </div>
          <div className="mfd-new-game-hero-badges" aria-label="Launch highlights">
            <PixelBadge variant="gold">v1.0</PixelBadge>
            <PixelBadge variant="cyan">Save v{SAVE_VERSION}</PixelBadge>
            <PixelBadge variant="green">Browser Dynasty</PixelBadge>
          </div>
        </header>

        <AttractMode
          teams={teams}
          scenarios={scenarios}
          conventionHeadline={CONVENTION_SAVE_METADATA.headline}
        />

        {autosaveError ? (
          <div className="mfd-new-game-error" role="alert" aria-live="assertive">
            {autosaveError}
          </div>
        ) : null}

        <div className="mfd-new-game-command-grid">
          <section className="mfd-new-game-builder" aria-label="Dynasty builder">
            <div className="mfd-new-game-mode-tabs" role="group" aria-label="Launch mode">
              <PixelButton
                accent={mode === 'dynasty' ? 'gold' : 'default'}
                aria-pressed={mode === 'dynasty'}
                onClick={() => setMode('dynasty')}
              >
                <Shield size={14} />
                New Dynasty
              </PixelButton>
              <PixelButton
                accent={mode === 'scenario' ? 'cyan' : 'default'}
                aria-pressed={mode === 'scenario'}
                onClick={() => setMode('scenario')}
              >
                <Trophy size={14} />
                Scenario Challenge
              </PixelButton>
            </div>

            <MfdPanel title="Select Franchise" icon={<Shield size={14} />}>
              <div className="mfd-team-picker-toolbar">
                <label className="mfd-team-search-label" htmlFor="mfd-team-search">
                  <Search size={14} />
                  Find franchise
                </label>
                <input
                  id="mfd-team-search"
                  className="mfd-team-search-input"
                  value={teamQuery}
                  onChange={(event) => setTeamQuery(event.target.value)}
                  placeholder="Search city, name, or abbreviation"
                />
                <div className="mfd-team-filter-row" role="group" aria-label="Conference filter">
                  {conferenceFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className="mfd-team-filter-chip"
                      data-selected={conferenceFilter === filter ? 'true' : 'false'}
                      aria-pressed={conferenceFilter === filter}
                      onClick={() => setConferenceFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="mfd-team-filter-row" role="group" aria-label="Division filter">
                  {divisionFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className="mfd-team-filter-chip"
                      data-selected={divisionFilter === filter ? 'true' : 'false'}
                      aria-pressed={divisionFilter === filter}
                      onClick={() => setDivisionFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="mfd-team-filter-status">
                  <span>{filteredTeams.length} teams shown</span>
                  {hasTeamFilters ? (
                    <button type="button" onClick={clearTeamFilters}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mfd-team-board">
                {teamGroups.length > 0 ? teamGroups.map((conferenceGroup) => (
                  <section key={conferenceGroup.conference} className="mfd-team-conference">
                    <div className="mfd-team-conference-header">{conferenceGroup.conference}</div>
                    <div className="mfd-team-division-grid">
                      {conferenceGroup.divisions.map((divisionGroup) => (
                        <section key={`${conferenceGroup.conference}-${divisionGroup.division}`} className="mfd-team-division">
                          <div className="mfd-team-division-label">{divisionGroup.division}</div>
                          <div className="mfd-team-grid">
                            {divisionGroup.teams.map((team) => {
                              const active = team.index === selectedTeam;
                              return (
                                <button
                                  key={team.index}
                                  type="button"
                                  className="mfd-team-card"
                                  data-selected={active ? 'true' : 'false'}
                                  aria-pressed={active}
                                  onClick={() => setSelectedTeam(team.index)}
                                >
                                  <TeamLogo icon={team.icon} size={30} alt={team.fullName} />
                                  <span className="mfd-team-card-copy">
                                    <span className="mfd-team-card-abbr">{team.abbr}</span>
                                    <span className="mfd-team-card-city">{team.city}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                )) : (
                  <div className="mfd-team-empty-state">
                    No franchises match this command filter.
                  </div>
                )}
              </div>
            </MfdPanel>

            <MfdPanel title="Difficulty" icon={<Gamepad2 size={14} />}>
              <div className="mfd-difficulty-grid">
                {DIFFICULTIES.map((item) => {
                  const active = item.id === difficulty;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="mfd-difficulty-card"
                      data-selected={active ? 'true' : 'false'}
                      aria-pressed={active}
                      onClick={() => setDifficulty(item.id)}
                    >
                      <span className="mfd-difficulty-card-title">
                        {item.label}
                        {item.id === 'rookie' ? <PixelBadge variant="green">REC</PixelBadge> : null}
                      </span>
                      <span className="mfd-difficulty-card-desc">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
              <PixelPanel title="Difficulty Guide" accent="default" padding="sm" style={{ marginTop: 'var(--mfd-sp-md)' }}>
                <p className="mfd-new-game-guide">
                  <strong>{selectedDifficulty.label}:</strong> {selectedDifficulty.guide}
                </p>
              </PixelPanel>
            </MfdPanel>

            {mode === 'dynasty' ? (
              <MfdPanel title="Setup Path" icon={<Zap size={14} />}>
                <div className="mfd-setup-path-grid" role="group" aria-label="Dynasty setup path">
                  <button
                    type="button"
                    className="mfd-setup-path-card"
                    data-selected={activeSetupRunMode === 'full' ? 'true' : 'false'}
                    aria-pressed={activeSetupRunMode === 'full'}
                    onClick={() => setSetupLaunchMode('full')}
                  >
                    <span className="mfd-setup-path-title">Full Setup</span>
                    <span className="mfd-setup-path-desc">Run every Day 1 decision with Chip setup guidance.</span>
                  </button>
                  <button
                    type="button"
                    className="mfd-setup-path-card"
                    data-selected={activeSetupRunMode === 'fast_lane' ? 'true' : 'false'}
                    data-unlocked={fastLaneUnlocked ? 'true' : 'false'}
                    aria-pressed={activeSetupRunMode === 'fast_lane'}
                    disabled={!fastLaneUnlocked}
                    onClick={() => setSetupLaunchMode('fast_lane')}
                  >
                    <span className="mfd-setup-path-title">
                      Fast Lane
                      <PixelBadge variant={fastLaneUnlocked ? 'green' : 'default'}>
                        {fastLaneUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </PixelBadge>
                    </span>
                    <span className="mfd-setup-path-desc">
                      {fastLaneUnlocked
                        ? 'Start after AGM selection with recommended setup defaults preloaded.'
                        : 'Complete one full Day 1 setup to unlock repeat-player setup.'}
                    </span>
                  </button>
                </div>
                <PixelPanel title="Setup Source" accent="default" padding="sm" style={{ marginTop: 'var(--mfd-sp-md)' }}>
                  <p className="mfd-new-game-guide">
                    <strong>{activeSetupRunMode === 'fast_lane' ? 'Fast Lane' : 'Full Setup'}:</strong>{' '}
                    {activeSetupRunMode === 'fast_lane'
                      ? 'Uses createFastLaneSetupState and persists setup-run mode as Fast Lane before the dynasty opens.'
                      : 'Uses the seeded setup state and persists setup-run mode as Full before the dynasty opens.'}
                  </p>
                </PixelPanel>
              </MfdPanel>
            ) : null}

            {mode === 'scenario' ? (
              <PixelPanel title="Scenario Challenge" accent="cyan">
                <div className="mfd-scenario-list">
                  {scenarios.map((scenario) => {
                    const active = scenario.id === selectedScenarioId;
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        className="mfd-scenario-card"
                        data-selected={active ? 'true' : 'false'}
                        aria-pressed={active}
                        onClick={() => setSelectedScenarioId(scenario.id)}
                      >
                        <span className="mfd-scenario-card-topline">
                          <span>{scenario.name.toUpperCase()}</span>
                          <span className="mfd-scenario-card-badges">
                            <PixelBadge variant={scenario.difficulty === 'rookie' ? 'green' : scenario.difficulty === 'pro' ? 'cyan' : scenario.difficulty === 'all_pro' ? 'gold' : 'red'}>
                              {scenario.difficulty.toUpperCase()}
                            </PixelBadge>
                            <PixelBadge variant="default">{scenario.seasonLimit} seasons</PixelBadge>
                          </span>
                        </span>
                        <span className="mfd-scenario-card-tagline">{scenario.tagline}</span>
                        <span className="mfd-scenario-card-description">{scenario.description}</span>
                        <ScenarioLaunchCoverageBadges constraints={scenario.constraints} />
                      </button>
                    );
                  })}
                </div>
              </PixelPanel>
            ) : null}
          </section>

          <aside className="mfd-new-game-sidecar" aria-label="Launch command card">
            <div className="mfd-launch-primary-command">
              <PixelPanel title="Next Snap" accent="gold">
                <div className="mfd-selected-team-card">
                  <div className="mfd-selected-team-logo">
                    <TeamLogo icon={selected.icon} size={92} alt={selected.fullName} />
                  </div>
                  <div className="mfd-selected-team-copy">
                    <div className="mfd-selected-team-name">{selected.fullName}</div>
                    <div className="mfd-selected-team-meta">{selected.conference} {selected.division} // {selectedDifficulty.label}</div>
                  </div>
                  <div className="mfd-selected-team-summary">{launchSummary}</div>
                </div>

                <div className="mfd-launch-actions">
                  <button
                    type="button"
                    className="mfd-primary-launch-button"
                    onClick={handleStart}
                  >
                    <Play size={18} />
                    {startLabel}
                  </button>
                  {hasAutosave ? (
                    <button
                      type="button"
                      className="mfd-secondary-launch-button"
                      disabled={loadingAutosave}
                      onClick={handleContinue}
                    >
                      <Clock3 size={16} />
                      {loadingAutosave ? 'Loading Latest Autosave...' : 'Continue Latest Autosave'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="mfd-demo-launch-button"
                    onClick={handleConventionDemo}
                  >
                    <Trophy size={16} />
                    Launch Demo Scenario
                  </button>
                </div>
              </PixelPanel>
            </div>

            <div className="mfd-launch-support-stack">
              <LaunchSourcesPanel />

              <PixelPanel title="Convention Demo" accent="green">
                <div className="mfd-convention-card">
                  <p>{CONVENTION_SAVE_METADATA.headline}</p>
                  <div className="mfd-new-game-badge-row">
                    <PixelBadge variant="green">Week {CONVENTION_SAVE_METADATA.week}</PixelBadge>
                    <PixelBadge variant="gold">Playoff Race</PixelBadge>
                  </div>
                </div>
              </PixelPanel>

              <PixelPanel title="Recovery" accent="cyan">
                <div className="mfd-recovery-card">
                  <p>
                    Lost browser storage or opening this dynasty on a new machine? Import a portable backup first, then use pasted backup code if the file is unavailable.
                  </p>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".mfd,.json,application/json"
                    onChange={(event) => { void handleImportFile(event); }}
                    className="mfd-sr-only"
                    tabIndex={-1}
                  />
                  <PixelButton
                    accent="cyan"
                    disabled={loadingImport}
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Upload size={14} />
                    {loadingImport ? 'Importing Backup...' : 'Import Dynasty'}
                  </PixelButton>
                  <label htmlFor="dynasty-import-text" className="mfd-import-label">
                    Paste backup code
                  </label>
                  <textarea
                    id="dynasty-import-text"
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="Paste backup code here..."
                    className="mfd-import-textarea"
                    aria-describedby="dynasty-import-help"
                  />
                  <div id="dynasty-import-help" className="mfd-import-help">
                    Current dynasty changes only after the backup validates.
                  </div>
                  <PixelButton
                    accent="green"
                    disabled={loadingImport || !importText.trim()}
                    onClick={handleImportText}
                  >
                    <FileUp size={14} />
                    Import Backup Code
                  </PixelButton>
                </div>
              </PixelPanel>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
