import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductSelection } from '@/components/onboarding/ProductSelection';
import { SEEDED_PRODUCTS } from '@/lib/data/seeded-products';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef<any, any>(function MotionComponent(
      { children, ...props },
      ref
    ) {
      return React.createElement(Tag, { ...props, ref }, children);
    });
    Component.displayName = `Motion${Tag.charAt(0).toUpperCase() + Tag.slice(1)}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      section: createMotionComponent('section'),
    },
    useReducedMotion: () => false,
  };
});

describe('ProductSelection', () => {
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);
    expect(screen.getByText('Your Pantry Essentials')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('renders all products by default', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    // Check a few sample products (use checkbox role to avoid category name conflicts)
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    // "Eggs" appears both as category and product, so check for the checkbox
    expect(screen.getByRole('checkbox', { name: /Eggs/i })).toBeInTheDocument();
  });

  it('shows all products selected by default', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    expect(
      screen.getByText(
        `${SEEDED_PRODUCTS.length} of ${SEEDED_PRODUCTS.length} items selected`
      )
    ).toBeInTheDocument();
  });

  it('can toggle product selection', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    // Find milk checkbox
    const milkCheckbox = screen.getByRole('checkbox', { name: /Milk/i });
    expect(milkCheckbox).toHaveAttribute('aria-checked', 'true');

    // Toggle it off
    fireEvent.click(milkCheckbox);
    expect(milkCheckbox).toHaveAttribute('aria-checked', 'false');

    // Toggle it back on
    fireEvent.click(milkCheckbox);
    expect(milkCheckbox).toHaveAttribute('aria-checked', 'true');
  });

  it('updates selection count when toggling', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    const totalCount = SEEDED_PRODUCTS.length;

    // Initially all selected
    expect(
      screen.getByText(`${totalCount} of ${totalCount} items selected`)
    ).toBeInTheDocument();

    // Deselect one item
    const milkCheckbox = screen.getByRole('checkbox', { name: /Milk/i });
    fireEvent.click(milkCheckbox);

    expect(
      screen.getByText(`${totalCount - 1} of ${totalCount} items selected`)
    ).toBeInTheDocument();
  });

  it('filters products when searching', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'milk' } });

    // Should show milk
    expect(screen.getByText('Milk')).toBeInTheDocument();

    // Should not show bread (filtered out)
    expect(screen.queryByText('Bread')).not.toBeInTheDocument();
  });

  it('shows empty state when no items match search', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No items match your search.')).toBeInTheDocument();
  });

  it('calls onConfirm with selected products', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    // Deselect milk
    const milkCheckbox = screen.getByRole('checkbox', { name: /Milk/i });
    fireEvent.click(milkCheckbox);

    // Click confirm
    const confirmButton = screen.getByRole('button', {
      name: /Continue with \d+ items/,
    });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);

    // Should have all products except milk
    const selectedProducts = mockOnConfirm.mock.calls[0][0];
    expect(selectedProducts).toHaveLength(SEEDED_PRODUCTS.length - 1);
    expect(
      selectedProducts.find((p: { id: string }) => p.id === 'milk')
    ).toBeUndefined();
  });

  it('disables confirm button when no items selected', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} initialSelected={[]} />);

    const confirmButton = screen.getByRole('button', {
      name: /Continue with 0 items/,
    });
    expect(confirmButton).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} isLoading />);

    expect(
      screen.getByRole('button', { name: 'Setting up your pantry...' })
    ).toBeDisabled();
  });

  it('has testid for product selection', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);
    expect(screen.getByTestId('product-selection')).toBeInTheDocument();
  });

  it('renders category headers', () => {
    render(<ProductSelection onConfirm={mockOnConfirm} />);

    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Pantry')).toBeInTheDocument();
  });
});
