import { useMemo, useState } from 'react';
import {
  CONTINGENCY_RESPONSES,
  CONTINGENCY_TRIGGERS,
  MAX_CONTINGENCIES,
  createContingencyRule,
  limitContingencyRules,
  type ContingencyResponse,
  type ContingencyRule,
  type ContingencyTrigger,
} from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel, PixelSelect } from '@mfd/design-system/components';
import { autoGrid, monoSm } from '../shared/pixelUi';

interface ContingencyBuilderProps {
  teamId: string;
  year: number;
  week: number;
  rules: ContingencyRule[];
  onChange: (rules: ContingencyRule[]) => void;
}

const thresholdOptions = [
  { value: '7', label: '7+' },
  { value: '14', label: '14+' },
  { value: '21', label: '21+' },
];

function nextRuleId(teamId: string, year: number, week: number, trigger: ContingencyTrigger, response: ContingencyResponse, count: number): string {
  return `prep-${teamId}-${year}-${week}-${trigger}-${response}-${count}`;
}

export function ContingencyBuilder({
  teamId,
  year,
  week,
  rules,
  onChange,
}: ContingencyBuilderProps) {
  const [selectedTrigger, setSelectedTrigger] = useState<Exclude<ContingencyTrigger, 'trailing_14_at_half' | 'trailing_7_at_half' | 'leading_14_at_half' | 'opponent_scores_opening' | 'turnover_deficit_2' | 'wind_over_15'>>('down_by');
  const [selectedResponse, setSelectedResponse] = useState<ContingencyResponse>('go_air_raid');
  const [selectedThreshold, setSelectedThreshold] = useState<'7' | '14' | '21'>('14');

  const triggerOptions = useMemo(() => Object.entries(CONTINGENCY_TRIGGERS).map(([value, meta]) => ({
    value,
    label: meta.label,
  })), []);
  const responseOptions = useMemo(() => Object.entries(CONTINGENCY_RESPONSES).map(([value, meta]) => ({
    value,
    label: meta.label,
  })), []);

  const addRule = () => {
    if (rules.length >= MAX_CONTINGENCIES) return;
    const rule = createContingencyRule(selectedTrigger, selectedResponse, {
      id: nextRuleId(teamId, year, week, selectedTrigger, selectedResponse, rules.length + 1),
      threshold: selectedTrigger === 'down_by' || selectedTrigger === 'up_by'
        ? Number(selectedThreshold) as 7 | 14 | 21
        : undefined,
    });
    onChange(limitContingencyRules([...rules, rule]));
  };

  const removeRule = (ruleId: string) => {
    onChange(rules.filter((rule) => rule.id !== ruleId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PixelBadge variant="gold">Rules {rules.length}/{MAX_CONTINGENCIES}</PixelBadge>
        <PixelBadge variant="cyan">Auto-fire midgame</PixelBadge>
      </div>

      {rules.length === 0 ? (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          Build up to three if/then calls. They trigger automatically once the game hits the right moment.
        </div>
      ) : (
        rules.map((rule) => {
          const legacy = Boolean(rule.legacy || (!rule.response && rule.action));
          return (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={legacy ? 'red' : 'gold'}>
                    {legacy ? 'LEGACY' : 'LIVE'}
                  </PixelBadge>
                  {rule.threshold ? <PixelBadge variant="default">{`${rule.threshold}+`}</PixelBadge> : null}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{rule.label}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {legacy ? `${rule.description} Legacy rules are preserved but not editable here.` : rule.description}
                </div>
              </div>
              <PixelButton accent="red" onClick={() => removeRule(rule.id)}>Remove</PixelButton>
            </div>
          );
        })
      )}

      <div style={autoGrid(220)}>
        <PixelPanel title="Trigger" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <PixelSelect
              value={selectedTrigger}
              onChange={(event) => setSelectedTrigger(event.target.value as typeof selectedTrigger)}
              options={triggerOptions}
              accent="gold"
            />
            {(selectedTrigger === 'down_by' || selectedTrigger === 'up_by') ? (
              <PixelSelect
                value={selectedThreshold}
                onChange={(event) => setSelectedThreshold(event.target.value as typeof selectedThreshold)}
                options={thresholdOptions}
                accent="gold"
              />
            ) : null}
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              {CONTINGENCY_TRIGGERS[selectedTrigger].description}
            </div>
          </div>
        </PixelPanel>
        <PixelPanel title="Response" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <PixelSelect
              value={selectedResponse}
              onChange={(event) => setSelectedResponse(event.target.value as ContingencyResponse)}
              options={responseOptions}
              accent="cyan"
            />
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              {CONTINGENCY_RESPONSES[selectedResponse].description}
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton accent="green" disabled={rules.length >= MAX_CONTINGENCIES} onClick={addRule}>
          Add Contingency Rule
        </PixelButton>
      </div>
    </div>
  );
}
