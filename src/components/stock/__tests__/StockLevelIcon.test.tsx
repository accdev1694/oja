import { render, screen } from '@testing-library/react';
import { StockLevelIcon } from '@/components/stock/StockLevelIcon';
import { STOCK_LEVEL_CONFIG } from '@/lib/utils/stockLevel';

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  Drop: ({
    size,
    weight,
    style,
    'aria-hidden': ariaHidden,
  }: {
    size?: number;
    weight?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean | 'true' | 'false';
  }) => (
    <svg
      data-testid="drop-icon"
      data-size={size}
      data-weight={weight}
      style={style}
      aria-hidden={ariaHidden}
    />
  ),
}));

describe('StockLevelIcon', () => {
  describe('Rendering', () => {
    it('renders the icon', () => {
      render(<StockLevelIcon level="stocked" />);

      expect(screen.getByTestId('stock-icon-stocked')).toBeInTheDocument();
    });

    it('renders the Drop icon', () => {
      render(<StockLevelIcon level="stocked" />);

      expect(screen.getByTestId('drop-icon')).toBeInTheDocument();
    });
  });

  describe('Icon Weights', () => {
    it('uses fill weight for stocked level', () => {
      render(<StockLevelIcon level="stocked" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-weight', 'fill');
    });

    it('uses regular weight for good level', () => {
      render(<StockLevelIcon level="good" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-weight', 'regular');
    });

    it('uses light weight for low level', () => {
      render(<StockLevelIcon level="low" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-weight', 'light');
    });

    it('uses thin weight for out level', () => {
      render(<StockLevelIcon level="out" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-weight', 'thin');
    });
  });

  describe('Colors', () => {
    it('applies stocked color', () => {
      render(<StockLevelIcon level="stocked" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveStyle({ color: STOCK_LEVEL_CONFIG.stocked.color });
    });

    it('applies good color', () => {
      render(<StockLevelIcon level="good" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveStyle({ color: STOCK_LEVEL_CONFIG.good.color });
    });

    it('applies low color', () => {
      render(<StockLevelIcon level="low" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveStyle({ color: STOCK_LEVEL_CONFIG.low.color });
    });

    it('applies out color', () => {
      render(<StockLevelIcon level="out" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveStyle({ color: STOCK_LEVEL_CONFIG.out.color });
    });
  });

  describe('Size', () => {
    it('uses default size of 24', () => {
      render(<StockLevelIcon level="stocked" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-size', '24');
    });

    it('accepts custom size', () => {
      render(<StockLevelIcon level="stocked" size={32} />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-size', '32');
    });

    it('accepts smaller size', () => {
      render(<StockLevelIcon level="stocked" size={16} />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('data-size', '16');
    });
  });

  describe('Test IDs', () => {
    it('has correct test id for stocked', () => {
      render(<StockLevelIcon level="stocked" />);

      expect(screen.getByTestId('stock-icon-stocked')).toBeInTheDocument();
    });

    it('has correct test id for good', () => {
      render(<StockLevelIcon level="good" />);

      expect(screen.getByTestId('stock-icon-good')).toBeInTheDocument();
    });

    it('has correct test id for low', () => {
      render(<StockLevelIcon level="low" />);

      expect(screen.getByTestId('stock-icon-low')).toBeInTheDocument();
    });

    it('has correct test id for out', () => {
      render(<StockLevelIcon level="out" />);

      expect(screen.getByTestId('stock-icon-out')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for stocked level', () => {
      render(<StockLevelIcon level="stocked" />);

      const container = screen.getByTestId('stock-icon-stocked');
      expect(container).toHaveAttribute('aria-label', 'Stock level: Stocked');
    });

    it('has aria-label for good level', () => {
      render(<StockLevelIcon level="good" />);

      const container = screen.getByTestId('stock-icon-good');
      expect(container).toHaveAttribute('aria-label', 'Stock level: Good');
    });

    it('has aria-label for low level', () => {
      render(<StockLevelIcon level="low" />);

      const container = screen.getByTestId('stock-icon-low');
      expect(container).toHaveAttribute('aria-label', 'Stock level: Low');
    });

    it('has aria-label for out level', () => {
      render(<StockLevelIcon level="out" />);

      const container = screen.getByTestId('stock-icon-out');
      expect(container).toHaveAttribute('aria-label', 'Stock level: Out');
    });

    it('icon is hidden from screen readers', () => {
      render(<StockLevelIcon level="stocked" />);

      const icon = screen.getByTestId('drop-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom className', () => {
    it('accepts custom className', () => {
      render(<StockLevelIcon level="stocked" className="custom-class" />);

      const container = screen.getByTestId('stock-icon-stocked');
      expect(container).toHaveClass('custom-class');
    });

    it('preserves default classes with custom className', () => {
      render(<StockLevelIcon level="stocked" className="custom-class" />);

      const container = screen.getByTestId('stock-icon-stocked');
      expect(container).toHaveClass('inline-flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });
  });
});
