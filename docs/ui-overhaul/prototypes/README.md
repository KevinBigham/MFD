# MFD Weekly-Loop Reference Prototype

This is an **offline, non-production prototype** for the recommended first implementation slice:

```text
Monday Briefing / Today
  → Required depth decision
  → Required game-plan decision
  → Readiness checkpoint
  → Advance / result
```

It is deliberately disconnected from the MFD engine, store, persistence layer, saves, and RNG. Static sample data demonstrates the selected **Broadcast War Room** direction, the five-job navigation model, bounded task hierarchy, adaptive screen behavior, exact return-to-task flow, sticky actions, and the future Chip presentation.

## Open it

Open `index.html` in a current browser. It has no package, server, font, image, or network dependency.

A local server is optional:

```bash
cd docs/ui-overhaul/prototypes
python3 -m http.server 4173
```

Then visit `http://localhost:4173/`.

## Complete the flow

1. On **Today**, open **Set left tackle**.
2. Choose a replacement and save the depth chart.
3. Open the Denver game plan.
4. Choose an offensive identity and defensive priority; save.
5. Open **Review & play**.
6. Acknowledge the explicit matchup warning.
7. Select **Play Week 14 vs Denver**.
8. Review the consequence screen and continue.

Use **Reset prototype** in the top banner to return to the initial state.

## Responsive proof

- Phone: five labeled bottom destinations, one page scroll owner, bottom sticky action, Chip as a compact trigger and bottom sheet.
- Short landscape: compressed global context and controls without forcing a separate product.
- Tablet: navigation rail and single-column or pane-ready content.
- Desktop: labeled rail, persistent franchise/week context, bounded content, contextual Chip panel, and no permanent empty right-side reservation.

## What this intentionally does not prove

- Production data selectors or mutations
- Determinism, RNG, saves, migrations, or import/export behavior
- Full route compatibility
- Final art, animation, audio, or team-brand asset treatment
- Every screen in the 79-route inventory

Those are governed by the architecture, work packets, and QA documents in the parent audit directory.
