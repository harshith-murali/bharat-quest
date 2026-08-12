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

export interface StateProgress {
  attempts: number;
  bestScore: number;
  lastScore: number;
  completed: boolean;
}

export interface QuestProgressData {
  unlocked_states: string[];
  completed_states: string[];
  current_state: string;
  state_quiz_progress?: Record<string, StateProgress>;
}


export interface SessionState {
  section_id: string;
  classroom_id?: string;
  grade?: number;
  section_letter?: string;
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
  /** Persistent quest progression data */
  quest_progress?: QuestProgressData;
}

export type PendingSyncAttempt = QuizAttempt;

// ─── App Mode ────────────────────────────────────────────────────────────────

export type AppMode = 'quest';

// ─── Real Quest Question (from docs/questions/quest/bharat_quest_*.json or class{N}.json) ─────
// Fields: id, state (required for state files, optional for class-filtered pool), category, topic/subject,
//         question, options, answer, difficulty, source, source_page/source_url (optional),
//         class (optional, for class-filtered textbook-derived questions)

export interface QuestQuestion {
  id: string;
  state?: string;                                                           // optional for class-filtered pool
  category: string;
  topic?: string;                                                           // quest state files use "topic"
  subject?: string;                                                         // textbook-derived may use "subject"
  chapter?: string;                                                         // textbook-derived: chapter name
  question: string;
  options: string[];
  answer: string;                                                           // the correct answer text
  difficulty: 'easy' | 'medium' | 'hard' | string;
  source: string;
  source_page?: number;                                                     // textbook-derived have page numbers
  source_url?: string;                                                      // state files may have URLs
  class?: number;                                                           // class 5-8 for textbook-derived
}

// ─── UI-only Types ────────────────────────────────────────────────────────────

/** Student augmented with session-local turn count for display */
export interface StudentWithSession extends Student {
  turns_this_session: number;
  is_absent: boolean;
}
