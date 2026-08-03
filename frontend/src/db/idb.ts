import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SessionState, PendingSyncAttempt } from '../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

interface BharatQuestDB extends DBSchema {
  session_state: {
    key: string; // section_id
    value: SessionState;
  };
  pending_sync_queue: {
    key: string; // attempt id (UUID)
    value: PendingSyncAttempt;
  };
}

// ─── Singleton DB handle ──────────────────────────────────────────────────────

let _db: IDBPDatabase<BharatQuestDB> | null = null;

async function getDB(): Promise<IDBPDatabase<BharatQuestDB>> {
  if (_db) return _db;
  _db = await openDB<BharatQuestDB>('bharat-quest-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('session_state')) {
        db.createObjectStore('session_state');
      }
      if (!db.objectStoreNames.contains('pending_sync_queue')) {
        db.createObjectStore('pending_sync_queue');
      }
    },
  });
  return _db;
}

// ─── session_state helpers ────────────────────────────────────────────────────

export async function getSessionState(sectionId: string): Promise<SessionState | undefined> {
  const db = await getDB();
  return db.get('session_state', sectionId);
}

export async function saveSessionState(state: SessionState): Promise<void> {
  const db = await getDB();
  await db.put('session_state', state, state.section_id);
}

export async function clearSessionState(sectionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('session_state', sectionId);
}

// ─── pending_sync_queue helpers ───────────────────────────────────────────────

export async function getAllPendingAttempts(): Promise<PendingSyncAttempt[]> {
  const db = await getDB();
  return db.getAll('pending_sync_queue');
}

export async function addPendingAttempt(attempt: PendingSyncAttempt): Promise<void> {
  const db = await getDB();
  await db.put('pending_sync_queue', attempt, attempt.id);
}

export async function removePendingAttempts(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending_sync_queue', 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function clearPendingQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('pending_sync_queue');
}
