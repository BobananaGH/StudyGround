import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authApi } from '@/api/authApi';
import { getAccessToken, setAccessToken, setRefreshToken, setUser, clearAuthStorage, getUser } from '@/utils/storage';
import type { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!getAccessToken();

  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    const storedUser = getUser<User>();
    if (storedUser) {
      setUserState(storedUser);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUserState(response.data);
      setUser(response.data);
    } catch {
      clearAuthStorage();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    const { user: userData, tokens } = response.data;
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
    setUser(userData);
    setUserState(userData);
  };

  const register = async (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) => {
    const response = await authApi.register(data);
    const { user: userData, tokens } = response.data;
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
    setUser(userData);
    setUserState(userData);
  };

  const logout = () => {
    clearAuthStorage();
    setUserState(null);
  };

  const refreshUser = loadUser;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}