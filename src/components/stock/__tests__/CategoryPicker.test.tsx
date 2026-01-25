import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryPicker } from '@/components/stock/CategoryPicker';
import { PRODUCT_CATEGORIES } from '@/lib/data/seeded-products';

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

// Mock haptics
jest.mock('@/lib/utils/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticMedium: jest.fn(),
}));

describe('CategoryPicker', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('When closed', () => {
    it('does not render when isOpen is false', () => {
      render(
        <CategoryPicker
          isOpen={false}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('category-picker')).not.toBeInTheDocument();
    });
  });

  describe('When open', () => {
    it('renders the picker', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('category-picker')).toBeInTheDocument();
    });

    it('renders all category options', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      // Check that all categories are rendered
      PRODUCT_CATEGORIES.forEach((category) => {
        expect(
          screen.getByTestId(`picker-category-${category.id}`)
        ).toBeInTheDocument();
      });
    });

    it('renders the correct number of categories', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      const categoryButtons = screen.getAllByRole('radio');
      expect(categoryButtons).toHaveLength(PRODUCT_CATEGORIES.length);
    });

    it('renders the backdrop', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByTestId('category-picker-backdrop')
      ).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('category-picker-close')).toBeInTheDocument();
    });

    it('prevents body scroll', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('displays item name in title when provided', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          itemName="Milk"
        />
      );

      expect(screen.getByText('Category for Milk')).toBeInTheDocument();
    });

    it('displays default title when item name not provided', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Select Category')).toBeInTheDocument();
    });
  });

  describe('Current category indication', () => {
    it('marks dairy as selected', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="dairy"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-category-dairy')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks produce as selected', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="produce"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-category-produce')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks household as selected', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="household"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-category-household')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks personal-care as selected', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="personal-care"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByTestId('picker-category-personal-care')
      ).toHaveAttribute('aria-checked', 'true');
    });

    it('marks only one category as selected', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="bakery"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      const checkedButtons = screen
        .getAllByRole('radio')
        .filter((radio) => radio.getAttribute('aria-checked') === 'true');

      expect(checkedButtons).toHaveLength(1);
      expect(checkedButtons[0]).toHaveAttribute(
        'data-testid',
        'picker-category-bakery'
      );
    });
  });

  describe('Selection', () => {
    it('calls onSelect when category is clicked', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-category-dairy'));

      expect(mockOnSelect).toHaveBeenCalledWith('dairy');
    });

    it('calls onClose after selection', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-category-produce'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('allows selecting different categories', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      // Test multiple categories
      fireEvent.click(screen.getByTestId('picker-category-frozen'));
      expect(mockOnSelect).toHaveBeenCalledWith('frozen');

      jest.clearAllMocks();

      fireEvent.click(screen.getByTestId('picker-category-beverages'));
      expect(mockOnSelect).toHaveBeenCalledWith('beverages');
    });
  });

  describe('Close actions', () => {
    it('calls onClose when backdrop is clicked', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('category-picker-backdrop'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('category-picker-close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has radiogroup for options', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByRole('radiogroup', { name: /select category/i })
      ).toBeInTheDocument();
    });

    it('options have radio role', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThan(0);
    });

    it('close button has aria-label', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('each category button has proper aria-label', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      // Check a few categories have proper labels
      expect(screen.getByLabelText('Dairy')).toBeInTheDocument();
      expect(screen.getByLabelText('Produce')).toBeInTheDocument();
      expect(screen.getByLabelText('Household')).toBeInTheDocument();
      expect(screen.getByLabelText('Personal Care')).toBeInTheDocument();
    });
  });

  describe('Category display', () => {
    it('displays category emojis', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      // Check that emojis are present (via img role from emoji span)
      const buttons = screen.getAllByRole('radio');
      buttons.forEach((button) => {
        const emoji = button.querySelector('[role="img"]');
        expect(emoji).toBeInTheDocument();
      });
    });

    it('displays category names', () => {
      render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      // Check some category names are visible
      expect(screen.getByText('Dairy')).toBeInTheDocument();
      expect(screen.getByText('Bakery')).toBeInTheDocument();
      expect(screen.getByText('Produce')).toBeInTheDocument();
      expect(screen.getByText('Household')).toBeInTheDocument();
      expect(screen.getByText('Personal Care')).toBeInTheDocument();
    });
  });

  describe('Body scroll restoration', () => {
    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <CategoryPicker
          isOpen={true}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <CategoryPicker
          isOpen={false}
          currentCategory="pantry"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});
