import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../store/sessionStore';
import RosterDrawer from '../components/RosterDrawer';
import IndiaMapScene from '../components/3d/IndiaMapScene';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state } = useSession();
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden', background: '#070a12', position: 'relative' }}>
      <RosterDrawer isOpen={isRosterOpen} onClose={() => setIsRosterOpen(false)} />

      {/* Screen 1 Top Header */}
      <header className="app-header" style={{ height: 60, position: 'relative' }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ padding: '0.35rem 0.75rem' }}>
            ← Sections
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <div className="tricolor-ribbon">
            <span className="orange"></span>
            <span className="white"></span>
            <span className="green"></span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-tricolor-gradient" style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              1. HOME SCREEN · Classroom Dashboard
            </p>
          </div>
        </div>

        {/* Right Action Badges */}
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          <button className="btn btn-indigo btn-sm" onClick={() => navigate(`/leaderboard/${sectionId}`)}>
            🏆 Leaderboard
          </button>
        </div>
      </header>

      {/* Main Screen 1 Content with Left Sidebar */}
      <main style={{ flex: 1, height: 'calc(100vh - 60px)', position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* Left Navigation Sidebar */}
        <aside
          style={{
            width: 78,
            background: 'rgba(15, 20, 34, 0.94)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.25rem 0',
            gap: '1rem',
            zIndex: 40,
            flexShrink: 0,
            height: '100%',
          }}
        >
          {[
            { id: 'journey', label: 'Journey', icon: '📍', active: true, onClick: () => navigate(`/session/${sectionId}/map`) },
            { id: 'quiz', label: 'Quiz', icon: '🎯', active: false, onClick: () => navigate(`/session/${sectionId}/quiz`) },
            { id: 'roster', label: 'Roster', icon: '👥', active: false, onClick: () => setIsRosterOpen(true) },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', active: false, onClick: () => navigate(`/leaderboard/${sectionId}`) },
            { id: 'settings', label: 'Settings', icon: '⚙️', active: false, onClick: () => navigate('/') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              title={item.label}
              style={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: item.active
                  ? 'linear-gradient(135deg, #ff9933 0%, #e07000 100%)'
                  : 'rgba(30, 36, 54, 0.7)',
                color: item.active ? '#1a0a00' : 'var(--color-text-secondary)',
                border: item.active ? '2px solid #ffc107' : '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: item.active ? '0 0 20px rgba(255, 153, 51, 0.6), 0 4px 12px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.3px',
                }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </aside>

        {/* Full-Screen Background 3D Map */}
        <div style={{ position: 'relative', flex: 1, height: '100%' }}>
          <IndiaMapScene
            currentMissionId={state.currentMissionId ?? 'mission_1'}
            mapPosition={state.section?.map_position ?? 0}
            isTravelling={false}
            travelProgress={0}
          />
        </div>
      </main>
    </div>
  );
}
