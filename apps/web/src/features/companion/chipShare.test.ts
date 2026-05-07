import { describe, expect, it } from 'vitest';
import {
  CHIP_SHARE_EVENT_TYPES,
  createChipShareService,
  generateChipShareEvent,
  isMfdShareEnabled,
} from './chipShare';

describe('Chip share scaffold', () => {
  it('defaults share work off unless the explicit feature flag is true', () => {
    expect(isMfdShareEnabled({})).toBe(false);
    expect(isMfdShareEnabled({ VITE_MFD_SHARE_ENABLED: 'false' })).toBe(false);
    expect(isMfdShareEnabled({ VITE_MFD_SHARE_ENABLED: 'true' })).toBe(true);
  });

  it('defines the future share-card event surface', () => {
    expect(CHIP_SHARE_EVENT_TYPES).toEqual([
      'weekly_recap',
      'big_trade',
      'draft_steal',
      'rivalry_win',
      'playoff_clinch',
      'championship',
      'hall_of_fame',
      'record_milestone',
    ]);
  });

  it('generates deterministic local payloads without external posting fields', () => {
    const payload = generateChipShareEvent({
      type: 'weekly_recap',
      teamName: 'Chicago Knights',
      season: 2032,
      week: 7,
      headline: 'Road win with a cost',
      summary: 'The win bought breathing room, but the right tackle injury changes next week.',
      occurredAt: '2026-05-05T14:00:00.000Z',
    });

    expect(payload).toMatchObject({
      id: 'mfd-share:weekly_recap:2032:7:road-win-with-a-cost',
      type: 'weekly_recap',
      title: 'Chicago Knights // Week 7',
      copyText: expect.stringContaining('Road win with a cost'),
    });
    expect(payload.externalTargets).toEqual([]);
  });

  it('returns null from the service while the flag is disabled', () => {
    const service = createChipShareService({ env: { VITE_MFD_SHARE_ENABLED: 'false' } });

    expect(service.isEnabled()).toBe(false);
    expect(service.create({
      type: 'big_trade',
      teamName: 'Chicago Knights',
      season: 2032,
      week: 8,
      headline: 'Veteran tackle acquired',
      summary: 'A Sunday answer with a February bill.',
      occurredAt: '2026-05-05T14:00:00.000Z',
    })).toBeNull();
  });
});
