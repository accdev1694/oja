import { render, screen, fireEvent } from '@testing-library/react';
import { PantryGrid } from '@/components/stock/PantryGrid';
import { type StockItem } from '@/lib/utils/onboardingStorage';

describe('PantryGrid', () => {
  const mockItems: StockItem[] = [
    {
      id: 'milk',
      name: 'Milk',
      category: 'dairy',
      level: 'stocked',
      createdAt: '2026-01-25T00:00:00.000Z',
    },
    {
      id: 'bread',
      name: 'Bread',
      category: 'bakery',
      level: 'good',
      createdAt: '2026-01-25T00:00:00.000Z',
    },
    {
      id: 'eggs',
      name: 'Eggs',
      category: 'eggs',
      level: 'low',
      createdAt: '2026-01-25T00:00:00.000Z',
    },
    {
      id: 'butter',
      name: 'Butter',
      category: 'dairy',
      level: 'out',
      createdAt: '2026-01-25T00:00:00.000Z',
    },
  ];

  describe('Empty State', () => {
    it('renders empty state when no items', () => {
      render(<PantryGrid items={[]} />);

      expect(screen.getByTestId('pantry-empty-state')).toBeInTheDocument();
    });

    it('shows empty pantry message', () => {
      render(<PantryGrid items={[]} />);

      expect(screen.getByText('Your pantry is empty')).toBeInTheDocument();
    });

    it('shows helpful description', () => {
      render(<PantryGrid items={[]} />);

      expect(
        screen.getByText(/start tracking your household inventory/i)
      ).toBeInTheDocument();
    });

    it('renders Add Item button', () => {
      render(<PantryGrid items={[]} />);

      expect(screen.getByTestId('add-item-button')).toBeInTheDocument();
    });

    it('Add Item button is disabled when onAddItem not provided', () => {
      render(<PantryGrid items={[]} />);

      expect(screen.getByTestId('add-item-button')).toBeDisabled();
    });

    it('calls onAddItem when Add Item button clicked', () => {
      const handleAddItem = jest.fn();
      render(<PantryGrid items={[]} onAddItem={handleAddItem} />);

      fireEvent.click(screen.getByTestId('add-item-button'));

      expect(handleAddItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flat View (No Grouping)', () => {
    it('renders all items', () => {
      render(<PantryGrid items={mockItems} />);

      expect(screen.getByTestId('pantry-item-milk')).toBeInTheDocument();
      expect(screen.getByTestId('pantry-item-bread')).toBeInTheDocument();
      expect(screen.getByTestId('pantry-item-eggs')).toBeInTheDocument();
      expect(screen.getByTestId('pantry-item-butter')).toBeInTheDocument();
    });

    it('renders grid container', () => {
      render(<PantryGrid items={mockItems} />);

      expect(screen.getByTestId('pantry-grid')).toBeInTheDocument();
    });

    it('sorts items by urgency (out first, stocked last)', () => {
      render(<PantryGrid items={mockItems} />);

      const grid = screen.getByTestId('pantry-grid');
      // Select item wrappers (containers) rather than buttons to get proper order
      const items = grid.querySelectorAll(
        '[data-testid^="pantry-item-wrapper-"]'
      );

      // Out items should come first
      expect(items[0]).toHaveAttribute(
        'data-testid',
        'pantry-item-wrapper-butter'
      );
      // Then low
      expect(items[1]).toHaveAttribute(
        'data-testid',
        'pantry-item-wrapper-eggs'
      );
      // Then good
      expect(items[2]).toHaveAttribute(
        'data-testid',
        'pantry-item-wrapper-bread'
      );
      // Stocked last
      expect(items[3]).toHaveAttribute(
        'data-testid',
        'pantry-item-wrapper-milk'
      );
    });
  });

  describe('Grouped View', () => {
    it('renders grouped container when groupByCategory is true', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      expect(screen.getByTestId('pantry-grid-grouped')).toBeInTheDocument();
    });

    it('renders category headers', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      expect(screen.getByTestId('category-header-dairy')).toBeInTheDocument();
      expect(screen.getByTestId('category-header-bakery')).toBeInTheDocument();
      expect(screen.getByTestId('category-header-eggs')).toBeInTheDocument();
    });

    it('does not render headers for empty categories', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      // Produce has no items
      expect(
        screen.queryByTestId('category-header-produce')
      ).not.toBeInTheDocument();
    });

    it('groups items by category', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      // Dairy section should have Milk and Butter
      const dairyHeader = screen.getByTestId('category-header-dairy');
      expect(dairyHeader.parentElement).toContainElement(
        screen.getByTestId('pantry-item-milk')
      );
      expect(dairyHeader.parentElement).toContainElement(
        screen.getByTestId('pantry-item-butter')
      );
    });
  });

  describe('Item Interactions', () => {
    it('calls onItemClick with item when item is clicked', () => {
      const handleItemClick = jest.fn();
      render(<PantryGrid items={mockItems} onItemClick={handleItemClick} />);

      fireEvent.click(screen.getByTestId('pantry-item-milk'));

      expect(handleItemClick).toHaveBeenCalledTimes(1);
      expect(handleItemClick).toHaveBeenCalledWith(mockItems[0]);
    });

    it('does not throw when onItemClick not provided', () => {
      render(<PantryGrid items={mockItems} />);

      // Should not throw
      fireEvent.click(screen.getByTestId('pantry-item-milk'));
    });
  });

  describe('Single Item', () => {
    it('renders correctly with single item', () => {
      render(<PantryGrid items={[mockItems[0]]} />);

      expect(screen.getByTestId('pantry-item-milk')).toBeInTheDocument();
      expect(screen.getByTestId('pantry-grid')).toBeInTheDocument();
    });
  });

  describe('Grid Responsiveness', () => {
    it('has responsive grid classes', () => {
      render(<PantryGrid items={mockItems} />);

      const grid = screen.getByTestId('pantry-grid');
      expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-3');
    });
  });

  describe('Category Headers Content', () => {
    it('displays category emoji in header', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      // Check dairy header has emoji
      const dairyHeader = screen.getByTestId('category-header-dairy');
      expect(dairyHeader).toHaveTextContent('🥛');
    });

    it('displays category name in header', () => {
      render(<PantryGrid items={mockItems} groupByCategory />);

      const dairyHeader = screen.getByTestId('category-header-dairy');
      expect(dairyHeader).toHaveTextContent('Dairy');
    });
  });
});
