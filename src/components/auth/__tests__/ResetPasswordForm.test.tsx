import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockUpdateUser = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  }),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders password inputs', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<ResetPasswordForm />);
    expect(
      screen.getByRole('button', { name: 'Update Password' })
    ).toBeInTheDocument();
  });

  it('shows password strength indicator when typing', () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'Test' } });

    expect(screen.getByText('Password strength:')).toBeInTheDocument();
  });

  it('shows validation error for weak password', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'weak' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    // Password input should show error state
    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('shows validation error for mismatched passwords', async () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, {
      target: { value: 'DifferentPassword123' },
    });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('calls updateUser with new password', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'NewPassword123',
      });
    });
  });

  it('redirects to login on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/login?message=password_reset_success'
      );
    });
  });

  it('shows error for update failure', async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: 'Update failed' },
    });

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockUpdateUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();
  });

  it('disables inputs during loading', async () => {
    mockUpdateUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });

    const confirmInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });

    const submitButton = screen.getByRole('button', {
      name: 'Update Password',
    });
    fireEvent.click(submitButton);

    expect(passwordInput).toBeDisabled();
    expect(confirmInput).toBeDisabled();
  });

  it('has required attributes on inputs', () => {
    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText('New Password');
    const confirmInput = screen.getByLabelText('Confirm New Password');

    expect(passwordInput).toHaveAttribute('required');
    expect(confirmInput).toHaveAttribute('required');
  });
});
