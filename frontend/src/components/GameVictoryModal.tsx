import { useEffect } from 'react';
import ConfettiCanvas from './ConfettiCanvas';

interface Props {
  totalXp: number;
  onRestart: () => void;
  onHome: () => void;
}

export default function GameVictoryModal({ totalXp, onRestart, onHome }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onHome]);

  return (
    <>
      {/* 1. Confetti Particle Rain */}
      <ConfettiCanvas />

      {/* 2. Victory Modal Card Container */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999998,
          background: 'rgba(15, 17, 23, 0.92)',
          backdropFilter: 'blur(10px)',
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
            background: 'linear-gradient(145deg, #1d2136 0%, #0f172a 100%)',
            border: '2.5px solid var(--color-gold)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.8rem 2.2rem',
            maxWidth: 540,
            maxHeight: '92vh',
            overflowY: 'auto',
            width: '100%',
            boxShadow: '0 0 60px rgba(255, 193, 7, 0.5), 0 10px 30px rgba(0,0,0,0.8)',
            position: 'relative',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Tricolor Decorative Banner */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: 'linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #10b981 100%)',
            }}
          />

          {/* Golden Trophy Icon */}
          <div
            style={{
              fontSize: '4.2rem',
              lineHeight: 1,
              margin: '0.4rem 0 0.2rem 0',
              filter: 'drop-shadow(0 0 20px rgba(255, 193, 7, 0.8))',
            }}
            className="anim-bounce"
          >
            🏆
          </div>

          {/* Celebratory Tricolor Badge */}
          <div
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, rgba(255,153,51,0.2), rgba(16,185,129,0.2))',
              color: '#ffea79',
              border: '1.5px solid var(--color-gold)',
              borderRadius: 99,
              padding: '0.3rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              marginBottom: '0.6rem',
              letterSpacing: '0.8px',
            }}
          >
            🇮🇳 BHARAT QUEST AI COMPLETED!
          </div>

          {/* Main Title */}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              color: '#ffffff',
              margin: '0.2rem 0',
              lineHeight: 1.15,
            }}
          >
            You Have Travelled Entire India!
          </h2>

          <p
            style={{
              color: 'var(--color-saffron-light)',
              fontWeight: 700,
              fontSize: '0.98rem',
              marginBottom: '1.2rem',
              lineHeight: 1.5,
            }}
          >
            Congratulations! You successfully explored Delhi's historic India Gate, Agra's Taj Mahal, Varanasi's sacred Ganga ghats, and Kerala's pristine backwaters!
          </p>

          {/* Stats Badge Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.6rem',
              margin: '1rem 0 1.4rem 0',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 153, 51, 0.12)',
                border: '1px solid rgba(255, 153, 51, 0.4)',
                borderRadius: '12px',
                padding: '0.75rem 0.5rem',
              }}
            >
              <div style={{ fontSize: '1.4rem' }}>⭐</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                +{totalXp || 180}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                Total XP
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                padding: '0.75rem 0.5rem',
              }}
            >
              <div style={{ fontSize: '1.4rem' }}>🗺️</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>
                4 / 4
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                Cities Discovered
              </div>
            </div>

            <div
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '12px',
                padding: '0.75rem 0.5rem',
              }}
            >
              <div style={{ fontSize: '1.4rem' }}>🇮🇳</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#60a5fa' }}>
                100%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                India Explored
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              className="btn btn-success btn-lg w-full"
              style={{
                fontSize: '1.15rem',
                padding: '0.8rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 0 25px rgba(16,185,129,0.6)',
              }}
              onClick={onRestart}
            >
              🔄 Play Quest Again
            </button>
            <button
              className="btn btn-outline btn-md w-full"
              style={{
                fontSize: '1rem',
                padding: '0.6rem',
                borderRadius: '12px',
                color: 'var(--color-text-secondary)',
              }}
              onClick={onHome}
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
