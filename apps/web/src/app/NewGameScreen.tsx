/**
 * New Game screen: team selection + difficulty creates seed state.
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MfdPanel, PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { Clock3, FileUp, Gamepad2, Play, Shield, Trophy, Upload } from 'lucide-react';
import {
  CONVENTION_SAVE_METADATA,
  generateConventionSave,
  getAvailableScenarios,
  getDefaultDifficultyFlags,
  mulberry32,
  startScenario,
  type DifficultyLevel,
} from '@mfd/engine';
import { useGameStore } from './store/game-store';
import { createSeedGameState, getTeamOptions } from './store/seed';
import { TeamLogo } from '../features/shared/TeamLogo';
import { loadImportedCartridge, loadImportedCartridgeFile, loadLatestAutosaveGame } from './store/persistence';
import { AttractMode } from '../features/title/AttractMode';
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
const divisions = ['East', 'North', 'South', 'West'];

export function NewGameScreen() {
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('pro');
  const [mode, setMode] = useState<'dynasty' | 'scenario'>('dynasty');
  const [selectedScenarioId, setSelectedScenarioId] = useState(getAvailableScenarios()[0]?.id ?? 'rebuild');
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

  const handleStart = async () => {
    const seed = Date.now();
    const baseState = createSeedGameState(seed, selectedTeam, difficulty);
    if (mode === 'scenario') {
      const state = startScenario(selectedScenarioId, baseState, mulberry32(seed ^ (selectedScenarioId.length * 97)));
      delete state.setupState;
      await newGame(state);
    } else {
      await newGame(baseState);
    }
  };

  const handleConventionDemo = async () => {
    const seed = Date.now();
    const rng = mulberry32(seed);
    const demoState = generateConventionSave('afce1', rng);
    await newGame(demoState);
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

  const handleImportText = () => {
    if (!importText.trim()) {
      setAutosaveError('Paste backup code before importing.');
      return;
    }

    setLoadingImport(true);
    setAutosaveError(null);

    try {
      const imported = loadImportedCartridge(importText.trim());
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
  const teamGroups = useMemo(
    () => conferences.map((conference) => ({
      conference,
      divisions: divisions
        .map((division) => ({
          division,
          teams: teams.filter((team) => team.conference === conference && team.division === division),
        }))
        .filter((group) => group.teams.length > 0),
    })),
    [],
  );

  const startLabel = mode === 'scenario' ? 'Start Challenge' : 'Start Dynasty';
  const launchSummary = mode === 'scenario'
    ? selectedScenario?.tagline ?? 'Scenario challenge'
    : `${selected.fullName} // ${selectedDifficulty.label}`;

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
            <PixelBadge variant="cyan">Save v35</PixelBadge>
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
              <div className="mfd-team-board">
                {teamGroups.map((conferenceGroup) => (
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
                ))}
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
                      </button>
                    );
                  })}
                </div>
              </PixelPanel>
            ) : null}
          </section>

          <aside className="mfd-new-game-sidecar" aria-label="Launch command card">
            <PixelPanel title="Command Card" accent="gold">
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
                  className="mfd-primary-launch-button"
                  onClick={handleStart}
                >
                  <Play size={18} />
                  {startLabel}
                </button>
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
          </aside>
        </div>
      </div>
    </div>
  );
}
