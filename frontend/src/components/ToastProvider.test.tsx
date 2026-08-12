import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToastProvider, { useToast } from './ToastProvider';

function Harness() {
  const { success, error, toast } = useToast();
  return (
    <div>
      <button onClick={() => success('Saved 2 changes.')}>ok</button>
      <button onClick={() => error('Could not save.')}>bad</button>
      <button onClick={() => toast('Staged — press Save.', 'info')}>info</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('shows a success toast when requested', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('ok'));
    expect(screen.getByText('Saved 2 changes.')).toBeInTheDocument();
  });

  it('marks errors with role="alert" for screen readers', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('bad'));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });

  it('auto-dismisses an info toast after its timeout', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('info'));
    expect(screen.getByText('Staged — press Save.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Staged — press Save.')).not.toBeInTheDocument();
  });

  it('keeps error toasts on screen longer than info toasts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('bad'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Still visible at 4s, where an info toast would already be gone.
    expect(screen.getByText('Could not save.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Could not save.')).not.toBeInTheDocument();
  });

  it('dismisses a toast when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('ok'));
    await user.click(screen.getByText('Saved 2 changes.'));
    expect(screen.queryByText('Saved 2 changes.')).not.toBeInTheDocument();
  });

  it('stacks multiple toasts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHarness();

    await user.click(screen.getByText('ok'));
    await user.click(screen.getByText('bad'));

    expect(screen.getByText('Saved 2 changes.')).toBeInTheDocument();
    expect(screen.getByText('Could not save.')).toBeInTheDocument();
  });

  it('throws if useToast is called outside the provider', () => {
    // Silence the expected React error boundary logging.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(/useToast must be used inside/);
    spy.mockRestore();
  });
});
