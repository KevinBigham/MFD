# Launch Polish Visual Evidence

Generated: 2026-05-20

Route: `http://127.0.0.1:5173/MFD/`

Commands:

```bash
VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false \
  /Users/kevin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  node_modules/vite/bin/vite.js --host 127.0.0.1

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --disable-background-networking \
  --disable-component-update --no-first-run --no-default-browser-check \
  --user-data-dir=/tmp/mfd-chrome-shot-desktop3 \
  --window-size=1440,1000 --virtual-time-budget=4000 \
  --screenshot=/Users/kevin/MFD-main/artifacts/visual-ralph/launch-polish/desktop.png \
  http://127.0.0.1:5173/MFD/

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --disable-background-networking \
  --disable-component-update --no-first-run --no-default-browser-check \
  --user-data-dir=/tmp/mfd-chrome-shot-mobile6 \
  --window-size=390,900 --virtual-time-budget=4000 \
  --screenshot=/Users/kevin/MFD-main/artifacts/visual-ralph/launch-polish/mobile.png \
  http://127.0.0.1:5173/MFD/
```

Visual verdict:

```json
{
  "score": 92,
  "verdict": "pass",
  "category_match": "repo-native launch/title screen polish",
  "differences": [
    "Strict Visual Ralph reference approval was not used because this pass was scoped as autonomous repo polish rather than visual cloning.",
    "Desktop command card and franchise grid are visible in the first viewport; difficulty continues below the fold by design.",
    "Mobile uses a single-column command flow; the 390px screenshot no longer clips the title or mode buttons after the CSS pass."
  ],
  "suggestions": [
    "Future visual-reference work should use an approved static mock or live baseline before implementation.",
    "A later pass could add a compact team search/filter if the full franchise list feels too long on phones."
  ],
  "reasoning": "Screenshots show the launch screen now preserves the MFD pixel/broadcast identity, exposes the start and demo actions early, avoids the prior narrow-width horizontal clipping, and keeps recovery as a trust-critical but secondary surface."
}
```
