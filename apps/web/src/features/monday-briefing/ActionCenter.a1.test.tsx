/**
 * A1 regression guard for the weekly board.
 *
 * Amendment A1 pins the legacy shell's rendered output for the whole
 * migration. `docs/ui-overhaul/evidence/a1-regression/wp09b-agm-fold-in.json`
 * records the sha256 of `ActionCenter`'s markup across five seeded scenarios,
 * captured on `main` (7577176) and again after the AGM lane moved into the
 * canonical task ledger — identical in all five.
 *
 * That file was a one-off artifact nobody could re-derive. This test renders
 * the same five scenarios and checks the hashes still match, which turns the
 * evidence into a standing gate: any future change to the board's rendered
 * markup fails here and points at the A1 claim it breaks.
 *
 * If a change to the board is intentional and approved, re-capture with
 * `MFD_WRITE_A1_EVIDENCE=1` and say so in the progress ledger. Do not delete
 * this test to make it pass.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getAGMWeeklyRecommendations, type GameState } from '@mfd/engine';
import { createSeedGameState } from '../../app/store/seed';
import { UI_FIXTURE_SEED } from '../../ui/test/fixtures/ui-overhaul-fixtures';
import { ActionCenter } from './ActionCenter';

const EVIDENCE = new URL(
  '../../../../../docs/ui-overhaul/evidence/a1-regression/wp09b-agm-fold-in.json',
  import.meta.url,
);

type BoardProps = Parameters<typeof ActionCenter>[0];

interface Scenario {
  name: string;
  props: Omit<BoardProps, 'game'>;
  mutate: (game: GameState) => GameState;
}

function userTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser)!;
}

const HEALTHY: Omit<BoardProps, 'game'> = {
  phase: 'regular_season',
  hasGamePlan: true,
  starterCount: 22,
  tradeOfferCount: 0,
  ownerApproval: 80,
  injuredCount: 0,
};

/**
 * Chosen to reach every AGM priority the engine can emit. `low` is absent
 * because no branch in `packages/engine/src/systems/agm.ts` produces it — that
 * arm of the legacy deadline copy has always been unreachable.
 */
const SCENARIOS: Scenario[] = [
  { name: 'clear', props: HEALTHY, mutate: (game) => game },
  {
    name: 'blocked',
    props: { phase: 'regular_season', hasGamePlan: false, starterCount: 12, tradeOfferCount: 2, ownerApproval: 30, injuredCount: 4 },
    mutate: (game) => game,
  },
  {
    name: 'overcap',
    props: HEALTHY,
    mutate: (game) => {
      userTeam(game).capSpace = -5_000_000;
      return game;
    },
  },
  {
    name: 'injured',
    props: { ...HEALTHY, injuredCount: 3 },
    mutate: (game) => {
      for (const player of userTeam(game).roster.slice(0, 3)) {
        player.injury = { type: 'knee', gamesOut: 4, severity: 'moderate' } as never;
        game.players[player.id]!.injury = player.injury;
      }
      return game;
    },
  },
  {
    name: 'playoffs',
    props: { phase: 'playoffs', hasGamePlan: false, starterCount: 22, tradeOfferCount: 0, ownerApproval: 55, injuredCount: 0 },
    mutate: (game) => {
      game.phase = 'playoffs';
      game.week = 19;
      return game;
    },
  },
];

function renderScenario(scenario: Scenario) {
  const game = scenario.mutate(createSeedGameState(UI_FIXTURE_SEED, 0, 'pro'));
  return {
    html: renderToStaticMarkup(<ActionCenter {...scenario.props} game={game} />),
    recommendations: getAGMWeeklyRecommendations(game, 3).map((entry) => [entry.id, entry.priority]),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('A1 — weekly board rendered output', () => {
  const evidence = JSON.parse(readFileSync(EVIDENCE, 'utf8')) as {
    fixtureSeed: number;
    result: string;
    scenarios: Record<string, { bytes: number; sha256Main: string; sha256Head: string; recommendations: string[][] }>;
  };

  it('uses the seed the evidence was captured at', () => {
    expect(evidence.fixtureSeed).toBe(UI_FIXTURE_SEED);
    expect(evidence.result).toBe('IDENTICAL');
    expect(Object.keys(evidence.scenarios).sort()).toEqual(SCENARIOS.map((s) => s.name).sort());
  });

  it('still renders byte-for-byte what main rendered', () => {
    const rebuilt: Record<string, unknown> = {};

    for (const scenario of SCENARIOS) {
      const { html, recommendations } = renderScenario(scenario);
      const recorded = evidence.scenarios[scenario.name]!;

      rebuilt[scenario.name] = {
        ...recorded,
        bytes: Buffer.byteLength(html),
        sha256Head: sha256(html),
        recommendations,
      };

      if (process.env.MFD_WRITE_A1_EVIDENCE) continue;

      expect(sha256(html), `${scenario.name} markup`).toBe(recorded.sha256Main);
      expect(Buffer.byteLength(html), `${scenario.name} bytes`).toBe(recorded.bytes);
      expect(recommendations, `${scenario.name} recommendations`).toEqual(recorded.recommendations);
    }

    if (process.env.MFD_WRITE_A1_EVIDENCE) {
      writeFileSync(EVIDENCE, `${JSON.stringify({ ...evidence, scenarios: rebuilt }, null, 2)}\n`, 'utf8');
    }
  });

  it('reaches urgent, high and medium recommendations across the five scenarios', () => {
    const priorities = new Set(
      SCENARIOS.flatMap((scenario) => renderScenario(scenario).recommendations.map(([, priority]) => priority)),
    );
    expect([...priorities].sort()).toEqual(['high', 'medium', 'urgent']);
  });
});
