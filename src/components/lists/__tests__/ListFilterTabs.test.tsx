import { render, screen, fireEvent } from '@testing-library/react';
import {
  ListFilterTabs,
  type ListFilter,
} from '@/components/lists/ListFilterTabs';

describe('ListFilterTabs', () => {
  const defaultProps = {
    selectedFilter: 'active' as ListFilter,
    onFilterChange: jest.fn(),
    activeCount: 3,
    completedCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all three filter tabs', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByTestId('filter-tab-active')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-completed')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
    });

    it('renders tab labels', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('displays counts next to tabs', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByText('(3)')).toBeInTheDocument(); // activeCount
      expect(screen.getByText('(2)')).toBeInTheDocument(); // completedCount
      expect(screen.getByText('(5)')).toBeInTheDocument(); // totalCount
    });

    it('renders tablist container', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByTestId('list-filter-tabs')).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('marks active tab as selected', () => {
      render(<ListFilterTabs {...defaultProps} selectedFilter="active" />);

      expect(screen.getByTestId('filter-tab-active')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('filter-tab-completed')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByTestId('filter-tab-all')).toHaveAttribute(
        'aria-selected',
        'false'
      );
    });

    it('marks completed tab as selected when filter is completed', () => {
      render(<ListFilterTabs {...defaultProps} selectedFilter="completed" />);

      expect(screen.getByTestId('filter-tab-active')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByTestId('filter-tab-completed')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('filter-tab-all')).toHaveAttribute(
        'aria-selected',
        'false'
      );
    });

    it('marks all tab as selected when filter is all', () => {
      render(<ListFilterTabs {...defaultProps} selectedFilter="all" />);

      expect(screen.getByTestId('filter-tab-active')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByTestId('filter-tab-completed')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByTestId('filter-tab-all')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('Click Handling', () => {
    it('calls onFilterChange with active when active tab clicked', () => {
      const handleFilterChange = jest.fn();
      render(
        <ListFilterTabs
          {...defaultProps}
          selectedFilter="completed"
          onFilterChange={handleFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('filter-tab-active'));

      expect(handleFilterChange).toHaveBeenCalledTimes(1);
      expect(handleFilterChange).toHaveBeenCalledWith('active');
    });

    it('calls onFilterChange with completed when history tab clicked', () => {
      const handleFilterChange = jest.fn();
      render(
        <ListFilterTabs
          {...defaultProps}
          selectedFilter="active"
          onFilterChange={handleFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('filter-tab-completed'));

      expect(handleFilterChange).toHaveBeenCalledTimes(1);
      expect(handleFilterChange).toHaveBeenCalledWith('completed');
    });

    it('calls onFilterChange with all when all tab clicked', () => {
      const handleFilterChange = jest.fn();
      render(
        <ListFilterTabs
          {...defaultProps}
          selectedFilter="active"
          onFilterChange={handleFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('filter-tab-all'));

      expect(handleFilterChange).toHaveBeenCalledTimes(1);
      expect(handleFilterChange).toHaveBeenCalledWith('all');
    });
  });

  describe('Accessibility', () => {
    it('has proper tablist role', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('has proper tab roles', () => {
      render(<ListFilterTabs {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('has aria-label for tablist', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByRole('tablist')).toHaveAttribute(
        'aria-label',
        'Filter shopping lists'
      );
    });

    it('has aria-controls linking to panel IDs', () => {
      render(<ListFilterTabs {...defaultProps} />);

      expect(screen.getByTestId('filter-tab-active')).toHaveAttribute(
        'aria-controls',
        'list-panel-active'
      );
      expect(screen.getByTestId('filter-tab-completed')).toHaveAttribute(
        'aria-controls',
        'list-panel-completed'
      );
      expect(screen.getByTestId('filter-tab-all')).toHaveAttribute(
        'aria-controls',
        'list-panel-all'
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles zero counts correctly', () => {
      render(
        <ListFilterTabs {...defaultProps} activeCount={0} completedCount={0} />
      );

      // Zero counts should not display the count badge
      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });

    it('handles large counts', () => {
      render(
        <ListFilterTabs
          {...defaultProps}
          activeCount={999}
          completedCount={1001}
        />
      );

      expect(screen.getByText('(999)')).toBeInTheDocument();
      expect(screen.getByText('(1001)')).toBeInTheDocument();
      expect(screen.getByText('(2000)')).toBeInTheDocument();
    });
  });
});
