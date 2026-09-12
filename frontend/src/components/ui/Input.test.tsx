import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('should render label and associate with input element', () => {
    render(<Input label="Username" id="user-input" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('should call onChange when user types', async () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    const input = screen.getByLabelText('Name');
    await userEvent.type(input, 'hello');
    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue('hello');
  });

  it('should render error message and set aria-invalid when error provided', () => {
    render(<Input label="Email" error="Invalid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address');
  });

  it('should render helperText when no error present', () => {
    render(<Input label="Password" helperText="Must be 8 characters" />);
    expect(screen.getByText('Must be 8 characters')).toBeInTheDocument();
  });
});