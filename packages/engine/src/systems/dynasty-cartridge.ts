/**
 * MFD Dynasty Cartridge System
 *
 * Pure-logic save export/import with compression.
 * No DOM/browser APIs — download/clipboard handled in web layer.
 */

// ── Cartridge Version ──────────────────────────────────

export const CARTRIDGE_VERSION = 'mfd-cartridge.v1';

// ── Types ──────────────────────────────────────────────

export interface CartridgeEnvelope {
  cartridgeVersion: string;
  exportedAt: string;
  meta: CartridgeMeta;
  save: unknown;
}

export interface CartridgeMeta {
  teamName?: string;
  season?: number;
  week?: number;
  [key: string]: unknown;
}

export interface BuildResult {
  ok: true;
  envelope: CartridgeEnvelope;
  json: string;
  sizeBytes: number;
}

export interface BuildError {
  ok: false;
  error: string;
}

export interface ParseResult {
  ok: true;
  save: unknown;
  meta: CartridgeMeta;
  version: string;
}

export interface ParseError {
  ok: false;
  error: string;
}

function stripResultBroadcast(result: unknown): void {
  if (!result || typeof result !== 'object') return;
  delete (result as Record<string, unknown>)['broadcast'];
}

function sanitizeSaveForExport(save: unknown): unknown {
  if (!save || typeof save !== 'object') return save;

  const clone = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  const schedule = Array.isArray(clone['schedule']) ? clone['schedule'] as Array<Record<string, unknown>> : [];
  for (const week of schedule) {
    const games = Array.isArray(week['games']) ? week['games'] as Array<Record<string, unknown>> : [];
    for (const game of games) {
      stripResultBroadcast(game['result']);
    }
  }

  const playoffBracket = clone['playoffBracket'];
  if (playoffBracket && typeof playoffBracket === 'object') {
    const matchups = Array.isArray((playoffBracket as Record<string, unknown>)['matchups'])
      ? (playoffBracket as Record<string, unknown>)['matchups'] as Array<Record<string, unknown>>
      : [];
    for (const matchup of matchups) {
      stripResultBroadcast(matchup['result']);
    }
  }

  return clone;
}

// ── Build ──────────────────────────────────────────────

export function buildCartridge(
  save: unknown,
  meta: CartridgeMeta = {},
): BuildResult | BuildError {
  if (!save) return { ok: false, error: 'No save data provided.' };
  const sanitizedSave = sanitizeSaveForExport(save);

  const envelope: CartridgeEnvelope = {
    cartridgeVersion: CARTRIDGE_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    save: sanitizedSave,
  };

  const json = JSON.stringify(envelope);

  return {
    ok: true,
    envelope,
    json,
    sizeBytes: json.length,
  };
}

// ── Parse ──────────────────────────────────────────────

export function parseCartridge(text: string): ParseResult | ParseError {
  if (!text?.trim()) return { ok: false, error: 'Empty cartridge string.' };

  const trimmed = text.trim();

  // Try JSON directly
  try {
    const data = JSON.parse(trimmed);
    if (data.cartridgeVersion === CARTRIDGE_VERSION && data.save) {
      return { ok: true, save: data.save, meta: data.meta ?? {}, version: data.cartridgeVersion };
    }
    if (data.save) {
      return { ok: true, save: data.save, meta: data.meta ?? {}, version: 'legacy' };
    }
  } catch { /* not JSON */ }

  return { ok: false, error: 'Could not decode cartridge. Check that you pasted the full string.' };
}

// ── File Name Generation ───────────────────────────────

export function generateFileName(meta: CartridgeMeta): string {
  const slug = (meta.teamName ?? 'Dynasty').replace(/[^a-zA-Z0-9]/g, '');
  const season = meta.season ?? '?';
  const week = meta.week ?? '?';
  return `${slug}-S${season}-W${week}.mfd`;
}

// ── Backup Prompt Logic ────────────────────────────────

export function shouldPromptBackup(lastExportTime: number, seasonsPlayed: number): boolean {
  if (!lastExportTime || lastExportTime === 0) return seasonsPlayed >= 1;
  const elapsed = Date.now() - lastExportTime;
  return elapsed > 30 * 60 * 1000;
}
