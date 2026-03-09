# MFD Event Consumer Packet v1

> **Contract source of truth.** Every shape in this document is generated from
> the actual builders in `src/systems/events/`. If this doc disagrees with the
> code, the code wins — file a bug.

---

## 1. Schema Version

```
"0.1.0"
```

Exported as `SCHEMA_VERSION` from `src/systems/events/event-types.js`.

---

## 2. Event Envelope (top-level shape)

Every game event has exactly these 14 fields at the top level.
No field may be added, removed, or renamed without a schema version bump.

| Field          | Type     | Notes                                           |
|----------------|----------|-------------------------------------------------|
| `schemaVersion`| `string` | Always `"0.1.0"` for this contract              |
| `eventName`    | `string` | One of the 13 canonical names below              |
| `seq`          | `number` | Monotonically increasing per game, 1-based       |
| `gameId`       | `string` | Stable game identifier                           |
| `timestamp`    | `number` | Unix epoch ms (injected from gameState)          |
| `quarter`      | `number` | 0 = pre-game, 1-4 = regulation, 5+ = OT         |
| `clock`        | `number` | Seconds remaining in quarter (900 = 15:00)       |
| `possession`   | `string` | `"home"`, `"away"`, or `""` (neutral events)     |
| `fieldPos`     | `number` | 0-100 from possessing team's goal line           |
| `down`         | `number` | 0 when not in a down (scores, game start/end)    |
| `yardsToGo`    | `number` | 0 when not in a down                             |
| `homeScore`    | `number` | Current home score at event time                 |
| `awayScore`    | `number` | Current away score at event time                 |
| `payload`      | `object` | Event-specific data (see per-event docs below)   |

### Canonical JSON Example

```json
{
  "schemaVersion": "0.1.0",
  "eventName": "game_start",
  "seq": 1,
  "gameId": "golden-001",
  "timestamp": 1700000001000,
  "quarter": 0,
  "clock": 900,
  "possession": "",
  "fieldPos": 0,
  "down": 0,
  "yardsToGo": 0,
  "homeScore": 0,
  "awayScore": 0,
  "payload": {
    "homeTeam": "Hawks",
    "awayTeam": "Titans",
    "weather": { "temp": 72, "precip": "DOME", "wind": 0 },
    "seed": 12345,
    "week": 5,
    "year": 2026
  }
}
```

---

## 3. Supported Event Names (13 total)

Exported as `EVENT_NAMES` from `src/systems/events/event-types.js`.

| Constant               | Wire value               | Emitter method              |
|-------------------------|--------------------------|-----------------------------|
| `GAME_START`            | `"game_start"`           | `emitGameStart()`           |
| `DRIVE_START`           | `"drive_start"`          | `emitDriveStart()`          |
| `PLAY_CALL`             | `"play_call"`            | `emitPlayCall()`            |
| `TRENCH_RESOLUTION`     | `"trench_resolution"`    | `emitTrenchResolution()`    |
| `PRESSURE_RESOLUTION`   | `"pressure_resolution"`  | `emitPressureResolution()`  |
| `PLAY_RESULT`           | `"play_result"`          | `emitPlayResult()`          |
| `TURNOVER`              | `"turnover"`             | `emitTurnover()`            |
| `PENALTY`               | `"penalty"`              | `emitPenalty()`             |
| `INJURY`                | `"injury"`               | `emitInjury()`              |
| `SCORE`                 | `"score"`                | `emitScore()`               |
| `HALFTIME_ADJUSTMENT`   | `"halftime_adjustment"`  | `emitHalftimeAdjustment()`  |
| `DRIVE_END`             | `"drive_end"`            | `emitDriveEnd()`            |
| `GAME_END`              | `"game_end"`             | `emitGameEnd()`             |

### Enum / Tag Conventions

- Event names are **snake_case** strings.
- Constants are **UPPER_SNAKE_CASE** keys in `EVENT_NAMES`.
- `possession`: `"home"` | `"away"` | `""` (never null).
- `payload.type` on `play_result`: `"run"` | `"complete"` | `"incomplete"` | `"sack"` | `"fumble"` | `"interception"`.
- `payload.type` on `turnover`: `"fumble"` | `"interception"`.
- `payload.type` on `score`: `"touchdown"` | `"field_goal"` | `"safety"`.
- `payload.team` on `score`/`penalty`: `"home"` | `"away"`.
- `payload.playType` on `play_call`: `"run"` | `"pass"`.
- Letter grades: `"A"` | `"B"` | `"C"` | `"D"` | `"N/A"`.
- Boolean flags: always literal `true`/`false`, never `0`/`1`.

---

## 4. Drive Sequence Example

A complete drive (drive_start through drive_end) showing the typical
play-by-play event cadence. This is Hawks drive #1 from the golden fixture.

```json
[
  {
    "schemaVersion": "0.1.0",
    "eventName": "drive_start",
    "seq": 2,
    "gameId": "golden-001",
    "timestamp": 1700000002000,
    "quarter": 1,
    "clock": 900,
    "possession": "home",
    "fieldPos": 25,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "driveNum": 1,
      "startFieldPos": 25,
      "team": "home",
      "startClock": 900,
      "startQuarter": 1
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_call",
    "seq": 3,
    "gameId": "golden-001",
    "timestamp": 1700000003000,
    "quarter": 1,
    "clock": 900,
    "possession": "home",
    "fieldPos": 25,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "playId": "hb_dive",
      "playLabel": "HB Dive",
      "playType": "run",
      "formation": null,
      "defenseCall": "cover_3",
      "defenseLabel": "Cover 3",
      "isUserCall": true
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "trench_resolution",
    "seq": 4,
    "gameId": "golden-001",
    "timestamp": 1700000004000,
    "quarter": 1,
    "clock": 900,
    "possession": "home",
    "fieldPos": 25,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "olGrade": 72,
      "dlGrade": 65,
      "runLaneOpen": true,
      "pocketIntact": true,
      "matchups": [
        {
          "off": "OL (blk:72)",
          "def": "DL (shed:65)",
          "winner": "off",
          "desc": "O-line mauls the front"
        }
      ]
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_result",
    "seq": 5,
    "gameId": "golden-001",
    "timestamp": 1700000005000,
    "quarter": 1,
    "clock": 872,
    "possession": "home",
    "fieldPos": 30,
    "down": 2,
    "yardsToGo": 5,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "type": "run",
      "yards": 5,
      "player": "Marcus Bell",
      "passer": null,
      "desc": "Marcus Bell gains 5 yards",
      "big": false,
      "isRush": true,
      "isScramble": false,
      "firstDown": false,
      "touchdown": false
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_call",
    "seq": 6,
    "gameId": "golden-001",
    "timestamp": 1700000006000,
    "quarter": 1,
    "clock": 872,
    "possession": "home",
    "fieldPos": 30,
    "down": 2,
    "yardsToGo": 5,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "playId": "slant",
      "playLabel": "Quick Slant",
      "playType": "pass",
      "formation": null,
      "defenseCall": "man_press",
      "defenseLabel": "Man Press",
      "isUserCall": true
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "pressure_resolution",
    "seq": 7,
    "gameId": "golden-001",
    "timestamp": 1700000007000,
    "quarter": 1,
    "clock": 872,
    "possession": "home",
    "fieldPos": 30,
    "down": 2,
    "yardsToGo": 5,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "pressured": false,
      "sacked": false,
      "rusher": null,
      "blocker": null,
      "timeInPocket": 2.8,
      "qbEscaped": false
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_result",
    "seq": 8,
    "gameId": "golden-001",
    "timestamp": 1700000008000,
    "quarter": 1,
    "clock": 848,
    "possession": "home",
    "fieldPos": 42,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "type": "complete",
      "yards": 12,
      "player": "Jaylen Swift",
      "passer": "Drew Cannon",
      "desc": "Complete to Jaylen Swift for 12 yards!",
      "big": false,
      "isRush": false,
      "isScramble": false,
      "firstDown": true,
      "touchdown": false
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_call",
    "seq": 9,
    "gameId": "golden-001",
    "timestamp": 1700000009000,
    "quarter": 1,
    "clock": 848,
    "possession": "home",
    "fieldPos": 42,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "playId": "go_route",
      "playLabel": "Go Route",
      "playType": "pass",
      "formation": null,
      "defenseCall": "cover_2",
      "defenseLabel": "Cover 2",
      "isUserCall": true
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "pressure_resolution",
    "seq": 10,
    "gameId": "golden-001",
    "timestamp": 1700000010000,
    "quarter": 1,
    "clock": 848,
    "possession": "home",
    "fieldPos": 42,
    "down": 1,
    "yardsToGo": 10,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "pressured": true,
      "sacked": false,
      "rusher": "Deon Crush",
      "blocker": "LT Martinez",
      "timeInPocket": 1.9,
      "qbEscaped": false
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "play_result",
    "seq": 11,
    "gameId": "golden-001",
    "timestamp": 1700000011000,
    "quarter": 1,
    "clock": 825,
    "possession": "home",
    "fieldPos": 100,
    "down": 0,
    "yardsToGo": 0,
    "homeScore": 0,
    "awayScore": 0,
    "payload": {
      "type": "complete",
      "yards": 58,
      "player": "Jaylen Swift",
      "passer": "Drew Cannon",
      "desc": "BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!",
      "big": true,
      "isRush": false,
      "isScramble": false,
      "firstDown": false,
      "touchdown": true
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "score",
    "seq": 12,
    "gameId": "golden-001",
    "timestamp": 1700000012000,
    "quarter": 1,
    "clock": 825,
    "possession": "home",
    "fieldPos": 100,
    "down": 0,
    "yardsToGo": 0,
    "homeScore": 7,
    "awayScore": 0,
    "payload": {
      "type": "touchdown",
      "points": 7,
      "team": "home",
      "player": "Jaylen Swift",
      "desc": "Jaylen Swift 58-yd TD reception from Drew Cannon (PAT good)",
      "homeScore": 7,
      "awayScore": 0
    }
  },
  {
    "schemaVersion": "0.1.0",
    "eventName": "drive_end",
    "seq": 13,
    "gameId": "golden-001",
    "timestamp": 1700000013000,
    "quarter": 1,
    "clock": 825,
    "possession": "home",
    "fieldPos": 100,
    "down": 0,
    "yardsToGo": 0,
    "homeScore": 7,
    "awayScore": 0,
    "payload": {
      "driveNum": 1,
      "result": "touchdown",
      "plays": 3,
      "yards": 75,
      "timeUsed": 75,
      "startFieldPos": 25,
      "endFieldPos": 100
    }
  }
]
```

---

## 5. Weekly Hook Output Shape

Built by `buildWeeklyHook(events, context)` in `src/systems/events/weekly-hook.js`.

Context input: `{ userSide, week, year, opponent }`.

```json
{
  "week": 5,
  "year": 2026,
  "opponent": "Titans",
  "result": "W 17-7",
  "homeScore": 17,
  "awayScore": 7,
  "headlines": [
    "Victory 17-7 over Titans.",
    "Offense struggled — only 115 total yards.",
    "Player of the game: Jaylen Swift (2 rec, 70 yds, 1 TD).",
    "1 player injured during the game."
  ],
  "keyPlays": [
    {
      "quarter": 1,
      "clock": 825,
      "type": "play_result",
      "desc": "BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!",
      "impact": "big_play"
    },
    {
      "quarter": 1,
      "clock": 825,
      "type": "score",
      "desc": "Jaylen Swift 58-yd TD reception from Drew Cannon (PAT good)",
      "impact": "score"
    },
    {
      "quarter": 1,
      "clock": 720,
      "type": "turnover",
      "desc": "Fumble by Marcus Bell, forced by LB Watts. Titans recover.",
      "impact": "turnover"
    },
    {
      "quarter": 2,
      "clock": 422,
      "type": "play_result",
      "desc": "BREAKAWAY! Jalen Rivers breaks free for 25 yards!",
      "impact": "big_play"
    },
    {
      "quarter": 2,
      "clock": 400,
      "type": "play_result",
      "desc": "BIG PLAY! Trey Palmer connects with Rico Flash for 45 yards! TOUCHDOWN!",
      "impact": "big_play"
    }
  ],
  "injuries": [
    {
      "quarter": 1,
      "clock": 750,
      "player": "CB Revis Jr",
      "pos": "CB",
      "team": "away",
      "type": "hamstring",
      "severity": "questionable",
      "gamesOut": 1,
      "desc": "CB Revis Jr leaves with a hamstring injury."
    }
  ],
  "turnovers": [
    {
      "quarter": 1,
      "clock": 720,
      "type": "fumble",
      "player": "Marcus Bell",
      "forcedBy": "LB Watts",
      "fieldPos": 48,
      "desc": "Fumble by Marcus Bell, forced by LB Watts. Titans recover."
    },
    {
      "quarter": 4,
      "clock": 575,
      "type": "interception",
      "player": "Trey Palmer",
      "forcedBy": "S Williams",
      "fieldPos": 30,
      "desc": "Interception by S Williams at the 30."
    }
  ],
  "mvp": {
    "name": "Jaylen Swift",
    "stat": "2 rec, 70 yds, 1 TD"
  },
  "driveEfficiency": {
    "drives": 4,
    "scoringDrives": 3,
    "pct": 75
  },
  "pressureRate": 0,
  "rzEff": 100,
  "coverageWin": 44,
  "runLaneAdv": 100
}
```

### Weekly Hook Field Reference

| Field              | Type       | Notes                                     |
|--------------------|------------|-------------------------------------------|
| `week`             | `number`   | From context                              |
| `year`             | `number`   | From context                              |
| `opponent`         | `string`   | From context                              |
| `result`           | `string`   | Format: `"W 17-7"` or `"L 7-17"`         |
| `homeScore`        | `number`   | From game_end payload                     |
| `awayScore`        | `number`   | From game_end payload                     |
| `headlines`        | `string[]` | 1-5 evidence-backed plain English lines   |
| `keyPlays`         | `object[]` | Up to 5, fields: quarter/clock/type/desc/impact |
| `injuries`         | `object[]` | From injury events                        |
| `turnovers`        | `object[]` | From turnover events                      |
| `mvp`              | `object`   | `{ name: string, stat: string }`          |
| `driveEfficiency`  | `object`   | `{ drives, scoringDrives, pct }`          |
| `pressureRate`     | `number`   | 0-100                                     |
| `rzEff`            | `number`   | 0-100 red zone efficiency                 |
| `coverageWin`      | `number`   | 0-100 coverage grade                      |
| `runLaneAdv`       | `number`   | 0-100 run blocking grade                  |

---

## 6. Postgame Autopsy Output Shape

Built by `buildPostgameAutopsy(events, context)` in `src/systems/events/postgame-autopsy.js`.

Context input: `{ userSide, homeTeam, awayTeam }`.

```json
{
  "summary": "Hawks handled Titans 17-7. Solid win across the board.",
  "phases": [
    {
      "quarter": 1,
      "label": "Quarter 1",
      "narrative": "Q1: 6 plays, 69 yards, 1 explosive play, 1 scoring play, 1 turnover.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "trench_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "Marcus Bell gains 5 yards" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "pressure_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "Complete to Jaylen Swift for 12 yards!" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "pressure_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!" }
      ]
    },
    {
      "quarter": 2,
      "label": "Quarter 2",
      "narrative": "Q2: 2 plays, 70 yards, 2 explosive plays, 1 scoring play.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "trench_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "BREAKAWAY! Jalen Rivers breaks free for 25 yards!" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "play_result", "desc": "BIG PLAY! Trey Palmer connects with Rico Flash for 45 yards! TOUCHDOWN!" },
        { "eventName": "score", "desc": "Rico Flash 45-yd TD reception from Trey Palmer (PAT good)" },
        { "eventName": "drive_end", "desc": "" },
        { "eventName": "halftime_adjustment", "desc": "" }
      ]
    },
    {
      "quarter": 3,
      "label": "Quarter 3",
      "narrative": "Q3: 1 plays, 7 yards, 1 scoring play.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "play_result", "desc": "Marcus Bell gains 7 yards" },
        { "eventName": "score", "desc": "K Nolan 42-yd FG is GOOD!" },
        { "eventName": "drive_end", "desc": "" }
      ]
    },
    {
      "quarter": 4,
      "label": "Quarter 4",
      "narrative": "Q4: 3 plays, 30 yards, 2 explosive plays, 1 scoring play, 1 turnover.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "pressure_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "Trey Palmer INTERCEPTED by S Williams!" },
        { "eventName": "turnover", "desc": "Interception by S Williams at the 30." },
        { "eventName": "drive_end", "desc": "" },
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "play_result", "desc": "Drew Cannon scrambles for 12 yards!" },
        { "eventName": "play_result", "desc": "BREAKAWAY! Marcus Bell breaks free for 18 yards! TOUCHDOWN!" }
      ]
    }
  ],
  "trenchReport": {
    "grade": "B",
    "olWins": 2,
    "dlWins": 1,
    "narrative": "O-line won 2 of 3 battles. Solid protection and run blocking."
  },
  "pressureReport": {
    "sacks": 1,
    "pressures": 3,
    "rate": 75,
    "narrative": "QB was pressured on 3 of 4 dropbacks (75%). 1 sack taken. Protection was a major issue."
  },
  "turnoverBattle": {
    "forced": 1,
    "lost": 1,
    "margin": 0,
    "narrative": "Turnover battle even at 1 each."
  },
  "bigPlays": [
    {
      "quarter": 1,
      "clock": 825,
      "player": "Jaylen Swift",
      "yards": 58,
      "desc": "BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!",
      "side": "home"
    },
    {
      "quarter": 2,
      "clock": 422,
      "player": "Jalen Rivers",
      "yards": 25,
      "desc": "BREAKAWAY! Jalen Rivers breaks free for 25 yards!",
      "side": "away"
    },
    {
      "quarter": 2,
      "clock": 400,
      "player": "Rico Flash",
      "yards": 45,
      "desc": "BIG PLAY! Trey Palmer connects with Rico Flash for 45 yards! TOUCHDOWN!",
      "side": "away"
    },
    {
      "quarter": 4,
      "clock": 545,
      "player": "Drew Cannon",
      "yards": 12,
      "desc": "Drew Cannon scrambles for 12 yards!",
      "side": "home"
    },
    {
      "quarter": 4,
      "clock": 520,
      "player": "Marcus Bell",
      "yards": 18,
      "desc": "BREAKAWAY! Marcus Bell breaks free for 18 yards! TOUCHDOWN!",
      "side": "home"
    }
  ],
  "missedOpportunities": [],
  "adjustmentImpact": {
    "adjustment": "Blitz Heavy",
    "preStats": { "plays": 8, "yards": 139, "ypp": 17.4 },
    "postStats": { "plays": 4, "yards": 37, "ypp": 9.3 },
    "narrative": "Halftime adjustment: Blitz Heavy. Pre-adjustment: 17.4 yds/play (8 plays). Post-adjustment: 9.3 yds/play (4 plays)."
  },
  "playerGrades": [
    {
      "name": "Jaylen Swift",
      "grade": "B",
      "score": 13,
      "stats": {
        "name": "Jaylen Swift",
        "comp": 0, "att": 0, "passYds": 0, "passTD": 0, "int": 0,
        "rushAtt": 0, "rushYds": 0, "rushTD": 0,
        "rec": 2, "recYds": 70, "recTD": 1,
        "sacks": 0, "forcedFumbles": 0, "tackles": 0
      }
    }
  ],
  "coachingGrade": {
    "grade": "A",
    "narrative": "Outstanding gameplan execution. Minimal mistakes."
  }
}
```

> **Note:** `playerGrades` is truncated to 1 entry above for brevity. The full
> output contains up to 10 entries sorted by score descending.

### Postgame Autopsy Field Reference

| Field                | Type       | Notes                                          |
|----------------------|------------|-------------------------------------------------|
| `summary`            | `string`   | 1-sentence game summary                        |
| `phases`             | `object[]` | Exactly 4 entries (Q1-Q4)                      |
| `phases[].quarter`   | `number`   | 1-4                                            |
| `phases[].label`     | `string`   | `"Quarter N"`                                  |
| `phases[].narrative` | `string`   | Evidence-backed quarter summary                |
| `phases[].events`    | `object[]` | Up to 10, `{ eventName, desc }`                |
| `trenchReport`       | `object`   | `{ grade, olWins, dlWins, narrative }`         |
| `pressureReport`     | `object`   | `{ sacks, pressures, rate, narrative }`        |
| `turnoverBattle`     | `object`   | `{ forced, lost, margin, narrative }`          |
| `bigPlays`           | `object[]` | `{ quarter, clock, player, yards, desc, side }`|
| `missedOpportunities`| `object[]` | `{ driveNum, startFieldPos, yards, result, narrative }` |
| `adjustmentImpact`   | `object`   | `{ adjustment, preStats, postStats, narrative }`|
| `playerGrades`       | `object[]` | Up to 10, `{ name, grade, score, stats }`      |
| `coachingGrade`      | `object`   | `{ grade, narrative }`                         |

---

## 7. Reduced-Fidelity / Placeholder Fields

These fields are structurally present but have placeholder-level resolution
in the current v0 implementation:

| Field / Area                         | Status      | Notes                                     |
|--------------------------------------|-------------|-------------------------------------------|
| `trench_resolution.matchups`         | Placeholder | Single matchup string, not full OL/DL map |
| `trench_resolution.olGrade/dlGrade`  | Placeholder | Raw 0-100 int, not positional breakdown   |
| `pressure_resolution.timeInPocket`   | Placeholder | Simulated float, not physics-backed       |
| `play_call.formation`                | Placeholder | Always `null` in v0                       |
| `weekly hook: pressureRate`          | Approximate | Derived from sack count, not snap-level   |
| `weekly hook: coverageWin`           | Approximate | Inverse of opponent pass efficiency       |
| `weekly hook: runLaneAdv`            | Approximate | Derived from rush yards per play          |
| `weekly hook: rzEff`                 | Approximate | Based on drive end position, not true RZ  |
| `autopsy: adjustmentImpact.ypp`     | Approximate | All plays, not just user-side plays       |

Codex should consume these fields but **must not** build UI that promises
precision these fields don't deliver. Display as grades/bars, not exact stats.

---

## 8. Invariants Codex Must Not Break

1. **Envelope shape is frozen.** The 14 top-level fields must always be present on every event. Do not add, remove, or rename fields.
2. **Event name set is frozen.** The 13 event names are the complete set. Do not invent new event names.
3. **`schemaVersion` must be `"0.1.0"`.** Do not bump without gameplay-side agreement.
4. **`seq` is monotonically increasing** within a game, 1-based, no gaps.
5. **`gameId` is constant** across all events in a single game.
6. **`payload` is always a plain object**, never null, never an array.
7. **All events are JSON-serializable.** No functions, no circular refs, no undefined values.
8. **`possession` is `"home"`, `"away"`, or `""`.** Never null, never a team name.
9. **Weekly hook and autopsy outputs are pure functions** of (events, context). Same input = same output. No side effects.
10. **The golden fixture** (`tests/fixtures/game-events/golden-game.js`) is the canonical reference. If the builders change, the fixture tests must still pass.
11. **Do not import from `src/systems/`** in launcher/UI code. Consume only the serialized JSON shapes documented here.
12. **`keyPlays[].impact`** is one of: `"big_play"`, `"turnover"`, `"score"`. No other values.
13. **Letter grades** are one of: `"A"`, `"B"`, `"C"`, `"D"`, `"N/A"`. No plus/minus, no numeric scales in grade fields.

---

## 9. Consumer Context Object

Both `buildWeeklyHook` and `buildPostgameAutopsy` require a context object:

```json
{
  "userSide": "home",
  "homeTeam": "Hawks",
  "awayTeam": "Titans",
  "week": 5,
  "year": 2026,
  "opponent": "Titans"
}
```

| Field      | Type     | Used by         | Notes                          |
|------------|----------|-----------------|--------------------------------|
| `userSide` | `string` | hook + autopsy  | `"home"` or `"away"`           |
| `homeTeam` | `string` | autopsy         | Team name for narratives       |
| `awayTeam` | `string` | autopsy         | Team name for narratives       |
| `week`     | `number` | hook            | Season week number             |
| `year`     | `number` | hook            | Season year                    |
| `opponent` | `string` | hook            | Opponent team name for display |
