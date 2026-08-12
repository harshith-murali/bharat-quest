import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLeaderboard, LeaderboardResponse } from '../api/client';
import { useSession } from '../store/sessionStore';

export default function LeaderboardPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state } = useSession();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (!navigator.onLine) {
        setOffline(true);
        setLoading(false);
        return;
      }
      const result = await fetchLeaderboard(sectionId!);
      if (!result) {
        setOffline(true);
      } else {
        setData(result);
      }
      setLoading(false);
    }
    load();
  }, [sectionId]);

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const weekStart = data?.week_start
    ? new Date(data.week_start).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="page">
      {/* Header Bar with Tricolor Branding & Game HUD Status Bar */}
      <header className="app-header">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/session/${sectionId}/home`)}
            style={{ padding: '0.4rem 0.85rem' }}
          >
            ← Back to Game
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
          <span className={`badge ${state.isOnline ? 'badge-online' : 'badge-offline'}`}>
            {state.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 680 }}>
          {/* Title */}
          <div className="text-center mb-2 anim-fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--color-text-primary)' }}>
              Weekly Section Leaderboard
            </h1>
            {weekStart && (
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '1rem', fontWeight: 700 }}>
                Week starting {weekStart}
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner-ring" />
            </div>
          )}

          {/* Offline Fallback */}
          {!loading && offline && (
            <div
              className="panel-glass-neon anim-pop-in"
              style={{ textAlign: 'center', padding: '2.5rem' }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📵</div>
              <h3 style={{ color: 'var(--color-saffron)', fontFamily: 'var(--font-display)' }}>
                Leaderboard Requires Connection
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                The leaderboard is computed live from the server. Connect to the internet to view this week's rankings.
              </p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => navigate(`/game/${sectionId}`)}
              >
                ← Return to Quiz
              </button>
            </div>
          )}

          {/* Leaderboard Entries */}
          {!loading && !offline && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.leaderboard.length === 0 ? (
                <div className="panel-glass text-center" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌱</div>
                  <h3>No scores yet this week</h3>
                </div>
              ) : (
                data.leaderboard.map((entry, i) => (
                  <div
                    key={entry.student_id}
                    className="anim-fade-in"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      background:
                        entry.rank === 1
                          ? 'linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,153,51,0.12))'
                          : entry.rank === 2
                          ? 'linear-gradient(135deg, rgba(192,192,192,0.12), rgba(150,150,150,0.06))'
                          : entry.rank === 3
                          ? 'linear-gradient(135deg, rgba(205,127,50,0.12), rgba(150,100,0,0.06))'
                          : 'var(--color-surface)',
                      border:
                        entry.rank === 1
                          ? '2px solid #ffc107'
                          : entry.rank === 2
                          ? '1.5px solid #c0c0c0'
                          : entry.rank === 3
                          ? '1.5px solid #cd7f32'
                          : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.2rem',
                      boxShadow: entry.rank === 1 ? '0 0 24px rgba(255,193,7,0.3)' : '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Rank */}
                    <div
                      style={{
                        minWidth: 52,
                        textAlign: 'center',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900,
                        fontSize: entry.rank <= 3 ? '2rem' : '1.2rem',
                        color:
                          entry.rank === 1
                            ? 'var(--color-gold)'
                            : entry.rank === 2
                            ? '#c0c0c0'
                            : entry.rank === 3
                            ? '#cd7f32'
                            : 'var(--color-text-secondary)',
                      }}
                    >
                      {rankEmoji(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '14px',
                        background: entry.rank === 1
                          ? 'linear-gradient(135deg, #ffc107, #ff9933)'
                          : 'var(--color-surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        flexShrink: 0,
                        boxShadow: entry.rank === 1 ? '0 0 16px rgba(255,193,7,0.5)' : 'none',
                      }}
                    >
                      {entry.avatar || '🧑'}
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: '1.15rem',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {entry.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Weekly Leaderboard Rank #{entry.rank}
                      </div>
                    </div>

                    {/* XP */}
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 900,
                          fontSize: '1.4rem',
                          color: entry.rank === 1 ? 'var(--color-gold)' : 'var(--color-saffron)',
                        }}
                      >
                        {entry.weekly_xp} ⭐
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>XP</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
