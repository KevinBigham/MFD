# Audit Evidence Index

## Current runtime

`runtime/` contains 40 screenshots captured from the repository’s existing `apps/web/dist` at the verified commit. `BASELINE_MEASUREMENTS.json` and `data/runtime-measurements.json` contain the matching geometry, interaction, text-size, border, scroll-container, chrome, and primary-action measurements.

The runtime was served locally under the repository’s `/MFD/` base path. External requests were aborted, so screenshots show resilient fallback typography rather than relying on a font CDN.

## Annotated diagnosis

`annotated/` contains three current-screen callout images and one direct current-versus-proposed phone comparison.

## Route and flow maps

`maps/` contains the current IA, proposed IA, and canonical weekly-loop diagrams as standalone SVG files.

## Prototype proof

`prototype/` contains 14 phone/desktop screenshots, geometry JSON, and `weekly-loop-trace.zip`. The trace records the complete static flow from Today through depth, Game Plan, readiness, and advance. Open it with Playwright Trace Viewer on a correctly provisioned machine:

```bash
npx playwright show-trace docs/ui-overhaul/evidence/prototype/weekly-loop-trace.zip
```

The prototype is intentionally disconnected from production state and is not evidence of engine/save integration.

## Verification

`verification/` retains command logs and exit codes. Environment-blocked commands are preserved as blocked—not translated into source failures or passes.

## Source and machine-readable evidence

- `data/SOURCE_METRICS.json`
- `data/route-surface-matrix.json`
- `data/runtime-measurements.json`
- `data/FINDINGS.json`
- `data/WORK_PACKETS.json`
- `data/VISUAL_EVIDENCE_INDEX.json`
- `source/route-registry-extract.json`
- `scripts/build_route_matrix.py`
- `scripts/capture_batch.py`
