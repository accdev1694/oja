import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddItemForm } from '@/components/stock/AddItemForm';

describe('AddItemForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders item name input', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('item-name-input')).toBeInTheDocument();
    });

    it('renders category selection buttons', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('category-dairy')).toBeInTheDocument();
      expect(screen.getByTestId('category-bakery')).toBeInTheDocument();
      expect(screen.getByTestId('category-pantry')).toBeInTheDocument();
    });

    it('renders stock level selection buttons', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('level-stocked')).toBeInTheDocument();
      expect(screen.getByTestId('level-good')).toBeInTheDocument();
      expect(screen.getByTestId('level-low')).toBeInTheDocument();
      expect(screen.getByTestId('level-out')).toBeInTheDocument();
    });

    it('renders cancel and add buttons', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-button')).toBeInTheDocument();
    });

    it('focuses name input on mount', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('item-name-input')).toHaveFocus();
    });
  });

  describe('Default Values', () => {
    it('defaults to pantry category', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('category-pantry')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('defaults to stocked level', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('level-stocked')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
  });

  describe('Validation', () => {
    it('add button is disabled when name is empty', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('add-button')).toBeDisabled();
    });

    it('add button is enabled when name has text', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Test Item' },
      });

      expect(screen.getByTestId('add-button')).not.toBeDisabled();
    });

    it('add button is disabled with only whitespace', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: '   ' },
      });

      expect(screen.getByTestId('add-button')).toBeDisabled();
    });
  });

  describe('Category Selection', () => {
    it('updates category when clicking different option', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByTestId('category-dairy'));

      expect(screen.getByTestId('category-dairy')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('category-pantry')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('submits with selected category', async () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Milk' },
      });
      fireEvent.click(screen.getByTestId('category-dairy'));
      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'dairy' })
        );
      });
    });
  });

  describe('Stock Level Selection', () => {
    it('updates stock level when clicking different option', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByTestId('level-low'));

      expect(screen.getByTestId('level-low')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('level-stocked')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('submits with selected stock level', async () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByTestId('level-out'));
      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ level: 'out' })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form data', async () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Olive Oil' },
      });
      fireEvent.click(screen.getByTestId('category-pantry'));
      fireEvent.click(screen.getByTestId('level-stocked'));
      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Olive Oil',
          category: 'pantry',
          level: 'stocked',
        });
      });
    });

    it('trims whitespace from name', async () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: '  Olive Oil  ' },
      });
      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Olive Oil' })
        );
      });
    });

    it('submits on form submit (Enter key)', async () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Test' },
      });
      fireEvent.submit(screen.getByTestId('item-name-input').closest('form')!);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel', () => {
    it('calls onCancel when cancel button clicked', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('disables input when loading', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading
        />
      );

      expect(screen.getByTestId('item-name-input')).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeDisabled();
    });

    it('shows loading text on add button', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading
        />
      );

      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });

    it('does not submit when loading', async () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading
        />
      );

      fireEvent.change(screen.getByTestId('item-name-input'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Item already exists"
        />
      );

      expect(screen.getByTestId('add-item-error')).toBeInTheDocument();
      expect(screen.getByText('Item already exists')).toBeInTheDocument();
    });

    it('does not show error when null', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error={null}
        />
      );

      expect(screen.queryByTestId('add-item-error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for inputs', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
    });

    it('category buttons have radiogroup role', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(
        screen.getByRole('radiogroup', { name: /select category/i })
      ).toBeInTheDocument();
    });

    it('stock level buttons have radiogroup role', () => {
      render(<AddItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(
        screen.getByRole('radiogroup', { name: /select stock level/i })
      ).toBeInTheDocument();
    });

    it('error has alert role', () => {
      render(
        <AddItemForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Error"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
