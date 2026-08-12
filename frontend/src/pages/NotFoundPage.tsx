import { useNavigate, useLocation } from 'react-router-dom';

const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

/**
 * 404 page.
 *
 * Unknown routes previously redirected silently to "/", which hid typos and
 * broken links. Showing the missing path makes the problem visible while still
 * offering a clear way back.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="page"
      style={{
        minHeight: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="anim-pop-in"
        style={{
          background: 'linear-gradient(155deg, #1d2136 0%, #12162a 100%)',
          border: '2px solid var(--color-saffron)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem 2rem',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 0 45px rgba(255,153,51,0.22)',
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

        <div style={{ fontSize: '3.5rem', fontFamily: EMOJI_FONT, lineHeight: 1 }}>🧭</div>

        <h1
          className="text-tricolor-gradient"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.6rem',
            fontWeight: 900,
            margin: '0.5rem 0 0.25rem',
            lineHeight: 1,
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: '0 0 0.6rem',
          }}
        >
          This place isn’t on the map
        </h2>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            lineHeight: 1.55,
            margin: '0 auto 1rem',
            maxWidth: 380,
          }}
        >
          We couldn’t find the page you were looking for. It may have moved, or the link
          might be mistyped.
        </p>

        <code
          style={{
            display: 'block',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.8rem',
            marginBottom: '1.6rem',
            wordBreak: 'break-all',
          }}
        >
          {location.pathname}
        </code>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/')}
            style={{ boxShadow: '0 0 22px rgba(255,153,51,0.35)' }}
            autoFocus
          >
            🏫 Back to Classrooms
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
