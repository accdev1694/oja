import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

// Mock resetPassword
const mockResetPassword = jest.fn();
jest.mock('@/lib/supabase/auth', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email input', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<ForgotPasswordForm />);
    expect(
      screen.getByRole('button', { name: 'Send Reset Link' })
    ).toBeInTheDocument();
  });

  it('calls resetPassword with correct email', async () => {
    mockResetPassword.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success message after submission', async () => {
    mockResetPassword.mockResolvedValue({ error: null });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('shows success message even if email does not exist (security)', async () => {
    mockResetPassword.mockResolvedValue({
      error: { message: 'User not found' },
    });

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, {
      target: { value: 'nonexistent@example.com' },
    });

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockResetPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  it('disables input during loading', async () => {
    mockResetPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });
    fireEvent.click(submitButton);

    expect(emailInput).toBeDisabled();
  });

  it('has email type input', () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('has required attribute on email input', () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveAttribute('required');
  });
});
