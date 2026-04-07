# Mr. Football Dynasty — Canonical Game Event Contract v0

## Purpose
This contract is the shared language between:
- the current gameplay runtime
- future native sim internals
- launcher/runtime UI
- recap/autopsy systems
- rivalry and memory reducers
- save/import/export
- diagnostics and verification

The contract must be stable enough that engine internals can change without breaking player-facing meaning.

---

## Core Rules

1. **Append-only event stream.**
   Consumers never mutate historical events.
2. **Deterministic ordering.**
   Same seed + same inputs = same event sequence.
3. **Structured, not narrated.**
   Core events contain facts and tags, not prewritten flavor prose.
4. **Serializable.**
   Every event must be save/import safe.
5. **Versioned.**
   All payloads carry `schemaVersion`.
6. **Engine-agnostic.**
   Legacy and future native engines must both be able to emit the same schema.

---

## Envelope

```ts
interface GameEventEnvelope {
  schemaVersion: "0.1.0";
  gameId: string;
  season: number;
  week: number;
  sourceRuntime: "legacy" | "native" | "test-fixture";
  seed: string | number;
  sequence: number;          // monotonic within game
  timestampMode: "sim";     // not wall clock
  event: GameEvent;
}
```

---

## Base Event Shape

```ts
interface GameEventBase {
  type: GameEventType;
  quarter?: 1 | 2 | 3 | 4 | 5;
  clock?: string;            // MM:SS remaining in quarter
  possessionTeamId?: string;
  defenseTeamId?: string;
  score?: {
    home: number;
    away: number;
  };
  fieldState?: {
    down?: 1 | 2 | 3 | 4;
    distance?: number;
    yardLine?: number;       // offense-relative or standardized; must be consistent
    redZone?: boolean;
    goalToGo?: boolean;
  };
  tags?: string[];
}
```

---

## Event Types for v0

### Pregame / Meta
- `game_start`
- `coin_toss_result`
- `weather_snapshot`
- `pregame_matchup_summary`

### Drive
- `drive_start`
- `drive_end`

### Play Resolution
- `play_call`
- `trench_resolution`
- `pressure_resolution`
- `coverage_resolution`
- `play_result`

### Swing Events
- `turnover`
- `penalty`
- `injury`
- `explosive_play`
- `score`
- `fourth_down_decision`
- `sack`

### Adjustment / Transition
- `timeout`
- `two_minute_warning`
- `halftime_adjustment`
- `quarter_end`

### Finalization
- `game_end`
- `postgame_summary`

---

## Play Call Event

```ts
interface PlayCallEvent extends GameEventBase {
  type: "play_call";
  personnel: string;              // e.g. 11, 12, nickel, goal-line
  playFamily: "inside_run" | "outside_run" | "quick_pass" | "dropback" |
              "play_action" | "screen" | "rpo" | "qb_run" | "special_teams";
  tempo?: "normal" | "hurry" | "drain_clock";
  aggression?: "conservative" | "balanced" | "aggressive";
  contextFlags?: string[];        // red_zone, backed_up, 2_minute, revenge_game, etc.
}
```

## Structural Leverage Events

```ts
interface TrenchResolutionEvent extends GameEventBase {
  type: "trench_resolution";
  offenseWin: boolean;
  leverage: "decisive_loss" | "loss" | "neutral" | "win" | "decisive_win";
  runLane?: "closed" | "narrow" | "normal" | "wide";
}

interface PressureResolutionEvent extends GameEventBase {
  type: "pressure_resolution";
  pressure: "none" | "hurry" | "hit" | "sack_threat" | "sack";
  source?: "edge_left" | "edge_right" | "interior" | "blitz" | "coverage";
  containBroken?: boolean;
}

interface CoverageResolutionEvent extends GameEventBase {
  type: "coverage_resolution";
  shell?: string;
  leverage: "tight" | "contested" | "open" | "busted";
  disguiseWin?: boolean;
}
```

## Play Result Event

```ts
interface PlayResultEvent extends GameEventBase {
  type: "play_result";
  outcomeType:
    | "rush"
    | "completion"
    | "incompletion"
    | "scramble"
    | "sack"
    | "interception"
    | "fumble"
    | "touchdown"
    | "field_goal_good"
    | "field_goal_miss"
    | "punt"
    | "turnover_on_downs";
  yards: number;
  firstDown?: boolean;
  touchdown?: boolean;
  turnover?: boolean;
  epaBucket?: "very_bad" | "bad" | "neutral" | "good" | "elite";
  winProbDelta?: number;
  confidenceDelta?: Record<string, number>;
  trustDelta?: Record<string, number>;
  fatigueDelta?: Record<string, number>;
}
```

---

## Required v0 Tags
These tags are the fuel for recap, rivalry, and weekly hooks.

### Situation Tags
- `red_zone`
- `goal_to_go`
- `third_and_long`
- `fourth_down`
- `two_minute`
- `backed_up`
- `opening_script`
- `garbage_time`

### Football Process Tags
- `clean_pocket`
- `quick_pressure`
- `box_loaded`
- `light_box`
- `coverage_bust`
- `run_lane_created`
- `missed_tackle`
- `broken_contain`

### Story / Meaning Tags
- `rookie_error`
- `clutch`
- `collapse`
- `revenge_game`
- `rivalry_game`
- `weather_grind`
- `statement_drive`
- `momentum_swing`

---

## Derived Read Models (Not Core Events)
These are built from the event stream. They should be deterministic given the same event history.

### 1. Weekly Hook Read Model
```ts
interface WeeklyHookReadModel {
  footballMission: string;
  humanTension: string;
  mystery: string;
  legacyThread: string;
  supportingEvidence: string[];   // event ids / tags
}
```

### 2. Postgame Autopsy Read Model
```ts
interface PostgameAutopsyReadModel {
  topReasons: string[];           // exactly 3
  gotRight: string;
  misread: string;
  nextClue: string;
  supportingEvidence: string[];
}
```

### 3. Memory Deltas
```ts
interface MemoryDelta {
  rivalryHeat?: number;
  ownerPatience?: number;
  qbTrust?: Record<string, number>;
  rookieConfidence?: Record<string, number>;
  lockerRoomCredit?: Record<string, number>;
}
```

---

## Minimum v0 Coverage
A v0 implementation is acceptable only if it emits structured events for:
- game start and end
- every drive start and end
- every play call
- every play result
- every turnover
- every score
- every injury
- halftime adjustment

If a play cannot yet emit full structural leverage detail, it may emit a reduced payload, but it must still emit a valid `play_result`.

---

## Contract Safety Rules

### Save / Import
- event logs may be capped or rolled up, but rollups must preserve all values needed for read models
- schema version mismatches must fail gracefully
- import must not execute arbitrary code or trust event text blindly

### UI Boundary
- core event objects should avoid presentation strings where possible
- recap/autopsy strings belong in read-model generation layers, not in core gameplay events

### Testing
- golden fixtures must cover at least:
  - normal clean game
  - weather game
  - turnover-heavy game
  - comeback game
  - rookie-QB meltdown game
  - rivalry game

---

## Example v0 Event

```json
{
  "schemaVersion": "0.1.0",
  "gameId": "2026-W09-CHI-GB",
  "season": 2026,
  "week": 9,
  "sourceRuntime": "legacy",
  "seed": "2948891",
  "sequence": 184,
  "timestampMode": "sim",
  "event": {
    "type": "play_result",
    "quarter": 4,
    "clock": "03:42",
    "possessionTeamId": "CHI",
    "defenseTeamId": "GB",
    "score": {"home": 20, "away": 17},
    "fieldState": {
      "down": 3,
      "distance": 8,
      "yardLine": 31,
      "redZone": false,
      "goalToGo": false
    },
    "tags": ["two_minute", "quick_pressure", "rookie_error", "momentum_swing"],
    "outcomeType": "interception",
    "yards": 0,
    "firstDown": false,
    "touchdown": false,
    "turnover": true,
    "epaBucket": "very_bad",
    "winProbDelta": -0.18,
    "confidenceDelta": {"QB_CHI_12": -2, "DB_GB_23": 1},
    "trustDelta": {"QB_CHI_12": -1, "OC_CHI": -1},
    "fatigueDelta": {"DL_GB_FRONT": 1}
  }
}
```

---

## First Consumers
The first consumers of this contract should be:
1. event inspector
2. weekly hook generator
3. postgame autopsy generator
4. rivalry / memory reducer
5. contract verification fixtures

Do not let later consumers force premature schema bloat.
