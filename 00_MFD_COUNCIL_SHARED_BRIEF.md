# Shared Brief for the MFD AI Counsel of Friends

## Mission

Help transform **Mr. Football Dynasty** from a broad, technically disciplined browser franchise simulator into a legendary long-term dynasty game.

The audit conclusion is not that MFD lacks features. It already has a deterministic browser engine, a real weekly spine, deep contracts and cap systems, acquisitions, game simulation, offseason machinery, league governance, records, rivalries, Hall of Fame, coaching trees, and many history systems.

The central challenge is to turn that breadth into:

1. **Trust** — a player believes a 25- or 50-season dynasty will remain healthy, portable, and recoverable.
2. **Intelligence** — CPU teams appear to have coherent plans and explain their behavior through evidence and receipts.
3. **Consequence** — high-emotion choices visibly alter later outcomes.
4. **Memory** — the game turns accumulated state into recurring stories the player remembers.
5. **Clarity** — the player knows what matters this week without losing access to depth.

## Current high-confidence strengths

- Browser-only deterministic engine using seeded RNG.
- Real week-advance and offseason state-transition spines.
- Strong contract, cap, acquisition, CBA, and governance systems.
- Save version 36 with migrations, schema validation, IndexedDB slots, autosaves, and cartridge import/export.
- A local 35-step release gate that has passed end to end.
- Substantial dynasty-history raw material: records, awards, Hall of Fame, legends, named games, rivalries, bloodlines, eras, scrapbook, coaching tree, and franchise book surfaces.
- No audited system appeared completely fake or dead.

## Current high-confidence gaps

### Tier 0 — protect the dynasty

- Full release gate is not enforced in CI/deploy.
- No clean 25- or 50-year quality certificate.
- Draft war-room trade acceptance can desynchronize pick assets and draft order.
- Generated draft offers can reference assets that are not truly transferable.
- `.mfd` backups omit emotional browser-local sidecars.
- Several long-history save fields and game results remain permissively validated.

### Tier 1 — make existing play compound

- CPU strategy exists but lacks a durable player-facing intent history.
- Trick plays are planned but not consumed by the live simulation.
- Position coaches affect progression but lack a hiring/development lifecycle.
- Press conferences store quotes without meaningful downstream effects.
- Inbox read state is not durable.
- Formation-aware lineup validation is incomplete.
- Major actions do not share one consistent receipt contract.
- Existing progressive-nav metadata is not used to reduce overload.

### Tier 2 — turn data into obsession

- Dynasty memory is split among routes and sidecars.
- The game has lists and archives but does not consistently author era stories back to the player.
- Player arcs, grudges, agents, mentorships, injuries, playoff failures, and comeback seasons do not recur strongly enough at emotional moments.
- Direct-only history routes are easy to miss.

## Non-negotiable constraints

1. **Browser-only.** Do not assume a server, cloud account, or always-online architecture.
2. **Deterministic simulation.** No ambient `Math.random`. New stochastic behavior must use the established seeded RNG contract.
3. **Save compatibility.** Persistent state changes require types, schema, defaults/seeding, migration, old-save tests, and round-trip tests.
4. **Reuse before expansion.** Prefer connecting existing systems and routes over adding new standalone dashboards.
5. **One source of truth.** Avoid parallel state that can silently diverge.
6. **Visible causality.** Important decisions need an immediate receipt and a later callback.
7. **Long-horizon value.** Prefer features that become more valuable in Year 10 than in Week 1.
8. **Progressive clarity.** Reduce overload without permanently hiding advanced depth.
9. **Bounded effects.** Avoid opaque, unbounded modifiers that make the simulation impossible to reason about.
10. **Implementation honesty.** Separate verified codebase facts, inferences, and proposals.

## Anti-goals

Do not default to:

- another passive feed;
- another isolated meter or currency;
- another route whose only function is displaying existing data;
- cosmetic choices marketed as strategic;
- giant rewrites of the engine;
- nondeterministic generative content at runtime;
- a feature that creates a new save island;
- a plan that assumes unlimited content authoring;
- a roadmap with dozens of simultaneous initiatives.

## Definition of a complete gameplay slice

Every serious proposal must specify:

1. Player moment or CPU trigger.
2. Decision or policy.
3. State read.
4. State mutation.
5. Deterministic resolution rules.
6. Immediate receipt.
7. Later resurfacing/callback.
8. Save and migration impact.
9. Existing route and system integrations.
10. Unit, integration, browser, save, and long-horizon tests.
11. Acceptance metrics.
12. Rollback boundary.

## Proposal scoring

Score every proposal from 0 to 10 on:

- Player impact
- Trust improvement
- Intelligence/explainability
- Consequence strength
- Dynasty-memory compounding
- Reuse of existing systems
- Technical feasibility
- Deterministic testability
- Save/migration safety
- Cognitive-load effect

Also provide:

- complexity: S / M / L / XL;
- confidence: low / medium / high;
- recommended disposition: now / next / later / reject.

## Required evidence discipline

- Cite the audit filename and the source evidence quoted inside the audit whenever possible.
- Do not invent source paths or current behavior.
- Label external research separately from audit-grounded facts.
- Label assumptions.
- State what evidence would falsify the proposal.

## Standard deliverable format

Use `schemas/MFD_COUNCIL_PROPOSAL_SCHEMA.json` for structured proposals. When direct JSON output is impractical, preserve the same fields in Markdown.
