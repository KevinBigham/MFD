import { BOOT_MODES, parseBootMode } from './boot-mode.js';

export function normalizeBasePath(basePath) {
  var base = String(basePath || '/').trim();
  if (!base) return '/';
  if (base.charAt(0) !== '/') {
    base = '/' + base;
  }
  if (base.charAt(base.length - 1) !== '/') {
    base += '/';
  }
  return base;
}

export function sanitizeLegacyPath(inputPath) {
  var path = String(inputPath || 'legacy/index.html').trim();
  if (!path) return 'legacy/index.html';
  if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0 || path.indexOf('//') === 0) {
    return 'legacy/index.html';
  }
  path = path.replace(/^\/+/, '');
  if (path.indexOf('..') >= 0) {
    return 'legacy/index.html';
  }
  return path;
}

export function buildLegacyGameUrl(input) {
  var opts = input || {};
  var basePath = normalizeBasePath(opts.basePath || '/');
  var mode = parseBootMode(opts.mode) || BOOT_MODES.PLAY;
  var legacyPath = sanitizeLegacyPath(opts.legacyPath || 'legacy/index.html');
  var assetVersion = String(opts.assetVersion || '').trim();
  var query = ['mode=' + encodeURIComponent(mode)];
  if (assetVersion) {
    query.push('v=' + encodeURIComponent(assetVersion));
  }
  return basePath + legacyPath + '?' + query.join('&');
}
