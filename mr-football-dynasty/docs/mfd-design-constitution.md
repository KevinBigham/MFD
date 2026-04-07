# Mr. Football Dynasty — Design Constitution

## Purpose
This document is the product north star for Mr. Football Dynasty (MFD). It exists to stop random feature sprawl, protect the soul of the game, and give every future decision a simple test:

**Does this make MFD a better football universe generator?**

If the answer is no, it does not belong in the current build.

---

## One-Sentence Fantasy
**Mr. Football Dynasty is the best football universe generator in gaming: a sim where football logic is believable, franchise decisions echo for years, presentation turns management into theater, and every dynasty becomes a story worth remembering.**

---

## The GOAT Equation

**Football Truth × Franchise Consequence × Human Drama × Presentation Theater × Infinite Replayability**

If any one of those collapses, the game becomes less than legendary.

---

## The Five Pillars

### 1. Football Truth
The game must feel like football, not spreadsheet cosplay.

What players actually notice:
- trench play
- pressure and protection
- QB volatility
- scheme fit
- health and fatigue
- game script
- red-zone compression
- late-game leverage
- weather
- playoff variance

### 2. Franchise Consequence Density
Every major action must solve one problem and create another.

Examples:
- a free-agent signing affects cap flexibility, comp picks, development reps, locker-room pecking order, and owner expectations
- a coaching hire affects scheme identity, player fit, upgrade priorities, and media narrative
- a trade affects not just roster strength, but timeline, cash pressure, scouting trust, and future draft leverage

### 3. Human Drama
People in the sim are not rating bundles.

Players, coaches, owners, agents, fans, and media all need wants, beliefs, patience, memory, and reactions.

### 4. Presentation Theater
Presentation is not garnish. It is a meaning amplifier.

Draft night, rivalry week, owner reviews, postgame podiums, awards season, and playoff runs should feel like events.

### 5. Infinite Replayability
There must be multiple valid ways to build a winner and multiple valid worlds to build in.

Long-term targets:
- NFL-style universe
- fictional custom universe
- challenge universe
- seeded shareable universes
- mod-friendly data surfaces

---

## What “Realistic” Means in MFD
MFD does **not** aim for total physical simulation.
MFD aims for **believable consequence simulation**.

That means:
- realistic enough that surprising outcomes still make football sense
- abstract enough to stay fast, testable, and fun
- detailed where humans feel football most strongly
- simplified where detail adds little meaning

Believability beats exhaustiveness.

---

## Simulation Doctrine

### Layer 1 — League / Era
This layer creates historical texture.

Examples:
- cap growth
- positional value cycles
- draft class texture
- league injury climate
- owner patience climate
- coaching tree diffusion
- parity level

### Layer 2 — Franchise Identity
This layer makes two equally rated teams feel different.

Examples:
- scheme coherence
- locker-room stability
- development capacity
- scouting sharpness
- medical risk culture
- financial flexibility
- market magnetism
- discipline and volatility

### Layer 3 — Weekly Matchup Prep
This layer translates team identity into this week’s football plan.

Examples:
- protection emphasis
- blitz appetite
- shell mix
- target share expectations
- tempo appetite
- 4th-down aggression
- weather adjustments
- upset danger signs

### Layer 4 — Drive
This layer creates game pacing and emotional football.

Every drive should carry state:
- field position
- urgency
- timeout economy
- fatigue
- predictability
- confidence swing
- crowd stress

### Layer 5 — Play
The play layer resolves football in four beats:
1. call intent
2. structural leverage
3. skill contest
4. aftermath

Structural leverage comes first:
- trench win/loss
- pressure
- box count
- coverage shell
- contain integrity
- run-lane quality

### Layer 6 — Memory
Every meaningful event writes to long-term memory, not just a box score.

Examples:
- rookie melts under pressure
- captain plays through injury
- coach turtles away a lead
- WR repeatedly bails out bad throws
- rivalry game creates a scar

Narrative must consume structured football memory, not invent truth from thin air.

---

## Ritual Doctrine
MFD should operate as four nested rituals.

### Weekly Loop
Every week the player should see:
- one football problem
- one human tension
- one mystery
- one legacy thread

### Game Day Loop
The player should intervene at high-drama leverage beats, not drown in meaningless taps.

### Offseason Loop
The offseason should be broken into clear acts:
- reckoning
- market
- discovery
- draft theater
- identity camp

### Dynasty-Era Loop
The game must remember:
- rings
- scars
- coaching trees
- records
- rivalry history
- signature drafts
- iconic collapses
- fan memory

---

## Healthy Retention Guardrails
MFD should be sticky because players care, not because they are trapped.

Never do this:
- mandatory daily logins
- punishment for time away
- loot-box progression hooks
- fake urgency timers
- reward-category bloat
- manipulative scarcity
- opaque systems that create helplessness
- busywork added only to increase session length

Always prefer:
- clear goals
- real agency
- learning through feedback
- curiosity hooks
- emotionally meaningful progress
- optional community sharing

---

## The Seven Design Laws

1. **Every screen answers “what matters now?”**
2. **Every major choice casts a shadow into the future.**
3. **Every loss teaches something.**
4. **Every session ends with a football hook, a human hook, and a legacy hook.**
5. **Narrative follows football truth.**
6. **No single optimal path to winning.**
7. **The world remembers what the user changed.**

---

## Anti-Goals

Do not:
- chase Madden’s battlefield
- confuse complexity with depth
- build disconnected “cool systems”
- let temporary hybrid architecture define permanent design
- bury the player in chores
- pursue realism in places the player cannot feel

---

## North-Star Metrics
These are product metrics, not analytics vanity metrics.

### Clarity Test
Within 30 seconds of loading a save, the player knows:
- what matters this week
- what decision is urgent
- what story is in motion

### Consequence Test
Every major decision should have at least two visible downstream effects.

### Teach-Back Test
Every game result should produce a recap that explains, in plain language, why it tilted the way it did.

### Hook Test
Every session should end with:
- one football question
- one human question
- one legacy question

### Identity Test
An 86-overall team should feel different from another 86-overall team.

### Memory Test
The game should be able to tell you not just what happened, but why the season mattered.

---

## Current Architecture Consequence
Because the current project already has a hybrid launcher/runtime shape, strict lane ownership, contract verification, and a playable route, the next move is **not** a full engine rewrite.

The next move is:

## **Build the spine first.**

That means:
1. define a canonical game event contract
2. make the current gameplay runtime emit it
3. let launcher, recap, rivalry, memory, dynasty history, and diagnostics consume it
4. progressively replace internals behind the same contract

This keeps the game shippable while making the architecture convergent.

---

## Non-Negotiable Immediate Priority
The first coding phase must deliver:
- a shared canonical game event contract
- deterministic event emission for core football moments
- a launcher-visible event feed / inspector
- a weekly command desk shell
- a postgame autopsy shell
- contract fixtures and verification

Until those exist, feature work should be treated with suspicion.
