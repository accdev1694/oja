import { render, screen } from '@testing-library/react';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

describe('PasswordStrength', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders strength indicator when password is provided', () => {
    render(<PasswordStrength password="a" />);
    expect(screen.getByText('Password strength:')).toBeInTheDocument();
  });

  it('shows weak strength for simple password', () => {
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows fair strength for password meeting two requirements', () => {
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows good strength for password meeting three requirements', () => {
    render(<PasswordStrength password="Abcdefgh" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows strong strength for password meeting all requirements', () => {
    render(<PasswordStrength password="Password1" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('displays all requirement labels', () => {
    render(<PasswordStrength password="a" />);
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('One number')).toBeInTheDocument();
  });

  it('renders four strength meter segments', () => {
    const { container } = render(<PasswordStrength password="a" />);
    const meterContainer = container.querySelector('.flex.gap-1');
    expect(meterContainer?.children).toHaveLength(4);
  });

  it('updates when password changes', () => {
    const { rerender } = render(<PasswordStrength password="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();

    rerender(<PasswordStrength password="Password1" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows correct requirements as met for strong password', () => {
    const { container } = render(<PasswordStrength password="Password1" />);
    // All requirements should be met (have success color)
    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(4);
    listItems.forEach((item) => {
      expect(item.className).toContain('text-[var(--color-success)]');
    });
  });

  it('shows unmet requirements for weak password', () => {
    const { container } = render(<PasswordStrength password="abc" />);
    // Find requirements that are not met
    const unmetItems = container.querySelectorAll(
      'li.text-\\[var\\(--color-muted\\)\\]'
    );
    // Should have at least 2 unmet (length and number for "abc")
    expect(unmetItems.length).toBeGreaterThan(0);
  });
});
