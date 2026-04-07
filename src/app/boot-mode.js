export var BOOT_MODES = Object.freeze({
  PLAY: 'play',
  STATUS: 'status',
});

export function parseBootMode(input) {
  var value = String(input || '').trim().toLowerCase();
  if (value === BOOT_MODES.PLAY || value === BOOT_MODES.STATUS) {
    return value;
  }
  return '';
}

export function parseModeFromQuery(query) {
  if (!query) return '';
  try {
    var q = String(query);
    var search = q.charAt(0) === '?' ? q.slice(1) : q;
    var params = new URLSearchParams(search);
    return parseBootMode(params.get('mode'));
  } catch (_err) {
    return '';
  }
}

export function parseModeFromHash(hash) {
  if (!hash) return '';
  var value = String(hash).trim();
  if (value.charAt(0) === '#') {
    value = value.slice(1);
  }
  if (!value) return '';

  if (value.indexOf('mode=') === 0) {
    return parseBootMode(value.split('=').slice(1).join('='));
  }
  return parseBootMode(value);
}

export function resolveBootMode(input) {
  var opts = input || {};
  var queryMode = parseModeFromQuery(opts.query);
  if (queryMode) return queryMode;

  var hashMode = parseModeFromHash(opts.hash);
  if (hashMode) return hashMode;

  var storageMode = parseBootMode(opts.storageValue);
  if (storageMode) return storageMode;

  return parseBootMode(opts.defaultMode) || BOOT_MODES.STATUS;
}

export function detectForcedMode(input) {
  var opts = input || {};
  return parseModeFromQuery(opts.query) || parseModeFromHash(opts.hash) || '';
}
