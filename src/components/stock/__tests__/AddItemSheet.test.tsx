import { render, screen, fireEvent } from '@testing-library/react';
import { AddItemSheet } from '@/components/stock/AddItemSheet';

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

describe('AddItemSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('When closed', () => {
    it('does not render when isOpen is false', () => {
      render(
        <AddItemSheet isOpen={false} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.queryByTestId('add-item-sheet')).not.toBeInTheDocument();
    });
  });

  describe('When open', () => {
    it('renders the sheet', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByTestId('add-item-sheet')).toBeInTheDocument();
    });

    it('renders the backdrop', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByTestId('sheet-backdrop')).toBeInTheDocument();
    });

    it('displays the title', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(
        screen.getByRole('heading', { name: 'Add Item' })
      ).toBeInTheDocument();
    });

    it('renders the close button', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });

    it('renders the form', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByTestId('item-name-input')).toBeInTheDocument();
    });

    it('prevents body scroll', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Close actions', () => {
    it('calls onClose when close button clicked', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      fireEvent.click(screen.getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      fireEvent.click(screen.getByTestId('sheet-backdrop'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button clicked', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('does not close when backdrop clicked during loading', () => {
      render(
        <AddItemSheet
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          isLoading
        />
      );

      fireEvent.click(screen.getByTestId('sheet-backdrop'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not close when close button clicked during loading', () => {
      render(
        <AddItemSheet
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          isLoading
        />
      );

      // Close button should be disabled, but let's check onClose isn't called
      fireEvent.click(screen.getByTestId('close-button'));

      // The button is disabled, so it shouldn't close
      expect(screen.getByTestId('close-button')).toBeDisabled();
    });

    it('passes loading state to form', () => {
      render(
        <AddItemSheet
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          isLoading
        />
      );

      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('passes error to form', () => {
      render(
        <AddItemSheet
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          error="Test error"
        />
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('calls onAdd when form is submitted', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Test Item' },
      });
      fireEvent.click(screen.getByTestId('add-button'));

      expect(mockOnAdd).toHaveBeenCalledWith({
        name: 'Test Item',
        category: 'pantry',
        level: 'stocked',
      });
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'add-item-title');
    });

    it('close button has aria-label', () => {
      render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('Body scroll restoration', () => {
    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <AddItemSheet isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <AddItemSheet isOpen={false} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});
