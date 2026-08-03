import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Student, Section, Mission, Question, StudentWithSession, SessionState } from '../types';
import { saveSessionState, getSessionState, addPendingAttempt } from '../db/idb';
import { syncPendingQueue } from '../api/client';
import missionsData from '../content/missions.json';
import questionsData from '../content/questions.json';

// ─── Typed content ────────────────────────────────────────────────────────────

const ALL_MISSIONS = missionsData as Mission[];
const ALL_QUESTIONS = questionsData as Question[];

// ─── State ────────────────────────────────────────────────────────────────────

export interface AppState {
  // Section / session
  section: Section | null;
  students: Student[];                  // authoritative student data
  turnQueue: string[];                  // ordered student IDs for current round
  turnsThisSession: Record<string, number>; // session-local turn counter
  absentIds: Set<string>;
  currentStudentIndex: number;          // index into turnQueue
  isSpinning: boolean;
  totalSessionXp: number;               // total XP earned in current session

  // Mission / quiz
  currentMissionId: string | null;
  currentQuestionIndex: number;         // index into mission's questions
  answeredQuestionIds: string[];        // IDs answered at least once this mission

  // Sync
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

const initialState: AppState = {
  section: null,
  students: [],
  turnQueue: [],
  turnsThisSession: {},
  absentIds: new Set(),
  currentStudentIndex: -1,
  isSpinning: false,
  totalSessionXp: 0,
  currentMissionId: null,
  currentQuestionIndex: 0,
  answeredQuestionIds: [],
  isOnline: navigator.onLine,
  syncStatus: 'idle',
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_SECTION'; section: Section; students: Student[]; answeredQuestionIds: string[] }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_SYNC_STATUS'; status: AppState['syncStatus'] }
  | { type: 'UPDATE_STUDENTS'; students: Student[] }
  | { type: 'START_SPIN' }
  | { type: 'LAND_ON_STUDENT'; studentId: string }
  | { type: 'STOP_SPINNING' }
  | { type: 'SKIP_STUDENT'; studentId: string }
  | { type: 'MARK_ABSENT'; studentId: string }
  | { type: 'MARK_PRESENT'; studentId: string }
  | { type: 'ANSWER_QUESTION'; studentId: string; questionId: string; correct: boolean; xp: number }
  | { type: 'ADVANCE_MISSION' }
  | { type: 'SET_TURN_QUEUE'; queue: string[] };

// ─── Turn queue builder ───────────────────────────────────────────────────────

/**
 * Build a recency-ordered turn queue.
 * Priority: null last_turn_at first, then ascending by last_turn_at (longest ago = first).
 * Ties broken by small random jitter.
 */
export function buildTurnQueue(students: Student[], absentIds: Set<string>): string[] {
  const present = students.filter((s) => !absentIds.has(s.id));
  return present
    .map((s) => ({
      id: s.id,
      sortKey: s.last_turn_at
        ? new Date(s.last_turn_at).getTime() + Math.random() * 1000
        : -Infinity,
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((s) => s.id);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_SECTION': {
      const absentIds = new Set<string>();
      const queue = buildTurnQueue(action.students, absentIds);
      return {
        ...state,
        section: action.section,
        students: action.students,
        turnQueue: queue,
        turnsThisSession: {},
        absentIds,
        currentStudentIndex: -1,
        totalSessionXp: 0,
        currentMissionId: action.section.current_mission_id,
        answeredQuestionIds: action.answeredQuestionIds,
        currentQuestionIndex: 0,
      };
    }

    case 'SET_ONLINE':
      return { ...state, isOnline: action.online };

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status };

    case 'UPDATE_STUDENTS':
      return { ...state, students: action.students };

    case 'START_SPIN':
      return { ...state, isSpinning: true };

    case 'STOP_SPINNING':
      return { ...state, isSpinning: false };

    case 'LAND_ON_STUDENT': {
      const idx = state.turnQueue.indexOf(action.studentId);
      return {
        ...state,
        isSpinning: false,
        currentStudentIndex: idx >= 0 ? idx : state.currentStudentIndex,
      };
    }

    case 'SKIP_STUDENT': {
      // Move student to end of current queue
      const filtered = state.turnQueue.filter((id) => id !== action.studentId);
      const newQueue = [...filtered, action.studentId];
      // Advance index if we skipped the current student
      let newIdx = state.currentStudentIndex;
      if (state.turnQueue[state.currentStudentIndex] === action.studentId) {
        newIdx = Math.min(newIdx, newQueue.length - 1);
      }
      return { ...state, turnQueue: newQueue, currentStudentIndex: newIdx };
    }

    case 'MARK_ABSENT': {
      const newAbsent = new Set(state.absentIds);
      newAbsent.add(action.studentId);
      const newQueue = state.turnQueue.filter((id) => id !== action.studentId);
      let newIdx = state.currentStudentIndex;
      if (newIdx >= newQueue.length) newIdx = newQueue.length - 1;
      return { ...state, absentIds: newAbsent, turnQueue: newQueue, currentStudentIndex: newIdx };
    }

    case 'MARK_PRESENT': {
      const newAbsent = new Set(state.absentIds);
      newAbsent.delete(action.studentId);
      // Add back to end of queue
      const newQueue = [...state.turnQueue, action.studentId];
      return { ...state, absentIds: newAbsent, turnQueue: newQueue };
    }

    case 'ANSWER_QUESTION': {
      const { studentId, questionId, correct, xp } = action;

      // Optimistically update local XP
      const updatedStudents = state.students.map((s) =>
        s.id === studentId
          ? { ...s, total_xp: s.total_xp + (correct ? xp : 0) }
          : s
      );

      // Track answered questions
      const answeredIds = state.answeredQuestionIds.includes(questionId)
        ? state.answeredQuestionIds
        : [...state.answeredQuestionIds, questionId];

      // Update turns counter
      const turns = {
        ...state.turnsThisSession,
        [studentId]: (state.turnsThisSession[studentId] ?? 0) + 1,
      };

      // Advance question index
      const missionQuestions = ALL_QUESTIONS.filter(
        (q) => q.mission_id === state.currentMissionId
      );
      const nextQIdx = (state.currentQuestionIndex + 1) % missionQuestions.length;

      // After answering, advance to next student
      let nextStudentIdx = state.currentStudentIndex + 1;
      let newQueue = state.turnQueue;
      if (nextStudentIdx >= state.turnQueue.length) {
        // End of round — rebuild queue
        const updatedWithTurn = updatedStudents.map((s) =>
          s.id === studentId
            ? { ...s, last_turn_at: new Date().toISOString() }
            : s
        );
        newQueue = buildTurnQueue(updatedWithTurn, state.absentIds);
        nextStudentIdx = -1; // reset — spinner needed again
      }

      return {
        ...state,
        students: updatedStudents,
        answeredQuestionIds: answeredIds,
        turnsThisSession: turns,
        totalSessionXp: state.totalSessionXp + (correct ? xp : 0),
        currentQuestionIndex: nextQIdx,
        turnQueue: newQueue,
        currentStudentIndex: nextStudentIdx,
      };
    }

    case 'ADVANCE_MISSION': {
      const sorted = [...ALL_MISSIONS].sort((a, b) => a.order - b.order);
      const currentIdx = sorted.findIndex((m) => m.id === state.currentMissionId);
      const next = sorted[currentIdx + 1];
      if (!next) return state; // already at last mission
      return {
        ...state,
        currentMissionId: next.id,
        currentQuestionIndex: 0,
        answeredQuestionIds: [],
        section: state.section
          ? { ...state.section, current_mission_id: next.id, map_position: (state.section.map_position ?? 0) + 1 }
          : state.section,
      };
    }

    case 'SET_TURN_QUEUE':
      return { ...state, turnQueue: action.queue, currentStudentIndex: -1 };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SessionContextValue {
  state: AppState;
  // Computed
  currentMission: Mission | null;
  currentQuestion: Question | null;
  missionQuestions: Question[];
  currentStudent: StudentWithSession | null;
  studentsWithSession: StudentWithSession[];
  canAdvanceMission: boolean;
  // Actions
  loadSection: (section: Section, students: Student[]) => Promise<void>;
  spinNext: () => void;
  landOnStudent: (studentId: string) => void;
  skipStudent: (studentId: string) => void;
  markAbsent: (studentId: string) => void;
  markPresent: (studentId: string) => void;
  answerQuestion: (questionId: string, correct: boolean, xp: number) => Promise<void>;
  advanceMission: () => void;
  buildNewQueue: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE', online: true });
      // Auto-sync on reconnect
      if (state.section) {
        handleSync(state.section.id);
      }
    };
    const handleOffline = () => dispatch({ type: 'SET_ONLINE', online: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.section?.id]);

  const handleSync = useCallback(async (sectionId: string) => {
    dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing' });
    try {
      const updatedStudents = await syncPendingQueue(sectionId);
      if (updatedStudents) {
        dispatch({ type: 'UPDATE_STUDENTS', students: updatedStudents });
        dispatch({ type: 'SET_SYNC_STATUS', status: 'success' });
      } else {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' });
      }
    } catch {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error' });
    }
  }, []);

  // Persist session state to IndexedDB whenever key state changes
  useEffect(() => {
    if (!state.section) return;
    const sessionState: SessionState = {
      section_id: state.section.id,
      turn_queue: state.turnQueue,
      turns_taken: state.turnsThisSession,
      current_mission_id: state.currentMissionId ?? state.section.current_mission_id ?? '',
      current_question_index: state.currentQuestionIndex,
      absent_student_ids: Array.from(state.absentIds),
      answered_question_ids: state.answeredQuestionIds,
      cached_students: state.students,
      cached_section: state.section,
    };
    saveSessionState(sessionState).catch(console.error);
  }, [
    state.section,
    state.turnQueue,
    state.turnsThisSession,
    state.currentMissionId,
    state.currentQuestionIndex,
    state.absentIds,
    state.answeredQuestionIds,
    state.students,
  ]);

  // ─── Computed ───────────────────────────────────────────────────────────────

  const missionQuestions = ALL_QUESTIONS.filter(
    (q) => q.mission_id === state.currentMissionId
  );

  const currentMission = ALL_MISSIONS.find((m) => m.id === state.currentMissionId) ?? null;

  const currentQuestion =
    missionQuestions.find((q) => !state.answeredQuestionIds.includes(q.id)) ?? null;

  const studentsWithSession: StudentWithSession[] = state.students.map((s) => ({
    ...s,
    turns_this_session: state.turnsThisSession[s.id] ?? 0,
    is_absent: state.absentIds.has(s.id),
  }));

  const currentStudent =
    state.currentStudentIndex >= 0 && state.currentStudentIndex < state.turnQueue.length
      ? (studentsWithSession.find(
          (s) => s.id === state.turnQueue[state.currentStudentIndex]
        ) ?? null)
      : null;

  const canAdvanceMission =
    missionQuestions.length > 0 &&
    missionQuestions.every((q) => state.answeredQuestionIds.includes(q.id));

  // ─── Actions ────────────────────────────────────────────────────────────────

  const loadSection = useCallback(async (section: Section, students: Student[]) => {
    // Check for persisted session state
    const saved = await getSessionState(section.id);
    const answeredIds = saved?.answered_question_ids ?? [];

    dispatch({
      type: 'LOAD_SECTION',
      section,
      students,
      answeredQuestionIds: answeredIds,
    });

    // Attempt to sync any pending queue from previous session
    if (navigator.onLine) {
      await handleSync(section.id);
    }
  }, [handleSync]);

  const spinNext = useCallback(() => {
    if (state.isSpinning || state.turnQueue.length === 0) return;
    dispatch({ type: 'START_SPIN' });
  }, [state.isSpinning, state.turnQueue.length]);

  const landOnStudent = useCallback((studentId: string) => {
    dispatch({ type: 'LAND_ON_STUDENT', studentId });
  }, []);

  const buildNewQueue = useCallback(() => {
    const queue = buildTurnQueue(state.students, state.absentIds);
    dispatch({ type: 'SET_TURN_QUEUE', queue });
  }, [state.students, state.absentIds]);

  const skipStudent = useCallback((studentId: string) => {
    dispatch({ type: 'SKIP_STUDENT', studentId });
  }, []);

  const markAbsent = useCallback((studentId: string) => {
    dispatch({ type: 'MARK_ABSENT', studentId });
  }, []);

  const markPresent = useCallback((studentId: string) => {
    dispatch({ type: 'MARK_PRESENT', studentId });
  }, []);

  const answerQuestion = useCallback(
    async (questionId: string, correct: boolean, xp: number) => {
      const studentId =
        (state.currentStudentIndex >= 0 && state.turnQueue[state.currentStudentIndex]) ||
        state.turnQueue[0] ||
        state.students[0]?.id ||
        'class_explorer';

      // Write attempt to IndexedDB immediately
      const attempt = {
        id: uuidv4(),
        student_id: studentId,
        question_id: questionId,
        correct,
        xp_awarded: correct ? xp : 0,
        answered_at: new Date().toISOString(),
      };
      await addPendingAttempt(attempt);

      dispatch({ type: 'ANSWER_QUESTION', studentId, questionId, correct, xp });

      // Attempt online sync immediately
      if (navigator.onLine && state.section) {
        handleSync(state.section.id);
      }
    },
    [state.currentStudentIndex, state.turnQueue, state.students, state.section, handleSync]
  );

  const advanceMission = useCallback(() => {
    dispatch({ type: 'ADVANCE_MISSION' });
  }, []);

  const value: SessionContextValue = {
    state,
    currentMission,
    currentQuestion,
    missionQuestions,
    currentStudent,
    studentsWithSession,
    canAdvanceMission,
    loadSection,
    spinNext,
    landOnStudent,
    skipStudent,
    markAbsent,
    markPresent,
    answerQuestion,
    advanceMission,
    buildNewQueue,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

export { ALL_MISSIONS, ALL_QUESTIONS };
