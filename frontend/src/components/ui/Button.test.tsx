import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('should render children text correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('should show spinner when loading', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    // Spinner svg has animate-spin class
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('should apply full width class when fullWidth is set', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});