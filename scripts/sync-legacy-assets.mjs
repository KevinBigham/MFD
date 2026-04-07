import fs from 'node:fs';
import path from 'node:path';

import { getLegacyRequiredFiles, LEGACY_MANIFEST } from '../src/app/legacy-manifest.js';

export var DEFAULT_SOURCE_DIR = 'mr-football-dynasty';
export var DEFAULT_DEST_DIR = 'public/legacy';

function toLocalRelative(legacyPath) {
  return String(legacyPath || '').replace(/^legacy\//, '');
}

export function copyFileIfChanged(src, dst) {
  if (!fs.existsSync(src)) {
    return { copied: false, skipped: false, missing: true };
  }

  var srcBuf = fs.readFileSync(src);
  if (fs.existsSync(dst)) {
    var dstBuf = fs.readFileSync(dst);
    if (Buffer.compare(srcBuf, dstBuf) === 0) {
      return { copied: false, skipped: true, missing: false };
    }
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, srcBuf);
  return { copied: true, skipped: false, missing: false };
}

export function syncLegacyAssets(opts) {
  var options = opts || {};
  var cwd = options.cwd || process.cwd();
  var sourceDir = path.resolve(cwd, options.sourceDir || DEFAULT_SOURCE_DIR);
  var destDir = path.resolve(cwd, options.destDir || DEFAULT_DEST_DIR);
  var required = getLegacyRequiredFiles(options.manifest || LEGACY_MANIFEST);

  var copied = [];
  var skipped = [];
  var missing = [];

  required.forEach(function (legacyPath) {
    var local = toLocalRelative(legacyPath);
    var src = path.resolve(sourceDir, local);
    var dst = path.resolve(destDir, local);
    var out = copyFileIfChanged(src, dst);
    if (out.copied) copied.push(legacyPath);
    if (out.skipped) skipped.push(legacyPath);
    if (out.missing) missing.push(legacyPath);
  });

  return {
    ok: missing.length === 0,
    copied: copied,
    skipped: skipped,
    missing: missing,
    sourceDir: sourceDir,
    destDir: destDir,
    expected: required,
  };
}

function main() {
  var out = syncLegacyAssets();
  if (!out.ok) {
    console.error('[sync-legacy-assets] missing source files:');
    out.missing.forEach(function (f) {
      console.error(' - ' + f);
    });
    process.exit(1);
  }
  console.log('[sync-legacy-assets] copied=' + out.copied.length + ', skipped=' + out.skipped.length);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
