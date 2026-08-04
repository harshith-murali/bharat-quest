import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { useSession } from '../store/sessionStore';
import IconRail from '../components/IconRail';
import RosterDrawer from '../components/RosterDrawer';
import Mascot from '../components/3d/Mascot';
import QuizCard from '../components/QuizCard';

import mascotData from '../content/mascot_dialogue.json';

interface MissionDialogueData {
  city: string;
  welcome: string;
  facts: string[];
}
const DIALOGUE_BANK = mascotData.missions as Record<string, MissionDialogueData>;

export default function QuizScreen() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const {
    state,
    currentQuestion,
    currentStudent,
    spinNext,
  } = useSession();

  // Mascot State
  const [mascotState, setMascotState] = useState<'idle' | 'talk' | 'celebrate' | 'sulk'>('idle');
  const [mascotDialogue, setMascotDialogue] = useState<string>('');

  // Drawers & Modals
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'talk' | 'facts' | null>(null);

  const currentMissionKey = state.currentMissionId ?? 'mission_1';
  const currentInfo = DIALOGUE_BANK[currentMissionKey];

  // Answer feedback callback
  const handleAnswerResponse = useCallback(
    (correct: boolean, studentName: string, xpValue: number, correctAnswerText: string) => {
      if (correct) {
        const celebrations = mascotData.generic_celebrations || ['Shabash! Excellent answer!'];
        const randomPraise = celebrations[Math.floor(Math.random() * celebrations.length)];
        setMascotDialogue(`${randomPraise} Great job ${studentName}! +${xpValue} XP added to your section! 🎉`);
        setMascotState('celebrate');
        setTimeout(() => setMascotState('idle'), 4200);
      } else {
        setMascotDialogue(`Ohhh, that's not quite right ${studentName}! The correct answer was: "${correctAnswerText}". Don't worry, you'll get the next one! 💪`);
        setMascotState('sulk');
        setTimeout(() => setMascotState('idle'), 4200);
      }
    },
    []
  );

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#090d16', position: 'relative' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Top HUD Header */}
      <header className="app-header" style={{ height: 60 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/session/${sectionId}/map`)} style={{ padding: '0.35rem 0.75rem' }}>
            ← Map View
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
              3. AI COMPANION & QUIZ
            </p>
          </div>
        </div>

        {/* Right HUD Badges */}
        <div className="flex items-center gap-2">
          <span className="hud-pill hud-pill-coin">🪙 5,200</span>
          <span className="hud-pill hud-pill-gem">💎 320</span>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          <button className="btn btn-indigo btn-sm" onClick={() => navigate(`/leaderboard/${sectionId}`)}>
            🏆 Leaderboard
          </button>
        </div>
      </header>

      {/* Screen 3 Main Layout with Left Icon Rail */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', position: 'relative' }}>
        {/* Persistent Left Icon Rail */}
        <IconRail
          activeTab="quiz"
          onOpenRoster={() => setIsRosterOpen(true)}
          onOpenTalk={() => {
            setMascotState('talk');
            setMascotDialogue(currentInfo?.welcome || 'Namaste! Welcome to Agra, home of the Taj Mahal!');
            setTimeout(() => setMascotState('idle'), 4000);
          }}
          onOpenFacts={() => setActiveModal('facts')}
        />

        {/* Quiz & AI Mascot Screen Content Split */}
        <main
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '400px 1fr',
            gap: '1.25rem',
            padding: '1.25rem 1.5rem',
            maxWidth: 1600,
            margin: '0 auto',
            width: '100%',
            overflowY: 'auto',
          }}
        >
          {/* LEFT: Large AI Mascot Companion Portrait & Speech Bubble (Matches Reference Screen 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 3D Mascot Character Portrait Card */}
            <div
              style={{
                height: 320,
                width: '100%',
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(145deg, #181d2f 0%, #0d111e 100%)',
                border: '2px solid var(--color-saffron)',
                boxShadow: '0 0 30px rgba(255, 153, 51, 0.3), var(--shadow-card)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} style={{ width: '100%', height: '100%' }}>
                <ambientLight intensity={1.6} />
                <directionalLight position={[5, 10, 7]} intensity={1.8} />
                <pointLight position={[-5, 5, -5]} intensity={0.6} />
                <Suspense fallback={null}>
                  <Mascot state={mascotState} />
                </Suspense>
              </Canvas>

              {/* Name Tag with Emotion Indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 12,
                  right: 12,
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 900,
                  color: mascotState === 'celebrate' ? '#10b981' : mascotState === 'sulk' ? '#ef4444' : 'var(--color-gold)',
                  fontFamily: 'var(--font-display)',
                  background: mascotState === 'celebrate' ? 'rgba(16, 185, 129, 0.2)' : mascotState === 'sulk' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 20, 34, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 12px',
                  borderRadius: '10px',
                  border: mascotState === 'celebrate' ? '1px solid rgba(16, 185, 129, 0.5)' : mascotState === 'sulk' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,193,7,0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                BHARAT MASCOT 🐶 ({mascotState === 'celebrate' ? '✨ CELEBRATING' : mascotState === 'sulk' ? '😔 SULKING' : mascotState.toUpperCase()})
              </div>
            </div>

            {/* Mascot Speech Bubble Card */}
            <div
              className="speech-bubble-card"
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-gold)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem', color: 'var(--color-saffron)' }}>
                  Bharat Companion
                </span>
                <span className="badge badge-xp" style={{ fontSize: '0.7rem' }}>NCERT Guide</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.45 }}>
                {mascotDialogue || currentInfo?.welcome || 'Namaste! Welcome to Agra, home of the Taj Mahal!'}
              </p>
            </div>
          </div>

          {/* RIGHT: Compact Turn Queue + Active Quiz Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Compact Turn Queue Strip */}
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
                boxShadow: 'var(--shadow-card)',
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
                  {state.isSpinning ? '🌀 Spinning…' : '🎰 Spin Next Student'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setIsRosterOpen(true)}>
                  👥 Roster Drawer
                </button>
              </div>
            </div>

            {/* Quiz Card */}
            {currentQuestion ? (
              <QuizCard
                question={currentQuestion}
                studentName={currentStudent?.name || 'Class Explorer'}
                studentAvatar={currentStudent?.avatar || '🧑'}
                onAnswerResponse={handleAnswerResponse}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 2rem',
                  background: 'var(--color-surface)',
                  border: '2px solid var(--color-gold)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0 0 35px rgba(255, 193, 7, 0.25)',
                }}
                className="anim-pop-in"
              >
                <div style={{ fontSize: '4.5rem' }}>🚗💨</div>
                <h2 style={{ color: 'var(--color-gold)', marginTop: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '2.2rem' }}>
                  All 5 Questions Cleared!
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '1.05rem', lineHeight: 1.5 }}>
                  Awesome job! All 5 questions for this region have been answered. Tap below to drive to the next location on the 3D map!
                </p>
                <button
                  className="btn btn-success btn-lg mt-2"
                  style={{ fontSize: '1.2rem', padding: '1rem 2.2rem', borderRadius: '14px', boxShadow: '0 0 25px rgba(16,185,129,0.5)' }}
                  onClick={() => navigate(`/session/${sectionId}/map?autoDrive=true`, { state: { autoDrive: true } })}
                >
                  🚀 Drive to Next Region
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Facts Modal */}
      {activeModal === 'facts' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(10, 14, 24, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setActiveModal(null)}
          className="anim-fade-in"
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #1d2136 0%, #151828 100%)',
              border: '2px solid var(--color-saffron)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 0 35px rgba(255, 153, 51, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
            className="anim-pop-in"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-saffron)', fontSize: '1.3rem', margin: 0 }}>
                💡 NCERT Fun Facts
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.2rem', color: '#fff' }}>
              {currentInfo?.facts?.map((fact, idx) => (
                <li key={idx} style={{ fontSize: '1rem', lineHeight: 1.4 }}>{fact}</li>
              )) || <li>Taj Mahal is made of white marble and took over 20 years to build!</li>}
            </ul>

            <button className="btn btn-primary w-full mt-2" onClick={() => setActiveModal(null)}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
