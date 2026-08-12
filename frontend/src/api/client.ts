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
    // Only declare a JSON content-type when we actually send a body. Fastify
    // rejects a bodyless request that claims 'application/json' with
    // "Body cannot be empty…", which previously broke every DELETE.
    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string>) ?? {}),
    };
    if (options?.body != null) headers['Content-Type'] = 'application/json';

    // `credentials: 'include'` is required for the httpOnly session cookie —
    // fetch omits cookies by default, which would make every authenticated
    // request appear signed-out.
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    if (!res.ok) {
      // A 401 is an expected outcome when checking whether a session exists
      // (e.g. /auth/me on a signed-out page), so don't log it as an error.
      if (res.status !== 401) console.error(`API error ${res.status} on ${path}`);
      return null;
    }

    // 204 / empty bodies are valid successes.
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
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

// ─── State Facts ──────────────────────────────────────────────────────────────

export interface StateFact {
  id: string;
  state_name: string;
  fact: string;
  category: string;
  sort_order: number;
}

export async function fetchStateFacts(stateName: string): Promise<StateFact[] | null> {
  return apiFetch<StateFact[]>(`/facts/${encodeURIComponent(stateName)}`);
}

// ─── Talk / Chat ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  state_name: string | null;
  created_at: string;
}

export async function fetchChatHistory(sectionId: string): Promise<ChatMessage[] | null> {
  return apiFetch<ChatMessage[]>(`/chat/${encodeURIComponent(sectionId)}`);
}

export interface ChatReply {
  reply: string;
  source: 'model' | 'facts';
}

export async function sendChatMessage(
  sectionId: string,
  message: string,
  stateName?: string
): Promise<ChatReply | null> {
  return apiFetch<ChatReply>('/chat', {
    method: 'POST',
    body: JSON.stringify({ sectionId, message, stateName }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminSection {
  id: string;
  name: string;
  grade: number | null;
  section_letter: string | null;
  student_count: number;
}

export async function fetchAdminSections(): Promise<AdminSection[] | null> {
  return apiFetch<AdminSection[]>('/admin/sections');
}

export async function fetchAdminStudents(sectionId?: string): Promise<Student[] | null> {
  const qs = sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : '';
  return apiFetch<Student[]>(`/admin/students${qs}`);
}

export async function createStudent(
  sectionId: string,
  name: string,
  avatar: string
): Promise<Student | null> {
  return apiFetch<Student>('/admin/students', {
    method: 'POST',
    body: JSON.stringify({ section_id: sectionId, name, avatar }),
  });
}

export async function updateStudent(
  id: string,
  patch: { name?: string; avatar?: string; total_xp?: number; level?: number }
): Promise<Student | null> {
  return apiFetch<Student>(`/admin/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteStudent(id: string): Promise<{ deleted: string } | null> {
  return apiFetch<{ deleted: string }>(`/admin/students/${id}`, { method: 'DELETE' });
}

// ─── Quest progression (server-authoritative) ─────────────────────────────────

export interface ServerQuestProgress {
  section_id: string;
  unlocked_states: string[];
  completed_states: string[];
  current_state: string;
  state_quiz_progress: Record<string, unknown>;
}

export async function fetchQuestProgress(sectionId: string): Promise<ServerQuestProgress | null> {
  return apiFetch<ServerQuestProgress>(`/progress/${encodeURIComponent(sectionId)}`);
}

export async function pushQuestProgress(
  sectionId: string,
  progress: {
    unlocked_states: string[];
    completed_states: string[];
    current_state: string;
    state_quiz_progress?: Record<string, unknown>;
  }
): Promise<ServerQuestProgress | null> {
  return apiFetch<ServerQuestProgress>(`/progress/${encodeURIComponent(sectionId)}`, {
    method: 'PUT',
    body: JSON.stringify(progress),
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'teacher';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function login(email: string, password: string): Promise<AuthUser | null> {
  const res = await apiFetch<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res?.user ?? null;
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await apiFetch<{ user: AuthUser }>('/auth/me');
  return res?.user ?? null;
}

export interface StaffUser extends AuthUser {
  is_active: boolean;
  last_login_at: string | null;
  section_ids: string[];
}

export async function fetchStaff(): Promise<StaffUser[] | null> {
  return apiFetch<StaffUser[]>('/auth/users');
}

export async function createStaff(payload: {
  email: string;
  password: string;
  name: string;
  role: Role;
  section_ids?: string[];
}): Promise<AuthUser | null> {
  return apiFetch<AuthUser>('/auth/users', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateStaff(
  id: string,
  patch: { role?: Role; is_active?: boolean; section_ids?: string[]; password?: string }
): Promise<StaffUser | null> {
  return apiFetch<StaffUser>(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteStaff(id: string): Promise<{ deleted: string } | null> {
  return apiFetch<{ deleted: string }>(`/auth/users/${id}`, { method: 'DELETE' });
}
