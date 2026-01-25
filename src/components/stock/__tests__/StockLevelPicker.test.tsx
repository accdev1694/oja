import { render, screen, fireEvent } from '@testing-library/react';
import { StockLevelPicker } from '@/components/stock/StockLevelPicker';

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

describe('StockLevelPicker', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('When closed', () => {
    it('does not render when isOpen is false', () => {
      render(
        <StockLevelPicker
          isOpen={false}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.queryByTestId('stock-level-picker')
      ).not.toBeInTheDocument();
    });
  });

  describe('When open', () => {
    it('renders the picker', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('stock-level-picker')).toBeInTheDocument();
    });

    it('renders all stock level options', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-level-stocked')).toBeInTheDocument();
      expect(screen.getByTestId('picker-level-good')).toBeInTheDocument();
      expect(screen.getByTestId('picker-level-low')).toBeInTheDocument();
      expect(screen.getByTestId('picker-level-out')).toBeInTheDocument();
    });

    it('renders the backdrop', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-backdrop')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-close')).toBeInTheDocument();
    });

    it('prevents body scroll', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('displays item name in title when provided', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          itemName="Milk"
        />
      );

      expect(screen.getByText('Update Milk')).toBeInTheDocument();
    });

    it('displays default title when item name not provided', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Set Stock Level')).toBeInTheDocument();
    });
  });

  describe('Current level indication', () => {
    it('marks stocked as selected', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-level-stocked')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks good as selected', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="good"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-level-good')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks low as selected', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="low"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-level-low')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('marks out as selected', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="out"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-level-out')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
  });

  describe('Selection', () => {
    it('calls onSelect when level is clicked', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-level-low'));

      expect(mockOnSelect).toHaveBeenCalledWith('low');
    });

    it('calls onClose after selection', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-level-good'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close actions', () => {
    it('calls onClose when backdrop is clicked', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-backdrop'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByTestId('picker-close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has radiogroup for options', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByRole('radiogroup', { name: /select stock level/i })
      ).toBeInTheDocument();
    });

    it('options have radio role', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(4);
    });

    it('close button has aria-label', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('Liquid fill animation', () => {
    it('renders fill element for stocked', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-fill-stocked')).toBeInTheDocument();
    });

    it('renders fill element for each level', () => {
      render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('picker-fill-stocked')).toBeInTheDocument();
      expect(screen.getByTestId('picker-fill-good')).toBeInTheDocument();
      expect(screen.getByTestId('picker-fill-low')).toBeInTheDocument();
      expect(screen.getByTestId('picker-fill-out')).toBeInTheDocument();
    });
  });

  describe('Body scroll restoration', () => {
    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <StockLevelPicker
          isOpen={true}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <StockLevelPicker
          isOpen={false}
          currentLevel="stocked"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});
