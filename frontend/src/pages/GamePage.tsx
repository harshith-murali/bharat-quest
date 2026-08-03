import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import { fetchSection } from '../api/client';
import { getSessionState } from '../db/idb';
import { useSession } from '../store/sessionStore';
import { Section, Student } from '../types';

import Spinner from '../components/Spinner';
import QuizCard from '../components/QuizCard';
import StudentRow from '../components/StudentRow';
import OfflineBanner from '../components/OfflineBanner';
import IndiaMapScene from '../components/3d/IndiaMapScene';
import MascotCanvas, { MascotState } from '../components/3d/MascotCanvas';
import MonumentRevealModal, { MonumentInfo } from '../components/MonumentRevealModal';
import GameVictoryModal from '../components/GameVictoryModal';

import mascotData from '../content/mascot_dialogue.json';

interface MissionDialogueData {
  city: string;
  welcome: string;
  facts: string[];
  monument: MonumentInfo;
}

const DIALOGUE_BANK = mascotData.missions as Record<string, MissionDialogueData>;

export default function GamePage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const {
    state,
    currentMission,
    currentQuestion,
    missionQuestions,
    currentStudent,
    studentsWithSession,
    canAdvanceMission,
    loadSection,
    skipStudent,
    markAbsent,
    markPresent,
    advanceMission,
  } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quiz' | 'roster'>('quiz');

  // 3D Travel State
  const [isTravelling, setIsTravelling] = useState(false);
  const [travelProgress, setTravelProgress] = useState(0);

  // Mascot State
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [mascotDialogue, setMascotDialogue] = useState<string>('');

  // Monument Reveal Modal State
  const [revealedMonument, setRevealedMonument] = useState<{ monument: MonumentInfo; city: string } | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Initialize Session
  useEffect(() => {
    if (!sectionId) return;

    async function initSession() {
      setLoading(true);
      setError(null);

      try {
        let section: Section | null = null;
        let students: Student[] = [];

        const online = await fetchSection(sectionId!);
        if (online) {
          section = online.section;
          students = online.students;
        } else {
          const cached = await getSessionState(sectionId!);
          if (cached) {
            section = cached.cached_section;
            students = cached.cached_students;
          } else {
            setError('No cached data found. Please connect to internet and try again.');
            setLoading(false);
            return;
          }
        }

        await loadSection(section, students);
      } catch (err) {
        setError(`Failed to load session: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  // Update Mascot dialogue when mission changes
  useEffect(() => {
    if (!state.currentMissionId) return;
    const missionInfo = DIALOGUE_BANK[state.currentMissionId];
    if (missionInfo) {
      setMascotDialogue(missionInfo.welcome);
      setMascotState('talk');
      const timer = setTimeout(() => setMascotState('idle'), 4200);
      return () => clearTimeout(timer);
    }
  }, [state.currentMissionId]);

  const handleAnswerResponse = useCallback(
    (correct: boolean, studentName: string, xpValue: number, correctAnswerText: string) => {
      if (correct) {
        const celebrations = mascotData.generic_celebrations || ['Shabash! Excellent answer!'];
        const randomPraise = celebrations[Math.floor(Math.random() * celebrations.length)];
        setMascotDialogue(`${randomPraise} Great job ${studentName}! +${xpValue} XP added to your section! 🎉`);
        setMascotState('celebrate');
        setTimeout(() => setMascotState('idle'), 4200);
      } else {
        setMascotDialogue(`Ah, almost ${studentName}! The correct answer was: "${correctAnswerText}". Keep going! 💪`);
        setMascotState('talk');
        setTimeout(() => setMascotState('idle'), 4200);
      }
    },
    []
  );

  // Handle Mission Advancement with 3D Car Spline Travel Animation
  const handleAdvanceMission = useCallback(() => {
    if (!canAdvanceMission || isTravelling) return;

    const currentMissionKey = state.currentMissionId ?? 'mission_1';
    const currentInfo = DIALOGUE_BANK[currentMissionKey];

    const travelDuration = currentMissionKey === 'mission_1' ? 10.5 : currentMissionKey === 'mission_2' ? 15.5 : 22.0;

    setIsTravelling(true);
    setMascotState('talk');
    setMascotDialogue(`Vroom vroom! Driving on the map to ${currentInfo?.city ?? 'the next destination'}! 🚗💨`);

    const progressObj = { value: 0 };
    gsap.to(progressObj, {
      value: 1,
      duration: travelDuration,
      ease: 'power1.inOut',
      onUpdate: () => {
        setTravelProgress(progressObj.value);
      },
      onComplete: () => {
        setTravelProgress(1);

        // 3-second arrival timer delay before displaying quiz modal
        setTimeout(() => {
          setIsTravelling(false);
          setTravelProgress(1); // Keep car parked at destination

          if (currentInfo?.monument) {
            setRevealedMonument({
              monument: currentInfo.monument,
              city: currentInfo.city,
            });
          }

          if (currentMissionKey === 'mission_3') {
            setIsVictoryModalOpen(true);
          } else {
            advanceMission();
          }
          setMascotState('celebrate');
          setTimeout(() => setMascotState('idle'), 3500);
        }, 3000);
      },
    });
  }, [canAdvanceMission, isTravelling, state.currentMissionId, advanceMission]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner-ring" />
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>Loading session…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <h2 style={{ color: 'var(--color-red-light)' }}>Session Error</h2>
          <p style={{ marginTop: '0.5rem' }}>{error}</p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/')}>
            ← Back to Sections
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = state.answeredQuestionIds.filter((id) =>
    missionQuestions.some((q) => q.id === id)
  ).length;

  const totalClassXP = studentsWithSession.reduce((sum, s) => sum + s.total_xp, 0);

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <OfflineBanner />

      {/* Monument Arrival Modal Overlay */}
      {revealedMonument && (
        <MonumentRevealModal
          monument={revealedMonument.monument}
          cityName={revealedMonument.city}
          onClose={() => setRevealedMonument(null)}
        />
      )}

      {/* Top Header Bar with Tricolor Branding & Game HUD Status Bar */}
      <header className="app-header">
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ padding: '0.4rem 0.8rem' }}>
            ← Back
          </button>
          <div className="tricolor-ribbon">
            <span className="orange"></span>
            <span className="white"></span>
            <span className="green"></span>
          </div>
          <div>
            <h1 className="text-tricolor-gradient" style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0 }}>
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              Drive. Explore. Learn. Compete.
            </p>
          </div>
        </div>

        {/* Game HUD Status Bar Badges */}
        <div className="flex items-center gap-2">
          {currentMission && (
            <div className="hud-pill">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>MISSION:</span>
              <span style={{ color: 'var(--color-saffron)' }}>{currentMission.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                ({answeredCount}/{missionQuestions.length})
              </span>
            </div>
          )}

          <span className="hud-pill hud-pill-coin">🪙 5,200</span>
          <span className="hud-pill hud-pill-gem">💎 320</span>
          <span className="hud-pill hud-pill-xp">⭐ {totalClassXP > 0 ? totalClassXP : '12,350'} XP</span>

          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>

          <button
            className="btn btn-indigo btn-sm"
            onClick={() => navigate(`/leaderboard/${sectionId}`)}
            id="leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        </div>
      </header>

      {/* Progress Line */}
      <div style={{ height: 5, background: 'var(--color-surface-2)' }}>
        <div
          style={{
            height: '100%',
            width: `${missionQuestions.length > 0 ? (answeredCount / missionQuestions.length) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #ff9933, #ffffff, #10b981)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Main Container Layout: 3D India Map Hero Panel on Top */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          padding: '1.25rem 1.5rem',
          maxWidth: 1600,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* HERO PANEL: Authentic 3D India World Map Viewport */}
        <section style={{ height: 480, width: '100%', position: 'relative', flexShrink: 0 }}>
          <IndiaMapScene
            currentMissionId={state.currentMissionId ?? 'mission_1'}
            mapPosition={state.section?.map_position ?? 0}
            isTravelling={isTravelling}
            travelProgress={travelProgress}
          />
        </section>

        {/* LOWER SECTION: Split 3 Columns (Turn Queue | Mascot + Quiz | Class Roster) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr 320px',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Turn Queue Spinner Card & Mission Advance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Spinner />

            <button
              className={`btn ${canAdvanceMission && !isTravelling ? 'btn-success' : 'btn-outline'} w-full`}
              disabled={!canAdvanceMission || isTravelling}
              onClick={handleAdvanceMission}
              id="advance-mission-btn"
              style={{ fontSize: '1.05rem' }}
            >
              {isTravelling
                ? '🚗 Traveling on Map…'
                : canAdvanceMission
                ? '🚀 Advance to Next Mission'
                : `📋 ${missionQuestions.length - answeredCount} questions left`}
            </button>
          </div>

          {/* CENTER: Adventurer Tiger Mascot + Active Quiz Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Expressive Mascot Companion Viewport & Speech Bubble */}
            <MascotCanvas
              state={mascotState}
              dialogueText={mascotDialogue}
            />

            {/* Quiz Card or Ready Prompt */}
            {!currentStudent ? (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ fontSize: '4.2rem' }}>🧭</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-text-primary)', margin: 0 }}>
                  Ready to Start the Quest?
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: 440, fontSize: '1.05rem', margin: 0 }}>
                  Tap <strong style={{ color: 'var(--color-saffron)' }}>Spin!</strong> on the turn queue to select a student to come up to the smartboard for the next question.
                </p>
              </div>
            ) : currentQuestion ? (
              <QuizCard
                question={currentQuestion}
                studentName={currentStudent.name}
                studentAvatar={currentStudent.avatar}
                onAnswerResponse={handleAnswerResponse}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: 'var(--color-surface)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ fontSize: '4rem' }}>🎊</div>
                <h2 style={{ color: 'var(--color-green-light)', marginTop: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '2.2rem' }}>
                  Mission Complete!
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '1.05rem' }}>
                  All questions answered! Tap <strong>Advance to Next Mission</strong> to drive your car to the next destination!
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Class Roster Cards */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                👥 Class Roster
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                {studentsWithSession.filter((s) => !s.is_absent).length} Present
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn btn-sm ${activeTab === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, minHeight: 36 }}
                onClick={() => setActiveTab('quiz')}
              >
                Present
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'roster' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, minHeight: 36 }}
                onClick={() => setActiveTab('roster')}
              >
                All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 480, overflowY: 'auto', paddingRight: 2 }}>
              {studentsWithSession
                .filter((s) => activeTab === 'roster' || !s.is_absent)
                .map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    isCurrentTurn={currentStudent?.id === student.id}
                    compact
                    onSkip={!student.is_absent ? () => skipStudent(student.id) : undefined}
                    onMarkAbsent={!student.is_absent ? () => markAbsent(student.id) : undefined}
                    onMarkPresent={student.is_absent ? () => markPresent(student.id) : undefined}
                  />
                ))}
            </div>
          </div>
        </section>
      </main>
      {isVictoryModalOpen && (
        <GameVictoryModal
          totalXp={state.totalSessionXp || 180}
          onRestart={() => {
            setIsVictoryModalOpen(false);
            window.location.reload();
          }}
          onHome={() => {
            setIsVictoryModalOpen(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
