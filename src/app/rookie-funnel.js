var ROOKIE_STEPS = {
  IDLE: 'idle',
  TEAM: 'team',
  MODE: 'mode',
  FIRST_GAME: 'first_game',
  COMPLETE: 'complete',
  SKIPPED: 'skipped',
};

function cloneFlow(flow) {
  var src = flow || {};
  return {
    active: !!src.active,
    step: src.step || ROOKIE_STEPS.IDLE,
    startedAtMs: typeof src.startedAtMs === 'number' ? src.startedAtMs : 0,
    stepStartedAtMs: typeof src.stepStartedAtMs === 'number' ? src.stepStartedAtMs : 0,
    completedAtMs: typeof src.completedAtMs === 'number' ? src.completedAtMs : null,
    firstGameMs: typeof src.firstGameMs === 'number' ? src.firstGameMs : null,
    skipped: !!src.skipped,
  };
}

function canAdvance(currentStep, nextStep) {
  if (nextStep === ROOKIE_STEPS.SKIPPED) return true;
  if (currentStep === ROOKIE_STEPS.IDLE && nextStep === ROOKIE_STEPS.TEAM) return true;
  if (currentStep === ROOKIE_STEPS.TEAM && nextStep === ROOKIE_STEPS.MODE) return true;
  if (currentStep === ROOKIE_STEPS.MODE && nextStep === ROOKIE_STEPS.FIRST_GAME) return true;
  if (currentStep === ROOKIE_STEPS.FIRST_GAME && nextStep === ROOKIE_STEPS.COMPLETE) return true;
  return false;
}

export function createRookieFlow(nowMs = Date.now()) {
  var ts = Number(nowMs);
  var now = Number.isFinite(ts) ? ts : Date.now();
  return {
    active: true,
    step: ROOKIE_STEPS.TEAM,
    startedAtMs: now,
    stepStartedAtMs: now,
    completedAtMs: null,
    firstGameMs: null,
    skipped: false,
  };
}

export function advanceRookieFlow(flow, step, nowMs = Date.now()) {
  var out = cloneFlow(flow);
  var ts = Number(nowMs);
  var now = Number.isFinite(ts) ? ts : Date.now();
  var nextStep = String(step || '').trim();
  if (!nextStep || !canAdvance(out.step, nextStep)) return out;

  if (nextStep === ROOKIE_STEPS.SKIPPED) {
    out.active = false;
    out.step = ROOKIE_STEPS.SKIPPED;
    out.skipped = true;
    out.completedAtMs = now;
    return out;
  }

  out.step = nextStep;
  out.stepStartedAtMs = now;
  if (nextStep === ROOKIE_STEPS.COMPLETE) {
    out.active = false;
    out.completedAtMs = now;
    out.firstGameMs = Math.max(0, now - out.startedAtMs);
  }
  return out;
}

export function completeRookieFlow(flow, nowMs = Date.now()) {
  return advanceRookieFlow(flow, ROOKIE_STEPS.COMPLETE, nowMs);
}

export function formatRookieDuration(ms) {
  var value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  var totalSeconds = Math.floor(value / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  return String(minutes) + ':' + String(seconds).padStart(2, '0');
}

export function shouldShowRookieCoachCard(flow, ctx) {
  var f = cloneFlow(flow);
  var c = ctx || {};
  if (!f.active) return false;
  if (f.step !== ROOKIE_STEPS.FIRST_GAME) return false;
  if (c.screen !== 'league') return false;
  if (c.tab !== 'home') return false;
  if (c.phase !== 'regular') return false;
  return Number(c.week) === 1;
}

export { ROOKIE_STEPS };
