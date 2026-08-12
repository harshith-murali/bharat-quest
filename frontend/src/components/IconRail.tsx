import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../store/sessionStore';

// Emoji-safe font stack — always use this for emoji spans
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

export type ActiveTab = 'talk' | 'facts' | 'quiz' | 'map' | 'roster' | 'admin';

interface Props {
  activeTab: ActiveTab;
  onOpenRoster?: () => void;
  onOpenTalk?: () => void;
  onOpenFacts?: () => void;
}

// ─── Progress Panel ───────────────────────────────────────────────────────────

function ProgressPanel({ onClose }: { onClose: () => void }) {
  const { state, studentsWithSession } = useSession();

  const totalStudents = studentsWithSession.length;
  const present = studentsWithSession.filter((s) => !s.is_absent).length;

  // Rank by turns taken this session (most active first)
  const topStudents = [...studentsWithSession]
    .filter((s) => s.turns_this_session > 0)
    .sort((a, b) => b.turns_this_session - a.turns_this_session)
    .slice(0, 5);

  const totalTurns = studentsWithSession.reduce((sum, s) => sum + s.turns_this_session, 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(7, 10, 18, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #141826 0%, #0d1120 100%)',
          border: '2px solid rgba(79,91,213,0.5)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 0 40px rgba(79,91,213,0.25), 0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.5rem', margin: 0 }}>
              📊 Session Progress
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>
              {state.section?.name ?? 'Current session'} · Live stats
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '1.3rem', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Summary stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Present', value: `${present}/${totalStudents}`, icon: '👥', color: '#10b981' },
            { label: 'Session XP', value: state.totalSessionXp, icon: '⭐', color: '#ffc107' },
            { label: 'Turns Today', value: totalTurns, icon: '🎯', color: '#4f5bd5' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontFamily: EMOJI_FONT }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: stat.color, margin: '4px 0 2px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top 5 students */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.5px' }}>
            TOP STUDENTS THIS SESSION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topStudents.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No quiz answers yet — spin a student to begin!
              </p>
            ) : (
              topStudents.map((student, idx) => {
                const medalColors = ['#ffc107', '#94a3b8', '#cd7f32'];
                const medal = idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `${idx + 1}.`;
                const maxTurns = topStudents[0].turns_this_session;
                const barWidth = maxTurns > 0 ? (student.turns_this_session / maxTurns) * 100 : 0;
                return (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      background: idx === 0 ? 'rgba(255,193,7,0.07)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${idx === 0 ? 'rgba(255,193,7,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '10px',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', fontFamily: EMOJI_FONT, flexShrink: 0 }}>
                      {medal}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontFamily: EMOJI_FONT, flexShrink: 0 }}>
                      {student.avatar || '🧑'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginTop: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${barWidth}%`,
                            background: idx === 0 ? '#ffc107' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#4f5bd5',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.85rem', color: medalColors[idx] ?? 'var(--color-indigo-light)', flexShrink: 0 }}>
                      {student.turns_this_session} turns
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          className="btn btn-indigo w-full"
          style={{ marginTop: '1.5rem' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── IconRail ─────────────────────────────────────────────────────────────────

export default function IconRail({
  activeTab,
  onOpenRoster,
  onOpenTalk,
  onOpenFacts,
}: Props) {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { state } = useSession();
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Quest sidebar items
  const items = [
    { id: 'talk' as ActiveTab, label: 'Talk', icon: '💬', onClick: onOpenTalk },
    { id: 'facts' as ActiveTab, label: 'Facts', icon: '💡', onClick: onOpenFacts },
    {
      id: 'quiz' as ActiveTab,
      label: 'Quiz',
      icon: '🎯',
      onClick: () => navigate(`/session/${sectionId}/quest/${encodeURIComponent(state.selectedState || 'Karnataka')}`),
    },
    {
      id: 'map' as ActiveTab,
      label: 'Map',
      icon: '🗺️',
      onClick: () => navigate(`/session/${sectionId}/map`),
    },
    { id: 'roster' as ActiveTab, label: 'Roster', icon: '👥', onClick: onOpenRoster },
    {
      id: 'admin' as ActiveTab,
      label: 'Admin',
      icon: '⚙️',
      onClick: () => navigate(`/session/${sectionId}/admin`),
    },
  ];

  return (
    <>
      {isProgressOpen && <ProgressPanel onClose={() => setIsProgressOpen(false)} />}

      <aside
        style={{
          width: 80,
          background: 'linear-gradient(180deg, #0e1322 0%, #080c17 100%)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.25rem 0',
          gap: '0.7rem',
          zIndex: 40,
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Mode badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: '10px',
            background: 'rgba(255, 153, 51, 0.18)',
            border: '1px solid rgba(255, 153, 51, 0.45)',
            color: '#ff9933',
            fontSize: '0.55rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.3rem',
            flexShrink: 0,
            boxShadow: '0 0 10px rgba(255,153,51,0.25)',
          }}
        >
          <span style={{ fontSize: '0.65rem', fontFamily: EMOJI_FONT }}>🗺️</span>
          <span>Quest</span>
        </div>

        {items.map((item) => {
          const active = activeTab === item.id;

          // Active background & borders (Quest styling)
          const activeBg = 'linear-gradient(135deg, #ff9933 0%, #d96800 100%)';
          const activeBorder = '2px solid #ffea79';
          const activeShadow = '0 0 20px rgba(255, 153, 51, 0.6), 0 4px 12px rgba(0,0,0,0.5)';
          const activeTextColor = '#0f172a';

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              title={item.label}
              style={{
                width: 60,
                height: 60,
                borderRadius: '16px',
                background: active ? activeBg : 'rgba(20, 27, 44, 0.75)',
                color: active ? activeTextColor : '#cbd5e1',
                border: active ? activeBorder : '1px solid rgba(255, 255, 255, 0.09)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: active ? activeShadow : '0 4px 12px rgba(0, 0, 0, 0.25)',
                transform: active ? 'scale(1.05)' : 'scale(1)',
                flexShrink: 0,
                padding: 0,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = 'rgba(255, 153, 51, 0.55)';
                  el.style.color = '#ff9933';
                  el.style.background = 'rgba(255, 153, 51, 0.12)';
                  el.style.transform = 'translateY(-2px) scale(1.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                  el.style.color = '#cbd5e1';
                  el.style.background = 'rgba(20, 27, 44, 0.75)';
                  el.style.transform = 'scale(1)';
                }
              }}
            >
              {/* Active side indicator indicator */}
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    left: -2,
                    top: '25%',
                    bottom: '25%',
                    width: 4,
                    borderRadius: '0 4px 4px 0',
                    background: '#ffea79',
                    boxShadow: '0 0 8px #ffffff',
                  }}
                />
              )}

              {/* Icon */}
              <span
                style={{
                  fontSize: '1.35rem',
                  lineHeight: 1,
                  display: 'block',
                  fontFamily: EMOJI_FONT,
                  fontStyle: 'normal',
                  filter: active ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none',
                }}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: active ? 900 : 800,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.2px',
                  lineHeight: 1,
                  color: 'inherit',
                  marginTop: '1px',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </aside>
    </>
  );
}
