// ─── Backend / API Types ──────────────────────────────────────────────────────

export interface Section {
  id: string;
  name: string;
  current_mission_id: string | null;
  map_position: number;
}

export interface Student {
  id: string;
  section_id: string;
  name: string;
  avatar: string;
  level: number;
  total_xp: number;
  coins: number;
  gems: number;
  badges: string[];
  last_turn_at: string | null; // ISO timestamp
}

export interface QuizAttempt {
  id: string;           // client-generated UUID
  student_id: string;
  question_id: string;
  correct: boolean;
  xp_awarded: number;
  answered_at: string;  // ISO timestamp
}

export interface LeaderboardEntry {
  student_id: string;
  name: string;
  avatar: string;
  weekly_xp: number;
  rank: number;
}

// ─── Content / Static JSON Types ─────────────────────────────────────────────

export interface Mission {
  id: string;
  title: string;
  route_from: string;
  route_to: string;
  xp_reward: number;
  coin_reward: number;
  order: number;
  mascot_model?: string;
  mascot_name?: string;
}

export interface Question {
  id: string;
  mission_id: string;
  text: string;
  options: [string, string, string, string];
  correct_option: 0 | 1 | 2 | 3;
  xp_value: number;
}

// ─── IndexedDB / Session Types ────────────────────────────────────────────────

export interface SessionState {
  section_id: string;
  /** Ordered array of student IDs for the current round */
  turn_queue: string[];
  /** student_id → number of turns taken this session */
  turns_taken: Record<string, number>;
  current_mission_id: string;
  current_question_index: number;
  /** student IDs marked absent for this session */
  absent_student_ids: string[];
  /** which question IDs have been answered at least once in current mission */
  answered_question_ids: string[];
  /** Cached students (for offline use) */
  cached_students: Student[];
  /** Cached section (for offline use) */
  cached_section: Section;
}

export type PendingSyncAttempt = QuizAttempt;

// ─── UI-only Types ────────────────────────────────────────────────────────────

/** Student augmented with session-local turn count for display */
export interface StudentWithSession extends Student {
  turns_this_session: number;
  is_absent: boolean;
}
