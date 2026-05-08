# Chip Art / App Shell Polish — v2 Goal (for local Codex, Fast 5.5, xhigh effort)

Paste the block below into Codex.

---

<task>
You are taking a v2 pass on the Chip PNG art / app shell polish for MFD. v1 passed all HTTP and build checks but the actual visual is broken — Chip renders as an empty-looking box on real surfaces. Make v2 actually land visually, with real browser screenshot evidence, not file-loads-with-200 evidence.
</task>

<workspace>
Two clones, two roles. Read carefully:

- `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery` — your workspace. The verified release candidate is `a9cd1e2` on `codex/chip-public-release-recovery`. The v1 polish branch is `codex/chip-art-shell-polish` at commit `cd53065`. You can build on `cd53065` with new commits OR reset back to `a9cd1e2` and start a fresh `codex/chip-art-shell-polish-v2` branch — your call based on the right shape of the fix. State which in your final report.

- `/Users/tkevinbigham/Documents/GitHub/MFD` — messy main checkout. Read-only. Contains the original uncommitted polish patch plus ~25 unrelated agent patches. Use it as a file-read source if helpful. **Do not commit there. Do not run broad git ops. Do not try to repair it.**

What v1 commit `cd53065` already shipped into the clean clone:
- 17 PNG assets at `apps/web/public/assets/chip/` (chip-coach.png, chip-broadcast.png, plus 15 pose-*.png)
- `packages/design-system/components/Chip/{Chip.tsx,Chip.css,Chip.test.tsx,index.ts}` — added `CHIP_POSE_ART` map, added a visible `<img>` PNG layer as the rendered Chip, kept the legacy SVG hidden via `display: none !important` to preserve test contracts
- `apps/web/src/app/{App.tsx,App.test.tsx,app-shell.css(new)}` — landmark data-attrs, top-nav grid, 1580px main cap, mobile breakpoint
- ChipDock layout changes from the original source patch were intentionally deferred because they conflicted with RC hardening on the same lines. Do not reintroduce that conflict; if your direction needs dock changes, reconcile carefully against the RC version on `codex/chip-public-release-recovery`'s `ChipDock.{tsx,css,test.tsx}`.
</workspace>

<diagnosis>
Two root causes, both confirmed on the franchise-setup cold-open route ("COMMAND CENTER CRISIS ROOM" → "OWNER EXPECTATION" → ChipHost dialogue with "DYNASTY DESK // CHIP"):

1. **Aspect-ratio regression.** Old Chip SVG `md` size was 96×96 (square). New PNG `md` size is 96×118 (portrait, +22px / +23% height). Surfaces that wrap Chip — `ChipHost` portrait button at `apps/web/src/features/companion/ChipHost.tsx:386`, `ChipDialogueBubble`, `SetupColdOpen` — were all designed around the square. The taller frame pushes layout around and reads off.

2. **Wrong-composition source art.** The PNGs are full-body portraits (head to feet). With `object-fit: cover` + `object-position: center 28%` on a 96×118 frame, Chip renders so small he reads as empty space inside a gold-bordered box. The art was authored for hero/dialogue surfaces, not small inline portraits.

PNGs themselves are correct: 200 OK with `image/png` at `/MFD/assets/chip/*.png`, file content is a real cartoon character (headset, mustache, polo, tattooed forearms, clipboard with X/O routes, jeans). The art is good — it's composed for the wrong frame.
</diagnosis>

<solution_directions>
Pick one (or a hybrid). Kevin will accept any if the visual lands cleanly:

A. **Tighter crops.** Re-export head-and-shoulders crops of every PNG for inline `sm`/`md` use, keep full-body for `lg` hero surfaces. Extend `CHIP_POSE_ART` (or add a sibling map) so each size resolves to its appropriate crop. Use `sips` or ImageMagick on macOS to crop.

B. **Bigger frames where art needs room.** Bump `md` to ~120×148, `lg` to ~180×220 or larger, and update `ChipHost`, `ChipDialogueBubble`, `SetupColdOpen`, and any other surface to give Chip space. Source PNGs unchanged.

C. **Hybrid.** Keep the legacy SVG visible for inline `sm`/`md` (drop the `display: none !important`), use the PNG only for `lg` hero surfaces (Chip dock when expanded, dedicated dialogue cards). Smallest patch but reduces real-art coverage.

I lean A (real art everywhere). You have full latitude.
</solution_directions>

<action_safety>
Write-capable task. Stay narrow:
- No save schema, `SAVE_VERSION`, engine, RNG, or determinism changes.
- No deploy, no push, no force-anything.
- Do not modify `/Users/tkevinbigham/Documents/GitHub/MFD/` except to file-read.
- Preserve the legacy SVG test contract: `packages/design-system/components/Chip/Chip.test.tsx` asserts on `data-chip-pose-layer`, `data-chip-tablet-pixel`, and related markers. Keep them in the DOM (hidden is fine).
- Do not reintroduce the v1 ChipDock conflict unless you explicitly reconcile with the RC version on `codex/chip-public-release-recovery`.
- Use `./node_modules/.bin/{vite,vitest,tsc}` from each package directly. Do **not** use `pnpm` — the local cache has macOS iCloud dataless wedge issues that hang every pnpm-driven command for 10+ minutes.
- Do not refactor unrelated code, rename unrelated files, or "clean up" anything outside the polish scope.
</action_safety>

<verification_loop>
The v1 mistake was trusting HTTP/build/typecheck/test as visual verification. They aren't. v2 must drive a real browser.

1. Use Playwright (already installed; `apps/web/package.json` has `test:e2e: playwright test`). Either extend an existing e2e test or add a focused visual one that:
   a. Builds with the flagged env (`VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false`) and serves via `vite preview`
   b. Walks the franchise-setup cold-open route (the surface where Kevin saw the empty-box bug)
   c. Captures screenshots at viewports 1280×800 (desktop), 768×1024 (tablet), 375×812 (mobile) for each of:
      - The ChipHost portrait button (during onboarding dialogue)
      - The ChipDialogueBubble area in cold-open
      - The Chip dock in both collapsed and expanded states
   d. Asserts the portrait `img` has non-zero rendered dimensions, that Chip's bounding box occupies a reasonable fraction of the frame (not less than ~30% by area), and that no rendered overflow bleeds into the dialogue text area

2. Save screenshots to `.codex/MFD/evidence/chip-art-shell-polish-v2-YYYYMMDD-HHMMSS/screenshots/` and reference paths in the final report. Commit them with the rest of the work — the project tradition is to keep evidence under `.codex/MFD/evidence/`.

3. Standard gates after the visual passes:
   - `tsc --noEmit` for `apps/web` and `packages/design-system`
   - `vitest run` for `apps/web`, `packages/design-system`, `packages/engine` (all green)
   - `vite build` (default env)
   - `vite build` (flagged env above)

Iterate the implementation until the visual gate AND the standard gates both pass. Do not declare done on standard gates alone.
</verification_loop>

<completeness_contract>
Done = ALL of:
- Real browser screenshots saved under `.codex/MFD/evidence/chip-art-shell-polish-v2-...`
- Each captured surface at each viewport shows Chip's character clearly readable: not empty, not microscopic, not overflowing into adjacent UI
- All standard gates green (typecheck, vitest, vite build × 2)
- One or more focused commits on `codex/chip-art-shell-polish` or a fresh `codex/chip-art-shell-polish-v2`. Tell Kevin which branch to keep.
- Commit style matches recent RC commits: short conventional header (`polish:` or `fix:`), 1–3 paragraph body, explicit line "save schema, `SAVE_VERSION`, deterministic engine behavior, and deploy surfaces remain untouched". No `Co-Authored-By` line — this repo doesn't use them.
- `git add` specific paths only. No `-A`. Do not stage `dist/`, `node_modules`, or unrelated junk.

Not done if:
- Any captured surface still shows empty/microscopic Chip
- Any standard gate fails
- ChipDock visual conflicts with RC version on its branch
- You committed in `/Users/tkevinbigham/Documents/GitHub/MFD/`
- You pushed or deployed
</completeness_contract>

<missing_context_gating>
Stop and write a blocker note instead of guessing if:
- A required file isn't readable due to iCloud dataless cache or sandbox
- Playwright fails to install browsers and you can't proceed
- The RC's ChipDock conflicts can't be reconciled with your chosen direction without reshaping the RC
- The legacy SVG test contract can't coexist with your chosen approach

Blocker format: exact file path, exact error, what you tried, what context you need from Kevin.
</missing_context_gating>

<compact_output_contract>
Final response in this exact shape:

```
VERDICT: [Chip Art v2 Verified | Mostly Complete But Blocked | Not Safe To Merge]

DIRECTION: [A | B | C | hybrid] — one-sentence rationale.

REPO STATE:
  Branch: <name>
  Base: <commit>
  End commit: <hash>
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
  Anything notable: ...

RISKS: <bullet list>

KEVIN NEXT ACTION: <one paragraph: where to look, what to confirm>
```
</compact_output_contract>
