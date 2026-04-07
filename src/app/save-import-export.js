import { buildSlotChecksum, loadSlot, saveSlot } from './save-slots-store.js';
import { verifyAutosavePayload } from './legacy-save-api.js';

export var SAVE_IMPORT_EXPORT_SCHEMA = 'mfd-save-slot.v1';
export var MAX_IMPORT_BYTES = 1024 * 1024 * 2;

function toJsonText(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    try {
      return JSON.stringify(input);
    } catch (_err) {
      return '';
    }
  }
  return '';
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    return null;
  }
}

function normalizeSlotId(slotId) {
  return String(slotId || '').trim();
}

export function mapImportExportError(code) {
  var key = String(code || 'unknown');
  var map = {
    empty_input: 'Import payload was empty.',
    invalid_json: 'Import payload is not valid JSON.',
    invalid_schema: 'Import payload schema is invalid.',
    invalid_payload: 'Import payload data is invalid.',
    checksum_mismatch: 'Import checksum verification failed.',
    payload_too_large: 'Import payload exceeds size limit.',
    slot_save_failed: 'Could not write imported slot to storage.',
  };
  return map[key] || 'Import failed due to an unknown error.';
}

export function validateImportPayload(input) {
  var text = toJsonText(input).trim();
  if (!text) {
    return { ok: false, code: 'empty_input', error: mapImportExportError('empty_input') };
  }

  var bytes = text.length;
  if (bytes > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      code: 'payload_too_large',
      error: mapImportExportError('payload_too_large'),
      bytes: bytes,
      maxBytes: MAX_IMPORT_BYTES,
    };
  }

  var parsed = safeParse(text);
  if (!parsed) {
    return { ok: false, code: 'invalid_json', error: mapImportExportError('invalid_json') };
  }

  if (parsed.schemaVersion !== SAVE_IMPORT_EXPORT_SCHEMA || !parsed.slot || typeof parsed.slot !== 'object') {
    return { ok: false, code: 'invalid_schema', error: mapImportExportError('invalid_schema') };
  }

  var slotId = normalizeSlotId(parsed.slot.slotId);
  var payload = parsed.slot.payload;
  var meta = parsed.slot.meta && typeof parsed.slot.meta === 'object' ? parsed.slot.meta : {};

  var payloadCheck = verifyAutosavePayload(payload);
  if (!payloadCheck.ok) {
    return {
      ok: false,
      code: 'invalid_payload',
      error: mapImportExportError('invalid_payload'),
      details: payloadCheck.errors,
    };
  }

  var expectedChecksum = buildSlotChecksum(payload);
  if (parsed.slot.checksum && parsed.slot.checksum !== expectedChecksum) {
    return {
      ok: false,
      code: 'checksum_mismatch',
      error: mapImportExportError('checksum_mismatch'),
      checksum: parsed.slot.checksum,
      expectedChecksum: expectedChecksum,
    };
  }

  return {
    ok: true,
    code: '',
    error: '',
    bytes: bytes,
    normalized: {
      schemaVersion: SAVE_IMPORT_EXPORT_SCHEMA,
      slot: {
        slotId: slotId,
        payload: payload,
        meta: meta,
        checksum: expectedChecksum,
      },
    },
  };
}

export function exportSlotToFile(slotId, options) {
  var opts = options || {};
  var loaded = loadSlot(slotId, opts);
  if (!loaded.ok) {
    return {
      ok: false,
      code: 'invalid_payload',
      error: loaded.error,
    };
  }

  var envelope = {
    schemaVersion: SAVE_IMPORT_EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    slot: {
      slotId: loaded.slot.slotId,
      meta: loaded.slot.meta || {},
      payload: loaded.slot.payload,
      checksum: loaded.slot.checksum || buildSlotChecksum(loaded.slot.payload),
    },
  };

  var text = JSON.stringify(envelope, null, 2) + '\n';
  return {
    ok: true,
    code: '',
    error: '',
    fileName: 'mfd-slot-' + loaded.slot.slotId + '.json',
    mimeType: 'application/json',
    bytes: text.length,
    text: text,
    envelope: envelope,
  };
}

export function importSlotFromPayload(input, options) {
  var opts = options || {};
  var validated = validateImportPayload(input);
  if (!validated.ok) return validated;

  var normalized = validated.normalized;
  var slot = normalized.slot;
  var save = saveSlot(slot.slotId, slot.payload, slot.meta, {
    storage: opts.storage,
    now: opts.now,
    allowOverwrite: opts.allowOverwrite !== false,
  });

  if (!save.ok) {
    return {
      ok: false,
      code: 'slot_save_failed',
      error: mapImportExportError('slot_save_failed') + ' ' + save.error,
      saveResult: save,
    };
  }

  return {
    ok: true,
    code: '',
    error: '',
    slotId: slot.slotId,
    checksum: slot.checksum,
    saveResult: save,
  };
}
