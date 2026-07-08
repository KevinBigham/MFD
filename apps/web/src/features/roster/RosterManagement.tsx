import { useState, useMemo, useCallback } from 'react';
import { Users } from 'lucide-react';
import {
  PixelPanel, PixelTable, PixelBadge, PixelModal, PixelNav, PixelButton, PixelSelect,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player, TrainingAssignment, TrainingFocus } from '@mfd/engine';
import { buildCutAdvisor, calcCapHit, calcDeadMoney, calculateTrainingXP } from '@mfd/engine';
import {
  selectFatigueReport,
  selectFreeAgentPlayers,
  selectPracticeSquad,
  selectPracticeSquadLimit,
  selectRoster,
  selectRosterLimit,
  selectTrainingAssignments,
  selectUserTeam,
  selectUserTeamId,
  selectWaiverWirePlayers,
  useGameStore,
} from '../../app/store/game-store';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { ComparePlayersModal } from '../player/ComparePlayersModal';
import { WatchListPinButton } from '../watch-list/WatchListPinButton';
import {
  PixelConsequenceList,
  CommandCallout,
  PixelMetricCard,
  PlayerNameLink,
  PixelScreenHeader,
  autoGrid,
  display,
  mono,
  monoSm,
  navigateTo,
  screenStackStyle,
} from '../shared/pixelUi';

const trainingFocusOptions = [
  { value: 'film_study', label: 'Film Study' },
  { value: 'position_drills', label: 'Position Drills' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'rest', label: 'Rest' },
];

const trainingFocusLabels = new Map(
  trainingFocusOptions.map((option) => [option.value, option.label]),
) as ReadonlyMap<TrainingFocus, string>;

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface RosterCutForecast {
  capHit: number;
  deadMoney: number;
  capDelta: number;
  activeRosterAfter: number;
  statusLabel: string;
  advisorLabel: string;
  immediateImpact: string;
  seasonImpact: string;
  futureRisk: string;
  source: string;
}

export function buildRosterCutForecast(
  player: Player,
  context: {
    activeRosterCount: number;
    rosterLimit: number;
    advisorReason?: string | null;
  },
): RosterCutForecast | null {
  if (!player.contract) return null;

  const capHit = roundMoney(calcCapHit(player.contract));
  const deadMoney = roundMoney(calcDeadMoney(player.contract));
  const capDelta = roundMoney(capHit - deadMoney);
  const activeRosterAfter = Math.max(0, context.activeRosterCount - (player.injury?.onIR ? 0 : 1));
  const advisorLabel = context.advisorReason ? `Advisor: ${context.advisorReason}` : 'Not an advisor priority';
  const statusLabel = capDelta >= 0 ? 'Cap relief' : 'Dead cap cost';

  return {
    capHit,
    deadMoney,
    capDelta,
    activeRosterAfter,
    statusLabel,
    advisorLabel,
    immediateImpact: `Release sends ${player.name} to waivers through the existing cut action and moves active count to ${activeRosterAfter}/${context.rosterLimit}.`,
    seasonImpact: 'The waiver wire owns claim timing; unclaimed players clear on the next waiver run.',
    futureRisk: capDelta >= 0
      ? `Projected current-room change is +$${capDelta}M after $${deadMoney}M dead money.`
      : `Projected current-room change is -$${Math.abs(capDelta)}M because dead money exceeds the current cap hit.`,
    source: 'cutPlayerToWaivers standard cut path, calcDeadMoney, and buildCutAdvisor',
  };
}

export interface TrainingAssignmentReceipt {
  playerName: string;
  focusLabel: string;
  previousFocusLabel: string;
  projectedXpLabel: string;
  mentorshipLine: string;
  commitPath: string;
  source: string;
}

type RosterActionReceiptAccent = 'green' | 'gold' | 'cyan' | 'red';
type RosterActionReceiptAction = 'cut' | 'trade_block_add' | 'trade_block_remove' | 'restructure' | 'place_ir' | 'activate_ir';

export interface RosterActionReceipt {
  playerName: string;
  actionLabel: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
  accent: RosterActionReceiptAccent;
}

export function buildTrainingAssignmentReceipt(
  player: Player,
  context: {
    focus: TrainingFocus;
    previousAssignment?: TrainingAssignment | null;
    projectedXp: number | null;
    mentorshipBonus: boolean;
  },
): TrainingAssignmentReceipt {
  const focusLabel = trainingFocusLabels.get(context.focus) ?? context.focus.replaceAll('_', ' ');
  const previousFocusLabel = context.previousAssignment
    ? trainingFocusLabels.get(context.previousAssignment.focus) ?? context.previousAssignment.focus.replaceAll('_', ' ')
    : 'Unassigned';

  return {
    playerName: player.name,
    focusLabel,
    previousFocusLabel,
    projectedXpLabel: context.projectedXp === null ? '--' : `+${context.projectedXp.toFixed(1)} XP/wk preview`,
    mentorshipLine: context.mentorshipBonus ? 'Mentor pair bonus is active for this focus.' : 'No mentor pair bonus on this assignment.',
    commitPath: 'actions.assignTraining -> assignTraining',
    source: 'Saved team.trainingAssignments plus calculateTrainingXP preview; this confirmation appears here only.',
  };
}

export function TrainingAssignmentReceiptPanel({ receipt }: { receipt: TrainingAssignmentReceipt }) {
  return (
    <PixelPanel title="Training Assignment Receipt" accent="green">
      <div style={autoGrid(180)}>
        <PixelMetricCard label="Player" value={receipt.playerName} accent="cyan" detail="Roster row that fired the existing training commit." />
        <PixelMetricCard label="Focus" value={receipt.focusLabel} accent="green" detail={`Previous focus: ${receipt.previousFocusLabel}.`} />
        <PixelMetricCard label="XP Preview" value={receipt.projectedXpLabel} accent="gold" detail={receipt.mentorshipLine} />
      </div>
      <div style={{ ...monoSm, color: '#999', lineHeight: 1.7, marginTop: '10px' }}>
        Action used: {receipt.commitPath}. Source: {receipt.source}
      </div>
    </PixelPanel>
  );
}

export function buildRosterActionReceipt(
  player: Player,
  action: RosterActionReceiptAction,
  forecast?: RosterCutForecast | null,
): RosterActionReceipt {
  const capDelta = forecast ? `${forecast.capDelta >= 0 ? '+' : '-'}$${Math.abs(forecast.capDelta)}M` : null;

  switch (action) {
    case 'cut':
      return {
        playerName: player.name,
        actionLabel: 'Released to waivers',
        result: forecast
          ? `${player.name} was released through the existing roster cut path. Active count projects to ${forecast.activeRosterAfter}; room delta was ${capDelta}.`
          : `${player.name} was released through the existing roster cut path.`,
        stateTouched: 'Roster, player map ownership, waiver wire, cap totals, transaction log, undo snapshot, and autosave through the existing cut action.',
        source: 'actions.cutPlayer -> cutPlayerToWaiversEngine -> commitGame',
        boundary: 'This confirmation does not move another player, process waivers, repair contracts, change cap formulas, save a separate confirmation log, play games, reroll saved outcomes, or alter save schema.',
        accent: 'red',
      };
    case 'trade_block_add':
      return {
        playerName: player.name,
        actionLabel: 'Added to trade block',
        result: `${player.name} is now flagged for CPU trade-interest scans and trade-block planning surfaces.`,
        stateTouched: 'team.roster player.tradeBlock, mirrored game.players flag, and autosave through the existing toggle action.',
        source: 'actions.toggleTradeBlock -> commitGame',
        boundary: 'This confirmation does not generate offers, value a trade, move assets, write news, save a separate confirmation log, play games, reroll saved outcomes, or alter save schema.',
        accent: 'gold',
      };
    case 'trade_block_remove':
      return {
        playerName: player.name,
        actionLabel: 'Removed from trade block',
        result: `${player.name} is no longer flagged for trade-block planning surfaces.`,
        stateTouched: 'team.roster player.tradeBlock, mirrored game.players flag, and autosave through the existing toggle action.',
        source: 'actions.toggleTradeBlock -> commitGame',
        boundary: 'This confirmation does not cancel existing offers, move assets, write news, save a separate confirmation log, play games, reroll saved outcomes, or alter save schema.',
        accent: 'cyan',
      };
    case 'restructure':
      return {
        playerName: player.name,
        actionLabel: 'Restructure submitted',
        result: `${player.name}'s contract restructure was submitted through the existing roster shortcut action.`,
        stateTouched: 'Selected player contract, team cap totals, transaction log, and autosave through the existing restructure action.',
        source: 'actions.restructure -> restructureContract -> commitGame',
        boundary: 'This confirmation does not preview another structure, add void years, change cap formulas, save a separate confirmation log, play games, reroll saved outcomes, or alter save schema.',
        accent: 'cyan',
      };
    case 'place_ir':
      return {
        playerName: player.name,
        actionLabel: 'Placed on IR',
        result: `${player.name} was moved to injured reserve through the existing medical roster action.`,
        stateTouched: 'Player injury IR flag, active roster count behavior, and autosave through the existing IR action.',
        source: 'actions.placeOnIR -> placeOnIREngine -> commitGame',
        boundary: 'This confirmation does not heal the player, change injury timers, alter medical formulas, play games, reroll saved outcomes, or alter save schema.',
        accent: 'red',
      };
    case 'activate_ir':
      return {
        playerName: player.name,
        actionLabel: 'Activated from IR',
        result: `${player.name} was restored to the active roster path through the existing medical roster action.`,
        stateTouched: 'Player injury IR flag, active roster count behavior, and autosave through the existing IR action.',
        source: 'actions.activateFromIR -> activateFromIREngine -> commitGame',
        boundary: 'This confirmation does not heal another injury, change injury timers, alter medical formulas, play games, reroll saved outcomes, or alter save schema.',
        accent: 'green',
      };
  }
}

export function RosterActionReceiptPanel({ receipt }: { receipt: RosterActionReceipt }) {
  return (
    <PixelPanel title="Roster Action Receipt" accent={receipt.accent}>
      <div style={autoGrid(190)}>
        <PixelMetricCard label="Player" value={receipt.playerName} accent="cyan" detail="Selected roster row that fired the action." />
        <PixelMetricCard label="Action" value={receipt.actionLabel} accent={receipt.accent} detail="Existing store commit completed." />
      </div>
      <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6, marginTop: '10px' }}>{receipt.result}</div>
      <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.6, marginTop: '8px' }}>
        Changed now: {receipt.stateTouched}
      </div>
      <div style={{ ...monoSm, color: '#f4d35e', lineHeight: 1.6, marginTop: '8px' }}>
        Source: {receipt.source}. {receipt.boundary}
      </div>
    </PixelPanel>
  );
}

function RosterSourcesPanel({
  activeRosterCount,
  rosterLimit,
  practiceSquadCount,
  practiceSquadLimit,
  waiverCount,
  practiceTargetCount,
  playersInTraining,
  fatigueFlags,
}: {
  activeRosterCount: number;
  rosterLimit: number;
  practiceSquadCount: number;
  practiceSquadLimit: number;
  waiverCount: number;
  practiceTargetCount: number;
  playersInTraining: number;
  fatigueFlags: number;
}) {
  return (
    <PixelPanel title="Roster Sources" accent="cyan">
      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Active Roster"
          value={`${activeRosterCount}/${rosterLimit}`}
          accent={activeRosterCount > rosterLimit ? 'red' : 'cyan'}
          detail="selectRoster and selectRosterLimit feed roster rows, active-count copy, starter flags, contracts, and player vitals."
        />
        <PixelMetricCard
          label="Training + Fatigue"
          value={`${playersInTraining}/${fatigueFlags}`}
          accent={fatigueFlags > 0 ? 'gold' : 'green'}
          detail="selectTrainingAssignments and selectFatigueReport drive weekly focus, XP preview, and workload warning copy."
        />
        <PixelMetricCard
          label="Cut Forecast"
          value="buildRosterCutForecast"
          accent="gold"
          detail="Uses calcDeadMoney plus buildCutAdvisor(roster, rosterLimit); it previews the existing standard cut and waiver path."
        />
        <PixelMetricCard
          label="Practice Squad"
          value={`${practiceSquadCount}/${practiceSquadLimit}`}
          accent="green"
          detail="selectPracticeSquad, selectPracticeSquadLimit, selectFreeAgentPlayers, and selectWaiverWirePlayers feed stash targets and rows."
        />
        <PixelMetricCard
          label="Waiver Queue"
          value={`${waiverCount} claims / ${practiceTargetCount} PS targets`}
          accent={waiverCount > 0 ? 'gold' : 'default'}
          detail="Waiver claim, practice-squad add, elevation, release, IR, restructure, and trade-block buttons are explicit store commits."
        />
      </div>
      <div style={{ ...monoSm, color: '#999', lineHeight: 1.7, marginTop: '10px' }}>
        Opening /roster, filtering positions, selecting a player, or opening Compare does not write roster entries,
        practice-squad entries, waiver claims, training assignments, injuries, contracts, cap totals, saves,
        game results or saved outcomes, or player movement.
      </div>
    </PixelPanel>
  );
}

function TrainingCell({
  player,
  onTrainingAssigned,
}: {
  player: Player;
  onTrainingAssigned?: (receipt: TrainingAssignmentReceipt) => void;
}) {
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const assignments = useGameStore(selectTrainingAssignments);
  const assignTraining = useGameStore((s) => s.actions.assignTraining);

  const assignment = assignments[player.id];
  const focus = assignment?.focus ?? 'film_study';
  const xp = team
    ? calculateTrainingXP(player, focus, team.staff.hc?.ratings?.development ?? 70, player.devTrait)
    : null;
  const mentorshipBonus = focus === 'mentorship' && team?.mentoringPairs.some((pair) => pair.menteeId === player.id || pair.mentorId === player.id);

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}
    >
      <PixelSelect
        value={focus}
        accent={mentorshipBonus ? 'gold' : 'cyan'}
        options={trainingFocusOptions}
        onChange={(event) => {
          if (!teamId) return;
          const nextFocus = event.target.value as TrainingFocus;
          const previousAssignment = assignment ?? null;
          void (async () => {
            await assignTraining(teamId, player.id, nextFocus);
            onTrainingAssigned?.(buildTrainingAssignmentReceipt(player, {
              focus: nextFocus,
              previousAssignment,
              projectedXp: xp?.totalXp ?? null,
              mentorshipBonus: Boolean(mentorshipBonus),
            }));
          })();
        }}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: '#999' }}>
          {xp ? `+${xp.totalXp.toFixed(1)} XP/wk` : '--'}
        </span>
        {mentorshipBonus ? <PixelBadge variant="gold">Mentor Bonus</PixelBadge> : null}
      </div>
    </div>
  );
}

function FatigueCell({ playerId }: { playerId: string }) {
  const fatigue = useGameStore((state) => selectUserTeam(state)?.fatigueState[playerId]?.fatigue ?? 0);
  const variant = fatigue >= 80 ? 'red' : fatigue >= 60 ? 'gold' : 'green';
  const label = fatigue >= 80 ? 'Exhausted' : fatigue >= 60 ? 'Fatigued' : 'Fresh';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '82px' }}>
      <PixelBadge variant={variant}>{label}</PixelBadge>
      <span style={{ ...monoSm, color: '#999' }}>{fatigue.toFixed(1)}</span>
    </div>
  );
}

const baseColumns: ColumnDef<Player, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <PlayerNameLink
        playerId={row.original.id}
        name={row.original.name}
        ovr={row.original.ovr}
        style={{ fontWeight: 500 }}
      />
    ),
  },
  {
    id: 'watch',
    header: 'Watch',
    cell: ({ row }) => <WatchListPinButton playerId={row.original.id} />,
    size: 82,
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
    cell: ({ getValue }) => <PixelBadge variant="default">{getValue() as string}</PixelBadge>,
    size: 60,
  },
  {
    accessorKey: 'ovr',
    header: 'OVR',
    cell: ({ getValue }) => {
      const value = getValue() as number;
      const color = value >= 85 ? 'var(--mfd-green)' : value >= 70 ? 'var(--mfd-text)' : 'var(--mfd-text-dim)';
      return <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color, lineHeight: 1 }}>{value}</span>;
    },
    size: 56,
  },
  {
    accessorKey: 'pot',
    header: 'POT',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color: 'var(--mfd-cyan)', lineHeight: 1 }}>
        {getValue() as number}
      </span>
    ),
    size: 56,
  },
  {
    accessorKey: 'age',
    header: 'Age',
    size: 44,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>{getValue() as number}</span>
    ),
  },
  {
    id: 'capHit',
    header: 'Cap Hit',
    cell: ({ row }) => {
      const contract = row.original.contract;
      const hit = contract ? Math.round(calcCapHit(contract) * 10) / 10 : 0;
      return <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${hit}M</span>;
    },
    size: 78,
  },
  {
    id: 'contract',
    header: 'Contract',
    cell: ({ row }) => {
      const contract = row.original.contract;
      return <span>{contract ? `${contract.years}yr` : 'FA'}</span>;
    },
    size: 74,
  },
  {
    id: 'fit',
    header: 'Fit',
    cell: ({ row }) => {
      const score = row.original.systemFit;
      const tier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      const variant = tier === 'A' ? 'green' : tier === 'B' ? 'cyan' : tier === 'C' ? 'gold' : 'red';
      return <PixelBadge variant={variant}>{tier}</PixelBadge>;
    },
    size: 44,
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const value = row.original.isStarter ? 'Starter' : 'Backup';
      return <PixelBadge variant={row.original.isStarter ? 'gold' : 'default'}>{value}</PixelBadge>;
    },
    size: 76,
  },
  {
    accessorKey: 'devTrait',
    header: 'Dev',
    cell: ({ getValue }) => {
      const value = getValue() as string;
      const variant = value === 'x-factor' ? 'red' : value === 'superstar' ? 'gold' : value === 'star' ? 'cyan' : 'default';
      const label = value === 'x-factor' ? 'X-Factor' : value === 'superstar' ? 'Superstar' : value === 'star' ? 'Star' : 'Normal';
      return <PixelBadge variant={variant}>{label}</PixelBadge>;
    },
    size: 90,
  },
  {
    id: 'fatigue',
    header: 'Fatigue',
    cell: ({ row }) => <FatigueCell playerId={row.original.id} />,
    size: 110,
  },
];

export function RosterManagement() {
  const roster = useGameStore(selectRoster);
  const rosterLimit = useGameStore(selectRosterLimit);
  const practiceSquad = useGameStore(selectPracticeSquad);
  const practiceSquadLimit = useGameStore(selectPracticeSquadLimit);
  const freeAgents = useGameStore(selectFreeAgentPlayers);
  const teamId = useGameStore(selectUserTeamId);
  const team = useGameStore(selectUserTeam);
  const fatigueReport = useGameStore(selectFatigueReport);
  const waiverPlayers = useGameStore(selectWaiverWirePlayers);
  const trainingAssignments = useGameStore(selectTrainingAssignments);
  const playersById = useGameStore((s) => s.game?.players ?? {});
  const {
    activateFromIR,
    addToPracticeSquad,
    assignTraining,
    cutPlayer,
    elevatePracticeSquadPlayer,
    placeOnIR,
    removeFromPracticeSquad,
    restructure,
    submitWaiverClaim,
    toggleTradeBlock,
  } = useGameStore((s) => s.actions);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [trainingReceipt, setTrainingReceipt] = useState<TrainingAssignmentReceipt | null>(null);
  const [rosterActionReceipt, setRosterActionReceipt] = useState<RosterActionReceipt | null>(null);
  const rosterColumns = useMemo<ColumnDef<Player, unknown>[]>(() => [
    {
      id: 'manage',
      header: 'Manage',
      cell: ({ row }) => (
        <PixelButton
          type="button"
          accent="gold"
          aria-label={`Manage ${row.original.name}`}
          onClick={() => setSelectedPlayer(row.original)}
        >
          Manage
        </PixelButton>
      ),
      size: 96,
    },
    ...baseColumns,
    {
      id: 'training',
      header: 'Training',
      cell: ({ row }) => <TrainingCell player={row.original} onTrainingAssigned={setTrainingReceipt} />,
      size: 190,
    },
  ], []);

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];

  const filtered = useMemo(() => {
    if (posFilter === 'ALL') return roster;
    return roster.filter((player) => player.pos === posFilter);
  }, [roster, posFilter]);

  const avgOvr = roster.length > 0
    ? Math.round(roster.reduce((sum, player) => sum + player.ovr, 0) / roster.length)
    : 0;
  const starters = roster.filter((player) => player.isStarter).length;
  const avgAge = roster.length > 0
    ? Math.round(roster.reduce((sum, player) => sum + player.age, 0) / roster.length * 10) / 10
    : 0;
  const playersInTraining = Object.keys(trainingAssignments).length;
  const activeRosterCount = roster.filter((player) => !player.injury?.onIR).length;
  const exhaustedPlayers = fatigueReport.filter((entry) => entry.status === 'exhausted').length;
  const fatiguedPlayers = fatigueReport.filter((entry) => entry.status === 'fatigued').length;
  const practiceSquadRows = practiceSquad
    .map((entry) => ({ entry, player: playersById[entry.playerId] }))
    .filter((item): item is { entry: typeof practiceSquad[number]; player: Player } => Boolean(item.player));
  const practiceTargets = freeAgents
    .filter((player) => !waiverPlayers.some((waiverPlayer) => waiverPlayer.id === player.id))
    .slice(0, 8);
  const cutAdvisor = useMemo(() => buildCutAdvisor(roster, rosterLimit), [roster, rosterLimit]);

  const [confirmCut, setConfirmCut] = useState<Player | null>(null);

  const handleCut = useCallback((player: Player) => {
    setConfirmCut(player);
  }, []);

  const confirmCutAction = useCallback(async () => {
    if (!teamId || !confirmCut) return;
    const advisorReason = cutAdvisor?.suggestions.find((suggestion) => suggestion.id === confirmCut.id)?.reason ?? null;
    const forecast = buildRosterCutForecast(confirmCut, { activeRosterCount, rosterLimit, advisorReason });
    await cutPlayer(teamId, confirmCut.id);
    setRosterActionReceipt(buildRosterActionReceipt(confirmCut, 'cut', forecast));
    setSelectedPlayer(null);
    setConfirmCut(null);
  }, [activeRosterCount, cutAdvisor, rosterLimit, teamId, confirmCut, cutPlayer]);

  const handleTradeBlock = useCallback(async (player: Player) => {
    if (!teamId) return;
    await toggleTradeBlock(teamId, player.id);
    setRosterActionReceipt(buildRosterActionReceipt(player, player.tradeBlock ? 'trade_block_remove' : 'trade_block_add'));
  }, [teamId, toggleTradeBlock]);

  const handleRestructure = useCallback(async (player: Player) => {
    if (!teamId) return;
    await restructure(teamId, player.id);
    setRosterActionReceipt(buildRosterActionReceipt(player, 'restructure'));
  }, [teamId, restructure]);

  const handlePlaceOnIR = useCallback(async (player: Player) => {
    if (!teamId) return;
    await placeOnIR(teamId, player.id);
    setRosterActionReceipt(buildRosterActionReceipt(player, 'place_ir'));
  }, [placeOnIR, teamId]);

  const handleActivateFromIR = useCallback(async (player: Player) => {
    if (!teamId) return;
    await activateFromIR(teamId, player.id);
    setRosterActionReceipt(buildRosterActionReceipt(player, 'activate_ir'));
  }, [activateFromIR, teamId]);

  const liveSelectedPlayer = selectedPlayer
    ? playersById[selectedPlayer.id] ?? roster.find((player) => player.id === selectedPlayer.id) ?? selectedPlayer
    : null;
  const selectedCutSuggestion = liveSelectedPlayer
    ? cutAdvisor?.suggestions.find((suggestion) => suggestion.id === liveSelectedPlayer.id) ?? null
    : null;
  const cutForecast = liveSelectedPlayer
    ? buildRosterCutForecast(liveSelectedPlayer, {
      activeRosterCount,
      rosterLimit,
      advisorReason: selectedCutSuggestion?.reason ?? null,
    })
    : null;
  const selectedPlayerFatigue = liveSelectedPlayer ? team?.fatigueState[liveSelectedPlayer.id]?.fatigue ?? 0 : 0;
  const selectedPlayerFatigueLabel = selectedPlayerFatigue >= 80 ? 'Exhausted' : selectedPlayerFatigue >= 60 ? 'Fatigued' : 'Fresh';

  const consequences = useMemo(() => {
    if (!liveSelectedPlayer?.contract || !team) return [];
    const capHit = calcCapHit(liveSelectedPlayer.contract);
    const deadMoney = calcDeadMoney(liveSelectedPlayer.contract);
    const projectedRoom = team.capSpace + (capHit - deadMoney);
    return [
      { id: 'c1', label: 'Cap Hit', delta: `$${roundMoney(capHit)}M`, accent: 'red' as const },
      { id: 'c2', label: 'Dead Money', delta: `$${roundMoney(deadMoney)}M`, accent: deadMoney > capHit ? 'red' as const : 'gold' as const },
      { id: 'c3', label: 'Projected Room', delta: `$${roundMoney(projectedRoom)}M`, accent: projectedRoom >= team.capSpace ? 'green' as const : 'red' as const },
    ];
  }, [liveSelectedPlayer, team]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Roster Management"
        subtitle={`${team ? `${team.city} ${team.name}` : 'No Team'} // ${activeRosterCount} players active`}
        badges={(
          <>
            <PixelBadge variant="gold">{activeRosterCount}/{rosterLimit}</PixelBadge>
            <PixelBadge variant="cyan">{starters} starters</PixelBadge>
          </>
        )}
      />

      <CommandCallout
        title={exhaustedPlayers > 0 ? 'Clear red-zone workloads first' : starters < 22 ? 'Find the missing starters' : 'Work from the player rows'}
        body={exhaustedPlayers > 0
          ? `${exhaustedPlayers} exhausted player${exhaustedPlayers === 1 ? '' : 's'} need a training or role call before Sunday prep.`
          : starters < 22
            ? `The roster only has ${starters}/22 starters marked. Fix the lineup before reading every contract cell.`
            : 'Roster is legal enough to scan by exception: fatigue, training focus, then one player action at a time.'}
        accent={exhaustedPlayers > 0 ? 'red' : starters < 22 ? 'gold' : 'cyan'}
        meta={(
          <>
            <PixelBadge variant="gold">{activeRosterCount}/{rosterLimit} active</PixelBadge>
            <PixelBadge variant={fatiguedPlayers + exhaustedPlayers > 0 ? 'gold' : 'green'}>
              {fatiguedPlayers + exhaustedPlayers} fatigue flags
            </PixelBadge>
          </>
        )}
        actions={[
          { label: 'Open Depth', accent: 'gold', onClick: () => navigateTo('/depth-chart') },
          { label: 'Open Plan', accent: 'cyan', onClick: () => navigateTo('/game-plan') },
        ]}
      />

      <div className="mfd-roster-summary-grid" style={autoGrid(155)}>
        <PixelMetricCard label="Roster Size" value={`${activeRosterCount}/${rosterLimit}`} accent={activeRosterCount > rosterLimit ? 'red' : 'green'} detail={`IR players do not count against the ${rosterLimit}-man cap`} />
        <PixelMetricCard label="Avg OVR" value={avgOvr} accent={avgOvr >= 80 ? 'green' : avgOvr >= 72 ? 'cyan' : 'gold'} detail="Overall team strength" />
        <PixelMetricCard label="Starters" value={starters} accent={starters >= 22 ? 'green' : 'gold'} detail="Projected first unit" />
        <PixelMetricCard label="Avg Age" value={avgAge} accent="cyan" detail="Current roster age curve" />
        <PixelMetricCard label="Training Plans" value={playersInTraining} accent="gold" detail="Players with an active weekly focus" />
        <div data-spotlight-target="chip.route.roster.beat-2">
          <PixelMetricCard label="Fatigue Watch" value={fatiguedPlayers + exhaustedPlayers} accent={exhaustedPlayers > 0 ? 'red' : fatiguedPlayers > 0 ? 'gold' : 'green'} detail={exhaustedPlayers > 0 ? `${exhaustedPlayers} exhausted` : fatiguedPlayers > 0 ? `${fatiguedPlayers} fatigued` : 'No red-zone workloads'} />
        </div>
      </div>

      <RosterSourcesPanel
        activeRosterCount={activeRosterCount}
        rosterLimit={rosterLimit}
        practiceSquadCount={practiceSquad.length}
        practiceSquadLimit={practiceSquadLimit}
        waiverCount={waiverPlayers.length}
        practiceTargetCount={practiceTargets.length}
        playersInTraining={playersInTraining}
        fatigueFlags={fatiguedPlayers + exhaustedPlayers}
      />
      {trainingReceipt ? <TrainingAssignmentReceiptPanel receipt={trainingReceipt} /> : null}
      {rosterActionReceipt ? <RosterActionReceiptPanel receipt={rosterActionReceipt} /> : null}

      <PixelNav
        activeKey={posFilter}
        wrap
        items={positions.map((pos) => ({ key: pos, label: pos }))}
        onSelect={setPosFilter}
      />

      <div data-spotlight-target="chip.route.roster.beat-1">
        <PixelTable
          responsive="cards"
          data={filtered}
          columns={rosterColumns}
          density="compact"
          accent="cyan"
        />
      </div>

      <PixelModal
        open={!!liveSelectedPlayer}
        onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}
        title={liveSelectedPlayer?.name ?? 'Player Details'}
        description={liveSelectedPlayer ? `${liveSelectedPlayer.pos} // ${liveSelectedPlayer.age} years old` : undefined}
        accent="gold"
      >
        {liveSelectedPlayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{liveSelectedPlayer.pos}</PixelBadge>
              <PixelBadge variant="cyan">OVR {liveSelectedPlayer.ovr}</PixelBadge>
              <PixelBadge variant="green">POT {liveSelectedPlayer.pot}</PixelBadge>
              <PixelBadge variant="default">Age {liveSelectedPlayer.age}</PixelBadge>
              <PixelBadge variant={selectedPlayerFatigue >= 80 ? 'red' : selectedPlayerFatigue >= 60 ? 'gold' : 'green'}>
                {selectedPlayerFatigueLabel}
              </PixelBadge>
              {liveSelectedPlayer.tradeBlock ? <PixelBadge variant="red">Trade Block</PixelBadge> : null}
              {liveSelectedPlayer.injury?.onIR ? <PixelBadge variant="red">IR</PixelBadge> : null}
              {team?.mentoringPairs.some((pair) => pair.menteeId === liveSelectedPlayer.id || pair.mentorId === liveSelectedPlayer.id)
                ? <PixelBadge variant="gold">Mentoring Pair</PixelBadge>
                : null}
            </div>

            <div style={autoGrid(260)}>
              <PixelPanel title="Contract" accent="cyan">
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  {liveSelectedPlayer.contract ? (
                    <>
                      <div>Cap Hit: ${Math.round(calcCapHit(liveSelectedPlayer.contract) * 10) / 10}M</div>
                      <div>Duration: {liveSelectedPlayer.contract.years} year(s)</div>
                      <div>Total Value: ${Math.round(liveSelectedPlayer.contract.totalValue * 10) / 10}M</div>
                      <div>Guaranteed: ${Math.round(liveSelectedPlayer.contract.guaranteed * 10) / 10}M</div>
                    </>
                  ) : (
                    <div>No contract on file.</div>
                  )}
                </div>
              </PixelPanel>

              <PixelPanel title="Vitals" accent="green">
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  <div>Morale: {liveSelectedPlayer.morale}</div>
                  <div>Chemistry: {liveSelectedPlayer.chemistry}</div>
                  <div>System Fit: {liveSelectedPlayer.systemFit}</div>
                  <div>Dev Trait: {liveSelectedPlayer.devTrait}</div>
                  <div>Experience: {liveSelectedPlayer.yearsExp} year(s)</div>
                  <div>Training Focus: {trainingAssignments[liveSelectedPlayer.id]?.focus?.replaceAll('_', ' ') ?? 'unassigned'}</div>
                  <div>Fatigue: {selectedPlayerFatigue.toFixed(1)}</div>
                </div>
              </PixelPanel>

              <PixelPanel title="Medical Report" accent={liveSelectedPlayer.injury ? 'red' : 'green'}>
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  {liveSelectedPlayer.injury ? (
                    <>
                      <div>Injury: {liveSelectedPlayer.injury.type.replaceAll('_', ' ')}</div>
                      <div>Availability: {liveSelectedPlayer.injury.severity}</div>
                      <div>Severity Tier: {liveSelectedPlayer.injury.severityTier.replaceAll('_', ' ')}</div>
                      <div>Recovery Timeline: {liveSelectedPlayer.injury.gamesOut > 0 ? `${liveSelectedPlayer.injury.gamesOut} week(s)` : 'Available, monitored'}</div>
                      <div>Reinjury Risk: {(liveSelectedPlayer.injury.reinjuryRisk * 100).toFixed(0)}%</div>
                      <div>Lingering Penalty: {liveSelectedPlayer.injury.ratingPenalty > 0 ? `-${liveSelectedPlayer.injury.ratingPenalty} OVR` : 'None'}</div>
                      <div>Roster Status: {liveSelectedPlayer.injury.onIR ? 'Injured Reserve' : 'Active'}</div>
                    </>
                  ) : (
                    <>
                      <div>No active injury.</div>
                      <div>Fatigue status: {selectedPlayerFatigueLabel}</div>
                      <div>Weighted workload is being tracked week to week.</div>
                    </>
                  )}
                </div>
              </PixelPanel>
            </div>

            {cutForecast ? (
              <PixelPanel title="Cut Forecast" accent={cutForecast.capDelta >= 0 ? 'gold' : 'red'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={cutForecast.capDelta >= 0 ? 'green' : 'red'}>{cutForecast.statusLabel}</PixelBadge>
                    <PixelBadge variant={selectedCutSuggestion ? 'gold' : 'default'}>{cutForecast.advisorLabel}</PixelBadge>
                    <PixelBadge variant="cyan">Waiver path</PixelBadge>
                  </div>
                  <div style={autoGrid(150)}>
                    <PixelMetricCard label="Cap Hit" value={`$${cutForecast.capHit}M`} accent="cyan" detail="Current contract charge" />
                    <PixelMetricCard label="Dead Money" value={`$${cutForecast.deadMoney}M`} accent={cutForecast.deadMoney > cutForecast.capHit ? 'red' : 'gold'} detail="Standard cut charge" />
                    <PixelMetricCard label="Room Delta" value={`${cutForecast.capDelta >= 0 ? '+' : '-'}$${Math.abs(cutForecast.capDelta)}M`} accent={cutForecast.capDelta >= 0 ? 'green' : 'red'} detail="Before other moves" />
                  </div>
                  <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>{cutForecast.immediateImpact}</div>
                  <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.6 }}>{cutForecast.seasonImpact}</div>
                  <div style={{ ...monoSm, color: '#f4d35e', lineHeight: 1.6 }}>{cutForecast.futureRisk}</div>
                  <div style={{ ...monoSm, color: '#777', lineHeight: 1.6 }}>Source: {cutForecast.source}</div>
                </div>
              </PixelPanel>
            ) : null}

            <PixelPanel title="Actions" accent="red">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton accent="cyan" onClick={() => { void handleRestructure(liveSelectedPlayer); }}>
                  Restructure
                </PixelButton>
                <PixelButton accent="cyan" onClick={() => setComparePlayerId(liveSelectedPlayer.id)}>
                  <Users size={14} aria-hidden="true" /> Compare
                </PixelButton>
                <PixelButton accent="gold" onClick={() => { void handleTradeBlock(liveSelectedPlayer); }}>
                  {liveSelectedPlayer.tradeBlock ? 'Remove Block' : 'Trade Block'}
                </PixelButton>
                <PixelButton
                  accent="red"
                  disabled={!liveSelectedPlayer.injury || liveSelectedPlayer.injury.onIR}
                  onClick={() => { void handlePlaceOnIR(liveSelectedPlayer); }}
                >
                  Place on IR
                </PixelButton>
                <PixelButton
                  accent="green"
                  disabled={!liveSelectedPlayer.injury?.onIR || liveSelectedPlayer.injury.gamesOut > 0}
                  onClick={() => { void handleActivateFromIR(liveSelectedPlayer); }}
                >
                  Activate from IR
                </PixelButton>
                <PixelButton accent="red" onClick={() => handleCut(liveSelectedPlayer)}>
                  Cut Player
                </PixelButton>
              </div>
              <div style={{ marginTop: '12px' }}>
                <PixelConsequenceList items={consequences} />
              </div>
            </PixelPanel>
          </div>
        ) : null}
      </PixelModal>
      <ComparePlayersModal
        open={comparePlayerId !== null}
        leftPlayerId={comparePlayerId}
        onOpenChange={(open) => {
          if (!open) setComparePlayerId(null);
        }}
      />

      <div style={autoGrid(320)}>
        <PixelPanel title={`Practice Squad (${practiceSquad.length}/${practiceSquadLimit})`} accent="green">
          {practiceSquadRows.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No players on the practice squad. Add depth from free agency after roster cuts clear.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {practiceSquadRows.map(({ entry, player }) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-green)', background: 'rgba(74, 222, 128, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>
                      {player.pos} // Elevations {entry.elevationsUsed}/{entry.maxElevations}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton accent="green" onClick={() => teamId && void elevatePracticeSquadPlayer(teamId, player.id)}>
                      Elevate
                    </PixelButton>
                    <PixelButton accent="red" onClick={() => teamId && void removeFromPracticeSquad(teamId, player.id)}>
                      Release
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Practice Squad Targets" accent="cyan">
          {practiceTargets.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No free agents are clear to stash right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {practiceTargets.map((player) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{player.pos} // OVR {player.ovr} // Age {player.age}</div>
                  </div>
                  <PixelButton accent="cyan" onClick={() => teamId && void addToPracticeSquad(teamId, player.id)}>
                    Add to PS
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Waiver Claims (${waiverPlayers.length})`} accent={waiverPlayers.length > 0 ? 'gold' : 'default'}>
          {waiverPlayers.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active waiver-wire players this week.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {waiverPlayers.slice(0, 6).map((player) => (
                <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-gold)', background: 'rgba(250, 204, 21, 0.08)' }}>
                  <div>
                    <div style={{ ...mono, color: '#fff' }}>{player.name}</div>
                    <div style={{ ...monoSm, color: '#999' }}>{player.pos} // OVR {player.ovr}</div>
                  </div>
                  <PixelButton accent="gold" onClick={() => teamId && void submitWaiverClaim(teamId, player.id)}>
                    Claim
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <ConfirmDialog
        open={confirmCut != null}
        title="Release Player"
        message={confirmCut ? `Are you sure you want to release ${confirmCut.name} (${confirmCut.pos}, ${confirmCut.ovr} OVR)? Dead money: $${roundMoney(calcDeadMoney(confirmCut.contract))}M. Player goes to waivers.` : ''}
        confirmLabel="Release"
        accent="red"
        onConfirm={confirmCutAction}
        onCancel={() => setConfirmCut(null)}
      />
    </div>
  );
}
