# Mr. Football Dynasty

A browser-based football franchise management simulation with deep roster, salary cap, coaching, narrative, and dynasty play. Built with TypeScript, React, and a seeded simulation engine.

## Play Now

**[Play Mr. Football Dynasty](https://kevinbigham.github.io/MFD/)**

> **First time?** To enable deployment: Go to [repo Settings > Pages](https://github.com/KevinBigham/MFD/settings/pages) and set Source to **GitHub Actions**.

## What Is This?

MFD is a franchise sim where you manage every aspect of a football team across multiple seasons:

- **Draft & develop** players with 28 position archetypes and archetype-driven progression
- **Manage the salary cap** with restructures, extensions, void years, and franchise tags
- **Coach your team** with coordinators, position coaches, and scheme chemistry
- **Game day decisions** with weekly prep plans, game plans, and snap management
- **Watch the action** with play-by-play broadcasts, game flow analysis, and film room review
- **Build a dynasty** across seasons with legacy tracking, Hall of Fame, and franchise legends
- **Navigate the league** with CBA negotiations, commissioner votes, expansion drafts, and relocations

55+ screens, 830+ tests, 120+ engine systems. Entirely client-side with no server required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Engine | TypeScript (pure, no DOM/React dependencies) |
| UI | React 19 + TanStack Router + Zustand |
| Design | 8-Bit ESPN pixel art system (Press Start 2P + Bebas Neue + JetBrains Mono) |
| Build | Vite 6 + pnpm monorepo |
| Testing | Vitest + React Testing Library |
| Storage | IndexedDB (Dexie) for saves, fully offline |
| Deploy | GitHub Pages via GitHub Actions |

## Local Development

```bash
# Prerequisites: Node.js 20+, pnpm 9+

# Clone and install
git clone git@github.com:KevinBigham/MFD.git
cd MFD/mfd
pnpm install

# Development
pnpm dev              # Start dev server
pnpm test             # Run all tests
pnpm typecheck        # TypeScript strict check
pnpm build            # Production build

# Package-specific
pnpm --filter @mfd/engine test    # Engine tests only
pnpm --filter @mfd/web test      # Web tests only
pnpm --filter @mfd/web build     # Build web app
```

## Project Structure

```
mfd/
  packages/
    engine/        Game simulation engine (120+ systems, pure TypeScript)
    design-system/ 26 UI components (Pixel* + Mfd*)
  apps/
    web/           React web app (55+ screens)
```

## Sprint History

24 development sprints building from zero to a fully playable franchise sim. Key milestones:

| Sprint | Theme | Highlights |
|--------|-------|-----------|
| 0-4 | Foundation | Engine, types, config, roster, contracts |
| 5-11 | Opening Night | Full game sim, draft, free agency, season loop |
| 12 | Hall of Champions | Awards, HOF, ceremonies |
| 13 | The War Room | Draft board, trade evaluation |
| 14 | Scout Report | Scouting staff, prospect evaluation |
| 15 | Coach's Corner | Coaching market, skill trees |
| 16 | Advanced Scouting | Regions, combine, pro days |
| 17 | Prime Time | Broadcast engine, social feed, story arcs |
| 18 | The Franchise | Identity, stadiums, endorsements, relocation |
| 19 | Under the Helmet | Hooks engine, dynasty cartridge, narrative |
| 20 | The Commissioner | CBA, labor relations, league governance |
| 21 | The Historian | Records, milestones, franchise legends |
| 22 | The Big Stage | Atmosphere, Super Bowl, regional weather |
| 23 | The Specialist | Archetype progression, position coaches |
| 24 | The Broadcast Booth | Play-by-play viewer, game flow, snap counts, deploy |

## License

Private project by Kevin Bigham.
