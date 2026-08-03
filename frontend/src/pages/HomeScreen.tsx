import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../store/sessionStore';
import RosterDrawer from '../components/RosterDrawer';
import IndiaMapScene from '../components/3d/IndiaMapScene';
import mascotData from '../content/mascot_dialogue.json';

interface MissionDialogueData {
  city: string;
  welcome: string;
  facts: string[];
}
const DIALOGUE_BANK = mascotData.missions as Record<string, MissionDialogueData>;

export default function HomeScreen() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state, currentMission, studentsWithSession } = useSession();
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const sectionName = state.section ? `Grade ${state.section.name}` : 'Grade 6 - A';
  const totalXP = studentsWithSession.reduce((sum, s) => sum + s.total_xp, 0);
  const displayXP = totalXP > 0 ? totalXP : 12350;

  const currentMissionKey = state.currentMissionId ?? 'mission_1';
  const currentDialogue = DIALOGUE_BANK[currentMissionKey];

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#070a12', position: 'relative' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Screen 1 Top Header */}
      <header className="app-header" style={{ height: 60 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ padding: '0.35rem 0.75rem' }}>
            ← Sections
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
              1. HOME SCREEN · Classroom Dashboard
            </p>
          </div>
        </div>

        {/* Right Action Badges */}
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

      {/* Main Screen 1 Split Content */}
      <main style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* Full-Screen Background 3D Mini Map Preview */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <IndiaMapScene
            currentMissionId={state.currentMissionId ?? 'mission_1'}
            mapPosition={state.section?.map_position ?? 0}
            isTravelling={false}
            travelProgress={0}
          />
          {/* Soft Dark Vignette Overlay for Readability */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(7, 10, 18, 0.92) 0%, rgba(7, 10, 18, 0.4) 50%, rgba(7, 10, 18, 0.85) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Left Dashboard Panel (Adapted from Mockup Screen 1) */}
        <div
          style={{
            width: 440,
            maxWidth: '100%',
            height: 'calc(100% - 70px)',
            zIndex: 10,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto',
          }}
          className="anim-fade-in"
        >
          {/* Profile-Style Classroom Card */}
          <div
            style={{
              background: 'rgba(20, 26, 42, 0.92)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid var(--color-saffron)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem',
              boxShadow: '0 0 30px rgba(255, 153, 51, 0.25), 0 8px 24px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ff9933, #e07000)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: '0 0 16px rgba(255,153,51,0.5)',
                }}
              >
                🏫
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: '#ffffff', margin: 0 }}>
                  {sectionName}
                </h3>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-saffron-light)',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                  }}
                >
                  Classroom Explorer Squad
                </span>
              </div>
            </div>

            {/* Level / XP Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>CLASS LEVEL PROGRESS</span>
                <span style={{ color: 'var(--color-gold)' }}>{displayXP.toLocaleString()} / 15,000 XP</span>
              </div>
              <div className="xp-bar-track">
                <div className="xp-bar-fill" style={{ width: `${Math.min((displayXP / 15000) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Currency Badges */}
            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
              <div className="hud-pill hud-pill-coin" style={{ flex: 1, justifyContent: 'center' }}>
                🪙 5,200 Coins
              </div>
              <div className="hud-pill hud-pill-gem" style={{ flex: 1, justifyContent: 'center' }}>
                💎 320 Gems
              </div>
            </div>
          </div>

          {/* "TODAY'S MISSION" Card (Matches Reference Screen 1) */}
          <div
            style={{
              background: 'linear-gradient(145deg, #1d2235 0%, #121624 100%)',
              border: '2px solid var(--color-gold)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.4rem',
              boxShadow: '0 0 25px rgba(255, 193, 7, 0.25), 0 8px 24px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
            }}
          >
            {/* Mission Badge Tag */}
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(90deg, #ff9933, #e07000)',
                color: '#1a0a00',
                padding: '4px 14px',
                borderRadius: 99,
                fontSize: '0.78rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.5px',
              }}
            >
              TODAY'S MISSION
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                Travel from
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#ffffff', margin: '2px 0' }}>
                {currentMission?.route_from ?? 'Delhi'}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>to</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--color-saffron)', margin: '2px 0' }}>
                {currentDialogue?.city ?? currentMission?.route_to ?? 'Agra'}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.88rem', color: 'var(--color-gold)', fontWeight: 800 }}>
              <span>Reward:</span>
              <span className="badge badge-xp">⭐ {currentMission?.xp_reward ?? 50} XP</span>
              <span className="badge badge-xp">🪙 {currentMission?.coin_reward ?? 20} Coins</span>
            </div>

            {/* Green "START JOURNEY" Button in Bottom Right */}
            <button
              className="btn btn-success"
              style={{
                alignSelf: 'flex-end',
                marginTop: '0.5rem',
                fontSize: '1.1rem',
                padding: '0.85rem 1.8rem',
                borderRadius: '14px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
              }}
              onClick={() => navigate(`/session/${sectionId}/map`)}
            >
              START JOURNEY 🚗💨
            </button>
          </div>
        </div>
      </main>

      {/* Screen 1 Bottom Navigation Bar (Matches Mockup Screen 1) */}
      <nav
        style={{
          height: 70,
          background: 'rgba(15, 20, 34, 0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5rem',
          zIndex: 50,
          position: 'relative',
        }}
      >
        {[
          { id: 'journey', label: 'Journey', icon: '📍', active: true, onClick: () => navigate(`/session/${sectionId}/map`) },
          { id: 'roster', label: 'Roster', icon: '👥', active: false, onClick: () => setIsRosterOpen(true) },
          { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', active: false, onClick: () => navigate(`/leaderboard/${sectionId}`) },
          { id: 'settings', label: 'Settings', icon: '⚙️', active: false, onClick: () => navigate('/') },
        ].map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: item.active ? 'var(--color-saffron)' : 'var(--color-text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              transition: 'color 0.2s ease',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
