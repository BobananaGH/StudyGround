import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { mockTokens, mockUser } from '@/test/mocks/mockData';

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn(),
}));

vi.mock('@/api/authApi', () => ({
  authApi: {
    login: authApi.login,
    register: authApi.register,
    me: authApi.me,
  },
}));

const AuthConsumer = () => {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuth();
  const handleLogin = async () => {
    try {
      await login('student1', 'pass');
    } catch {
      // test consumer intentionally swallows rejected promise
    }
  };

  return (
    <div>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="isAuth">{isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="loading">{isLoading ? 'true' : 'false'}</span>
      <button onClick={handleLogin}>login</button>
      <button onClick={() => register({ username: 'student1', email: 'a@b.com', password: 'password' })}>
        register
      </button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    authApi.login.mockReset();
    authApi.register.mockReset();
    authApi.me.mockReset();
    authApi.login.mockResolvedValue({ data: { user: mockUser, tokens: mockTokens } });
    authApi.register.mockResolvedValue({ data: { user: mockUser, tokens: mockTokens } });
    authApi.me.mockResolvedValue({ data: mockUser });
  });

  it('should set user and persist tokens on successful login', async () => {
    renderProvider();

    await userEvent.click(await screen.findByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('student1');
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
    });

    expect(localStorage.getItem('StudyGround-access-token')).toBe(mockTokens.access);
    expect(localStorage.getItem('StudyGround-refresh-token')).toBe(mockTokens.refresh);
    expect(localStorage.getItem('StudyGround-user')).toContain('student1');
  });

  it('should keep unauthenticated state when login fails', async () => {
    authApi.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderProvider();
    await userEvent.click(await screen.findByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(screen.getByTestId('isAuth')).toHaveTextContent('false');
    });
  });

  it('should set user and tokens on successful registration', async () => {
    renderProvider();
    await userEvent.click(await screen.findByText('register'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('student1');
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
    });

    expect(localStorage.getItem('StudyGround-access-token')).toBe(mockTokens.access);
  });

  it('should clear state and storage on logout', async () => {
    localStorage.setItem('StudyGround-access-token', mockTokens.access);
    localStorage.setItem('StudyGround-refresh-token', mockTokens.refresh);
    localStorage.setItem('StudyGround-user', JSON.stringify(mockUser));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
    });

    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(localStorage.getItem('StudyGround-access-token')).toBeNull();
      expect(localStorage.getItem('StudyGround-user')).toBeNull();
    });
  });

  it('should restore session from storage on mount', async () => {
    localStorage.setItem('StudyGround-access-token', mockTokens.access);
    localStorage.setItem('StudyGround-refresh-token', mockTokens.refresh);
    localStorage.setItem('StudyGround-user', JSON.stringify(mockUser));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('student1');
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });
});
