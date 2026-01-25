import { render, screen, fireEvent } from '@testing-library/react';
import { ShoppingListGrid } from '@/components/lists/ShoppingListGrid';
import type { ShoppingList } from '@/lib/utils/shoppingListStorage';

// Mock the storage module
const mockGetItemsForList = jest.fn(() => []);

jest.mock('@/lib/utils/shoppingListStorage', () => ({
  getItemsForList: (...args: unknown[]) => mockGetItemsForList(...args),
}));

describe('ShoppingListGrid', () => {
  const mockLists: ShoppingList[] = [
    {
      id: 'list-1',
      name: 'Weekly Shop',
      status: 'active',
      budget: 5000,
      createdAt: '2024-01-15T10:00:00.000Z',
      completedAt: null,
    },
    {
      id: 'list-2',
      name: 'Completed Shop',
      status: 'completed',
      budget: 3000,
      createdAt: '2024-01-14T10:00:00.000Z',
      completedAt: '2024-01-14T18:00:00.000Z',
    },
    {
      id: 'list-3',
      name: 'Shopping Now',
      status: 'shopping',
      budget: null,
      createdAt: '2024-01-16T08:00:00.000Z',
      completedAt: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no lists', () => {
      render(<ShoppingListGrid lists={[]} />);

      expect(screen.getByTestId('lists-empty-state')).toBeInTheDocument();
    });

    it('shows empty state message', () => {
      render(<ShoppingListGrid lists={[]} />);

      expect(screen.getByText('No shopping lists yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Create your first shopping list/)
      ).toBeInTheDocument();
    });

    it('renders New List button in empty state', () => {
      render(<ShoppingListGrid lists={[]} />);

      expect(screen.getByTestId('new-list-button')).toBeInTheDocument();
    });

    it('calls onNewList when New List button clicked', () => {
      const handleNewList = jest.fn();
      render(<ShoppingListGrid lists={[]} onNewList={handleNewList} />);

      fireEvent.click(screen.getByTestId('new-list-button'));

      expect(handleNewList).toHaveBeenCalledTimes(1);
    });

    it('disables New List button when onNewList not provided', () => {
      render(<ShoppingListGrid lists={[]} />);

      expect(screen.getByTestId('new-list-button')).toBeDisabled();
    });
  });

  describe('Grid Rendering', () => {
    it('renders grid when lists exist', () => {
      render(<ShoppingListGrid lists={mockLists} />);

      expect(screen.getByTestId('shopping-list-grid')).toBeInTheDocument();
    });

    it('renders all lists', () => {
      render(<ShoppingListGrid lists={mockLists} />);

      expect(
        screen.getByTestId('shopping-list-card-list-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-list-2')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-list-3')
      ).toBeInTheDocument();
    });

    it('does not show empty state when lists exist', () => {
      render(<ShoppingListGrid lists={mockLists} />);

      expect(screen.queryByTestId('lists-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts active lists first', () => {
      render(<ShoppingListGrid lists={mockLists} />);

      const grid = screen.getByTestId('shopping-list-grid');
      const cards = grid.querySelectorAll(
        '[data-testid^="shopping-list-card-"]'
      );

      // Active and shopping should come before completed
      // Order: active (list-1), shopping (list-3), completed (list-2)
      expect(cards[0].getAttribute('data-testid')).toBe(
        'shopping-list-card-list-1'
      );
      expect(cards[1].getAttribute('data-testid')).toBe(
        'shopping-list-card-list-3'
      );
      expect(cards[2].getAttribute('data-testid')).toBe(
        'shopping-list-card-list-2'
      );
    });

    it('sorts by date within same status', () => {
      const sameStatusLists: ShoppingList[] = [
        {
          id: 'list-old',
          name: 'Old Active',
          status: 'active',
          budget: null,
          createdAt: '2024-01-01T10:00:00.000Z',
          completedAt: null,
        },
        {
          id: 'list-new',
          name: 'New Active',
          status: 'active',
          budget: null,
          createdAt: '2024-01-15T10:00:00.000Z',
          completedAt: null,
        },
      ];

      render(<ShoppingListGrid lists={sameStatusLists} />);

      const grid = screen.getByTestId('shopping-list-grid');
      const cards = grid.querySelectorAll(
        '[data-testid^="shopping-list-card-"]'
      );

      // Newer should come first
      expect(cards[0].getAttribute('data-testid')).toBe(
        'shopping-list-card-list-new'
      );
      expect(cards[1].getAttribute('data-testid')).toBe(
        'shopping-list-card-list-old'
      );
    });
  });

  describe('Click Handling', () => {
    it('calls onListClick with the clicked list', () => {
      const handleListClick = jest.fn();
      render(
        <ShoppingListGrid lists={mockLists} onListClick={handleListClick} />
      );

      fireEvent.click(screen.getByTestId('shopping-list-card-list-1'));

      expect(handleListClick).toHaveBeenCalledTimes(1);
      expect(handleListClick).toHaveBeenCalledWith(mockLists[0]);
    });

    it('does not error when onListClick not provided', () => {
      render(<ShoppingListGrid lists={mockLists} />);

      expect(() => {
        fireEvent.click(screen.getByTestId('shopping-list-card-list-1'));
      }).not.toThrow();
    });
  });

  describe('Single List', () => {
    it('renders correctly with single list', () => {
      render(<ShoppingListGrid lists={[mockLists[0]]} />);

      expect(screen.getByTestId('shopping-list-grid')).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-list-1')
      ).toBeInTheDocument();
    });
  });

  describe('All Status Types', () => {
    it('handles all status types correctly', () => {
      const allStatusLists: ShoppingList[] = [
        { ...mockLists[0], status: 'active', id: 'active' },
        { ...mockLists[0], status: 'shopping', id: 'shopping' },
        { ...mockLists[0], status: 'completed', id: 'completed' },
        { ...mockLists[0], status: 'archived', id: 'archived' },
      ];

      render(<ShoppingListGrid lists={allStatusLists} />);

      expect(
        screen.getByTestId('shopping-list-card-active')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-shopping')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-completed')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-archived')
      ).toBeInTheDocument();
    });
  });
});
