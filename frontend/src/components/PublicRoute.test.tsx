import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { PublicRoute } from '@/components/PublicRoute';

const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));
vi.mock('@/components/ui/Spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

function TestOutlet() {
  return <div data-testid="public-content" />;
}

describe('PublicRoute', () => {
  it('should render children when not authenticated', async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;

    const router = createMemoryRouter(
      [
        {
          element: <PublicRoute />,
          children: [{ path: '/', element: <TestOutlet /> }],
        },
      ],
      { initialEntries: ['/'] }
    );

    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId('public-content')).toBeDefined();
  });

  it('should redirect authenticated users to dashboard', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;

    const router = createMemoryRouter(
      [
        {
          element: <PublicRoute />,
          children: [{ path: '/', element: <TestOutlet /> }],
        },
      ],
      { initialEntries: ['/'] }
    );

    render(<RouterProvider router={router} />);
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('should show spinner while loading', () => {
    mockAuth.isLoading = true;

    const router = createMemoryRouter(
      [
        {
          element: <PublicRoute />,
          children: [{ path: '/', element: <TestOutlet /> }],
        },
      ],
      { initialEntries: ['/'] }
    );

    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('spinner')).toBeDefined();
  });
});