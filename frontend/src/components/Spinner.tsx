import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from '../store/sessionStore';

const SPIN_DURATION_MS = 750;
const HIGHLIGHT_INTERVAL_START = 40;
const HIGHLIGHT_INTERVAL_END = 160;

export default function Spinner() {
  const { state, studentsWithSession, spinNext, landOnStudent } = useSession();
  const { turnQueue, currentStudentIndex, isSpinning } = state;

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [landedId, setLandedId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Present students in queue order
  const presentQueue = turnQueue.filter((id) => {
    const s = studentsWithSession.find((st) => st.id === id);
    return s && !s.is_absent;
  });

  const studentMap = Object.fromEntries(studentsWithSession.map((s) => [s.id, s]));

  // The next student to land on
  const targetQueueIdx =
    currentStudentIndex + 1 < presentQueue.length ? currentStudentIndex + 1 : 0;
  const targetStudentId = presentQueue[targetQueueIdx] ?? null;

  // Animate whenever isSpinning flips true
  useEffect(() => {
    if (!isSpinning || presentQueue.length === 0 || !targetStudentId) return;

    setLandedId(null);
    const startTime = Date.now();
    let step = 0;

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);

      // Ease-out: interval grows as progress increases
      const interval =
        HIGHLIGHT_INTERVAL_START +
        (HIGHLIGHT_INTERVAL_END - HIGHLIGHT_INTERVAL_START) * (progress ** 2);

      const displayIdx = step % presentQueue.length;
      setHighlightedIndex(displayIdx);
      step++;

      if (progress < 1) {
        intervalRef.current = setTimeout(tick, interval);
      } else {
        // Land on target
        const finalIdx = presentQueue.indexOf(targetStudentId);
        setHighlightedIndex(finalIdx >= 0 ? finalIdx : targetQueueIdx);
        setLandedId(targetStudentId);
        landOnStudent(targetStudentId);
      }
    }

    intervalRef.current = setTimeout(tick, HIGHLIGHT_INTERVAL_START);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  const handleSpin = useCallback(() => {
    setLandedId(null);
    spinNext();
  }, [spinNext]);

  const landedStudent = landedId ? studentMap[landedId] : null;
  const activeStudentId = currentStudentIndex >= 0 ? presentQueue[currentStudentIndex] : null;
  const hasActiveStudent = currentStudentIndex >= 0 && activeStudentId != null;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: 'var(--color-text-primary)',
          }}
        >
          🎯 Turn Queue
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {presentQueue.length} present
        </span>
      </div>

      {/* Student list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          maxHeight: 230,
          overflowY: 'auto',
          paddingRight: 2,
        }}
      >
        {presentQueue.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              padding: '1rem',
              fontSize: '0.85rem',
            }}
          >
            All students marked absent. Tap ✓ to mark present.
          </p>
        ) : (
          presentQueue.map((id, idx) => {
            const s = studentMap[id];
            if (!s) return null;

            const isHighlighted = isSpinning && highlightedIndex === idx;
            const isCurrent = !isSpinning && idx === currentStudentIndex && currentStudentIndex >= 0;
            const isNext =
              !isSpinning &&
              !hasActiveStudent &&
              idx === targetQueueIdx;

            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isHighlighted
                    ? 'rgba(255,153,51,0.3)'
                    : isCurrent
                    ? 'rgba(255,153,51,0.18)'
                    : isNext
                    ? 'rgba(79,91,213,0.13)'
                    : 'transparent',
                  border: isHighlighted
                    ? '1px solid var(--color-saffron-light)'
                    : isCurrent
                    ? '1px solid var(--color-saffron)'
                    : isNext
                    ? '1px dashed var(--color-indigo-light)'
                    : '1px solid transparent',
                  transform: isHighlighted ? 'scale(1.04)' : 'scale(1)',
                  transition: isSpinning
                    ? 'transform 60ms ease, background 60ms ease'
                    : 'all var(--transition-med)',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{s.avatar || '🧑'}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: isCurrent || isHighlighted ? 800 : 600,
                    fontSize: '0.88rem',
                    color:
                      isCurrent || isHighlighted
                        ? 'var(--color-saffron)'
                        : isNext
                        ? 'var(--color-indigo-light)'
                        : 'var(--color-text-primary)',
                    flex: 1,
                  }}
                >
                  {s.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>
                  {s.turns_this_session > 0 ? `×${s.turns_this_session}` : '—'}
                </span>
                {isCurrent && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: 'var(--color-saffron)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    NOW
                  </span>
                )}
                {isNext && !isCurrent && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: 'var(--color-indigo-light)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    NEXT
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Landed announcement */}
      {landedStudent && !isSpinning && hasActiveStudent && (
        <div
          className="anim-pop-in"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,153,51,0.18), rgba(79,91,213,0.08))',
            border: '2px solid var(--color-saffron)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.8rem' }}>{landedStudent.avatar || '🧑'}</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--color-saffron)',
            }}
          >
            {landedStudent.name}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            Come to the board! 🎉
          </div>
        </div>
      )}

      {/* Spin button */}
      {isSpinning ? (
        <div
          className="anim-pulse"
          style={{
            padding: '0.85rem',
            textAlign: 'center',
            background: 'rgba(255,153,51,0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,153,51,0.25)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              color: 'var(--color-saffron)',
            }}
          >
            🌀 Spinning…
          </span>
        </div>
      ) : (
        <button
          id="spin-button"
          className="btn btn-primary w-full"
          style={{ fontSize: '1.05rem' }}
          disabled={presentQueue.length === 0 || hasActiveStudent}
          onClick={handleSpin}
        >
          {hasActiveStudent ? '🎮 Student answering…' : '🎰 Spin!'}
        </button>
      )}
    </div>
  );
}
