import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import gsap from 'gsap';

import { useSession } from '../store/sessionStore';
import IconRail from '../components/IconRail';
import RosterDrawer from '../components/RosterDrawer';
import IndiaMapScene from '../components/3d/IndiaMapScene';
import MonumentRevealModal, { MonumentInfo } from '../components/MonumentRevealModal';
import GameVictoryModal from '../components/GameVictoryModal';
import StateArrivalModal from '../components/StateArrivalModal';
import FactsPanel from '../components/FactsPanel';
import TalkPanel from '../components/TalkPanel';
import mascotData from '../content/mascot_dialogue.json';
import { CANONICAL_QUEST_STATES } from '../loaders/questLoader';
import { STATE_COORDINATES } from '../utils/CoordinateScaler';
import { generateSeededRoutePath } from '../utils/RouteEngine';

interface MissionDialogueData {
  city: string;
  welcome: string;
  facts: string[];
  monument: MonumentInfo;
}
const DIALOGUE_BANK = mascotData.missions as Record<string, MissionDialogueData>;

// Canonical 30 states for Quest mode
const QUEST_STATES = CANONICAL_QUEST_STATES;

export default function MapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state, canAdvanceMission, advanceMission, setSelectedState, setQuestCurrentState } = useSession();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 700 });

  // Drawers & Modals
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'talk' | 'facts' | null>(null);
  const [revealedMonument, setRevealedMonument] = useState<{ monument: MonumentInfo; city: string } | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [arrivalStateName, setArrivalStateName] = useState<string | null>(null);

  // Quest state selection
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // 3D Car State-to-State Driving Animation State
  const [drivingLeg, setDrivingLeg] = useState<{ fromState: string; toState: string } | null>(null);
  const [isDriving, setIsDriving] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);
  const processedTransitionRef = useRef<string | null>(null);
  const driveTweenRef = useRef<gsap.core.Tween | null>(null);
  // Leg that still needs to finish animating; survives StrictMode remounts.
  const pendingLegRef = useRef<{ fromState: string; toState: string } | null>(null);

  // Legacy mission travel state
  const [isTravelling, setIsTravelling] = useState(false);
  const [travelProgress, setTravelProgress] = useState(0);

  // Trigger smooth 3D driving animation when returning from Quest completion.
  //
  // Two subtleties this handles:
  //  1. The effect must not depend on state it mutates itself, or it re-runs and
  //     tears down its own tween.
  //  2. React 18 StrictMode (dev) mounts → unmounts → remounts. The unmount
  //     cleanup kills the tween, so the remount MUST be able to recreate it.
  //     Guarding purely on a "already processed this leg" ref would make the
  //     remount bail out early, leaving isDriving=true with a dead tween and a
  //     car frozen at progress 0. So the guard is skipped when the pending leg
  //     still needs animating.
  const startDrive = useCallback((fromS: string, toS: string) => {
    driveTweenRef.current?.kill();

    setDrivingLeg({ fromState: fromS, toState: toS });
    setIsDriving(true);
    setDriveProgress(0);

    const obj = { val: 0 };
    driveTweenRef.current = gsap.to(obj, {
      val: 1,
      duration: 3.2,
      ease: 'power1.inOut',
      onUpdate: () => setDriveProgress(obj.val),
      onComplete: () => {
        setDriveProgress(1);
        setIsDriving(false);
        setDrivingLeg(null);
        pendingLegRef.current = null;
        setQuestCurrentState(toS);

        // Display arrival popup: "You have reached <State>!"
        setArrivalStateName(toS);
      },
    });
  }, [setQuestCurrentState]);

  useEffect(() => {
    const locState = location.state as { driveFromState?: string; driveToState?: string } | null;

    // Re-arm an in-flight leg after a StrictMode remount killed its tween.
    if (!locState?.driveFromState || !locState?.driveToState) {
      const pending = pendingLegRef.current;
      if (pending && !driveTweenRef.current?.isActive()) {
        startDrive(pending.fromState, pending.toState);
      }
      return;
    }

    const fromS = locState.driveFromState;
    const toS = locState.driveToState;
    const key = `${fromS}_${toS}`;

    if (processedTransitionRef.current === key && driveTweenRef.current?.isActive()) return;
    processedTransitionRef.current = key;
    pendingLegRef.current = { fromState: fromS, toState: toS };

    // Clear location state so a refresh/back-nav doesn't replay the drive.
    navigate(location.pathname, { replace: true, state: {} });

    startDrive(fromS, toS);
  }, [location.state, location.pathname, navigate, startDrive]);

  // Kill any in-flight drive tween only when the map screen actually unmounts.
  useEffect(() => {
    return () => {
      driveTweenRef.current?.kill();
      driveTweenRef.current = null;
    };
  }, []);

  const currentMissionKey = state.currentMissionId ?? 'mission_1';
  const currentInfo = DIALOGUE_BANK[currentMissionKey];

  // Track container size for state markers
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const update = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width || 1000, height: rect.height || 700 });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Advance mission driver animation (Quest travel — preserved)
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
          setTravelProgress(1);
          if (currentInfo?.monument) {
            setRevealedMonument({ monument: currentInfo.monument, city: currentInfo.city });
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
      const timer = setTimeout(() => { handleAdvanceMission(); }, 400);
      return () => clearTimeout(timer);
    }
  }, [location, canAdvanceMission, isTravelling, handleAdvanceMission]);

  function handleStateSelect(stateName: string) {
    // Only unlocked (or already completed) states are playable. Without this the
    // banner's "select an unlocked state" instruction was unenforced and any
    // state could be opened, skipping the progression entirely.
    const unlocked = state.questProgress?.unlocked_states ?? ['Ladakh'];
    const completed = state.questProgress?.completed_states ?? [];
    if (!unlocked.includes(stateName) && !completed.includes(stateName)) return;

    // Never navigate away mid-drive, or the arrival popup is lost.
    if (isDriving) return;

    setSelectedState(stateName);
    navigate(`/session/${sectionId}/quest/${encodeURIComponent(stateName)}`);
  }

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#031726', position: 'relative' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Monument Reveal Modal */}
      {revealedMonument && (
        <MonumentRevealModal
          monument={revealedMonument.monument}
          cityName={revealedMonument.city}
          onClose={() => setRevealedMonument(null)}
          onStartQuiz={() => {
            setRevealedMonument(null);
            navigate(`/session/${sectionId}/quest/${encodeURIComponent(state.selectedState || 'Karnataka')}`);
          }}
        />
      )}

      {/* Top HUD Bar */}
      <header className="app-header" style={{ height: 60, position: 'relative', zIndex: 30 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/session/${sectionId}/dashboard`)} style={{ padding: '0.35rem 0.75rem' }}>
            ← Dashboard
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
              🗺️ QUEST — India Map · Select a State
            </p>
          </div>
        </div>

        {/* Mode Switcher — centered */}
        {/* Right HUD */}
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-indigo btn-sm"
            onClick={() => navigate(`/leaderboard/${sectionId}`)}
          >
            🏆 Leaderboard
          </button>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </header>

      {/* Main Viewport */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', position: 'relative' }}>
        <IconRail
          activeTab="map"
          onOpenRoster={() => setIsRosterOpen(true)}
          onOpenTalk={() => setActiveModal('talk')}
          onOpenFacts={() => setActiveModal('facts')}
        />

        {/* Map + Quest state overlay */}
        <div ref={mapContainerRef} style={{ flex: 1, position: 'relative', height: '100%' }}>
          <IndiaMapScene
            currentStateName={state.questProgress?.current_state || 'Ladakh'}
            drivingLeg={drivingLeg}
            isDriving={isDriving}
            driveProgress={driveProgress}
            classroomKey={state.classroomId || state.section?.id || 'class_3_A'}
            isTravelling={isTravelling}
            travelProgress={travelProgress}
            hideCityMarkers={true}
          />

          {/* ── Quest Mode State Selection Overlay ─────────────────────────── */}
          {(() => {
            const unlockedStates = state.questProgress?.unlocked_states ?? ['Ladakh'];
            const completedStates = state.questProgress?.completed_states ?? [];
            const classroomKey = state.classroomId || state.section?.id || 'class_3_A';

            return (
              <>
                {/* Instruction banner */}
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid var(--color-saffron)',
                    borderRadius: '12px',
                    padding: '6px 18px',
                    fontSize: '13px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-saffron)',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    zIndex: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  🗺️ Select an unlocked state to start its Quest
                </div>

                {/* SVG Layer for Fluorescent Orange Dotted Glowing Bezier Paths */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 150,
                  }}
                >
                  {/* Define SVG Glow Filter */}
                  <defs>
                    <filter id="orangeGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff9933" floodOpacity="0.9" />
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ff7700" floodOpacity="0.7" />
                    </filter>
                  </defs>

                  {/* Connect consecutive unlocked/completed state pairs */}
                  {QUEST_STATES.map((stateA, idx) => {
                    if (idx >= QUEST_STATES.length - 1) return null;
                    const stateB = QUEST_STATES[idx + 1];

                    // Render path ONLY if stateA is unlocked or completed (Correction 12)
                    const isStateAUnlocked = unlockedStates.includes(stateA) || completedStates.includes(stateA);
                    if (!isStateAUnlocked) return null;

                    const coordA = STATE_COORDINATES[stateA];
                    const coordB = STATE_COORDINATES[stateB];
                    if (!coordA || !coordB) return null;

                    const p1 = { x: coordA.xRatio * containerSize.width, y: coordA.yRatio * containerSize.height };
                    const p2 = { x: coordB.xRatio * containerSize.width, y: coordB.yRatio * containerSize.height };

                    const seedStr = `${classroomKey}_${stateA}_${stateB}`;
                    const pathD = generateSeededRoutePath(p1, p2, seedStr);

                    return (
                      <path
                        key={`path_${stateA}_${stateB}`}
                        d={pathD}
                        fill="none"
                        stroke="#ff9933"
                        strokeWidth="3.2"
                        strokeDasharray="6 8"
                        strokeLinecap="round"
                        filter="url(#orangeGlow)"
                      />
                    );
                  })}
                </svg>

                {/* State markers — Status-based dots & state labels */}
                {QUEST_STATES.map((stateName) => {
                  const coord = STATE_COORDINATES[stateName];
                  if (!coord) return null;
                  const x = coord.xRatio * containerSize.width;
                  const y = coord.yRatio * containerSize.height;
                  const isHovered = hoveredState === stateName;
                  const isSelected = state.selectedState === stateName;

                  const isCompleted = completedStates.includes(stateName);
                  const isUnlocked = unlockedStates.includes(stateName) || isCompleted;

                  // Marker styles based on progress & selection status
                  const dotColor = isCompleted ? '#10b981' : isSelected ? '#ffea79' : '#ffffff';
                  const dotBorder = isCompleted
                    ? '2px solid #059669'
                    : isSelected
                    ? '2px solid #ff9933'
                    : '1.5px solid rgba(0, 0, 0, 0.6)';
                  const dotGlow = isCompleted
                    ? '0 0 12px #10b981'
                    : isSelected || isHovered
                    ? '0 0 16px #ff9933, 0 0 6px #ffffff'
                    : '0 0 8px rgba(255, 255, 255, 0.8)';

                  const badgeBg = isCompleted
                    ? 'rgba(6, 78, 59, 0.92)'
                    : isSelected || isHovered
                    ? 'rgba(15, 23, 42, 0.95)'
                    : 'rgba(8, 12, 22, 0.82)';

                  const badgeColor = isCompleted
                    ? '#34d399'
                    : isSelected
                    ? '#ffea79'
                    : isHovered
                    ? '#ff9933'
                    : '#ffffff';

                  const iconPrefix = isCompleted ? '🟢 ' : !isUnlocked ? '🔒 ' : isSelected ? '📍 ' : '';

                  return (
                    <div
                      key={stateName}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isHovered || isSelected ? 500 : 200,
                        cursor: isUnlocked ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        pointerEvents: 'auto',
                        opacity: isUnlocked ? 1 : 0.45,
                      }}
                      onMouseEnter={() => setHoveredState(stateName)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateSelect(stateName)}
                    >
                      {/* State Dot Marker */}
                      <div
                        style={{
                          width: isHovered || isSelected ? 14 : 10,
                          height: isHovered || isSelected ? 14 : 10,
                          borderRadius: '50%',
                          background: dotColor,
                          border: dotBorder,
                          boxShadow: dotGlow,
                          transition: 'all 0.18s ease',
                          flexShrink: 0,
                        }}
                      />

                      {/* State Label */}
                      <span
                        style={{
                          fontSize: isHovered || isSelected ? '11px' : '9.5px',
                          fontWeight: 900,
                          fontFamily: 'var(--font-display)',
                          color: badgeColor,
                          background: badgeBg,
                          backdropFilter: 'blur(4px)',
                          border: isCompleted
                            ? '1px solid #059669'
                            : isSelected || isHovered
                            ? '1px solid #ff9933'
                            : '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          padding: '1px 6px',
                          whiteSpace: 'nowrap',
                          boxShadow: isHovered || isSelected
                            ? '0 0 12px rgba(255, 153, 51, 0.5), 0 2px 6px rgba(0,0,0,0.5)'
                            : '0 2px 4px rgba(0,0,0,0.4)',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {iconPrefix}{stateName}
                      </span>
                    </div>
                  );
                })}

                {/* Hovering state info panel (bottom right) */}
                {hoveredState && (() => {
                    const hProg = state.questProgress.state_quiz_progress?.[hoveredState];
                    const isDone = completedStates.includes(hoveredState);
                    const isOpen = unlockedStates.includes(hoveredState) || isDone;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          right: 16,
                          background: 'rgba(15, 23, 42, 0.95)',
                          backdropFilter: 'blur(12px)',
                          border: `2px solid ${isDone ? '#10b981' : 'var(--color-saffron)'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem 1.25rem',
                          zIndex: 600,
                          minWidth: 200,
                          boxShadow: `0 0 24px ${isDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,153,51,0.3)'}`,
                          animation: 'popupBounceIn 0.2s ease forwards',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: isDone ? '#34d399' : 'var(--color-saffron)', marginBottom: '0.2rem' }}>
                          {isDone ? '🟢 ' : '🗺️ '}{hoveredState}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: '0.5rem' }}>
                          {isDone ? 'Status: COMPLETED' : isOpen ? 'Status: NOT COMPLETED' : 'Status: LOCKED'}
                        </div>
                        {hProg && (
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                            <span>Best: <strong style={{ color: '#ffea79' }}>{hProg.bestScore}/10</strong></span>
                            <span>·</span>
                            <span>Attempts: <strong style={{ color: '#60a5fa' }}>{hProg.attempts}</strong></span>
                          </div>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.85rem',
                            borderRadius: '10px',
                            opacity: isOpen ? 1 : 0.5,
                            cursor: isOpen ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!isOpen}
                          onClick={() => handleStateSelect(hoveredState)}
                        >
                          {isDone ? 'Replay Quest →' : isOpen ? 'Start Quest →' : '🔒 Locked'}
                        </button>
                      </div>
                    );
                  })()}

                {/* Keyframe for state marker animation */}
                <style>{`
                  @keyframes markerBreathing {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.2); }
                  }
                  @keyframes popupBounceIn {
                    0% { transform: translateX(-50%) scale(0.85); opacity: 0; }
                    100% { transform: translateX(-50%) scale(1); opacity: 1; }
                  }
                `}</style>
              </>
            );
          })()}
        </div>
      </div>

      {/* Facts — served from Postgres for the active state */}
      {activeModal === 'facts' && (
        <FactsPanel
          stateName={state.questProgress?.current_state || 'Ladakh'}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Talk — chat with the mascot guide, transcript persisted server-side */}
      {activeModal === 'talk' && (
        <TalkPanel
          sectionId={state.classroomId || sectionId || 'unknown'}
          stateName={state.questProgress?.current_state || 'Ladakh'}
          onClose={() => setActiveModal(null)}
        />
      )}

      {arrivalStateName && (
        <StateArrivalModal
          stateName={arrivalStateName}
          onClose={() => setArrivalStateName(null)}
          onStartQuest={() => {
            const target = arrivalStateName;
            setArrivalStateName(null);
            setSelectedState(target);
            navigate(`/session/${sectionId}/quest/${encodeURIComponent(target)}`);
          }}
        />
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
