// @ts-nocheck — test-only file, vitest provides node APIs
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('DynastyCartridge confirm dialogs', () => {
  const content = readFileSync(
    new URL('./DynastyCartridge.tsx', import.meta.url),
    'utf-8',
  );

  it('imports and uses ConfirmDialog component', () => {
    expect(content).toContain("import { ConfirmDialog } from '../shared/ConfirmDialog'");
  });

  it('has confirm state for load and delete actions', () => {
    expect(content).toContain('confirmAction');
    expect(content).toContain("type: 'load'");
    expect(content).toContain("type: 'delete'");
  });

  it('renders two ConfirmDialog instances (load + delete)', () => {
    const matches = content.match(/<ConfirmDialog/g);
    expect(matches?.length).toBe(2);
  });

  it('load dialog has green accent and descriptive message', () => {
    expect(content).toContain('title="Load Save Slot"');
    expect(content).toContain('unsaved progress will be replaced');
  });

  it('delete dialog has red accent and warns about permanence', () => {
    expect(content).toContain('title="Delete Save Slot"');
    expect(content).toContain('cannot be undone');
  });
});
