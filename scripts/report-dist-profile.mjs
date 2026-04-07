import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

import { extractModulePreloadHrefs } from './check-preloads.mjs';

export function sizeOf(filepath) {
  var raw = fs.readFileSync(filepath);
  return {
    bytes: raw.length,
    gzipBytes: zlib.gzipSync(raw).length,
  };
}

export function listAssetFiles(assetsDir) {
  if (!fs.existsSync(assetsDir)) return [];
  return fs.readdirSync(assetsDir).filter(function (f) {
    return f.endsWith('.js') || f.endsWith('.css');
  }).sort();
}

export function buildProfile(distDir) {
  var indexPath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found. Run `npm run build` first.');
  }

  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var assetsDir = path.resolve(distDir, 'assets');
  var files = listAssetFiles(assetsDir).map(function (file) {
    var filepath = path.resolve(assetsDir, file);
    var sz = sizeOf(filepath);
    return {
      file: file,
      bytes: sz.bytes,
      gzipBytes: sz.gzipBytes,
    };
  }).sort(function (a, b) {
    return b.bytes - a.bytes;
  });

  var indexSize = sizeOf(indexPath);
  return {
    generatedAt: new Date().toISOString(),
    distDir: distDir,
    index: {
      file: 'index.html',
      bytes: indexSize.bytes,
      gzipBytes: indexSize.gzipBytes,
      modulePreloads: extractModulePreloadHrefs(indexHtml),
      modulePreloadsCount: extractModulePreloadHrefs(indexHtml).length,
    },
    assets: files,
    topAssets: files.slice(0, 5).map(function (asset) {
      return {
        file: asset.file,
        bytes: asset.bytes,
        gzipBytes: asset.gzipBytes,
      };
    }),
  };
}

export function run() {
  var distDir = path.resolve(process.cwd(), 'dist');
  var profile = buildProfile(distDir);
  var outPath = path.resolve(distDir, 'perf-profile.json');
  fs.writeFileSync(outPath, JSON.stringify(profile, null, 2) + '\n');

  console.log('[dist-profile] wrote ' + outPath);
  console.log('[dist-profile] index: ' + profile.index.bytes + ' bytes (' + profile.index.gzipBytes + ' gzip)');
  console.log('[dist-profile] assets: ' + profile.assets.length + ' files');
}

var isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  run();
}
