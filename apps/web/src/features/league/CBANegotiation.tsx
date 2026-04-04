import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { type CBAProposal, type CBAState, type CBATerms } from '@mfd/engine';
import {
  selectCBAState,
  selectUnionLeader,
  useGameStore,
} from '../../app/store/game-store';
import { FranchiseGauge } from '../franchise/franchiseUi';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
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

export function CBANegotiation() {
  const cbaState = useGameStore(selectCBAState);
  const unionLeader = useGameStore(selectUnionLeader);
  const voteOnCBA = useGameStore((state) => state.actions.voteOnCBA);
  const advanceCBANegotiation = useGameStore((state) => state.actions.advanceCBANegotiation);

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
              ? 'A tentative agreement is on the table. Cast your owner vote.'
              : cbaState.status === 'lockout'
                ? 'Advance to resolve the lockout with an emergency agreement.'
                : 'Advance the negotiations one round at a time until a deal or a lockout.'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {cbaState.status === 'awaiting_owner_vote' ? (
              <>
                <PixelButton accent="green" onClick={() => { void voteOnCBA('approve'); }}>Approve</PixelButton>
                <PixelButton accent="red" onClick={() => { void voteOnCBA('reject'); }}>Reject</PixelButton>
              </>
            ) : null}
            <PixelButton
              accent={cbaState.status === 'lockout' ? 'red' : 'cyan'}
              onClick={() => { void advanceCBANegotiation(); }}
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
