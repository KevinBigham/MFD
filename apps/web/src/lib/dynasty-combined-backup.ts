import { parseCartridge } from '@mfd/engine';
import {
  exportDynastySidecarArchiveJson,
  parseDynastySidecarArchiveJson,
  readDynastySidecarArchivePayload,
  type DynastySidecarArchivePayload,
  type DynastySidecarArchiveSummary,
} from './dynasty-sidecar-archive';

export const DYNASTY_COMBINED_BACKUP_KIND = 'mfd.dynastyCombinedBackup.v1' as const;
const SCHEMA_VERSION = 1 as const;

export interface DynastyCombinedBackupEnvelope {
  kind: typeof DYNASTY_COMBINED_BACKUP_KIND;
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: string;
  cartridge: unknown;
  sidecars: DynastySidecarArchivePayload;
}

export type DynastyCombinedBackupParseResult =
  | {
    ok: true;
    cartridgeText: string;
    sidecarPayload: DynastySidecarArchivePayload;
    summary: DynastySidecarArchiveSummary;
  }
  | {
    ok: false;
    reason: string;
  };

type SidecarPayloadParseResult =
  | {
    ok: true;
    sidecarPayload: DynastySidecarArchivePayload;
    summary: DynastySidecarArchiveSummary;
  }
  | {
    ok: false;
    reason: string;
  };

function stringifyJson(candidate: unknown): string | null {
  try {
    return JSON.stringify(candidate);
  } catch {
    return null;
  }
}

function parseCartridgeObject(cartridge: unknown): string | null {
  const cartridgeText = stringifyJson(cartridge);
  if (!cartridgeText) return null;

  const parsed = parseCartridge(cartridgeText);
  return parsed.ok ? cartridgeText : null;
}

function parseSidecarPayload(sidecars: unknown): SidecarPayloadParseResult {
  const sidecarText = stringifyJson(sidecars);
  if (!sidecarText) {
    return { ok: false, reason: 'Combined backup sidecar archive is not valid.' };
  }

  const result = parseDynastySidecarArchiveJson(sidecarText);
  if (!result.ok) {
    return { ok: false, reason: 'Combined backup sidecar archive is not valid.' };
  }

  return {
    ok: true,
    sidecarPayload: result.payload,
    summary: result.summary,
  };
}

export function exportDynastyCombinedBackupJson(
  cartridgeJson: string,
  sidecarPayload: DynastySidecarArchivePayload = readDynastySidecarArchivePayload(),
  exportedAt: Date = new Date(),
): string {
  const parsedCartridge = parseCartridge(cartridgeJson);
  if (!parsedCartridge.ok) {
    throw new Error('Combined backup requires a valid .mfd cartridge.');
  }

  const cartridge = JSON.parse(cartridgeJson) as unknown;
  const sidecarValidation = parseDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(sidecarPayload, exportedAt));
  if (!sidecarValidation.ok) {
    throw new Error('Combined backup requires a valid sidecar archive.');
  }

  const envelope: DynastyCombinedBackupEnvelope = {
    kind: DYNASTY_COMBINED_BACKUP_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    cartridge,
    sidecars: sidecarPayload,
  };

  return JSON.stringify(envelope, null, 2);
}

export function parseDynastyCombinedBackupJson(raw: string): DynastyCombinedBackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'Combined backup must be valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'Import is not a valid combined dynasty backup.' };
  }

  const envelope = parsed as Partial<DynastyCombinedBackupEnvelope>;
  if (
    envelope.kind !== DYNASTY_COMBINED_BACKUP_KIND
    || envelope.schemaVersion !== SCHEMA_VERSION
    || !envelope.exportedAt
    || !('cartridge' in envelope)
    || !('sidecars' in envelope)
  ) {
    return { ok: false, reason: 'Import is not a valid combined dynasty backup.' };
  }

  const cartridgeText = parseCartridgeObject(envelope.cartridge);
  if (!cartridgeText) {
    return { ok: false, reason: 'Combined backup .mfd cartridge is not valid.' };
  }

  const sidecars = parseSidecarPayload(envelope.sidecars);
  if (!sidecars.ok) return sidecars;

  return {
    ok: true,
    cartridgeText,
    sidecarPayload: sidecars.sidecarPayload,
    summary: sidecars.summary,
  };
}
