import { describe, expect, it } from 'vitest';

import {
  APP_SUBTITLE,
  APP_TITLE,
  MODE_COPY,
  STATUS_COPY,
  STORAGE_MODE_KEY,
} from '../src/app/launcher-copy.js';

describe('launcher-copy constants', () => {
  it('exports stable launcher labels', () => {
    expect(APP_TITLE).toBe('MR. FOOTBALL DYNASTY');
    expect(APP_SUBTITLE).toBe('');
    expect(MODE_COPY.play.tabLabel).toBe('Play Now');
    expect(typeof MODE_COPY.play.recoveryHint).toBe('string');
    expect(MODE_COPY.status.tabLabel).toBe('Module Status');
    expect(STORAGE_MODE_KEY).toBe('mfd.bootMode');
  });

  it('preserves status dashboard wording constants', () => {
    expect(STATUS_COPY.loadingTitle).toBe('Loading Module Validation');
    expect(STATUS_COPY.errorTitle).toBe('Module Validation Error');
    expect(STATUS_COPY.runtimeTitle).toBe('Runtime Validation');
    expect(STATUS_COPY.systemsTitle).toBe('Extracted Module Status');
    expect(STATUS_COPY.summaryTitle).toBe('Phase 1 Summary');
  });
});
