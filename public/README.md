# Retained Legacy Manifest

`public/manifest.json` is retained as legacy test material. [indexDocument.test.ts](../apps/web/src/app/indexDocument.test.ts) intentionally reads it and verifies that it stays distinguishable from the active web manifest. Its old asset references are historical; this directory is not the active Vite public directory.

The running web app uses [apps/web/public/manifest.json](../apps/web/public/manifest.json), referenced by [apps/web/index.html](../apps/web/index.html), with the `/MFD/` base. Use that manifest and its existing SVG icons for current packaging work.

Do not delete or repurpose the root manifest without reviewing the intentional regression contract. Its retention explains MFD-12 in the [consistency repair ledger](../docs/plans/file-consistency-2026-10-07.md).
