import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('should render with default size md', () => {
    render(<Spinner />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('should render with size sm', () => {
    render(<Spinner size="sm" />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('should render with size lg', () => {
    render(<Spinner size="lg" />);
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('should have an accessible label', () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data');
  });
});