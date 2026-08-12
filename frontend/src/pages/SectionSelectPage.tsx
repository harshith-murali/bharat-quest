import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section } from '../types';
import { fetchSections } from '../api/client';
import { useSession } from '../store/sessionStore';

export default function SectionSelectPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('Class 3');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const online = await fetchSections();
        if (online && online.length > 0) {
          setSections(online);
          setSelectedSectionId(online[0].id);
        } else if (!navigator.onLine) {
          setError('You are offline. Connecting to local cached session data.');
        } else {
          setError('No sections found. Please ensure backend is running.');
        }
      } catch {
        setError('Failed to load sections from server.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [selectedSectionName, setSelectedSectionName] = useState<string>('Section A');

  // Filter sections matching selected standard grade (or show all if no match)
  const filteredSections = sections.filter((s) => {
    const stdNum = selectedStandard.replace(/\D/g, ''); // e.g. "6"
    return s.name.startsWith(stdNum) || s.name.includes(stdNum);
  });

  const availableSections = filteredSections.length > 0 ? filteredSections : sections;

  const { setSessionContext } = useSession();

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gradeNum = parseInt(selectedStandard.replace(/\D/g, ''), 10) || 3;
    const sectionLetter = selectedSectionName.replace(/Section\s*/i, '').trim() || 'A';

    // Resolve the classroom that actually matches the chosen Class + Section.
    //
    // This previously fell back to `availableSections[0]`, which meant picking
    // "Class 5 · Section C" could silently load a different classroom's
    // students and progress. Match on the real grade/section_letter columns,
    // falling back to the name only for legacy rows that predate them.
    const targetSection =
      sections.find(
        (s) =>
          (s as { grade?: number }).grade === gradeNum &&
          (s as { section_letter?: string }).section_letter?.toUpperCase() ===
            sectionLetter.toUpperCase()
      ) ||
      sections.find((s) => s.name === `Grade ${gradeNum} - ${sectionLetter.toUpperCase()}`) ||
      sections.find((s) => s.id === selectedSectionId);

    if (!targetSection) {
      setError(
        `No classroom record for Class ${gradeNum} · Section ${sectionLetter}. ` +
          'Ask an administrator to create it.'
      );
      return;
    }

    setSessionContext(gradeNum, sectionLetter, targetSection, []);
    navigate(`/session/${targetSection.id}/dashboard`, { state: { section: targetSection } });
  }

  return (
    <div className="page" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1rem' }}>
      {/* Top Branding Navigation Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          zIndex: 50,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="tricolor-ribbon">
            <span className="orange"></span>
            <span className="white"></span>
            <span className="green"></span>
          </div>
          <div>
            <h1 className="text-tricolor-gradient" style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              Smartboard Classroom Login
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </header>

      {/* Main Split Authentication / Section Selection Card Container */}
      <main
        style={{
          width: '100%',
          maxWidth: 1040,
          margin: '5rem auto 1.5rem auto',
          background: '#0f1422',
          border: '1.5px solid rgba(255, 153, 51, 0.35)',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 35px rgba(255, 153, 51, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
        }}
        className="anim-pop-in"
      >
        {/* LEFT COLUMN: Warm 3D Illustrated Learning Graphic */}
        <div
          style={{
            flex: '0 0 46%',
            position: 'relative',
            background: '#090d16',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/assets/auth_kids_learning.png"
            alt="Children Learning Adventure"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, transparent 60%, rgba(9, 13, 22, 0.75) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* RIGHT COLUMN: Standard & Section Auth Form */}
        <div
          style={{
            flex: 1,
            padding: '2.5rem 2.8rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(145deg, #151a2a 0%, #0d111d 100%)',
          }}
        >
          <div>
            {/* Header Title & Subtitle */}
            <div style={{ marginBottom: '1.8rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.4rem',
                  lineHeight: 1.25,
                }}
              >
                Dive Into the World of Learning
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                Discover fun, interactive AI learning adventures that spark your students’ imagination.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  background: 'rgba(255,153,51,0.12)',
                  border: '1px solid rgba(255,153,51,0.35)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.2rem',
                  color: 'var(--color-saffron)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Selection Form: Standard & Section Options */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Field 1: Standard / Grade Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '0.3px',
                  }}
                >
                  Standard / Grade
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7'].map((std) => {
                    const active = selectedStandard === std;
                    return (
                      <button
                        type="button"
                        key={std}
                        onClick={() => {
                          setSelectedStandard(std);
                          const matching = sections.find((s) => s.name.includes(std.replace(/\D/g, '')));
                          if (matching) setSelectedSectionId(matching.id);
                        }}
                        style={{
                          padding: '0.6rem 0.3rem',
                          borderRadius: '10px',
                          border: active ? '2px solid var(--color-saffron)' : '1px solid var(--color-border)',
                          background: active
                            ? 'linear-gradient(135deg, rgba(255,153,51,0.25), rgba(255,119,0,0.15))'
                            : 'var(--color-surface-2)',
                          color: active ? 'var(--color-saffron)' : 'var(--color-text-primary)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: active ? 900 : 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: active ? '0 0 14px rgba(255,153,51,0.3)' : 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {std}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 2: Classroom Section Select (Section A, B, C, D) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '0.3px',
                  }}
                >
                  Classroom Section
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {['Section A', 'Section B', 'Section C', 'Section D'].map((sec) => {
                    const active = selectedSectionName === sec;
                    return (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => {
                          setSelectedSectionName(sec);
                          const letter = sec.replace('Section ', '');
                          const matching = sections.find((s) => s.name.endsWith(letter) || s.name.includes(letter));
                          if (matching) {
                            setSelectedSectionId(matching.id);
                          }
                        }}
                        style={{
                          padding: '0.66rem 0.4rem',
                          borderRadius: '10px',
                          border: active ? '2px solid var(--color-saffron)' : '1px solid var(--color-border)',
                          background: active
                            ? 'linear-gradient(135deg, rgba(255,153,51,0.25), rgba(255,119,0,0.15))'
                            : 'var(--color-surface-2)',
                          color: active ? 'var(--color-saffron)' : 'var(--color-text-primary)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: active ? 900 : 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: active ? '0 0 14px rgba(255,153,51,0.3)' : 'none',
                        }}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                className="btn btn-primary w-full mt-1"
                disabled={loading || availableSections.length === 0}
                style={{
                  fontSize: '1.1rem',
                  padding: '0.95rem',
                  minHeight: 56,
                  borderRadius: '14px',
                  boxShadow: '0 6px 20px rgba(255, 153, 51, 0.4)',
                }}
              >
                Login to Section 🚀
              </button>
            </form>
          </div>

          {/* Bottom Trust & Student Badge Footer Bar */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.2rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                Chosen by Teachers, Loved by Kids
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Safe, NCERT-verified learning that grows with your class.
              </div>
            </div>

            {/* Avatar Bubble Stack */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {['👧', '👦', '🧑‍🎓'].map((avatar, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2e3650, #1e2436)',
                    border: '2px solid #0f1422',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    marginLeft: idx > 0 ? -10 : 0,
                    zIndex: 3 - idx,
                  }}
                >
                  {avatar}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          fontWeight: 700,
        }}
      >
        Bharat Quest AI · Smartboard Classroom Edition · Works 100% Offline 📵
      </footer>
    </div>
  );
}
