/**
 * Procedural sound effects using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 *
 * Each function takes an AudioContext and plays immediately.
 * Sounds are designed to be short, punchy, and retro-flavored
 * to match the 8-Bit ESPN design system.
 */

// ── Shared helpers ─────────────────────────────────────

function createGain(ctx: AudioContext, volume: number, output: AudioNode = ctx.destination): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(output);
  return gain;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume = 0.15,
  type: OscillatorType = 'square',
  output: AudioNode = ctx.destination,
): void {
  const osc = ctx.createOscillator();
  const gain = createGain(ctx, volume, output);
  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(ctx: AudioContext, duration: number, volume = 0.08, output: AudioNode = ctx.destination): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = createGain(ctx, volume, output);
  source.connect(gain);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.start(ctx.currentTime);
}

// ── UI Sounds ──────────────────────────────────────────

/** Short click — nav button, list selection */
export function playClick(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 800, 0.06, 0.1, 'square', output);
}

/** Navigate to a new screen */
export function playNavigate(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 600, 0.05, 0.08, 'square', output);
  setTimeout(() => playTone(ctx, 900, 0.08, 0.1, 'square', output), 50);
}

/** Panel open */
export function playOpenPanel(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 400, 0.1, 0.08, 'sine', output);
  setTimeout(() => playTone(ctx, 600, 0.1, 0.08, 'sine', output), 60);
}

/** Notification ping */
export function playNotification(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 880, 0.12, 0.12, 'sine', output);
  setTimeout(() => playTone(ctx, 1100, 0.15, 0.1, 'sine', output), 100);
}

// ── Week Advance ───────────────────────────────────────

/** Week advance start — loading/simulation feel */
export function playWeekAdvanceStart(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playTone(ctx, 300 + i * 100, 0.08, 0.06, 'sawtooth', output), i * 80);
  }
}

/** Week advance complete — success chime */
export function playWeekAdvanceComplete(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 523, 0.15, 0.12, 'sine', output);
  setTimeout(() => playTone(ctx, 659, 0.15, 0.12, 'sine', output), 120);
  setTimeout(() => playTone(ctx, 784, 0.25, 0.15, 'sine', output), 240);
}

// ── Game Events ────────────────────────────────────────

/** Touchdown — triumphant ascending fanfare */
export function playTouchdown(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.2, 0.15, 'square', output), i * 100);
  });
  // Crowd noise
  setTimeout(() => playNoise(ctx, 0.8, 0.06, output), 300);
}

/** Field goal — short ascending pair */
export function playFieldGoal(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 440, 0.15, 0.12, 'sine', output);
  setTimeout(() => playTone(ctx, 660, 0.25, 0.12, 'sine', output), 150);
}

/** Turnover — descending dissonant */
export function playTurnover(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 600, 0.15, 0.12, 'sawtooth', output);
  setTimeout(() => playTone(ctx, 400, 0.15, 0.12, 'sawtooth', output), 120);
  setTimeout(() => playTone(ctx, 250, 0.2, 0.1, 'sawtooth', output), 240);
}

/** Sack — heavy thud */
export function playSack(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playNoise(ctx, 0.15, 0.12, output);
  playTone(ctx, 100, 0.2, 0.1, 'sine', output);
}

/** Big play — excitement burst */
export function playBigPlay(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 700, 0.1, 0.12, 'square', output);
  setTimeout(() => playTone(ctx, 900, 0.1, 0.12, 'square', output), 80);
  setTimeout(() => playTone(ctx, 1200, 0.15, 0.15, 'square', output), 160);
}

/** Injury — somber low tone */
export function playInjury(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 200, 0.4, 0.08, 'sine', output);
  setTimeout(() => playTone(ctx, 180, 0.4, 0.06, 'sine', output), 200);
}

/** Game start — broadcast intro */
export function playGameStart(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  const notes = [392, 494, 587, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.18, 0.1, 'square', output), i * 150);
  });
}

/** Game end — final whistle */
export function playGameEnd(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 1000, 0.5, 0.12, 'sine', output);
}

/** Halftime */
export function playHalftime(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 600, 0.3, 0.08, 'sine', output);
  setTimeout(() => playTone(ctx, 500, 0.3, 0.08, 'sine', output), 300);
}

/** Overtime — tension builder */
export function playOvertime(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playTone(ctx, 440 + i * 40, 0.15, 0.1, 'sawtooth', output), i * 200);
  }
}

// ── Draft / Transactions ───────────────────────────────

/** Draft pick — dramatic reveal */
export function playDraftPick(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 330, 0.2, 0.1, 'sine', output);
  setTimeout(() => playTone(ctx, 440, 0.2, 0.12, 'sine', output), 200);
  setTimeout(() => playTone(ctx, 660, 0.3, 0.15, 'sine', output), 400);
}

/** Trade complete — positive exchange */
export function playTradeComplete(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 523, 0.12, 0.1, 'square', output);
  setTimeout(() => playTone(ctx, 784, 0.2, 0.12, 'square', output), 120);
}

/** Trade rejected — low buzz */
export function playTradeRejected(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 200, 0.25, 0.1, 'sawtooth', output);
  setTimeout(() => playTone(ctx, 180, 0.25, 0.08, 'sawtooth', output), 150);
}

/** Free agent signed */
export function playFreeAgentSigned(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 440, 0.12, 0.1, 'sine', output);
  setTimeout(() => playTone(ctx, 587, 0.15, 0.12, 'sine', output), 100);
  setTimeout(() => playTone(ctx, 740, 0.2, 0.1, 'sine', output), 200);
}

/** Player cut — short descend */
export function playPlayerCut(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 500, 0.12, 0.08, 'square', output);
  setTimeout(() => playTone(ctx, 350, 0.15, 0.06, 'square', output), 100);
}

// ── Season Milestones ──────────────────────────────────

/** Season end — reflective chime */
export function playSeasonEnd(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  const notes = [523, 440, 349, 262];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.35, 0.1, 'sine', output), i * 250);
  });
}

/** Super Bowl win — full victory fanfare */
export function playSuperBowlWin(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.3, 0.15, 'square', output), i * 150);
  });
  setTimeout(() => playNoise(ctx, 1.2, 0.08, output), 600);
}

/** Super Bowl loss — muted descending */
export function playSuperBowlLoss(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  const notes = [600, 500, 400, 300];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.3, 0.08, 'sine', output), i * 250);
  });
}

/** Playoff clinch */
export function playPlayoffClinch(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 587, 0.15, 0.12, 'square', output);
  setTimeout(() => playTone(ctx, 784, 0.15, 0.12, 'square', output), 120);
  setTimeout(() => playTone(ctx, 1047, 0.25, 0.15, 'square', output), 240);
}

/** Playoff elimination */
export function playPlayoffElimination(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 440, 0.3, 0.1, 'sine', output);
  setTimeout(() => playTone(ctx, 330, 0.3, 0.08, 'sine', output), 250);
  setTimeout(() => playTone(ctx, 220, 0.4, 0.06, 'sine', output), 500);
}

/** Record broken — special chime */
export function playRecordBroken(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 880, 0.1, 0.12, 'square', output);
  setTimeout(() => playTone(ctx, 1100, 0.1, 0.12, 'square', output), 80);
  setTimeout(() => playTone(ctx, 1320, 0.1, 0.15, 'square', output), 160);
  setTimeout(() => playTone(ctx, 1760, 0.3, 0.12, 'square', output), 240);
}

/** Achievement unlocked */
export function playAchievementUnlocked(ctx: AudioContext, output: AudioNode = ctx.destination): void {
  playTone(ctx, 660, 0.12, 0.1, 'sine', output);
  setTimeout(() => playTone(ctx, 880, 0.12, 0.12, 'sine', output), 100);
  setTimeout(() => playTone(ctx, 1100, 0.2, 0.15, 'sine', output), 200);
}
