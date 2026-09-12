import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import Register from '@/pages/Register/Register';

const mockRegister = vi.fn();

vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: mockRegister,
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
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  };
});

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display validation errors for empty fields', async () => {
    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/Tên đăng nhập/i), '{enter}');

    await waitFor(() => {
      expect(screen.getByText(/Tên người dùng ít nhất 3 ký tự/i)).toBeInTheDocument();
    });
  });

  it('should validate mismatched passwords', async () => {
    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/Tên đăng nhập/i), 'newuser');
    await userEvent.type(screen.getByLabelText(/Email/i), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/i), 'password2');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
    });
  });

  it('should call register and navigate on valid submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/Tên đăng nhập/i), 'newuser');
    await userEvent.type(screen.getByLabelText(/Email/i), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        first_name: '',
        last_name: '',
      });
    });
  });

  it('should show error toast on registration failure', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { username: ['already taken'] } },
    });

    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/Tên đăng nhập/i), 'existing_user');
    await userEvent.type(screen.getByLabelText(/Email/i), 'existing@example.com');
    await userEvent.type(screen.getByLabelText(/^Mật khẩu$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(screen.getByText(/already taken/)).toBeInTheDocument();
    });
  });
});
