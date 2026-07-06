import { useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { type CBAProposal, type CBAState, type CBATerms } from '@mfd/engine';
import {
  selectCBAState,
  selectUnionLeader,
  useGameStore,
} from '../../app/store/game-store';
import { FranchiseGauge } from '../franchise/franchiseUi';
import { PixelScreenHeader, autoGrid, display, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

type CBASourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';
type CBAReceiptAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';
type CBAOwnerVoteReceipt = 'approve' | 'reject' | 'abstain';

interface CBASourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: CBASourceAccent;
}

export interface CBAActionReceipt {
  title: string;
  target: string;
  result: string;
  detail: string;
  source: string;
  accent: CBAReceiptAccent;
}

type CBAActionReceiptInput =
  | {
    type: 'vote';
    vote: CBAOwnerVoteReceipt;
    ownerCount: number;
    approvalThreshold: number;
    proposal: CBAProposal | null | undefined;
  }
  | {
    type: 'advance';
    status: CBAState['status'];
    round: number;
    hasCurrentProposal: boolean;
  };

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

function voteLabel(vote: CBAOwnerVoteReceipt): string {
  if (vote === 'approve') return 'Approve';
  if (vote === 'reject') return 'Reject';
  return 'Abstain';
}

function voteAccent(vote: CBAOwnerVoteReceipt): CBAReceiptAccent {
  if (vote === 'approve') return 'green';
  if (vote === 'reject') return 'red';
  return 'default';
}

function ownerApprovalThreshold(ownerCount: number): number {
  return ownerCount > 0 ? Math.floor(ownerCount / 2) + 1 : 0;
}

function buildRows(terms: CBATerms) {
  return [
    { label: 'Revenue Split', value: formatPercent(terms.revenueSplit) },
    { label: 'Cap Growth', value: formatPercent(terms.capGrowthRate) },
    { label: 'Cap Floor', value: formatPercent(terms.capFloorPct) },
    { label: 'Tag Limit', value: `${terms.franchiseTagLimit}` },
    { label: 'Roster Limit', value: `${terms.rosterLimit}` },
    { label: 'Practice Squad', value: `${terms.practiceSquadSize}` },
    { label: 'IR Returns', value: `${terms.irReturnLimit}` },
    { label: 'Playoff Seeds', value: `${terms.playoffSeeds}` },
    { label: 'Draft Rounds', value: `${terms.draftRounds}` },
    { label: 'Tag Types', value: terms.tagTypesAllowed.join(', ') },
  ];
}

function compareDeals(previous: CBAState['history'][number] | undefined, current: CBAState['history'][number] | undefined) {
  if (!previous || !current) return [];
  const previousRows = buildRows(previous.terms);
  const currentRows = buildRows(current.terms);
  return currentRows
    .map((row, index) => ({ ...row, before: previousRows[index]?.value ?? '-', changed: previousRows[index]?.value !== row.value }))
    .filter((row) => row.changed);
}

export function buildCBAActionReceipt(input: CBAActionReceiptInput): CBAActionReceipt {
  if (input.type === 'vote') {
    const proposalRound = input.proposal ? `round ${input.proposal.round}` : 'current proposal';
    return {
      title: 'CBA Vote Receipt',
      target: 'Owner Vote',
      result: `${voteLabel(input.vote)} vote sent for ${proposalRound}`,
      detail: `voteOnCBA records the user vote, fills CPU owner votes, and ratifies only when approvals meet ${input.approvalThreshold} of ${input.ownerCount || 0}. Reject and abstain are visible vote-line outcomes but add no approval vote.`,
      source: 'Saved by the CBA vote action. Changed now: owner votes and your vote are recorded; a new CBA and league rules apply only if approval passes, with labor/governance news added.',
      accent: voteAccent(input.vote),
    };
  }

  const isLockout = input.status === 'lockout';
  return {
    title: isLockout ? 'CBA Lockout Receipt' : 'CBA Advance Receipt',
    target: isLockout ? 'Work Stoppage' : `Round ${input.round}/5`,
    result: isLockout ? 'Resolve Lockout action sent' : input.hasCurrentProposal ? 'Advance action sent with proposal on table' : 'Advance action sent',
    detail: isLockout
      ? 'The lockout resolution action owns emergency bargaining and any resulting CBA/rule projection. This screen only reports the action after it finishes.'
      : 'The advance action owns round movement, gap narrowing, new proposals, owner-vote transitions, and possible lockout entry. Opening CBA Negotiation does not advance bargaining by itself.',
    source: 'Saved by the CBA advance action. Changed now: negotiation status and history move forward; league rules change only after ratification or an emergency deal, with labor/governance news added.',
    accent: isLockout ? 'red' : 'cyan',
  };
}

export function buildCBASourceRows({
  status,
  round,
  historyCount,
  hasCurrentProposal,
}: {
  status: CBAState['status'];
  round: number;
  historyCount: number;
  hasCurrentProposal: boolean;
}): CBASourceRow[] {
  return [
    {
      id: 'saved-cba-state',
      label: 'Saved bargaining state',
      value: status,
      detail: 'selectCBAState reads saved game.cbaState for status, current deal, negotiation state, lockout risk, and deal history.',
      accent: status === 'lockout' ? 'red' : status === 'awaiting_owner_vote' ? 'gold' : 'cyan',
    },
    {
      id: 'proposal-display',
      label: 'Proposal display',
      value: hasCurrentProposal ? `Round ${round}` : 'No offer',
      detail: 'Owners, Players, and Current Proposal columns render existing negotiationState proposals; this route does not generate proposal terms while rendering.',
      accent: hasCurrentProposal ? 'green' : 'default',
    },
    {
      id: 'owner-vote-path',
      label: 'Owner vote path',
      value: 'Approve / Reject / Abstain',
      detail: 'Approve, Reject, and Abstain commit through voteOnCBA. Abstain is saved as an owner vote and counts as neither approval nor rejection.',
      accent: status === 'awaiting_owner_vote' ? 'gold' : 'default',
    },
    {
      id: 'advance-path',
      label: 'Advance path',
      value: status === 'lockout' ? 'Resolve lockout' : 'Advance round',
      detail: 'Advance Negotiation and Resolve Lockout commit through advanceCBANegotiation; render-only panels do not narrow gaps or apply emergency deals.',
      accent: status === 'lockout' ? 'red' : 'cyan',
    },
    {
      id: 'rule-projection',
      label: 'Rule projection',
      value: `${historyCount} deals logged`,
      detail: 'Ratified CBA terms project to a defined subset of league rules; /league-rules remains the read-only effective-rule and history view.',
      accent: 'green',
    },
    {
      id: 'outside-cba-terms',
      label: 'Outside CBA terms',
      value: 'Commissioner lane',
      detail: 'Schedule weeks, trade deadline week, overtime format, and comp-pick limit are not part of CBA term projection today. Review /league-rules for active values and use /commissioner for petitionable changes.',
      accent: 'gold',
    },
  ];
}

function ProposalColumn({
  title,
  proposal,
  accent,
}: {
  title: string;
  proposal: CBAProposal | null | undefined;
  accent: 'gold' | 'cyan' | 'green';
}) {
  return (
    <PixelPanel title={title} accent={accent}>
      {proposal ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>{proposal.rationale}</div>
          {buildRows(proposal.terms).map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{row.label}</span>
              <PixelBadge variant={accent}>{row.value}</PixelBadge>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No proposal logged yet.</div>
      )}
    </PixelPanel>
  );
}

function CBASourceContext({ rows }: { rows: CBASourceRow[] }) {
  return (
    <PixelPanel title="CBA Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>{row.label.toUpperCase()}</div>
              <PixelBadge variant={row.accent}>{row.value.toUpperCase()}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function CBAActionReceiptPanel({ receipt }: { receipt: CBAActionReceipt }) {
  return (
    <PixelPanel title={receipt.title} accent={receipt.accent}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
          <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>TARGET</div>
          <PixelBadge variant={receipt.accent}>{receipt.target.toUpperCase()}</PixelBadge>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{receipt.result}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
          <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>SAVED BY</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{receipt.source}</div>
        </div>
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '10px', lineHeight: 1.6 }}>
        {receipt.detail}
      </div>
      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', marginTop: '8px' }}>
        On-screen confirmation only. The saved bargaining state is owned by the existing store action above.
      </div>
    </PixelPanel>
  );
}

export function CBANegotiation() {
  const cbaState = useGameStore(selectCBAState);
  const unionLeader = useGameStore(selectUnionLeader);
  const ownerCount = useGameStore((state) => state.game ? Object.keys(state.game.teams).length : 0);
  const voteOnCBA = useGameStore((state) => state.actions.voteOnCBA);
  const advanceCBANegotiation = useGameStore((state) => state.actions.advanceCBANegotiation);
  const [actionReceipt, setActionReceipt] = useState<CBAActionReceipt | null>(null);

  if (!cbaState) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="CBA Negotiations" subtitle="No bargaining state is loaded." />
      </div>
    );
  }

  const negotiation = cbaState.negotiationState;
  const history = cbaState.history;
  const dealDiff = compareDeals(history.at(-2), history.at(-1));
  const approvalThreshold = ownerApprovalThreshold(ownerCount);
  const sourceRows = buildCBASourceRows({
    status: cbaState.status,
    round: negotiation?.round ?? 0,
    historyCount: history.length,
    hasCurrentProposal: Boolean(negotiation?.currentProposal),
  });

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="CBA Negotiations"
        subtitle={`Status: ${cbaState.status} // lockout risk ${cbaState.lockoutRisk}`}
        badges={(
          <>
            <PixelBadge variant={cbaState.status === 'lockout' ? 'red' : cbaState.status === 'awaiting_owner_vote' ? 'gold' : 'cyan'}>
              {cbaState.status.toUpperCase()}
            </PixelBadge>
            <PixelBadge variant="default">ROUND {negotiation?.round ?? 0}/5</PixelBadge>
            <PixelBadge variant="green">{history.length} DEALS LOGGED</PixelBadge>
          </>
        )}
      />

      {cbaState.status === 'lockout' ? (
        <PixelPanel title="Lockout Alert" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...display, fontSize: '24px', color: 'var(--mfd-red)', lineHeight: 1 }}>WORK STOPPAGE ACTIVE</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              League operations are frozen until a short-term agreement is reached.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <CBASourceContext rows={sourceRows} />
      {actionReceipt ? <CBAActionReceiptPanel receipt={actionReceipt} /> : null}

      <div style={autoGrid(260)}>
        <FranchiseGauge
          label="Gap Meter"
          value={negotiation?.gap ?? 0}
          accent={cbaState.status === 'awaiting_owner_vote' ? 'green' : negotiation && negotiation.gap > 40 ? 'red' : 'cyan'}
          detail={negotiation ? `Public pressure ${negotiation.publicPressure}` : 'No live negotiations'}
        />
        <FranchiseGauge
          label="Public Pressure"
          value={negotiation?.publicPressure ?? 0}
          accent={negotiation && negotiation.publicPressure > 70 ? 'red' : 'gold'}
          detail={negotiation?.mediator ? 'Mediator active' : 'Sides are still working without mediation'}
        />
        <PixelPanel title="Union Leader" accent="cyan">
          {unionLeader ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                {unionLeader.name.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                {unionLeader.pos} // {unionLeader.ovr} OVR // ambition {unionLeader.personality.ambition}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="cyan">WORK ETHIC {unionLeader.personality.workEthic}</PixelBadge>
                <PixelBadge variant="gold">LOYALTY {unionLeader.personality.loyalty}</PixelBadge>
              </div>
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No player representative has emerged.</div>
          )}
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <ProposalColumn title="Owners" proposal={negotiation?.ownersProposal} accent="gold" />
        <ProposalColumn title="Players" proposal={negotiation?.playersProposal} accent="cyan" />
        <ProposalColumn title="Current Proposal" proposal={negotiation?.currentProposal} accent="green" />
      </div>

      <PixelPanel title="Owner Decision" accent={cbaState.status === 'awaiting_owner_vote' ? 'gold' : 'default'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {cbaState.status === 'awaiting_owner_vote'
              ? `A tentative agreement is on the table. Cast your owner vote${negotiation?.userVote ? `; current vote ${negotiation.userVote}` : ''}.`
              : cbaState.status === 'lockout'
                ? 'Advance to resolve the lockout with an emergency agreement.'
                : 'Advance the negotiations one round at a time until a deal or a lockout.'}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant={cbaState.status === 'awaiting_owner_vote' ? 'gold' : 'default'}>
              {ownerCount > 0 ? `${approvalThreshold} / ${ownerCount} APPROVALS` : 'MAJORITY NEEDED'}
            </PixelBadge>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              {ownerCount > 0
                ? `Ratification needs ${approvalThreshold} of ${ownerCount} owner approvals. Rejections and abstentions appear in the public vote line but add no approval votes.`
                : 'Ratification uses a simple majority of current owners; no owner count is loaded.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {cbaState.status === 'awaiting_owner_vote' ? (
              <>
                <PixelButton
                  accent="green"
                  onClick={async () => {
                    await voteOnCBA('approve');
                    setActionReceipt(buildCBAActionReceipt({
                      type: 'vote',
                      vote: 'approve',
                      ownerCount,
                      approvalThreshold,
                      proposal: negotiation?.currentProposal,
                    }));
                  }}
                >
                  Approve
                </PixelButton>
                <PixelButton
                  accent="red"
                  onClick={async () => {
                    await voteOnCBA('reject');
                    setActionReceipt(buildCBAActionReceipt({
                      type: 'vote',
                      vote: 'reject',
                      ownerCount,
                      approvalThreshold,
                      proposal: negotiation?.currentProposal,
                    }));
                  }}
                >
                  Reject
                </PixelButton>
                <PixelButton
                  accent="default"
                  onClick={async () => {
                    await voteOnCBA('abstain');
                    setActionReceipt(buildCBAActionReceipt({
                      type: 'vote',
                      vote: 'abstain',
                      ownerCount,
                      approvalThreshold,
                      proposal: negotiation?.currentProposal,
                    }));
                  }}
                >
                  Abstain
                </PixelButton>
              </>
            ) : null}
            <PixelButton
              accent={cbaState.status === 'lockout' ? 'red' : 'cyan'}
              onClick={async () => {
                await advanceCBANegotiation();
                setActionReceipt(buildCBAActionReceipt({
                  type: 'advance',
                  status: cbaState.status,
                  round: negotiation?.round ?? 0,
                  hasCurrentProposal: Boolean(negotiation?.currentProposal),
                }));
              }}
            >
              {cbaState.status === 'lockout' ? 'Resolve Lockout' : 'Advance Negotiation'}
            </PixelButton>
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Final Terms vs Previous Deal" accent="green">
        {dealDiff.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dealDiff.map((row) => (
              <div key={row.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center',
                padding: '10px',
                border: '2px solid var(--mfd-green)',
                background: 'var(--mfd-bg-2)',
              }}
              >
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{row.label}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <PixelBadge variant="default">{row.before}</PixelBadge>
                  <PixelBadge variant="green">{row.value}</PixelBadge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Ratified deal differences will appear here once bargaining changes the CBA.
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
