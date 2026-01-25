import { render, screen, fireEvent } from '@testing-library/react';
import { PantryItem } from '@/components/stock/PantryItem';
import { type StockItem } from '@/lib/utils/onboardingStorage';

describe('PantryItem', () => {
  const mockItem: StockItem = {
    id: 'milk',
    name: 'Milk',
    category: 'dairy',
    level: 'stocked',
    createdAt: '2026-01-25T00:00:00.000Z',
  };

  describe('Rendering', () => {
    it('renders the item name', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByText('Milk')).toBeInTheDocument();
    });

    it('renders the category emoji', () => {
      render(<PantryItem item={mockItem} />);

      // Dairy emoji should be present
      expect(
        screen.getByRole('img', { name: /category: dairy/i })
      ).toBeInTheDocument();
    });

    it('renders the category name', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByText('dairy')).toBeInTheDocument();
    });

    it('renders the stock level badge', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByText('Stocked')).toBeInTheDocument();
    });

    it('renders stock level progress bar', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has correct test id', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByTestId('pantry-item-milk')).toBeInTheDocument();
    });
  });

  describe('Stock Levels', () => {
    it('renders stocked level correctly', () => {
      const stockedItem = { ...mockItem, level: 'stocked' as const };
      render(<PantryItem item={stockedItem} />);

      expect(screen.getByText('Stocked')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '100'
      );
    });

    it('renders good level correctly', () => {
      const goodItem = { ...mockItem, level: 'good' as const };
      render(<PantryItem item={goodItem} />);

      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '75'
      );
    });

    it('renders low level correctly', () => {
      const lowItem = { ...mockItem, level: 'low' as const };
      render(<PantryItem item={lowItem} />);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '25'
      );
    });

    it('renders out level correctly', () => {
      const outItem = { ...mockItem, level: 'out' as const };
      render(<PantryItem item={outItem} />);

      expect(screen.getByText('Out')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '0'
      );
    });
  });

  describe('Category Icons', () => {
    it('shows dairy emoji for dairy category', () => {
      const dairyItem = { ...mockItem, category: 'dairy' };
      render(<PantryItem item={dairyItem} />);

      expect(screen.getByText('🥛')).toBeInTheDocument();
    });

    it('shows bakery emoji for bakery category', () => {
      const bakeryItem = { ...mockItem, category: 'bakery' };
      render(<PantryItem item={bakeryItem} />);

      expect(screen.getByText('🍞')).toBeInTheDocument();
    });

    it('shows produce emoji for produce category', () => {
      const produceItem = { ...mockItem, category: 'produce' };
      render(<PantryItem item={produceItem} />);

      expect(screen.getByText('🥬')).toBeInTheDocument();
    });

    it('shows default emoji for unknown category', () => {
      const unknownItem = { ...mockItem, category: 'unknown' };
      render(<PantryItem item={unknownItem} />);

      expect(screen.getByText('📦')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<PantryItem item={mockItem} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('pantry-item-milk'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when not provided', () => {
      render(<PantryItem item={mockItem} />);

      // Should not throw
      fireEvent.click(screen.getByTestId('pantry-item-milk'));
    });
  });

  describe('Accessibility', () => {
    it('has accessible button role', () => {
      render(<PantryItem item={mockItem} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has aria-label with item name and level', () => {
      render(<PantryItem item={mockItem} />);

      expect(
        screen.getByRole('button', { name: /milk, stocked/i })
      ).toBeInTheDocument();
    });

    it('progress bar has accessible labels', () => {
      render(<PantryItem item={mockItem} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar.getAttribute('aria-label')).toMatch(/stock level/i);
    });

    it('category image has aria-label', () => {
      render(<PantryItem item={mockItem} />);

      expect(
        screen.getByRole('img', { name: /category/i })
      ).toBeInTheDocument();
    });
  });
});
