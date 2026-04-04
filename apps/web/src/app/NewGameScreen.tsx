/**
 * New Game screen — team selection + difficulty → creates seed state.
 */
import { useEffect, useState } from 'react';
import { MfdPanel, PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { Gamepad2, Shield, Trophy } from 'lucide-react';
import { getAvailableScenarios, mulberry32, startScenario, type DifficultyLevel } from '@mfd/engine';
import { useGameStore } from './store/game-store';
import { createSeedGameState, getTeamOptions } from './store/seed';
import { loadLatestAutosaveGame } from './store/persistence';

const DIFFICULTIES: { id: DifficultyLevel; label: string; desc: string }[] = [
  { id: 'rookie', label: 'Rookie', desc: 'Forgiving cap, patient owners' },
  { id: 'pro', label: 'Pro', desc: 'Balanced challenge' },
  { id: 'allpro', label: 'All-Pro', desc: 'Tight cap, demanding owners' },
  { id: 'legend', label: 'Legend', desc: 'Maximum pressure on every decision' },
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
  const newGame = useGameStore((s) => s.actions.newGame);
  const loadGame = useGameStore((s) => s.actions.loadGame);

  useEffect(() => {
    let active = true;
    loadLatestAutosaveGame()
      .then((game) => {
        if (active) setHasAutosave(Boolean(game));
      })
      .catch(() => {
        if (active) setHasAutosave(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStart = async () => {
    const seed = Date.now();
    const baseState = createSeedGameState(seed, selectedTeam, difficulty);
    const state = mode === 'scenario'
      ? startScenario(selectedScenarioId, baseState, mulberry32(seed ^ (selectedScenarioId.length * 97)))
      : baseState;
    await newGame(state);
  };

  const handleContinue = async () => {
    setLoadingAutosave(true);
    try {
      const latest = await loadLatestAutosaveGame();
      if (latest) loadGame(latest);
    } finally {
      setLoadingAutosave(false);
    }
  };

  const selected = teams[selectedTeam]!;
  const scenarios = getAvailableScenarios();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--mfd-bg)',
      color: 'var(--mfd-text)',
      fontFamily: 'var(--mfd-font-sans)',
      padding: 'var(--mfd-sp-xl)',
    }}>
      <div style={{ maxWidth: 720, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--mfd-gold)',
            margin: 0,
          }}>
            Mr. Football Dynasty
          </h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)',
            fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)',
            margin: '8px 0 0',
          }}>
            Select your franchise // Choose your difficulty // Pick your mode
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <PixelButton accent={mode === 'dynasty' ? 'gold' : 'default'} onClick={() => setMode('dynasty')}>
            New Dynasty
          </PixelButton>
          <PixelButton accent={mode === 'scenario' ? 'cyan' : 'default'} onClick={() => setMode('scenario')}>
            Scenario Challenge
          </PixelButton>
        </div>

        {/* Team Selection */}
        <MfdPanel title="Select Franchise" icon={<Shield size={14} />}>
          {conferences.map((conf) => (
            <div key={conf} style={{ marginBottom: 'var(--mfd-sp-md)' }}>
              <div style={{
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--mfd-text-faint)',
                marginBottom: '6px',
                letterSpacing: '0.08em',
              }}>
                {conf}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {teams
                  .filter((t) => t.conference === conf)
                  .map((t) => (
                    <button
                      key={t.index}
                      onClick={() => setSelectedTeam(t.index)}
                      style={{
                        padding: '8px 6px',
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--mfd-font-sans)',
                        fontWeight: t.index === selectedTeam ? 600 : 400,
                        color: t.index === selectedTeam ? 'var(--mfd-bg)' : 'var(--mfd-text-dim)',
                        background: t.index === selectedTeam ? 'var(--mfd-gold)' : 'var(--mfd-bg-2)',
                        border: `1px solid ${t.index === selectedTeam ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                        borderRadius: 'var(--mfd-rad-md)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--mfd-motion-fast)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{t.abbr}</div>
                      <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>{t.city}</div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </MfdPanel>

        {/* Selected Team Preview */}
        <div style={{
          padding: 'var(--mfd-sp-md)',
          background: 'var(--mfd-bg-2)',
          border: '1px solid var(--mfd-gold)',
          borderRadius: 'var(--mfd-rad-lg)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--mfd-font-serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--mfd-gold)',
          }}>
            {selected.fullName}
          </div>
          <div style={{
            fontFamily: 'var(--mfd-font-mono)',
            fontSize: '0.6875rem',
            color: 'var(--mfd-text-dim)',
            marginTop: '4px',
          }}>
            {selected.conference} {selected.division}
          </div>
        </div>

        {/* Difficulty */}
        <MfdPanel title="Difficulty" icon={<Gamepad2 size={14} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                style={{
                  padding: '10px 8px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--mfd-font-sans)',
                  fontWeight: d.id === difficulty ? 600 : 400,
                  color: d.id === difficulty ? 'var(--mfd-bg)' : 'var(--mfd-text-dim)',
                  background: d.id === difficulty ? 'var(--mfd-gold)' : 'var(--mfd-bg-2)',
                  border: `1px solid ${d.id === difficulty ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  borderRadius: 'var(--mfd-rad-md)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all var(--mfd-motion-fast)',
                }}
              >
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                <div style={{ fontSize: '0.5625rem', opacity: 0.7, marginTop: '4px' }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </MfdPanel>

        {mode === 'scenario' ? (
          <PixelPanel title="Scenario Challenge" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scenarios.map((scenario) => {
                const selectedScenario = scenario.id === selectedScenarioId;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${selectedScenario ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                      background: selectedScenario ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-2)',
                      color: 'var(--mfd-text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '10px', color: 'var(--mfd-gold)' }}>
                          {scenario.name.toUpperCase()}
                        </div>
                        <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                          {scenario.tagline}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={scenario.difficulty === 'rookie' ? 'green' : scenario.difficulty === 'pro' ? 'cyan' : scenario.difficulty === 'all_pro' ? 'gold' : 'red'}>
                          {scenario.difficulty.toUpperCase()}
                        </PixelBadge>
                        <PixelBadge variant="default">{scenario.seasonLimit} seasons</PixelBadge>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: 'var(--mfd-text)', marginTop: '8px', lineHeight: 1.6 }}>
                      {scenario.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </PixelPanel>
        ) : null}

        {/* Start Button */}
        {hasAutosave && (
          <button
            onClick={handleContinue}
            disabled={loadingAutosave}
            style={{
              padding: '12px',
              fontSize: '0.875rem',
              fontFamily: 'var(--mfd-font-sans)',
              fontWeight: 600,
              color: 'var(--mfd-text)',
              background: 'var(--mfd-bg-2)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-lg)',
              cursor: loadingAutosave ? 'default' : 'pointer',
            }}
          >
            {loadingAutosave ? 'Loading Latest Autosave...' : 'Continue Latest Autosave'}
          </button>
        )}
        <button
          onClick={handleStart}
          style={{
            padding: '14px',
            fontSize: '1rem',
            fontFamily: 'var(--mfd-font-serif)',
            fontWeight: 700,
            color: 'var(--mfd-bg)',
            background: 'var(--mfd-gold)',
            border: 'none',
            borderRadius: 'var(--mfd-rad-lg)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'opacity var(--mfd-motion-fast)',
          }}
        >
          {mode === 'scenario' ? 'Start Challenge' : 'Start Dynasty'}
        </button>
      </div>
    </div>
  );
}
