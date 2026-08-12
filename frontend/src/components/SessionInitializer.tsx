import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../store/sessionStore';
import LoadingScreen from './LoadingScreen';
import { fetchSection } from '../api/client';
import { getSessionState } from '../db/idb';
import { Section, Student } from '../types';

interface Props {
  children: React.ReactNode;
}

export default function SessionInitializer({ children }: Props) {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { state, loadSection } = useSession();
  const [loading, setLoading] = useState(!state.section || state.section.id !== sectionId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) return;
    if (state.section && state.section.id === sectionId) {
      setLoading(false);
      return;
    }

    async function init() {
      setLoading(true);
      setError(null);

      try {
        let section: Section | null = null;
        let students: Student[] = [];

        const online = await fetchSection(sectionId!);
        if (online) {
          section = online.section;
          students = online.students;
        } else {
          const cached = await getSessionState(sectionId!);
          if (cached) {
            section = cached.cached_section;
            students = cached.cached_students;
          } else {
            setError('No cached session data found for this section.');
            setLoading(false);
            return;
          }
        }

        await loadSection(section, students);
      } catch (err) {
        setError(`Failed to load session: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [sectionId, state.section, loadSection]);

  if (loading) {
    return (
      <LoadingScreen
        message="Loading classroom session…"
        hint="Fetching students and quest progress"
      />
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#090d16' }}>
        <div className="card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <h2 style={{ color: 'var(--color-red-light)' }}>Session Error</h2>
          <p style={{ marginTop: '0.5rem' }}>{error}</p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/')}>
            ← Back to Section Selection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
