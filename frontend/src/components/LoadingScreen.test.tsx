import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('announces itself to assistive technology', () => {
    render(<LoadingScreen message="Loading classroom session…" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the supplied message', () => {
    render(<LoadingScreen message="Preparing your journey…" />);
    expect(screen.getByText('Preparing your journey…')).toBeInTheDocument();
  });

  it('shows an optional hint', () => {
    render(<LoadingScreen message="Loading…" hint="Fetching students" />);
    expect(screen.getByText('Fetching students')).toBeInTheDocument();
  });

  it('omits the hint when not provided', () => {
    const { container } = render(<LoadingScreen message="Loading…" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('falls back to a default message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('fills the viewport by default and shrinks when inline', () => {
    const { container: full } = render(<LoadingScreen />);
    expect((full.firstChild as HTMLElement).style.minHeight).toBe('100vh');

    const { container: inline } = render(<LoadingScreen inline />);
    expect((inline.firstChild as HTMLElement).style.minHeight).toBe('240px');
  });
});
