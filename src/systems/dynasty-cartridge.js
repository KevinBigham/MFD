/**
 * Dynasty Cartridge — MFD Save Export/Import System
 *
 * Wraps existing LZW compression + save validation into a "cartridge"
 * format for clipboard sharing and .mfd file download.
 *
 * Two export formats:
 * 1. Text Cartridge: LZW-compressed Base64 string (clipboard-friendly)
 * 2. File Download: .mfd file (same data, downloadable)
 */
import { LZW } from '../utils/lzw.js';

var CARTRIDGE_VERSION = 'mfd-cartridge.v1';

/**
 * Build a cartridge envelope from raw save data.
 * @param {object} save - The full save state object
 * @param {object} meta - Optional metadata { teamName, season, week, record }
 * @returns {object} { envelope, json, base64 }
 */
export function buildCartridge(save, meta) {
  if (!save) return { ok: false, error: 'No save data provided.' };

  var envelope = {
    cartridgeVersion: CARTRIDGE_VERSION,
    exportedAt: new Date().toISOString(),
    meta: meta || {},
    save: save,
  };

  var json = JSON.stringify(envelope);
  var base64 = LZW.compressToBase64(json);

  return {
    ok: true,
    envelope: envelope,
    json: json,
    base64: base64,
    sizeBytes: json.length,
    compressedSize: base64.length,
    compressionRatio: Math.round((1 - base64.length / json.length) * 100),
  };
}

/**
 * Parse a cartridge from Base64 text string.
 * @param {string} text - Base64 cartridge string
 * @returns {object} { ok, save, meta, error }
 */
export function parseCartridge(text) {
  if (!text || !text.trim()) return { ok: false, error: 'Empty cartridge string.' };

  var trimmed = text.trim();

  // Try LZW-compressed Base64 first
  try {
    var raw = LZW.decompressFromBase64(trimmed);
    var data = JSON.parse(raw);
    if (data.cartridgeVersion === CARTRIDGE_VERSION && data.save) {
      return { ok: true, save: data.save, meta: data.meta || {}, version: data.cartridgeVersion };
    }
    // Fallback: legacy format { save, version, exported }
    if (data.save) {
      return { ok: true, save: data.save, meta: {}, version: 'legacy' };
    }
  } catch (_e) { /* try next format */ }

  // Try raw JSON
  try {
    var data2 = JSON.parse(trimmed);
    if (data2.cartridgeVersion === CARTRIDGE_VERSION && data2.save) {
      return { ok: true, save: data2.save, meta: data2.meta || {}, version: data2.cartridgeVersion };
    }
    if (data2.save) {
      return { ok: true, save: data2.save, meta: {}, version: 'legacy-json' };
    }
  } catch (_e2) { /* not JSON */ }

  return { ok: false, error: 'Could not decode cartridge. Check that you copied the full string.' };
}

/**
 * Parse a cartridge from a File object (.mfd or .json).
 * @param {File} file
 * @returns {Promise<object>} { ok, save, meta, error }
 */
export function parseCartridgeFile(file) {
  return new Promise(function (resolve) {
    if (!file) { resolve({ ok: false, error: 'No file provided.' }); return; }

    var reader = new FileReader();
    reader.onload = function (ev) {
      var text = ev.target.result;
      var result = parseCartridge(text);
      if (result.ok) {
        resolve(result);
      } else {
        // Try as raw JSON save (legacy .json format)
        try {
          var data = JSON.parse(text);
          if (data.save) {
            resolve({ ok: true, save: data.save, meta: {}, version: 'legacy-file' });
          } else {
            resolve({ ok: false, error: 'File does not contain valid save data.' });
          }
        } catch (_e) {
          resolve({ ok: false, error: 'Could not parse file. Is it a valid .mfd or .json save?' });
        }
      }
    };
    reader.onerror = function () { resolve({ ok: false, error: 'Failed to read file.' }); };
    reader.readAsText(file);
  });
}

/**
 * Download a cartridge as a .mfd file.
 * @param {object} save - The full save state
 * @param {object} meta - { teamName, season, week }
 */
export function downloadCartridge(save, meta) {
  var result = buildCartridge(save, meta);
  if (!result.ok) return result;

  var teamSlug = (meta && meta.teamName ? meta.teamName.replace(/[^a-zA-Z0-9]/g, '') : 'Dynasty');
  var seasonNum = (meta && meta.season) || '?';
  var weekNum = (meta && meta.week) || '?';
  var fileName = teamSlug + '-S' + seasonNum + '-W' + weekNum + '.mfd';

  var blob = new Blob([result.json], { type: 'application/octet-stream' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { ok: true, fileName: fileName, sizeBytes: result.sizeBytes };
}

/**
 * Copy a cartridge to clipboard as Base64 text.
 * @param {object} save - The full save state
 * @param {object} meta - { teamName, season, week }
 * @returns {Promise<object>} { ok, error, compressedSize }
 */
export function copyCartridgeToClipboard(save, meta) {
  var result = buildCartridge(save, meta);
  if (!result.ok) return Promise.resolve(result);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(result.base64).then(function () {
      return { ok: true, compressedSize: result.compressedSize, compressionRatio: result.compressionRatio };
    }).catch(function (e) {
      return { ok: false, error: 'Clipboard write failed: ' + e.message };
    });
  }

  // Fallback for older browsers
  try {
    var ta = document.createElement('textarea');
    ta.value = result.base64;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve({ ok: true, compressedSize: result.compressedSize, compressionRatio: result.compressionRatio });
  } catch (e) {
    return Promise.resolve({ ok: false, error: 'Copy failed: ' + e.message });
  }
}

/**
 * Check if a backup prompt should be shown.
 * @param {number} lastExportTime - timestamp of last export (0 if never)
 * @param {number} seasonsPlayed - total seasons in dynasty
 * @returns {boolean}
 */
export function shouldPromptBackup(lastExportTime, seasonsPlayed) {
  if (!lastExportTime || lastExportTime === 0) return seasonsPlayed >= 1;
  // Prompt if > 30 minutes since last export
  var elapsed = Date.now() - lastExportTime;
  return elapsed > 30 * 60 * 1000;
}

export var DYNASTY_CARTRIDGE = {
  build: buildCartridge,
  parse: parseCartridge,
  parseFile: parseCartridgeFile,
  download: downloadCartridge,
  copyToClipboard: copyCartridgeToClipboard,
  shouldPromptBackup: shouldPromptBackup,
  VERSION: CARTRIDGE_VERSION,
};
