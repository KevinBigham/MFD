import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_ROOT = process.cwd().endsWith('/apps/web') ? '.' : 'apps/web';
const ROOTS = [
  join(WEB_ROOT, 'src/features'),
  join(WEB_ROOT, 'src/app/NewGameScreen.tsx'),
];

const RETIRED_PLAYER_FACING_TERMS = [
  /simulate games/i,
  /touch RNG/i,
  /run sim\/RNG/i,
  /run simulation/i,
  /run\s+simulation/i,
  /run sim, touch RNG/i,
  /mutate saves/i,
  /touch saves/i,
  /advance weeks/i,
  /does not advance the week/i,
  /touch Math\.random/i,
  /\bsim\/RNG\b/i,
  /\bsim, RNG\b/i,
  /RNG penalty/i,
  /sim math, RNG/i,
  /simulation results, RNG/i,
  /mutate GameState/i,
  /mutate saved results/i,
  /mutate proposals/i,
  /mutate broadcasts/i,
  /mutate the live save/i,
  /mutate players/i,
  /mutate the sidecar/i,
  /mutate intel/i,
  /Route-local receipt/i,
  /Render boundary/i,
  /Rendering this route/i,
  /Rendering this panel/i,
  /Rendering this recap/i,
  /Rendering the ticker/i,
  /Rendering this receipt/i,
  /Commit path/i,
  /State touched/i,
  /No extra write/i,
  /durable receipt history/i,
  /saved receipt ledger/i,
  /\ba on-screen confirmation/i,
  /Action useds/i,
];

function collectProductionSources(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];

  return readdirSync(path)
    .flatMap((entry) => collectProductionSources(join(path, entry)))
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !/\.(test|spec)\.(ts|tsx)$/.test(file));
}

describe('player-facing boundary copy', () => {
  it('keeps visible helper/source copy free of retired sim/RNG jargon', () => {
    const offenders = ROOTS
      .flatMap(collectProductionSources)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        return RETIRED_PLAYER_FACING_TERMS
          .filter((pattern) => pattern.test(source))
          .map((pattern) => `${file}: ${pattern}`);
      });

    expect(offenders).toEqual([]);
  });
});
