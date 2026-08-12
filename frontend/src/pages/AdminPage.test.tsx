import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ToastProvider from '../components/ToastProvider';
import AdminPage from './AdminPage';
import * as api from '../api/client';

/**
 * Component tests for the admin roster.
 *
 * The API layer is mocked so these run without a database. The behaviour under
 * test is the draft-staging model: nothing may reach the server until Save is
 * pressed.
 */

vi.mock('../api/client');
// The icon rail pulls in the session store and 3D-adjacent code that jsdom
// cannot render; it is irrelevant to this page's behaviour.
vi.mock('../components/IconRail', () => ({ default: () => <nav data-testid="rail" /> }));
// The page refreshes the in-app roster after saving; the session store is not
// under test here.
const refreshStudents = vi.fn().mockResolvedValue(undefined);
vi.mock('../store/sessionStore', () => ({
  useSession: () => ({ refreshStudents }),
}));

const SECTION = {
  id: 'sec-4a',
  name: 'Grade 4 - A',
  grade: 4,
  section_letter: 'A',
  student_count: 2,
};

function student(id: string, name: string) {
  return {
    id,
    section_id: SECTION.id,
    name,
    avatar: '🧑',
    level: 1,
    total_xp: 0,
    coins: 0,
    gems: 0,
    badges: [],
    last_turn_at: null,
  } as unknown as import('../types').Student;
}

function renderAdmin() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/session/sec-4a/admin']}>
        <Routes>
          <Route path="/session/:sectionId/admin" element={<AdminPage />} />
          <Route path="/session/:sectionId/staff-login" element={<div>LOGIN PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.mocked(api.fetchMe).mockResolvedValue({
    id: 'u1',
    email: 'head@school.test',
    name: 'Head Teacher',
    role: 'admin',
  });
  vi.mocked(api.fetchAdminSections).mockResolvedValue([SECTION]);
  vi.mocked(api.fetchAdminStudents).mockResolvedValue([
    student('s1', 'Aarav'),
    student('s2', 'Diya'),
  ]);
});

describe('AdminPage — authentication gate', () => {
  it('redirects to the staff login when there is no session', async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(null);
    renderAdmin();

    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    // Must not fetch roster data before auth is confirmed.
    expect(api.fetchAdminStudents).not.toHaveBeenCalled();
  });

  it('shows the signed-in user and role', async () => {
    renderAdmin();
    expect(await screen.findByText('Head Teacher')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});

describe('AdminPage — draft staging', () => {
  it('lists the existing roster', async () => {
    renderAdmin();
    expect(await screen.findByText('Aarav')).toBeInTheDocument();
    expect(screen.getByText('Diya')).toBeInTheDocument();
  });

  it('stages an add without calling the API', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    // Row appears, tagged NEW, but nothing was written.
    expect(await screen.findByText('Kabir')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(api.createStudent).not.toHaveBeenCalled();
  });

  it('shows a save bar counting the staged changes', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText(/1 unsaved change/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument();
  });

  it('rejects a duplicate name with an error toast', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'aarav');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already in this class/i);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('stages a removal and allows undo', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Aarav');

    // Aarav is the first row, so the first Remove button belongs to it.
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(await screen.findByText('REMOVING')).toBeInTheDocument();
    expect(api.deleteStudent).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('REMOVING')).not.toBeInTheDocument();
  });

  it('discards all staged changes', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByText(/1 unsaved change/);

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Kabir')).not.toBeInTheDocument();
  });
});

describe('AdminPage — saving', () => {
  it('writes staged changes and reports success', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createStudent).mockResolvedValue(student('s3', 'Kabir'));
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Save Changes/ }));

    await waitFor(() => {
      expect(api.createStudent).toHaveBeenCalledWith(SECTION.id, 'Kabir', expect.any(String));
    });
    expect(await screen.findByText(/Saved 1 change/)).toBeInTheDocument();
  });

  it('surfaces a failure instead of pretending it saved', async () => {
    const user = userEvent.setup();
    // null is how the API client signals failure.
    vi.mocked(api.createStudent).mockResolvedValue(null);
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not/i);
  });

  // Regression: admin edits wrote straight to the API, so the in-app roster
  // and turn spinner kept showing a stale list until a full page reload.
  it('refreshes the in-app roster after saving', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createStudent).mockResolvedValue(student('s3', 'Kabir'));
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(refreshStudents).toHaveBeenCalled());
  });

  it('clears the save bar after a successful save', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createStudent).mockResolvedValue(student('s3', 'Kabir'));
    renderAdmin();
    await screen.findByText('Aarav');

    await user.type(screen.getByPlaceholderText('Student name'), 'Kabir');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Save Changes/ }));

    await waitFor(() => {
      expect(screen.queryByText(/unsaved change/)).not.toBeInTheDocument();
    });
  });
});
