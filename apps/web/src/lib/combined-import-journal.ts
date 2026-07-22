import type { GameState } from '@mfd/engine';
import { autosaveDynasty } from '../app/store/persistence';
import { deleteSave } from './db';
import {
  exportDynastySidecarArchiveJson,
  importDynastySidecarArchiveJson,
  readDynastySidecarArchivePayload,
  type DynastySidecarArchiveImportResult,
  type DynastySidecarArchivePayload,
} from './dynasty-sidecar-archive';

export const COMBINED_IMPORT_JOURNAL_KEY = 'mfd.combinedImport.journal.v1';
export const COMBINED_IMPORT_COMPLETE_KEY = 'mfd.combinedImport.complete.v1';

interface CombinedImportJournal {
  schemaVersion: 1;
  id: string;
  previousSidecars: DynastySidecarArchivePayload;
  saveSlotId: number | null;
}

export interface CombinedImportRecoveryDependencies {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  restoreSidecars?: (payload: DynastySidecarArchivePayload) => void;
  deleteSaveSlot?: (id: number) => Promise<void>;
}

export interface AtomicCombinedImportDependencies extends CombinedImportRecoveryDependencies {
  persistGame?: (game: GameState) => Promise<number>;
  applySidecars?: (payload: DynastySidecarArchivePayload) => DynastySidecarArchiveImportResult;
}

function resolveStorage(
  candidate?: CombinedImportRecoveryDependencies['storage'],
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  const value = candidate ?? (typeof localStorage === 'undefined' ? null : localStorage);
  if (
    !value
    || typeof value.getItem !== 'function'
    || typeof value.setItem !== 'function'
    || typeof value.removeItem !== 'function'
  ) return null;
  return value;
}

function parseJournal(raw: string | null): CombinedImportJournal | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CombinedImportJournal>;
    if (
      parsed.schemaVersion !== 1
      || typeof parsed.id !== 'string'
      || !parsed.previousSidecars
      || (parsed.saveSlotId !== null && typeof parsed.saveSlotId !== 'number')
    ) return null;
    return parsed as CombinedImportJournal;
  } catch {
    return null;
  }
}

function writeJournal(
  storage: Pick<Storage, 'setItem'>,
  journal: CombinedImportJournal,
): void {
  storage.setItem(COMBINED_IMPORT_JOURNAL_KEY, JSON.stringify(journal));
}

function clearJournal(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(COMBINED_IMPORT_JOURNAL_KEY);
  storage.removeItem(COMBINED_IMPORT_COMPLETE_KEY);
}

function defaultRestoreSidecars(payload: DynastySidecarArchivePayload): void {
  const result = importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(payload));
  if (!result.ok) throw new Error(result.reason);
}

function applyImportedSidecars(payload: DynastySidecarArchivePayload): DynastySidecarArchiveImportResult {
  return importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(payload));
}

export async function recoverIncompleteCombinedImport(
  dependencies: CombinedImportRecoveryDependencies = {},
): Promise<'none' | 'committed' | 'rolled_back'> {
  const storage = resolveStorage(dependencies.storage);
  if (!storage) return 'none';
  const journal = parseJournal(storage.getItem(COMBINED_IMPORT_JOURNAL_KEY));
  if (!journal) {
    clearJournal(storage);
    return 'none';
  }

  if (storage.getItem(COMBINED_IMPORT_COMPLETE_KEY) === journal.id) {
    clearJournal(storage);
    return 'committed';
  }

  (dependencies.restoreSidecars ?? defaultRestoreSidecars)(journal.previousSidecars);
  if (journal.saveSlotId !== null) {
    await (dependencies.deleteSaveSlot ?? deleteSave)(journal.saveSlotId);
  }
  clearJournal(storage);
  return 'rolled_back';
}

export async function importCombinedBackupAtomically(
  loaded: GameState,
  nextSidecars: DynastySidecarArchivePayload,
  dependencies: AtomicCombinedImportDependencies = {},
): Promise<DynastySidecarArchiveImportResult> {
  const storage = resolveStorage(dependencies.storage);
  if (!storage) throw new Error('Combined import requires browser storage.');

  await recoverIncompleteCombinedImport(dependencies);
  const journal: CombinedImportJournal = {
    schemaVersion: 1,
    id: `combined-import-${Date.now()}`,
    previousSidecars: readDynastySidecarArchivePayload(),
    saveSlotId: null,
  };
  writeJournal(storage, journal);

  try {
    journal.saveSlotId = await (dependencies.persistGame ?? autosaveDynasty)(loaded);
    writeJournal(storage, journal);
    const result = (dependencies.applySidecars ?? applyImportedSidecars)(nextSidecars);
    if (!result.ok) throw new Error(result.reason);

    // This is deliberately the final mutation in the transaction.
    storage.setItem(COMBINED_IMPORT_COMPLETE_KEY, journal.id);
    return result;
  } catch (error) {
    await recoverIncompleteCombinedImport(dependencies);
    throw error;
  }
}
