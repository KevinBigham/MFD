import { describe, expect, it } from 'vitest';

import { readAutosavePayload, writeAutosavePayload } from '../src/app/legacy-save-api.js';
import { loadSlot, saveSlot } from '../src/app/save-slots-store.js';

function createMemoryStorage() {
  var data = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) {
      data[key] = String(value);
    },
    removeItem: function (key) {
      delete data[key];
    },
  };
}

describe('save/load compatibility', () => {
  it('preserves legacy-style payloads with unknown fields through slot save/load', () => {
    var storage = createMemoryStorage();
    var legacyPayload = {
      saveVersion: 88,
      season: { year: 2030, week: 6 },
      teams: [{ id: 'AAA', wins: 4, losses: 2 }],
      myId: 'AAA',
      legacyUnknownBlock: { oldKey: 'still-here', nested: [1, 2, 3] },
    };

    var save = saveSlot('legacy-slot', legacyPayload, { label: 'Legacy' }, { storage: storage });
    expect(save.ok).toBe(true);

    var loaded = loadSlot('legacy-slot', { storage: storage });
    expect(loaded.ok).toBe(true);
    expect(loaded.slot.payload.saveVersion).toBe(88);
    expect(loaded.slot.payload.legacyUnknownBlock.oldKey).toBe('still-here');
    expect(Array.isArray(loaded.slot.payload.legacyUnknownBlock.nested)).toBe(true);
  });

  it('writes and reads autosave payload via localStorage fallback', async () => {
    var storage = createMemoryStorage();
    var payload = {
      saveVersion: 100,
      season: { year: 2033, week: 12 },
      teams: [{ id: 'ABC', wins: 9, losses: 3 }],
      myId: 'ABC',
      oldArchivePointer: 'vault-v2',
    };

    var wrote = await writeAutosavePayload(payload, { storage: storage, dbAdapter: { open: () => null } });
    expect(wrote.ok).toBe(true);
    expect(wrote.writtenTo).toContain('localStorage');

    var read = await readAutosavePayload({ storage: storage, dbAdapter: { open: () => null } });
    expect(read.ok).toBe(true);
    expect(read.source).toBe('localStorage');
    expect(read.payload.saveVersion).toBe(100);
    expect(read.payload.oldArchivePointer).toBe('vault-v2');
  });
});
