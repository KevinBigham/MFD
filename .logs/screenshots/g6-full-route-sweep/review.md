# G6 Full Route Visual Review

Date: 2026-07-05

Evidence:
- Raw screenshots: `.logs/screenshots/g6-full-route-sweep/*.png`
- Summary JSON: `.logs/screenshots/g6-full-route-sweep/summary.json`
- Contact sheets:
  - `.logs/screenshots/g6-full-route-sweep/contact-desktop.png`
  - `.logs/screenshots/g6-full-route-sweep/contact-sm-480.png`

Method:
- Built `@mfd/web` with `VITE_CHIP_ENABLED=true`.
- Launched the production preview build in headless Chrome.
- Cleared browser storage and IndexedDB, launched the convention demo save, then swept every registered route.
- Captured screenshots at 1366x900 desktop and 480x900 (`BREAKPOINTS.sm`) with `prefers-reduced-motion: reduce` emulated.
- Included the two contextual dynamic routes by discovering `/player/afce1-qb-1` from the demo roster and deriving `/player/afce1-qb-1/timeline`.

Results:
- Registered route coverage: 81/81.
- Screenshots captured: 162 route screenshots plus 2 contact sheets.
- Browser console errors / runtime exceptions: 0.
- Horizontal overflow: 0px max on desktop and 480px.
- Tiny visible interactive controls detected by sweep: 0.
- Reduced-motion media query matched on every route.

Warnings reviewed:
- One IndexedDB delete warning during launch storage reset.
- Three headless Chrome AudioContext autoplay warnings during demo-route discovery.
- No route-level browser errors were emitted.

Visual review notes:
- Desktop and 480px contact sheets show no blank screens, technical timeout screens, broken first-viewport layouts, unreadable contrast collapses, or mobile horizontal overflow.
- Static archive/history screens now show live-game CTAs where Phase 3 added them.
- The Chip dock remains visible in screenshots and does not create measured horizontal overflow.
