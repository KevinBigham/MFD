import { BOOT_MODES, parseBootMode } from '../../src/app/boot-mode.js';
import { resolveModeRouting } from '../../src/app/mode-routing.js';

function normalizeBaseUrl(baseUrl) {
  var value = String(baseUrl || 'http://127.0.0.1:4173').trim();
  if (!value) return 'http://127.0.0.1:4173';
  if (value.charAt(value.length - 1) === '/') return value.slice(0, -1);
  return value;
}

function normalizeHash(mode) {
  var parsed = parseBootMode(mode);
  return parsed ? '#' + parsed : '';
}

export function buildRouteSeed(input) {
  var opts = input || {};
  var baseUrl = normalizeBaseUrl(opts.baseUrl);
  var queryMode = parseBootMode(opts.queryMode);
  var hashMode = parseBootMode(opts.hashMode);
  var storageValue = parseBootMode(opts.storageValue || '');

  var query = queryMode ? '?mode=' + queryMode : '';
  var hash = normalizeHash(hashMode);
  var routing = resolveModeRouting({
    query: query,
    hash: hash,
    storageValue: storageValue || '',
    defaultMode: BOOT_MODES.STATUS,
  });

  return {
    id: opts.id || 'route-seed',
    baseUrl: baseUrl,
    query: query,
    hash: hash,
    url: baseUrl + '/' + query + hash,
    expectedMode: routing.mode,
    forcedMode: routing.forcedMode,
    storageValue: storageValue || '',
  };
}

export function buildRouteSeedMatrix(baseUrl) {
  return [
    buildRouteSeed({ id: 'default', baseUrl: baseUrl }),
    buildRouteSeed({ id: 'query-play', baseUrl: baseUrl, queryMode: BOOT_MODES.PLAY }),
    buildRouteSeed({ id: 'query-status', baseUrl: baseUrl, queryMode: BOOT_MODES.STATUS }),
    buildRouteSeed({ id: 'hash-play', baseUrl: baseUrl, hashMode: BOOT_MODES.PLAY }),
    buildRouteSeed({ id: 'hash-status', baseUrl: baseUrl, hashMode: BOOT_MODES.STATUS }),
    buildRouteSeed({ id: 'storage-play', baseUrl: baseUrl, storageValue: BOOT_MODES.PLAY }),
    buildRouteSeed({ id: 'storage-status', baseUrl: baseUrl, storageValue: BOOT_MODES.STATUS }),
    buildRouteSeed({ id: 'query-invalid', baseUrl: baseUrl, storageValue: BOOT_MODES.PLAY }),
  ];
}
