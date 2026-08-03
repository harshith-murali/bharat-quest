import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import gsap from 'gsap';

import { useSession } from '../store/sessionStore';
import IconRail from '../components/IconRail';
import RosterDrawer from '../components/RosterDrawer';
import IndiaMapScene from '../components/3d/IndiaMapScene';
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

export default function MapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state, canAdvanceMission, advanceMission } = useSession();

  // Drawers & Modals
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'talk' | 'facts' | 'mission' | null>(null);
  const [revealedMonument, setRevealedMonument] = useState<{ monument: MonumentInfo; city: string } | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // 3D Car Travel Animation State
  const [isTravelling, setIsTravelling] = useState(false);
  const [travelProgress, setTravelProgress] = useState(0);

  const currentMissionKey = state.currentMissionId ?? 'mission_1';
  const currentInfo = DIALOGUE_BANK[currentMissionKey];

  // Advance mission driver animation
  const handleAdvanceMission = useCallback(() => {
    if (!canAdvanceMission || isTravelling) return;

    setIsTravelling(true);
    const progressObj = { value: 0 };
    const travelDuration = currentMissionKey === 'mission_1' ? 10.5 : currentMissionKey === 'mission_2' ? 15.5 : 22.0;

    gsap.to(progressObj, {
      value: 1,
      duration: travelDuration,
      ease: 'power1.inOut',
      onUpdate: () => setTravelProgress(progressObj.value),
      onComplete: () => {
        setTravelProgress(1);

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
        }, 3000);
      },
    });
  }, [canAdvanceMission, isTravelling, currentMissionKey, currentInfo, advanceMission]);

  // Auto-drive trigger when navigating from quiz completion
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldAutoDrive = searchParams.get('autoDrive') === 'true' || location.state?.autoDrive;
    if (shouldAutoDrive && canAdvanceMission && !isTravelling) {
      const timer = setTimeout(() => {
        handleAdvanceMission();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [location, canAdvanceMission, isTravelling, handleAdvanceMission]);

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#031726', position: 'relative' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Monument Reveal Modal Overlay */}
      {revealedMonument && (
        <MonumentRevealModal
          monument={revealedMonument.monument}
          cityName={revealedMonument.city}
          onClose={() => setRevealedMonument(null)}
          onStartQuiz={() => {
            setRevealedMonument(null);
            navigate(`/session/${sectionId}/quiz`);
          }}
        />
      )}

      {/* Top HUD Bar */}
      <header className="app-header" style={{ height: 60, position: 'relative', zIndex: 30 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/session/${sectionId}/home`)} style={{ padding: '0.35rem 0.75rem' }}>
            ← Home
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
              2. INDIA WORLD MAP (3D)
            </p>
          </div>
        </div>

        {/* HUD Status Pills */}
        <div className="flex items-center gap-2">
          <button
            className={`btn ${canAdvanceMission && !isTravelling ? 'btn-success' : 'btn-outline'} btn-sm`}
            disabled={!canAdvanceMission || isTravelling}
            onClick={handleAdvanceMission}
          >
            {isTravelling ? '🚗 Traveling…' : canAdvanceMission ? '🚀 Drive to Destination' : '📋 Questions Pending'}
          </button>

          <span className="hud-pill hud-pill-coin">🪙 5,200</span>
          <span className="hud-pill hud-pill-gem">💎 320</span>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </header>

      {/* Main Viewport Container */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', position: 'relative' }}>
        {/* Left Vertical Icon Rail (Persistent Navigation) */}
        <IconRail
          activeTab="map"
          onOpenRoster={() => setIsRosterOpen(true)}
          onOpenTalk={() => setActiveModal('talk')}
          onOpenFacts={() => setActiveModal('facts')}
          onOpenMission={() => setActiveModal('mission')}
        />

        {/* Full Screen 3D India Map Scene */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <IndiaMapScene
            currentMissionId={state.currentMissionId ?? 'mission_1'}
            mapPosition={state.section?.map_position ?? 0}
            isTravelling={isTravelling}
            travelProgress={travelProgress}
          />
        </div>
      </div>

      {/* Info Modals / Overlays triggered from Left Icon Rail */}
      {activeModal && (
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
                {activeModal === 'talk' ? '💬 Mascot Guide Talk' : activeModal === 'facts' ? '💡 NCERT Fun Facts' : '⭐ Mission Details'}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {activeModal === 'talk' && (
              <p style={{ color: '#fff', fontSize: '1.1rem', lineHeight: 1.5 }}>
                "{currentInfo?.welcome || 'Namaste! Ready to explore India’s rich heritage and answer quizzes?'}"
              </p>
            )}

            {activeModal === 'facts' && (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.2rem', color: '#fff' }}>
                {currentInfo?.facts?.map((fact: string, idx: number) => (
                  <li key={idx} style={{ fontSize: '1rem', lineHeight: 1.4 }}>{fact}</li>
                )) || <li>Did you know? Taj Mahal changes colors throughout the day!</li>}
              </ul>
            )}

            {activeModal === 'mission' && (
              <div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                  Current Mission Target: <strong style={{ color: 'var(--color-gold)' }}>{currentInfo?.city || 'Agra'}</strong>
                </p>
                <p style={{ color: '#fff', marginTop: '0.5rem' }}>
                  {currentInfo?.monument?.description || 'Explore landmarks and complete classroom quiz questions to advance!'}
                </p>
              </div>
            )}

            <button className="btn btn-primary w-full mt-2" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
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
