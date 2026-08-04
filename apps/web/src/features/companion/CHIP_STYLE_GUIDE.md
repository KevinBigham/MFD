# Chip Voice & Copy Style Guide

How to write for Chip so every line sounds like the same coach. Guard tests in
`sidelineFlavor.test.ts`, `directChipCopy.test.ts`, and `ChipHost.test.tsx`
enforce most of this; when copy fails a guard, fix the copy, not the guard.

## Who Chip is

Chip is your assistant head coach: warm, blunt, football-native, and
consequence-aware. Chip talks like someone who has watched ten thousand hours
of tape and still loves Mondays. Never a narrator, never a tutorial popup,
never a hype man.

## Do

- Name the football reality: injuries, backups, cap space, morale, matchups,
  Advance Week locks.
- Lead with the action (`Must Do:`), then the where (`Where:`), then the cost
  (`Consequence:`).
- Keep sideline notes under `MAX_SIDELINE_NOTE_CHARS` (120). Keep every bubble
  under `MAX_CHIP_DIALOGUE_CHARS` (240) — use `composeWeeklyDialogueText`.
- Write lines that stand alone: a note can appear in any week of any dynasty.
- Use coach idioms: tape, the room, kickoff, camp, the table, headsets.
- Rotate variety through the deterministic flavor engine (`sidelineFlavor.ts`)
  keyed by dynasty seed + week. Never `Math.random()`.

## Don't

- No banned shorthand — guard regex rejects: vibe, feel(s), story, context,
  identity, foundation, momentum, real answer, good energy, tone setter, read,
  verify, confirm, check, review, compare, worth, use, sim, triage.
- No exclamation stacking, no emoji, no breaking the fourth wall about being
  an AI or a mascot (the one sanctioned wink is the easter-egg pool).
- No promises the sim cannot keep ("this guarantees a win").
- No generic filler ("great job!", "keep it up") without a football reason
  attached.

## Structure contracts

- Weekly guidance always fills: What changed / Why / Must Do / Recommended /
  Optional / Where / Deadline / Optional later / Consequence / Sideline note.
- Detail labels map to visual kinds via `splitChipContextDetail`
  (Must Do/Recommended/Optional -> decision, Deadline -> risk). New labels
  must be added there deliberately, not left to fall through to `note`.
- Index 0 of every flavor pool is the canonical line; unseeded callers must
  keep receiving it byte-for-byte.
- Seeded extras (sign-off, easter egg) are append-only and budget-guarded:
  they never push a line over 120 chars.

## Signature moves

- Sign-offs (`CHIP_SIGN_OFFS`): "Headsets on.", "That's the tape.", "We move."
- Stern closers on hard / All-Pro / Legend difficulty: "No excuses at this
  level.", "The standard does not bend.", "Details decide it at this level."
  Same facts, less sugar.
- Opponent callouts: seeded weeks may close with "Eyes on <opponent>." on a
  deterministic coin flip; unseeded callers never name opponents.
- Easter eggs: deterministic 1-in-12 weeks, outcome-agnostic, delight-first.
  They replace the situational note, so they must fit any week.
- Suffix priority: stern (difficulty) > opponent callout > sign-off. Every
  suffix is budget-guarded; if the combined line would exceed 120 chars, the
  plain line serves.
