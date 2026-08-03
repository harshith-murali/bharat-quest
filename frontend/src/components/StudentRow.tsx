import { StudentWithSession } from '../types';

interface Props {
  student: StudentWithSession;
  isCurrentTurn?: boolean;
  onSkip?: () => void;
  onMarkAbsent?: () => void;
  onMarkPresent?: () => void;
  compact?: boolean;
}

const XP_PER_LEVEL = 100;

function xpProgressInLevel(xp: number): number {
  return ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
}

// Student illustrated avatar badge mapping based on student index/name
const AVATAR_MAP: Record<string, string> = {
  'Aarav Sharma': '🦁',
  'Diya Patel': '🦚',
  'Rohan Mehta': '🐘',
  'Priya Nair': '🦊',
  'Karan Singh': '🐻',
  'Meera Rao': '🐯',
};

export default function StudentRow({
  student,
  isCurrentTurn = false,
  onSkip,
  onMarkAbsent,
  onMarkPresent,
  compact = false,
}: Props) {
  const xpProgress = xpProgressInLevel(student.total_xp);
  const avatarIcon = AVATAR_MAP[student.name] || student.avatar || '🧑';

  return (
    <div
      style={{
        background: isCurrentTurn
          ? 'linear-gradient(135deg, rgba(255,153,51,0.22) 0%, rgba(224,112,0,0.12) 100%)'
          : student.is_absent
          ? 'rgba(239,68,68,0.06)'
          : 'var(--color-surface-2)',
        border: isCurrentTurn
          ? '2px solid var(--color-saffron)'
          : student.is_absent
          ? '1px solid rgba(239,68,68,0.3)'
          : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: compact ? '0.65rem 0.85rem' : '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        boxShadow: isCurrentTurn
          ? '0 0 20px rgba(255, 153, 51, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all var(--transition-med)',
        opacity: student.is_absent ? 0.55 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Current turn highlight glow */}
      {isCurrentTurn && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 10% 50%, rgba(255,153,51,0.15), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Illustrated Avatar Badge */}
      <div
        style={{
          width: compact ? 40 : 48,
          height: compact ? 40 : 48,
          borderRadius: '12px',
          background: isCurrentTurn
            ? 'linear-gradient(135deg, #ff9933, #e07000)'
            : 'linear-gradient(135deg, #2e3650, #1e2436)',
          border: isCurrentTurn ? '2px solid #ffc107' : '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? '1.25rem' : '1.5rem',
          flexShrink: 0,
          boxShadow: isCurrentTurn ? '0 0 16px rgba(255,153,51,0.6)' : 'none',
        }}
      >
        {avatarIcon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: compact ? '0.95rem' : '1.05rem',
              color: isCurrentTurn ? 'var(--color-saffron)' : 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {student.name}
          </span>

          {isCurrentTurn && (
            <span
              style={{
                background: 'var(--color-saffron)',
                color: '#1a0a00',
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '2px 7px',
                borderRadius: 99,
                letterSpacing: '0.5px',
                fontFamily: 'var(--font-display)',
              }}
            >
              YOUR TURN
            </span>
          )}

          {student.is_absent && (
            <span
              style={{
                background: 'rgba(239,68,68,0.2)',
                color: 'var(--color-red-light)',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 99,
              }}
            >
              ABSENT
            </span>
          )}
        </div>

        {!compact ? (
          <div style={{ marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <div className="xp-bar-track" style={{ flex: 1 }}>
                <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 800 }}>
                Lv.{student.level}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 700 }}>
                ⭐ {student.total_xp} XP
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: Math.min(student.turns_this_session, 8) }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-saffron)',
                    }}
                  />
                ))}
                {student.turns_this_session === 0 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>
                    No turns taken
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 700 }}>
              ⭐ {student.total_xp} XP
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              Lv.{student.level}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
        {!student.is_absent && onSkip && (
          <button
            className="btn btn-outline btn-sm"
            onClick={onSkip}
            title="Skip to end of round"
            style={{ padding: '4px 8px', minHeight: 32 }}
          >
            ⏭
          </button>
        )}
        {student.is_absent ? (
          onMarkPresent && (
            <button
              className="btn btn-success btn-sm"
              onClick={onMarkPresent}
              title="Mark present"
              style={{ padding: '4px 8px', minHeight: 32 }}
            >
              ✓
            </button>
          )
        ) : (
          onMarkAbsent && (
            <button
              className="btn btn-outline btn-sm"
              onClick={onMarkAbsent}
              title="Mark absent"
              style={{ padding: '4px 8px', minHeight: 32, color: 'var(--color-red-light)' }}
            >
              ✗
            </button>
          )
        )}
      </div>
    </div>
  );
}
