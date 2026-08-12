const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

interface Props {
  /** Main line, e.g. "Loading classroom session…" */
  message?: string;
  /** Optional secondary line for extra context. */
  hint?: string;
  /** Render inline (fills its parent) instead of covering the viewport. */
  inline?: boolean;
}

/**
 * Branded full-screen loading state, shared across route transitions and data
 * fetches so waiting always looks the same rather than a bare spinner.
 */
export default function LoadingScreen({ message = 'Loading…', hint, inline = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: inline ? '240px' : '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.1rem',
        background: inline ? 'transparent' : '#090d16',
        padding: '2rem 1.5rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Tricolour ring — the app's identity, not a generic spinner */}
      <div style={{ position: 'relative', width: 78, height: 78 }}>
        <svg viewBox="0 0 78 78" width="78" height="78" aria-hidden="true">
          <circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
          <circle
            cx="39"
            cy="39"
            r="32"
            fill="none"
            stroke="#ff9933"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="60 141"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 39 39"
              to="360 39 39"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="39"
            cy="39"
            r="32"
            fill="none"
            stroke="#10b981"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="30 171"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="180 39 39"
              to="540 39 39"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            fontFamily: EMOJI_FONT,
          }}
          aria-hidden="true"
        >
          🗺️
        </span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.05rem',
            color: 'var(--color-saffron)',
            margin: 0,
          }}
        >
          {message}
        </p>
        {hint && (
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              margin: '0.35rem 0 0',
            }}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
