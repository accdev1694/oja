import { render, screen, fireEvent } from '@testing-library/react';
import { ShoppingListCard } from '@/components/lists/ShoppingListCard';
import type {
  ShoppingList,
  ShoppingListItem,
} from '@/lib/utils/shoppingListStorage';

// Mock the storage module
const mockGetItemsForList = jest.fn();

jest.mock('@/lib/utils/shoppingListStorage', () => ({
  getItemsForList: (...args: unknown[]) => mockGetItemsForList(...args),
}));

describe('ShoppingListCard', () => {
  const mockList: ShoppingList = {
    id: 'list-123',
    name: 'Weekly Shop',
    status: 'active',
    budget: 5000,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const mockItems: ShoppingListItem[] = [
    {
      id: 'item-1',
      listId: 'list-123',
      name: 'Milk',
      quantity: 1,
      unit: null,
      estimatedPrice: 150,
      actualPrice: null,
      isChecked: false,
      priority: 'need',
      isAutoAdded: true,
      pantryItemId: 'pantry-1',
      category: 'dairy',
      addedAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      listId: 'list-123',
      name: 'Bread',
      quantity: 1,
      unit: null,
      estimatedPrice: 120,
      actualPrice: null,
      isChecked: false,
      priority: 'need',
      isAutoAdded: false,
      pantryItemId: null,
      category: 'bakery',
      addedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemsForList.mockReturnValue(mockItems);
  });

  describe('Basic Rendering', () => {
    it('renders list name', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('Weekly Shop')).toBeInTheDocument();
    });

    it('renders item count', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('renders singular item text when only 1 item', () => {
      mockGetItemsForList.mockReturnValue([mockItems[0]]);
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('renders budget when set', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('£50.00')).toBeInTheDocument();
    });

    it('does not render budget section when budget is null', () => {
      const listWithoutBudget = { ...mockList, budget: null };
      render(<ShoppingListCard list={listWithoutBudget} />);

      expect(screen.queryByText('Budget')).not.toBeInTheDocument();
    });

    it('renders test id', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(
        screen.getByTestId('shopping-list-card-list-123')
      ).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('renders active status badge', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders shopping status badge', () => {
      const shoppingList = { ...mockList, status: 'shopping' as const };
      render(<ShoppingListCard list={shoppingList} />);

      expect(screen.getByText('Shopping')).toBeInTheDocument();
    });

    it('renders completed status badge', () => {
      const completedList = { ...mockList, status: 'completed' as const };
      render(<ShoppingListCard list={completedList} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders archived status badge', () => {
      const archivedList = { ...mockList, status: 'archived' as const };
      render(<ShoppingListCard list={archivedList} />);

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('Auto-Added Items Badge', () => {
    it('shows auto-added count for active lists', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('1 auto-added from pantry')).toBeInTheDocument();
    });

    it('does not show auto-added badge when no auto-added items', () => {
      mockGetItemsForList.mockReturnValue([
        { ...mockItems[0], isAutoAdded: false },
        { ...mockItems[1], isAutoAdded: false },
      ]);
      render(<ShoppingListCard list={mockList} />);

      expect(screen.queryByText(/auto-added/)).not.toBeInTheDocument();
    });

    it('does not show auto-added badge for completed lists', () => {
      const completedList = { ...mockList, status: 'completed' as const };
      render(<ShoppingListCard list={completedList} />);

      expect(
        screen.queryByText(/auto-added from pantry/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows checked progress for shopping status', () => {
      const shoppingList = { ...mockList, status: 'shopping' as const };
      mockGetItemsForList.mockReturnValue([
        { ...mockItems[0], isChecked: true },
        { ...mockItems[1], isChecked: false },
      ]);
      render(<ShoppingListCard list={shoppingList} />);

      expect(screen.getByText('1/2 checked')).toBeInTheDocument();
    });

    it('shows checked progress for completed status', () => {
      const completedList = { ...mockList, status: 'completed' as const };
      mockGetItemsForList.mockReturnValue([
        { ...mockItems[0], isChecked: true },
        { ...mockItems[1], isChecked: true },
      ]);
      render(<ShoppingListCard list={completedList} />);

      expect(screen.getByText('2/2 checked')).toBeInTheDocument();
    });

    it('does not show progress for active lists', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.queryByText(/checked/)).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('shows Today for today date', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('shows Yesterday for yesterday date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayList = { ...mockList, createdAt: yesterday.toISOString() };
      render(<ShoppingListCard list={yesterdayList} />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('shows formatted date for older dates', () => {
      const oldDate = new Date('2024-01-15');
      const oldList = { ...mockList, createdAt: oldDate.toISOString() };
      render(<ShoppingListCard list={oldList} />);

      expect(screen.getByText('15 Jan')).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<ShoppingListCard list={mockList} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('shopping-list-card-list-123'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not error when onClick not provided', () => {
      render(<ShoppingListCard list={mockList} />);

      expect(() => {
        fireEvent.click(screen.getByTestId('shopping-list-card-list-123'));
      }).not.toThrow();
    });
  });

  describe('Empty List', () => {
    it('shows 0 items for empty list', () => {
      mockGetItemsForList.mockReturnValue([]);
      render(<ShoppingListCard list={mockList} />);

      expect(screen.getByText('0 items')).toBeInTheDocument();
    });
  });
});
