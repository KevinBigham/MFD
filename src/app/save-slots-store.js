import { checksumString, verifyAutosavePayload } from './legacy-save-api.js';
import { PREMIUM } from '../systems/premium.js';

export var SAVE_SLOTS_KEY = 'mfd.saveSlots.v1';

function getStorage(input) {
  if (input && input.storage) return input.storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function safeWrite(storage, value) {
  storage.setItem(SAVE_SLOTS_KEY, JSON.stringify(value));
}

function normalizeSlotId(slotId) {
  return String(slotId || '').trim();
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  return Object.assign({}, meta);
}

function readAllSlots(input) {
  var storage = getStorage(input);
  if (!storage) return [];
  var raw = storage.getItem(SAVE_SLOTS_KEY);
  if (!raw) return [];
  var parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(function (slot) {
    return slot && typeof slot === 'object' && typeof slot.slotId === 'string';
  });
}

function writeAllSlots(slots, input) {
  var storage = getStorage(input);
  if (!storage) return false;
  safeWrite(storage, slots);
  return true;
}

function sortSlots(slots) {
  return slots.slice().sort(function (a, b) {
    var aTime = Number(a.updatedAt || 0);
    var bTime = Number(b.updatedAt || 0);
    if (aTime !== bTime) return bTime - aTime;
    return String(a.slotId).localeCompare(String(b.slotId));
  });
}

export function buildSlotChecksum(payload) {
  return checksumString(JSON.stringify(payload || {}));
}

export function listSlots(input) {
  return sortSlots(readAllSlots(input)).filter(function (slot) {
    return !slot.deletedAt;
  }).map(function (slot) {
    return {
      slotId: slot.slotId,
      createdAt: slot.createdAt || 0,
      updatedAt: slot.updatedAt || 0,
      meta: normalizeMeta(slot.meta),
      checksum: slot.checksum || '',
    };
  });
}

export function saveSlot(slotId, payload, meta, input) {
  var options = input || {};
  var id = normalizeSlotId(slotId);
  if (!id) return { ok: false, error: 'slotId is required' };

  var verification = verifyAutosavePayload(payload);
  if (!verification.ok) return { ok: false, error: verification.errors.join('; ') };

  var now = Number(options.now || Date.now());
  var all = readAllSlots(options);
  var existing = all.find(function (slot) { return slot.slotId === id; });
  var activeSlots = all.filter(function (slot) {
    return !slot.deletedAt;
  });
  var slotLimit = PREMIUM.getSaveSlotCount();
  if (!existing && activeSlots.length >= slotLimit) {
    return { ok: false, error: 'slot limit reached', limit: slotLimit };
  }
  if (existing && !options.allowOverwrite) {
    return { ok: false, error: 'slot already exists', requireConfirm: true };
  }

  var next = all.filter(function (slot) { return slot.slotId !== id; });
  var createdAt = existing ? Number(existing.createdAt || now) : now;
  var slot = {
    slotId: id,
    createdAt: createdAt,
    updatedAt: now,
    meta: normalizeMeta(meta),
    payload: payload,
    checksum: buildSlotChecksum(payload),
  };
  next.push(slot);
  var written = writeAllSlots(next, options);
  if (!written) return { ok: false, error: 'storage unavailable' };
  return { ok: true, slot: slot };
}

export function loadSlot(slotId, input) {
  var id = normalizeSlotId(slotId);
  if (!id) return { ok: false, error: 'slotId is required' };
  var all = readAllSlots(input);
  var slot = all.find(function (row) { return row.slotId === id && !row.deletedAt; });
  if (!slot) return { ok: false, error: 'slot not found' };
  var verification = verifyAutosavePayload(slot.payload);
  if (!verification.ok) return { ok: false, error: verification.errors.join('; ') };

  var checksum = buildSlotChecksum(slot.payload);
  if (slot.checksum && slot.checksum !== checksum) {
    return { ok: false, error: 'checksum mismatch', checksum: slot.checksum, expectedChecksum: checksum };
  }

  return {
    ok: true,
    slot: {
      slotId: slot.slotId,
      createdAt: slot.createdAt || 0,
      updatedAt: slot.updatedAt || 0,
      meta: normalizeMeta(slot.meta),
      payload: slot.payload,
      checksum: checksum,
    },
  };
}

export function deleteSlot(slotId, input) {
  var options = input || {};
  var id = normalizeSlotId(slotId);
  if (!id) return { ok: false, error: 'slotId is required' };
  var all = readAllSlots(options);
  var idx = all.findIndex(function (slot) { return slot.slotId === id; });
  if (idx < 0) return { ok: false, error: 'slot not found' };

  var softDelete = options.softDelete !== false;
  if (softDelete) {
    all[idx] = Object.assign({}, all[idx], {
      deletedAt: Number(options.now || Date.now()),
      updatedAt: Number(options.now || Date.now()),
    });
  } else {
    all.splice(idx, 1);
  }

  var written = writeAllSlots(all, options);
  if (!written) return { ok: false, error: 'storage unavailable' };
  return { ok: true, softDelete: softDelete };
}
