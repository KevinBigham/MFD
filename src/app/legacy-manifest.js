export var LEGACY_MANIFEST = Object.freeze({
  version: 'v100',
  assetVersion: '20260315c',
  entry: 'legacy/index.html',
  files: Object.freeze([
    'legacy/game.js',
    'legacy/react.min.js',
    'legacy/react-dom.min.js',
  ]),
});

export function getLegacyRequiredFiles(manifest) {
  var m = manifest || LEGACY_MANIFEST;
  var files = [];
  if (m && typeof m.entry === 'string' && m.entry.length > 0) {
    files.push(m.entry);
  }
  if (m && Array.isArray(m.files)) {
    m.files.forEach(function (file) {
      if (typeof file === 'string' && file.length > 0) {
        files.push(file);
      }
    });
  }
  return Array.from(new Set(files));
}

export function validateLegacyManifest(manifest) {
  var errors = [];
  var m = manifest;

  if (!m || typeof m !== 'object') {
    errors.push('manifest must be an object');
  } else {
    if (typeof m.version !== 'string' || m.version.length === 0) {
      errors.push('manifest.version must be a non-empty string');
    }
    if (typeof m.assetVersion !== 'string' || m.assetVersion.length === 0) {
      errors.push('manifest.assetVersion must be a non-empty string');
    }
    if (typeof m.entry !== 'string' || m.entry.length === 0) {
      errors.push('manifest.entry must be a non-empty string');
    }
    if (!Array.isArray(m.files) || m.files.length === 0) {
      errors.push('manifest.files must be a non-empty array');
    } else {
      m.files.forEach(function (file, idx) {
        if (typeof file !== 'string' || file.length === 0) {
          errors.push('manifest.files[' + idx + '] must be a non-empty string');
        }
      });
    }
  }

  var requiredFiles = getLegacyRequiredFiles(m || {});
  requiredFiles.forEach(function (file) {
    if (file.indexOf('legacy/') !== 0) {
      errors.push('legacy file path must start with legacy/: ' + file);
    }
  });

  return {
    ok: errors.length === 0,
    errors: errors,
  };
}
