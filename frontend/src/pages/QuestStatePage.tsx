import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { useSession } from '../store/sessionStore';
import IconRail from '../components/IconRail';
import RosterDrawer from '../components/RosterDrawer';
import GenericQuizCard, { NormalizedQuestion } from '../components/GenericQuizCard';
import LionMascot from '../components/3d/LionMascot';
import QuestCompleteModal from '../components/QuestCompleteModal';
import FactsPanel from '../components/FactsPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  getRandomQuestAttemptQuestions,
  resolveCorrectIndex,
  hasQuestData,
  QUEST_QUESTIONS_PER_ATTEMPT,
  QUEST_PASSING_SCORE,
  CANONICAL_QUEST_STATES,
} from '../loaders/questLoader';
import { QuestQuestion } from '../types';

import mascotData from '../content/mascot_dialogue.json';

function difficultyXp(difficulty: string): number {
  if (difficulty === 'hard') return 20;
  if (difficulty === 'medium') return 15;
  return 10;
}

function toNormalized(q: QuestQuestion): NormalizedQuestion | null {
  const correctIdx = resolveCorrectIndex(q.options, q.answer);
  if (correctIdx === -1) return null;
  return {
    id: q.id,
    questionText: q.question,
    options: q.options,
    correctOptionIndex: correctIdx,
    xpValue: difficultyXp(q.difficulty),
    metadata: {
      topic: q.topic,
      difficulty: q.difficulty,
      source: q.source,
    },
  };
}

export default function QuestStatePage() {
  const navigate = useNavigate();
  const { sectionId, stateName: stateNameEncoded } = useParams<{ sectionId: string; stateName: string }>();
  const stateName = decodeURIComponent(stateNameEncoded ?? '');

  const { state, currentStudent, spinNext, recordQuestAttempt } = useSession();

  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [attemptQuestions, setAttemptQuestions] = useState<NormalizedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAttemptFinished, setIsAttemptFinished] = useState(false);
  // Guards against the attempt being recorded twice (or a second drive being
  // queued) if the last answer / travel button is clicked rapidly.
  const attemptRecordedRef = useRef(false);
  const [showFinale, setShowFinale] = useState(false);
  const [showFacts, setShowFacts] = useState(false);
  const navigatingRef = useRef(false);

  // Mascot state
  const [mascotState, setMascotState] = useState<'idle' | 'talk' | 'celebrate' | 'sulk'>('idle');
  const [mascotDialogue, setMascotDialogue] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Existing progress for this state
  const stateProgress = state.questProgress.state_quiz_progress?.[stateName] ?? {
    attempts: 0,
    bestScore: 0,
    lastScore: 0,
    completed: false,
  };

  // Start / restart a 10-question attempt
  const startAttempt = useCallback(async () => {
    if (!stateName) return;

    setLoading(true);
    setLoadError(null);
    setAttemptQuestions([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setIsAttemptFinished(false);
    // Each attempt starts with a fresh score and re-armed one-shot guards.
    attemptRecordedRef.current = false;
    navigatingRef.current = false;

    if (!hasQuestData(stateName)) {
      setLoadError(`Quest currently unavailable for ${stateName}.`);
      setLoading(false);
      return;
    }

    try {
      const raw = await getRandomQuestAttemptQuestions(stateName, QUEST_QUESTIONS_PER_ATTEMPT);

      if (raw.length < QUEST_QUESTIONS_PER_ATTEMPT) {
        setLoadError(`Quest currently unavailable for ${stateName}.`);
        setLoading(false);
        return;
      }

      const normalized = raw
        .map(toNormalized)
        .filter((q): q is NormalizedQuestion => q !== null);

      setAttemptQuestions(normalized);
    } catch {
      setLoadError(`Failed to load Quest questions for ${stateName}.`);
    } finally {
      setLoading(false);
    }
  }, [stateName]);

  useEffect(() => {
    startAttempt();
  }, [startAttempt]);

  const currentQuestion = attemptQuestions[currentIndex] ?? null;

  const handleAnswerResponse = useCallback(
    (_correct: boolean, studentName: string, xpValue: number, correctAnswerText: string) => {
      if (_correct) {
        setCorrectCount((prev) => prev + 1);
        const praises = (mascotData.generic_celebrations as string[]) ?? ['Shabash!'];
        const praise = praises[Math.floor(Math.random() * praises.length)];
        setMascotDialogue(`${praise} Excellent, ${studentName}! +${xpValue} XP! Keep going! 🎉`);
        setMascotState('celebrate');
      } else {
        setMascotDialogue(
          `Not quite ${studentName}! The correct answer was: "${correctAnswerText}". Keep trying! 💪`
        );
        setMascotState('sulk');
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMascotState('idle'), 3500);
    },
    []
  );

  function handleNextQuestion() {
    if (currentIndex + 1 < attemptQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Attempt finished — record exactly once per attempt.
      if (attemptRecordedRef.current) return;
      attemptRecordedRef.current = true;
      setIsAttemptFinished(true);
      recordQuestAttempt(stateName, correctCount);

      // Finishing the final state (Kerala) ends the whole journey — celebrate.
      const isLastState =
        CANONICAL_QUEST_STATES.indexOf(stateName) === CANONICAL_QUEST_STATES.length - 1;
      if (isLastState && correctCount >= QUEST_PASSING_SCORE) {
        setTimeout(() => setShowFinale(true), 900);
      }
    }
  }

  const isPassed = correctCount >= QUEST_PASSING_SCORE;

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#090d16', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Header */}
      <header className="app-header" style={{ height: 60, flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/session/${sectionId}/map`)}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            ← Map
          </button>
          <div className="tricolor-ribbon">
            <span className="orange"></span>
            <span className="white"></span>
            <span className="green"></span>
          </div>
          <div>
            <h1 className="text-tricolor-gradient" style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              🗺️ QUEST · {stateName}
            </p>
          </div>
        </div>


        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          <button className="btn btn-indigo btn-sm" onClick={() => navigate(`/leaderboard/${sectionId}`)}>
            🏆 Leaderboard
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <IconRail
          activeTab="quiz"
          onOpenRoster={() => setIsRosterOpen(true)}
          onOpenFacts={() => setShowFacts(true)}
          onOpenTalk={() => {
            setMascotState('talk');
            setMascotDialogue(`Let's discover the wonders of ${stateName}! Answer 10 questions to complete this Quest!`);
            setTimeout(() => setMascotState('idle'), 4000);
          }}
        />

        <main
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: '1.25rem',
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
          }}
        >
          {/* LEFT: Mascot & State Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* State hero card */}
            <div
              style={{
                background: 'linear-gradient(145deg, #181d2f 0%, #0d111e 100%)',
                border: '2px solid var(--color-saffron)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem',
                boxShadow: '0 0 30px rgba(255,153,51,0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>
                {stateProgress.completed ? '🟢' : '🗺️'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--color-saffron)' }}>
                {stateName} Quest
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                10 questions per attempt · 6/10 to pass
              </div>

              {/* Progress stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>BEST SCORE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: '#ffea79' }}>
                    {stateProgress.bestScore} / 10
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>ATTEMPTS</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: '#60a5fa' }}>
                    {stateProgress.attempts}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Mascot */}
            <div
              style={{
                height: 240,
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(145deg, #181d2f 0%, #0d111e 100%)',
                border: '2px solid var(--color-saffron)',
                boxShadow: '0 0 30px rgba(255,153,51,0.3), var(--shadow-card)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <ErrorBoundary>
                <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} style={{ width: '100%', height: '100%' }}>
                  <ambientLight intensity={1.6} />
                  <directionalLight position={[5, 10, 7]} intensity={1.8} />
                  <pointLight position={[-5, 5, -5]} intensity={0.6} />
                  <Suspense fallback={null}>
                    <LionMascot state={mascotState} />
                  </Suspense>
                </Canvas>
              </ErrorBoundary>
            </div>

            {/* Speech bubble */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-gold)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.45 }}>
                {mascotDialogue || `Answer 10 questions to complete ${stateName} Quest! Score ${QUEST_PASSING_SCORE}/10 or better to pass!`}
              </p>
            </div>
          </div>

          {/* RIGHT: Student spinner & Quest Attempt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Student turn strip */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.4rem' }}>🎯</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>ACTIVE STUDENT TURN</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-saffron)' }}>
                    {currentStudent ? `${currentStudent.avatar || '🧑'} ${currentStudent.name}` : 'No student selected'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => spinNext()} disabled={state.isSpinning}>
                  {state.isSpinning ? '🌀 Spinning…' : '🎰 Spin Next'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setIsRosterOpen(true)}>
                  👥 Roster
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem', color: 'var(--color-saffron)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                <div className="spinner-ring" />
                Selecting 10 random questions for {stateName} Quest…
              </div>
            )}

            {/* Error */}
            {loadError && !loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  background: 'var(--color-surface)',
                  border: '2px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <div style={{ fontSize: '3rem' }}>🗺️</div>
                <h3 style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>
                  {loadError}
                </h3>
                <button className="btn btn-outline mt-2" onClick={() => navigate(`/session/${sectionId}/map`)}>
                  ← Back to Map
                </button>
              </div>
            )}

            {/* Attempt Finished Result Card */}
            {!loading && !loadError && isAttemptFinished && (
              <div
                className="anim-pop-in"
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  background: 'var(--color-surface)',
                  border: `2px solid ${isPassed ? '#10b981' : '#f97316'}`,
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: `0 0 35px ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(249,115,22,0.3)'}`,
                }}
              >
                <div style={{ fontSize: '4.5rem' }}>{isPassed ? '🏆🟢' : '🎯💪'}</div>
                <h2 style={{ color: isPassed ? '#34d399' : '#ff9933', marginTop: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '2rem' }}>
                  {isPassed ? `${stateName} Quest Completed!` : 'Quest Not Completed Yet'}
                </h2>

                <div
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '1rem 2rem',
                    margin: '1rem 0',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>YOUR ATTEMPT SCORE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', color: isPassed ? '#34d399' : '#ffea79' }}>
                    {correctCount} / 10
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    {isPassed ? `Need 6/10 · PASSED!` : `Need 6/10 to pass`}
                  </div>
                </div>

                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: 460, margin: '0 auto 1.5rem' }}>
                  {isPassed
                    ? `Great job! You achieved ${correctCount}/10 correct answers. Best score recorded!`
                    : `You scored ${correctCount}/10. You need at least 6/10 to mark ${stateName} as completed. Try again!`}
                </p>

                {(() => {
                  const activeJourneyState = state.questProgress?.current_state || 'Ladakh';
                  const idx = CANONICAL_QUEST_STATES.indexOf(stateName);
                  const nextState = idx !== -1 && idx + 1 < CANONICAL_QUEST_STATES.length ? CANONICAL_QUEST_STATES[idx + 1] : null;
                  const isFinalState = isPassed && idx === CANONICAL_QUEST_STATES.length - 1;
                  const canTravelOn = isPassed && stateName === activeJourneyState && !!nextState;

                  function goToMap() {
                    // Guard against rapid double-clicks queuing two drives.
                    if (navigatingRef.current) return;
                    navigatingRef.current = true;

                    if (canTravelOn) {
                      navigate(`/session/${sectionId}/map`, {
                        state: { driveFromState: stateName, driveToState: nextState },
                      });
                    } else {
                      navigate(`/session/${sectionId}/map`);
                    }
                  }

                  return (
                    <>
                      {isFinalState && (
                        <div
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,153,51,0.08))',
                            border: '1.5px solid var(--color-gold)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            margin: '0 auto 1.25rem',
                            maxWidth: 460,
                          }}
                        >
                          <div style={{ fontSize: '2rem' }}>🏆🇮🇳</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                            Bharat Quest Complete!
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                            You have journeyed through all {CANONICAL_QUEST_STATES.length} states. Incredible work!
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={startAttempt}>
                          🔄 {isPassed ? 'Replay Quest' : 'Retry Quest'}
                        </button>
                        <button
                          className={canTravelOn ? 'btn btn-primary' : 'btn btn-outline'}
                          onClick={goToMap}
                          style={canTravelOn ? { boxShadow: '0 0 25px rgba(255,153,51,0.4)' } : undefined}
                        >
                          {canTravelOn ? `🚗 Travel to ${nextState}` : '🗺️ Back to Map'}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Active Quiz Question (1 to 10) */}
            {!loading && !loadError && !isAttemptFinished && currentQuestion && (
              <div>
                {/* Attempt Question Header Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-saffron)' }}>
                    QUESTION {currentIndex + 1} OF {QUEST_QUESTIONS_PER_ATTEMPT}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-green-light)' }}>
                    CORRECT: {correctCount}
                  </span>
                </div>

                <GenericQuizCard
                  question={currentQuestion}
                  studentName={currentStudent?.name || 'Class Explorer'}
                  studentAvatar={currentStudent?.avatar || '🧑'}
                  onAnswerResponse={(correct, name, xp, correctText) => {
                    handleAnswerResponse(correct, name, xp, correctText);
                    setTimeout(handleNextQuestion, 1600);
                  }}
                  skipGlobalDispatch={false}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Facts for the state being quizzed — the rail button previously did
          nothing here because no handler or panel was wired up. */}
      {showFacts && (
        <FactsPanel stateName={stateName} onClose={() => setShowFacts(false)} />
      )}

      {/* Final celebration — the journey ends at the last canonical state. */}
      {showFinale && (
        <QuestCompleteModal
          completedCount={state.questProgress.completed_states?.length ?? 0}
          totalCorrect={Object.values(state.questProgress.state_quiz_progress ?? {}).reduce(
            (sum, p) => sum + (p?.bestScore ?? 0),
            0
          )}
          onClose={() => {
            setShowFinale(false);
            navigate(`/session/${sectionId}/map`);
          }}
          onReplay={() => {
            setShowFinale(false);
            startAttempt();
          }}
        />
      )}
    </div>
  );
}
