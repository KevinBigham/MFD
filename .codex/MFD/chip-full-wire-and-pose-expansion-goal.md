# Chip Full-Wire + Pose Expansion (for local Codex, Fast 5.5, xhigh effort)

Paste the block below into Codex.

---

<goal>
Three outcomes, in execution order. Treat them as separable so an early blocker on (3) doesn't strand (1) and (2):

1. **Audit & document Chip surface coverage.** Walk the codebase, identify every moment that *should* have Chip but currently doesn't (or has a stale fallback), and produce a punch list. Examples of moments to look at: trade-deadline outcomes, draft picks, halftime decisions, postgame queues, training-camp reveals, season-end reflection, sprint/week intro, error/empty states. The audit is the first commit's deliverable — even if (2) and (3) get blocked, this audit is shippable on its own.

2. **Expand the pose library by ~15–20 poses.** Extend `scripts/generate-chip-v3-art.cjs` to add new poses that fill gaps the audit surfaced *plus* general richness Chip's character earns. Same procedural rig, same character (mustache, headset, tan polo, jeans, clipboard). Same file conventions. Picks below in `<context>` are candidates — you have latitude to swap or reorder based on what (1) surfaces actually need.

3. **Wire the new poses into the surfaces from (1).** Add them to the `CHIP_POSE_ART` map and `ChipPose` type, route the right pose to the right moment via existing event/dialogue plumbing (`eventBridge`, `useChipEvents`, dialogue files under `apps/web/src/features/companion/dialogue/`), and prove it with a real browser screenshot at each newly-wired surface.

Kevin reaction on v3: "looks badass as hell." Style direction is locked — keep going on the procedural retro-broadcast cartoon. Just give him more of it.
</goal>

<context>
Workspace: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
- Build on: `codex/chip-art-shell-polish-v3` (HEAD `6340bbd`). Branch a fresh `codex/chip-full-wire` from it. Tell Kevin in the report.
- Do NOT modify `/Users/tkevinbigham/Documents/GitHub/MFD/` (messy main checkout). Read-only if helpful.
- Use `./node_modules/.bin/{vite,vitest,tsc}` directly. **Do not use pnpm** — the local cache has macOS iCloud dataless wedge issues that hang every pnpm-driven command 10+ minutes.

Where Chip currently lives (v3 baseline):
- `packages/design-system/components/Chip/Chip.tsx` — `CHIP_POSES` enum, `CHIP_POSE_ART` map (17 entries), `resolveChipPoseArt(size, pose)` resolver
- `apps/web/src/features/companion/ChipHost.tsx` — companion portrait + controls used in cold-open and elsewhere
- `apps/web/src/features/companion/ChipDock.{tsx,css,test.tsx}` — bottom-right collapsible dock
- `apps/web/src/features/companion/eventBridge.{ts,test.ts}` — translates game events into companion cues
- `apps/web/src/features/companion/useChipEvents.{ts,test.ts}` — React hook driving Chip from the event stream
- `apps/web/src/features/companion/dialogue/onboarding.{ts,test.ts}` — onboarding dialogue (and likely sibling dialogue files for other phases — check the directory)
- `apps/web/src/features/franchise-setup/FranchiseSetupWizard.tsx` — cold-open Chip wiring (v3 layout fix landed here)
- Procedural art rig: `scripts/generate-chip-v3-art.cjs` (371 lines, your starting point for new poses)
- v3 contact sheet (visual reference): `.codex/MFD/evidence/chip-art-v3-20260506-220626/screenshots/pose-contact-sheet.png`

Existing 17 poses (do not regen, do not rename):
`idle (chip-coach)`, `talk (chip-broadcast)`, `celebrate`, `concern`, `disappointed`, `excited`, `greeting`, `mic-check`, `point-left`, `point-right`, `sad`, `surprised`, `think`, `thumbs-up`, `warning`, `wave`, `whispering`.

Candidate new poses (~15–20; pick the set that best fits what your audit surfaces — these are seeds, not a rigid spec):

Game-day intensity:
- `rallying` — both fists up, big yell, pumping up team
- `coaching-crouch` — squatting/leaning to deliver instruction, intense
- `calling-play` — clipboard up, pointing at it, mid-callout
- `time-out` — hands forming a T, serious expression
- `whistle-blow` — whistle in mouth, hand cupped

Front-office / admin:
- `coffee-sip` — mug raised, mid-sip, calm
- `on-phone` — phone to ear, headset off or pushed up, focused
- `reviewing-tablet` — tablet/clipboard tilted, eyes scanning
- `head-in-hands` — both hands to head, disbelief/stress
- `fist-bump` — extending fist forward (camera-perspective)
- `note-taking` — clipboard up, pen mid-write

Reaction extensions:
- `laughing` — head back, big laugh, eyes crinkled
- `skeptical` — one eyebrow up, slight frown, arms crossed
- `proud` — hands on hips, chin up, satisfied half-smile
- `facepalm` — palm to face, slumped
- `frustrated` — tight jaw, both hands clenched at sides

Time / context:
- `tired` — slight slouch, rubbing eye, late-night energy
- `coffee-fresh` — fresh start, mug in hand, half-smile (combine with sip if useful)

Equipment / world:
- `football-in-hand` — holding a football, hand-off pose
- `pointing-at-tape` — pointing toward a hypothetical film board, looking past camera

MFD aesthetic recap (so generated art keeps fitting):
- Dark navy / near-black background panels.
- Neon accents: gold (`~#F5C842`), cyan, magenta, green for highlight states.
- Chip stays muted khaki/navy so gold/cyan UI callouts remain dominant.
- Same character bible: mustache, headset, short graying hair, tan polo with collar, dark jeans, faded sneakers, optional clipboard / pen behind ear.

Wiring patterns to look at when surfacing the audit:
- Search for `useChipEvents` / `eventBridge` consumers — every consumer is a place Chip *might* be wired. Some may use a generic pose; flag those.
- Search for `<Chip ` and `<ChipHost ` and `<ChipDialogueBubble ` to find direct usages.
- Search dialogue files (`apps/web/src/features/companion/dialogue/*.ts`) — every dialogue line has an associated pose. Are any defaulting to `idle` or `talk` when a more specific pose would land harder? Flag those.
- Look for game-state moments without companion hookup: trade deadline, draft, halftime decision, postgame, training camp, season-end, sprint intro, achievement unlocks. Some of these may already be wired — confirm or note absence.
</context>

<constraints>
HARD constraints:
- Keep the v3 procedural rig (`scripts/generate-chip-v3-art.cjs`) as the single source of pose generation. Do not introduce a second art pipeline. Extend the rig; don't replace it.
- Same character bible across every new pose. Same face, outfit, line weight, palette, scale. The new poses must read as the *same Chip* who already lives in the v3 contact sheet.
- New full-body PNGs at `apps/web/public/assets/chip/<name>.png`, ~600×732 with alpha.
- New inline crops at `apps/web/public/assets/chip/inline/<name>.png`, 600×600 with alpha.
- Update `CHIP_POSES`, `ChipPose` type, and `CHIP_POSE_ART` map atomically — no orphan files, no orphan enum entries.
- Preserve `data-chip-pose-layer` / `data-chip-tablet-pixel` test markers (legacy SVG layer stays hidden in DOM).
- No save schema, `SAVE_VERSION`, deterministic engine, RNG, or deploy surface changes.
- No push, no force-anything, no commits in `/Users/tkevinbigham/Documents/GitHub/MFD/`.
- `git add` specific paths only. No `-A`. No `dist/`, no `node_modules`.

Anti-patterns:
- Drift from the v3 character (different mustache, missing headset, different polo color, etc.)
- Pose names that don't match what the pose visually communicates.
- Wiring a new pose to a surface where the existing pose was already correct — only swap when the new pose lands harder.
- Cramming all ~15–20 new poses into one giant commit. Group commits logically (audit; pose batch; wire-up) so individual pieces can be reverted if needed.

Soft constraints (your call, state in report):
- Final pose count is your call within ~15–20. Quality > quantity. If a candidate pose doesn't generate cleanly from the procedural rig, drop it and document why in the audit.
- The exact wiring depth — if a surface needs new dialogue lines to land a new pose, you may add them, but only if they fit the existing dialogue tone. Keep diffs scoped.
</constraints>

<done_when>
ALL of:
1. Audit document at `.codex/MFD/chip-coverage-audit-YYYYMMDD.md` (or similar) listing every Chip-eligible surface, current state (wired / partially wired / unwired), and recommendation. Committed.
2. ~15–20 new poses generated and present at both `apps/web/public/assets/chip/<name>.png` and `apps/web/public/assets/chip/inline/<name>.png` with the size/alpha conventions above.
3. `CHIP_POSES`, `ChipPose`, `CHIP_POSE_ART` updated atomically; design-system tests still green.
4. Newly-identified unwired (or under-wired) surfaces from (1) are now wired through `eventBridge` / `useChipEvents` / dialogue files. If you can't wire all of them in one pass, ship the ones you can and document the rest in the audit.
5. Real browser screenshots saved at desktop / tablet / mobile (1280×800 / 768×1024 / 375×812) for:
   - An updated contact sheet showing all 17 + new poses
   - At least 4 newly-wired surfaces showing Chip in the right pose for the moment
   - The Chip dock collapsed and expanded (sanity)
6. Standard gates green:
   - `tsc --noEmit` for `apps/web` AND `packages/design-system`
   - `vitest run` for `apps/web`, `packages/design-system`, `packages/engine`
   - `vite build` (default) AND `vite build` (flagged: `VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false`)
7. Evidence dir: `.codex/MFD/evidence/chip-full-wire-YYYYMMDD-HHMMSS/screenshots/` with the captures plus an updated `chip-art-metrics.json`.
8. Three commits (preferred):
   - `audit: chip surface coverage punch list`
   - `polish: expand chip pose atlas (+N poses)`
   - `wire: route new chip poses to <surfaces>`
   Conventional headers, 1–3 paragraph bodies, each ending with: "save schema, `SAVE_VERSION`, deterministic engine behavior, and deploy surfaces remain untouched". No `Co-Authored-By`.

NOT done if:
- Any new pose looks like a different person than the v3 Chip.
- Any pose name doesn't match what the pose visually communicates.
- Any standard gate fails.
- A wired surface routes to the wrong pose for the moment.
- You committed in `/Users/tkevinbigham/Documents/GitHub/MFD/`.
- You pushed or deployed.
</done_when>

<workflow>
1. **Audit pass first.** Walk the companion code (`apps/web/src/features/companion/**`), the dialogue files, and the event consumers. Produce the audit doc as commit 1. This is the punch list that drives the rest.

2. **Pick the new pose set** based on what the audit surfaced + general richness. Implement them in `scripts/generate-chip-v3-art.cjs` one at a time; regenerate, eyeball each pose against the v3 contact sheet for character consistency, iterate the rig if drift appears.

3. **Land the pose batch as commit 2.** Update `CHIP_POSES`, `ChipPose`, `CHIP_POSE_ART`, and any test that enumerates poses. Run the design-system tests and the type-checker; both must be green before moving on.

4. **Wire the new poses into the surfaces** from the audit. This may touch `eventBridge`, `useChipEvents`, dialogue files, or specific feature components. Keep the diff scoped — no refactoring opportunism.

5. **Verification loop.** Capture browser evidence at 3 viewports for the newly-wired surfaces. Run all standard gates.

6. **Land the wire-up as commit 3.** Final report.

If the procedural rig genuinely can't render a particular candidate pose (e.g., needs a prop the rig doesn't draw), drop that pose, note the limitation in the audit, and move on. Don't gold-plate the rig beyond what's needed.
</workflow>

<verification_loop>
After each meaningful iteration:
1. **Per-pose:** generate the pose, diff against the v3 contact sheet's existing poses for character consistency. If the face/outfit/scale drifts, fix the rig before propagating.
2. **Per-wire-up:** drive the surface in a real browser (extend `apps/web/e2e/chip-art-v3.pw.cjs` or sibling), confirm the right pose fires for the right event, screenshot 3 viewports.
3. **Standard gates after each commit:**
   - `./node_modules/.bin/tsc --noEmit` per package
   - `./node_modules/.bin/vitest run` per package
   - `./node_modules/.bin/vite build` x 2 (default + flagged)

Do not declare done on standard gates alone. The visual + wiring gate is non-negotiable. Kevin's v1 false-positive was caused by trusting HTTP/build/test without driving a browser.
</verification_loop>

<missing_context_gating>
Stop and write a blocker note instead of guessing if:
- The audit reveals a Chip-eligible surface that requires non-trivial dialogue authoring (more than a line or two) — flag it, propose scope, do not write open-ended dialogue trees unprompted.
- A surface's existing pose mapping is structurally wrong (e.g., wrong event firing) and fixing it requires touching engine/event-emit code outside the companion folder.
- The procedural rig can't render a candidate pose without a major refactor — drop the pose, document, move on.
- Replacing/extending poses would conflict with bundler/CDN cache assumptions you can't verify safely.

Blocker format: exact file path, exact error, what you tried, what context you need from Kevin.
</missing_context_gating>

<output_contract>
Final response in this exact shape:

```
VERDICT: [Chip Full-Wire Verified | Audit + Poses Shipped, Wiring Partial | Audit Only Shipped | Not Safe To Merge]

REPO STATE:
  Branch: <name>
  Base: <commit>
  End commits: <hash audit>, <hash poses>, <hash wire>
  Files changed: <count + key paths>

POSE LIBRARY:
  Existing: 17
  Added: <N>
  Final total: <N>
  Notable additions: <bullet list of 4–6 most useful new poses>

WIRING:
  Surfaces audited: <count>
  Surfaces newly wired: <count>
  Surfaces still unwired (with reason): <bullet list>

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

RISKS: <bullet list>

KEVIN NEXT ACTION: <one paragraph: which screenshots to open first, which surfaces to drive in the dev server to feel the wiring, whether to keep all three commits or cherry-pick>
```
</output_contract>
