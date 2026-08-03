import { useEffect } from 'react';

export interface MonumentInfo {
  title: string;
  location: string;
  description: string;
  badge: string;
  xp_bonus: number;
  image?: string;
}

const CITY_IMAGE_MAP: Record<string, string> = {
  Delhi: '/assets/monuments/india-gate.svg',
  Agra: '/assets/monuments/taj-mahal.svg',
  Varanasi: '/assets/monuments/ganga-ghats.svg',
  Kerala: '/assets/monuments/kerala-backwaters.svg',
};

interface Props {
  monument: MonumentInfo;
  cityName: string;
  onClose: () => void;
  onStartQuiz?: () => void;
}

export default function MonumentRevealModal({ monument, cityName, onClose, onStartQuiz }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (onStartQuiz) onStartQuiz();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onStartQuiz]);

  const activeImage = monument.image || CITY_IMAGE_MAP[cityName] || CITY_IMAGE_MAP['Agra'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 17, 23, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      className="anim-fade-in"
    >
      <div
        className="anim-pop-in"
        style={{
          background: 'linear-gradient(145deg, #1d2136 0%, #151828 100%)',
          border: '2px solid var(--color-saffron)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.4rem 1.8rem',
          maxWidth: 500,
          maxHeight: '92vh',
          overflowY: 'auto',
          width: '100%',
          boxShadow: '0 0 50px rgba(255, 153, 51, 0.4)',
          position: 'relative',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Top decorative banner */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: 'linear-gradient(90deg, var(--color-saffron), var(--color-gold), var(--color-indigo-light))',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,153,51,0.18)',
            color: 'var(--color-saffron)',
            border: '1px solid rgba(255,153,51,0.4)',
            borderRadius: 99,
            padding: '0.25rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            marginBottom: '0.5rem',
            letterSpacing: '0.5px',
          }}
        >
          {monument.badge}
        </div>

        {/* City & Monument title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.7rem',
            color: 'var(--color-text-primary)',
            margin: '0.1rem 0',
            lineHeight: 1.15,
          }}
        >
          {monument.title}
        </h2>

        <p
          style={{
            color: 'var(--color-saffron-light)',
            fontWeight: 700,
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
          }}
        >
          📍 {monument.location}
        </p>

        {/* Landmark graphic illustration card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(79,91,213,0.2), rgba(255,153,51,0.1))',
            border: '1.5px solid var(--color-saffron)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.2rem',
            margin: '0.6rem 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 0 20px rgba(255, 153, 51, 0.2)',
          }}
        >
          {activeImage ? (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--color-gold)',
                boxShadow: '0 0 20px rgba(255, 193, 7, 0.5), 0 6px 18px rgba(0,0,0,0.5)',
                background: '#0f172a',
              }}
              className="anim-pulse"
            >
              <img
                src={activeImage}
                alt={monument.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div style={{ fontSize: '3.5rem', lineHeight: 1 }} className="anim-pulse">
              {cityName === 'Agra' ? '🕌' : cityName === 'Varanasi' ? '🛕' : '🌴'}
            </div>
          )}
          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.92rem',
              lineHeight: 1.45,
              margin: 0,
              maxWidth: 440,
            }}
          >
            {monument.description}
          </p>
        </div>

        {/* XP Bonus award */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '0.75rem 0',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>⭐</span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 900,
              color: 'var(--color-gold)',
            }}
          >
            Mission Complete Bonus: +{monument.xp_bonus} XP!
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
          <button
            className="btn btn-success btn-lg w-full"
            style={{ fontSize: '1.1rem', padding: '0.7rem', borderRadius: '12px', boxShadow: '0 0 20px rgba(16,185,129,0.5)' }}
            onClick={onStartQuiz ? onStartQuiz : onClose}
            autoFocus
          >
            🎯 Start Quiz
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ opacity: 0.8, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            onClick={onClose}
          >
            Close & Stay on Map
          </button>
        </div>
      </div>
    </div>
  );
}
