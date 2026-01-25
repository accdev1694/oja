import { render, screen, fireEvent } from '@testing-library/react';

// We test the check-off functionality through the list detail page behavior
// Since ListItemRow is defined in the page, we test the patterns here

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: 'test-list-id' }),
}));

// Mock haptics
const mockHapticLight = jest.fn();
jest.mock('@/lib/utils/haptics', () => ({
  hapticLight: () => mockHapticLight(),
}));

// Mock storage functions
const mockUpdateShoppingListItem = jest.fn();
const mockGetShoppingList = jest.fn();
const mockGetItemsForList = jest.fn();
const mockAddShoppingListItem = jest.fn();
const mockRemoveShoppingListItem = jest.fn();

jest.mock('@/lib/utils/shoppingListStorage', () => ({
  getShoppingList: () => mockGetShoppingList(),
  getItemsForList: () => mockGetItemsForList(),
  addShoppingListItem: (listId: string, item: Record<string, unknown>) =>
    mockAddShoppingListItem(listId, item),
  removeShoppingListItem: (id: string) => mockRemoveShoppingListItem(id),
  updateShoppingListItem: (id: string, updates: Record<string, unknown>) =>
    mockUpdateShoppingListItem(id, updates),
}));

// Import the page component after mocks
import ListDetailPage from '@/app/(app)/lists/[id]/page';

describe('List Item Check-Off Functionality', () => {
  const mockList = {
    id: 'test-list-id',
    name: 'Weekly Shopping',
    status: 'active' as const,
    budget: 5000, // £50.00
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const mockItems = [
    {
      id: 'item-1',
      listId: 'test-list-id',
      name: 'Milk',
      quantity: 1,
      unit: null,
      estimatedPrice: 150, // £1.50
      actualPrice: null,
      isChecked: false,
      priority: 'need' as const,
      isAutoAdded: false,
      pantryItemId: null,
      category: 'dairy',
      addedAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      listId: 'test-list-id',
      name: 'Bread',
      quantity: 1,
      unit: null,
      estimatedPrice: 200, // £2.00
      actualPrice: null,
      isChecked: true, // Already checked
      priority: 'need' as const,
      isAutoAdded: false,
      pantryItemId: null,
      category: 'bakery',
      addedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetShoppingList.mockReturnValue(mockList);
    mockGetItemsForList.mockReturnValue(mockItems);
  });

  describe('Checkbox Rendering', () => {
    it('renders checkbox for each item', () => {
      render(<ListDetailPage />);

      expect(screen.getByTestId('checkbox-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-item-2')).toBeInTheDocument();
    });

    it('unchecked item has empty checkbox', () => {
      render(<ListDetailPage />);

      const uncheckedCheckbox = screen.getByTestId('checkbox-item-1');
      expect(uncheckedCheckbox).not.toHaveClass('bg-[var(--color-success)]');
    });

    it('checked item has filled checkbox', () => {
      render(<ListDetailPage />);

      const checkedCheckbox = screen.getByTestId('checkbox-item-2');
      expect(checkedCheckbox).toHaveClass('bg-[var(--color-success)]');
    });

    it('checkbox has correct aria-label for unchecked item', () => {
      render(<ListDetailPage />);

      const checkbox = screen.getByTestId('checkbox-item-1');
      expect(checkbox).toHaveAttribute('aria-label', 'Check off Milk');
    });

    it('checkbox has correct aria-label for checked item', () => {
      render(<ListDetailPage />);

      const checkbox = screen.getByTestId('checkbox-item-2');
      expect(checkbox).toHaveAttribute('aria-label', 'Uncheck Bread');
    });
  });

  describe('Toggle Check State', () => {
    it('clicking checkbox calls updateShoppingListItem', () => {
      render(<ListDetailPage />);

      const checkbox = screen.getByTestId('checkbox-item-1');
      fireEvent.click(checkbox);

      expect(mockUpdateShoppingListItem).toHaveBeenCalledWith('item-1', {
        isChecked: true,
      });
    });

    it('clicking checked item calls updateShoppingListItem with isChecked: false', () => {
      render(<ListDetailPage />);

      const checkbox = screen.getByTestId('checkbox-item-2');
      fireEvent.click(checkbox);

      expect(mockUpdateShoppingListItem).toHaveBeenCalledWith('item-2', {
        isChecked: false,
      });
    });

    it('triggers haptic feedback on check toggle', () => {
      render(<ListDetailPage />);

      const checkbox = screen.getByTestId('checkbox-item-1');
      fireEvent.click(checkbox);

      expect(mockHapticLight).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('unchecked item has full opacity', () => {
      render(<ListDetailPage />);

      const listItem = screen.getByTestId('list-item-item-1');
      expect(listItem).not.toHaveClass('opacity-60');
    });

    it('checked item has reduced opacity', () => {
      render(<ListDetailPage />);

      const listItem = screen.getByTestId('list-item-item-2');
      expect(listItem).toHaveClass('opacity-60');
    });

    it('checked item name has strikethrough', () => {
      render(<ListDetailPage />);

      // The name element inside the checked item should have line-through
      const breadItem = screen.getByTestId('list-item-item-2');
      const nameElement = breadItem.querySelector('p.font-medium');
      expect(nameElement).toHaveClass('line-through');
    });

    it('unchecked item name has no strikethrough', () => {
      render(<ListDetailPage />);

      const milkItem = screen.getByTestId('list-item-item-1');
      const nameElement = milkItem.querySelector('p.font-medium');
      expect(nameElement).not.toHaveClass('line-through');
    });
  });

  describe('Item Sorting', () => {
    it('checked items appear after unchecked items', () => {
      render(<ListDetailPage />);

      const items = screen.getAllByTestId(/^list-item-item-/);
      // Milk (unchecked) should come before Bread (checked)
      expect(items[0]).toHaveAttribute('data-testid', 'list-item-item-1');
      expect(items[1]).toHaveAttribute('data-testid', 'list-item-item-2');
    });
  });

  describe('Running Total', () => {
    it('displays running total including checked items', () => {
      render(<ListDetailPage />);

      // Running total should be £1.50 + £2.00 = £3.50
      expect(screen.getByText('£3.50')).toBeInTheDocument();
    });
  });
});
