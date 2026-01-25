import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableListItem } from '@/components/lists/SwipeableListItem';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onDragEnd: _onDragEnd,
      onTap,
      drag,
      ...props
    }: React.PropsWithChildren<{
      onDragEnd?: (e: unknown, info: { offset: { x: number } }) => void;
      onTap?: () => void;
      drag?: string | boolean;
      style?: Record<string, unknown>;
    }>) => {
      // Store handlers in data attributes for testing
      return (
        <div {...props} data-drag={drag ? 'true' : 'false'} onClick={onTap}>
          {children}
        </div>
      );
    },
  },
  useMotionValue: () => ({
    set: jest.fn(),
    get: () => 0,
  }),
  useTransform: () => 1,
}));

// Mock haptics
jest.mock('@/lib/utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
}));

describe('SwipeableListItem', () => {
  const defaultProps = {
    onRemove: jest.fn(),
    children: <div data-testid="item-content">Item Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children content', () => {
      render(<SwipeableListItem {...defaultProps} />);

      expect(screen.getByTestId('item-content')).toBeInTheDocument();
      expect(screen.getByText('Item Content')).toBeInTheDocument();
    });

    it('renders remove button', () => {
      render(<SwipeableListItem {...defaultProps} testId="test-item" />);

      expect(screen.getByTestId('test-item-remove-button')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('renders with custom testId', () => {
      render(<SwipeableListItem {...defaultProps} testId="custom-item" />);

      expect(screen.getByTestId('custom-item')).toBeInTheDocument();
      expect(
        screen.getByTestId('custom-item-remove-action')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('custom-item-remove-button')
      ).toBeInTheDocument();
      expect(screen.getByTestId('custom-item-content')).toBeInTheDocument();
    });

    it('renders with default testIds when no testId provided', () => {
      render(<SwipeableListItem {...defaultProps} />);

      expect(screen.getByTestId('remove-action')).toBeInTheDocument();
      expect(screen.getByTestId('remove-button')).toBeInTheDocument();
      expect(screen.getByTestId('swipeable-content')).toBeInTheDocument();
    });
  });

  describe('Remove Action', () => {
    it('calls onRemove when remove button is clicked', () => {
      const handleRemove = jest.fn();
      render(
        <SwipeableListItem
          {...defaultProps}
          onRemove={handleRemove}
          testId="test"
        />
      );

      fireEvent.click(screen.getByTestId('test-remove-button'));

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('remove button has correct aria-label', () => {
      render(<SwipeableListItem {...defaultProps} testId="test" />);

      expect(screen.getByTestId('test-remove-button')).toHaveAttribute(
        'aria-label',
        'Remove item'
      );
    });
  });

  describe('Disabled State', () => {
    it('disables drag when disabled prop is true', () => {
      render(<SwipeableListItem {...defaultProps} disabled testId="test" />);

      const content = screen.getByTestId('test-content');
      expect(content).toHaveAttribute('data-drag', 'false');
    });

    it('enables drag when disabled prop is false', () => {
      render(
        <SwipeableListItem {...defaultProps} disabled={false} testId="test" />
      );

      const content = screen.getByTestId('test-content');
      expect(content).toHaveAttribute('data-drag', 'true');
    });
  });

  describe('Styling', () => {
    it('has overflow hidden on container', () => {
      render(<SwipeableListItem {...defaultProps} testId="test" />);

      const container = screen.getByTestId('test');
      expect(container).toHaveClass('overflow-hidden');
    });

    it('remove button has red background', () => {
      render(<SwipeableListItem {...defaultProps} testId="test" />);

      const removeAction = screen.getByTestId('test-remove-action');
      expect(removeAction).toHaveClass('bg-red-500');
    });

    it('content has white background', () => {
      render(<SwipeableListItem {...defaultProps} testId="test" />);

      const content = screen.getByTestId('test-content');
      expect(content).toHaveClass('bg-white');
    });
  });
});
