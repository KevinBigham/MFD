import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import type {
  BroadcastCommentaryGame,
  GameDayPackage,
  GameResult,
  PlayerGameLine,
  PlayoffMomentum,
  PressConferenceQueueEntry,
  PressConferenceResponseTier,
  SeasonPhase,
  TeamGameStats,
  WinProbPoint,
} from '@mfd/engine';
import { analyzeGameFlow, buildBroadcastCommentary, buildHalftimeDecisionReceipt } from '@mfd/engine';
import { PixelPanel, PixelBadge, PixelButton, PixelDialog, PixelEkg, PixelPlayerLink, PixelScoreboard, PixelStatBar } from '@mfd/design-system/components';
import { navigateTo } from '../shared/pixelUi';
import { getWeatherImpactCopy } from '../shared/weatherImpactCopy';
import { CallYourShotResult } from './CallYourShotResult';
import { PressConferenceModal } from './PressConferenceModal';
import { RecapChipReaction, deriveRecapChipOutcome } from './RecapChipReaction';
import { buildPressConferencePromptBank, buildPressConferenceTemplateContext } from '../../lib/pressConferenceContent';
import {
  selectLatestBroadcast,
  selectLatestGameDayPackage,
  selectLatestGameResult,
  selectPhase,
  selectPlayoffMomentum,
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

function weatherVariant(weather?: string | null): 'default' | 'cyan' | 'gold' | 'red' {
  if (weather === 'dome' || weather === 'clear') return 'cyan';
  if (weather === 'rain') return 'gold';
  return 'red';
}

function makeAbbr(name: string): string {
  return name.slice(0, 3).toUpperCase();
}

function safeRatio(a: number, b: number): number {
  const total = a + b;
  return total === 0 ? 0.5 : a / total;
}

function classifyWinProbEvent(current: WinProbPoint, previous: WinProbPoint | null): string | undefined {
  if (!previous) return undefined;
  const delta = current.homeWinProb - previous.homeWinProb;
  if (Math.abs(delta) >= 18) return delta > 0 ? 'touchdown' : 'turnover';
  if (Math.abs(delta) >= 10) return 'big_play';
  return undefined;
}

type PostgameSourceReceiptAccent = 'cyan' | 'gold' | 'green' | 'red' | 'default';

export interface PostgameSourceReceiptRow {
  id: 'package' | 'why' | 'players' | 'next';
  label: string;
  value: string;
  detail: string;
  accent: PostgameSourceReceiptAccent;
}

export interface PostgameDecisionReceiptRow {
  id: 'prep' | 'health' | 'carryover' | 'next-week';
  label: string;
  value: string;
  detail: string;
  accent: PostgameSourceReceiptAccent;
}

type NamedGameReceiptEvent = NonNullable<GameDayPackage['namedGame'] | GameResult['namedGame']>;

export interface NamedGameMemoryReceiptRow {
  id: 'saved-result' | 'archive' | 'boundary';
  label: string;
  value: string;
  detail: string;
  accent: PostgameSourceReceiptAccent;
}

export interface RecordMemoryReceiptRow {
  id: 'saved-records' | 'record-highlight' | 'milestone-highlight' | 'archive' | 'boundary';
  label: string;
  value: string;
  detail: string;
  accent: PostgameSourceReceiptAccent;
}

export interface GameDayPlayerArcFollowUpRow {
  id: string;
  playerId: string;
  playerName: string;
  label: string;
  value: string;
  detail: string;
  source: 'GameDayPackage.topPerformers' | 'GameDayPackage.recordsMoments' | 'GameDayPackage.milestoneMoments';
  accent: PostgameSourceReceiptAccent;
}

export function buildPostgameSourceReceipt(packageData: GameDayPackage): PostgameSourceReceiptRow[] {
  const topPerformerLabels = packageData.topPerformers
    .slice(0, 3)
    .map((performer) => performer.label)
    .join(' / ');
  const nextFocus = packageData.autopsy.nextFocus.slice(0, 3).join(' / ');

  return [
    {
      id: 'package',
      label: 'Saved Package',
      value: `${packageData.year} W${packageData.week} // ${packageData.result.toUpperCase()} // ${packageData.finalScore}`,
      detail: `GameDayPackage ${packageData.id} read from selectLatestGameDayPackage; no package writer runs on open.`,
      accent: packageData.result === 'win' ? 'green' : packageData.result === 'loss' ? 'red' : 'default',
    },
    {
      id: 'why',
      label: 'Why It Moved',
      value: `${packageData.turningPoints.length} turning point(s)`,
      detail: `${packageData.autopsy.diagnosis} Leverage: ${packageData.autopsy.leverage}`,
      accent: packageData.turningPoints.some((point) => point.impact === 'negative') ? 'red' : 'cyan',
    },
    {
      id: 'players',
      label: 'Who Mattered',
      value: `${packageData.topPerformers.length} performer(s)`,
      detail: topPerformerLabels || 'No saved top performers on this package.',
      accent: packageData.topPerformers.length > 0 ? 'gold' : 'default',
    },
    {
      id: 'next',
      label: 'Next Actions',
      value: `${packageData.autopsy.nextFocus.length} focus item(s)`,
      detail: nextFocus || 'No saved next-focus items on this package.',
      accent: packageData.autopsy.nextFocus.length > 0 ? 'cyan' : 'default',
    },
  ];
}

function prepGradeAccent(grade?: string | null): PostgameSourceReceiptAccent {
  if (grade === 'A' || grade === 'B') return 'green';
  if (grade === 'C') return 'gold';
  if (grade === 'D' || grade === 'F') return 'red';
  return 'default';
}

export function buildPostgameDecisionReceipt(packageData: GameDayPackage): PostgameDecisionReceiptRow[] {
  const rows: PostgameDecisionReceiptRow[] = [];
  const coachingNotes = packageData.coachingNotes ?? [];
  const carryForward = packageData.carryForwardRecommendations ?? [];
  const prepDetails = [...coachingNotes, ...carryForward].slice(0, 3);

  if (packageData.prepGrade || prepDetails.length > 0) {
    rows.push({
      id: 'prep',
      label: 'Prep Check',
      value: packageData.prepGrade ? `PREP ${packageData.prepGrade}` : `${prepDetails.length} prep note(s)`,
      detail: prepDetails.join(' / ') || 'Saved package has a prep grade without additional Film Room notes.',
      accent: prepGradeAccent(packageData.prepGrade),
    });
  }

  if (packageData.injuryNotes.length > 0) {
    rows.push({
      id: 'health',
      label: 'Health Check',
      value: `${packageData.injuryNotes.length} injury note(s)`,
      detail: packageData.injuryNotes.slice(0, 3).join(' / '),
      accent: 'red',
    });
  }

  const carryoverItems = [...packageData.activeEffectSummaries, ...carryForward];
  if (carryoverItems.length > 0) {
    rows.push({
      id: 'carryover',
      label: 'Carryover',
      value: `${carryoverItems.length} saved carryover item(s)`,
      detail: carryoverItems.slice(0, 3).join(' / '),
      accent: 'gold',
    });
  }

  if (packageData.autopsy.nextFocus.length > 0) {
    rows.push({
      id: 'next-week',
      label: 'Next Week',
      value: `${packageData.autopsy.nextFocus.length} focus item(s)`,
      detail: packageData.autopsy.nextFocus.slice(0, 3).join(' / '),
      accent: 'cyan',
    });
  }

  return rows;
}

export function buildNamedGameMemoryReceipt(
  packageData: GameDayPackage,
  namedGame: NamedGameReceiptEvent,
): NamedGameMemoryReceiptRow[] {
  return [
    {
      id: 'saved-result',
      label: 'Saved named game',
      value: `${namedGame.year} W${namedGame.week} // ${namedGame.homeScore}-${namedGame.awayScore}`,
      detail: `GameDayPackage ${packageData.id} carries ${namedGame.name} from the saved game result.`,
      accent: 'gold',
    },
    {
      id: 'archive',
      label: 'Archive path',
      value: '/legacy/named-games',
      detail: 'NamedGamesBrowser reads saved dynastyTimeline named_game rows; use it to revisit trophy-tier games later.',
      accent: 'cyan',
    },
    {
      id: 'boundary',
      label: 'No rerun',
      value: 'read-only CTA',
      detail: 'Opening this panel or archive link does not re-run detectNamedGame, rewrite results, repair timeline rows, change scores, reroll outcomes, or create new results.',
      accent: 'default',
    },
  ];
}

function formatRecordStat(stat: string): string {
  return stat
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .toUpperCase();
}

function formatRecordCategory(category: GameDayPackage['recordsMoments'][number]['category']): string {
  return category === 'singleGame' ? 'SINGLE GAME' : 'SINGLE SEASON';
}

function playerNameFromPerformer(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim() || label;
}

function playerPositionFromPerformer(label: string): string | null {
  return label.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;
}

export function buildGameDayPlayerArcFollowUps(packageData: GameDayPackage): GameDayPlayerArcFollowUpRow[] {
  const rows: GameDayPlayerArcFollowUpRow[] = [];
  const seenPlayerIds = new Set<string>();

  const addRow = (row: GameDayPlayerArcFollowUpRow) => {
    if (seenPlayerIds.has(row.playerId)) return;
    seenPlayerIds.add(row.playerId);
    rows.push(row);
  };

  for (const record of packageData.recordsMoments) {
    addRow({
      id: `record-${record.playerId}`,
      playerId: record.playerId,
      playerName: record.playerName,
      label: 'Record Breaker',
      value: `${formatRecordCategory(record.category)} ${formatRecordStat(record.stat)} ${record.newValue}`,
      detail: record.narrative,
      source: 'GameDayPackage.recordsMoments',
      accent: 'green',
    });
  }

  for (const milestone of packageData.milestoneMoments) {
    addRow({
      id: `milestone-${milestone.playerId}`,
      playerId: milestone.playerId,
      playerName: milestone.playerName,
      label: 'Milestone',
      value: milestone.milestoneLabel,
      detail: milestone.narrative,
      source: 'GameDayPackage.milestoneMoments',
      accent: 'cyan',
    });
  }

  for (const performer of packageData.topPerformers) {
    if (!performer.playerId) continue;
    const pos = playerPositionFromPerformer(performer.label);
    addRow({
      id: `performer-${performer.playerId}`,
      playerId: performer.playerId,
      playerName: playerNameFromPerformer(performer.label),
      label: pos ? `Top ${pos}` : 'Top Performer',
      value: performer.statLine,
      detail: `Saved top performer from ${packageData.finalScore}; use the profile link to carry this game into the player's arc.`,
      source: 'GameDayPackage.topPerformers',
      accent: 'gold',
    });
  }

  return rows.slice(0, 4);
}

export function buildRecordMemoryReceipt(packageData: GameDayPackage): RecordMemoryReceiptRow[] {
  const recordCount = packageData.recordsMoments.length;
  const milestoneCount = packageData.milestoneMoments.length;
  const record = packageData.recordsMoments[0] ?? null;
  const milestone = packageData.milestoneMoments[0] ?? null;
  const rows: RecordMemoryReceiptRow[] = [
    {
      id: 'saved-records',
      label: 'Saved record package',
      value: `${recordCount} record(s) // ${milestoneCount} milestone(s)`,
      detail: `GameDayPackage ${packageData.id} carries saved recordsMoments and milestoneMoments from the completed game.`,
      accent: recordCount + milestoneCount > 0 ? 'green' : 'default',
    },
  ];

  if (record) {
    rows.push({
      id: 'record-highlight',
      label: 'Record Book',
      value: `${record.playerName} // ${formatRecordCategory(record.category)} ${formatRecordStat(record.stat)} ${record.newValue}`,
      detail: record.narrative,
      accent: 'gold',
    });
  }

  if (milestone) {
    rows.push({
      id: 'milestone-highlight',
      label: 'Milestone',
      value: `${milestone.playerName} // ${milestone.milestoneLabel}`,
      detail: milestone.narrative,
      accent: 'green',
    });
  }

  rows.push(
    {
      id: 'archive',
      label: 'Archive path',
      value: '/records',
      detail: 'RecordBook reads saved game.records plus recentMilestones; use it to track the moment after the recap.',
      accent: 'cyan',
    },
    {
      id: 'boundary',
      label: 'No recalculation',
      value: 'read-only CTA',
      detail: 'Opening this panel or archive link does not update records, check milestones, write recentMilestones, change stats, replay the game, reroll outcomes, or create new results.',
      accent: 'default',
    },
  );

  return rows;
}

/* ── Main View: Game Day Center ─────────────────────────── */

interface GameDayCenterViewProps {
  teamLabel: string;
  phase: SeasonPhase;
  year: number;
  packageData: GameDayPackage | null;
  playoffMomentum?: PlayoffMomentum | null;
  namedGame?: GameDayPackage['namedGame'] | GameResult['namedGame'] | null;
  namedGameEkgPoints?: Array<{ time: number; wp: number; event?: string }>;
  boothRecap?: string[];
}

export function GameDayCenterView({
  teamLabel,
  phase,
  year,
  packageData,
  playoffMomentum = null,
  namedGame = null,
  namedGameEkgPoints = [],
  boothRecap = [],
}: GameDayCenterViewProps) {
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

  const weatherImpact = getWeatherImpactCopy(packageData.weather);
  const halftimeReceipt = buildHalftimeDecisionReceipt(packageData.activeEffectSummaries);
  const postgameReceiptRows = buildPostgameSourceReceipt(packageData);
  const decisionReceiptRows = buildPostgameDecisionReceipt(packageData);
  const namedGameReceiptRows = namedGame ? buildNamedGameMemoryReceipt(packageData, namedGame) : [];
  const playerArcRows = buildGameDayPlayerArcFollowUps(packageData);
  const recordMemoryReceiptRows = buildRecordMemoryReceipt(packageData);
  const hasRecordMemory = packageData.recordsMoments.length > 0 || packageData.milestoneMoments.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {namedGame ? (
        <PixelPanel title="This Game Has A Name" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Trophy size={16} color="var(--mfd-gold)" />
              <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-gold)', letterSpacing: '1px' }}>
                {namedGame.name.toUpperCase()}
              </div>
              <PixelBadge variant="gold">NAMED GAME</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
              {namedGame.reason}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelButton
                accent="gold"
                onClick={() => navigateTo('/legacy/named-games')}
              >
                <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  <BookOpen size={14} />
                  Named Games
                </span>
              </PixelButton>
              <PixelBadge variant="cyan">GameDayPackage.namedGame</PixelBadge>
              <PixelBadge variant="default">dynastyTimeline archive</PixelBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {namedGameReceiptRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    alignItems: 'start',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--mfd-border)',
                  }}
                >
                  <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {namedGame && namedGameEkgPoints.length > 0 ? (
        <PixelPanel title="Win Probability EKG" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <PixelEkg points={namedGameEkgPoints} style={{ minHeight: '220px' }} />
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Long-press to screenshot on mobile.
            </div>
          </div>
        </PixelPanel>
      ) : null}

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
            {packageData.broadcastNetwork ? (
              <PixelBadge variant={packageData.primetime ? 'gold' : 'cyan'}>{packageData.broadcastNetwork}</PixelBadge>
            ) : null}
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
            {packageData.weather ? (
              <PixelBadge variant={weatherVariant(weatherImpact.label)}>{`weather // ${weatherImpact.label}`}</PixelBadge>
            ) : null}
            {packageData.primetime ? <PixelBadge variant="gold">PRIMETIME</PixelBadge> : null}
            {packageData.flexed ? <PixelBadge variant="gold">FLEXED</PixelBadge> : null}
            {packageData.rivalry ? (
              <PixelBadge variant="red">{`${packageData.rivalry.tier.replace('_', ' ')} // ${packageData.rivalry.intensity}`}</PixelBadge>
            ) : null}
            {packageData.stakes.map((s) => (
              <PixelBadge key={s.label} variant="default">{s.label.toUpperCase()}</PixelBadge>
            ))}
            {phase === 'playoffs' && playoffMomentum ? (
              <PixelBadge variant={playoffMomentum.momentum > 85 ? 'gold' : playoffMomentum.momentum > 70 ? 'cyan' : 'default'}>
                {`playoff score ${playoffMomentum.momentum}`}
              </PixelBadge>
            ) : null}
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Postgame Source Receipt" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">selectLatestGameDayPackage</PixelBadge>
            <PixelBadge variant="gold">Saved GameDayPackage</PixelBadge>
            <PixelBadge variant="default">Read-only</PixelBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {postgameReceiptRows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                  alignItems: 'start',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--mfd-border)',
                }}
              >
                <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
              </div>
            ))}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Source: saved GameDayPackage headline, autopsy, turning points, top performers, and next-focus rows.
            Opening this recap does not replay the game, generate a new package, rewrite weekly summaries, change scores,
            move players, alter injuries, autosave, reroll outcomes, or answer press.
          </div>
        </div>
      </PixelPanel>

      {decisionReceiptRows.length > 0 ? (
        <PixelPanel title="Postgame Decision Receipt" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">Saved GameDayPackage</PixelBadge>
              <PixelBadge variant="cyan">Next-week inputs</PixelBadge>
              <PixelBadge variant="default">No render writes</PixelBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {decisionReceiptRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    alignItems: 'start',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--mfd-border)',
                  }}
                >
                  <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
                </div>
              ))}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Source: saved GameDayPackage prepGrade, coachingNotes, carryForwardRecommendations,
              injuryNotes, activeEffectSummaries, and autopsy.nextFocus. Opening this receipt does not
              recalculate Film Room, apply training, adjust fatigue, change injuries, alter morale,
              answer press, or advance the week.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {playerArcRows.length > 0 ? (
        <PixelPanel title="Player Arc Follow-Up" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelBadge variant="gold">GameDayPackage.topPerformers</PixelBadge>
              <PixelBadge variant="green">GameDayPackage.recordsMoments</PixelBadge>
              <PixelBadge variant="cyan">GameDayPackage.milestoneMoments</PixelBadge>
              <PixelBadge variant="default">Profile callbacks</PixelBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playerArcRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '10px',
                    alignItems: 'start',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--mfd-border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <PixelPlayerLink
                      playerId={row.playerId}
                      name={row.playerName}
                      title={`Open ${row.playerName} profile from saved game-day package`}
                      style={{ ...display, fontSize: '16px', letterSpacing: '1px' }}
                    />
                    <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
                    <PixelBadge variant="default">{row.source}</PixelBadge>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton accent="cyan" onClick={() => navigateTo('/player-development')}>Open Development</PixelButton>
              {hasRecordMemory ? <PixelButton accent="green" onClick={() => navigateTo('/records')}>Open Record Book</PixelButton> : null}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Source: saved GameDayPackage top performers, recordsMoments, and milestoneMoments.
              Opening this follow-up does not write player history, add timeline rows, create scrapbook cards,
              recalculate records or milestones, replay the game, rewrite the save, autosave, or reroll outcomes.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {hasRecordMemory ? (
        <PixelPanel title="Record Memory" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelButton
                accent="cyan"
                onClick={() => navigateTo('/records')}
              >
                <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  <BookOpen size={14} />
                  Record Book
                </span>
              </PixelButton>
              <PixelBadge variant="green">GameDayPackage.recordsMoments</PixelBadge>
              <PixelBadge variant="gold">GameDayPackage.milestoneMoments</PixelBadge>
              <PixelBadge variant="default">recentMilestones archive</PixelBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recordMemoryReceiptRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    alignItems: 'start',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--mfd-border)',
                  }}
                >
                  <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{row.value}</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
                </div>
              ))}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Source: saved GameDayPackage.recordsMoments and GameDayPackage.milestoneMoments.
              Opening this recap does not update records, check milestones, write recentMilestones,
              change stats, replay the game, reroll outcomes, or create new results.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {weatherImpact.severity !== 'none' ? (
        <PixelPanel title="Weather Impact" accent={weatherImpact.severity === 'game_changer' ? 'red' : 'gold'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelBadge variant={weatherImpact.severity === 'game_changer' ? 'red' : 'gold'}>
                {weatherImpact.label.toUpperCase()}
              </PixelBadge>
              <div style={{ ...display, fontSize: '18px', color: '#fff', letterSpacing: '1px', lineHeight: 1.1 }}>
                {weatherImpact.headline.toUpperCase()}
              </div>
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              {weatherImpact.detail}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">GameDayPackage.weather</PixelBadge>
              <PixelBadge variant="gold">Shared weather copy</PixelBadge>
              <PixelBadge variant="default">Read-only</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Source: saved game-day package weather plus getWeatherImpactCopy. Opening this recap does not
              generate matchup weather, rewrite schedule weather, replay the game, alter weather formulas,
              change saved results, or reroll saved outcomes.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {phase === 'playoffs' && playoffMomentum ? (
        <PixelPanel title="Playoff Readiness" accent={playoffMomentum.momentum > 85 ? 'gold' : playoffMomentum.momentum > 70 ? 'cyan' : 'default'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                {teamLabel.toUpperCase()}
              </div>
              <PixelBadge variant={playoffMomentum.momentum > 85 ? 'gold' : playoffMomentum.momentum > 70 ? 'cyan' : 'default'}>
                SCORE {playoffMomentum.momentum}
              </PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              {`Playoff score ${playoffMomentum.momentum} with ${playoffMomentum.winStreak} straight wins. Before the next playoff game, set health, depth, and matchup calls.`}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {packageData.matchupHighlight ? (
        <PixelPanel title="Key Matchup" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={packageData.matchupHighlight.advantage >= 0 ? 'green' : 'red'}>
                {packageData.matchupHighlight.label}
              </PixelBadge>
              <PixelBadge variant="default">{`advantage ${packageData.matchupHighlight.advantage >= 0 ? '+' : ''}${packageData.matchupHighlight.advantage}`}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              {packageData.matchupHighlight.detail}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {packageData.specialTeamsHighlights && packageData.specialTeamsHighlights.length > 0 ? (
        <PixelPanel title="Special Teams Swing" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {packageData.specialTeamsHighlights.map((highlight) => (
              <div key={highlight} style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                {highlight}
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

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
            <div style={{ ...monoSm, color: '#888' }}>Why it changed: {packageData.autopsy.leverage}</div>
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
          <PixelPanel title="Press Receipt" accent="gold">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="gold">GameDayPackage</PixelBadge>
                <PixelBadge variant="cyan">Post-week hook</PixelBadge>
                <PixelBadge variant="default">Read-only</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                Saved GameDayPackage.pressConference powers this recap&apos;s press theme, opener,
                reporter Q&amp;A, and quotes. The post-week command deck also reads it through
                buildPostWeekMoment as Press Follow-Up; opening this recap does not record a
                conference, change score, player effects, news, social feeds, or answer the
                press queue.
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>

      {packageData.activeEffectSummaries.length > 0 && (
        <PixelPanel title="Off-Field Carryover" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {halftimeReceipt ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '3px solid var(--mfd-gold)',
                background: 'rgba(250, 204, 21, 0.08)',
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="gold">HALFTIME DECISION RECEIPT</PixelBadge>
                  <PixelBadge variant="cyan">GAME DAY PACKAGE</PixelBadge>
                  <PixelBadge variant="green">BROADCAST HOOK</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                  {halftimeReceipt.recapLine} Broadcast routes consume this same saved receipt read model; no package writer or broadcast simulation path is changed here.
                </div>
              </div>
            ) : null}
            {packageData.activeEffectSummaries.map((summary) => (
              <div key={summary} style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                {summary}
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {packageData.prepGrade ? (
        <PixelPanel title="Coaching Review" accent={packageData.prepGrade === 'A' || packageData.prepGrade === 'B' ? 'green' : packageData.prepGrade === 'C' ? 'gold' : 'red'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PixelBadge variant={packageData.prepGrade === 'A' || packageData.prepGrade === 'B' ? 'green' : packageData.prepGrade === 'C' ? 'gold' : 'red'}>
                PREP {packageData.prepGrade}
              </PixelBadge>
              <PixelButton
                accent="cyan"
                onClick={() => navigateTo('/film-room')}
              >
                Open Film Room
              </PixelButton>
            </div>
            {(packageData.coachingNotes ?? []).map((note) => (
              <div key={note} style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>{note}</div>
            ))}
            {(packageData.carryForwardRecommendations ?? []).map((note) => (
              <div key={note} style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>{note}</div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      {boothRecap.length > 0 ? (
        <PixelPanel title="Broadcast Booth" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {boothRecap.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {line}
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

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
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const teams = useGameStore(selectTeams);
  const phase = useGameStore(selectPhase);
  const year = useGameStore(selectYear);
  const packageData = useGameStore(selectLatestGameDayPackage);
  const gameResult = useGameStore(selectLatestGameResult);
  const latestBroadcast = useGameStore(selectLatestBroadcast);
  const playoffMomentum = useGameStore(selectPlayoffMomentum);
  const pressConferenceQueue = useGameStore((state) => state.game?.postGameUi?.pressConferenceQueue ?? []);
  const respondToPressConference = useGameStore((state) => state.actions.respondToPressConference);
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<PressConferenceResponseTier>('mid');

  const latestPressConferenceEntry: PressConferenceQueueEntry | null = pressConferenceQueue[0] ?? null;
  const pendingPressConference = pressConferenceQueue.find((entry) => !entry.selectedResponse) ?? null;
  const namedGame = packageData?.namedGame ?? gameResult?.namedGame ?? null;
  const namedGameEkgPoints = useMemo(() => {
    if (!namedGame || !latestBroadcast) return [];
    const analysis = analyzeGameFlow(
      latestBroadcast.broadcast,
      latestBroadcast.gameResult.homeTeamId,
      latestBroadcast.gameResult.awayTeamId,
    );
    return analysis.winProbability.map((point, index) => ({
      time: point.driveIndex,
      wp: point.homeWinProb,
      event: classifyWinProbEvent(point, analysis.winProbability[index - 1] ?? null),
    }));
  }, [latestBroadcast, namedGame]);
  const recapUserWinProbPoints = useMemo(() => {
    if (!latestBroadcast || !team) return [];
    const analysis = analyzeGameFlow(
      latestBroadcast.broadcast,
      latestBroadcast.gameResult.homeTeamId,
      latestBroadcast.gameResult.awayTeamId,
    );
    const userIsHome = latestBroadcast.gameResult.homeTeamId === team.id;
    return analysis.winProbability.map((point) => (
      userIsHome ? point.homeWinProb : 100 - point.homeWinProb
    ));
  }, [latestBroadcast, team]);
  const recapChipContext = useMemo(() => {
    if (!team || !gameResult) {
      return {
        outcome: deriveRecapChipOutcome({ result: packageData?.result ?? null }),
        opponentName: null,
        userScore: null,
        opponentScore: null,
      };
    }

    const userIsHome = gameResult.homeTeamId === team.id;
    const opponentTeamId = userIsHome ? gameResult.awayTeamId : gameResult.homeTeamId;
    const opponent = teams?.[opponentTeamId] ?? null;
    const userScore = userIsHome ? gameResult.homeScore : gameResult.awayScore;
    const opponentScore = userIsHome ? gameResult.awayScore : gameResult.homeScore;
    const result = userScore > opponentScore ? 'win' : userScore < opponentScore ? 'loss' : 'tie';

    return {
      outcome: deriveRecapChipOutcome({
        result: packageData?.result ?? result,
        margin: Math.abs(userScore - opponentScore),
        overtime: gameResult.overtime,
        userWinProbPoints: recapUserWinProbPoints,
      }),
      opponentName: opponent ? `${opponent.city} ${opponent.name}` : null,
      userScore,
      opponentScore,
    };
  }, [gameResult, packageData?.result, recapUserWinProbPoints, team, teams]);
  const boothRecap = useMemo(() => {
    if (!game || !latestBroadcast) return [];
    return buildBroadcastCommentary(game as BroadcastCommentaryGame, {
      homeTeamId: latestBroadcast.gameResult.homeTeamId,
      awayTeamId: latestBroadcast.gameResult.awayTeamId,
      result: latestBroadcast.gameResult,
      seed: year * 100 + latestBroadcast.gameResult.week,
    }).recap;
  }, [game, latestBroadcast, year]);
  const promptBank = useMemo(() => {
    if (!latestPressConferenceEntry) return [];
    const opponent = packageData?.opponentTeamId ? teams?.[packageData.opponentTeamId] ?? null : null;
    const context = buildPressConferenceTemplateContext({
      packageData,
      teamName: team ? `${team.city} ${team.name}` : null,
      opponentName: opponent ? `${opponent.city} ${opponent.name}` : null,
      speaker: latestPressConferenceEntry.speaker,
    });
    return buildPressConferencePromptBank(latestPressConferenceEntry.scenario, context);
  }, [latestPressConferenceEntry, packageData, team, teams]);

  useEffect(() => {
    if (!pendingPressConference) return;
    setActiveTier(pendingPressConference.selectedTier ?? 'mid');
    setPressModalOpen(true);
  }, [pendingPressConference]);

  if (!team) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <RecapChipReaction
        outcome={recapChipContext.outcome}
        teamName={`${team.city} ${team.name}`}
        opponentName={recapChipContext.opponentName}
        userScore={recapChipContext.userScore}
        opponentScore={recapChipContext.opponentScore}
      />
      <GameDayCenterView
        teamLabel={`${team.city} ${team.name}`}
        phase={phase}
        year={year}
        packageData={packageData}
        playoffMomentum={playoffMomentum}
        namedGame={namedGame}
        namedGameEkgPoints={namedGameEkgPoints}
        boothRecap={boothRecap}
      />
      {latestPressConferenceEntry ? (
        <PixelPanel title="Press Response" accent={pendingPressConference ? 'gold' : 'green'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                {latestPressConferenceEntry.speaker} // {latestPressConferenceEntry.topic}
              </div>
              <PixelButton accent={pendingPressConference ? 'gold' : 'cyan'} onClick={() => setPressModalOpen(true)}>
                {pendingPressConference ? 'Answer Press' : 'Review Press'}
              </PixelButton>
            </div>
            {latestPressConferenceEntry.selectedResponse ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                {latestPressConferenceEntry.selectedResponse}
              </div>
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Choose the saved quote style. This saves the quote only; result, owner reaction, player changes, news, social reaction, and next-week state are already final.
              </div>
            )}
          </div>
        </PixelPanel>
      ) : null}
      <CallYourShotResult result={packageData?.callYourShotResult ?? gameResult?.callYourShotResult ?? null} />
      {gameResult && <FullBoxScore gameResult={gameResult} userTeamId={team.id} />}
      <PressConferenceModal
        open={pressModalOpen && !!latestPressConferenceEntry}
        entry={latestPressConferenceEntry}
        activeTier={activeTier}
        promptBank={promptBank}
        onTierChange={setActiveTier}
        onRespond={(tier, response) => {
          if (!latestPressConferenceEntry) return;
          void respondToPressConference(latestPressConferenceEntry.conferenceId, tier, response);
          setPressModalOpen(false);
        }}
        onOpenChange={setPressModalOpen}
      />
    </div>
  );
}
