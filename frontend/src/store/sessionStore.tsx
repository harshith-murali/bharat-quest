import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Student, Section, Mission, Question, StudentWithSession, SessionState, AppMode } from '../types';
import { saveSessionState, getSessionState, getAllSessionStates, addPendingAttempt } from '../db/idb';
import { syncPendingQueue, pushQuestProgress, fetchQuestProgress, fetchSection } from '../api/client';
import missionsData from '../content/missions.json';
import questionsData from '../content/questions.json';

// ─── Typed content ────────────────────────────────────────────────────────────

const ALL_MISSIONS = missionsData as Mission[];
const ALL_QUESTIONS = questionsData as Question[];

// ─── State ────────────────────────────────────────────────────────────────────

import { QuestProgressData } from '../types';
import { CANONICAL_QUEST_STATES, QUEST_PASSING_SCORE } from '../loaders/questLoader';

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

  // Classroom Context & Progression
  selectedClass: number | null;         // 3 to 7
  selectedSection: string | null;       // 'A', 'B', 'C', 'D'
  classroomId: string | null;           // e.g. 'class_3_A'
  questProgress: QuestProgressData;     // per-classroom quest progression

  // Mission / quiz
  currentMissionId: string | null;
  currentQuestionIndex: number;         // index into mission's questions
  answeredQuestionIds: string[];        // IDs answered at least once this mission

  // Sync
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';

  // Mode & Navigation
  appMode: AppMode | null;
  selectedState: string | null;   // state name, chosen on the Quest map
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

  // Classroom Context & Progression
  selectedClass: 3,
  selectedSection: 'A',
  classroomId: 'class_3_A',
  questProgress: {
    unlocked_states: ['Ladakh'],
    completed_states: [],
    current_state: 'Ladakh',
  },

  currentMissionId: null,
  currentQuestionIndex: 0,
  answeredQuestionIds: [],
  isOnline: navigator.onLine,
  syncStatus: 'idle',

  // Mode
  appMode: null,
  selectedState: 'Ladakh',
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | {
      type: 'LOAD_SECTION';
      section: Section;
      students: Student[];
      answeredQuestionIds: string[];
      grade?: number;
      sectionLetter?: string;
      questProgress?: QuestProgressData;
    }
  | { type: 'SET_CLASSROOM_CONTEXT'; grade: number; sectionLetter: string; classroomId: string }
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
  | { type: 'SET_TURN_QUEUE'; queue: string[] }
  | { type: 'SET_APP_MODE'; mode: AppMode }
  | { type: 'SET_SELECTED_CLASS'; classNum: number }
  | { type: 'SET_SELECTED_SECTION'; sectionLetter: string }
  | { type: 'SET_SELECTED_STATE'; stateName: string }
  | { type: 'SET_QUEST_CURRENT_STATE'; stateName: string }
  | { type: 'COMPLETE_QUEST_STATE'; stateName: string }
  | { type: 'RESTORE_QUEST_PROGRESS'; questProgress: QuestProgressData }
  | { type: 'RECORD_QUEST_ATTEMPT'; stateName: string; correctCount: number };

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
      // Restore persisted quest progression. This was previously dropped, so
      // unlocked/completed states reset to the Ladakh-only default on every
      // reload and the player lost their journey after a refresh.
      const restoredQuestProgress = action.questProgress ?? state.questProgress;
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
        questProgress: restoredQuestProgress,
        selectedState: restoredQuestProgress.current_state ?? state.selectedState,
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

    case 'SET_APP_MODE':
      return { ...state, appMode: action.mode };

    case 'SET_SELECTED_CLASS':
      return { ...state, selectedClass: action.classNum };

    case 'SET_SELECTED_SECTION':
      return { ...state, selectedSection: action.sectionLetter };

    case 'SET_SELECTED_STATE':
      return { ...state, selectedState: action.stateName };

    case 'SET_CLASSROOM_CONTEXT':
      return {
        ...state,
        selectedClass: action.grade,
        selectedSection: action.sectionLetter,
        classroomId: action.classroomId,
      };

    case 'COMPLETE_QUEST_STATE': {
      const stateName = action.stateName;
      const completed = state.questProgress.completed_states.includes(stateName)
        ? state.questProgress.completed_states
        : [...state.questProgress.completed_states, stateName];

      const idx = CANONICAL_QUEST_STATES.indexOf(stateName);
      const nextStateName = idx >= 0 && idx < CANONICAL_QUEST_STATES.length - 1
        ? CANONICAL_QUEST_STATES[idx + 1]
        : null;

      const unlocked = [...state.questProgress.unlocked_states];
      if (nextStateName && !unlocked.includes(nextStateName)) {
        unlocked.push(nextStateName);
      }

      const nextCurrentState = nextStateName || stateName;

      return {
        ...state,
        selectedState: nextCurrentState,
        questProgress: {
          ...state.questProgress,
          completed_states: completed,
          unlocked_states: unlocked,
          current_state: nextCurrentState,
        },
      };
    }

    case 'RECORD_QUEST_ATTEMPT': {
      const { stateName, correctCount } = action;
      const currentProg = state.questProgress.state_quiz_progress?.[stateName] ?? {
        attempts: 0,
        bestScore: 0,
        lastScore: 0,
        completed: false,
      };

      const attempts = currentProg.attempts + 1;
      const lastScore = correctCount;
      const bestScore = Math.max(currentProg.bestScore, correctCount);
      const isCompleted = currentProg.completed || bestScore >= QUEST_PASSING_SCORE;

      const completedStates = isCompleted && !state.questProgress.completed_states.includes(stateName)
        ? [...state.questProgress.completed_states, stateName]
        : state.questProgress.completed_states;

      const updatedStateQuizProgress = {
        ...(state.questProgress.state_quiz_progress ?? {}),
        [stateName]: {
          attempts,
          bestScore,
          lastScore,
          completed: isCompleted,
        },
      };

      // Passing unlocks the NEXT state in the canonical order. This is the single
      // place progression is granted — previously unlocking lived only in
      // COMPLETE_QUEST_STATE, which nothing dispatched, so unlocked_states was
      // permanently stuck at ['Ladakh'].
      //
      // `current_state` is deliberately NOT advanced here: the map's car drive
      // owns that transition, so the marker doesn't teleport ahead of the car.
      const unlockedStates = [...state.questProgress.unlocked_states];
      if (isCompleted) {
        const idx = CANONICAL_QUEST_STATES.indexOf(stateName);
        const nextStateName =
          idx >= 0 && idx < CANONICAL_QUEST_STATES.length - 1
            ? CANONICAL_QUEST_STATES[idx + 1]
            : null;
        if (nextStateName && !unlockedStates.includes(nextStateName)) {
          unlockedStates.push(nextStateName);
        }
      }

      return {
        ...state,
        questProgress: {
          ...state.questProgress,
          completed_states: completedStates,
          unlocked_states: unlockedStates,
          state_quiz_progress: updatedStateQuizProgress,
        },
      };
    }

    case 'RESTORE_QUEST_PROGRESS': {
      return {
        ...state,
        questProgress: action.questProgress,
        selectedState: action.questProgress.current_state ?? state.selectedState,
      };
    }

    case 'SET_QUEST_CURRENT_STATE': {
      return {
        ...state,
        selectedState: action.stateName,
        questProgress: {
          ...state.questProgress,
          current_state: action.stateName,
        },
      };
    }

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
  /** Re-read students from the server (e.g. after an admin edit). */
  refreshStudents: () => Promise<void>;
  setSessionContext: (grade: number, sectionLetter: string, sectionObj: Section, studentsObj: Student[]) => Promise<void>;
  spinNext: () => void;
  landOnStudent: (studentId: string) => void;
  skipStudent: (studentId: string) => void;
  markAbsent: (studentId: string) => void;
  markPresent: (studentId: string) => void;
  answerQuestion: (questionId: string, correct: boolean, xp: number) => Promise<void>;
  advanceMission: () => void;
  buildNewQueue: () => void;
  setAppMode: (mode: AppMode) => void;
  setSelectedClass: (classNum: number) => void;
  setSelectedSection: (sectionLetter: string) => void;
  setSelectedState: (stateName: string) => void;
  setQuestCurrentState: (stateName: string) => void;
  completeQuestState: (stateName: string) => void;
  recordQuestAttempt: (stateName: string, correctCount: number) => void;
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

  // Rehydrate quest progression on a cold start (page refresh / deep link).
  //
  // The normal login flow calls setSessionContext(), but refreshing directly on
  // /session/:id/map never runs it, so unlocked/completed states fell back to
  // the Ladakh-only default and the player's journey appeared to reset.
  // Runs once on mount. `classroomId` has a non-null default in initialState,
  // so it cannot be used to detect a cold start — instead we restore whenever
  // persisted progress is AHEAD of what's currently in memory. The normal login
  // flow dispatches LOAD_SECTION with the same data, so this is idempotent.
  // Restores progression for THIS classroom on a cold start (refresh / deep
  // link), keyed on the section UUID in the URL.
  //
  // This deliberately does NOT fall back to "whichever saved classroom got
  // furthest": doing so leaked one class's journey into another (opening
  // Class 3-B could restore Class 7-B's unlocked states).
  const rehydratedSectionRef = useRef<string | null>(null);
  useEffect(() => {
    const sectionKey = state.section?.id;
    if (!sectionKey) return;
    if (rehydratedSectionRef.current === sectionKey) return;
    rehydratedSectionRef.current = sectionKey;

    (async () => {
      try {
        // Postgres is the source of truth; the IndexedDB copy is an offline
        // cache used only when the server is unreachable.
        let resolved: QuestProgressData | undefined;

        if (navigator.onLine) {
          const server = await fetchQuestProgress(sectionKey);
          if (server) {
            resolved = {
              unlocked_states: server.unlocked_states,
              completed_states: server.completed_states,
              current_state: server.current_state,
              state_quiz_progress: (server.state_quiz_progress ??
                {}) as QuestProgressData['state_quiz_progress'],
            };
          }
        }

        if (!resolved) {
          const all = await getAllSessionStates();
          resolved = all.find((s) => s.section_id === sectionKey)?.quest_progress;
        }

        if (resolved && resolved.unlocked_states.length > 1) {
          dispatch({ type: 'RESTORE_QUEST_PROGRESS', questProgress: resolved });
        }
      } catch {
        /* progression simply stays at defaults if restore fails */
      }
    })();
  }, [state.section]);

  // Push quest progression to Postgres (source of truth) whenever it changes.
  // IndexedDB below remains as the offline cache, so a dropped network never
  // blocks a lesson — the next successful push reconciles the server.
  useEffect(() => {
    // Key on the section UUID — the same identifier students are stored under.
    // Using the synthetic `classroomId` here meant progress and rosters lived
    // in two different key spaces that could never be joined.
    //
    // Deliberately no `classroomId` fallback: this effect can fire before
    // LOAD_SECTION resolves, and falling back would write a duplicate
    // `class_3_A`-keyed row that never joins to `sections`.
    const key = state.section?.id;
    if (!key || !navigator.onLine) return;

    pushQuestProgress(key, {
      unlocked_states: state.questProgress.unlocked_states,
      completed_states: state.questProgress.completed_states,
      current_state: state.questProgress.current_state,
      state_quiz_progress: state.questProgress.state_quiz_progress ?? {},
    }).catch(() => {
      /* offline cache still holds the truth until the next push succeeds */
    });
  }, [state.questProgress, state.section, state.classroomId]);

  // Persist session state to IndexedDB whenever key state changes
  useEffect(() => {
    const key = state.section?.id || state.classroomId;
    if (!key) return;
    const sessionState: SessionState = {
      section_id: key,
      classroom_id: state.classroomId || key,
      grade: state.selectedClass || 3,
      section_letter: state.selectedSection || 'A',
      turn_queue: state.turnQueue,
      turns_taken: state.turnsThisSession,
      current_mission_id: state.currentMissionId ?? state.section?.current_mission_id ?? '',
      current_question_index: state.currentQuestionIndex,
      absent_student_ids: Array.from(state.absentIds),
      answered_question_ids: state.answeredQuestionIds,
      cached_students: state.students,
      cached_section: state.section ?? ({ id: key, name: `${state.selectedClass}-${state.selectedSection}`, current_mission_id: null, map_position: 0 }),
      quest_progress: state.questProgress,
    };
    saveSessionState(sessionState).catch(console.error);
  }, [
    state.classroomId,
    state.selectedClass,
    state.selectedSection,
    state.section,
    state.turnQueue,
    state.turnsThisSession,
    state.currentMissionId,
    state.currentQuestionIndex,
    state.absentIds,
    state.answeredQuestionIds,
    state.students,
    state.questProgress,
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

  // Re-reads the roster from the server. The admin page writes students
  // directly through the API, so without this the in-memory roster (and the
  // turn spinner) keeps showing a stale list until a full reload.
  const refreshStudents = useCallback(async () => {
    const id = state.section?.id;
    if (!id || !navigator.onLine) return;
    const res = await fetchSection(id);
    if (res?.students) {
      dispatch({ type: 'UPDATE_STUDENTS', students: res.students });
      dispatch({ type: 'SET_TURN_QUEUE', queue: buildTurnQueue(res.students, new Set()) });
    }
  }, [state.section]);

  const loadSection = useCallback(async (section: Section, students: Student[]) => {
    // Check for persisted session state
    const saved = await getSessionState(section.id);
    const answeredIds = saved?.answered_question_ids ?? [];

    dispatch({
      type: 'LOAD_SECTION',
      section,
      students,
      answeredQuestionIds: answeredIds,
      questProgress: saved?.quest_progress,
    });

    // Attempt to sync any pending queue from previous session
    if (navigator.onLine) {
      await handleSync(section.id);
    }
  }, [handleSync]);

  const setSessionContext = useCallback(
    async (grade: number, sectionLetter: string, sectionObj: Section, studentsObj: Student[]) => {
      const classroomId = `class_${grade}_${sectionLetter.toUpperCase()}`;
      const saved = await getSessionState(classroomId);

      dispatch({
        type: 'LOAD_SECTION',
        section: sectionObj,
        students: studentsObj.length > 0 ? studentsObj : (saved?.cached_students ?? []),
        answeredQuestionIds: saved?.answered_question_ids ?? [],
        grade,
        sectionLetter: sectionLetter.toUpperCase(),
        questProgress: saved?.quest_progress ?? {
          unlocked_states: ['Ladakh'],
          completed_states: [],
          current_state: 'Ladakh',
        },
      });

      dispatch({
        type: 'SET_CLASSROOM_CONTEXT',
        grade,
        sectionLetter: sectionLetter.toUpperCase(),
        classroomId,
      });
    },
    []
  );

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

  const setAppMode = useCallback((mode: AppMode) => {
    dispatch({ type: 'SET_APP_MODE', mode });
  }, []);

  const setSelectedClass = useCallback((classNum: number) => {
    dispatch({ type: 'SET_SELECTED_CLASS', classNum });
  }, []);

  const setSelectedSection = useCallback((sectionLetter: string) => {
    dispatch({ type: 'SET_SELECTED_SECTION', sectionLetter });
  }, []);

  const setSelectedState = useCallback((stateName: string) => {
    dispatch({ type: 'SET_SELECTED_STATE', stateName });
  }, []);

  const setQuestCurrentState = useCallback((stateName: string) => {
    dispatch({ type: 'SET_QUEST_CURRENT_STATE', stateName });
  }, []);

  const completeQuestState = useCallback((stateName: string) => {
    dispatch({ type: 'COMPLETE_QUEST_STATE', stateName });
  }, []);

  const recordQuestAttempt = useCallback((stateName: string, correctCount: number) => {
    dispatch({ type: 'RECORD_QUEST_ATTEMPT', stateName, correctCount });
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
    refreshStudents,
    setSessionContext,
    spinNext,
    landOnStudent,
    skipStudent,
    markAbsent,
    markPresent,
    answerQuestion,
    advanceMission,
    buildNewQueue,
    setAppMode,
    setSelectedClass,
    setSelectedSection,
    setSelectedState,
    setQuestCurrentState,
    completeQuestState,
    recordQuestAttempt,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

export { ALL_MISSIONS, ALL_QUESTIONS };
