import { useEffect, useState } from 'react';
import { fetchStateFacts, StateFact } from '../api/client';

const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

const CATEGORY_ICONS: Record<string, string> = {
  Geography: '🏔️',
  History: '🏛️',
  Culture: '🎭',
  Wildlife: '🐅',
  Civics: '🏫',
  Agriculture: '🌾',
  Economy: '🏭',
  Heritage: '🕌',
  Science: '🚀',
  General: '💡',
};

interface Props {
  stateName: string;
  onClose: () => void;
}

/**
 * Facts for the state the class is currently exploring.
 * Content is served from Postgres (state_facts table).
 */
export default function FactsPanel({ stateName, onClose }: Props) {
  const [facts, setFacts] = useState<StateFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const rows = await fetchStateFacts(stateName);
      if (cancelled) return;

      if (rows === null) {
        setError('Could not load facts — check your connection and try again.');
      } else {
        setFacts(rows);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [stateName]);

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
      className="anim-fade-in"
    >
      <div
        className="anim-pop-in"
        style={{
          background: 'linear-gradient(145deg, #141826 0%, #0d1120 100%)',
          border: '2px solid var(--color-gold)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: 620,
          width: '100%',
          maxHeight: 'calc(100vh - 3rem)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(255,193,7,0.2), 0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-gold)',
                fontSize: '1.5rem',
                margin: 0,
              }}
            >
              <span style={{ fontFamily: EMOJI_FONT }}>💡</span> Facts about {stateName}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${facts.length} things to discover`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            aria-label="Close facts"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '3rem 0',
                color: 'var(--color-gold)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
              }}
            >
              <div className="spinner-ring" />
              Loading facts…
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: EMOJI_FONT }}>📡</div>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>{error}</p>
            </div>
          )}

          {!loading && !error && facts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: EMOJI_FONT }}>🔍</div>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                No facts recorded for {stateName} yet.
              </p>
            </div>
          )}

          {!loading && !error && facts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {facts.map((f, idx) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontFamily: EMOJI_FONT,
                      flexShrink: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {CATEGORY_ICONS[f.category] ?? '💡'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {f.fact}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '0.45rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display)',
                        color: 'var(--color-cyan)',
                        background: 'rgba(6,182,212,0.12)',
                        border: '1px solid rgba(6,182,212,0.28)',
                        borderRadius: 99,
                        padding: '2px 9px',
                      }}
                    >
                      {f.category}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary w-full" style={{ marginTop: '1.25rem', flexShrink: 0 }} onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
}
