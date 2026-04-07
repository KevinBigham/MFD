import { describe, expect, it } from 'vitest';

import {
  buildSlotChecksum,
  deleteSlot,
  listSlots,
  loadSlot,
  saveSlot,
} from '../src/app/save-slots-store.js';

function createMemoryStorage() {
  var data = {};
  return {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); },
    removeItem: function (key) { delete data[key]; },
  };
}

describe('save-slots-store', () => {
  it('saves, lists, and loads slots ordered by recency', () => {
    var storage = createMemoryStorage();
    var slotA = saveSlot('slotA', { season: 1 }, { label: 'A' }, { storage: storage, now: 10 });
    var slotB = saveSlot('slotB', { season: 2 }, { label: 'B' }, { storage: storage, now: 20 });
    expect(slotA.ok).toBe(true);
    expect(slotB.ok).toBe(true);

    var listed = listSlots({ storage: storage });
    expect(listed.map(function (slot) { return slot.slotId; })).toEqual(['slotB', 'slotA']);

    var loaded = loadSlot('slotA', { storage: storage });
    expect(loaded.ok).toBe(true);
    expect(loaded.slot.payload).toEqual({ season: 1 });
    expect(loaded.slot.checksum).toBe(buildSlotChecksum({ season: 1 }));
  });

  it('requires explicit overwrite confirmation', () => {
    var storage = createMemoryStorage();
    saveSlot('slotA', { season: 1 }, {}, { storage: storage, now: 10 });
    var blocked = saveSlot('slotA', { season: 3 }, {}, { storage: storage, now: 11 });
    expect(blocked.ok).toBe(false);
    expect(blocked.requireConfirm).toBe(true);

    var overwritten = saveSlot('slotA', { season: 3 }, {}, { storage: storage, now: 12, allowOverwrite: true });
    expect(overwritten.ok).toBe(true);
    expect(loadSlot('slotA', { storage: storage }).slot.payload.season).toBe(3);
  });

  it('supports soft-delete and hard-delete flows', () => {
    var storage = createMemoryStorage();
    saveSlot('slotA', { season: 1 }, {}, { storage: storage, now: 10 });
    saveSlot('slotB', { season: 2 }, {}, { storage: storage, now: 11 });
    expect(deleteSlot('slotA', { storage: storage, now: 12 }).ok).toBe(true);
    expect(listSlots({ storage: storage }).map(function (slot) { return slot.slotId; })).toEqual(['slotB']);

    expect(deleteSlot('slotB', { storage: storage, softDelete: false }).ok).toBe(true);
    expect(listSlots({ storage: storage })).toEqual([]);
  });

  it('detects checksum mismatch on load', () => {
    var storage = createMemoryStorage();
    saveSlot('slotA', { season: 1 }, {}, { storage: storage, now: 10 });
    var raw = JSON.parse(storage.getItem('mfd.saveSlots.v1'));
    raw[0].checksum = 'bad';
    storage.setItem('mfd.saveSlots.v1', JSON.stringify(raw));
    var out = loadSlot('slotA', { storage: storage });
    expect(out.ok).toBe(false);
    expect(out.error).toContain('checksum mismatch');
  });
});
