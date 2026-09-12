import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import Login from '@/pages/Login/Login';

const mockLogin = vi.fn();

vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  };
});

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display validation errors when form is empty', async () => {
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/Username \/ Email/i), '{enter}');

    await waitFor(() => {
      expect(screen.getByText('Username/email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should call login and navigate on successful submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/Username \/ Email/i), 'student1');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('student1', 'password123');
    });
  });

  it('should show error toast on login failure', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/Username \/ Email/i), 'bad_user');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
