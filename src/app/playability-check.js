import {
  LEGACY_MANIFEST,
  getLegacyRequiredFiles,
  validateLegacyManifest,
} from './legacy-manifest.js';

export function normalizeLegacyAssetPath(filepath) {
  return String(filepath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

export function buildExpectedLegacyFiles(manifest) {
  return getLegacyRequiredFiles(manifest || LEGACY_MANIFEST).map(normalizeLegacyAssetPath);
}

export function normalizeBasePath(basePath) {
  var p = String(basePath || '/').trim();
  if (!p) return '/';
  if (p.charAt(0) !== '/') p = '/' + p;
  if (p.charAt(p.length - 1) !== '/') p += '/';
  return p;
}

export function createDefaultProbe(basePath) {
  var prefix = normalizeBasePath(basePath);
  return async function defaultProbe(pathname) {
    if (typeof fetch !== 'function') {
      return false;
    }
    try {
      var response = await fetch(prefix + normalizeLegacyAssetPath(pathname), { method: 'GET' });
      return !!(response && response.ok);
    } catch (_err) {
      return false;
    }
  };
}

export async function probeLegacyAssets(assetPaths, probeFn, basePath) {
  var probe = typeof probeFn === 'function' ? probeFn : createDefaultProbe(basePath);
  var checks = [];
  var missingFiles = [];

  for (var i = 0; i < (assetPaths || []).length; i += 1) {
    var path = normalizeLegacyAssetPath(assetPaths[i]);
    var pass = false;
    try {
      pass = !!(await probe(path));
    } catch (_err) {
      pass = false;
    }

    if (!pass) {
      missingFiles.push(path);
    }
    checks.push({ name: path, pass: pass });
  }

  return {
    ok: missingFiles.length === 0,
    missingFiles: missingFiles,
    checks: checks,
  };
}

export async function runPlayabilityCheck(manifest, probeFn, basePath) {
  var m = manifest || LEGACY_MANIFEST;
  var validation = validateLegacyManifest(m);
  if (!validation.ok) {
    return {
      ok: false,
      missingFiles: [],
      checks: [],
      errors: validation.errors,
    };
  }

  var expectedFiles = buildExpectedLegacyFiles(m);
  var result = await probeLegacyAssets(expectedFiles, probeFn, basePath);
  return {
    ok: result.ok,
    missingFiles: result.missingFiles,
    checks: result.checks,
    errors: [],
  };
}
