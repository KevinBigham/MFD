import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import {
  selectLeagueRuleDiffs,
  selectLeagueRuleHistory,
  selectLeagueRulesByCategory,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';

type RuleSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface RuleSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: RuleSourceAccent;
}

function categoryLabel(category: string): string {
  if (category === 'financial') return 'Financial';
  if (category === 'roster') return 'Roster';
  if (category === 'competition') return 'Competition';
  return 'Tags';
}

function sourceAccent(source: string): 'default' | 'cyan' | 'gold' | 'green' {
  if (source === 'cba') return 'gold';
  if (source === 'commissioner_vote') return 'cyan';
  if (source === 'owners_vote') return 'green';
  return 'default';
}

export function buildRuleRegistrySourceRows({
  categoryCount,
  ruleCount,
  changedCount,
  historyCount,
}: {
  categoryCount: number;
  ruleCount: number;
  changedCount: number;
  historyCount: number;
}): RuleSourceRow[] {
  return [
    {
      id: 'current-registry',
      label: 'Current registry',
      value: `${ruleCount} rules`,
      detail: 'selectLeagueRulesByCategory groups saved game.leagueRules entries with LEAGUE_RULE_DEFINITIONS labels, categories, sources, and effective years.',
      accent: 'cyan',
    },
    {
      id: 'default-diff',
      label: 'Default comparison',
      value: `${changedCount} changed`,
      detail: 'selectLeagueRuleDiffs compares the active display values against rule defaults; it does not apply pending changes or run gameplay formulas.',
      accent: changedCount > 0 ? 'gold' : 'default',
    },
    {
      id: 'history-timeline',
      label: 'History timeline',
      value: `${historyCount} tracked`,
      detail: 'selectLeagueRuleHistory reads saved rule-change history written by commissioner votes and ratified CBA deals.',
      accent: historyCount > 0 ? 'green' : 'default',
    },
    {
      id: 'commit-owners',
      label: 'Commit owners',
      value: '/commissioner / /cba',
      detail: 'Rule petitions and proposal votes commit on /commissioner; CBA bargaining and ratification commit on /cba. This registry route is read-only.',
      accent: 'green',
    },
    {
      id: 'effective-year-boundary',
      label: 'Effective-year boundary',
      value: `${categoryCount} categories`,
      detail: 'Gameplay systems use the active rule for the correct year; opening League Rules does not recalculate seasons, playoffs, caps, rosters, or deadlines.',
      accent: 'red',
    },
  ];
}

function RuleRegistrySources({ rows }: { rows: RuleSourceRow[] }) {
  return (
    <PixelPanel title="Rule Registry Sources" accent="cyan">
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

export function LeagueRulesViewer() {
  const groupedRules = useGameStore(selectLeagueRulesByCategory);
  const history = useGameStore(selectLeagueRuleHistory);
  const diffs = useGameStore(selectLeagueRuleDiffs);
  const changedCount = diffs.filter((entry) => entry.changed).length;
  const categoryCount = Object.keys(groupedRules).length;
  const ruleCount = Object.values(groupedRules).reduce((total, rules) => total + rules.length, 0);
  const historyCount = history.reduce((total, group) => total + group.changes.length, 0);
  const sourceRows = buildRuleRegistrySourceRows({
    categoryCount,
    ruleCount,
    changedCount,
    historyCount,
  });

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="League Rules"
        subtitle="Current rule registry and league evolution timeline."
        badges={(
          <>
            <PixelBadge variant="cyan">{Object.keys(groupedRules).length} CATEGORIES</PixelBadge>
            <PixelBadge variant={changedCount > 0 ? 'gold' : 'default'}>{changedCount} CHANGED FROM DEFAULT</PixelBadge>
          </>
        )}
      />

      <RuleRegistrySources rows={sourceRows} />

      <div style={autoGrid(280)}>
        {Object.entries(groupedRules).map(([category, rules]) => (
          <PixelPanel key={category} title={categoryLabel(category)} accent={category === 'financial' ? 'gold' : category === 'competition' ? 'cyan' : category === 'roster' ? 'green' : 'default'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rules.map((rule) => (
                <div key={rule.key} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px',
                  border: '2px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-2)',
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                      {rule.label.toUpperCase()}
                    </div>
                    <PixelBadge variant={sourceAccent(rule.source)}>{rule.value}</PixelBadge>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={sourceAccent(rule.source)}>{rule.source.replace(/_/g, ' ').toUpperCase()}</PixelBadge>
                    <PixelBadge variant="default">EFFECTIVE {rule.effectiveYear}</PixelBadge>
                    {rule.changedFromDefault ? <PixelBadge variant="gold">CHANGED</PixelBadge> : null}
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>
        ))}
      </div>

      <PixelPanel title="Rule Change Timeline" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.length > 0 ? history.map((group) => (
            <div key={group.key} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
            >
              <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                {group.label.toUpperCase()}
              </div>
              {group.changes.map((change) => (
                <div key={`${group.key}-${change.effectiveYear}-${change.rationale}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={sourceAccent(change.source)}>{change.source.replace(/_/g, ' ').toUpperCase()}</PixelBadge>
                    <PixelBadge variant="default">YEAR {change.effectiveYear}</PixelBadge>
                    <PixelBadge variant="cyan">
                      {String(Array.isArray(change.previousValue) ? change.previousValue.join(', ') : change.previousValue)}
                      {' -> '}
                      {String(Array.isArray(change.newValue) ? change.newValue.join(', ') : change.newValue)}
                    </PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                    {change.rationale}
                  </div>
                </div>
              ))}
            </div>
          )) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No league rules have changed from the original setup yet.</div>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}
