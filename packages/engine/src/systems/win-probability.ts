/**
 * Win Probability Engine — Expected points, leverage index, and win probability.
 *
 * Provides real-time win probability calculations based on score, quarter,
 * time remaining, and field position. Used by broadcast and narrative systems
 * to identify high-leverage moments.
 */

// ── Expected Points Table ──────────────────────────────
// Simplified expected points by down and yards to go bucket.
// Based on historical NFL averages (approximated).

interface EPEntry {
  down: number;
  yardsToGoBucket: string;
  expectedPoints: number;
}

const EP_TABLE: readonly EPEntry[] = [
  // 1st down
  { down: 1, yardsToGoBucket: '1-3', expectedPoints: 3.2 },
  { down: 1, yardsToGoBucket: '4-6', expectedPoints: 2.8 },
  { down: 1, yardsToGoBucket: '7-10', expectedPoints: 2.5 },
  { down: 1, yardsToGoBucket: '11+', expectedPoints: 2.0 },
  // 2nd down
  { down: 2, yardsToGoBucket: '1-3', expectedPoints: 2.9 },
  { down: 2, yardsToGoBucket: '4-6', expectedPoints: 2.2 },
  { down: 2, yardsToGoBucket: '7-10', expectedPoints: 1.6 },
  { down: 2, yardsToGoBucket: '11+', expectedPoints: 1.2 },
  // 3rd down
  { down: 3, yardsToGoBucket: '1-3', expectedPoints: 2.4 },
  { down: 3, yardsToGoBucket: '4-6', expectedPoints: 1.4 },
  { down: 3, yardsToGoBucket: '7-10', expectedPoints: 0.8 },
  { down: 3, yardsToGoBucket: '11+', expectedPoints: 0.5 },
  // 4th down
  { down: 4, yardsToGoBucket: '1-3', expectedPoints: 1.8 },
  { down: 4, yardsToGoBucket: '4-6', expectedPoints: 0.6 },
  { down: 4, yardsToGoBucket: '7-10', expectedPoints: 0.2 },
  { down: 4, yardsToGoBucket: '11+', expectedPoints: 0.1 },
] as const;

// ── Field Position EP Modifier ─────────────────────────
// Yards from own goal line → EP modifier

const FIELD_POSITION_EP: readonly [number, number][] = [
  [10, -0.8],  // own 10 — bad field position
  [20, -0.3],
  [30, 0.0],
  [40, 0.4],
  [50, 0.9],   // midfield
  [60, 1.5],
  [70, 2.2],
  [80, 3.5],
  [90, 4.8],   // red zone
  [100, 6.5],  // goal line
] as const;

// ── Yards to Go Bucket ─────────────────────────────────

function yardsToGoBucket(ytg: number): string {
  if (ytg <= 3) return '1-3';
  if (ytg <= 6) return '4-6';
  if (ytg <= 10) return '7-10';
  return '11+';
}

// ── Expected Points ────────────────────────────────────

/** Calculate expected points for a given down, distance, and field position */
export function getExpectedPoints(
  down: number,
  yardsToGo: number,
  fieldPosition: number, // yards from own goal line (1-99)
): number {
  const bucket = yardsToGoBucket(yardsToGo);
  const entry = EP_TABLE.find((e) => e.down === Math.min(4, Math.max(1, down)) && e.yardsToGoBucket === bucket);
  const baseEP = entry?.expectedPoints ?? 1.0;

  // Field position modifier
  let fpMod = 0;
  const fp = Math.max(1, Math.min(99, fieldPosition));
  for (let i = FIELD_POSITION_EP.length - 1; i >= 0; i--) {
    if (fp >= FIELD_POSITION_EP[i]![0]) {
      fpMod = FIELD_POSITION_EP[i]![1];
      break;
    }
  }

  return Math.max(-2, baseEP + fpMod);
}

// ── Win Probability ────────────────────────────────────

/**
 * Calculate win probability based on score differential, quarter, and time remaining.
 * Returns a value between 0 and 1 (0% to 100%).
 */
export function calculateWinProbability(
  scoreDiff: number, // positive = team is ahead
  quarter: number,   // 1-4 (5+ = overtime)
  timeRemainingSeconds: number, // seconds left in the game
  hasBall: boolean,
): number {
  // Base win probability from score differential
  // Each point is worth ~3% at game start, more as time decreases
  const totalGameSeconds = 3600;
  const elapsed = Math.max(0, totalGameSeconds - timeRemainingSeconds);
  const gameProgress = Math.min(1.0, elapsed / totalGameSeconds);

  // Time decay: as game progresses, each point matters more
  const pointValue = 0.03 + gameProgress * 0.05;

  let prob = 0.5 + scoreDiff * pointValue;

  // Possession bonus — having the ball is worth ~3-5% depending on time
  if (hasBall) {
    const possessionBonus = 0.03 + (1 - gameProgress) * 0.02;
    prob += possessionBonus;
  }

  // Late-game adjustments
  if (quarter >= 4 && timeRemainingSeconds < 120) {
    // Final 2 minutes: score matters even more
    if (scoreDiff > 0) {
      prob = Math.min(0.99, prob + 0.05);
    } else if (scoreDiff < 0) {
      prob = Math.max(0.01, prob - 0.03);
    }
  }

  // Overtime
  if (quarter >= 5) {
    prob = scoreDiff > 0 ? 0.80 : scoreDiff < 0 ? 0.20 : 0.50;
    if (hasBall && scoreDiff === 0) prob = 0.55;
  }

  return Math.max(0.01, Math.min(0.99, prob));
}

// ── Leverage Index ─────────────────────────────────────

/**
 * Calculate the leverage index for a given game state.
 * Higher leverage = more impactful moment.
 * Returns a value from 0 to 10 (0 = garbage time, 10 = max pressure).
 */
export function calculateLeverageIndex(
  scoreDiff: number,
  quarter: number,
  timeRemainingSeconds: number,
): number {
  // Close games have higher leverage
  const closenessFactor = Math.max(0, 1 - Math.abs(scoreDiff) / 21);

  // Later quarters have higher leverage
  const quarterFactor = Math.min(1.0, (quarter - 1) / 3);

  // Final minutes ramp up dramatically
  let timeFactor = 0.5;
  if (quarter === 4) {
    if (timeRemainingSeconds < 120) timeFactor = 1.0;
    else if (timeRemainingSeconds < 300) timeFactor = 0.85;
    else if (timeRemainingSeconds < 600) timeFactor = 0.7;
  } else if (quarter >= 5) {
    timeFactor = 1.0; // overtime is always high leverage
  }

  // Combine factors
  const rawLeverage = closenessFactor * 0.4 + quarterFactor * 0.3 + timeFactor * 0.3;

  // Scale to 0-10
  return Math.round(rawLeverage * 10 * 10) / 10;
}

// ── Narrative Helpers ──────────────────────────────────

/** Describe the leverage level in human-readable terms */
export function leverageLabel(leverage: number): string {
  if (leverage >= 8.0) return 'CRITICAL';
  if (leverage >= 6.0) return 'HIGH';
  if (leverage >= 4.0) return 'ELEVATED';
  if (leverage >= 2.0) return 'MODERATE';
  return 'LOW';
}

/** Generate a narrative line about win probability shift */
export function winProbabilityNarrative(
  teamName: string,
  wpBefore: number,
  wpAfter: number,
): string | null {
  const shift = wpAfter - wpBefore;
  const shiftPct = Math.round(Math.abs(shift) * 100);

  if (shiftPct < 5) return null; // not significant enough

  if (shift > 0.20) {
    return `${teamName}'s win probability surges ${shiftPct}% — that play changed the game!`;
  }
  if (shift > 0.10) {
    return `${teamName} now has a ${Math.round(wpAfter * 100)}% chance to win after that play.`;
  }
  if (shift < -0.20) {
    return `${teamName}'s win probability drops ${shiftPct}% — they're in serious trouble now.`;
  }
  if (shift < -0.10) {
    return `${teamName}'s chances dip to ${Math.round(wpAfter * 100)}% after that setback.`;
  }

  return `${teamName}'s win probability shifts to ${Math.round(wpAfter * 100)}%.`;
}

/** Check if a moment qualifies as a "turning point" */
export function isTurningPoint(
  wpBefore: number,
  wpAfter: number,
  leverage: number,
): boolean {
  const shift = Math.abs(wpAfter - wpBefore);
  // A turning point = big WP swing in a high-leverage moment
  return shift >= 0.15 && leverage >= 5.0;
}
