/**
 * Builds the Week 14 convention save as cartridge text for browser smokes.
 *
 * The front page no longer has a demo button, so smokes load this save through the
 * normal "Paste backup code" import. Engine source is TypeScript, so it is loaded
 * through Vite's SSR loader (Vite is already a dependency of apps/web).
 *
 * By hand: `node scripts/convention-cartridge.mjs > week14.mfd`, then paste the file's text
 * into "Import Backup Code" on the title screen (or use Advanced: Upload .mfd).
 */
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CONVENTION_SMOKE_SEED = 20261001;
export const CONVENTION_SMOKE_TEAM_ID = 'afce1';
export const CONVENTION_SMOKE_WEEK = 14;

export async function buildConventionCartridgeText({ webDir, seed = Number(process.env.SMOKE_CONVENTION_SEED) || CONVENTION_SMOKE_SEED } = {}) {
  if (!webDir) throw new Error('buildConventionCartridgeText needs webDir (apps/web).');
  const requireFromWeb = createRequire(join(webDir, 'package.json'));
  const viteDir = dirname(requireFromWeb.resolve('vite/package.json'));
  const { createServer } = await import(pathToFileURL(join(viteDir, 'dist/node/index.js')).href);
  const server = await createServer({
    root: webDir,
    configFile: join(webDir, 'vite.config.ts'),
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const engine = await server.ssrLoadModule('@mfd/engine');
    const game = engine.generateConventionSave(CONVENTION_SMOKE_TEAM_ID, engine.mulberry32(seed));
    if (game.week !== CONVENTION_SMOKE_WEEK) {
      throw new Error(`Convention save is week ${game.week}; smokes expect week ${CONVENTION_SMOKE_WEEK}.`);
    }
    const built = engine.buildCartridge(game);
    if (!built.ok) throw new Error(`Could not build convention cartridge: ${built.error}`);
    return built.json;
  } finally {
    await server.close();
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web');
  process.stdout.write(await buildConventionCartridgeText({ webDir }));
}
