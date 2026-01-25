import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: jest.fn(() => false),
}));

describe('ConfirmDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('When closed', () => {
    it('does not render when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  describe('When open', () => {
    it('renders the dialog', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });

    it('renders the title', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item?"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    });

    it('renders the message', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Are you sure you want to proceed?"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByText('Are you sure you want to proceed?')
      ).toBeInTheDocument();
    });

    it('renders the backdrop', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('confirm-dialog-backdrop')).toBeInTheDocument();
    });

    it('prevents body scroll', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('renders custom button text', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          confirmText="Yes, Delete"
          cancelText="No, Keep"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
      expect(screen.getByText('No, Keep')).toBeInTheDocument();
    });

    it('renders default button text', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Variant', () => {
    it('shows warning icon for danger variant', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          variant="danger"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Warning')).toBeInTheDocument();
    });

    it('shows question icon for primary variant', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          variant="primary"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Question')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-dialog-backdrop'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when loading and backdrop clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-dialog-backdrop'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('disables buttons when loading', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('confirm-dialog-confirm')).toBeDisabled();
      expect(screen.getByTestId('confirm-dialog-cancel')).toBeDisabled();
    });

    it('shows "Processing..." text when loading', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('does not call onConfirm when loading and confirm button clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      const confirmButton = screen.getByTestId('confirm-dialog-confirm');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Body scroll restoration', () => {
    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});
