import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '@/components/auth/PasswordInput';

// Helper to get the password input by its characteristics
const getPasswordInput = (container: HTMLElement) => {
  return container.querySelector('input') as HTMLInputElement;
};

describe('PasswordInput', () => {
  it('renders with default type password', () => {
    const { container } = render(<PasswordInput />);
    const input = getPasswordInput(container);
    expect(input.type).toBe('password');
  });

  it('renders label when provided', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(
      <PasswordInput placeholder="Enter password" />
    );
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('toggles password visibility when button is clicked', () => {
    const { container } = render(<PasswordInput />);
    const input = getPasswordInput(container);
    const toggleButton = screen.getByRole('button', { name: 'Show password' });

    expect(input.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(input.type).toBe('text');
    expect(
      screen.getByRole('button', { name: 'Hide password' })
    ).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(input.type).toBe('password');
  });

  it('displays error message when provided', () => {
    render(<PasswordInput error="Password is required" />);
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not display error when not provided', () => {
    render(<PasswordInput />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sets aria-invalid to true when there is an error', () => {
    const { container } = render(<PasswordInput error="Invalid password" />);
    const input = getPasswordInput(container);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid to false when there is no error', () => {
    const { container } = render(<PasswordInput />);
    const input = getPasswordInput(container);
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('uses provided id', () => {
    const { container } = render(
      <PasswordInput id="my-password" label="Password" />
    );
    const input = getPasswordInput(container);
    expect(input).toHaveAttribute('id', 'my-password');
  });

  it('generates unique id when not provided', () => {
    const { container } = render(<PasswordInput label="Password" />);
    const input = getPasswordInput(container);
    expect(input).toHaveAttribute('id');
    expect(input.id).toContain('password-');
  });

  it('associates label with input via htmlFor', () => {
    render(<PasswordInput id="test-password" label="Password" />);
    const label = screen.getByText('Password');
    expect(label).toHaveAttribute('for', 'test-password');
  });

  it('applies custom className', () => {
    const { container } = render(<PasswordInput className="custom-class" />);
    const input = getPasswordInput(container);
    expect(input).toHaveClass('custom-class');
  });

  it('forwards ref to input element', () => {
    const ref = { current: null };
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes through additional props', () => {
    const { container } = render(
      <PasswordInput
        placeholder="Enter password"
        disabled
        autoComplete="new-password"
      />
    );
    const input = getPasswordInput(container);
    expect(input).toHaveAttribute('placeholder', 'Enter password');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('autoComplete', 'new-password');
  });

  it('has correct touch target size (44px height)', () => {
    const { container } = render(<PasswordInput />);
    const input = getPasswordInput(container);
    expect(input).toHaveClass('h-11');
  });

  it('applies error styling when error is present', () => {
    const { container } = render(<PasswordInput error="Error" />);
    const input = getPasswordInput(container);
    expect(input.className).toContain('border-[var(--color-error)]');
  });
});
