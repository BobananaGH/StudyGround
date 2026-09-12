import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Mock useAuth
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
// Avoid real storage in route logic
vi.mock('@/components/ui/Spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

function TestOutlet() {
  return <div data-testid="protected-content" />;
}

function buildRouter() {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/', element: <Outlet /> }],
      },
    ],
    { initialEntries: ['/'] }
  );
  return router;
}

describe('ProtectedRoute', () => {
  it('should redirect unauthenticated users to login when not loading', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;

    const router = buildRouter();
    render(<RouterProvider router={router} />);

    // Navigate happens internally; verify by location
    expect(router.state.location.pathname).toBe('/login');
  });

  it('should render children when authenticated', async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;

    const router = createMemoryRouter(
      [
        {
          element: <ProtectedRoute />,
          children: [{ path: '/', element: <TestOutlet /> }],
        },
      ],
      { initialEntries: ['/'] }
    );

    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId('protected-content')).toBeDefined();
  });

  it('should show spinner while loading', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = true;

    const router = buildRouter();
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('spinner')).toBeDefined();
  });
});