# ADR 0001: Future Dynasty Timeline Archive

## Status

Proposed for a future save version. Not implemented in this mission.

## Context

`dynastyTimeline` is the emotional memory layer for long-running MFD saves. It stores championships, collapses, landmark performances, rivalry turns, coaching memories, and other receipts that make a dynasty feel witnessed over many seasons.

Long-running saves will keep growing. Other collections can be capped or deduplicated safely when they are derived, disposable, or UI-facing cache data. `dynastyTimeline` is different: deleting or compacting it can erase the player's sense of history.

## Decision

Do not compact `dynastyTimeline` in the v37/vNext save diet work. Any future archive must be versioned, migrated, and designed as a memory-preserving transformation, not a simple `slice(-N)`.

## Constraints

- Landmark and major memories are sacred.
- Championship, playoff, rivalry, record, retirement, coaching, award, and owner-era receipts must remain inspectable.
- Unknown future timeline event types must be preserved unless a migration explicitly understands them.
- UI should continue to support callbacks from old memories.
- Migration must be deterministic and must not consume RNG.

## Future Options

1. Add a `dynastyMemoryArchive` collection keyed by era or season range.
2. Keep all major and landmark events in `dynastyTimeline`, archive only minor recurring events.
3. Summarize archived minor events into season-level memory cards with references to source ids.
4. Add UI filters before any storage compaction so players can inspect what would move.

## Migration Sketch

A future save version could:

- Add `dynastyMemoryArchive`.
- Preserve all `importance: "major"` and all landmark event types in `dynastyTimeline`.
- Move only understood low-importance event types older than a configured season window.
- Write archive entries with source event ids, year range, team ids, player ids, and summary text.
- Leave unknown event types in place.

## Rollback

Because this is only a design note, rollback is deleting this ADR. No runtime code or save schema is changed.
