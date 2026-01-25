import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignOutButton } from '@/components/auth/SignOutButton';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock signOut
const mockSignOut = jest.fn();
jest.mock('@/lib/supabase/auth', () => ({
  signOut: () => mockSignOut(),
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign out button', () => {
    render(<SignOutButton />);
    expect(
      screen.getByRole('button', { name: 'Sign Out' })
    ).toBeInTheDocument();
  });

  it('calls signOut when clicked', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('redirects to login after successful sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('refreshes router after sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows loading state during sign out', async () => {
    mockSignOut.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: 'Signing out...' })
    ).toBeDisabled();
  });

  it('shows error when sign out fails', async () => {
    mockSignOut.mockResolvedValue({
      error: { message: 'Sign out failed' },
    });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('does not redirect when sign out fails', async () => {
    mockSignOut.mockResolvedValue({
      error: { message: 'Sign out failed' },
    });

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('accepts custom variant prop', () => {
    render(<SignOutButton variant="destructive" />);
    expect(
      screen.getByRole('button', { name: 'Sign Out' })
    ).toBeInTheDocument();
  });

  it('accepts custom className prop', () => {
    render(<SignOutButton className="custom-class" />);
    const button = screen.getByRole('button', { name: 'Sign Out' });
    expect(button).toHaveClass('custom-class');
  });

  it('handles unexpected errors gracefully', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
