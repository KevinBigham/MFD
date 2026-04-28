# Sprint 71 Resume Audit

Date: 2026-04-28
Branch: `sprint-71/team-logos`
Repo: `/Users/tkevinbigham/Projects/MFD/mfd`

## 1. Baseline Confirmation

- `origin/main`: `f353632d71ea1d17ad47314f995856861e0b876f fix(sprint-70.1): non-mutating roster sorts in blueprint + season report (#13)`
- Local `sprint-71/team-logos` HEAD: `f353632`
- Save version remains v35. This sprint is asset-only.

## 2. Dirty PNG Inventory

These 28 PNGs were already dirty before the 2026-04-28 resume session and are preserved as prior-session output.

| File | Size | Modified |
| --- | ---: | --- |
| `apps/web/public/logos/atl.png` | 101726 | 2026-04-25 08:33:53 -0500 |
| `apps/web/public/logos/bal.png` | 137785 | 2026-04-25 08:34:41 -0500 |
| `apps/web/public/logos/bos.png` | 110259 | 2026-04-25 08:35:37 -0500 |
| `apps/web/public/logos/chi.png` | 187606 | 2026-04-25 08:36:22 -0500 |
| `apps/web/public/logos/cin.png` | 87165 | 2026-04-25 08:37:22 -0500 |
| `apps/web/public/logos/cle.png` | 85062 | 2026-04-25 08:38:27 -0500 |
| `apps/web/public/logos/clt.png` | 96796 | 2026-04-25 08:39:22 -0500 |
| `apps/web/public/logos/col.png` | 90881 | 2026-04-25 08:40:25 -0500 |
| `apps/web/public/logos/dal.png` | 107181 | 2026-04-25 08:41:42 -0500 |
| `apps/web/public/logos/dc.png` | 87637 | 2026-04-25 08:42:42 -0500 |
| `apps/web/public/logos/den.png` | 89988 | 2026-04-25 08:44:35 -0500 |
| `apps/web/public/logos/det.png` | 94058 | 2026-04-25 08:47:26 -0500 |
| `apps/web/public/logos/hou.png` | 132109 | 2026-04-25 08:48:50 -0500 |
| `apps/web/public/logos/ind.png` | 93884 | 2026-04-25 08:50:11 -0500 |
| `apps/web/public/logos/jax.png` | 120182 | 2026-04-25 08:51:37 -0500 |
| `apps/web/public/logos/kc.png` | 93345 | 2026-04-25 08:53:11 -0500 |
| `apps/web/public/logos/la.png` | 115398 | 2026-04-25 08:54:42 -0500 |
| `apps/web/public/logos/lv.png` | 86431 | 2026-04-25 08:56:04 -0500 |
| `apps/web/public/logos/mia.png` | 104414 | 2026-04-25 08:57:32 -0500 |
| `apps/web/public/logos/min.png` | 132864 | 2026-04-25 08:59:15 -0500 |
| `apps/web/public/logos/nsh.png` | 140846 | 2026-04-25 09:01:09 -0500 |
| `apps/web/public/logos/nyc.png` | 88314 | 2026-04-25 09:03:07 -0500 |
| `apps/web/public/logos/orl.png` | 133013 | 2026-04-25 09:04:59 -0500 |
| `apps/web/public/logos/phi.png` | 100185 | 2026-04-25 09:09:11 -0500 |
| `apps/web/public/logos/phx.png` | 122905 | 2026-04-25 11:44:39 -0500 |
| `apps/web/public/logos/pit.png` | 93921 | 2026-04-25 11:46:24 -0500 |
| `apps/web/public/logos/sa.png` | 129656 | 2026-04-25 11:48:16 -0500 |
| `apps/web/public/logos/sd.png` | 111289 | 2026-04-25 11:52:51 -0500 |

## 3. Missing-Team Spec Rows

Source contract read from `/Users/tkevinbigham/Projects/MFD/.codex/MFD/sprint71-logo-matrix.md`.

| ABBR | Nickname | Primary (hex) | Secondary (hex) | Tertiary (hex) | Motif | One-line image prompt | Style notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEA | Grunge | #002244 | #69BE28 | #A5ACAF | Flannel-clad amplifier monster head | NFL-style helmet mascot logo of a grunge amplifier monster head with flannel slash marks and feedback-wave hair, single bold silhouette, no text, primary #002244, accent #69BE28, highlight #A5ACAF, transparent background, centered. | Music attitude mascot; no skyline, needle, or wordmark. |
| SF | Sourdoughs | #D4A574 | #5A5A5A | #E31837 | Rising sourdough loaf head with starter-bubble eyes | NFL-style helmet mascot logo of a rising sourdough loaf head with starter-bubble eyes, scoring-crust brow, and banneton crest, single bold silhouette, no text, primary #D4A574, accent #5A5A5A, highlight #E31837, transparent background, centered. | Bread mascot, not bakery photo; no bridge or wharf. |
| STL | Toasted Raviolis | #C41E3A | #FFB612 | #003087 | Toasted ravioli shield-crab mascot with crimped edges | NFL-style helmet mascot logo of a toasted ravioli warrior mascot with crimped-edge shield face and sauce-splash crest, single bold silhouette, no text, primary #C41E3A, accent #FFB612, highlight #003087, transparent background, centered. | Food-warrior mark; no plate, fork, arch, or city. |
| TB | Pirates | #D50A0A | #FF7900 | #000000 | Original pirate flag skull with cutlass wave | NFL-style helmet mascot logo of an original pirate flag skull with cutlass wave and torn banner shape, single bold silhouette, no text, primary #D50A0A, accent #FF7900, highlight #000000, transparent background, centered. | Pirate flag allowed as literal motif; avoid real NFL silhouette. |

## 4. Junk-File Inventory

Top-level PNGs under `apps/web/public/logos/` were compared against the 32 lowercase abbreviation filenames in the matrix.

| File | Size | Modified | Plan |
| --- | ---: | --- | --- |
| `apps/web/public/logos/SF Sourdough.png` | 223653 | 2026-04-07 09:25:31 -0500 | Delete as non-abbreviation junk PNG. |

No deletion is planned for nested `apps/web/public/logos/composites/*.png`; those are tracked composite source assets outside the top-level abbreviation logo set.

## 5. Visual-Sanity Plan

1. Generate a local contact sheet against a black ESPN-style background with every top-level abbreviation PNG rendered at 64px and 32px.
2. Verify exactly 32 top-level abbreviation PNGs exist after cleanup: no missing `sea`, `sf`, `stl`, `tb`, and no top-level extras.
3. Use browser or image-render inspection to confirm each logo has transparent corners, clear silhouette mass, no embedded text, and remains readable at 32px.
4. Stop and surface if any of the prior 28 fail the 32px black-chrome oracle.

## 6. Generation Workflow Declaration

The original workflow was identified from the 2026-04-25 Codex session log and local generated-image artifacts:

1. Use the built-in `image_gen` tool with the matrix prompt normalized into `Use case: logo-brand`.
2. Generate source art on a perfectly flat chroma background for local alpha extraction.
   - Default key: neon green `#00ff00`.
   - SEA exception: magenta key because SEA uses green accent `#69BE28`.
3. Run `${HOME}/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py` with:
   - `--auto-key border`
   - `--soft-matte`
   - `--transparent-threshold 18`
   - `--opaque-threshold 235`
   - `--despill`
4. Use PIL to convert to RGBA, thumbnail into a 512x279 box with `Image.Resampling.LANCZOS`, and center on a transparent 512x279 canvas.
5. Save to `apps/web/public/logos/<abbr>.png`.

The four remaining logos will use this same workflow. Existing 28 PNGs will not be regenerated unless they fail the visual oracle.
