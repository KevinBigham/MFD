import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { waitForCondition } from '../../scripts/e2e/dom-wait.mjs';
import { captureFailureScreenshot } from '../../scripts/e2e/screenshot-on-failure.mjs';
import { getSelector, hasSelector, SELECTOR_MAP } from '../../scripts/e2e/selector-map.mjs';

describe('e2e helper modules', () => {
  it('exposes stable selector map entries', () => {
    expect(getSelector('tabList')).toBe('[role="tablist"]');
    expect(hasSelector('panelPlay')).toBe(true);
    expect(hasSelector('missing')).toBe(false);
    expect(typeof SELECTOR_MAP.playOpenDirect).toBe('string');
  });

  it('waitForCondition returns ok=true when predicate eventually passes', async () => {
    var count = 0;
    var out = await waitForCondition(async function () {
      count += 1;
      return count > 2;
    }, { timeoutMs: 500, intervalMs: 5 });

    expect(out.ok).toBe(true);
    expect(out.value).toBe(true);
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('waitForCondition returns ok=false on timeout', async () => {
    var out = await waitForCondition(async function () {
      return false;
    }, { timeoutMs: 25, intervalMs: 5 });

    expect(out.ok).toBe(false);
    expect(out.value).toBeNull();
  });

  it('captureFailureScreenshot skips cleanly without browser page object', async () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-e2e-shot-'));
    var out = await captureFailureScreenshot(null, root, 'failure');
    expect(out.ok).toBe(false);
    expect(out.skipped).toBe(true);
    expect(out.reason).toContain('unavailable');
  });
});
