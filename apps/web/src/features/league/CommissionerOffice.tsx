import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelSelect } from '@mfd/design-system/components';
import { LEAGUE_RULE_DEFINITIONS, type LeagueRuleDefinition, type LeagueRuleKey, type LeagueRuleValue, type RuleProposal, type RuleProposalVote } from '@mfd/engine';
import {
  selectCBAState,
  selectCommissionerAgenda,
  selectCommissionerRulings,
  selectCommissionerState,
  selectCommissionerVoteHistory,
  selectLeagueRules,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { FranchiseGauge } from '../franchise/franchiseUi';
import { PixelScreenHeader, autoGrid, display, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

type OfficeTab = 'agenda' | 'history' | 'rulings';
type GovernanceSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';
type GovernanceReceiptAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface GovernanceSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: GovernanceSourceAccent;
}

export interface GovernanceActionReceipt {
  title: string;
  target: string;
  result: string;
  detail: string;
  source: string;
  accent: GovernanceReceiptAccent;
}

type GovernanceActionReceiptInput =
  | {
    type: 'petition';
    definition: LeagueRuleDefinition;
    currentValue: LeagueRuleValue | null;
    proposedValue: LeagueRuleValue;
    teamName: string;
  }
  | {
    type: 'vote';
    proposal: RuleProposal;
    vote: RuleProposalVote;
  };

function goTo(path: string) {
  if (typeof window === 'undefined') return;
  window.location.hash = path;
}

function stringifyRuleValue(value: LeagueRuleValue): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number' && value > 0 && value < 1) {
    return Number.isInteger(value * 100) ? `${Math.round(value * 100)}%` : `${(value * 100).toFixed(1)}%`;
  }
  return String(value);
}

function voteLabel(vote: RuleProposalVote): string {
  if (vote === 'yes') return 'Yes';
  if (vote === 'no') return 'No';
  return 'Abstain';
}

function voteAccent(vote: RuleProposalVote): GovernanceReceiptAccent {
  if (vote === 'yes') return 'green';
  if (vote === 'no') return 'red';
  return 'default';
}

function approvalAccent(value: number): 'red' | 'gold' | 'cyan' | 'green' {
  if (value < 30) return 'red';
  if (value < 50) return 'gold';
  if (value < 70) return 'cyan';
  return 'green';
}

export function buildGovernanceActionReceipt(input: GovernanceActionReceiptInput): GovernanceActionReceipt {
  if (input.type === 'petition') {
    return {
      title: 'Rule Petition Receipt',
      target: input.definition.label,
      result: `Filed ${stringifyRuleValue(input.currentValue ?? 'unknown')} -> ${stringifyRuleValue(input.proposedValue)}`,
      detail: `${input.teamName} ownership asked the league office to stage the owner petition. Filing replaces this team's prior active petition and saves the governance narrative.`,
      source: 'Saved by the rule-petition action. Changed now: the active proposal is updated and governance news/social narrative is added.',
      accent: 'green',
    };
  }

  const definition = LEAGUE_RULE_DEFINITIONS[input.proposal.ruleKey];
  return {
    title: 'Rule Vote Receipt',
    target: definition.label,
    result: `${voteLabel(input.vote)} vote sent for ${stringifyRuleValue(input.proposal.currentValue)} -> ${stringifyRuleValue(input.proposal.proposedValue)}`,
    detail: `voteOnProposal records the user vote, simulates remaining owner votes, writes commissioner vote history, and applies the rule only if the existing majority threshold passes. Abstain adds no yes vote.`,
    source: 'Saved by the rule-vote action. Changed now: proposal history is updated; league rules change only if the vote passes, with governance news/social narrative added.',
    accent: voteAccent(input.vote),
  };
}

export function buildGovernanceSourceRows({
  agendaCount,
  historyCount,
  rulingCount,
  cbaStatus,
  petitionableRuleCount,
}: {
  agendaCount: number;
  historyCount: number;
  rulingCount: number;
  cbaStatus: string;
  petitionableRuleCount: number;
}): GovernanceSourceRow[] {
  return [
    {
      id: 'commissioner-state',
      label: 'League office state',
      value: `${agendaCount} active / ${historyCount} history`,
      detail: 'selectCommissionerState, selectCommissionerAgenda, and selectCommissionerVoteHistory read saved game.commissionerState.',
      accent: 'cyan',
    },
    {
      id: 'petition-vote-path',
      label: 'Rule petition and vote path',
      value: `${petitionableRuleCount} petitionable rules`,
      detail: 'File Petition commits through petitionRuleChange; Vote Yes, Vote No, and Abstain commit through voteOnProposal for commissioner rule proposals only.',
      accent: 'green',
    },
    {
      id: 'cba-handoff',
      label: 'CBA handoff',
      value: cbaStatus,
      detail: 'CBA Status reads selectCBAState. Open CBA Negotiation routes to /cba, where voteOnCBA and advanceCBANegotiation own bargaining commits.',
      accent: cbaStatus === 'lockout' ? 'red' : cbaStatus === 'awaiting_owner_vote' ? 'gold' : 'cyan',
    },
    {
      id: 'rule-registry',
      label: 'Rule registry',
      value: 'League Rules',
      detail: 'LEAGUE_RULE_DEFINITIONS controls petition inputs; /league-rules remains the read-only rule registry and history view.',
      accent: 'gold',
    },
    {
      id: 'ruling-boundary',
      label: 'Ruling boundary',
      value: `${rulingCount} recent`,
      detail: 'Commissioner rulings render from selectCommissionerRulings. Save parsing accepts live ruling fields and legacy description/approvalImpact imports; this route does not issue rulings.',
      accent: rulingCount > 0 ? 'red' : 'default',
    },
  ];
}

function buildPetitionOptions(definition: LeagueRuleDefinition, currentValue: LeagueRuleValue): Array<{ value: string; label: string; decoded: LeagueRuleValue }> {
  if (definition.inputKind === 'boolean') {
    return [
      { value: 'true', label: 'TRUE', decoded: true },
      { value: 'false', label: 'FALSE', decoded: false },
    ];
  }

  if (definition.inputKind === 'enum') {
    return (definition.options ?? []).map((option) => ({
      value: String(option.value),
      label: option.label.toUpperCase(),
      decoded: option.value,
    }));
  }

  if (definition.inputKind === 'multi_enum') {
    const rawOptions = (definition.options ?? []).map((option) => String(option.value));
    const variants = [
      rawOptions,
      rawOptions.filter((value) => value !== 'transition'),
      rawOptions.filter((_, index) => index < 2),
      rawOptions.filter((_, index) => index === 0),
    ]
      .filter((entry) => entry.length > 0)
      .filter((entry, index, list) => list.findIndex((candidate) => candidate.join('|') === entry.join('|')) === index);

    return variants.map((variant) => ({
      value: JSON.stringify(variant),
      label: variant.join(' + ').toUpperCase(),
      decoded: variant as LeagueRuleValue,
    }));
  }

  const min = definition.min ?? Number(currentValue);
  const max = definition.max ?? Number(currentValue);
  const step = definition.step ?? 1;
  const values: number[] = [];

  for (let value = min; value <= max + 0.0001; value += step) {
    values.push(Number(value.toFixed(3)));
  }

  return values.map((value) => ({
    value: String(value),
    label: stringifyRuleValue(value).toUpperCase(),
    decoded: value,
  }));
}

function GovernanceSourceContext({ rows }: { rows: GovernanceSourceRow[] }) {
  return (
    <PixelPanel title="Governance Sources" accent="cyan">
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

export function GovernanceActionReceiptPanel({ receipt }: { receipt: GovernanceActionReceipt }) {
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
        On-screen confirmation only. The saved governance state is owned by the existing store action above.
      </div>
    </PixelPanel>
  );
}

export function CommissionerOffice() {
  const team = useGameStore(selectUserTeam);
  const commissioner = useGameStore(selectCommissionerState);
  const agenda = useGameStore(selectCommissionerAgenda);
  const history = useGameStore(selectCommissionerVoteHistory);
  const rulings = useGameStore(selectCommissionerRulings);
  const cbaState = useGameStore(selectCBAState);
  const leagueRules = useGameStore(selectLeagueRules);
  const voteOnProposal = useGameStore((state) => state.actions.voteOnProposal);
  const petitionRuleChange = useGameStore((state) => state.actions.petitionRuleChange);

  const petitionableRules = useMemo(
    () => Object.values(LEAGUE_RULE_DEFINITIONS).filter((definition) => definition.petitionable),
    [],
  );
  const [activeTab, setActiveTab] = useState<OfficeTab>('agenda');
  const [ruleKey, setRuleKey] = useState<LeagueRuleKey>(petitionableRules[0]?.key ?? 'practice_squad_size');
  const selectedDefinition = LEAGUE_RULE_DEFINITIONS[ruleKey];
  const currentValue = leagueRules ? leagueRules.entries[ruleKey].value : null;
  const petitionOptions = useMemo(
    () => buildPetitionOptions(selectedDefinition, currentValue ?? selectedDefinition.options?.[0]?.value ?? 0),
    [currentValue, selectedDefinition],
  );
  const [petitionValue, setPetitionValue] = useState<string>(petitionOptions[0]?.value ?? '');
  const [actionReceipt, setActionReceipt] = useState<GovernanceActionReceipt | null>(null);
  const cbaYearsRemaining = cbaState?.currentDeal ? Math.max(0, cbaState.currentDeal.endYear - cbaState.currentDeal.startYear) : 0;
  const sourceRows = useMemo(
    () => buildGovernanceSourceRows({
      agendaCount: agenda.length,
      historyCount: history.length,
      rulingCount: rulings.length,
      cbaStatus: cbaState?.status ?? 'active',
      petitionableRuleCount: petitionableRules.length,
    }),
    [agenda.length, cbaState?.status, history.length, petitionableRules.length, rulings.length],
  );

  useEffect(() => {
    setPetitionValue(petitionOptions[0]?.value ?? '');
  }, [petitionOptions]);

  if (!team || !commissioner) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Commissioner's Office" subtitle="No league office data is loaded." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Commissioner's Office"
        subtitle={`${commissioner.name} // ${commissioner.personality} // tenure ${commissioner.tenure} year(s)`}
        badges={(
          <>
            <PixelBadge variant={approvalAccent(commissioner.approval)}>{commissioner.approval} APPROVAL</PixelBadge>
            <PixelBadge variant="cyan">{agenda.length} ACTIVE PROPOSALS</PixelBadge>
            <PixelBadge variant={cbaState?.status === 'lockout' ? 'red' : cbaState?.status === 'awaiting_owner_vote' ? 'gold' : 'green'}>
              CBA {cbaState?.status ?? 'active'}
            </PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(280)}>
        <FranchiseGauge
          label="Commissioner Approval"
          value={commissioner.approval}
          accent={approvalAccent(commissioner.approval)}
          detail={`${commissioner.lowApprovalYears} low-approval year(s) on record`}
        />

        <PixelPanel title="CBA Status" accent={cbaState?.status === 'lockout' ? 'red' : cbaState?.status === 'awaiting_owner_vote' ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">{(cbaState?.status ?? 'active').toUpperCase()}</PixelBadge>
              <PixelBadge variant="gold">{cbaYearsRemaining} YEARS IN DEAL</PixelBadge>
              {cbaState?.negotiationState ? <PixelBadge variant="default">ROUND {cbaState.negotiationState.round}</PixelBadge> : null}
            </div>
            {cbaState?.currentDeal ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                Revenue split {Math.round(cbaState.currentDeal.terms.revenueSplit * 100)}% // Cap growth {(cbaState.currentDeal.terms.capGrowthRate * 100).toFixed(1)}% //
                Practice squad {cbaState.currentDeal.terms.practiceSquadSize}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton accent="gold" onClick={() => goTo('/cba')}>
                Open CBA Negotiation
              </PixelButton>
              <PixelButton accent="cyan" onClick={() => goTo('/league-rules')}>
                View League Rules
              </PixelButton>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Owner Petition" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Petition for a rule change. Failed petitions cost owner goodwill.
            </div>
            <PixelSelect
              aria-label="Rule petition target"
              value={ruleKey}
              onChange={(event) => setRuleKey(event.target.value as LeagueRuleKey)}
              options={petitionableRules.map((definition) => ({
                value: definition.key,
                label: definition.label.toUpperCase(),
              }))}
              accent="green"
            />
            <PixelSelect
              aria-label="Rule petition value"
              value={petitionValue}
              onChange={(event) => setPetitionValue(event.target.value)}
              options={petitionOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              accent="green"
            />
            <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
              CURRENT: {stringifyRuleValue(currentValue ?? '')}
            </div>
            <PixelButton
              accent="green"
              disabled={!petitionOptions.some((option) => option.value === petitionValue)}
              onClick={async () => {
                const selected = petitionOptions.find((option) => option.value === petitionValue);
                if (!selected) return;
                await petitionRuleChange(ruleKey, selected.decoded);
                setActionReceipt(buildGovernanceActionReceipt({
                  type: 'petition',
                  definition: selectedDefinition,
                  currentValue,
                  proposedValue: selected.decoded,
                  teamName: `${team.city} ${team.name}`,
                }));
              }}
            >
              File Petition
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <GovernanceSourceContext rows={sourceRows} />
      {actionReceipt ? <GovernanceActionReceiptPanel receipt={actionReceipt} /> : null}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PixelButton accent={activeTab === 'agenda' ? 'gold' : 'default'} onClick={() => setActiveTab('agenda')}>Active Proposals</PixelButton>
        <PixelButton accent={activeTab === 'history' ? 'cyan' : 'default'} onClick={() => setActiveTab('history')}>Vote History</PixelButton>
        <PixelButton accent={activeTab === 'rulings' ? 'red' : 'default'} onClick={() => setActiveTab('rulings')}>Commissioner Rulings</PixelButton>
      </div>

      {activeTab === 'agenda' ? (
        <div style={autoGrid(320)}>
          {agenda.length > 0 ? agenda.map((proposal) => (
            <PixelPanel key={proposal.id} title={LEAGUE_RULE_DEFINITIONS[proposal.ruleKey].label} accent={proposal.source === 'owner_petition' ? 'green' : 'gold'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={proposal.source === 'owner_petition' ? 'green' : 'gold'}>{proposal.source.replace(/_/g, ' ').toUpperCase()}</PixelBadge>
                  <PixelBadge variant="cyan">
                    {stringifyRuleValue(proposal.currentValue)}
                    {' -> '}
                    {stringifyRuleValue(proposal.proposedValue)}
                  </PixelBadge>
                  <PixelBadge variant="default">{proposal.requiredMajority} YES NEEDED</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                  {proposal.rationale}
                </div>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
                  Effective year {proposal.effectiveYear}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelButton
                    accent="green"
                    onClick={async () => {
                      await voteOnProposal(proposal.id, 'yes');
                      setActionReceipt(buildGovernanceActionReceipt({ type: 'vote', proposal, vote: 'yes' }));
                    }}
                  >
                    Vote Yes
                  </PixelButton>
                  <PixelButton
                    accent="red"
                    onClick={async () => {
                      await voteOnProposal(proposal.id, 'no');
                      setActionReceipt(buildGovernanceActionReceipt({ type: 'vote', proposal, vote: 'no' }));
                    }}
                  >
                    Vote No
                  </PixelButton>
                  <PixelButton
                    accent="default"
                    onClick={async () => {
                      await voteOnProposal(proposal.id, 'abstain');
                      setActionReceipt(buildGovernanceActionReceipt({ type: 'vote', proposal, vote: 'abstain' }));
                    }}
                  >
                    Abstain
                  </PixelButton>
                </div>
              </div>
            </PixelPanel>
          )) : (
            <PixelPanel title="Active Proposals" accent="default">
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No governance votes are pending this offseason.</div>
            </PixelPanel>
          )}
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <PixelPanel title="Vote History" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.length > 0 ? history.slice().reverse().map((entry) => (
              <div key={entry.proposalId} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {LEAGUE_RULE_DEFINITIONS[entry.ruleKey].label.toUpperCase()}
                  </div>
                  <PixelBadge variant={entry.passed ? 'green' : 'red'}>{entry.passed ? 'PASSED' : 'FAILED'}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  YES {entry.yesVotes} // NO {entry.noVotes} // ABSTAIN {entry.abstains} // EFFECTIVE {entry.effectiveYear}
                </div>
              </div>
            )) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No owner votes have been recorded yet.</div>
            )}
          </div>
        </PixelPanel>
      ) : null}

      {activeTab === 'rulings' ? (
        <PixelPanel title="Commissioner Rulings" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rulings.length > 0 ? rulings.map((ruling) => (
              <div key={ruling.id} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                border: '2px solid var(--mfd-red)',
                background: 'var(--mfd-bg-2)',
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {ruling.headline.toUpperCase()}
                  </div>
                  <PixelBadge variant="red">{ruling.type.toUpperCase()}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>{ruling.rationale}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="gold">MORALE {ruling.moraleImpact}</PixelBadge>
                  <PixelBadge variant="cyan">CHEM {ruling.chemistryImpact}</PixelBadge>
                  <PixelBadge variant="default">OWNER {ruling.ownerApprovalImpact}</PixelBadge>
                </div>
              </div>
            )) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No rulings have been issued recently.</div>
            )}
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
