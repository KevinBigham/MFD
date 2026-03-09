# MFD Event Consumer Packet v1

> **Schema version:** `0.1.0`
> **Owner:** Claude (gameplay/producer lane)
> **Audience:** Codex (launcher/consumer lane), Architect
> **Status:** Frozen — additive optional fields only in `0.1.x`

This document defines the exact shapes a consumer (launcher, Command Desk,
Postgame Autopsy) will receive from the gameplay event spine. Every example
below is generated from the canonical golden-game fixture and the actual
producer code — not hand-typed.

---

## 1. Event Envelope Shape

Every game event emitted by the producer uses this top-level envelope.
All 14 fields are always present. No field is ever `undefined`.

```
{
  "schemaVersion": string,   // "0.1.0" — frozen
  "eventName":     string,   // one of the 13 canonical names below
  "seq":           number,   // monotonic, 1-based, per game session
  "gameId":        string,   // stable identifier for the game session
  "timestamp":     number,   // ms since epoch (injected from gameState)
  "quarter":       number,   // 0 = pre-game, 1-4 = regulation, 5+ = OT
  "clock":         number,   // seconds remaining in quarter (900 = 15:00)
  "possession":    string,   // "home" | "away" | "" (empty for neutral events)
  "fieldPos":      number,   // 0-100 (own 0 to opponent's end zone)
  "down":          number,   // 0-4 (0 for non-play events)
  "yardsToGo":     number,   // 0+ (0 for non-play events)
  "homeScore":     number,   // current home score at time of event
  "awayScore":     number,   // current away score at time of event
  "payload":       object    // event-specific data (see below)
}
```

### Canonical Event Names

These 13 names are frozen in `0.1.x`. Do not rename, recase, or repurpose.

| Name | Description |
|------|-------------|
| `game_start` | Session begins. Contains teams, weather, seed. |
| `drive_start` | A new drive begins. |
| `play_call` | Offensive and defensive play selection. |
| `trench_resolution` | O-line vs D-line battle outcome. |
| `pressure_resolution` | Pass rush pressure outcome. |
| `play_result` | Final result of a play (yards, big play, TD, etc). |
| `turnover` | Fumble or interception. |
| `penalty` | Flag thrown. |
| `injury` | Player injury during game. |
| `score` | Points scored (TD, FG, safety, 2pt). |
| `halftime_adjustment` | Coaching adjustment at halftime. |
| `drive_end` | Drive concludes with result. |
| `game_end` | Session ends. Final scores and MVP. |

### Enum / Tag Conventions

- `possession`: `"home"` | `"away"` | `""` (empty string, never null/undefined)
- `play_result.type`: `"run"` | `"complete"` | `"incomplete"` | `"sack"` | `"fumble"` | `"interception"`
- `turnover.type`: `"fumble"` | `"interception"`
- `score.type`: `"touchdown"` | `"field_goal"` | `"safety"` | `"two_point"`
- `penalty.type`: free-form string (e.g. `"false_start"`, `"holding"`)
- `injury.severity`: `"questionable"` | `"probable"` | `"out"` | `"ir"`
- `drive_end.result`: `"touchdown"` | `"field_goal"` | `"punt"` | `"turnover_on_downs"` | `"fumble"` | `"interception"` | `"end_of_half"` | `"end_of_game"`

### Exact Envelope Example

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

## 2. Ordered Event Sequence Example (One Drive)

A complete scoring drive with all intermediate events. This is the exact
order a consumer will see for a typical passing touchdown drive.

```json
[
  {
    "schemaVersion": "0.1.0", "eventName": "drive_start", "seq": 2,
    "gameId": "golden-001", "timestamp": 1700000002000,
    "quarter": 1, "clock": 900, "possession": "home",
    "fieldPos": 25, "down": 1, "yardsToGo": 10,
    "homeScore": 0, "awayScore": 0,
    "payload": {
      "driveNum": 1, "startFieldPos": 25, "team": "home",
      "startClock": 900, "startQuarter": 1
    }
  },
  {
    "schemaVersion": "0.1.0", "eventName": "play_call", "seq": 3,
    "gameId": "golden-001", "timestamp": 1700000003000,
    "quarter": 1, "clock": 900, "possession": "home",
    "fieldPos": 25, "down": 1, "yardsToGo": 10,
    "homeScore": 0, "awayScore": 0,
    "payload": {
      "playId": "hb_dive", "playLabel": "HB Dive", "playType": "run",
      "formation": null, "defenseCall": "cover_3",
      "defenseLabel": "Cover 3", "isUserCall": true
    }
  },
  {
    "schemaVersion": "0.1.0", "eventName": "trench_resolution", "seq": 4,
    "gameId": "golden-001", "timestamp": 1700000004000,
    "quarter": 1, "clock": 900, "possession": "home",
    "fieldPos": 25, "down": 1, "yardsToGo": 10,
    "homeScore": 0, "awayScore": 0,
    "payload": {
      "olGrade": 72, "dlGrade": 65,
      "runLaneOpen": true, "pocketIntact": true,
      "matchups": [
        { "off": "OL (blk:72)", "def": "DL (shed:65)", "winner": "off",
          "desc": "O-line mauls the front" }
      ]
    }
  },
  {
    "schemaVersion": "0.1.0", "eventName": "play_result", "seq": 5,
    "gameId": "golden-001", "timestamp": 1700000005000,
    "quarter": 1, "clock": 872, "possession": "home",
    "fieldPos": 30, "down": 2, "yardsToGo": 5,
    "homeScore": 0, "awayScore": 0,
    "payload": {
      "type": "run", "yards": 5, "player": "Marcus Bell",
      "passer": null, "desc": "Marcus Bell gains 5 yards",
      "big": false, "isRush": true, "isScramble": false,
      "firstDown": false, "touchdown": false
    }
  },
  {
    "schemaVersion": "0.1.0", "eventName": "score", "seq": 12,
    "gameId": "golden-001", "timestamp": 1700000012000,
    "quarter": 1, "clock": 825, "possession": "home",
    "fieldPos": 100, "down": 0, "yardsToGo": 0,
    "homeScore": 7, "awayScore": 0,
    "payload": {
      "type": "touchdown", "points": 7, "team": "home",
      "player": "Jaylen Swift",
      "desc": "Jaylen Swift 58-yd TD reception from Drew Cannon (PAT good)",
      "homeScore": 7, "awayScore": 0
    }
  },
  {
    "schemaVersion": "0.1.0", "eventName": "drive_end", "seq": 13,
    "gameId": "golden-001", "timestamp": 1700000013000,
    "quarter": 1, "clock": 825, "possession": "home",
    "fieldPos": 100, "down": 0, "yardsToGo": 0,
    "homeScore": 7, "awayScore": 0,
    "payload": {
      "driveNum": 1, "result": "touchdown", "plays": 3, "yards": 75,
      "timeUsed": 75, "startFieldPos": 25, "endFieldPos": 100
    }
  }
]
```

---

## 3. Weekly Hook Output Shape

`buildWeeklyHook(events, context)` produces the Command Desk recap.
Context required: `{ userSide, week, year, opponent }`.

```
{
  "week":             number,
  "year":             number,
  "opponent":         string,
  "result":           string,           // "W 17-7" or "L 7-17"
  "homeScore":        number,
  "awayScore":        number,
  "headlines":        string[],         // 1-5 plain-English summary lines
  "keyPlays":         KeyPlay[],        // up to 5
  "injuries":         Injury[],
  "turnovers":        Turnover[],
  "mvp":              { name: string, stat: string },
  "driveEfficiency":  { drives: number, scoringDrives: number, pct: number },
  "pressureRate":     number,           // 0-100
  "rzEff":            number,           // 0-100
  "coverageWin":      number,           // 0-100
  "runLaneAdv":       number            // 0-100
}
```

Where:

```
KeyPlay = { quarter: number, clock: number, type: string, desc: string, impact: string }
  // impact: "big_play" | "turnover" | "score"

Injury = { quarter: number, clock: number, player: string, pos: string,
            team: string, type: string, severity: string, gamesOut: number, desc: string }

Turnover = { quarter: number, clock: number, type: string, player: string,
              forcedBy: string, fieldPos: number, desc: string }
```

### Exact Weekly Hook Example

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
      "quarter": 1, "clock": 825, "type": "play_result",
      "desc": "BIG PLAY! Drew Cannon connects with Jaylen Swift for 58 yards! TOUCHDOWN!",
      "impact": "big_play"
    },
    {
      "quarter": 1, "clock": 825, "type": "score",
      "desc": "Jaylen Swift 58-yd TD reception from Drew Cannon (PAT good)",
      "impact": "score"
    },
    {
      "quarter": 1, "clock": 720, "type": "turnover",
      "desc": "Fumble by Marcus Bell, forced by LB Watts. Titans recover.",
      "impact": "turnover"
    }
  ],
  "mvp": { "name": "Jaylen Swift", "stat": "2 rec, 70 yds, 1 TD" },
  "driveEfficiency": { "drives": 4, "scoringDrives": 3, "pct": 75 },
  "pressureRate": 0,
  "rzEff": 100,
  "coverageWin": 44,
  "runLaneAdv": 100
}
```

---

## 4. Postgame Autopsy Output Shape

`buildPostgameAutopsy(events, context)` produces the detailed game breakdown.
Context required: `{ userSide, homeTeam, awayTeam }`.

```
{
  "summary":              string,
  "phases":               Phase[],            // exactly 4 (Q1-Q4)
  "trenchReport":         TrenchReport,
  "pressureReport":       PressureReport,
  "turnoverBattle":       TurnoverBattle,
  "bigPlays":             BigPlay[],
  "missedOpportunities":  MissedOpp[],
  "adjustmentImpact":     AdjustmentImpact,
  "playerGrades":         PlayerGrade[],      // up to 10, sorted by score desc
  "coachingGrade":        CoachingGrade
}
```

Where:

```
Phase = {
  quarter: number,
  label: string,         // "Quarter 1" .. "Quarter 4"
  narrative: string,     // evidence-backed summary
  events: { eventName: string, desc: string }[]   // up to 10
}

TrenchReport = {
  grade: string,         // "A" | "B" | "C" | "D" | "N/A"
  olWins: number,
  dlWins: number,
  narrative: string
}

PressureReport = {
  sacks: number,
  pressures: number,
  rate: number,          // 0-100
  narrative: string
}

TurnoverBattle = {
  forced: number,
  lost: number,
  margin: number,        // positive = won the battle
  narrative: string
}

BigPlay = {
  quarter: number, clock: number, player: string,
  yards: number, desc: string, side: string    // "home" | "away"
}

MissedOpp = {
  driveNum: number, startFieldPos: number, yards: number,
  result: string, narrative: string
}

AdjustmentImpact = {
  adjustment: string,    // label or "None"
  preStats: { plays: number, yards: number, ypp: number },
  postStats: { plays: number, yards: number, ypp: number },
  narrative: string
}

PlayerGrade = {
  name: string,
  grade: string,         // "A" | "B" | "C" | "D"
  score: number,
  stats: PlayerStatLine
}

PlayerStatLine = {
  name: string,
  comp: number, att: number, passYds: number, passTD: number, int: number,
  rushAtt: number, rushYds: number, rushTD: number,
  rec: number, recYds: number, recTD: number,
  sacks: number, forcedFumbles: number, tackles: number
}

CoachingGrade = {
  grade: string,         // "A" | "B" | "C" | "D"
  narrative: string
}
```

### Exact Postgame Autopsy Example

```json
{
  "summary": "Hawks handled Titans 17-7. Solid win across the board.",
  "phases": [
    {
      "quarter": 1, "label": "Quarter 1",
      "narrative": "Q1: 6 plays, 69 yards, 1 explosive play, 1 scoring play, 1 turnover.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_call", "desc": "" },
        { "eventName": "trench_resolution", "desc": "" },
        { "eventName": "play_result", "desc": "Marcus Bell gains 5 yards" }
      ]
    },
    {
      "quarter": 2, "label": "Quarter 2",
      "narrative": "Q2: 2 plays, 70 yards, 2 explosive plays, 1 scoring play.",
      "events": [
        { "eventName": "drive_start", "desc": "" },
        { "eventName": "play_result", "desc": "BREAKAWAY! Jalen Rivers breaks free for 25 yards!" }
      ]
    },
    {
      "quarter": 3, "label": "Quarter 3",
      "narrative": "Q3: 1 plays, 7 yards, 1 scoring play.",
      "events": [
        { "eventName": "play_result", "desc": "Marcus Bell gains 7 yards" },
        { "eventName": "score", "desc": "K Nolan 42-yd FG is GOOD!" }
      ]
    },
    {
      "quarter": 4, "label": "Quarter 4",
      "narrative": "Q4: 3 plays, 30 yards, 2 explosive plays, 1 scoring play, 1 turnover.",
      "events": [
        { "eventName": "play_result", "desc": "Trey Palmer INTERCEPTED by S Williams!" },
        { "eventName": "play_result", "desc": "BREAKAWAY! Marcus Bell breaks free for 18 yards! TOUCHDOWN!" }
      ]
    }
  ],
  "trenchReport": {
    "grade": "B", "olWins": 2, "dlWins": 1,
    "narrative": "O-line won 2 of 3 battles. Solid protection and run blocking."
  },
  "pressureReport": {
    "sacks": 1, "pressures": 3, "rate": 75,
    "narrative": "QB was pressured on 3 of 4 dropbacks (75%). 1 sack taken. Protection was a major issue."
  },
  "turnoverBattle": {
    "forced": 1, "lost": 1, "margin": 0,
    "narrative": "Turnover battle even at 1 each."
  },
  "coachingGrade": {
    "grade": "A",
    "narrative": "Outstanding gameplan execution. Minimal mistakes."
  }
}
```

---

## 5. Reduced-Fidelity Notes

The following fields are **placeholder or approximate** in `0.1.0` and should
not be treated as precision metrics by consumers:

| Field | Location | Note |
|-------|----------|------|
| `pressureRate` | weeklyHook | Approximated from sack count and estimated pass plays. Not a true pressure rate. |
| `coverageWin` | weeklyHook | Inverse of opponent pass efficiency. Coarse grade, not snap-level. |
| `runLaneAdv` | weeklyHook | Derived from rush yards per play, scaled. Not grade-level precision. |
| `rzEff` | weeklyHook | Uses field position heuristic (≥80), not actual red zone entry tracking. |
| `tackles` | PlayerStatLine | Always `0` in `0.1.0` — no tackle tracking in current event set. |
| `momentum` (reducer) | reduceMomentum | Available via reducer but not surfaced in weekly-hook or autopsy shapes. |

These fields exist to establish the shape contract. Their accuracy will
improve in future schema versions via additive optional payload fields.

---

## 6. Consumer Invariants

These rules are **non-negotiable** for any consumer building against this contract.

1. **Envelope completeness:** All 14 top-level fields are always present. Never check for `undefined`.
2. **Monotonic seq:** `seq` values are strictly ascending within a game session. Gaps are allowed (events may be filtered), but order is guaranteed.
3. **Stable gameId:** All events in a game session share the same `gameId`. A new game resets `seq` to 1.
4. **Bookend events:** Every game session starts with `game_start` (seq=1) and ends with `game_end` (highest seq). If a consumer receives events without a `game_start`, the stream is invalid.
5. **Drive bracketing:** Every `drive_start` will have a matching `drive_end` unless the game ends mid-drive. Consumers must handle the dangling-drive case.
6. **Payload stability:** Payload keys for each event type are frozen in `0.1.x`. New optional keys may be added; existing keys will not be removed or renamed.
7. **No schema guessing:** Consumers must check `schemaVersion` before processing. Reject envelopes with an unrecognized version.
8. **Read-model source:** Weekly hook and postgame autopsy shapes are produced by the gameplay lane. Consumers must not build a second competing reducer pipeline — use the shapes as given.
9. **Score fields:** `homeScore`/`awayScore` on the envelope reflect the score **at the time of the event**, not the final score. Use `game_end.payload.homeScore/awayScore` for final scores.
10. **Possession semantics:** `possession` is `""` (empty string) for neutral events (`game_start`, `halftime_adjustment`, `game_end`). Never null or undefined.

---

## 7. Golden Fixture Reference

The canonical test fixture is `tests/fixtures/game-events/golden-game.js`.
The generated consumer packet is `tests/fixtures/game-events/golden-consumer-packet.json`.

Shape parity tests in `tests/game-event-consumer-packet.test.js` verify that
the documented shapes match actual producer output. If these tests fail,
the contract has drifted and must be re-aligned before consumer work proceeds.
