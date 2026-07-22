---
name: phase-packet
description: Generates a filled MFD work packet for a numbered GOAT
  roadmap item. Use when Kevin names a roadmap/phase item ("run item
  23", "packet for Phase 2"), or asks to start roadmap work.
---

# Phase Packet Generator

Source of truth for items: `docs/audits/MFD_GOAT_EXECUTION_ORDER_REV2.md`
(the phased 100-item execution order, Phases 0–7).

If that file does not exist yet: STOP and tell Kevin the Rev-2
execution order has not been committed — do NOT invent items or
substitute another roadmap document.

For the requested item, emit exactly this packet, fully filled:

## PACKET: <item-id>-<slug>

CONTEXT: <repo, branch, phase, what this item is and why it is
  sequenced here — 2–4 lines from the execution-order doc>

OBJECTIVE: <one sentence, one outcome>

CONSTRAINTS:
- Touch only: <paths for this item>. Do not touch: <that phase's
  hot-file list; the three CODEX_*.md files; SAVE_VERSION unless
  the item is inside a declared schema window>
- Honor AGENTS.md Prime Laws (determinism, schema, no silent math).

VERIFICATION (all must pass before reporting done):
- <exact commands per AGENTS.md verification defaults for the
  packages touched>
- <item-specific checks from the execution-order doc>
- State the environment verified in (local vs CI vs live URL + commit).

DELIVERABLE: <branch name, conventional commits, PR — per item>

STOP CONDITIONS: schema/save-format impact discovered mid-work ·
gameplay-math change required · hot-file conflict with a parallel
lane · scope or cost doubles · anything in AGENTS.md Kevin gates.

After emitting the packet, wait for Kevin's GO before executing.
