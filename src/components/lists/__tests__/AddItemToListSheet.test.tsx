import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddItemToListSheet } from '@/components/lists/AddItemToListSheet';
import * as onboardingStorage from '@/lib/utils/onboardingStorage';

// Mock framer-motion to avoid animation issues in tests
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
  useReducedMotion: () => false,
}));

// Mock onboarding storage
jest.mock('@/lib/utils/onboardingStorage', () => ({
  getPantryItems: jest.fn(),
}));

const mockGetPantryItems = onboardingStorage.getPantryItems as jest.Mock;

describe('AddItemToListSheet', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAdd: jest.fn(),
    existingPantryItemIds: [],
  };

  const mockPantryItems: onboardingStorage.StockItem[] = [
    {
      id: 'pantry-1',
      name: 'Milk',
      category: 'dairy',
      level: 'stocked',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastKnownPrice: 165, // £1.65
      priceUpdatedAt: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'pantry-2',
      name: 'Bread',
      category: 'bakery',
      level: 'low',
      createdAt: '2024-01-01T00:00:00.000Z',
      // No lastKnownPrice
    },
    {
      id: 'pantry-3',
      name: 'Eggs',
      category: 'dairy',
      level: 'out',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastKnownPrice: 350, // £3.50
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPantryItems.mockReturnValue(mockPantryItems);
  });

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByTestId('add-item-to-list-sheet')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<AddItemToListSheet {...defaultProps} isOpen={false} />);

      expect(
        screen.queryByTestId('add-item-to-list-sheet')
      ).not.toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByTestId('item-search-input')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Search or type item name...')
      ).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });
  });

  describe('Search and Suggestions', () => {
    it('shows pantry suggestions when typing', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'mil' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestions-list')).toBeInTheDocument();
        expect(screen.getByText('Milk')).toBeInTheDocument();
      });
    });

    it('filters suggestions by search term', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'bread' } });

      await waitFor(() => {
        expect(screen.getByText('Bread')).toBeInTheDocument();
        expect(screen.queryByText('Milk')).not.toBeInTheDocument();
      });
    });

    it('shows "Add new" option for custom items', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'Bananas' } });

      await waitFor(() => {
        expect(screen.getByText('Bananas')).toBeInTheDocument();
        expect(screen.getByText('Add new')).toBeInTheDocument();
      });
    });

    it('excludes pantry items already in list', async () => {
      render(
        <AddItemToListSheet
          {...defaultProps}
          existingPantryItemIds={['pantry-1']}
        />
      );

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'mi' } });

      await waitFor(() => {
        expect(screen.queryByText('Milk')).not.toBeInTheDocument();
      });
    });
  });

  describe('Selection and Details', () => {
    it('shows details section after selecting a suggestion', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('item-details')).toBeInTheDocument();
        expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
        expect(screen.getByTestId('price-input')).toBeInTheDocument();
      });
    });

    it('shows quantity controls', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('quantity-decrease')).toBeInTheDocument();
        expect(screen.getByTestId('quantity-increase')).toBeInTheDocument();
      });
    });

    it('changes quantity when clicking +/-', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('quantity-input')).toHaveValue(1);
      });

      fireEvent.click(screen.getByTestId('quantity-increase'));
      expect(screen.getByTestId('quantity-input')).toHaveValue(2);

      fireEvent.click(screen.getByTestId('quantity-decrease'));
      expect(screen.getByTestId('quantity-input')).toHaveValue(1);
    });

    it('shows priority buttons', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('priority-need')).toBeInTheDocument();
        expect(screen.getByTestId('priority-want')).toBeInTheDocument();
        expect(screen.getByTestId('priority-impulse')).toBeInTheDocument();
      });
    });
  });

  describe('Adding Items', () => {
    it('calls onAdd with item details when submitting', async () => {
      const handleAdd = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onAdd={handleAdd} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('add-item-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-item-button'));

      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Milk',
          quantity: 1,
          priority: 'need',
          pantryItemId: 'pantry-1',
          category: 'dairy',
        })
      );
    });

    it('calls onAdd with quick add button', async () => {
      const handleAdd = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onAdd={handleAdd} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('quick-add-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quick-add-pantry-1'));

      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Milk',
          quantity: 1,
          priority: 'need',
          pantryItemId: 'pantry-1',
        })
      );
    });

    it('converts price to pence when adding', async () => {
      const handleAdd = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onAdd={handleAdd} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('price-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('price-input'), {
        target: { value: '2.50' },
      });

      fireEvent.click(screen.getByTestId('add-item-button'));

      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedPrice: 250, // pence
        })
      );
    });
  });

  describe('Close Handling', () => {
    it('calls onClose when close button clicked', () => {
      const handleClose = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onClose={handleClose} />);

      fireEvent.click(screen.getByTestId('close-button'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      const handleClose = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onClose={handleClose} />);

      fireEvent.click(screen.getByTestId('sheet-backdrop'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when loading', () => {
      const handleClose = jest.fn();
      render(
        <AddItemToListSheet {...defaultProps} onClose={handleClose} isLoading />
      );

      fireEvent.click(screen.getByTestId('sheet-backdrop'));

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message', () => {
      render(
        <AddItemToListSheet {...defaultProps} error="Something went wrong" />
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables add button when loading', async () => {
      render(<AddItemToListSheet {...defaultProps} isLoading />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('add-item-button')).toBeDisabled();
        expect(screen.getByText('Adding...')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog role', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper aria-modal', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has proper aria-labelledby', () => {
      render(<AddItemToListSheet {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        'add-item-title'
      );
    });
  });

  describe('Last Known Price (Story 4-4)', () => {
    it('displays last known price for pantry items with prices', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('price-pantry-1')).toBeInTheDocument();
        expect(screen.getByTestId('price-pantry-1')).toHaveTextContent('£1.65');
      });
    });

    it('does not display price for items without lastKnownPrice', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'bread' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-2')).toBeInTheDocument();
        expect(screen.queryByTestId('price-pantry-2')).not.toBeInTheDocument();
      });
    });

    it('pre-fills price input when selecting item with lastKnownPrice', async () => {
      render(<AddItemToListSheet {...defaultProps} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('suggestion-pantry-1'));

      await waitFor(() => {
        const priceInput = screen.getByTestId(
          'price-input'
        ) as HTMLInputElement;
        expect(priceInput.value).toBe('1.65');
      });
    });

    it('quick-add uses lastKnownPrice as estimatedPrice', async () => {
      const handleAdd = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onAdd={handleAdd} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'milk' } });

      await waitFor(() => {
        expect(screen.getByTestId('quick-add-pantry-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quick-add-pantry-1'));

      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Milk',
          estimatedPrice: 165, // pence
        })
      );
    });

    it('quick-add passes null for items without lastKnownPrice', async () => {
      const handleAdd = jest.fn();
      render(<AddItemToListSheet {...defaultProps} onAdd={handleAdd} />);

      const input = screen.getByTestId('item-search-input');
      fireEvent.change(input, { target: { value: 'bread' } });

      await waitFor(() => {
        expect(screen.getByTestId('quick-add-pantry-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quick-add-pantry-2'));

      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bread',
          estimatedPrice: null,
        })
      );
    });
  });
});
