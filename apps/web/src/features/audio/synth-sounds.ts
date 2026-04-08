/**
 * Procedural sound effects using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 *
 * Each function takes an AudioContext and plays immediately.
 * Sounds are designed to be short, punchy, and retro-flavored
 * to match the 8-Bit ESPN design system.
 */

// ── Shared helpers ─────────────────────────────────────

function createGain(ctx: AudioContext, volume: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  return gain;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume = 0.15,
  type: OscillatorType = 'square',
): void {
  const osc = ctx.createOscillator();
  const gain = createGain(ctx, volume);
  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(ctx: AudioContext, duration: number, volume = 0.08): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = createGain(ctx, volume);
  source.connect(gain);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.start(ctx.currentTime);
}

// ── UI Sounds ──────────────────────────────────────────

/** Short click — nav button, list selection */
export function playClick(ctx: AudioContext): void {
  playTone(ctx, 800, 0.06, 0.1, 'square');
}

/** Navigate to a new screen */
export function playNavigate(ctx: AudioContext): void {
  playTone(ctx, 600, 0.05, 0.08, 'square');
  setTimeout(() => playTone(ctx, 900, 0.08, 0.1, 'square'), 50);
}

/** Panel open */
export function playOpenPanel(ctx: AudioContext): void {
  playTone(ctx, 400, 0.1, 0.08, 'sine');
  setTimeout(() => playTone(ctx, 600, 0.1, 0.08, 'sine'), 60);
}

/** Notification ping */
export function playNotification(ctx: AudioContext): void {
  playTone(ctx, 880, 0.12, 0.12, 'sine');
  setTimeout(() => playTone(ctx, 1100, 0.15, 0.1, 'sine'), 100);
}

// ── Week Advance ───────────────────────────────────────

/** Week advance start — loading/simulation feel */
export function playWeekAdvanceStart(ctx: AudioContext): void {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playTone(ctx, 300 + i * 100, 0.08, 0.06, 'sawtooth'), i * 80);
  }
}

/** Week advance complete — success chime */
export function playWeekAdvanceComplete(ctx: AudioContext): void {
  playTone(ctx, 523, 0.15, 0.12, 'sine');
  setTimeout(() => playTone(ctx, 659, 0.15, 0.12, 'sine'), 120);
  setTimeout(() => playTone(ctx, 784, 0.25, 0.15, 'sine'), 240);
}

// ── Game Events ────────────────────────────────────────

/** Touchdown — triumphant ascending fanfare */
export function playTouchdown(ctx: AudioContext): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.2, 0.15, 'square'), i * 100);
  });
  // Crowd noise
  setTimeout(() => playNoise(ctx, 0.8, 0.06), 300);
}

/** Field goal — short ascending pair */
export function playFieldGoal(ctx: AudioContext): void {
  playTone(ctx, 440, 0.15, 0.12, 'sine');
  setTimeout(() => playTone(ctx, 660, 0.25, 0.12, 'sine'), 150);
}

/** Turnover — descending dissonant */
export function playTurnover(ctx: AudioContext): void {
  playTone(ctx, 600, 0.15, 0.12, 'sawtooth');
  setTimeout(() => playTone(ctx, 400, 0.15, 0.12, 'sawtooth'), 120);
  setTimeout(() => playTone(ctx, 250, 0.2, 0.1, 'sawtooth'), 240);
}

/** Sack — heavy thud */
export function playSack(ctx: AudioContext): void {
  playNoise(ctx, 0.15, 0.12);
  playTone(ctx, 100, 0.2, 0.1, 'sine');
}

/** Big play — excitement burst */
export function playBigPlay(ctx: AudioContext): void {
  playTone(ctx, 700, 0.1, 0.12, 'square');
  setTimeout(() => playTone(ctx, 900, 0.1, 0.12, 'square'), 80);
  setTimeout(() => playTone(ctx, 1200, 0.15, 0.15, 'square'), 160);
}

/** Injury — somber low tone */
export function playInjury(ctx: AudioContext): void {
  playTone(ctx, 200, 0.4, 0.08, 'sine');
  setTimeout(() => playTone(ctx, 180, 0.4, 0.06, 'sine'), 200);
}

/** Game start — broadcast intro */
export function playGameStart(ctx: AudioContext): void {
  const notes = [392, 494, 587, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.18, 0.1, 'square'), i * 150);
  });
}

/** Game end — final whistle */
export function playGameEnd(ctx: AudioContext): void {
  playTone(ctx, 1000, 0.5, 0.12, 'sine');
}

/** Halftime */
export function playHalftime(ctx: AudioContext): void {
  playTone(ctx, 600, 0.3, 0.08, 'sine');
  setTimeout(() => playTone(ctx, 500, 0.3, 0.08, 'sine'), 300);
}

/** Overtime — tension builder */
export function playOvertime(ctx: AudioContext): void {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playTone(ctx, 440 + i * 40, 0.15, 0.1, 'sawtooth'), i * 200);
  }
}

// ── Draft / Transactions ───────────────────────────────

/** Draft pick — dramatic reveal */
export function playDraftPick(ctx: AudioContext): void {
  playTone(ctx, 330, 0.2, 0.1, 'sine');
  setTimeout(() => playTone(ctx, 440, 0.2, 0.12, 'sine'), 200);
  setTimeout(() => playTone(ctx, 660, 0.3, 0.15, 'sine'), 400);
}

/** Trade complete — positive exchange */
export function playTradeComplete(ctx: AudioContext): void {
  playTone(ctx, 523, 0.12, 0.1, 'square');
  setTimeout(() => playTone(ctx, 784, 0.2, 0.12, 'square'), 120);
}

/** Trade rejected — low buzz */
export function playTradeRejected(ctx: AudioContext): void {
  playTone(ctx, 200, 0.25, 0.1, 'sawtooth');
  setTimeout(() => playTone(ctx, 180, 0.25, 0.08, 'sawtooth'), 150);
}

/** Free agent signed */
export function playFreeAgentSigned(ctx: AudioContext): void {
  playTone(ctx, 440, 0.12, 0.1, 'sine');
  setTimeout(() => playTone(ctx, 587, 0.15, 0.12, 'sine'), 100);
  setTimeout(() => playTone(ctx, 740, 0.2, 0.1, 'sine'), 200);
}

/** Player cut — short descend */
export function playPlayerCut(ctx: AudioContext): void {
  playTone(ctx, 500, 0.12, 0.08, 'square');
  setTimeout(() => playTone(ctx, 350, 0.15, 0.06, 'square'), 100);
}

// ── Season Milestones ──────────────────────────────────

/** Season end — reflective chime */
export function playSeasonEnd(ctx: AudioContext): void {
  const notes = [523, 440, 349, 262];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.35, 0.1, 'sine'), i * 250);
  });
}

/** Super Bowl win — full victory fanfare */
export function playSuperBowlWin(ctx: AudioContext): void {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.3, 0.15, 'square'), i * 150);
  });
  setTimeout(() => playNoise(ctx, 1.2, 0.08), 600);
}

/** Super Bowl loss — muted descending */
export function playSuperBowlLoss(ctx: AudioContext): void {
  const notes = [600, 500, 400, 300];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.3, 0.08, 'sine'), i * 250);
  });
}

/** Playoff clinch */
export function playPlayoffClinch(ctx: AudioContext): void {
  playTone(ctx, 587, 0.15, 0.12, 'square');
  setTimeout(() => playTone(ctx, 784, 0.15, 0.12, 'square'), 120);
  setTimeout(() => playTone(ctx, 1047, 0.25, 0.15, 'square'), 240);
}

/** Playoff elimination */
export function playPlayoffElimination(ctx: AudioContext): void {
  playTone(ctx, 440, 0.3, 0.1, 'sine');
  setTimeout(() => playTone(ctx, 330, 0.3, 0.08, 'sine'), 250);
  setTimeout(() => playTone(ctx, 220, 0.4, 0.06, 'sine'), 500);
}

/** Record broken — special chime */
export function playRecordBroken(ctx: AudioContext): void {
  playTone(ctx, 880, 0.1, 0.12, 'square');
  setTimeout(() => playTone(ctx, 1100, 0.1, 0.12, 'square'), 80);
  setTimeout(() => playTone(ctx, 1320, 0.1, 0.15, 'square'), 160);
  setTimeout(() => playTone(ctx, 1760, 0.3, 0.12, 'square'), 240);
}

/** Achievement unlocked */
export function playAchievementUnlocked(ctx: AudioContext): void {
  playTone(ctx, 660, 0.12, 0.1, 'sine');
  setTimeout(() => playTone(ctx, 880, 0.12, 0.12, 'sine'), 100);
  setTimeout(() => playTone(ctx, 1100, 0.2, 0.15, 'sine'), 200);
}
