import { useEffect } from 'react';
import ConfettiCanvas from './ConfettiCanvas';
import { CANONICAL_QUEST_STATES } from '../loaders/questLoader';

const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

interface Props {
  /** Total states completed — normally all 30. */
  completedCount: number;
  /** Best scores per state, used for the summary line. */
  totalCorrect?: number;
  onReplay: () => void;
  onClose: () => void;
}

/**
 * Shown once the class finishes the final state (Kerala) — the end of the
 * 30-state journey from Ladakh.
 */
export default function QuestCompleteModal({
  completedCount,
  totalCorrect,
  onReplay,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const total = CANONICAL_QUEST_STATES.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100001,
        background: 'rgba(9, 13, 22, 0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      className="anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Bharat Quest complete"
    >
      <ConfettiCanvas />

      <div
        className="anim-pop-in"
        style={{
          position: 'relative',
          background: 'linear-gradient(155deg, #1d2136 0%, #12162a 100%)',
          border: '2px solid var(--color-gold)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem 2rem',
          maxWidth: 520,
          width: '100%',
          maxHeight: 'calc(100vh - 3rem)',
          overflowY: 'auto',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(255,193,7,0.35)',
          boxSizing: 'border-box',
        }}
      >
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
          className="anim-pulse"
          style={{
            fontSize: '4rem',
            lineHeight: 1,
            fontFamily: EMOJI_FONT,
            filter: 'drop-shadow(0 0 24px rgba(255,193,7,0.6))',
          }}
        >
          🏆
        </div>

        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,193,7,0.16)',
            color: 'var(--color-gold)',
            border: '1px solid rgba(255,193,7,0.4)',
            borderRadius: 99,
            padding: '0.25rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.5px',
            margin: '0.85rem 0 0.6rem',
          }}
        >
          JOURNEY COMPLETE
        </div>

        <h2
          className="text-tricolor-gradient"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 900,
            margin: '0 0 0.6rem',
            lineHeight: 1.15,
          }}
        >
          Bharat Quest Complete!
        </h2>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.98rem',
            lineHeight: 1.55,
            margin: '0 auto 1.5rem',
            maxWidth: 420,
          }}
        >
          Your class has journeyed all the way from{' '}
          <strong style={{ color: 'var(--color-saffron)' }}>{CANONICAL_QUEST_STATES[0]}</strong> to{' '}
          <strong style={{ color: 'var(--color-green-light)' }}>
            {CANONICAL_QUEST_STATES[total - 1]}
          </strong>{' '}
          — exploring every corner of India. Shabash!
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: totalCorrect === undefined ? '1fr' : '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '14px',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontFamily: EMOJI_FONT }}>🗺️</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.4rem',
                color: 'var(--color-green-light)',
              }}
            >
              {completedCount} / {total}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
              STATES COMPLETED
            </div>
          </div>

          {totalCorrect !== undefined && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '14px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontFamily: EMOJI_FONT }}>⭐</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  color: 'var(--color-gold)',
                }}
              >
                {totalCorrect}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                BEST ANSWERS
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ boxShadow: '0 0 25px rgba(255,153,51,0.4)' }}
            onClick={onClose}
            autoFocus
          >
            🗺️ Back to Map
          </button>
          <button className="btn btn-outline btn-lg" onClick={onReplay}>
            🔄 Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
