# Chip Art v3 — Unified Character + Cold-Open Layout (for local Codex, Fast 5.5, xhigh effort)

Paste the block below into Codex.

---

<goal>
Two outcomes, in priority order so the second can be deferred without blocking the first:

1. **Cold-open layout fix** — Move the cold-open NEXT button into the same screen column as Chip so the user's eye doesn't jump diagonally from Chip on the left to NEXT on the bottom-right. SKIP stays where it is. Treat this as its own commit; it must be shippable on its own.

2. **Unified Chip character art** — Replace all 34 Chip PNGs (17 full-body + 17 inline crops) with a coherent, single-character set so Chip looks like the same person across every surface. Same face, same outfit, same illustration style across all 17 poses. The current art is recognizably "different drawings" between full-body and inline and even between poses; that ends here. Spirit-match MFD's dark + neon UI but go your own direction on illustration style — you have full artistic latitude on technique (clean cartoon, retro-broadcast, pixel art, etc.). State your choice in the final report with a one-line rationale.
</goal>

<context>
Workspace: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
- Build on: `codex/chip-art-shell-polish-v2` (HEAD `8886962`), or branch a fresh `codex/chip-art-shell-polish-v3` from it. Your call. Tell Kevin in the report.
- Do NOT modify `/Users/tkevinbigham/Documents/GitHub/MFD/` (messy main checkout). Read-only if helpful.
- Use `./node_modules/.bin/{vite,vitest,tsc}` directly. **Do not use pnpm** — the local cache has macOS iCloud dataless wedge issues that hang every pnpm-driven command 10+ minutes.

What v2 already shipped (commit `8886962`):
- Inline crops at `apps/web/public/assets/chip/inline/{chip-broadcast.png,chip-coach.png,pose-*.png}` (17 PNGs, 1:1 aspect, used for `sm`/`md` Chip surfaces)
- Full-body PNGs at `apps/web/public/assets/chip/{chip-broadcast.png,chip-coach.png,pose-*.png}` (17 PNGs, ~0.82 aspect, used for `lg` hero/dock surfaces)
- `packages/design-system/components/Chip/Chip.tsx` — `CHIP_POSE_ART` map + `resolveChipPoseArt(size, pose)` resolver. Uses inline crops for `sm`/`md`, full-body for `lg`. Keep this contract intact.
- Mobile dock grid `144px minmax(0, 1fr)` for the lg portrait column (do not regress).
- Legacy SVG hidden via `mfd-chip-svg--legacy-contract` to preserve `data-chip-pose-layer` test contract — keep it in the DOM hidden.

Cold-open route Kevin is reviewing:
Start Dynasty → "COMMAND CENTER CRISIS ROOM" → "OWNER EXPECTATION" → "DYNASTY DESK // CHIP" → branching dialogue with SKIP / NEXT.
Search `apps/web/src/features/franchise-setup/` for `SetupColdOpen.tsx` or sibling — that's where NEXT lives now (bottom-right of the page footer, while Chip is bottom-left).

Kevin's live-preview note today:
> "Images feel inconsistent... the NEXT button should be on the same part of the screen as Chip."

Translation:
- Inline head-and-shoulders crops do not visually match the full-body gestures — proportions, line weight, and even the character read drift between them.
- The cold-open footer puts NEXT on the right while Chip lives on the left, forcing a diagonal eye-jump every beat. Move NEXT next to Chip (same column).

MFD aesthetic (so the new art fits):
- Dark navy / near-black background panels.
- Neon accents: gold (`~#F5C842`), cyan, magenta, green for highlight states.
- Monospace, terminal-flavored typography. Bold cyan/gold panel borders.
- Chip should *fit* this palette, not fight it. He should NOT be the highest-contrast element on screen — that role belongs to decision callouts and action panels.

Chip character bible (stays fixed across all 17 poses):
- Name: Chip. Role: Personal assistant / former position coach / the guy who keeps the coffee away from the draft board.
- Age: ~50, warm and slightly weathered, never panics.
- Face: Full mustache, short graying hair, warm eyes, gentle crow's feet. Same face every pose.
- Build: Average, broad shoulders, slight gut. Same body every pose.
- Outfit: Tan/khaki polo with collar, dark jeans, faded sneakers. Same outfit every pose.
- Accessories: Headset (radio earpiece + slim boom mic), clipboard with X/O route sketches when in idle/coach poses. Pen behind the ear is a recurring detail.
- Tattoos: Subtle on right forearm — not flashy.
- Mood: Genuine, organized, slightly old-school. Reads warm, not stern.

Pose intents (17 — file name → what the pose communicates):
- `chip-coach` (idle): standing relaxed, slight smile, holding clipboard.
- `chip-broadcast` (talk): mid-speech, mouth slightly open, one hand gesturing forward.
- `pose-celebrate`: fist pump or arms up, big grin.
- `pose-concern`: eyebrows knitted, mouth set, leaning slightly forward.
- `pose-disappointed`: small frown, hand on hip, sigh-energy.
- `pose-excited`: wide grin, both hands up open.
- `pose-greeting`: warm half-wave, half-smile.
- `pose-mic-check`: adjusting headset earpiece, mid-conversation.
- `pose-point-left`: pointing toward viewer's left, looking that way.
- `pose-point-right`: pointing toward viewer's right, looking that way.
- `pose-sad`: downcast eyes, slumped shoulders, restrained.
- `pose-surprised`: eyes wide, mouth open, brows up.
- `pose-think`: hand on chin, looking up-right.
- `pose-thumbs-up`: thumbs-up, encouraging grin.
- `pose-warning`: open palm forward, serious face.
- `pose-wave`: casual hello wave.
- `pose-whispering`: hand cupped to mouth, leaning in.
</context>

<constraints>
HARD constraints (no exceptions):
- Replace PNGs **in place** at the same paths and same filenames so component code keeps resolving without renames. 17 full-body at `apps/web/public/assets/chip/`, 17 inline at `apps/web/public/assets/chip/inline/`.
- Inline (sm/md) variants must be **1:1 square aspect** to keep the v2 96×96 inline footprint that cold-open surfaces are built around.
- Full-body (lg) variants render in a 144×176 frame; new art must fit without overflow or hard crop.
- **Transparent backgrounds** (PNG alpha). Chip composites onto MFD's dark panels — no baked background.
- **Same character** across all 17 poses: identical face, outfit, line weight, palette, scale.
- The inline crop and full-body of the same pose must read as the **same character at two scales** — not two different drawings.
- Do not change save schema, `SAVE_VERSION`, deterministic engine, RNG, or deploy surfaces.
- Do not push, force-anything, deploy, or commit in `/Users/tkevinbigham/Documents/GitHub/MFD/`.
- Preserve `data-chip-pose-layer` / `data-chip-tablet-pixel` test markers (legacy SVG layer stays hidden in DOM).
- `git add` specific paths only. No `-A`. No `dist/`, no `node_modules`.

Anti-patterns:
- Different illustration styles between inline and full-body of the same pose.
- Backgrounds baked into the PNGs.
- Photorealism or AI-render uncanny-valley face drift across poses.
- Highest-contrast-element-on-screen art that swallows the UI's gold/cyan callouts.

Soft constraints (your call, state in report):
- Illustration technique. Pixel art, clean cartoon, comic-panel ink, retro broadcast — pick what serves the game. One-line rationale.
- Palette within the dark+neon family. Warm tans for Chip's skin/polo are fine, but don't blow out brighter than the gold accents.

Image-generation note:
- If your environment has an image-gen tool, MCP, or API available, use it. Generate one canonical pose first (e.g., idle full-body), eyeball it against the MFD UI, then propagate the character to the other 16 poses with the canonical as a style/character reference.
- If you cannot generate images in your environment, **do not fake it**. Write a blocker note (per `<missing_context_gating>` below) and ship the layout fix from outcome 1 alone.
</constraints>

<done_when>
ALL of:
1. Cold-open NEXT button repositioned: lives in the same screen column as Chip across all three viewports (1280×800, 768×1024, 375×812). Verifiable in screenshots — no diagonal jump from Chip to NEXT.
2. SKIP still works and is not relocated unless your layout requires it; if you do move SKIP, justify in the commit body.
3. All 34 Chip PNGs replaced; full-body and inline of every pose visually read as the same character at the same style at different scales.
4. Real browser screenshots saved at desktop / tablet / mobile for:
   - Cold-open Chip + NEXT (proves they share a column)
   - At least 4 distinct poses across surfaces (idle, talk, point-right, think — or your pick of 4 that exercise the variety)
   - ChipDock collapsed AND expanded (sanity check: the regen didn't break the dock)
5. Standard gates green:
   - `tsc --noEmit` for `apps/web` AND `packages/design-system`
   - `vitest run` for `apps/web`, `packages/design-system`, `packages/engine`
   - `vite build` (default env) AND `vite build` (flagged: `VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false`)
6. Evidence dir: `.codex/MFD/evidence/chip-art-v3-YYYYMMDD-HHMMSS/screenshots/` with the captures plus an updated `chip-art-metrics.json`.
7. Two commits (preferred): one for the layout fix, one for the art regen. Conventional headers (`fix:` for layout, `polish:` for art). 1–3 paragraph bodies. Each ends with the line: "save schema, `SAVE_VERSION`, deterministic engine behavior, and deploy surfaces remain untouched". No `Co-Authored-By`.

NOT done if:
- Any pose looks like a different person than the canonical Chip.
- Any inline crop's character does not match the full-body for that same pose.
- NEXT button still on the opposite side of the screen from Chip on any viewport.
- Any standard gate fails.
- You committed in `/Users/tkevinbigham/Documents/GitHub/MFD/`.
- You pushed or deployed.
</done_when>

<workflow>
1. **Land the layout fix first as its own commit.** Find the cold-open footer (`apps/web/src/features/franchise-setup/SetupColdOpen.tsx` or sibling). Move NEXT into Chip's column. Verify in browser at 3 viewports. Commit. This commit is shippable on its own.

2. **Then attempt the art regen.** Generate one canonical Chip in the idle (`chip-coach`) full-body pose. Eyeball against MFD's dark+gold UI. If the look fits, propagate to the other 16 full-body poses keeping the canonical as character reference. Then generate (or re-crop) the 17 inline head-and-shoulders variants from the same source so the character is provably consistent.

3. **Replace PNGs in place.** Same filenames, same paths. The component code should not need to change unless you discover a real bug.

4. **Verification loop.** Build flagged, walk the cold-open and dock surfaces in a real browser, screenshot 3 viewports. Run typecheck + vitest + 2 vite builds. Iterate art if any pose doesn't sell as Chip.

5. **Commit the art regen as a second commit.** Then write the final report.

If image generation is genuinely not available in your environment after honest exploration, ship outcome 1 alone, write a blocker note for outcome 2, stop.
</workflow>

<verification_loop>
After each meaningful iteration:
1. Drive a real browser via Playwright (the v2 test at `apps/web/e2e/chip-art-shell-polish-v2.pw.cjs` is a working starting point — extend or write a sibling `chip-art-v3.pw.cjs`).
2. Capture screenshots at 1280×800, 768×1024, 375×812 for the surfaces in `<done_when>` 4.
3. For art iterations: open the inline crop and full-body of the same pose side-by-side in `Preview` (or a contact sheet) and verify it reads as the same character.
4. For layout iterations: confirm Chip and NEXT visually share a column on all 3 viewports.
5. After visual passes, run `tsc --noEmit` per package, `vitest run` per package, `vite build` x 2.

Do not declare done on standard gates alone. The visual gate is non-negotiable — Kevin caught the v1 false-positive doing exactly that.
</verification_loop>

<missing_context_gating>
Stop and write a blocker note instead of guessing if:
- No image-generation capability is available in your environment (no MCP, no tool, no API key wired up). Ship outcome 1 alone in that case.
- The cold-open footer is shared with another route in a way that moving NEXT would regress that route. Document the cross-impact and propose a scoped fix.
- Replacing PNGs would conflict with bundler/CDN cache assumptions you can't verify safely.

Blocker format: exact file path, exact error, what you tried, what context you need from Kevin.
</missing_context_gating>

<output_contract>
Final response in this exact shape:

```
VERDICT: [Chip Art v3 Verified | Layout-Only Shipped, Art Blocked | Mostly Complete But Blocked | Not Safe To Merge]

ART DIRECTION CHOSEN: <technique + one-line rationale, or "n/a — art deferred">

REPO STATE:
  Branch: <name>
  Base: <commit>
  End commits: <hash for layout> [, <hash for art>]
  Files changed: <count + key paths>

GATES:
  typecheck (web): pass/fail
  typecheck (design-system): pass/fail
  vitest web: <N>/<N>
  vitest design-system: <N>/<N>
  vitest engine: <N>/<N>
  vite build (default): <time>
  vite build (flagged): <time>

BROWSER PASS:
  Routes: ...
  Viewports: ...
  Evidence dir: .codex/MFD/evidence/...

LAYOUT: <one-line: where NEXT lives now>
ART: <one-line: regenerated all 34 / regenerated N of 34 / deferred>

RISKS: <bullet list>

KEVIN NEXT ACTION: <one paragraph: what to open in evidence dir, what to confirm, whether to keep both commits or just the layout one>
```
</output_contract>
