import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('NotFoundPage', () => {
  it('renders for an unknown route', () => {
    renderAt('/nope');
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('shows the path that was not found, to expose typos', () => {
    renderAt('/session/typo/maap');
    expect(screen.getByText('/session/typo/maap')).toBeInTheDocument();
  });

  it('offers a route back to the classroom list', () => {
    renderAt('/nope');
    expect(screen.getByRole('button', { name: /Back to Classrooms/ })).toBeInTheDocument();
  });

  it('offers a back-navigation action', () => {
    renderAt('/nope');
    expect(screen.getByRole('button', { name: /Go Back/ })).toBeInTheDocument();
  });

  it('does not hijack a valid route', () => {
    renderAt('/');
    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.queryByText('404')).not.toBeInTheDocument();
  });
});
