import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';

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

describe('DeleteAccountDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('When closed', () => {
    it('does not render when isOpen is false', () => {
      render(
        <DeleteAccountDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(
        screen.queryByTestId('delete-account-dialog')
      ).not.toBeInTheDocument();
    });
  });

  describe('When open', () => {
    it('renders the dialog', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('delete-account-dialog')).toBeInTheDocument();
    });

    it('displays the warning title', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    it('displays consequences list', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(
        screen.getByText('Remove all your pantry items')
      ).toBeInTheDocument();
      expect(screen.getByText('Delete all shopping lists')).toBeInTheDocument();
      expect(
        screen.getByText('Erase your budget and preferences')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Cancel any active subscription')
      ).toBeInTheDocument();
    });

    it('displays confirmation input', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('confirm-delete-input')).toBeInTheDocument();
    });

    it('displays cancel and delete buttons', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('cancel-delete-button')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
    });
  });

  describe('Confirmation flow', () => {
    it('delete button is disabled initially', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('delete button remains disabled with partial input', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const input = screen.getByTestId('confirm-delete-input');
      fireEvent.change(input, { target: { value: 'DEL' } });

      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('delete button remains disabled with wrong case', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const input = screen.getByTestId('confirm-delete-input');
      fireEvent.change(input, { target: { value: 'delete' } });

      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('delete button is enabled when DELETE is typed', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const input = screen.getByTestId('confirm-delete-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      expect(screen.getByTestId('confirm-delete-button')).not.toBeDisabled();
    });

    it('calls onConfirm when delete button is clicked', async () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const input = screen.getByTestId('confirm-delete-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onConfirm on form submit', async () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const input = screen.getByTestId('confirm-delete-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cancel action', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-delete-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('shows loading text when isLoading', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('disables input when loading', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('confirm-delete-input')).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('cancel-delete-button')).toBeDisabled();
    });

    it('does not call onClose when backdrop clicked during loading', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isLoading={true}
        />
      );

      fireEvent.click(screen.getByTestId('dialog-backdrop'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Error state', () => {
    it('displays error message', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          error="Something went wrong"
        />
      );

      expect(screen.getByTestId('delete-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not show error when null', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          error={null}
        />
      );

      expect(screen.queryByTestId('delete-error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog role', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBe('delete-dialog-title');
      expect(document.getElementById(titleId!)).toHaveTextContent(
        'Delete Your Account?'
      );
    });

    it('warning icon has aria-label', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByLabelText('Warning')).toBeInTheDocument();
    });

    it('error message has alert role', () => {
      render(
        <DeleteAccountDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          error="Error message"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
