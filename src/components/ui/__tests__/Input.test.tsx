import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="Email is required" />);
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  describe('Size and Touch Target', () => {
    it('has 44px height (minimum touch target)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-11'); // 44px = 11 * 4
    });
  });

  describe('States', () => {
    it('handles disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('applies error styling when error prop is provided', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-[var(--color-error)]');
    });

    it('shows error state in ARIA attributes', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Interactions', () => {
    it('handles value changes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('does not allow input when disabled', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<Input disabled onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test');
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('connects label to input with htmlFor', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('generates unique ID when not provided', () => {
      render(<Input label="Email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(input.id).toBeTruthy();
      expect(input.id.length).toBeGreaterThan(0);
    });

    it('associates helper text with input via aria-describedby', () => {
      render(<Input helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(describedBy).toContain('helper');
    });

    it('associates error message with input via aria-describedby', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(describedBy).toContain('error');
    });

    it('error message has role="alert"', () => {
      render(<Input error="Error message" />);
      const error = screen.getByRole('alert');
      expect(error).toHaveTextContent('Error message');
    });

    it('does not show helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = jest.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });

    it('accepts custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('supports reduced motion', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('motion-reduce:transition-none');
    });

    it('has proper focus styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Label Styling', () => {
    it('renders label with proper text color', () => {
      render(<Input label="Test Label" />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-[var(--color-charcoal)]');
    });
  });
});
