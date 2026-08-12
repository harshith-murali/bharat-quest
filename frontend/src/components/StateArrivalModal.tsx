import { useEffect } from 'react';
import { getStateLandmark } from '../content/state_landmarks';

interface Props {
  stateName: string;
  onClose: () => void;
  /** Starts the newly-reached state's quest. Falls back to onClose if absent. */
  onStartQuest?: () => void;
}

export default function StateArrivalModal({ stateName, onClose, onStartQuest }: Props) {
  const confirm = onStartQuest ?? onClose;
  const landmark = getStateLandmark(stateName);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirm, onClose]);

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
          padding: '2rem 2rem 1.75rem',
          maxWidth: 480,
          width: '100%',
          // The monument block makes this card taller, so cap it to the
          // viewport and scroll internally on short screens.
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          boxShadow: '0 0 50px rgba(255, 153, 51, 0.4)',
          position: 'relative',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Top tricolor accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            background: 'linear-gradient(90deg, #ff9933, #ffffff, #10b981)',
          }}
        />

        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,153,51,0.18)',
            color: 'var(--color-saffron)',
            border: '1px solid rgba(255,153,51,0.4)',
            borderRadius: 99,
            padding: '0.25rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            marginBottom: '0.6rem',
            letterSpacing: '0.5px',
          }}
        >
          🚗 DESTINATION REACHED
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 900,
            color: 'var(--color-text-primary)',
            margin: '0.2rem 0 1rem 0',
            lineHeight: 1.2,
          }}
        >
          You have reached {stateName}!
        </h2>

        {/* Signature monument of the state */}
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(255,153,51,0.14), rgba(79,91,213,0.10))',
            border: '1.5px solid rgba(255,153,51,0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.1rem 1.25rem 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            className="anim-pulse"
            style={{
              fontSize: '3.6rem',
              lineHeight: 1,
              filter: 'drop-shadow(0 0 18px rgba(255,153,51,0.55))',
            }}
          >
            {landmark.icon}
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.15rem',
              color: 'var(--color-gold)',
              marginTop: '0.5rem',
            }}
          >
            {landmark.monument}
          </div>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.92rem',
              lineHeight: 1.55,
              margin: '0.45rem auto 0',
              maxWidth: 380,
            }}
          >
            {landmark.description}
          </p>

          {/* "Famous for" chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              justifyContent: 'center',
              marginTop: '0.9rem',
            }}
          >
            {landmark.knownFor.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-cyan)',
                  background: 'rgba(6,182,212,0.12)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  borderRadius: 99,
                  padding: '3px 10px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg w-full"
          style={{
            fontSize: '1.1rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 0 25px rgba(255,153,51,0.4)',
          }}
          onClick={confirm}
          autoFocus
        >
          🚀 Start {stateName} Quest
        </button>
      </div>
    </div>
  );
}
