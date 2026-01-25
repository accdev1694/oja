import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from '../Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('has border radius class applied', () => {
      render(<Card data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('rounded-[var(--radius-md)]');
    });
  });

  describe('Padding Variants', () => {
    it('renders with default padding', () => {
      render(<Card data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-4');
    });

    it('renders with compact padding', () => {
      render(<Card padding="compact" data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-3');
    });

    it('renders with spacious padding', () => {
      render(<Card padding="spacious" data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('p-6');
    });
  });

  describe('Interactive State', () => {
    it('renders as non-interactive by default', () => {
      render(<Card data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).not.toContain('cursor-pointer');
    });

    it('renders as interactive with hover styles', () => {
      render(<Card interactive data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('hover:shadow-md');
      expect(card.className).toContain('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('forwards ref correctly', () => {
      const ref = jest.fn();
      render(<Card ref={ref}>Test</Card>);
      expect(ref).toHaveBeenCalled();
    });

    it('accepts custom className', () => {
      render(<Card className="custom-class" data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('custom-class');
    });

    it('supports reduced motion', () => {
      render(<Card data-testid="card">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('motion-reduce:transition-none');
    });
  });
});

describe('CardHeader', () => {
  it('renders children correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('has bottom border and spacing', () => {
    render(<CardHeader data-testid="header">Test</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('border-b');
    expect(header.className).toContain('pb-3');
    expect(header.className).toContain('mb-4');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<CardHeader ref={ref}>Test</CardHeader>);
    expect(ref).toHaveBeenCalled();
  });
});

describe('CardContent', () => {
  it('renders children correctly', () => {
    render(<CardContent>Content here</CardContent>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<CardContent ref={ref}>Test</CardContent>);
    expect(ref).toHaveBeenCalled();
  });
});

describe('CardFooter', () => {
  it('renders children correctly', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('has top border and spacing', () => {
    render(<CardFooter data-testid="footer">Test</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('border-t');
    expect(footer.className).toContain('pt-3');
    expect(footer.className).toContain('mt-4');
  });

  it('has flex layout for actions', () => {
    render(<CardFooter data-testid="footer">Test</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('gap-2');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<CardFooter ref={ref}>Test</CardFooter>);
    expect(ref).toHaveBeenCalled();
  });
});

describe('Card Composition', () => {
  it('renders all subcomponents together', () => {
    render(
      <Card>
        <CardHeader>
          <h3>Title</h3>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Actions</CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
