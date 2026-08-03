import { useState } from 'react';
import Spinner from './Spinner';
import StudentRow from './StudentRow';
import { useSession } from '../store/sessionStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RosterDrawer({ isOpen, onClose }: Props) {
  const { studentsWithSession, skipStudent, markAbsent, markPresent } = useSession();
  const [activeTab, setActiveTab] = useState<'present' | 'all'>('present');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 14, 24, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      className="anim-fade-in"
      onClick={onClose}
    >
      <div
        style={{
          width: 380,
          maxWidth: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #141824 0%, #0b0e17 100%)',
          borderLeft: '2px solid var(--color-saffron)',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        className="anim-pop-in"
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.5rem' }}>👥</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
              Classroom Roster
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: 'var(--color-text-primary)',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Turn Queue Spinner Card */}
        <Spinner />

        {/* Attendance Roster List */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800 }}>
              Student Roster
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
              {studentsWithSession.filter((s) => !s.is_absent).length} Present
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'present' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: 34, fontSize: '0.8rem' }}
              onClick={() => setActiveTab('present')}
            >
              Present
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, minHeight: 34, fontSize: '0.8rem' }}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
            {studentsWithSession
              .filter((s) => activeTab === 'all' || !s.is_absent)
              .map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  compact
                  onSkip={!student.is_absent ? () => skipStudent(student.id) : undefined}
                  onMarkAbsent={!student.is_absent ? () => markAbsent(student.id) : undefined}
                  onMarkPresent={student.is_absent ? () => markPresent(student.id) : undefined}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
