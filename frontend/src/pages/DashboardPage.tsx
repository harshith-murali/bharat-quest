import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../store/sessionStore';
import { CANONICAL_QUEST_STATES } from '../loaders/questLoader';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state, setAppMode } = useSession();

  function handleSelectQuest() {
    setAppMode('quest');
    navigate(`/session/${sectionId}/map`);
  }

  const clsNum = state.selectedClass ?? 3;
  const secLetter = state.selectedSection ?? 'A';
  const displaySection = `Class ${clsNum} · Section ${secLetter}`;
  const totalStates = CANONICAL_QUEST_STATES.length;
  const currentQuestState = state.questProgress?.current_state ?? 'Ladakh';
  const completedQuestCount = state.questProgress?.completed_states?.length ?? 0;

  return (
    <div
      className="page"
      style={{
        minHeight: '100vh',
        background: '#070a12',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="tricolor-ribbon">
            <span className="orange"></span>
            <span className="white"></span>
            <span className="green"></span>
          </div>
          <div>
            <h1
              className="text-tricolor-gradient"
              style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}
            >
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              Teacher Dashboard — {displaySection}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-indigo">👥 {state.students.length > 0 ? `${state.students.length} Students` : '–'}</span>
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/')}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            ← Sections
          </button>
        </div>
      </header>

      {/* Main Dashboard */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          gap: '2.5rem',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif", lineHeight: 1 }}>🇮🇳</div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            What do you want to teach today?
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginTop: '0.6rem',
              fontSize: '1rem',
            }}
          >
            Choose a learning experience for your classroom
          </p>
        </div>

        {/* Quest Card */}
        <button
          id="dashboard-quest-btn"
          onClick={() => handleSelectQuest()}
          style={{
            background: 'linear-gradient(145deg, #14180f 0%, #0b0f07 100%)',
            border: '2px solid rgba(255,153,51,0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem 2rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
            maxWidth: 420,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.border = '2px solid rgba(255,153,51,0.8)';
            el.style.boxShadow = '0 12px 48px rgba(0,0,0,0.6), 0 0 40px rgba(255,153,51,0.2)';
            el.style.transform = 'translateY(-6px) scale(1.01)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.border = '2px solid rgba(255,153,51,0.4)';
            el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
            el.style.transform = 'translateY(0) scale(1)';
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,153,51,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ fontSize: '3.5rem', lineHeight: 1, fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>🗺️</div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.6rem',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
              }}
            >
              QUEST
            </div>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.95rem',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Explore India on the interactive map
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[`${totalStates} States`, 'Geography', 'Heritage', 'Culture'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255,153,51,0.12)',
                  color: 'var(--color-saffron)',
                  border: '1px solid rgba(255,153,51,0.28)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-saffron)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '0.9rem',
              marginTop: 'auto',
            }}
          >
            Start Quest →
          </div>
        </button>

        {/* Quick stats bar */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            padding: '1rem 2rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {[
            { label: 'Classroom', value: displaySection, icon: '🏫' },
            { label: 'Students', value: state.students.length > 0 ? `${state.students.length} Students` : 'Class Session', icon: '👥' },
            { label: 'Active Quest', value: currentQuestState, icon: '📍' },
            { label: 'Quest Journey', value: `${completedQuestCount} / ${totalStates} Done`, icon: '🗺️' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>{stat.icon}</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: 'var(--color-saffron)',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
