# MFD Public Release Readiness Matrix

Updated: 2026-05-05 17:34:29 CDT
Repo: `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`
Branch: `codex/chip-public-release-recovery`

## Summary

- Recovery status: green in clean clone
- P0 blockers: none confirmed
- Primary release strength: Chip now owns live onboarding clarity across the first playable weeks
- Highest remaining risks: later-season feature-introduction coverage, save/load/settings runtime coverage, bundle weight, and broader release polish outside the first-week critical path

| Feature | Wired? | Understandable? | Chip introduces it? | Runtime verified? | Risk | P0/P1/P2 next action |
| --- | --- | --- | --- | --- | --- | --- |
| Start / new game flow | Yes | Yes | Yes | Yes | Low | P0 none |
| First week shell | Yes | Yes | Yes | Yes | Low | P0 none |
| Week advance | Yes | Yes | Yes | Yes | Low | P0 none |
| Monday Briefing | Yes | Yes | Yes | Yes | Low | P0 none |
| Roster | Yes | Yes | Yes | Yes | Low | P0 none |
| Depth Chart | Yes | Yes | Yes | Yes | Low after nested-button fix | P0 none |
| Game Plan / coaching prep | Yes | Yes | Yes | Yes | Low after selector/runtime fix | P0 none |
| Trades | Yes | Yes | Yes | Yes | Low | P0 none after current-browser phone/desktop pass |
| Contracts / Cap Lab | Yes | Yes | Yes | Yes | Low | P0 none after current-browser phone/desktop pass |
| Team needs / analytics / supporting desks | Yes | Mostly | Partially | Partial | Medium | P1 continue progressive Chip introduction outside first-week critical path |
| Scouting / draft / offseason teaser | Yes | Mostly | Partially | No in this pass | Medium | P1 verify later-season intros in a follow-up release sweep |
| News / league pulse | Yes | Yes | Partially | Yes | Low | P1 expand Chip tie-ins only if repetition stays controlled |
| Save / load / settings | Yes | Mostly | Partially | Partial | Medium | P1 add a focused runtime pass for import/export/settings on current build |
| TTS scaffold | Yes, behind flag | Yes | No by default | Partial | Low | P2 keep behind `VITE_CHIP_TTS_ENABLED` until deliberate polish pass |
| Share scaffold | Yes, behind flag | Yes | No by default | Partial | Low | P2 keep behind `VITE_MFD_SHARE_ENABLED` until deliberate polish pass |
| Mobile tolerance | Yes | Yes | N/A | Yes | Low | P0 none after 390x844 Trade/Cap pass |
| Accessibility basics | Improved | Mostly | N/A | Yes for Trade/Cap P1 sweep | Low/Medium | P1 continue broader semantic audit later, but no Trade/Cap blocker found |
| Error / blank states | Mostly | Mostly | Partial | Yes for Trade/Cap P1 sweep | Low/Medium | P1 save/load/settings spot-check remains |
| Public release blockers | None confirmed | N/A | N/A | Yes for core recovery gates | Low | P0 none |

## Notes

- Runtime-verified core loop in this pass:
  - fresh dynasty setup
  - live Week 1 shell
  - Monday Briefing
  - Roster
  - Depth Chart
  - Game Plan
  - Week Advance
  - advance through Week 3
- Runtime-verified P1 hardening in this pass:
  - phone viewport `390x844`
  - desktop viewport `1366x900`
  - Trade Center incoming blank state and `Propose Trade` tab
  - Cap Lab card-mode candidate/projection tables
  - Cap Lab add/apply/cancel sandbox path
  - no phone overflow offenders, unnamed controls, or undersized controls in Trade/Cap pass
  - manifest served as JSON at `/MFD/manifest.json` with no browser console errors/warnings
- Engineering gates verified in clean clone:
  - `git diff --check`
  - install
  - typecheck
  - full design-system tests
  - full web tests at 209 files / 1282 tests
  - production build
  - save/RNG audit confirmed `SAVE_VERSION 35` was unchanged and no new sim randomness was introduced
- Save safety remained intact:
  - no save schema bump
  - no engine changes
  - no RNG-path edits

## Priority Readout

### P0

- None confirmed.

### P1

- Broader later-season Chip introduction audit
- Save/load/settings runtime pass
- Broader accessibility and blank-state sweep outside Trade/Cap
- Bundle-weight follow-up if public web delivery becomes sensitive

### P2

- TTS polish
- Share payload expansion
- Additional copy variants and release flavor
