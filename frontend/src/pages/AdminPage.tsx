import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../components/ToastProvider';
import { useSession } from '../store/sessionStore';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchAdminSections,
  fetchAdminStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  fetchMe,
  logout,
  AdminSection,
  AuthUser,
} from '../api/client';
import { Student } from '../types';
import IconRail from '../components/IconRail';

const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

const AVATARS = ['🧑', '👦', '👧', '🧒', '👨‍🎓', '👩‍🎓', '🦸', '🦹', '🧙', '🐯', '🦁', '🐼'];

/**
 * Teacher admin page — manage the students in each section.
 * All reads and writes go straight to Postgres via /api/admin.
 */
export default function AdminPage() {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // Classroom is chosen as (grade, section letter) rather than an opaque UUID.
  const [activeGrade, setActiveGrade] = useState<number | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New student form
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('🧑');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Staged (unsaved) edits
  interface PendingAdd {
    draftId: string;
    name: string;
    avatar: string;
  }
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);
  const [pendingRenames, setPendingRenames] = useState<Record<string, string>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const toastApi = useToast();
  // Lets the roster / turn spinner pick up admin edits without a full reload.
  const { refreshStudents } = useSession();

  const pendingCount =
    pendingAdds.length + Object.keys(pendingRenames).length + pendingDeletes.length;

  const loadStudents = useCallback(async (sid: string) => {
    setLoading(true);
    const rows = await fetchAdminStudents(sid);
    if (rows === null) setError('Could not load students. Is the server running?');
    else {
      setStudents(rows);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      // Gate the page on a valid session before loading any data.
      const me = await fetchMe();
      if (!me) {
        navigate(`/session/${sectionId}/staff-login`, { replace: true });
        return;
      }
      setAuthUser(me);

      const secs = await fetchAdminSections();
      if (secs === null) {
        setError('Could not reach the server.');
        setLoading(false);
        return;
      }
      setSections(secs);

      const first = secs.find((s) => s.grade != null && s.section_letter) ?? secs[0];
      if (first) {
        setActiveGrade(first.grade);
        setActiveLetter(first.section_letter);
        setActiveSection(first.id);
        await loadStudents(first.id);
      } else {
        setLoading(false);
      }
    })();
  }, [loadStudents, navigate, sectionId]);

  /** Switch classroom by grade + section letter. */
  const selectClassroom = useCallback(
    (grade: number, letter: string) => {
      const match = sections.find((s) => s.grade === grade && s.section_letter === letter);
      setActiveGrade(grade);
      setActiveLetter(letter);

      if (!match) {
        // No row for this combination — show an empty roster rather than
        // silently leaving the previous class's students on screen.
        setActiveSection(null);
        setStudents([]);
        setError(`No classroom record for Class ${grade} · Section ${letter}.`);
        return;
      }

      setError(null);
      setActiveSection(match.id);
      loadStudents(match.id);
    },
    [sections, loadStudents]
  );

  const grades = Array.from(
    new Set(sections.map((s) => s.grade).filter((g): g is number => g != null))
  ).sort((a, b) => a - b);

  const letters = Array.from(
    new Set(sections.map((s) => s.section_letter).filter((l): l is string => !!l))
  ).sort();

  /**
   * Saved students merged with staged edits, so the table always shows what
   * the roster *will* look like once saved.
   */
  interface RowView {
    id: string;
    name: string;
    avatar: string;
    level: number;
    total_xp: number;
    status: 'saved' | 'added' | 'renamed' | 'deleted';
  }

  const rows: RowView[] = [
    ...students.map((s): RowView => {
      const renamed = pendingRenames[s.id];
      const deleted = pendingDeletes.includes(s.id);
      return {
        id: s.id,
        name: renamed ?? s.name,
        avatar: s.avatar || '🧑',
        level: s.level,
        total_xp: s.total_xp,
        status: deleted ? 'deleted' : renamed ? 'renamed' : 'saved',
      };
    }),
    ...pendingAdds.map((a): RowView => ({
      id: a.draftId,
      name: a.name,
      avatar: a.avatar,
      level: 1,
      total_xp: 0,
      status: 'added',
    })),
  ];

  // Warn before a tab close / reload would silently drop staged edits.
  useEffect(() => {
    if (pendingCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingCount]);

  /** Confirm before switching classrooms with unsaved work. */
  function guardedSelectClassroom(grade: number, letter: string) {
    if (
      pendingCount > 0 &&
      !window.confirm(`You have ${pendingCount} unsaved change(s). Discard them and switch class?`)
    ) {
      return;
    }
    setPendingAdds([]);
    setPendingRenames({});
    setPendingDeletes([]);
    selectClassroom(grade, letter);
  }

  /** Keep the per-section counts on the picker chips accurate. */
  function bumpCount(sectionId: string, delta: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, student_count: Math.max(0, s.student_count + delta) } : s
      )
    );
  }

  // ─── Draft edits ──────────────────────────────────────────────────────────
  // Changes are staged locally and only written to Postgres when the teacher
  // presses Save, so a mistyped name or accidental Remove costs nothing.

  function stageAdd() {
    if (!activeSection || !newName.trim()) return;

    const name = newName.trim();
    if (students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toastApi.error(`${name} is already in this class.`);
      return;
    }

    const draftId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setPendingAdds((prev) => [...prev, { draftId, name, avatar: newAvatar }]);
    setNewName('');
    toastApi.toast(`${name} staged — press Save to apply.`, 'info');
  }

  function stageRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (id.startsWith('new-')) {
      setPendingAdds((prev) =>
        prev.map((a) => (a.draftId === id ? { ...a, name: trimmed } : a))
      );
    } else {
      const original = students.find((s) => s.id === id);
      if (original && original.name === trimmed) {
        // Reverted to the original value — drop the pending edit entirely.
        setPendingRenames((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        setPendingRenames((prev) => ({ ...prev, [id]: trimmed }));
      }
    }

    setEditingId(null);
    toastApi.toast(`Renamed to ${trimmed} — press Save to apply.`, 'info');
  }

  function stageDelete(id: string, name: string) {
    if (id.startsWith('new-')) {
      // Never persisted, so just drop the draft.
      setPendingAdds((prev) => prev.filter((a) => a.draftId !== id));
      toastApi.toast(`Discarded ${name}.`, 'info');
      return;
    }
    setPendingDeletes((prev) => (prev.includes(id) ? prev : [...prev, id]));
    toastApi.toast(`${name} marked for removal — press Save to apply.`, 'info');
  }

  function undoDelete(id: string) {
    setPendingDeletes((prev) => prev.filter((x) => x !== id));
  }

  function discardChanges() {
    setPendingAdds([]);
    setPendingRenames({});
    setPendingDeletes([]);
    setEditingId(null);
    toastApi.toast('Changes discarded.', 'info');
  }

  /** Write all staged changes to the database. */
  async function saveChanges() {
    if (!activeSection || busy || pendingCount === 0) return;

    setBusy(true);
    setError(null);

    let applied = 0;
    const failures: string[] = [];

    // Deletes first, so a rename+delete of the same row can't conflict.
    for (const id of pendingDeletes) {
      const name = students.find((s) => s.id === id)?.name ?? 'student';
      const res = await deleteStudent(id);
      if (res) {
        applied++;
        bumpCount(activeSection, -1);
      } else {
        failures.push(`remove ${name}`);
      }
    }

    for (const [id, name] of Object.entries(pendingRenames)) {
      if (pendingDeletes.includes(id)) continue; // already gone
      const res = await updateStudent(id, { name });
      if (res) applied++;
      else failures.push(`rename to ${name}`);
    }

    for (const add of pendingAdds) {
      const res = await createStudent(activeSection, add.name, add.avatar);
      if (res) {
        applied++;
        bumpCount(activeSection, 1);
      } else {
        failures.push(`add ${add.name}`);
      }
    }

    // Re-read from the server so the list reflects what was actually stored.
    await loadStudents(activeSection);
    // Keep the in-app roster and turn spinner in sync with these edits.
    await refreshStudents();

    setPendingAdds([]);
    setPendingRenames({});
    setPendingDeletes([]);
    setBusy(false);

    if (failures.length === 0) {
      toastApi.success(`Saved ${applied} change${applied === 1 ? '' : 's'}.`);
    } else if (applied > 0) {
      toastApi.error(`Saved ${applied}, but could not ${failures.join(', ')}.`);
    } else {
      toastApi.error(`Could not save. Failed to ${failures.join(', ')}.`);
    }
  }

  return (
    <div
      className="page"
      style={{ height: '100vh', overflow: 'hidden', background: '#090d16', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header — matches the rest of the app */}
      <header className="app-header" style={{ height: 60, flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/session/${sectionId}/map`)}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            ← Map
          </button>
          <div className="tricolor-ribbon">
            <span className="orange" />
            <span className="white" />
            <span className="green" />
          </div>
          <div>
            <h1 className="text-tricolor-gradient" style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
              BHARAT QUEST AI
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              ⚙️ ADMIN · Manage Students
            </p>
          </div>
        </div>

        {/* Signed-in staff + sign out */}
        {authUser && (
          <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.5px',
                color: authUser.role === 'admin' ? 'var(--color-gold)' : 'var(--color-cyan)',
                background:
                  authUser.role === 'admin' ? 'rgba(255,193,7,0.12)' : 'rgba(6,182,212,0.12)',
                border: `1px solid ${
                  authUser.role === 'admin' ? 'rgba(255,193,7,0.35)' : 'rgba(6,182,212,0.32)'
                }`,
                borderRadius: 99,
                padding: '3px 10px',
              }}
            >
              {authUser.role.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              {authUser.name}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={async () => {
                await logout();
                navigate(`/session/${sectionId}/staff-login`, { replace: true });
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <IconRail activeTab="admin" />

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          {/* Classroom picker — Class (grade) then Section */}
          {sections.length > 0 && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.1rem 1.5rem 1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ marginBottom: '0.9rem' }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: '0.45rem',
                  }}
                >
                  CLASS
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {grades.map((g) => {
                    const isActive = g === activeGrade;
                    return (
                      <button
                        key={g}
                        onClick={() => guardedSelectClassroom(g, activeLetter ?? letters[0] ?? 'A')}
                        style={{
                          background: isActive ? 'rgba(255,153,51,0.18)' : 'var(--color-surface-2)',
                          border: `1.5px solid ${isActive ? 'var(--color-saffron)' : 'var(--color-border)'}`,
                          color: isActive ? 'var(--color-saffron)' : 'var(--color-text-secondary)',
                          borderRadius: '10px',
                          padding: '0.45rem 1rem',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Class {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: '0.45rem',
                  }}
                >
                  SECTION
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {letters.map((l) => {
                    const isActive = l === activeLetter;
                    const count =
                      sections.find((s) => s.grade === activeGrade && s.section_letter === l)
                        ?.student_count ?? 0;
                    return (
                      <button
                        key={l}
                        onClick={() => activeGrade != null && guardedSelectClassroom(activeGrade, l)}
                        style={{
                          background: isActive ? 'rgba(79,91,213,0.22)' : 'var(--color-surface-2)',
                          border: `1.5px solid ${isActive ? 'var(--color-indigo-light)' : 'var(--color-border)'}`,
                          color: isActive ? 'var(--color-indigo-light)' : 'var(--color-text-secondary)',
                          borderRadius: '10px',
                          padding: '0.45rem 1rem',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Section {l} · {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#f87171',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Add student */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-saffron)',
                fontSize: '1.05rem',
                margin: '0 0 0.85rem',
              }}
            >
              ➕ Add a Student
            </h3>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewAvatar(a)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '9px',
                      fontSize: '1.1rem',
                      fontFamily: EMOJI_FONT,
                      cursor: 'pointer',
                      background: newAvatar === a ? 'rgba(255,153,51,0.22)' : 'var(--color-surface-2)',
                      border: `1.5px solid ${newAvatar === a ? 'var(--color-saffron)' : 'var(--color-border)'}`,
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && stageAdd()}
                placeholder="Student name"
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: 'var(--color-surface-2)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '0.6rem 0.9rem',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />

              <button
                className="btn btn-primary"
                onClick={stageAdd}
                disabled={!newName.trim() || busy || !activeSection}
                style={{ opacity: !newName.trim() || busy ? 0.5 : 1 }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Student list */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem 1.5rem',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                fontSize: '1.05rem',
                margin: '0 0 0.85rem',
              }}
            >
              👥 Students ({rows.filter((r) => r.status !== 'deleted').length})
              {activeGrade != null && activeLetter && (
                <span
                  style={{
                    marginLeft: '0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  · Class {activeGrade} · Section {activeLetter}
                </span>
              )}
            </h3>

            {loading ? (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '2rem 0', color: 'var(--color-saffron)' }}>
                <div className="spinner-ring" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', padding: '1.5rem 0', textAlign: 'center' }}>
                No students in this section yet — add one above.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rows.map((r) => {
                  // Pending rows are visually distinct so it is obvious what
                  // will change when Save is pressed.
                  const tint =
                    r.status === 'added'
                      ? { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.45)' }
                      : r.status === 'renamed'
                      ? { bg: 'rgba(255,193,7,0.10)', border: 'rgba(255,193,7,0.45)' }
                      : r.status === 'deleted'
                      ? { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.45)' }
                      : { bg: 'var(--color-surface-2)', border: 'var(--color-border)' };

                  const badge =
                    r.status === 'added'
                      ? { text: 'NEW', color: '#34d399' }
                      : r.status === 'renamed'
                      ? { text: 'EDITED', color: '#ffc107' }
                      : r.status === 'deleted'
                      ? { text: 'REMOVING', color: '#f87171' }
                      : null;

                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        background: tint.bg,
                        border: `1px solid ${tint.border}`,
                        borderRadius: '12px',
                        padding: '0.7rem 1rem',
                        opacity: r.status === 'deleted' ? 0.65 : 1,
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', fontFamily: EMOJI_FONT, flexShrink: 0 }}>
                        {r.avatar}
                      </span>

                      {editingId === r.id ? (
                        <input
                          value={editName}
                          autoFocus
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') stageRename(r.id, editName);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            flex: 1,
                            background: 'var(--color-surface)',
                            border: '1.5px solid var(--color-saffron)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.7rem',
                            color: 'var(--color-text-primary)',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 800,
                              color: 'var(--color-text-primary)',
                              textDecoration: r.status === 'deleted' ? 'line-through' : 'none',
                            }}
                          >
                            {r.name}
                            {badge && (
                              <span
                                style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  letterSpacing: '0.5px',
                                  color: badge.color,
                                  border: `1px solid ${badge.color}`,
                                  borderRadius: 99,
                                  padding: '1px 7px',
                                }}
                              >
                                {badge.text}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            Level {r.level} · {r.total_xp} XP
                          </div>
                        </div>
                      )}

                      {editingId === r.id ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => stageRename(r.id, editName)}
                            disabled={busy}
                          >
                            Apply
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : r.status === 'deleted' ? (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => undoDelete(r.id)}
                          disabled={busy}
                        >
                          Undo
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditName(r.name);
                            }}
                            disabled={busy}
                          >
                            Rename
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => stageDelete(r.id, r.name)}
                            disabled={busy}
                            style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#f87171' }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky save bar — only while there are staged changes */}
          {pendingCount > 0 && (
            <div
              className="anim-pop-in"
              style={{
                position: 'sticky',
                bottom: 0,
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'linear-gradient(145deg, #1d2136 0%, #151828 100%)',
                border: '2px solid var(--color-saffron)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.9rem 1.25rem',
                boxShadow: '0 -6px 28px rgba(0,0,0,0.55), 0 0 24px rgba(255,153,51,0.2)',
              }}
            >
              <span style={{ fontSize: '1.3rem', fontFamily: EMOJI_FONT }}>📝</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    color: 'var(--color-saffron)',
                  }}
                >
                  {pendingCount} unsaved change{pendingCount === 1 ? '' : 's'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  {[
                    pendingAdds.length && `${pendingAdds.length} added`,
                    Object.keys(pendingRenames).length &&
                      `${Object.keys(pendingRenames).length} renamed`,
                    pendingDeletes.length && `${pendingDeletes.length} removed`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>

              <button className="btn btn-outline" onClick={discardChanges} disabled={busy}>
                Discard
              </button>
              <button
                className="btn btn-primary"
                onClick={saveChanges}
                disabled={busy}
                style={{ boxShadow: '0 0 20px rgba(255,153,51,0.35)' }}
              >
                {busy ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
