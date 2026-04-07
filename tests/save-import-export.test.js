import { describe, expect, it } from 'vitest';

import {
  exportSlotToFile,
  importSlotFromPayload,
  mapImportExportError,
  SAVE_IMPORT_EXPORT_SCHEMA,
  validateImportPayload,
} from '../src/app/save-import-export.js';
import { loadSlot, saveSlot } from '../src/app/save-slots-store.js';

function createMemoryStorage() {
  var data = {};
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); },
    removeItem: function (key) { delete data[key]; },
  };
}

describe('save-import-export', () => {
  it('exports existing slot to deterministic envelope', () => {
    var storage = createMemoryStorage();
    var wrote = saveSlot('alpha', { season: 2 }, { label: 'Alpha' }, { storage: storage, now: 123 });
    expect(wrote.ok).toBe(true);

    var out = exportSlotToFile('alpha', { storage: storage });
    expect(out.ok).toBe(true);
    expect(out.envelope.schemaVersion).toBe(SAVE_IMPORT_EXPORT_SCHEMA);
    expect(out.envelope.slot.slotId).toBe('alpha');
    expect(out.fileName).toBe('mfd-slot-alpha.json');
    expect(out.text).toContain('"schemaVersion"');
  });

  it('validates import payload and rejects checksum mismatch', () => {
    var valid = validateImportPayload({
      schemaVersion: SAVE_IMPORT_EXPORT_SCHEMA,
      slot: {
        slotId: 'beta',
        payload: { season: 3 },
      },
    });
    expect(valid.ok).toBe(true);

    var broken = validateImportPayload({
      schemaVersion: SAVE_IMPORT_EXPORT_SCHEMA,
      slot: {
        slotId: 'beta',
        payload: { season: 3 },
        checksum: 'bad',
      },
    });
    expect(broken.ok).toBe(false);
    expect(broken.code).toBe('checksum_mismatch');
  });

  it('imports payload and writes slot via save-slots store', () => {
    var storage = createMemoryStorage();
    var imported = importSlotFromPayload({
      schemaVersion: SAVE_IMPORT_EXPORT_SCHEMA,
      slot: {
        slotId: 'gamma',
        payload: { season: 4 },
        meta: { note: 'imported' },
      },
    }, {
      storage: storage,
      now: 200,
      allowOverwrite: true,
    });

    expect(imported.ok).toBe(true);
    var loaded = loadSlot('gamma', { storage: storage });
    expect(loaded.ok).toBe(true);
    expect(loaded.slot.payload).toEqual({ season: 4 });
  });

  it('maps error codes to UI-safe text', () => {
    expect(mapImportExportError('invalid_json')).toContain('valid JSON');
    expect(mapImportExportError('unknown-code')).toContain('unknown');
  });
});
