---
name: phase-packet
description: Generate a six-section MFD work packet when Kevin requests a repair item such as MFD-02, a numbered GOAT item, or a phase packet. Resolve the explicitly selected approved source; never substitute a different roadmap for an unavailable legacy source.
---

# MFD Packet Generator

Work from the repository root. The Markdown links below resolve relative to this skill file. Read [AGENTS.md](../../../AGENTS.md) before preparing a packet.

## Select the source

| Selector | Source / handling |
| --- | --- |
| `MFD-01` through `MFD-16` | [October 7 consistency repair plan](../../../docs/plans/file-consistency-2026-10-07.md). Find that exact row and its packet's rules. |
| Legacy GOAT item numbers or phase names | The original approved source must be explicitly identified and available. The formerly referenced Rev-2 roadmap is unavailable; report that gap. Do not treat the repair plan as its replacement contents. |
| Missing, ambiguous, or unknown selector | Identify the missing source/item before generating work. Do not invent an item, approval, or alias. |

Keep the two skill copies byte-identical. Use the current plan for active work; treat old audit statuses and embedded marathon instructions as historical references.

## Generate the packet

Read the selected finding and current files. Use that finding's touch-only paths, acceptance criteria, and packet rules; do not expand to every finding in the same packet. If the source has moved or a path/contract is uncertain, identify the exact gap.

Emit these six sections:

**CONTEXT:** Repository, actual branch/head, selected MFD ID or authenticated legacy item, source, and why the repair is needed.

**OBJECTIVE:** One outcome from the selected item.

**CONSTRAINTS:** Exact touch-only paths; applicable AGENTS rules; relevant shared-file/schema window; excluded files and behaviors. The three protected CODEX files require an explicit scoped exception; do not infer one from a generic task.

**VERIFICATION:** Exact commands from the plan and AGENTS for the touched scope, plus the item's acceptance checks. Distinguish static checks, executed tests, hosted evidence, and publication. State missing runtime/access rather than claiming tests passed.

**DELIVERABLE:** Candidate branch/diff, independent review, actual evidence, remaining limits, and the selected ledger row's updated status. A PR or merge is included only when already authorized.

**STOP CONDITIONS:** An unavailable source, conflicting work, unapproved save/math/protected-file impact, uncontrolled scope/cost growth, or another applicable AGENTS gate. Continue independent authorized work when a separate item is blocked.

Generating a packet does not authorize execution. Check the current session's explicit authorization: proceed within what it already covers without requesting a redundant GO; keep any additional hosted-work, merge, or release action pending until authorized. Obtain independent review before requesting merge.
