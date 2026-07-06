export type HalftimeDecisionReceiptChoice = 'stick' | 'switch' | 'gamble' | 'unknown';

export interface HalftimeDecisionReceipt {
  source: 'GameDayPackage.activeEffectSummaries';
  summary: string;
  detail: string;
  choice: HalftimeDecisionReceiptChoice;
  broadcastLine: string;
  recapLine: string;
}

const HALFTIME_SUMMARY_PREFIX = /^Halftime hell:\s*/i;

function receiptChoice(detail: string): HalftimeDecisionReceiptChoice {
  const normalized = detail.toLowerCase();
  if (normalized.includes('stayed with')) return 'stick';
  if (normalized.includes('flipped')) return 'switch';
  if (normalized.includes('rolled the dice')) return 'gamble';
  return 'unknown';
}

export function buildHalftimeDecisionReceipt(
  activeEffectSummaries: readonly string[] | null | undefined,
): HalftimeDecisionReceipt | null {
  const summary = activeEffectSummaries?.find((entry) => HALFTIME_SUMMARY_PREFIX.test(entry)) ?? null;
  if (!summary) return null;

  const detail = summary.replace(HALFTIME_SUMMARY_PREFIX, '').trim();
  const readableDetail = detail.length > 0 ? detail : 'the halftime decision was saved for the broadcast desk.';

  return {
    source: 'GameDayPackage.activeEffectSummaries',
    summary,
    detail: readableDetail,
    choice: receiptChoice(readableDetail),
    broadcastLine: `Halftime receipt: ${readableDetail}`,
    recapLine: `Saved halftime receipt from GameDayPackage.activeEffectSummaries: ${readableDetail}`,
  };
}
