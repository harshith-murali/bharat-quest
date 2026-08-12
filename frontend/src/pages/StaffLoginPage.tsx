import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { login } from '../api/client';

/**
 * Staff sign-in (teachers & admins).
 *
 * Students never sign in — the app runs on a shared classroom smartboard and
 * students are chosen by the turn spinner.
 */
export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;

    setBusy(true);
    setError(null);

    const user = await login(email.trim(), password);
    setBusy(false);

    if (user) {
      navigate(`/session/${sectionId}/admin`, { replace: true });
    } else {
      // Deliberately vague: don't reveal whether the account exists.
      setError('Invalid email or password.');
    }
  }

  return (
    <div
      className="page"
      style={{
        height: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="anim-pop-in"
        style={{
          background: 'linear-gradient(145deg, #181d2f 0%, #0d111e 100%)',
          border: '2px solid var(--color-saffron)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem 2rem',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 0 40px rgba(255,153,51,0.25)',
          position: 'relative',
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

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '2.5rem',
              lineHeight: 1,
              // Emoji need an explicit family or they fall back inconsistently
              // and sit misaligned against the heading.
              fontFamily:
                "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Segoe UI Symbol',sans-serif",
            }}
          >
            🔐
          </div>
          <h1
            style={{
              // Deliberately NOT .text-tricolor-gradient: that gradient is sized
              // for the wide app header, so on a short centred heading it splits
              // mid-phrase (orange "Staff" / white gap / green "Sign In") and
              // reads as a rendering fault.
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              margin: '0.5rem 0 0.25rem',
              lineHeight: 1.2,
            }}
          >
            Staff Sign In
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Teachers and administrators only
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '10px',
              padding: '0.65rem 0.9rem',
              color: '#f87171',
              fontSize: '0.88rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <label
          style={{
            display: 'block',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.35rem',
          }}
        >
          EMAIL
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          style={{
            width: '100%',
            background: 'var(--color-surface-2)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '10px',
            padding: '0.65rem 0.9rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.95rem',
            marginBottom: '1rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <label
          style={{
            display: 'block',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.35rem',
          }}
        >
          PASSWORD
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            width: '100%',
            background: 'var(--color-surface-2)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '10px',
            padding: '0.65rem 0.9rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={busy || !email.trim() || !password}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            borderRadius: '12px',
            opacity: busy || !email.trim() || !password ? 0.55 : 1,
          }}
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <button
          type="button"
          className="btn btn-outline w-full"
          style={{ marginTop: '0.6rem' }}
          onClick={() => navigate(`/session/${sectionId}/map`)}
        >
          ← Back to Map
        </button>
      </form>
    </div>
  );
}
