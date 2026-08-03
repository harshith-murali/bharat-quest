import { Section, Student, QuizAttempt, LeaderboardEntry } from '../types';
import { getAllPendingAttempts, removePendingAttempts } from '../db/idb';

const BASE_URL = '/api';

// ─── Online check ─────────────────────────────────────────────────────────────

export function isOnline(): boolean {
  return navigator.onLine;
}

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (!navigator.onLine) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      console.error(`API error ${res.status} on ${path}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`Network error on ${path}:`, err);
    return null;
  }
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function fetchSections(): Promise<Section[] | null> {
  return apiFetch<Section[]>('/sections');
}

export interface SectionResponse {
  section: Section;
  students: Student[];
}

export async function fetchSection(sectionId: string): Promise<SectionResponse | null> {
  return apiFetch<SectionResponse>(`/sections/${sectionId}`);
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncResponse {
  synced: number;
  students: Student[];
}

export async function syncAttempts(
  sectionId: string,
  attempts: QuizAttempt[]
): Promise<SyncResponse | null> {
  return apiFetch<SyncResponse>(`/sections/${sectionId}/sync-attempts`, {
    method: 'POST',
    body: JSON.stringify({ attempts }),
  });
}

/**
 * Flush the entire pending sync queue to the backend.
 * Returns updated students on success, null on failure/offline.
 */
export async function syncPendingQueue(sectionId: string): Promise<Student[] | null> {
  if (!navigator.onLine) return null;

  const pending = await getAllPendingAttempts();
  if (pending.length === 0) return null;

  console.log(`🔄 Syncing ${pending.length} pending attempts...`);
  const result = await syncAttempts(sectionId, pending);

  if (result) {
    await removePendingAttempts(pending.map((a) => a.id));
    console.log(`✅ Synced ${result.synced} attempts`);
    return result.students;
  }

  return null;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardResponse {
  week_start: string;
  leaderboard: LeaderboardEntry[];
}

export async function fetchLeaderboard(sectionId: string): Promise<LeaderboardResponse | null> {
  return apiFetch<LeaderboardResponse>(`/sections/${sectionId}/leaderboard?week=current`);
}
