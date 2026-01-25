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

  describe('Filtering', () => {
    const allStatusLists: ShoppingList[] = [
      {
        id: 'active-1',
        name: 'Active List 1',
        status: 'active',
        budget: 5000,
        createdAt: '2024-01-15T10:00:00.000Z',
        completedAt: null,
      },
      {
        id: 'shopping-1',
        name: 'Shopping List 1',
        status: 'shopping',
        budget: 3000,
        createdAt: '2024-01-14T10:00:00.000Z',
        completedAt: null,
      },
      {
        id: 'completed-1',
        name: 'Completed List 1',
        status: 'completed',
        budget: 4000,
        createdAt: '2024-01-13T10:00:00.000Z',
        completedAt: '2024-01-13T18:00:00.000Z',
      },
      {
        id: 'archived-1',
        name: 'Archived List 1',
        status: 'archived',
        budget: null,
        createdAt: '2024-01-12T10:00:00.000Z',
        completedAt: '2024-01-12T18:00:00.000Z',
      },
    ];

    it('shows only active and shopping lists when filter is active', () => {
      render(<ShoppingListGrid lists={allStatusLists} filter="active" />);

      expect(
        screen.getByTestId('shopping-list-card-active-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-shopping-1')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('shopping-list-card-completed-1')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('shopping-list-card-archived-1')
      ).not.toBeInTheDocument();
    });

    it('shows only completed and archived lists when filter is completed', () => {
      render(<ShoppingListGrid lists={allStatusLists} filter="completed" />);

      expect(
        screen.queryByTestId('shopping-list-card-active-1')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('shopping-list-card-shopping-1')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-completed-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-archived-1')
      ).toBeInTheDocument();
    });

    it('shows all lists when filter is all', () => {
      render(<ShoppingListGrid lists={allStatusLists} filter="all" />);

      expect(
        screen.getByTestId('shopping-list-card-active-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-shopping-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-completed-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-archived-1')
      ).toBeInTheDocument();
    });

    it('shows all lists when filter is undefined', () => {
      render(<ShoppingListGrid lists={allStatusLists} />);

      expect(
        screen.getByTestId('shopping-list-card-active-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-shopping-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-completed-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('shopping-list-card-archived-1')
      ).toBeInTheDocument();
    });

    it('shows empty state for active filter when no active lists', () => {
      const completedOnlyLists = allStatusLists.filter(
        (list) => list.status === 'completed' || list.status === 'archived'
      );

      render(
        <ShoppingListGrid
          lists={completedOnlyLists}
          filter="active"
          onNewList={jest.fn()}
        />
      );

      expect(
        screen.getByTestId('lists-empty-state-active')
      ).toBeInTheDocument();
      expect(screen.getByText('No active lists')).toBeInTheDocument();
    });

    it('shows empty state for completed filter when no completed lists', () => {
      const activeOnlyLists = allStatusLists.filter(
        (list) => list.status === 'active' || list.status === 'shopping'
      );

      render(<ShoppingListGrid lists={activeOnlyLists} filter="completed" />);

      expect(
        screen.getByTestId('lists-empty-state-completed')
      ).toBeInTheDocument();
      expect(screen.getByText('No completed trips yet')).toBeInTheDocument();
    });

    it('renders New List button in active empty state', () => {
      render(
        <ShoppingListGrid lists={[]} filter="active" onNewList={jest.fn()} />
      );

      expect(screen.getByTestId('new-list-button')).toBeInTheDocument();
    });

    it('does not render New List button in completed empty state', () => {
      render(<ShoppingListGrid lists={[]} filter="completed" />);

      expect(screen.queryByTestId('new-list-button')).not.toBeInTheDocument();
    });

    it('sets correct role and id on grid panel', () => {
      render(<ShoppingListGrid lists={allStatusLists} filter="active" />);

      const grid = screen.getByTestId('shopping-list-grid');
      expect(grid).toHaveAttribute('role', 'tabpanel');
      expect(grid).toHaveAttribute('id', 'list-panel-active');
    });
  });
});
